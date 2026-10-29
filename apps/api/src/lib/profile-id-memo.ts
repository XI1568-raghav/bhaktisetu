/**
 * Several portal endpoints open with "which profile row belongs to this user?"
 * (StoreProfile, GaushalaProfile, TempleProfile ...), a ~0.4 s round trip to the
 * remote database before the real query can even start. The answer is an id that
 * never changes for a user, so a found id is remembered for ten minutes.
 *
 * Only a FOUND id is stored. "No profile yet" is never cached, so the moment a
 * user creates one the next request sees it. The id is only ever used to scope a
 * further query to that user's own rows; if the profile were deleted the scoped
 * query returns nothing, exactly as it would for any profile with no rows.
 */

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 5000;

const memo = new Map<string, { id: string; expiresAt: number }>();

export async function memoProfileId(
  kind: string,
  userId: string,
  load: () => Promise<string | null | undefined>,
  ttlMs: number = TTL_MS,
): Promise<string | null> {
  // Unit tests reuse one user id with different mocks per case; a remembered id
  // from the previous case would make them lie. A test that wants to exercise the
  // memo itself sets PROFILE_ID_MEMO_IN_TEST=1.
  if (process.env.NODE_ENV === 'test' && !process.env.PROFILE_ID_MEMO_IN_TEST) {
    return (await load()) || null;
  }
  const key = `${kind}:${userId}`;
  const hit = memo.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.id;
  if (hit) memo.delete(key);
  const id = await load();
  if (!id) return null;
  if (memo.size >= MAX_ENTRIES) {
    for (const [k, v] of memo) if (v.expiresAt <= now) memo.delete(k);
    if (memo.size >= MAX_ENTRIES) memo.clear();
  }
  memo.set(key, { id, expiresAt: now + ttlMs });
  return id;
}

export function forgetProfileId(kind: string, userId: string): void {
  memo.delete(`${kind}:${userId}`);
}

export function __profileIdMemoClear(): void {
  memo.clear();
}
