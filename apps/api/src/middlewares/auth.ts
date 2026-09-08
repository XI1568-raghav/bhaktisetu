import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin, isDemoMode } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { getCachedAuth, setCachedAuth } from '../lib/auth-cache.js';
import { inspectSupabaseJwt } from '../lib/supabase-jwt.js';
import {
  AUTH_REASON_HEADER,
  AUTH_REASON_BODY_FIELD,
  type AuthFailureReason,
} from '../lib/auth-reason.js';

export type MarketplaceRole = 'DEVOTEE' | 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER' | 'ADMIN';

// P0 boot-time assertion. Demo-token bypass maps to real DB admin/devotee
// rows with full privileges — anyone with the token format gets that session.
// Default-deny in prod. Crash boot if both flags are set; surfaces misconfig
// before any traffic. Investor demos must unset NODE_ENV or use a staging URL.
// P0 #ag-03 (2026-07-09): boot-fatal guard — demo tokens grant admin access,
// so they must NEVER be accepted in production. Extracted as a pure function
// so the guard is unit-testable (testing process.exit at module load is not
// practical). The boot-time call below uses it.
export function shouldRejectDemoTokensInProd(env: {
  ALLOW_DEMO_TOKENS?: string;
  NODE_ENV?: string;
}): boolean {
  return env.ALLOW_DEMO_TOKENS === 'true' && env.NODE_ENV === 'production';
}

if (shouldRejectDemoTokensInProd(process.env)) {
  // eslint-disable-next-line no-console
  console.error('[FATAL] ALLOW_DEMO_TOKENS=true in production. Demo tokens grant admin access. Refusing to boot.');
  process.exit(1);
}

export interface AuthUser {
  id: string;
  supabaseId: string;
  phone: string | null;
  email: string | null;
  fullName: string;
  subscriptionTier: string;
  roles: MarketplaceRole[];
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthUser;
  }
}

/**
 * Extracts the Bearer token from the Authorization header.
 */
function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // SEC-02 step 3 (2026-08-28): an EMPTY Bearer used to be returned here,
    // ahead of the cookie lookup below, so `Authorization: Bearer ` resolved to
    // '' and `authenticateUser` answered 401 without ever reading the perfectly
    // good httpOnly `darshya_session` in the same request.
    //
    // That is what blocked the localStorage token from leaving apps/web. ~161
    // hand-built `Authorization: Bearer ${...}` sites there interpolate a token
    // unconditionally, so removing the localStorage copy turns them into empty
    // Bearers — and every one of them 401'd a browser that is, by this file's
    // own cookie rules, signed in. An empty credential is not a credential;
    // treating it as absent is what the header already means.
    //
    // Whitespace is trimmed rather than preserved for the same reason: a token
    // is never meaningfully padded, and `Bearer \t ` is the same "nothing was
    // interpolated" case wearing different characters.
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  // P0 #200 (2026-08-05): accept the httpOnly `darshya_session` cookie as a
  // fallback so the web can move the token out of localStorage. Bearer header
  // takes precedence (mobile + transitional web); cookie enables the secure path.
  const cookies = request.cookies as Record<string, string | undefined> | undefined;
  const cookieToken = cookies?.['darshya_session'];
  return cookieToken ?? null;
}

// Single chokepoint for the User.blocked gate. Every auth path calls this
// after looking up the Prisma row and before attaching `request.currentUser`.
// 403 (not 401) signals "we know who you are, you just can't be here" so
// the frontend can show a "account suspended" screen instead of bouncing
// back to login. If we ever add a 4th auth path, route it through here too.
function rejectIfBlocked(
  dbUser: { blocked?: boolean | null; blockedReason?: string | null } | null,
  reply: FastifyReply
): boolean {
  if (dbUser?.blocked) {
    reply.code(403).send({
      error: 'Forbidden',
      message: dbUser.blockedReason
        ? `Account suspended: ${dbUser.blockedReason}`
        : 'Account suspended. Contact support@darshya.online.',
    });
    return true;
  }
  return false;
}

