import { prisma } from './prisma.js';

/**
 * Admin "hide rating" (QA 2026-10-13, slice G).
 *
 * `reviews` has no isHidden column and adding one to schema.prisma would make
 * EVERY `prisma.review.*` query select a column that does not exist until an
 * owner applies a migration (migrations do not auto-apply on prod deploy). So a
 * hidden review is a row in a small side table that is created lazily the first
 * time an admin hides one (same runtime-DDL pattern as the consultation tables).
 * Readers call `hiddenReviewIds()`, which returns [] when the table is absent, so
 * nothing changes until the first hide.
 */

let tableReady = false;
let cache: { at: number; ids: string[] } | null = null;
/** Bumped by every hide/unhide so a read that started before it cannot store its older answer. */
let generation = 0;
const CACHE_MS = 10_000;

async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "review_moderation" (
      "review_id" UUID NOT NULL PRIMARY KEY,
      "hidden_by" UUID,
      "reason" TEXT,
      "hidden_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  tableReady = true;
}

async function readHiddenIds(): Promise<string[]> {
  const started = generation;
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "review_id"::text AS id FROM "review_moderation" LIMIT 5000`,
    )) as Array<{ id: string }> | undefined;
    const ids = Array.isArray(rows) ? rows.map((r) => r.id) : [];
    if (started === generation) cache = { at: Date.now(), ids };
    return ids;
  } catch {
    // Remember the miss too (a table that has not been created yet fails the same
    // way on every read, and each failed read is a wasted round trip to the
    // database on every page that lists reviews). hideReview resets the cache.
    if (started === generation) cache = { at: Date.now(), ids: [] };
    return [];
  }
}

let refreshing: Promise<string[]> | null = null;
/** Past this age the list is not served stale; the caller waits for a fresh read. */
const STALE_MAX_MS = 5 * 60_000;

/**
 * Ids of hidden reviews. Never throws: a missing table / dead DB means "none hidden".
 *
 * Latency: a review list is public, low-traffic, and a hide is rare, so a list
 * 10 s to 5 min old is served at once while ONE background read refreshes it,
 * instead of every page that finds the cache expired paying a remote round trip
 * (~0.4 s) before it can even start its own query. `hideReview` / `unhideReview`
 * still drop the cache, so a hide made through this process takes effect on the
 * very next read; only a hide written by another container can show for up to
 * the refresh interval.
 */
export async function hiddenReviewIds(): Promise<string[]> {
  const age = cache ? Date.now() - cache.at : Infinity;
  if (cache && age < CACHE_MS) return cache.ids;
  if (cache && age < STALE_MAX_MS) {
    if (!refreshing) {
      refreshing = readHiddenIds().finally(() => { refreshing = null; });
      refreshing.catch(() => undefined);
    }
    return cache.ids;
  }
  return readHiddenIds();
}

/** Prisma `where` fragment that excludes hidden reviews (empty when none are hidden). */
export async function notHiddenReviewWhere(): Promise<{ id?: { notIn: string[] } }> {
  const ids = await hiddenReviewIds();
  return ids.length ? { id: { notIn: ids } } : {};
}

export async function hideReview(
  reviewId: string,
  adminId: string | null,
  reason: string | null,
): Promise<{ changed: boolean }> {
  await ensureTable();
  const n = await prisma.$executeRawUnsafe(
    `INSERT INTO "review_moderation" ("review_id","hidden_by","reason") VALUES ($1::uuid,$2::uuid,$3)
     ON CONFLICT ("review_id") DO NOTHING`,
    reviewId,
    adminId,
    reason,
  );
  cache = null;
  generation += 1;
  return { changed: Number(n) > 0 };
}

export async function unhideReview(reviewId: string): Promise<{ changed: boolean }> {
  try {
    const n = await prisma.$executeRawUnsafe(`DELETE FROM "review_moderation" WHERE "review_id" = $1::uuid`, reviewId);
    cache = null;
    generation += 1;
    return { changed: Number(n) > 0 };
  } catch {
    return { changed: false };
  }
}

/** Test hook. */
export function __resetReviewModerationCache(): void {
  cache = null;
  refreshing = null;
  tableReady = false;
}
