import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSupabaseClient } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { SIGNUP_DEFAULT_LANGUAGE } from '../lib/i18n.js';

// Tighter rate limit for unauthenticated credential/OTP endpoints — the
// global 100/min is too generous for OTP-spam and credential-stuffing.
// 10 requests per minute per IP is comfortable for a real user retrying
// once or twice; trivially blocks scripted brute-force.
const sensitiveAuthRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
};

// ─── Validation Schemas ────────────────────────────────────────────────────────

const sendOtpSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number is too long')
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format. Use format: +919876543210'),
});

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
  token: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

/**
 * SEC-02, STEP 1 — the credential may arrive in the BODY or in the httpOnly
 * COOKIE.
 *
 * `refreshToken` was REQUIRED here, and the handler only ever read
 * `request.body`. The httpOnly `darshya_refresh` cookie — issued at login
 * below, scoped to /api/v1/auth — was never read at all. So a cookie-only
 * client could sign in and authenticate, then silently lose its session at the
 * one-hour access-token TTL because it could not refresh. THAT is why the
 * JS-readable localStorage copy of the token could not be dropped, and why the
 * whole of SEC-02 stalled behind this one schema.
 *
 * Optional, not removed: the body still wins when present, so mobile and every
 * currently-deployed web build keep working unchanged. The 400 now fires only
 * when BOTH sources are absent.
 */
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

/**
 * AUTH-09 (2026-08-20): sign-out scope is now something the caller states.
 *
 * This endpoint was unconditionally GLOBAL — `supabase.auth.signOut()` defaults
 * to global, and the handler then burned every `refresh_token_jtis` row the
 * user had. Signing out on a shared laptop silently ended the session on their
 * phone, and nothing in the product mentioned it.
 *
 * `global` REMAINS THE DEFAULT. Flipping it would be a quiet security
 * regression for every currently-deployed client, and global is the right
 * behaviour after a password change or on a device you no longer trust. What
 * changes is that it is now a decision, the response says which one was
 * applied, and the UI can tell the user before they make it.
 */
const logoutSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required').optional(),
  scope: z.enum(['local', 'global']).optional(),
});

/** Cookie bag off a Fastify request, tolerant of @fastify/cookie being absent. */
type CookieBag = Record<string, string | undefined> | undefined;

function firstNonEmpty(...candidates: Array<unknown>): string | null {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c;
  }
  return null;
}

/**
 * Body first (today's clients), then the httpOnly cookie (the secure path).
 * Non-string body values are ignored rather than passed on — `request.body` is
 * attacker-shaped and this value reaches createHash and Supabase.
 */
export function resolveRefreshToken(
  body: { refreshToken?: string } | undefined,
  cookies: CookieBag,
): string | null {
  return firstNonEmpty(body?.refreshToken, cookies?.[REFRESH_COOKIE]);
}

export function resolveAccessToken(
  body: { accessToken?: string } | undefined,
  cookies: CookieBag,
): string | null {
  return firstNonEmpty(body?.accessToken, cookies?.[SESSION_COOKIE]);
}

const googleSyncSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
  expiresAt: z.number().nullable().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  // 8 chars minimum + at least one letter and one digit. Long enough to
  // resist trivial brute force, simple enough to remember without a
  // password manager. Special-character requirements are skipped on
  // purpose: NIST 800-63B says they don't help and harm UX.
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['devotee', 'pandit', 'store_owner', 'astrologer', 'wellness_instructor', 'gaushala_manager', 'temple_manager']).optional().default('devotee'),
  city: z.string().optional(),
});

// ─── Demo accounts registry (in-memory fallback when DB unavailable) ─────────
const DEMO_ACCOUNTS: Record<string, { password: string; role: string; fullName: string }> = {
  'devotee@demo.com': { password: 'demo123', role: 'devotee', fullName: 'Arjun Sharma' },
  'pandit@demo.com': { password: 'demo123', role: 'pandit', fullName: 'Pandit Kamal Joshi' },
  'priest@demo.com': { password: 'demo123', role: 'pandit', fullName: 'Pandit Kamal Joshi' },
  'store@demo.com': { password: 'demo123', role: 'store_owner', fullName: 'Rajesh Gupta' },
  'astro@demo.com': { password: 'demo123', role: 'astrologer', fullName: 'Acharya Vikram' },
  'wellness@demo.com': { password: 'demo123', role: 'wellness_instructor', fullName: 'Meera Iyer' },
  'gaushala@demo.com': { password: 'demo123', role: 'gaushala_manager', fullName: 'Ram Prasad' },
  'temple@demo.com': { password: 'demo123', role: 'temple_manager', fullName: 'Shyam Kumar' },
  'admin@demo.com': { password: 'demo123', role: 'admin', fullName: 'Platform Admin' },
};

function makeDemoSession(email: string) {
  const userId = `demo-${email.split('@')[0]}`;
  return {
    session: {
      accessToken: `demo-${userId}-token`,
      refreshToken: `demo-${userId}-refresh`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
  };
}

// A-014 / A-015 (2026-08-10): `ADMIN_EMAILS` is the platform admin allow-list.
// The API authorization gate already honours it (middlewares/auth.ts:304,400),
// but the *login* role resolver below did not — so an owner who is admin only
// via `ADMIN_EMAILS` was returned `role:'devotee'` and the web AuthGuard
// bounced them straight off /admin even though every /admin API call would
// have passed. Reading the same env here is also the first-admin bootstrap
// (A-015): admin-ness comes from server-side config the operator sets on
// Render, never from anything a client can post, so there is no self-grant
// path. Kept in sync with the middleware parsing (trim + lowercase); the
// extra Boolean filter stops an unset/empty `ADMIN_EMAILS` from producing a
// stray '' entry that a blank email could match.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowList = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowList.includes(email.toLowerCase());
}

