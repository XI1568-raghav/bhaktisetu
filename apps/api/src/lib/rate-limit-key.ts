import { createHash } from 'node:crypto';

// SCAL-01 — how a request is partitioned into a rate-limit bucket.
//
// This lives in its own module for one reason: server.ts and the test suite
// must call THE SAME function. The previous test re-implemented the key
// derivation inline, so it asserted only that its own copy behaved — and the
// server's real behaviour (every user sharing one bucket) went unnoticed
// through a green suite.

/** The subset of a Fastify request this needs. Keeps the module test-friendly. */
export interface RateLimitKeyRequest {
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}

/** Stable, non-reversible partition id derived from a session credential. */
function fingerprint(secret: string): string {
  return createHash('sha256').update(secret).digest('base64url').slice(0, 22);
}

function header(req: RateLimitKeyRequest, name: string): string | undefined {
  const v = req.headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  const trimmed = s?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The true client IP.
 *
 * Only `CF-Connecting-IP` is trusted: Cloudflare fronts every production
 * hostname and overwrites that header on ingress, so an outside caller cannot
 * forge it. Raw `X-Forwarded-For` is deliberately NOT trusted — `trustProxy`
 * is off, and honouring a client-supplied XFF would let anyone mint unlimited
 * buckets by rotating the header, which is a worse failure than sharing one.
 */
export function clientIp(req: RateLimitKeyRequest): string {
  return header(req, 'cf-connecting-ip') ?? req.ip;
}

/**
 * Bucket key for a request.
 *
 * Authenticated callers are partitioned by a hash of their session credential
 * rather than by `currentUser.id`. That is not a stylistic choice: this runs in
 * @fastify/rate-limit's `onRequest` hook, and `authenticateUser` is attached
 * per-route as a `preHandler` (67 route files). Fastify runs
 * onRequest → preValidation → preHandler, so `currentUser` is ALWAYS undefined
 * here. Reading it meant every signed-in user on earth shared the single
 * `ip:<render-proxy>` bucket — a ~1.7 req/s ceiling for the whole platform.
 *
 * The credential is hashed, never verified. An invalid or expired token simply
 * gets its own bucket and is still rejected by the preHandler a moment later.
 */
export function rateLimitKey(req: RateLimitKeyRequest): string {
  const bearer = header(req, 'authorization');
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    const token = bearer.slice(7).trim();
    if (token) return `u:${fingerprint(token)}`;
  }

  // Web moved auth into the httpOnly `darshya_session` cookie (P0 #200), so a
  // browser request may carry no Authorization header at all.
  const cookie = header(req, 'cookie');
  const session = cookie?.match(/(?:^|;\s*)darshya_session=([^;]+)/)?.[1];
  if (session) return `u:${fingerprint(session)}`;

  return `ip:${clientIp(req)}`;
}