/**
 * AUTH-07 — recover the expiry signal that the Supabase path threw away twice.
 *
 * Two independent witnesses, in order of how much we trust them:
 *
 *  1. THE LOCAL VERIFIER. `inspectSupabaseJwt` reports `expired` only after the
 *     HMAC and `aud` already passed, so that verdict is a proof: this project
 *     minted the token and its `exp` is behind us. Nothing Supabase can say
 *     afterwards makes that untrue. Unavailable when `SUPABASE_JWT_SECRET` is
 *     unset, which is the default (SCAL-05) — hence witness 2.
 *
 *  2. GoTrue's OWN ERROR, which this middleware previously reduced to
 *     `if (error || !data?.user)` and dropped on the floor. It carries a `code`
 *     ('bad_jwt', 'session_expired') and, on older SDKs, only a message. Read
 *     narrowly and only to promote to `session_expired`; anything unrecognised
 *     stays `invalid_credential`, which is the honest "we refused it and cannot
 *     tell you more".
 *
 * Never returns `verify_unavailable`. A GoTrue outage does not land here: it
 * throws, and the catch at the bottom of `authenticateUser` already answers 500
 * "Authentication service unavailable." — which is the correct shape, and the
 * shape routes/auth.ts:1136 does NOT use. See the AUTH-07 report.
 */
function supabaseRefusalReason(
  inspection: { ok: boolean; reason?: string },
  supabaseError: unknown,
): AuthFailureReason {
  if (!inspection.ok && inspection.reason === 'expired') return 'session_expired';

  if (supabaseError && typeof supabaseError === 'object') {
    const err = supabaseError as { code?: unknown; message?: unknown };
    if (err.code === 'session_expired' || err.code === 'session_not_found') {
      return 'session_expired';
    }
    // Older @supabase/supabase-js versions carry no `code` on AuthApiError, so
    // the sentence is the only witness left. Deliberately narrow: only the word
    // GoTrue uses for this, never a substring of some other failure.
    if (typeof err.message === 'string' && /\bexpired\b/i.test(err.message)) {
      return 'session_expired';
    }
  }

  return 'invalid_credential';
}

/**
 * AUTH-07 (F454, 2026-09-08) — the single chokepoint for "we do not know who
 * you are", carrying WHY.
 *
 * Every `reply.code(401)` in this file used to send `{ error, message }` and
 * nothing else, and apps/web read only the number: `loadErrorIsReauth` was
 * `loadErrorStatus(cause) === 401`. So all thirteen of these sites — no token
 * sent, demo token in prod, unseeded demo account, forged email token, a
 * DATABASE ERROR during session lookup, revoked, expired, no user row, Supabase
 * refusal, registration incomplete, and three "authentication required" guards
 * — rendered as "Your session has expired — sign in again to see your live
 * figures." Three of those are false and one of them is actively harmful: it
 * sends a user to re-authenticate against a database that is down.
 *
 * The reason rides in TWO places, from one argument, so they cannot drift:
 *   - `X-Auth-Reason`, because a `Response`'s headers are readable
 *     synchronously and its body is not. All ten web call sites pass a bare
 *     `Response` to a synchronous classifier and never read the body of a
 *     failed load, so a body-only discriminator would have been dead on
 *     arrival — see apps/web/lib/api-config.ts.
 *   - `authReason` in the body, for clients that parse JSON (apps/mobile).
 *
 * The message argument is UNCHANGED at every call site. This adds a field; it
 * does not restate anything, and the bespoke sentences ("Demo account … is not
 * seeded in this database.") are still the ones a developer reads in a log.
 *
 * 403 deliberately does not route through here. `rejectIfBlocked` above stays
 * exactly as it was, because a 403 is an authorization outcome and must never
 * acquire an auth reason: apps/web consults the reason for 401 only, and an
 * earlier pass of AUTH-06 proved what happens when a 403 is allowed to read as
 * "sign in again" — the suspended provider signs in successfully and lands back
 * on the same refusal, forever.
 */
function denyUnauthenticated(
  reply: FastifyReply,
  reason: AuthFailureReason,
  message: string,
): void {
  reply.header(AUTH_REASON_HEADER, reason);
  reply.code(401).send({
    error: 'Unauthorized',
    message,
    [AUTH_REASON_BODY_FIELD]: reason,
  });
}

/**
 * Fastify preHandler hook that verifies the JWT with Supabase
 * and attaches the authenticated user from Prisma to the request.
 */
