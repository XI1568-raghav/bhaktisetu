import { createHash } from 'node:crypto';

/**
 * SCAL-05 (2026-08-13): short-lived, in-process cache of an already-verified
 * access token.
 *
 * `authenticateUser` calls `supabaseAdmin.auth.getUser(token)` on EVERY
 * authenticated request — an outbound HTTPS round trip to Supabase GoTrue in
 * ap-northeast-1 — and then issues 1–3 Prisma user lookups plus a
 * `userRoleAssignment.findMany`. So a request that reads one row really costs
 * one cross-Pacific HTTPS call plus 2–4 cross-Pacific SQL statements, and the
 * API's throughput ceiling becomes Supabase Auth's rate limit rather than its
 * own capacity. A slow minute at Supabase logs out every devotee, pandit and
 * temple manager at once (the middleware answers 500, it does not degrade).
 *
 * What is safe to cache and why:
 *
 *   - The key is a SHA-256 of the WHOLE token, so an entry can only ever be
 *     read back by the exact token that produced it. A forged or altered token
 *     hashes elsewhere and misses — nothing is trusted that was not verified.
 *   - Entries expire at min(TTL, the token's own `exp`), so a cached identity
 *     can never outlive the token it came from. `exp` is read from the payload
 *     WITHOUT verifying the signature, which is sound in this direction only:
 *     it can shorten a cache lifetime, never extend or grant trust.
 *   - Blocked accounts are never cached — the block gate runs before the write.
 *     An account blocked AFTER being cached is evicted explicitly by
 *     `invalidateAuthUser`, which admin.service.updateUser calls whenever it
 *     blocks a user or changes their roles. Without that call a ban would take
 *     up to the TTL to bite, which is exactly the contract-half this codebase
 *     keeps dropping.
 *
 * This does not remove the FIRST verification of a token, and it is per
 * container. It removes the repeat ones, which is the volume.
 *
 * AUTH_CACHE_TTL_MS=0 disables it entirely.
 */

export interface CachedAuthUser {
  id: string;
  supabaseId: string;
  phone: string | null;
  email: string | null;
  fullName: string;
  subscriptionTier: string;
  roles: string[];
}

const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 5000;

function ttlMs(): number {
  const raw = process.env.AUTH_CACHE_TTL_MS;
  if (raw === undefined) return DEFAULT_TTL_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TTL_MS;
}

type Entry = { user: CachedAuthUser; expiresAt: number };

const byToken = new Map<string, Entry>();
const keysByUser = new Map<string, Set<string>>();

function keyFor(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * `exp` (seconds since epoch) from a JWT payload, or null for anything that is
 * not a three-part JWT. Never used to accept a token — only to expire an entry
 * no later than the token itself.
 */
export function tokenExpiryMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    );
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function forget(key: string): void {
  const entry = byToken.get(key);
  if (!entry) return;
  byToken.delete(key);
  const keys = keysByUser.get(entry.user.id);
  if (keys) {
    keys.delete(key);
    if (keys.size === 0) keysByUser.delete(entry.user.id);
  }
}

/** A previously verified identity for this exact token, or null. */
export function getCachedAuth(token: string): CachedAuthUser | null {
  if (ttlMs() === 0) return null;
  const key = keyFor(token);
  const entry = byToken.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    forget(key);
    return null;
  }
  return entry.user;
}

/** Remember a verified identity. Callers must have run the blocked gate first. */
export function setCachedAuth(token: string, user: CachedAuthUser): void {
  const ttl = ttlMs();
  if (ttl === 0) return;
  const key = keyFor(token);
  const tokenExp = tokenExpiryMs(token);
  const expiresAt = Math.min(Date.now() + ttl, tokenExp ?? Number.POSITIVE_INFINITY);
  if (expiresAt <= Date.now()) return; // already-expired token: nothing to cache
  forget(key);
  byToken.set(key, { user, expiresAt });
  let keys = keysByUser.get(user.id);
  if (!keys) {
    keys = new Set();
    keysByUser.set(user.id, keys);
  }
  keys.add(key);
  while (byToken.size > MAX_ENTRIES) {
    const oldest = byToken.keys().next();
    if (oldest.done) break;
    forget(oldest.value);
  }
}

/**
 * Drop every cached session for one user. Call on block/unblock and on any role
 * change — a moderation action must take effect on the next request, not after
 * the TTL.
 */
export function invalidateAuthUser(userId: string): void {
  const keys = keysByUser.get(userId);
  if (!keys) return;
  for (const key of Array.from(keys)) forget(key);
  keysByUser.delete(userId);
}

/** Test seam. */
export function __authCacheSize(): number {
  return byToken.size;
}

/** Test seam. */
export function __authCacheClear(): void {
  byToken.clear();
  keysByUser.clear();
}
