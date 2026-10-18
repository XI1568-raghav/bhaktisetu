import { prisma } from './prisma.js';

/**
 * Access-token revocation for the offline-verified (SCAL-05) Supabase JWT path.
 *
 * WHY. `authenticateUser` verifies the HS256 signature in-process, so a token
 * that GoTrue has since signed out stays valid until its own `exp` (up to an
 * hour), and the 60 s auth cache keeps even a remote-verified one alive after a
 * logout, a block or a deletion.
 *
 * WHAT. One tiny table, `auth_token_revocations`, keyed (user_id, session_id):
 *   - session_id = ''            user-wide cutoff: every token with `iat` before
 *                                `valid_after` is dead (logout-all, change-password,
 *                                block, deletion, admin force-logout; a reset done in Supabase
 *                                is not seen by the API, so it relies on token expiry);
 *   - session_id = <session_id>  only the access tokens carrying that
 *                                `session_id` claim (per-device logout).
 * A per-device logout of a token WITHOUT a `session_id` claim writes nothing:
 * there is no way to tell its device from the others, so it must not log the
 * user out everywhere.
 *
 * COST. At most one indexed PK-prefix read per user per REVOCATION_CACHE_MS
 * (default 30 s, shared by concurrent requests); demo tokens and email-session
 * tokens never reach it. Writes evict this process's cache immediately, other
 * containers converge within the cache window.
 *
 * FAILURE MODES. A lookup that errors FAILS OPEN (the token is accepted and the
 * failure is cached for 5 s so a DB blip is not hammered): a database blip must
 * not sign everybody out. A missing table is treated as "nothing revoked". The
 * table is created lazily on the first write (CREATE TABLE IF NOT EXISTS, same
 * as the other lazily created tables) and ships as an additive migration too;
 * the API never requires it to exist.
 */

const DEFAULT_CACHE_MS = 30_000;
const FAIL_OPEN_CACHE_MS = 5_000;
const MAX_ENTRIES = 5000;
/** Per-session rows only matter while a token of that session can still be alive. */
const SESSION_ROW_RETENTION = `interval '2 days'`;

function cacheMs(): number {
  const raw = process.env.TOKEN_REVOCATION_CACHE_MS;
  if (raw === undefined) return DEFAULT_CACHE_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CACHE_MS;
}

interface RevocationState {
  /** epoch ms of the user-wide cutoff, or null */
  cutoffMs: number | null;
  sessions: Set<string>;
}

interface Entry {
  state: RevocationState;
  expiresAt: number;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<RevocationState | null>>();
/**
 * Bumped by every revoke (before and after its write). A lookup remembers the value it started
 * under and discards its result if the value moved: otherwise a read that began before the
 * revocation committed could re-store the pre-revocation state for a whole cache window.
 * Global, not per user: a spurious discard only costs one extra read.
 */
let generation = 0;
const stats = { lookups: 0, cacheHits: 0, failOpen: 0 };

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS "auth_token_revocations" (
  "user_id"     UUID NOT NULL,
  "session_id"  TEXT NOT NULL DEFAULT '',
  "valid_after" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "session_id")
)`;

function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string; meta?: { code?: string } } | null)?.meta?.code
    ?? (err as { code?: string } | null)?.code;
  return code === '42P01' || /does not exist|42P01/i.test(msg);
}

async function readState(userId: string): Promise<RevocationState> {
  stats.lookups += 1;
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "session_id", "valid_after" FROM "auth_token_revocations"
      WHERE "user_id" = $1::uuid
        AND ("session_id" = '' OR "valid_after" > now() - ${SESSION_ROW_RETENTION})`,
    userId,
  )) as Array<{ session_id: string; valid_after: Date | string }>;
  const state: RevocationState = { cutoffMs: null, sessions: new Set() };
  for (const r of rows ?? []) {
    if (r.session_id === '') state.cutoffMs = new Date(r.valid_after).getTime();
    else state.sessions.add(r.session_id);
  }
  return state;
}