export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractBearerToken(request);

  if (!token) {
    // AUTH-07: nothing expired — nothing was ever sent. The user is signed out
    // on this device, which is a different sentence and a different remedy.
    denyUnauthenticated(
      reply,
      'no_credentials',
      'Missing or invalid Authorization header. Expected: Bearer <token>',
    );
    return;
  }

  try {
    // Demo tokens (`demo-<handle>-...`). After the chat seed migration we map
    // the handle to a REAL DB user by email so request.currentUser.id is a
    // real UUID — needed for any route that writes Prisma rows linked to the
    // user (conversations, messages, bookings, etc).
    //
    // Token format: `demo-<handle>-...` where handle is the email local-part
    // (devotee, pandit, priest, store, astro, wellness, gaushala, temple,
    // admin). Handles `pandit` and `priest` both map to pandit@demo.com.
    //
    // Demo-token bypass is disabled in production unless ALLOW_DEMO_TOKENS
    // is explicitly set. Why: demo accounts map to real DB users with full
    // role privileges (including ADMIN), so anyone with the token format
    // gets that user's session. Investor demos can flip the flag temporarily;
    // default-deny is the safe default.
    const demoAllowed =
      process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_TOKENS === 'true';
    // Demo-shaped token in prod with no override = clear 401. Without this
    // the token falls through to Supabase verify which rejects it anyway,
    // but the explicit reject is faster, logs cleaner, and stops Supabase
    // from getting hit with obvious junk.
    if (token.startsWith('demo-') && !demoAllowed) {
      denyUnauthenticated(reply, 'invalid_credential', 'Demo tokens not accepted in production.');
      return;
    }
    if (token.startsWith('demo-') && demoAllowed) {
      const stripped = token.replace(/^demo-/, '').replace(/-token$/, '').replace(/^demo-/, '');
      const DEMO_ROLE_MAP: Record<string, { roles: MarketplaceRole[]; email: string }> = {
        'devotee':  { roles: ['DEVOTEE'],                      email: 'devotee@demo.com' },
        'pandit':   { roles: ['PANDIT', 'DEVOTEE'],            email: 'pandit@demo.com' },
        'priest':   { roles: ['PANDIT', 'DEVOTEE'],            email: 'pandit@demo.com' },
        'store':    { roles: ['STORE_OWNER', 'DEVOTEE'],       email: 'store@demo.com' },
        'astro':    { roles: ['ASTROLOGER', 'DEVOTEE'],        email: 'astro@demo.com' },
        'wellness': { roles: ['WELLNESS_INSTRUCTOR', 'DEVOTEE'], email: 'wellness@demo.com' },
        'gaushala': { roles: ['GAUSHALA_MANAGER', 'DEVOTEE'],  email: 'gaushala@demo.com' },
        'temple':   { roles: ['TEMPLE_MANAGER', 'DEVOTEE'],    email: 'temple@demo.com' },
        'admin':    { roles: ['ADMIN', 'DEVOTEE'],             email: 'admin@demo.com' },
      };
      const handle = stripped.toLowerCase();
      const profile = DEMO_ROLE_MAP[handle] ?? DEMO_ROLE_MAP['devotee']!;

      // Look up the seeded demo user.
      const dbUser = await prisma.user.findUnique({ where: { email: profile.email } });
      if (dbUser) {
        if (rejectIfBlocked(dbUser, reply)) return;
        request.currentUser = {
          id: dbUser.id,
          supabaseId: dbUser.id,
          phone: dbUser.phone,
          email: dbUser.email,
          fullName: dbUser.fullName,
          subscriptionTier: dbUser.subscriptionTier,
          roles: profile.roles,
        };
        return;
      }

      // AW-08 (2026-08-12, P1): FAIL CLOSED.
      //
      // This used to mint a synthetic identity — `id: 'demo-astro'` — whenever
      // the mapped demo User row was absent, on the theory that non-DB routes
      // would still work. In practice astro@demo.com was never seeded into this
      // database (prisma/seed.ts seeds astrologer@demo.com), so the demo
      // astrologer authenticated with a non-UUID id and then blew up on every
      // DB-backed route with a raw Prisma error carrying the invocation site,
      // the absolute source path and the SQL text (P2023 / P2010 22P02). The
      // portal rendered confident zeros; the API leaked its filesystem layout.
      //
      // A missing seed is a configuration problem, and 401 with a sentence
      // naming the account is the honest answer. It also means no route ever
      // has to defend against a non-UUID currentUser.id again.
      request.log.warn(
        { event: 'demo_user_not_seeded', handle, email: profile.email },
        'demo token presented for an account that is not seeded',
      );
      denyUnauthenticated(
        reply,
        'invalid_credential',
        `Demo account ${profile.email} is not seeded in this database. Run the demo seed before using this token.`,
      );
      return;
    }

    // ── Magic-link / email session token ───────────────────────────
    // Format: email-<userId>-<random32hex>. Tokens are issued by the
    // /auth/magic-link/verify endpoint after a successful email link click.
    if (token.startsWith('email-')) {
      const match = token.match(/^email-([0-9a-f-]{36})-[0-9a-f]{32}$/i);
      if (!match) {
        denyUnauthenticated(reply, 'invalid_credential', 'Invalid email session token.');
        return;
      }
      const userId = match[1];

      // SECURITY (A-005, 2026-08-10): fail CLOSED. This token type is valid ONLY
      // if a matching, non-revoked, non-expired email_sessions row exists (rows are
      // written at issuance by lib/email-session.ts). A missing row means a forged
      // token, so it is REJECTED. Previously a missing row fell through to "allow",
      // which — because no code ever wrote the table — let anyone forge
      // `email-<anyKnownUserId>-<any 32 hex>` and authenticate as that user (incl.
      // admin). A DB error also rejects rather than granting access.
      let sessionRow: Array<{ revoked_at: Date | null; expires_at: Date }>;
      try {
        sessionRow = await prisma.$queryRawUnsafe<Array<{ revoked_at: Date | null; expires_at: Date }>>(
          `SELECT revoked_at, expires_at FROM email_sessions WHERE id = $1 LIMIT 1`,
          token,
        );
      } catch (err) {
        request.log.error({ err }, 'EmailSession lookup failed — rejecting (fail-closed)');
        // AUTH-07: fail-closed is right (A-005) but "could not validate" is not
        // "your session expired". The lookup THREW — a database outage — and the
        // user's credential may be perfectly good. Sending them to sign in again
        // aims them at the thing that is down. See the 503 recommendation in the
        // AUTH-07 report: the status is arguably wrong here too, but changing it
        // ripples through every client including apps/mobile.
        denyUnauthenticated(reply, 'verify_unavailable', 'Could not validate session.');
        return;
      }
      const row = sessionRow?.[0];
      if (!row) {
        denyUnauthenticated(
          reply,
          'invalid_credential',
          'Invalid or expired email session token.',
        );
        return;
      }
      if (row.revoked_at !== null) {
        denyUnauthenticated(reply, 'session_revoked', 'Session revoked.');
        return;
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        denyUnauthenticated(reply, 'session_expired', 'Session expired.');
        return;
      }

      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!dbUser) {
        denyUnauthenticated(reply, 'registration_incomplete', 'User not found for session token.');
        return;
      }
      if (rejectIfBlocked(dbUser, reply)) return;
      const roleAssignments = await prisma.userRoleAssignment.findMany({
        where: { userId: dbUser.id },
      });
      let roles: MarketplaceRole[] = roleAssignments.length > 0
        ? roleAssignments.map((ra) => ra.role as MarketplaceRole)
        : ['DEVOTEE'];
      if (!roles.includes('DEVOTEE')) roles.push('DEVOTEE');
      request.currentUser = {
        id: dbUser.id,
        supabaseId: dbUser.id,
        phone: dbUser.phone,
        email: dbUser.email,
        fullName: dbUser.fullName,
        subscriptionTier: dbUser.subscriptionTier,
        roles,
      };
      return;
    }

    // SCAL-05: a token verified moments ago does not need another cross-Pacific
    // round trip to Supabase plus 2–4 more SQL statements. The cache key is a
    // hash of this exact token and entries never outlive the token's own `exp`,
    // so nothing unverified can be served from here. Blocked users are never
    // written (the gate below runs first) and admin.service.updateUser evicts a
    // user the moment it blocks them or changes their roles.
    const cachedAuth = getCachedAuth(token);
    if (cachedAuth) {
      request.currentUser = { ...cachedAuth, roles: [...cachedAuth.roles] } as AuthUser;
      return;
    }

    // SCAL-05: verify the token HERE when we can, and only call out when we
    // cannot.
    //
    // Supabase signs access tokens HS256 with the project JWT secret, so the
    // signature, `exp` and `aud` are all checkable in-process — see
    // lib/supabase-jwt.ts. That removes an outbound HTTPS round trip to GoTrue
    // in ap-northeast-1 from EVERY authenticated request: ~100–300 ms that no
    // query tuning could touch, plus a throughput ceiling set by Supabase's
    // rate limit rather than by this API, plus the failure mode where one slow
    // minute at Supabase 500s every logged-in user at once.
    //
    // `null` means "this verifier will not vouch for it" — a wrong or rotated
    // secret, an asymmetric project key, an expired token, a forgery. Every one
    // of those falls through to the remote check below, which is the same code
    // that ran before, so turning the secret on cannot lock anybody out and
    // leaving it off changes nothing at all.
    //
    // Only IDENTITY is short-circuited. The Prisma lookup, the blocked gate and
    // the role read all still run underneath.
    // AUTH-07: `inspectSupabaseJwt` is `verifySupabaseJwt` WITH its verdict. The
    // token/null contract and the fall-through below are byte-for-byte what they
    // were; the only thing that changes is that a refusal now remembers whether
    // the reason was "this token is past its `exp`". That signal used to be
    // destroyed twice — once by the bare `null` (lib/supabase-jwt.ts) and again
    // by testing Supabase's `error` for truthiness and discarding its code — so
    // an expired session and a forged token were indistinguishable by the time
    // the 401 was written, and apps/web asserted "expired" for both.
    const inspection = inspectSupabaseJwt(token, process.env.SUPABASE_JWT_SECRET);
    const locallyVerified = inspection.ok ? inspection.token : null;

    let supabaseUser: { id: string; email?: string | null; phone?: string | null };
    if (locallyVerified) {
      supabaseUser = {
        id: locallyVerified.id,
        email: locallyVerified.email,
        phone: locallyVerified.phone,
      };
    } else {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) {
        denyUnauthenticated(
          reply,
          supabaseRefusalReason(inspection, error),
          'Invalid or expired access token.',
        );
        return;
      }
      supabaseUser = data.user;
    }

    // Look up the user in our Prisma database. Signup writes
    // `User.id = supabaseUser.id`, so id-match is authoritative.
    // Fall back to email (email/password signups) and finally phone
    // (legacy OTP signups) so any signup path resolves.
    let dbUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
    });
    if (!dbUser && supabaseUser.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: supabaseUser.email.toLowerCase() },
      });
    }
    if (!dbUser && supabaseUser.phone) {
      dbUser = await prisma.user.findFirst({
        where: { phone: supabaseUser.phone },
      });
    }

    if (!dbUser) {
      // AUTH-07: the credential VERIFIED. There is simply no Darshya account
      // behind it. Signing in again succeeds and lands right back here, which is
      // the AUTH-06 loop with a 401 on it, so this reason is deliberately one
      // the web does NOT treat as "sign in again".
      denyUnauthenticated(
        reply,
        'registration_incomplete',
        'User account not found. Please complete registration.',
      );
      return;
    }

    if (rejectIfBlocked(dbUser, reply)) return;

    // Fetch user roles
    let roles: MarketplaceRole[] = ['DEVOTEE'];
    try {
      const roleAssignments = await prisma.userRoleAssignment.findMany({
        where: { userId: dbUser.id },
      });
      if (roleAssignments.length > 0) {
        roles = roleAssignments.map((ra) => ra.role as MarketplaceRole);
        if (!roles.includes('DEVOTEE')) roles.push('DEVOTEE');
      }
    } catch (roleErr) {
      // Role table miss = silently downgrading to DEVOTEE-only masked a real
      // outage once. Log it so ops can tell "user is devotee" from "DB error
      // forced devotee fallback". Keep the fallback for cold-boot resilience.
      const rErrName = roleErr instanceof Error ? roleErr.name : 'UnknownRoleErr';
      const rErrMsg = roleErr instanceof Error ? roleErr.message : String(roleErr);
      request.log.warn(
        { rErrName, rErrMsg, userId: dbUser.id },
        'UserRoleAssignment lookup failed — falling back to DEVOTEE-only',
      );
    }

    // Check admin email allowlist as fallback
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
    if (dbUser.email && adminEmails.includes(dbUser.email.toLowerCase()) && !roles.includes('ADMIN')) {
      roles.push('ADMIN');
    }

    // Attach user to request
    request.currentUser = {
      id: dbUser.id,
      supabaseId: supabaseUser.id,
      phone: dbUser.phone,
      email: dbUser.email,
      fullName: dbUser.fullName,
      subscriptionTier: dbUser.subscriptionTier,
      roles,
    };
    // SCAL-05: remember it for the next request on this token. Reached only
    // after the blocked gate above, so a suspended account is never cached.
    setCachedAuth(token, request.currentUser);
  } catch (err) {
    const errName = err instanceof Error ? err.name : 'UnknownError';
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    request.log.error(
      { errName, errMsg, errStack, url: request.url },
      'Auth middleware error',
    );
    // ALLOW_AUTH_DIAGNOSTICS surfaces the real error name + message in the
    // response — useful in dev/staging triage, dangerous in prod (leaks stack
    // shape + DB error text). Hard prod gate: even if the env flag is set,
    // never surface in production. Default-deny.
    const diag = process.env.ALLOW_AUTH_DIAGNOSTICS === 'true'
      && process.env.NODE_ENV !== 'production';
    reply.code(500).send({
      error: 'Internal Server Error',
      message: diag
        ? `Auth failure: ${errName}: ${errMsg}`
        : 'Authentication service unavailable.',
    });
  }
}