// Resolve a user's primary role from user_role_assignments and return it
// in the web-facing lowercase form (`pandit`, `store_owner`, ...). Falls
// back to 'devotee' when no assignment exists. Centralised so /me,
// /login, /verify-otp, and Google sync all surface the same answer —
// without this, the web layer kept treating new providers as devotees
// because the response carried no role field.
export async function getPrimaryRoleForUser(userId: string, email?: string | null): Promise<string> {
  // A-014: the allow-list outranks the role table — an operator-listed admin
  // must land on /admin regardless of what role rows the account also carries.
  if (isAdminEmail(email)) return 'admin';
  try {
    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    if (assignments.length === 0) return 'devotee';
    // A-010 backstop: exactly one row should be primary, but if a demote ever
    // half-applies we'd have two and the older DEVOTEE row would win the
    // `createdAt asc` tiebreak — re-locking the provider out of their portal.
    // Among equally-primary rows, prefer the non-DEVOTEE one.
    const primaries = assignments.filter((a) => a.isPrimary);
    const pool = primaries.length > 0 ? primaries : assignments;
    const chosen = pool.find((a) => a.role !== 'DEVOTEE') ?? pool[0]!;
    return chosen.role.toLowerCase();
  } catch {
    // A-014: a role-table outage must not silently demote a configured admin.
    return isAdminEmail(email) ? 'admin' : 'devotee';
  }
}