async function loadState(userId: string): Promise<RevocationState | null> {
  const ttl = cacheMs();
  const now = Date.now();
  if (ttl > 0) {
    const hit = cache.get(userId);
    if (hit && hit.expiresAt > now) {
      stats.cacheHits += 1;
      return hit.state;
    }
  }
  let pending = inflight.get(userId);
  if (!pending) {
    let mine: Promise<RevocationState | null> | undefined;
    mine = (async () => {
      try {
        for (let attempt = 0; ; attempt++) {
          const startedAt = generation;
          let state: RevocationState;
          try {
            state = await readState(userId);
          } catch (err) {
            if (!isMissingTable(err)) throw err;
            state = { cutoffMs: null, sessions: new Set<string>() };
          }
          // A revoke ran while we were reading: this snapshot may predate it. Never store it.
          if (generation !== startedAt && attempt < 2) continue;
          if (generation === startedAt) remember(userId, state, ttl);
          return state;
        }
      } catch {
        // Fail OPEN. Remember the failure briefly so an outage is not retried per request.
        stats.failOpen += 1;
        remember(userId, { cutoffMs: null, sessions: new Set() }, Math.min(ttl || FAIL_OPEN_CACHE_MS, FAIL_OPEN_CACHE_MS));
        return null;
      } finally {
        // A revoke may already have replaced this entry with a newer lookup: leave that one alone.
        if (inflight.get(userId) === mine) inflight.delete(userId);
      }
    })();
    pending = mine;
    inflight.set(userId, pending);
  }
  return pending;
}

function remember(userId: string, state: RevocationState, ttl: number): void {
  if (ttl <= 0) return;
  cache.delete(userId);
  cache.set(userId, { state, expiresAt: Date.now() + ttl });
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

export interface TokenClaims {
  iat: number | null;
  sessionId: string | null;
}

/**
 * `iat` / `session_id` from a JWT payload. Reads WITHOUT verifying: callers only
 * use this on a token that has already been verified (or already accepted from
 * the auth cache), and only to make the decision stricter.
 */
export function tokenClaims(token: string): TokenClaims {
  const parts = token.split('.');
  if (parts.length !== 3) return { iat: null, sessionId: null };
  try {
    const p = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as {
      iat?: unknown;
      session_id?: unknown;
    };
    return {
      iat: typeof p.iat === 'number' && Number.isFinite(p.iat) ? p.iat : null,
      sessionId: typeof p.session_id === 'string' && p.session_id ? p.session_id : null,
    };
  } catch {
    return { iat: null, sessionId: null };
  }
}

/**
 * Has this user's token been revoked? Never throws; any lookup failure answers
 * false (fail open). A token with no `iat` cannot be compared with the cutoff and
 * is only subject to the per-session rows.
 */
export async function isTokenRevoked(userId: string, token: string): Promise<boolean> {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return false;
    const state = await loadState(userId);
    if (!state) return false;
    const { iat, sessionId } = tokenClaims(token);
    if (sessionId && state.sessions.has(sessionId)) return true;
    // `iat` has one-second resolution: compare against the cutoff's whole second
    // so a token minted by a sign-in that follows the logout within that same
    // second is not thrown away.
    if (state.cutoffMs !== null && iat !== null && iat < Math.floor(state.cutoffMs / 1000)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Revoke a user's access tokens. Without `sessionId`: every token issued before
 * now. With `sessionId`: only that session's tokens. Evicts this process's cache
 * so the effect is immediate here. Returns false (and logs nothing fatal) when
 * the write could not be made; callers treat it as best-effort because GoTrue
 * and the refresh ledger are revoked separately.
 */
export async function revokeUserTokens(
  userId: string,
  opts: { sessionId?: string | null } = {},
): Promise<boolean> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return false;
  const sid = opts.sessionId ?? '';
  generation += 1;
  cache.delete(userId);
  inflight.delete(userId);
  const upsert = () =>
    prisma.$executeRawUnsafe(
      `INSERT INTO "auth_token_revocations" ("user_id","session_id","valid_after")
       VALUES ($1::uuid, $2, now())
       ON CONFLICT ("user_id","session_id") DO UPDATE SET "valid_after" = now()`,
      userId,
      sid,
    );
  try {
    try {
      await upsert();
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      await prisma.$executeRawUnsafe(CREATE_SQL);
      await upsert();
    }
    if (sid) {
      // opportunistic cleanup of stale per-session rows
      void prisma
        .$executeRawUnsafe(
          `DELETE FROM "auth_token_revocations" WHERE "session_id" <> '' AND "valid_after" < now() - ${SESSION_ROW_RETENTION}`,
        )
        .catch(() => undefined);
    }
    return true;
  } catch {
    return false;
  } finally {
    generation += 1;
    cache.delete(userId);
    inflight.delete(userId);
  }
}

/** Test/measurement seams. */
export function __revocationStats() {
  return { ...stats, size: cache.size };
}
export function __revocationReset(): void {
  cache.clear();
  inflight.clear();
  stats.lookups = 0;
  stats.cacheHits = 0;
  stats.failOpen = 0;
}
export function __revocationEvictUser(userId: string): void {
  cache.delete(userId);
}
