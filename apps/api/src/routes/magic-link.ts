import { FastifyInstance } from 'fastify';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { createEmailSession } from '../lib/email-session.js';
import { sendEmail, magicLinkEmail } from '../lib/email.js';
import { SIGNUP_DEFAULT_LANGUAGE } from '../lib/i18n.js';
import { getPrimaryRoleForUser, setAuthCookies } from './auth.js';

/**
 * Email magic-link authentication.
 *
 * Flow:
 *   1. POST /auth/magic-link/request  { email }
 *      - We mint a signed token (HMAC-SHA256 over email + nonce + expiry)
 *      - Email it to the user as a link to /auth/verify?token=...
 *   2. POST /auth/magic-link/verify  { token }
 *      - Verify signature + expiry + that the email exists in our DB (or
 *        create the user on first sign-in)
 *      - Issue a session token (we keep the existing demo-* token format
 *        so the rest of the API doesn't change)
 *
 * AUTH-05 (2026-08-28) — THE PARAGRAPH THAT USED TO STAND HERE IS GONE:
 *
 *     "No new tables needed ... The token itself is stateless, signed with
 *      JWT_SECRET. Single-use enforcement is by timestamp (15 min TTL) — for
 *      one-shot use we'd need a `usedTokens` table; for an MVP a 15-min window
 *      is acceptable."
 *
 * The 15-minute window it rested on has not been the whole story since PJ-08
 * added ONBOARDING_TOKEN_TTL_MIN = 72 hours (below) and made this link the ONLY
 * credential a partnerships-provisioned provider holds — there is no password
 * column on User. `verifyToken` re-checks an HMAC and a timestamp; both keep
 * passing for three days, so the same link in a forwarded email, a shared
 * inbox, a mail-scanner log or a browser-history entry signed somebody in as
 * that temple manager as many times as they liked, and nothing in the product
 * could revoke it.
 *
 * There is now a ledger: `magic_link_tokens`, one row per MINTED token, keyed
 * by sha256 of the token string. `/verify` consumes it with a single
 * conditional UPDATE and that UPDATE's row count is the entire decision. See
 * recordMagicLinkToken / consumeMagicLinkToken below.
 */

// P0 #P0-2 (2026-07-10): boot-fatal guard mirroring the demo-token pattern in
// middlewares/auth.ts. A hardcoded public fallback secret in production would
// let anyone forge magic-link tokens (HMAC-SHA256 over email+nonce+expiry) and
// sign in as any user. Refuse to boot in prod without a real JWT_SECRET.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error(
    '[FATAL] JWT_SECRET unset in production — magic-link token forgery risk. Refusing to boot.',
  );
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET ?? 'darshya-dev-secret';
const TOKEN_TTL_MIN = 15;

// P1-1 (2026-07-17): mirror the 10/min per-IP sensitive-auth rate limit that
// /auth/send-otp + /auth/login carry. Without this, /magic-link/request could
// be hammered to spam magic-link emails (Resend costs money) and to enumerate
// which emails have accounts. /verify gets the same cap as a credential-attack
// brake, though it is already gated by HMAC signature validation.
const sensitiveAuthRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
};

/**
 * PJ-08. Provider onboarding needs a longer-lived link than a self-service
 * "email me a link" click does.
 *
 * The self-service flow is minutes old when it lands: the user asked for it
 * seconds ago and is staring at their inbox, so 15 minutes is right and stays
 * the default. A partnerships approval is not that — it is sent when an admin
 * gets to the queue, to somebody who applied days earlier and is not waiting at
 * their laptop, and it is the ONLY credential their freshly-provisioned account
 * has (there is no password column on User). At 15 minutes that email is a dead
 * end, and apps/web has no UI anywhere to request a fresh link.
 *
 * So the TTL is a parameter with the tight default preserved, and the caller
 * that needs a longer one says so and owns the reason.
 */
export const ONBOARDING_TOKEN_TTL_MIN = 72 * 60;