// A-009 (2026-08-10): seed the refresh-token JTI ledger at ISSUANCE.
// /refresh only ever inserted the *rotated* token's JTI, so the original
// refresh token minted at login/verify-otp/signup had no ledger row: replaying
// it produced no `used_at` hit, and the family-wide revoke backstop therefore
// never covered the one token an attacker is most likely to have stolen.
// Best-effort by design — a ledger write failure must not block a successful
// login, it only degrades replay detection back to Supabase's native rotation.
async function seedRefreshTokenJti(
  request: import('fastify').FastifyRequest,
  refreshToken: string | null | undefined,
  userId: string | null | undefined,
): Promise<void> {
  if (!refreshToken || !userId) return;
  try {
    const { createHash } = await import('node:crypto');
    const jti = createHash('sha256').update(refreshToken).digest('hex');
    // 30-day TTL — same horizon /refresh uses for rotated tokens.
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.$executeRawUnsafe(
      `INSERT INTO refresh_token_jtis (jti, user_id, expires_at) VALUES ($1, $2::uuid, $3::timestamptz)
       ON CONFLICT (jti) DO NOTHING`,
      jti,
      userId,
      expiresAt.toISOString(),
    );
  } catch (err) {
    request.log.warn({ err }, 'JTI seed at issuance failed — original refresh token not covered by replay backstop');
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Normalizes a phone number to include +91 if no country code is present.
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
}

// ─── Per-identity rate limits ──────────────────────────────────────────────────
// Tighter than the 100/min global @fastify/rate-limit. Keyed on the *target*
// of the auth event (phone for OTP, email for login) — not the source IP —
// so an attacker rotating IPs through CF still hits the same bucket and we
// protect the actual victim's account.
//
// SMS pump (Twilio bills us per SMS; Supabase forwards to Twilio): cap OTP
// sends per phone at 5 per 15-min window. Real users typo at most once.
// Credential stuffing on /login: cap to 10 attempts per email per 15-min
// window. Fits manual flow; blocks scripted lists.
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_MAX = 5;
const LOGIN_RATE_MAX = 10;
type Bucket = { count: number; windowStart: number };
const otpBuckets = new Map<string, Bucket>();
const loginBuckets = new Map<string, Bucket>();
function bucketOk(map: Map<string, Bucket>, key: string, max: number): boolean {
  const now = Date.now();
  const b = map.get(key);
  if (!b || now - b.windowStart > AUTH_RATE_WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

// ─── Session-cookie helpers ────────────────────────────────────────────────────
// P1 #4 — additive HttpOnly cookies alongside the JSON Bearer response.
// Mobile keeps reading the JSON body; web transitions to cookies. Both flows
// remain valid until the web migration is fully cut over.
//
// `darshya_session` carries the access token. Default TTL 3600s — Supabase
// access tokens are 1h. We don't read the TTL off env to keep this self-
// contained; flip the constant when Supabase project changes the lifetime.
// `darshya_refresh` is scoped to /api/v1/auth so it's only sent on the
// refresh endpoint, never on regular API calls. 7-day default matches
// Supabase's refresh-token lifetime.
const SESSION_COOKIE = 'darshya_session';
const REFRESH_COOKIE = 'darshya_refresh';
const SESSION_TTL_SECONDS = 60 * 60;                 // 1 hour
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;        // 7 days
const REFRESH_COOKIE_PATH = '/api/v1/auth';

/**
 * SEC-02, prerequisite — the flags every auth cookie carries.
 *
 * `secure` used to be hardcoded `true`, and a Secure cookie is never stored by
 * a browser over `http://localhost`. So on every developer machine the
 * `darshya_session` path silently did not exist, which is why the localStorage
 * Bearer is still the primary credential and still the XSS liability SEC-02
 * describes: nobody could exercise the replacement locally. 83 files under
 * apps/web hand-build `Authorization: Bearer ${token}` and only 11 send
 * `credentials: 'include'`, so cutting the localStorage write before the cookie
 * path is testable would 401 most of the product.
 *
 * Production is unchanged — Secure stays on, and a test pins that. `httpOnly`
 * is NOT environment-dependent: a JS-readable cookie is the localStorage
 * problem wearing a different hat.
 */
function cookieSecurityOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
}

/**
 * SEC-02, prerequisite — EXPORTED so the other session-minting routes can issue
 * the same cookies with the same flags.
 *
 * `POST /auth/magic-link/verify` (routes/magic-link.ts) mints a Supabase
 * session and returns it as JSON but never sets these cookies, so a magic-link
 * user — which is every provider onboarded through the partnerships pipeline —
 * has no `darshya_session` at all and is structurally stuck on the JS-readable
 * localStorage token SEC-02 is about. That route could not call this function
 * while it was module-private; its only alternatives were to duplicate the
 * flags (which is how httpOnly/Secure/SameSite drift apart) or to leave
 * magic-link users unmigratable, and the second is what kept SEC-02 open.
 *
 * Callers: pass the raw access + refresh tokens. Flags come from
 * cookieSecurityOptions() — do not re-declare them at the call site.
 * Contract pinned by auth.setauthcookies-export.sec02.test.ts.
 *
 * NOT EVERY SESSION IS A SUPABASE SESSION (SEC-02 step 1, 2026-08-23).
 * The defaults here describe the /login shape: a 1-hour Supabase access token
 * paired with a 7-day refresh token. `POST /auth/magic-link/verify` is a
 * different animal — `createEmailSession` mints an `email_sessions` row that
 * lives SEVEN DAYS and there is no refresh token at all behind it (that route
 * literally answers `refreshToken: ''`). Handing those values here unmodified
 * would write a 1-hour cookie over a 7-day session — signing the provider out
 * six days early, with an empty `darshya_refresh` that /auth/refresh can only
 * ever reject, since /refresh is a Supabase exchange. Hence the two knobs:
 *   - pass `null`/`''` for `refreshToken` to skip the refresh cookie entirely;
 *   - pass `sessionMaxAge` (seconds) when the session's real lifetime is not
 *     SESSION_TTL_SECONDS.
 * Both default to today's behaviour, so /login, /verify-otp, /signup, /refresh
 * and Google sync are untouched.
 */
export function setAuthCookies(
  reply: import('fastify').FastifyReply,
  accessToken: string,
  refreshToken: string | null,
  options?: { sessionMaxAge?: number },
): void {
  // setCookie is added by @fastify/cookie. If the plugin isn't registered
  // yet (current state of this app — see auth-model docs), the call throws.
  // We swallow that here so the JSON Bearer response path stays intact and
  // never regresses on the missing-plugin case. Once @fastify/cookie is
  // wired in server bootstrap, cookies start flowing automatically.
  const r = reply as any;
  if (typeof r.setCookie !== 'function') return;
  const sessionMaxAge =
    typeof options?.sessionMaxAge === 'number' && options.sessionMaxAge > 0
      ? Math.floor(options.sessionMaxAge)
      : SESSION_TTL_SECONDS;
  try {
    r.setCookie(SESSION_COOKIE, accessToken, {
      ...cookieSecurityOptions(),
      path: '/',
      maxAge: sessionMaxAge,
    });
    // An empty refresh cookie is strictly worse than none: it is sent on every
    // /api/v1/auth call and can only produce a failed exchange.
    if (refreshToken) {
      r.setCookie(REFRESH_COOKIE, refreshToken, {
        ...cookieSecurityOptions(),
        path: REFRESH_COOKIE_PATH,
        maxAge: REFRESH_TTL_SECONDS,
      });
    }
  } catch {
    // best-effort; JSON Bearer response remains the contract of record
  }
}

function clearAuthCookies(reply: import('fastify').FastifyReply): void {
  const r = reply as any;
  if (typeof r.clearCookie !== 'function') return;
  try {
    r.clearCookie(SESSION_COOKIE, { path: '/' });
    r.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  } catch {
    // best-effort
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

export async function authRoutes(server: FastifyInstance) {
  // Log every auth-route hit with the Cloudflare-provided country code so
  // we can answer "is auth working from country X?" by reading prod logs
  // instead of round-tripping a VPN. cf-ipcountry is set by Cloudflare on
  // every request that traverses the proxy; missing means the request
  // came in directly (e.g. local dev or a debugging curl). We don't log
  // PII — just route, country, status, and (for failures) the response
  // code, which is enough to spot a geo-block pattern.
  server.addHook('onResponse', async (request, reply) => {
    const country = request.headers['cf-ipcountry'];
    if (typeof country === 'string' && country.length > 0) {
      request.log.info(
        {
          authEvent: true,
          route: request.routeOptions.url ?? request.url,
          method: request.method,
          country,
          status: reply.statusCode,
        },
        'auth.geo',
      );
    }
  });

  /**
   * POST /send-otp
   * Sends a one-time password to the given phone number via Supabase Auth (SMS).
   */
  server.post('/send-otp', sensitiveAuthRateLimit, async (request, reply) => {
    const parseResult = sendOtpSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        details: parseResult.error.errors,
      });
    }

    const phone = normalizePhone(parseResult.data.phone);
    if (!bucketOk(otpBuckets, phone, OTP_RATE_MAX)) {
      return reply.code(429).send({
        error: 'TooManyRequests',
        message: 'Too many OTP requests for this number. Try again in 15 minutes.',
      });
    }
    const supabase = createSupabaseClient();

    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      request.log.error(error, 'Supabase signInWithOtp failed');
      return reply.code(400).send({
        error: 'OTP Error',
        message: error.message || 'Failed to send OTP. Please try again.',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'OTP sent successfully. Please check your phone.',
      phone,
    });
  });

  /**
   * POST /verify-otp
   * Verifies the OTP, creates/updates the Supabase session, and upserts
   * the user in the Prisma `users` table on first login.
   */
  server.post('/verify-otp', sensitiveAuthRateLimit, async (request, reply) => {
    const parseResult = verifyOtpSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        details: parseResult.error.errors,
      });
    }

    const phone = normalizePhone(parseResult.data.phone);
    const { token } = parseResult.data;
    const supabase = createSupabaseClient();

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error || !data.session) {
      request.log.error(error, 'Supabase verifyOtp failed');
      return reply.code(400).send({
        error: 'Verification Error',
        message: error?.message || 'Invalid or expired OTP. Please try again.',
      });
    }

    const { session, user: supabaseUser } = data;

    // Upsert user in Prisma database (create on first login)
    let dbUser;
    try {
      dbUser = await prisma.user.upsert({
        where: { phone },
        update: {
          // Update nothing on subsequent logins — profile changes go through /users/me
        },
        create: {
          phone,
          fullName: '',
          email: supabaseUser?.email || null,
          preferredLanguage: SIGNUP_DEFAULT_LANGUAGE,
        },
      });
    } catch (dbError) {
      request.log.error(dbError, 'Failed to upsert user in database');
      return reply.code(500).send({
        error: 'Database Error',
        message: 'Failed to create user account. Please try again.',
      });
    }

    const role = await getPrimaryRoleForUser(dbUser.id, dbUser.email);

    // A-009: cover this freshly-minted refresh token with the replay ledger.
    // Keyed on the Supabase auth user id, matching what /refresh and /logout
    // write — a phone-first user's Prisma id differs from their Supabase id.
    await seedRefreshTokenJti(request, session.refresh_token, supabaseUser?.id);

    return reply.code(200).send({
      success: true,
      message: 'OTP verified successfully',
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
        expiresAt: session.expires_at,
        tokenType: session.token_type,
      },
      user: {
        id: dbUser.id,
        phone: dbUser.phone,
        fullName: dbUser.fullName,
        email: dbUser.email,
        role,
        avatarUrl: dbUser.avatarUrl,
        preferredLanguage: dbUser.preferredLanguage,
        subscriptionTier: dbUser.subscriptionTier,
        isNewUser: dbUser.fullName === '',
      },
    });
  });

  /**
   * POST /refresh
   * Refreshes an expired access token using the refresh token.
   *
   * Refresh-token rotation is handled NATIVELY by Supabase Auth:
   * `auth.refreshSession({ refresh_token })` returns a NEW refresh_token on
   * every success and invalidates the prior one server-side (configured via
   * GoTrue REFRESH_TOKEN_ROTATION_ENABLED, default ON for Supabase Cloud).
   * Replaying a used refresh_token returns an error and the family is revoked.
   * The local JTI ledger below is a defence-in-depth backstop on top of that —
   * A-009 (2026-08-10) closed the hole where only ROTATED tokens were seeded,
   * leaving the login-issued token outside the family-revoke net.
   */
  server.post('/refresh', async (request, reply) => {
    const parseResult = refreshSchema.safeParse(request.body ?? {});
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
      });
    }

    // SEC-02: body OR the httpOnly darshya_refresh cookie. 400 only when the
    // request carries no refresh credential at all.
    const refreshToken = resolveRefreshToken(
      parseResult.data,
      request.cookies as Record<string, string | undefined> | undefined,
    );
    if (!refreshToken) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Refresh token is required',
      });
    }

    // Phase C P1 #4 (2026-06-08): JTI single-use replay detection.
    // Hash the opaque Supabase refresh token to use as JTI key (no plaintext in DB).
    const { createHash } = await import('node:crypto');
    const jti = createHash('sha256').update(refreshToken).digest('hex');

    // Check ledger BEFORE Supabase refresh — replay detection.
    let replayDetected = false;
    let knownUserId: string | null = null;
    try {
      const existing = await prisma.$queryRawUnsafe<Array<{ user_id: string; used_at: Date | null; expires_at: Date }>>(
        `SELECT user_id, used_at, expires_at FROM refresh_token_jtis WHERE jti = $1 LIMIT 1`,
        jti,
      );
      const row = existing[0];
      if (row) {
        knownUserId = row.user_id;
        if (row.used_at !== null) {
          replayDetected = true;
        }
        if (new Date(row.expires_at).getTime() < Date.now()) {
          // Expired — let Supabase deny naturally below.
        }
      }
    } catch (err) {
      request.log.warn({ err }, 'JTI ledger lookup failed — proceeding w/o replay check');
    }

    if (replayDetected && knownUserId) {
      // Family-wide revoke — mark all of this user's JTIs as used.
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE refresh_token_jtis SET used_at = now() WHERE user_id = $1::uuid AND used_at IS NULL`,
          knownUserId,
        );
      } catch (err) {
        request.log.error({ err, userId: knownUserId }, 'JTI family revoke after replay detection FAILED');
      }
      clearAuthCookies(reply);
      return reply.code(401).send({
        error: 'Token Reuse Detected',
        message: 'Refresh token replay detected. All sessions for this user have been revoked. Please log in again.',
      });
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return reply.code(401).send({
        error: 'Refresh Error',
        message: error?.message || 'Failed to refresh session. Please log in again.',
      });
    }

    // Mark old JTI used + insert new JTI for the new refresh token.
    try {
      const newJti = createHash('sha256').update(data.session.refresh_token).digest('hex');
      const userId = data.session.user.id;
      // 30-day TTL for new JTI (Supabase default refresh token lifetime).
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      // A-009 (2026-08-10): only burn the presented JTI when Supabase actually
      // rotated. Inside GoTrue's reuse-interval a retry can return the SAME
      // refresh token; burning it there would make the very next legitimate
      // refresh look like a replay and family-revoke every session the user has.
      if (knownUserId && newJti !== jti) {
        await prisma.$executeRawUnsafe(
          `UPDATE refresh_token_jtis SET used_at = now() WHERE jti = $1 AND used_at IS NULL`,
          jti,
        );
      }
      await prisma.$executeRawUnsafe(
        `INSERT INTO refresh_token_jtis (jti, user_id, expires_at) VALUES ($1, $2::uuid, $3::timestamptz)
         ON CONFLICT (jti) DO NOTHING`,
        newJti,
        userId,
        expiresAt.toISOString(),
      );
    } catch (err) {
      request.log.warn({ err }, 'JTI rotation write failed — refresh succeeded but ledger out of sync');
    }

    setAuthCookies(reply, data.session.access_token, data.session.refresh_token);
    return reply.code(200).send({
      success: true,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at,
        tokenType: data.session.token_type,
      },
    });
  });

  /**
   * POST /logout
   * Signs the user out of Supabase, invalidating the session.
   */
  server.post('/logout', async (request, reply) => {
    const parseResult = logoutSchema.safeParse(request.body ?? {});
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
      });
    }

    // SEC-02: body OR the httpOnly darshya_session cookie. A cookie-only client
    // must be able to sign OUT, or the only way to end a session is to wait for
    // it to expire.
    const accessToken = resolveAccessToken(
      parseResult.data,
      request.cookies as Record<string, string | undefined> | undefined,
    );
    if (!accessToken) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Access token is required',
      });
    }

    // AUTH-09: default preserved. An older client that sends no `scope` gets
    // exactly the behaviour it has always had.
    const scope = parseResult.data.scope ?? 'global';

    // Phase C P1 #5 (2026-06-08): email-session revocation server-side.
    // If token matches the email-{userId}-{hex} format, mark revoked_at in email_sessions.
    if (typeof accessToken === 'string' && /^email-/.test(accessToken)) {
      try {
        if (scope === 'global') {
          // AUTH-11: reach the user's OTHER magic-link sessions too. Revoking
          // only the presented row is why "You've been signed out everywhere"
          // was false for providers, whose sessions are all magic-link ones.
          // The user is resolved by subquery rather than by parsing the token,
          // because the id embedded in it is a uuid and the token separator is
          // also '-'.
          await prisma.$executeRawUnsafe(
            `UPDATE email_sessions SET revoked_at = now()
             WHERE user_id = (SELECT user_id FROM email_sessions WHERE id = $1)
               AND revoked_at IS NULL`,
            accessToken,
          );
        } else {
          await prisma.$executeRawUnsafe(
            `UPDATE email_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
            accessToken,
          );
        }
      } catch (err) {
        request.log.warn({ err }, 'EmailSession revoke best-effort failed');
      }
    } else if (typeof accessToken === 'string') {
      // Supabase JWT path: call signOut + best-effort revoke any JTIs for the user.
      const supabase = createSupabaseClient(accessToken);
      if (scope === 'global') {
        const { error } = await supabase.auth.signOut();
        if (error) {
          request.log.warn(error, 'Supabase signOut error (non-critical)');
        }
      }
      // Best-effort: revoke active JTIs for this user from extracted sub claim.
      try {
        const claims = await supabase.auth.getUser(accessToken);
        const userId = claims.data?.user?.id;
        if (userId && scope === 'global') {
          await prisma.$executeRawUnsafe(
            `UPDATE refresh_token_jtis SET used_at = now() WHERE user_id = $1::uuid AND used_at IS NULL`,
            userId,
          );
          // AUTH-11: a password user may ALSO hold a magic-link session on
          // another device. "Everywhere" has to include it.
          await prisma.$executeRawUnsafe(
            `UPDATE email_sessions SET revoked_at = now() WHERE user_id = $1::uuid AND revoked_at IS NULL`,
            userId,
          );
        }
      } catch (err) {
        request.log.warn({ err }, 'JTI revoke best-effort failed');
      }
    }

    clearAuthCookies(reply);
    return reply.code(200).send({
      success: true,
      // AUTH-09: the caller is told what actually happened, so the UI can stop
      // describing a multi-device sign-out as a single-device one.
      scope,
      message:
        scope === 'global'
          ? 'Signed out on this and every other device.'
          : 'Signed out on this device.',
    });
  });

  /**
   * GET /me
   * Protected route: returns the authenticated user's profile from Prisma.
   */
  server.get('/me', { preHandler: [authenticateUser] }, async (request, reply) => {
    const currentUser = request.currentUser!;

    /*
     * REMOVED (I18N-07, 2026-08-19) - a synthetic-demo branch that answered
     * GET /me out of the in-memory demo profile, including a hardcoded
     * `preferredLanguage: 'en'`.
     *
     * It had been unreachable since AW-08: middlewares/auth.ts resolves every
     * demo token to the real User row's UUID and 401s fail-closed when the row
     * is missing, so `currentUser.id` is never a `demo-` string here. Dead code
     * is not why it had to go - a hardcoded language sitting in the same file
     * as the fix is how the defect returns, and it contradicted the row this
     * route otherwise reads. Now there is exactly one source for the field:
     * the database.
     */
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        addresses: true,
        subscription: {
          where: { status: 'active' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User profile not found.',
      });
    }

    const role = await getPrimaryRoleForUser(user.id, user.email);

    return reply.code(200).send({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role,
        avatarUrl: user.avatarUrl,
        preferredLanguage: user.preferredLanguage,
        locationCity: user.locationCity,
        locationState: user.locationState,
        isNri: user.isNri,
        nriCountry: user.nriCountry,
        gotra: user.gotra,
        nakshatra: user.nakshatra,
        rashi: user.rashi,
        subscriptionTier: user.subscriptionTier,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        addresses: user.addresses,
        activeSubscription: user.subscription[0] || null,
      },
    });
  });

  /**
   * POST /login
   * Email + password login. Checks demo accounts first, then falls through to DB.
   */
  server.post('/login', sensitiveAuthRateLimit, async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid request body',
      });
    }

    const { email, password } = parseResult.data;
    const emailLower = email.toLowerCase();

    if (!bucketOk(loginBuckets, emailLower, LOGIN_RATE_MAX)) {
      return reply.code(429).send({
        error: 'TooManyRequests',
        message: 'Too many login attempts for this email. Try again in 15 minutes.',
      });
    }

    // Check demo accounts first — DEV/STAGING ONLY.
    // Prod gate: NODE_ENV !== 'production' OR explicit ALLOW_DEMO_TOKENS=true.
    // Without this, hardcoded admin@demo.com/demo123 grants ADMIN session in prod.
    const demoAllowed = process.env.NODE_ENV !== 'production'
      || process.env.ALLOW_DEMO_TOKENS === 'true';
    if (demoAllowed) {
      const demo = DEMO_ACCOUNTS[emailLower];
      if (demo && demo.password === password) {
        // AW-08 (prod sweep 2026-08-12, P1) — LOGIN AND THE MIDDLEWARE MUST
        // AGREE ON THE IDENTITY.
        //
        // This used to answer 200 with a synthesised `id: "demo-<handle>"`
        // regardless of whether the account existed. middlewares/auth.ts now
        // fails closed (401) when a demo handle's User row is absent, so the
        // two halves contradicted each other: astro@demo.com logged in
        // successfully, the web app routed into /astrologer-portal, and every
        // call inside it answered 401. Before that middleware fix the same
        // synthetic non-UUID id reached Prisma and produced P2023/P2010 500s
        // carrying the query, the SQL and the absolute source path.
        //
        // Resolve the row here and hand back its REAL uuid. If it is not
        // seeded, refuse with the same sentence the middleware uses — a
        // configuration problem must not present as a working session.
        //
        // A LOOKUP THAT THREW IS NOT A LOOKUP THAT MISSED. Swallowing the
        // error into `null` would report "not seeded" whenever Postgres is
        // merely unreachable, sending whoever hits it to re-run a seed that
        // was never the problem. Observed for real on 2026-08-14: the local
        // Postgres accepted TCP on 55432 but reset the wire protocol, and
        // every demo login answered "is not seeded in this database".
        let demoRow: Awaited<ReturnType<typeof prisma.user.findUnique>> | null = null;
        try {
          demoRow = await prisma.user.findUnique({ where: { email: emailLower } });
        } catch (err) {
          request.log.error({ err, email: emailLower }, 'demo login could not reach the database');
          return reply.code(503).send({
            error: 'ServiceUnavailable',
            message: 'Sign-in is temporarily unavailable. Please try again in a moment.',
          });
        }
        if (!demoRow) {
          request.log.warn(
            { event: 'demo_user_not_seeded', email: emailLower },
            'demo login attempted for an account that is not seeded',
          );
          return reply.code(401).send({
            error: 'Unauthorized',
            message: `Demo account ${emailLower} is not seeded in this database. Run the demo seed before using this token.`,
          });
        }
        if (demoRow.blocked) {
          return reply
            .code(403)
            .send({ error: 'Forbidden', message: 'This account has been suspended.' });
        }
        const { session } = makeDemoSession(emailLower);
        setAuthCookies(reply, session.accessToken, session.refreshToken);
        return reply.send({
          session,
          user: {
            id: demoRow.id,
            email: demoRow.email ?? emailLower,
            fullName: demoRow.fullName ?? demo.fullName,
            role: demo.role,
            avatarUrl: demoRow.avatarUrl ?? null,
            preferredLanguage: demoRow.preferredLanguage ?? 'en',
            subscriptionTier: demoRow.subscriptionTier ?? 'free',
            createdAt: (demoRow.createdAt ?? new Date()).toISOString(),
          },
        });
      }
    }

    // Try DB lookup (will fail gracefully if DB unavailable)
    try {
      const user = await prisma.user.findUnique({
        where: { email: emailLower },
        include: { subscription: { where: { status: 'active' }, take: 1 } },
      });

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      // Note: in production, verify password hash here (bcrypt.compare)
      // For now, we rely on Supabase Auth for password verification
      const supabase = createSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });

      if (authError || !authData.session) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      // AUTH-08 (2026-08-20): THE SUSPENSION GATE WAS MISSING FROM THE DOOR.
      //
      // middlewares/auth.ts refuses every AUTHENTICATED request from a blocked
      // user with 403 "Account suspended", and the demo branch of this same
      // handler checks `demoRow.blocked` — but the real DB path did not. So a
      // suspended account signed in successfully, the web app stored the
      // session and routed into a portal, and then every call inside it 403'd.
      // friendlyApiError maps 403 to "Your session has expired. Please sign in
      // again", which sends them back to a login that works: an endless loop
      // with nothing anywhere naming the suspension. Blocking is an
      // authorization decision and belongs at the door.
      //
      // Placed AFTER password verification on purpose: answering 403 before the
      // credential is checked would turn this endpoint into an oracle for which
      // addresses are suspended. Only the account's real owner learns it.
      if (user.blocked) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: user.blockedReason
            ? `Account suspended: ${user.blockedReason}`
            : 'This account has been suspended.',
        });
      }

      const role = await getPrimaryRoleForUser(user.id, user.email);

      // A-009: seed the replay ledger for the refresh token we are about to hand out.
      await seedRefreshTokenJti(request, authData.session.refresh_token, authData.session.user?.id);

      setAuthCookies(reply, authData.session.access_token, authData.session.refresh_token);
      return reply.send({
        session: {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresAt: authData.session.expires_at ? authData.session.expires_at * 1000 : null,
        },
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role,
          avatarUrl: user.avatarUrl,
          preferredLanguage: user.preferredLanguage,
          subscriptionTier: user.subscriptionTier,
          createdAt: user.createdAt,
          activeSubscription: user.subscription[0] || null,
        },
      });
    } catch (err) {
      // DB/Supabase unavailable — only demo accounts work
      request.log.error({ err, email: emailLower }, 'Login failed — DB unavailable');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid credentials.',
      });
    }
  });

  /**
   * POST /signup (alias: /register)
   * Register a new user with email + password + role.
   */
  const signupHandler = async (request: any, reply: any) => {
    const parseResult = signupSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid request body',
      });
    }

    const { email, password, fullName, phone, role, city } = parseResult.data;
    const emailLower = email.toLowerCase();

    // Reject if using a demo email (prevent conflicts)
    if (DEMO_ACCOUNTS[emailLower]) {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'This email is reserved for demo accounts. Please use a different email.',
      });
    }

    try {
      const supabase = createSupabaseClient();

      // Sign up via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLower,
        password,
      });

      if (authError) {
        return reply.code(400).send({
          error: 'SignupFailed',
          message: authError.message,
        });
      }

      if (!authData.user) {
        return reply.code(500).send({
          error: 'SignupFailed',
          message: 'Failed to create user',
        });
      }

      // Upsert user in our DB. We use the Supabase auth.users.id as our
      // primary key so foreign keys line up; upsert (instead of create)
      // makes signup idempotent if Supabase succeeded on a prior attempt
      // but our DB write didn't.
      // `phone` is optional in the signup form but the schema column is
      // unique. Send a real value when provided; pass null otherwise so
      // the multi-NULL unique-index path handles it cleanly.
      const phoneValue = phone && phone.trim() ? phone.trim() : null;

      // P1 — wrap user + role assignment + provider stub in a single
      // transaction. Previously: 3 sequential writes with the inner two
      // try/catch-swallowed. If role assignment failed after user upsert
      // succeeded, account read back as DEVOTEE and the provider portal
      // was unreachable until admin patched. Now atomic: any inner failure
      // rolls back user create, signup returns 500, retry is idempotent
      // (Supabase auth + Prisma upsert both no-op on existing rows).
      const SIGNUP_ROLE_ENUM: Record<string, 'DEVOTEE' | 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER'> = {
        devotee: 'DEVOTEE',
        pandit: 'PANDIT',
        store_owner: 'STORE_OWNER',
        astrologer: 'ASTROLOGER',
        wellness_instructor: 'WELLNESS_INSTRUCTOR',
        gaushala_manager: 'GAUSHALA_MANAGER',
        temple_manager: 'TEMPLE_MANAGER',
      };
      const enumRole = SIGNUP_ROLE_ENUM[role];

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.upsert({
          where: { id: authData.user!.id },
          update: {
            email: emailLower,
            fullName,
            // Only overwrite phone if the user supplied one this time;
            // never wipe a previously-set phone with null.
            ...(phoneValue ? { phone: phoneValue } : {}),
            locationCity: city || undefined,
          },
          create: {
            id: authData.user!.id,
            email: emailLower,
            fullName,
            phone: phoneValue,
            locationCity: city || undefined,
          },
        });

        if (enumRole) {
          await tx.userRoleAssignment.upsert({
            where: { userId_role: { userId: u.id, role: enumRole } },
            update: { isPrimary: true },
            create: { userId: u.id, role: enumRole, isPrimary: true },
          });

          // Seed a stub provider profile (approved=false) so the account
          // shows up in /admin/approvals immediately, even if the
          // secondary /onboarding/provider call from web signup never
          // fires. Idempotent: empty update preserves any real data a
          // later /onboarding/provider call writes.
          switch (enumRole) {
            case 'PANDIT':
              await tx.panditProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, experience: 0, specialties: [], languages: [], pricePerPuja: 500 },
              });
              break;
            case 'STORE_OWNER':
              await tx.storeProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, storeName: fullName || 'Unnamed Store', categories: [] },
              });
              break;
            case 'ASTROLOGER':
              await tx.astrologerProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, displayName: fullName || 'Astrologer', specialties: [], experience: 0, languages: [], pricePerMinute: 10 },
              });
              break;
            case 'WELLNESS_INSTRUCTOR':
              await tx.wellnessProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, displayName: fullName || 'Wellness Instructor', specialties: [], certifications: [], experience: 0, pricePerSession: 500 },
              });
              break;
            case 'GAUSHALA_MANAGER':
              await tx.gaushalaProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, gaushalaName: fullName || 'Unnamed Gaushala', totalCows: 0 },
              });
              break;
            case 'TEMPLE_MANAGER':
              await tx.templeProfile.upsert({
                where: { userId: u.id },
                update: {},
                create: { userId: u.id, templeName: fullName || 'Unnamed Temple' },
              });
              break;
          }
        }

        return u;
      });

      // A-009: seed the replay ledger for the session signup hands back. With
      // Supabase email-confirm ON there is no session yet — that user's first
      // token is minted by /login, which seeds it there.
      if (authData.session) {
        await seedRefreshTokenJti(request, authData.session.refresh_token, authData.session.user?.id);
      }

      // A-015 (2026-08-10): first-admin bootstrap. `admin` is not in the signup
      // role enum, so nobody can self-grant it — but an operator who put this
      // address in `ADMIN_EMAILS` IS an admin the moment the account exists,
      // and /login + /me + the API gate all already say so. The signup response
      // has to agree, otherwise the web stores role:'devotee' from this very
      // response and drops the brand-new admin on /dashboard, which is exactly
      // the "#211 remedy doesn't work" symptom A-014 describes.
      const effectiveRole = isAdminEmail(emailLower) ? 'admin' : role;
      const needsApproval = effectiveRole !== 'devotee' && effectiveRole !== 'admin';

      return reply.code(201).send({
        session: authData.session
          ? {
              accessToken: authData.session.access_token,
              refreshToken: authData.session.refresh_token,
              expiresAt: authData.session.expires_at ? authData.session.expires_at * 1000 : null,
            }
          : null,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: effectiveRole,
          status: needsApproval ? 'pending_approval' : 'active',
        },
        message: needsApproval
          ? 'Account created. Your profile is pending approval.'
          : 'Account created successfully',
      });
    } catch (err: any) {
      request.log.error({ err: err?.message, code: err?.code, email: emailLower }, 'Signup failed');

      // Handle duplicate email/phone
      if (err?.code === 'P2002') {
        const target = Array.isArray(err?.meta?.target) ? err.meta.target.join(',') : String(err?.meta?.target ?? '');
        const friendly = target.includes('phone')
          ? 'An account with this phone number already exists'
          : 'An account with this email already exists';
        return reply.code(409).send({ error: 'Conflict', message: friendly });
      }

      // In dev (Supabase NOT configured), fall back to a demo session so the
      // local signup flow still works without a live backend. In prod, surface
      // the real error so we can fix it instead of silently masking it.
      // Hard prod gate: even if supabaseConfigured check misreads a placeholder
      // URL, never issue demo sessions in production.
      const supabaseConfigured = !!process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'https://demo.supabase.co';
      if (supabaseConfigured || process.env.NODE_ENV === 'production') {
        // A-008 (2026-08-10): /signup is unauthenticated, so echoing err.message
        // handed anonymous callers raw Prisma/Supabase text — table and column
        // names, constraint names, connection strings in some driver errors.
        // Prod gets a generic line; the real message is already in the
        // request.log.error above, which is where triage should read it.
        const isProd = process.env.NODE_ENV === 'production';
        return reply.code(500).send({
          error: 'SignupFailed',
          message: isProd
            ? 'Could not create account. Please try again.'
            : err?.message || 'Could not create account. Please try again.',
        });
      }

      const demoId = `demo-${emailLower.split('@')[0]}-${Date.now()}`;
      return reply.code(201).send({
        session: {
          accessToken: `demo-${demoId}-token`,
          refreshToken: `demo-${demoId}-refresh`,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        },
        user: {
          id: demoId,
          email: emailLower,
          fullName,
          role,
          status: role === 'devotee' ? 'active' : 'pending_approval',
        },
        message: role === 'devotee'
          ? 'Account created successfully (demo mode)'
          : 'Account created. Your profile is pending approval. (demo mode)',
      });
    }
  };

  server.post('/signup', sensitiveAuthRateLimit, signupHandler);
  server.post('/register', sensitiveAuthRateLimit, signupHandler);

  /**
   * POST /auth/google/sync
   * Web finishes the Google OAuth dance with Supabase client-side. The
   * Supabase access_token it receives is already valid for our Supabase
   * project; we use it to identify the user, then upsert the matching
   * Prisma row keyed on email. Returns the same {session, user} shape as
   * /auth/login so the web auth-context can store it identically.
   */
  server.post('/google/sync', async (request, reply) => {
    const parseResult = googleSyncSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid request body',
      });
    }

    const { accessToken, refreshToken, expiresAt } = parseResult.data;

    const supabase = createSupabaseClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid Google session',
      });
    }

    const supaUser = authData.user;
    const email = supaUser.email?.toLowerCase();
    if (!email) {
      return reply.code(400).send({
        error: 'BadRequest',
        message: 'Google account did not return an email address',
      });
    }

    // Block colliding with reserved demo accounts (same guard as /signup).
    if (DEMO_ACCOUNTS[email]) {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'This email is reserved for demo accounts.',
      });
    }

    // Pull a display name from Google metadata; fall back to the email local-part.
    const meta = (supaUser.user_metadata || {}) as Record<string, unknown>;
    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      email.split('@')[0] ||
      'New user';
    const avatarUrl =
      (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
      (typeof meta.picture === 'string' && meta.picture) ||
      null;

    try {
      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {
          // Refresh display fields on every login so a Google avatar/name change reflects.
          fullName,
          avatarUrl,
        },
        // phone is nullable per schema (20260428_phone_nullable migration).
        create: {
          id: supaUser.id,
          email,
          fullName,
          avatarUrl,
          phone: null,
          preferredLanguage: SIGNUP_DEFAULT_LANGUAGE,
        },
        include: { subscription: { where: { status: 'active' }, take: 1 } },
      });

      // AUTH-08: same gate as POST /login. Google sign-in is a second door into
      // the same account, and it had no suspension check at all — so blocking a
      // user in the admin surface stopped nothing as long as they used the
      // Google button. Checked after the Supabase token has been validated, so
      // this cannot be used to enumerate suspended addresses.
      if (dbUser.blocked) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: dbUser.blockedReason
            ? `Account suspended: ${dbUser.blockedReason}`
            : 'This account has been suspended.',
        });
      }

      const role = await getPrimaryRoleForUser(dbUser.id, dbUser.email);

      // A-009: the Google refresh token reaches our /refresh endpoint like any
      // other, so it needs a ledger row to fall under the family-revoke net.
      await seedRefreshTokenJti(request, refreshToken, supaUser.id);

      return reply.send({
        session: {
          accessToken,
          refreshToken,
          expiresAt: expiresAt ?? null,
        },
        user: {
          id: dbUser.id,
          email: dbUser.email,
          phone: dbUser.phone,
          fullName: dbUser.fullName,
          role,
          avatarUrl: dbUser.avatarUrl,
          preferredLanguage: dbUser.preferredLanguage,
          subscriptionTier: dbUser.subscriptionTier,
          createdAt: dbUser.createdAt,
          activeSubscription: dbUser.subscription[0] || null,
          isNewUser: dbUser.fullName === fullName && Date.now() - new Date(dbUser.createdAt).getTime() < 5000,
        },
      });
    } catch (err) {
      request.log.error({ err, email }, 'Google sync — DB upsert failed');
      return reply.code(500).send({
        error: 'DatabaseError',
        message: 'Failed to sync user account. Please try again.',
      });
    }
  });
}

/** Internals reachable from tests only. */
export const __testing = {
  cookieSecurityOptions,
  // SEC-02 STEP 1: the schemas and resolvers are unit-tested directly — the
  // refresh handler itself reaches Supabase and the JTI ledger, and this
  // contract (body OR cookie) is exactly what was blocking the migration.
  refreshSchema,
  logoutSchema,
  resolveRefreshToken,
  resolveAccessToken,
};
