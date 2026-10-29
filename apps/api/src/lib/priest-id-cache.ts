/**
 * Every /priest/* request ran `requireRole('priest')` (one read of the Priest
 * row for its status) and then `getPriestId` in the handler (the same row again
 * for its id): two ~0.4 s round trips to the remote database for one fact.
 *
 * The guard now leaves the id it just read here, and `getPriestId` reads it back
 * instead of asking again. The entry lives a few seconds, long enough for the
 * handler that follows the guard and nothing more, so no decision is ever taken
 * on a stale row: the guard itself still reads the live status on every request.
 */

const TTL_MS = 10_000;
const MAX_ENTRIES = 2000;

const byUser = new Map<string, { priestId: string; expiresAt: number }>();

export function rememberPriestId(userId: string, priestId: string): void {
  if (byUser.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of byUser) if (v.expiresAt <= now) byUser.delete(k);
    if (byUser.size >= MAX_ENTRIES) byUser.clear();
  }
  byUser.set(userId, { priestId, expiresAt: Date.now() + TTL_MS });
}

export function recallPriestId(userId: string): string | null {
  const hit = byUser.get(userId);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    byUser.delete(userId);
    return null;
  }
  return hit.priestId;
}

export function forgetPriestId(userId: string): void {
  byUser.delete(userId);
}

export function __priestIdCacheClear(): void {
  byUser.clear();
}