/**
 * Factory for a preHandler hook that checks if the user has a specific role.
 * Supports legacy roles ('priest', 'admin') and new marketplace roles.
 */
export function requireRole(role: 'priest' | 'admin' | MarketplaceRole) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // authenticateUser must run first
    if (!request.currentUser) {
      denyUnauthenticated(reply, 'no_credentials', 'Authentication required.');
      return;
    }

    const userRoles = request.currentUser.roles ?? [];

    // Legacy 'priest' role check. P0 #ag-01 / pp-04 (2026-07-09): the PANDIT
    // role alone is NOT sufficient — it must be backed by an ACTIVE Priest
    // row. The old code short-circuited `if (userRoles.includes('PANDIT'))
    // return;` before the status check, which let any self-signup pandit
    // (no Priest row, or an inactive/suspended one) reach every priest
    // endpoint — bypassing the whole priest-verification model. Now we
    // always require the active Priest record; PANDIT only gets you to the
    // lookup, not past it.
    if (role === 'priest') {
      // Synthetic ids (`demo-*`, `anon-*`) are not real UUIDs — Prisma's
      // uuid validator rejects them, so don't attempt a DB lookup. These
      // can never be an onboarded priest. (Caught in production by Sentry
      // as "Inconsistent column data: Error creating UUID, ...".)
      const userId = request.currentUser.id;
      if (userId.startsWith('demo-') || userId.startsWith('anon-')) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'This route requires an active priest account.',
        });
        return;
      }

      const priest = await prisma.priest.findUnique({
        where: { userId },
      });

      if (!priest || priest.status !== 'active') {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'This route requires an active priest account.',
        });
        return;
      }
      return;
    }

    // Legacy 'admin' check + role-based check
    if (role === 'admin' || role === 'ADMIN') {
      if (userRoles.includes('ADMIN')) return;

      // Fallback: email allowlist
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const userEmail = request.currentUser.email?.toLowerCase();

      if (userEmail && adminEmails.includes(userEmail)) return;

      reply.code(403).send({
        error: 'Forbidden',
        message: 'This route requires admin privileges.',
      });
      return;
    }

    // Marketplace role check
    if (!userRoles.includes(role)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `This route requires the ${role} role.`,
      });
      return;
    }
  };
}

/**
 * Factory for a preHandler hook that checks if the user has ANY of the given roles.
 */
export function requireAnyRole(...roles: MarketplaceRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.currentUser) {
      denyUnauthenticated(reply, 'no_credentials', 'Authentication required.');
      return;
    }

    const userRoles = request.currentUser.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));

    if (!hasRole) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `This route requires one of: ${roles.join(', ')}`,
      });
      return;
    }
  };
}

/**
 * Registers the authentication decorator on the Fastify instance.
 * Call this once during server bootstrap.
 */
export async function registerAuthDecorators(server: FastifyInstance): Promise<void> {
  server.decorateRequest('currentUser', undefined);
}
