import crypto from 'node:crypto';

/**
 * SCAL-05 — verify a Supabase access token WITHOUT calling Supabase.
 *
 * `authenticateUser` had exactly one non-demo path: an outbound HTTPS request
 * to Supabase GoTrue in ap-northeast-1 on every single authenticated request,
 * before the 2–4 Prisma lookups that follow it. Measured consequences: an extra
 * ~100–300 ms of third-party round trip that no query tuning can remove, a
 * throughput ceiling set by Supabase Auth's rate limit rather than by this
 * API's capacity, and — because the middleware answers 500 "Authentication
 * service unavailable" rather than degrading — one slow minute at Supabase
 * locking out every logged-in devotee, pandit and temple manager at once.
 *
 * Supabase signs access tokens HS256 with the project JWT secret, so signature,
 * expiry and audience are all checkable offline with `node:crypto` and no
 * dependency. That is what this does.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   - It does not decide authorisation. It answers "this token was minted by
 *     our Supabase project and has not expired" and nothing else. Roles, the
 *     blocked gate and the Prisma identity all still run in the middleware.
 *   - It does not replace the remote check. The caller keeps
 *     `supabaseAdmin.auth.getUser` as the fallback for anything refused here,
 *     so a rotated or mistyped secret degrades to the old behaviour instead of
 *     locking every user out.
 *   - It does not handle asymmetric (RS256/ES256) project keys. Those need a
 *     JWKS fetch; a project using them simply keeps the remote path, because
 *     `alg` is checked strictly below rather than trusted from the header.
 *
 * OWNER ACTION REQUIRED for any of this to engage: set `SUPABASE_JWT_SECRET`
 * (Supabase dashboard → Settings → API → JWT secret) on the API service. Unset
 * is the default and means "no local verification", which is exactly today's
 * behaviour.
 */

export interface VerifiedSupabaseToken {
  /** The Supabase user id (`sub`). */
  id: string;
  email: string | null;
  phone: string | null;
  /** `exp` in epoch seconds — the caller must not cache past this. */
  expSeconds: number;
}

/** Whether offline verification is available in this process. */
export function supabaseJwtConfig(): { enabled: boolean } {
  return { enabled: !!process.env.SUPABASE_JWT_SECRET };
}

function fromB64Url(segment: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]*$/.test(segment)) return null;
  const pad = segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4));
  try {
    return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
  } catch {
    return null;
  }
}

function parseJson(buf: Buffer | null): Record<string, unknown> | null {
  if (!buf) return null;
  try {
    const parsed: unknown = JSON.parse(buf.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** `aud` may be a string or an array of strings in the JWT spec. */
function audienceIncludes(aud: unknown, wanted: string): boolean {
  if (typeof aud === 'string') return aud === wanted;
  if (Array.isArray(aud)) return aud.some((a) => a === wanted);
  return false;
}

/**
 * Returns the token's subject when it verifies, `null` otherwise. Never throws
 * and never explains WHY it refused — the caller falls back to the remote check
 * either way, and a verifier that leaks its reasoning is an oracle.
 *
 * `secret` is passed in rather than read from env so tests and the middleware
 * share one code path and rotation is a caller concern.
 */
export function verifySupabaseJwt(
  token: string,
  secret: string | undefined,
  nowMs: number = Date.now(),
): VerifiedSupabaseToken | null {
  if (!secret || !token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerSeg, payloadSeg, sigSeg] = parts as [string, string, string];
  if (!headerSeg || !payloadSeg || !sigSeg) return null;

  const header = parseJson(fromB64Url(headerSeg));
  // Strict allow-list. Accepting the header's own `alg` is the alg:none /
  // alg-confusion bypass: `{"alg":"none"}` with an empty signature would
  // otherwise authenticate anybody as anybody.
  if (!header || header.alg !== 'HS256') return null;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headerSeg}.${payloadSeg}`)
    .digest();
  const actual = fromB64Url(sigSeg);
  if (!actual || actual.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(actual, expected)) return null;

  const payload = parseJson(fromB64Url(payloadSeg));
  if (!payload) return null;

  // Supabase mints access tokens with aud "authenticated". An anon key is also
  // a valid JWT signed by the same secret, so WITHOUT this check the project's
  // public anon key would authenticate as whatever `sub` it carries.
  if (!audienceIncludes(payload.aud, 'authenticated')) return null;

  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
  if (exp * 1000 <= nowMs) return null;

  const sub = payload.sub;
  if (typeof sub !== 'string' || sub.length === 0) return null;

  return {
    id: sub,
    email: typeof payload.email === 'string' && payload.email ? payload.email : null,
    phone: typeof payload.phone === 'string' && payload.phone ? payload.phone : null,
    expSeconds: exp,
  };
}
