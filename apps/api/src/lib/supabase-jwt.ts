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
 * AUTH-07 (F454, 2026-09-08) — why the verifier refused, for the ONE refusal
 * where saying so costs nothing.
 *
 * `verifySupabaseJwt` returns a bare `null` and the docblock below explains
 * why: "a verifier that leaks its reasoning is an oracle." That is right for
 * every refusal that happens BEFORE the HMAC check — telling a caller which of
 * `alg`, structure or signature rejected their forgery is exactly the drip an
 * attacker uses to shape the next attempt. It is not right for expiry, and the
 * cost of the blanket rule is real: the API cannot distinguish "your session
 * ran out" from "we could not verify you", so apps/web answered both with "Your
 * session has expired" and answered a database outage with it too.
 *
 * `expired` is only ever returned when the signature ALREADY verified against
 * the project secret and `aud` already matched. At that point the caller is
 * holding a token this project minted, and `exp` is a plaintext claim inside
 * the token in their own hand — `atob(token.split('.')[1]).exp` reads it
 * without asking us. Disclosing it discloses nothing. Every refusal that has
 * NOT passed the signature check still collapses into `malformed` or
 * `unverified`, so the oracle property the original docblock protects is
 * unchanged for the input an attacker actually controls.
 */
export type SupabaseJwtRejection =
  /** No `SUPABASE_JWT_SECRET` in this process — offline verification is off. */
  | 'no_secret'
  /** Not a JWT we can even take apart. Decided before any crypto. */
  | 'malformed'
  /** Refused: wrong `alg`, bad signature, wrong `aud`, or no usable `sub`/`exp`. */
  | 'unverified'
  /** Signature AND audience verified; `exp` is in the past. */
  | 'expired';

export type SupabaseJwtInspection =
  | { ok: true; token: VerifiedSupabaseToken }
  | { ok: false; reason: SupabaseJwtRejection };

/**
 * The full verification, with its verdict. `verifySupabaseJwt` is this function
 * with the reason thrown away, so there is exactly one implementation and the
 * two cannot disagree about whether a token is good.
 */
export function inspectSupabaseJwt(
  token: string,
  secret: string | undefined,
  nowMs: number = Date.now(),
): SupabaseJwtInspection {
  if (!secret) return { ok: false, reason: 'no_secret' };
  if (!token) return { ok: false, reason: 'malformed' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [headerSeg, payloadSeg, sigSeg] = parts as [string, string, string];
  if (!headerSeg || !payloadSeg || !sigSeg) return { ok: false, reason: 'malformed' };

  const header = parseJson(fromB64Url(headerSeg));
  // Strict allow-list. Accepting the header's own `alg` is the alg:none /
  // alg-confusion bypass: `{"alg":"none"}` with an empty signature would
  // otherwise authenticate anybody as anybody.
  if (!header || header.alg !== 'HS256') return { ok: false, reason: 'unverified' };

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headerSeg}.${payloadSeg}`)
    .digest();
  const actual = fromB64Url(sigSeg);
  if (!actual || actual.length !== expected.length) return { ok: false, reason: 'unverified' };
  if (!crypto.timingSafeEqual(actual, expected)) return { ok: false, reason: 'unverified' };

  const payload = parseJson(fromB64Url(payloadSeg));
  if (!payload) return { ok: false, reason: 'unverified' };

  // Supabase mints access tokens with aud "authenticated". An anon key is also
  // a valid JWT signed by the same secret, so WITHOUT this check the project's
  // public anon key would authenticate as whatever `sub` it carries.
  if (!audienceIncludes(payload.aud, 'authenticated')) return { ok: false, reason: 'unverified' };

  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return { ok: false, reason: 'unverified' };
  // The one refusal that is safe to name — signature and audience are already
  // proven above, so this token is ours and its `exp` is public to its bearer.
  if (exp * 1000 <= nowMs) return { ok: false, reason: 'expired' };

  const sub = payload.sub;
  if (typeof sub !== 'string' || sub.length === 0) return { ok: false, reason: 'unverified' };

  return {
    ok: true,
    token: {
      id: sub,
      email: typeof payload.email === 'string' && payload.email ? payload.email : null,
      phone: typeof payload.phone === 'string' && payload.phone ? payload.phone : null,
      expSeconds: exp,
    },
  };
}

/**
 * Returns the token's subject when it verifies, `null` otherwise. Never throws
 * and never explains WHY it refused — the caller falls back to the remote check
 * either way, and a verifier that leaks its reasoning is an oracle.
 *
 * `secret` is passed in rather than read from env so tests and the middleware
 * share one code path and rotation is a caller concern.
 *
 * AUTH-07: `inspectSupabaseJwt` is the same computation WITH the verdict, for
 * the caller that needs to tell an expired session from an unverifiable one.
 * This wrapper keeps the null-or-token contract every existing caller was
 * written against; behaviour is unchanged for all four inputs.
 */
export function verifySupabaseJwt(
  token: string,
  secret: string | undefined,
  nowMs: number = Date.now(),
): VerifiedSupabaseToken | null {
  const result = inspectSupabaseJwt(token, secret, nowMs);
  return result.ok ? result.token : null;
}
