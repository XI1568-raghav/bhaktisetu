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
  url?: string;
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

// Cloudflare's published edge ranges (https://www.cloudflare.com/ips/). They change
// roughly never; a stale list fails SAFE (an unlisted edge IP just means the header is
// ignored and the caller falls into the shared proxy bucket).
const CF_V4: Array<[number, number]> = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
].map((c) => {
  const [ip, bits] = c.split('/') as [string, string];
  const n = ip.split('.').reduce((a, o) => a * 256 + Number(o), 0);
  const size = 2 ** (32 - Number(bits));
  return [n, n + size - 1] as [number, number];
});
const CF_V6_PREFIXES = ['2400:cb00:', '2606:4700:', '2803:f800:', '2405:b500:', '2405:8100:', '2a06:98c0:', '2c0f:f248:'];

export function isCloudflareEdgeIp(raw: string): boolean {
  const ip = raw.trim().replace(/^::ffff:/i, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const n = ip.split('.').reduce((a, o) => a * 256 + Number(o), 0);
    return CF_V4.some(([lo, hi]) => n >= lo && n <= hi);
  }
  const lower = ip.toLowerCase();
  return CF_V6_PREFIXES.some((p) => lower.startsWith(p));
}

/**
 * Was this request really forwarded by Cloudflare?
 *
 * The API origin (the Render `onrender.com` hostname) is publicly reachable
 * without Cloudflare, so `CF-Connecting-IP` is only a trustworthy claim when the
 * request provably came through a Cloudflare edge. Two proofs, either suffices:
 *  1. `CF_ORIGIN_SECRET` is set and the request carries it in `x-origin-secret`
 *     (owner adds a Cloudflare Transform Rule that sets that request header).
 *  2. The LAST `X-Forwarded-For` hop is a Cloudflare edge IP. Render's load
 *     balancer appends the address of the peer it accepted the connection from,
 *     so a direct caller cannot make that entry a Cloudflare address.
 */
export function viaCloudflare(req: RateLimitKeyRequest): boolean {
  const secret = process.env.CF_ORIGIN_SECRET;
  if (secret) return header(req, 'x-origin-secret') === secret;
  const xff = header(req, 'x-forwarded-for');
  const last = xff?.split(',').pop();
  return !!last && isCloudflareEdgeIp(last);
}

/**
 * The true client IP.
 *
 * `CF-Connecting-IP` is honoured ONLY when `viaCloudflare` holds; otherwise
 * anyone hitting the origin directly could rotate it to mint unlimited
 * buckets. Raw `X-Forwarded-For` is never used as the client address.
 */
export function clientIp(req: RateLimitKeyRequest): string {
  return (viaCloudflare(req) ? header(req, 'cf-connecting-ip') : undefined) ?? req.ip;
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
  // Pre-authentication endpoints (login, signup, OTP, reset) are brute-force targets, and
  // the credential header is attacker-chosen there: rotating a junk `Authorization: Bearer x`
  // would mint a fresh bucket per request. Always partition them by client IP.
  const path = (req.url ?? '').split('?')[0] ?? '';
  if (/^(\/api\/v1)?\/auth(\/|$)/.test(path)) return `ip:${clientIp(req)}`;

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