/**
 * AUTH-05. The ledger key: sha256 of the token string, hex.
 *
 * The token itself is never stored. A table of live sign-in credentials in
 * plaintext would be a worse asset than the replay it prevents — anyone with
 * read access could sign in as every pending recipient. /verify re-hashes what
 * it was handed, so the hash is all the ledger ever needs.
 */
function tokenLedgerId(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * AUTH-05. Write the ledger row for a token that has just been minted.
 *
 * Raw SQL rather than `prisma.magicLinkToken.create`, matching the choice
 * lib/email-session.ts makes for `email_sessions`: the routes stay usable in
 * the many tests that mock `prisma` with a hand-written object and no generated
 * client. `$executeRawUnsafe` still parameterises — $1/$2/$3 are bound, not
 * interpolated.
 *
 * NEVER THROWS. It answers `false` instead, and the caller decides. Every
 * caller must decide something, because an absent row counts as consumed at
 * /verify (see consumeMagicLinkToken) — a link whose row was not written is a
 * link that will be rejected on first use.
 */
export async function recordMagicLinkToken(
  token: string,
  email: string,
  expiresAtSeconds: number,
): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO magic_link_tokens (id, user_email, expires_at, consumed_at)
       VALUES ($1, $2, $3::timestamptz, NULL)
       ON CONFLICT (id) DO NOTHING`,
      tokenLedgerId(token),
      email,
      new Date(expiresAtSeconds * 1000).toISOString(),
    );
    return true;
  } catch {
    // Deliberately swallowed here and reported through the return value: the
    // one caller that cannot await (see signToken) must not raise an unhandled
    // rejection, and the one that can await needs a decision, not an exception.
    return false;
  }
}

/**
 * AUTH-05. Burn the token. True only if THIS call is the one that consumed it.
 *
 * One conditional UPDATE, no read-then-write: `WHERE id = $1 AND consumed_at IS
 * NULL` makes the row count the decision and leaves no window between checking
 * and marking for a second request to slip through. Two simultaneous clicks on
 * the same link therefore produce exactly one success, decided by Postgres'
 * row lock rather than by us.
 *
 * FALSE ALSO WHEN THE ROW IS ABSENT, and that is the point. If a missing row
 * meant "allow", every token minted before this ledger existed — including
 * 72-hour onboarding links already sitting in inboxes — would bypass it
 * entirely, which is the exact population AUTH-05 is about.
 *
 * FALSE ALSO ON A DATABASE ERROR: fail closed, the same posture
 * middlewares/auth.ts takes for `email_sessions` (A-005). The table is created
 * by a migration that auto-applies before the server process starts, so "the
 * table is missing" is not a state a booted API can be in.
 */
export async function consumeMagicLinkToken(token: string): Promise<boolean> {
  try {
    const rows = await prisma.$executeRawUnsafe(
      `UPDATE magic_link_tokens SET consumed_at = now()
       WHERE id = $1 AND consumed_at IS NULL`,
      tokenLedgerId(token),
    );
    return Number(rows) === 1;
  } catch {
    return false;
  }
}

/**
 * Mint a signed magic-link token AND record it in the single-use ledger.
 *
 * `recorded` is the ledger write, already `catch`-free (recordMagicLinkToken
 * never rejects), so a caller may ignore it without risking an unhandled
 * rejection. It exists BECAUSE one caller does ignore it: routes/admin-leads.ts
 * mints the 72-hour onboarding link inside a synchronous helper
 * (`onboardingSignInUrl`) and never touches /request. Doing the write here
 * rather than in the /request handler is what keeps that link — the one the
 * whole finding is about — inside the ledger. A caller that CAN await it
 * should, and /request does: a link whose row was never written is dead on
 * arrival, so it must not be emailed.
 */
export function signToken(
  email: string,
  ttlMinutes: number = TOKEN_TTL_MIN,
): { token: string; expiresAt: number; recorded: Promise<boolean> } {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlMinutes * 60;
  const nonce = randomBytes(8).toString('hex');
  const payload = `${email}.${nonce}.${expiresAt}`;
  const sig = createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  const token = `${Buffer.from(payload).toString('base64url')}.${sig}`;
  return { token, expiresAt, recorded: recordMagicLinkToken(token, email, expiresAt) };
}

function verifyToken(token: string): { email: string; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString();
  } catch {
    return null;
  }
  const expectedSig = createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  // P2 (2026-07-10): constant-time compare to avoid a timing oracle on the
  // signature. `!==` short-circuits on the first differing byte, leaking how
  // many leading bytes match. Match the pattern in subscriptions.ts:115 —
  // guard with a length check so timingSafeEqual never sees mismatched-length
  // buffers (which throw).
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  // P0-3 (2026-07-17): the payload is `${email}.${nonce}.${expiresAt}` and the
  // email itself may contain dots (first.last@example.com is extremely common).
  // The old `const [email, , expiresAtStr] = payload.split('.')` assumed exactly
  // three segments — a dotted email produced 4+ segments, so `email` was
  // truncated (e.g. "first.last@example") and `expiresAtStr` got the nonce,
  // which parsed to a tiny int → always "expired" → EVERY dotted-email user
  // saw "Invalid or expired sign-in link" forever. Email magic-link was broken
  // for a large fraction of users in prod. Split from the RIGHT instead: the
  // nonce (16 hex) and expiresAt (all digits) are the last two `.`-separated
  // segments; everything before them is the email, dots and all.
  const segs = payload.split('.');
  if (segs.length < 3) return null;
  const expiresAtStr = segs.pop();
  segs.pop(); // nonce — verified only via the HMAC above, not re-checked here
  const email = segs.join('.');
  if (!email || !expiresAtStr) return null;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) return null;
  return { email, expiresAt };
}

/** Signing/verification internals, for tests that must not mint their own HMAC. */
export const __testing = { signToken, verifyToken };

export async function magicLinkRoutes(server: FastifyInstance) {
  // ── POST /request ──────────────────────────────────────────────────────
  server.post('/request', sensitiveAuthRateLimit, async (request, reply) => {
    const body = (request.body ?? {}) as { email?: string };
    const email = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.code(400).send({ error: 'Valid email required' });
    }

    const { token, recorded } = signToken(email);

    // AUTH-05: an absent ledger row counts as consumed at /verify, so a link
    // whose row was not written is dead on arrival. Emailing it anyway strands
    // the recipient with a link that says "invalid or expired" and no way to
    // tell that from a genuine expiry. Better to fail the request they can
    // simply repeat.
    if (!(await recorded)) {
      server.log.error(
        { email },
        'AUTH-05: magic_link_tokens insert failed — refusing to send an unusable link',
      );
      return reply.code(500).send({ error: 'Could not send email' });
    }

    const linkUrl = `${process.env.WEB_BASE_URL ?? 'https://darshya.online'}/auth/verify?token=${encodeURIComponent(token)}`;

    const tpl = magicLinkEmail(linkUrl);
    const result = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    if (result.skipped) {
      // No Resend key configured. Handing the sign-in link back in the response
      // is a local-testing convenience ONLY: /request is unauthenticated, so in
      // production a missing key would let anyone request a victim's address
      // (admins included) and read back a working session link.
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_TOKENS !== 'true') {
        server.log.error({ email }, 'magic-link: email delivery not configured; refusing to expose the link');
        return reply.code(503).send({ error: 'Could not send email' });
      }
      return reply.send({
        ok: true,
        devLink: linkUrl,
        info: 'Email skipped (RESEND_API_KEY not set). Use devLink to sign in.',
      });
    }
    if (!result.ok) {
      server.log.error({ err: result.error, email }, 'magic-link email failed');
      return reply.code(500).send({ error: 'Could not send email' });
    }
    return reply.send({ ok: true });
  });

  // ── POST /verify ───────────────────────────────────────────────────────
  server.post('/verify', sensitiveAuthRateLimit, async (request, reply) => {
    const body = (request.body ?? {}) as { token?: string };
    const token = (typeof body.token === 'string' ? body.token : '').trim();
    const verified = verifyToken(token);
    if (!verified) {
      return reply.code(400).send({ error: 'Invalid or expired sign-in link' });
    }

    // ── AUTH-05: burn the link. FIRST, before anything is minted. ──────────
    //
    // Ordering is the whole security property. Consuming after createEmailSession
    // would still write a live `email_sessions` row and still put a
    // `darshya_session` cookie on the reply for a replayed link, and only then
    // answer 400 — a session the replayer holds regardless of what the body says.
    //
    // The 400 reuses the wording above VERBATIM. A distinct "this link has
    // already been used" would turn the endpoint into an oracle: it confirms to
    // whoever captured the link that it was genuine and that the account exists,
    // which is precisely what someone replaying a forwarded email wants to know.
    //
    // Placed after verifyToken, never before: an unverified string must not
    // reach the ledger, or an attacker could burn a victim's pending link.
    if (!(await consumeMagicLinkToken(token))) {
      return reply.code(400).send({ error: 'Invalid or expired sign-in link' });
    }

    // Find or create the user
    let user = await prisma.user.findFirst({ where: { email: verified.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: verified.email,
          phone: `email-${Date.now()}`, // temporary placeholder; will be filled when phone is verified
          fullName: verified.email.split('@')[0] ?? 'Devotee',
          preferredLanguage: SIGNUP_DEFAULT_LANGUAGE,
          isNri: false,
          subscriptionTier: 'free',
        },
      });
      await prisma.userRoleAssignment.create({
        data: { userId: user.id, role: 'DEVOTEE', isPrimary: true },
      });
    }

    // Issue a session token AND persist its email_sessions row (createEmailSession).
    // The persisted row is what the auth middleware validates against — without it
    // the (now fail-closed) middleware would reject this token. See A-005.
    const { token: sessionToken, expiresAt: sessionExpiresAt } = await createEmailSession(user.id);

    // SEC-02 step 1 (2026-08-23): issue the httpOnly `darshya_session` cookie
    // this door never issued. Every provider onboarded through the partnerships
    // pipeline signs in here and nowhere else, so without this they hold no
    // cookie credential at all and are structurally stuck on the JS-readable
    // localStorage token — which is why the localStorage write in apps/web
    // could not be deleted and SEC-02 could not close.
    //
    // The two arguments that are NOT /auth/login's defaults, and why:
    //   • maxAge tracks THIS session's real expiry. The email_sessions row lives
    //     7 days (EMAIL_SESSION_TTL_MS); setAuthCookies' default is the 1-hour
    //     Supabase access TTL, which would sign the provider out six days early.
    //   • no refresh cookie. There is no refresh token on this path (see the
    //     empty string below — kept for wire compatibility) because there is no
    //     Supabase session behind an email-session token for POST /auth/refresh
    //     to exchange. An empty `darshya_refresh` could only ever fail.
    // The cookie authenticates as-is: middlewares/auth.ts reads darshya_session
    // and validates `email-*` tokens against the email_sessions table.
    const sessionMaxAge = Math.max(
      1,
      Math.floor((sessionExpiresAt.getTime() - Date.now()) / 1000),
    );
    setAuthCookies(reply, sessionToken, null, { sessionMaxAge });

    return reply.send({
      ok: true,
      session: {
        accessToken: sessionToken,
        refreshToken: '',
        expiresIn: 60 * 60 * 24 * 7,
        expiresAt: Math.floor(sessionExpiresAt.getTime() / 1000),
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        // AUTH-03 (2026-08-23): this door answered with no role, so the web
        // client's `fromApiRole(undefined)` made every magic-link user a
        // devotee — and a magic link is the ONLY credential a partnerships-
        // provisioned provider has (no password column on User). A temple
        // manager was bounced out of /temple-portal on every single sign-in.
        // Same resolver /login, /verify-otp, /me and Google sync already use,
        // so all five doors now agree on one answer.
        role: await getPrimaryRoleForUser(user.id, user.email),
      },
    });
  });
}
