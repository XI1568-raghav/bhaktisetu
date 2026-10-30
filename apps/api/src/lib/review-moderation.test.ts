import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './__mocks__/prisma.js';

vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

import { hiddenReviewIds, notHiddenReviewWhere, hideReview, unhideReview, __resetReviewModerationCache } from './review-moderation.js';

const ID = 'aaaaaaaa-0000-4000-8000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
  __resetReviewModerationCache();
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
});

describe('review moderation side table', () => {
  it('reports nothing hidden when the table does not exist yet (nothing migrated)', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('relation "review_moderation" does not exist'));
    expect(await hiddenReviewIds()).toEqual([]);
    expect(await notHiddenReviewWhere()).toEqual({});
  });

  it('turns hidden ids into a notIn filter', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: ID }]);
    expect(await notHiddenReviewWhere()).toEqual({ id: { notIn: [ID] } });
  });

  it('a mock that returns nothing at all is treated as nothing hidden', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue(undefined);
    expect(await hiddenReviewIds()).toEqual([]);
  });

  it('hide creates the table lazily, inserts idempotently and invalidates the cache', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    await hiddenReviewIds();
    const r = await hideReview(ID, '99999999-9999-4999-8999-999999999999', 'abusive');
    expect(r.changed).toBe(true);
    const sqls = prismaMock.$executeRawUnsafe.mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls[0]).toMatch(/CREATE TABLE IF NOT EXISTS "review_moderation"/);
    expect(sqls[1]).toMatch(/ON CONFLICT \("review_id"\) DO NOTHING/);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: ID }]);
    expect(await hiddenReviewIds()).toEqual([ID]);
  });

  it('hiding twice reports no change', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const r = await hideReview(ID, null, null);
    expect(r.changed).toBe(false);
  });

  it('unhide is a no-op (not an error) when the table is absent', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('relation does not exist'));
    expect(await unhideReview(ID)).toEqual({ changed: false });
  });
});

describe('hidden-id list is served stale while one background read refreshes it', () => {
  it('does not make a caller wait for the database once a list exists', async () => {
    vi.useFakeTimers();
    try {
      prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: ID }]);
      expect(await hiddenReviewIds()).toEqual([ID]);
      vi.advanceTimersByTime(30_000); // past the 10 s freshness, inside the 5 min stale window
      let release: (v: unknown) => void = () => undefined;
      prismaMock.$queryRawUnsafe.mockImplementation(() => new Promise((r) => { release = r as typeof release; }));
      // Returns at once with the old list although the refresh has not finished.
      expect(await hiddenReviewIds()).toEqual([ID]);
      expect(await hiddenReviewIds()).toEqual([ID]);
      expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(2); // 1 initial + exactly one refresh
      release([]);
      await vi.advanceTimersByTimeAsync(1);
      expect(await hiddenReviewIds()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('past the stale window the caller waits for a fresh read', async () => {
    vi.useFakeTimers();
    try {
      prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: ID }]);
      await hiddenReviewIds();
      vi.advanceTimersByTime(6 * 60_000);
      prismaMock.$queryRawUnsafe.mockResolvedValue([]);
      expect(await hiddenReviewIds()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a hide made during a refresh is not overwritten by the older answer', async () => {
    vi.useFakeTimers();
    try {
      prismaMock.$queryRawUnsafe.mockResolvedValue([]);
      await hiddenReviewIds();
      vi.advanceTimersByTime(30_000);
      let release: (v: unknown) => void = () => undefined;
      prismaMock.$queryRawUnsafe.mockImplementation(() => new Promise((r) => { release = r as typeof release; }));
      await hiddenReviewIds(); // starts the refresh (will answer with the pre-hide list)
      await hideReview(ID, null, null);
      release([]); // older answer arrives after the hide
      await vi.advanceTimersByTimeAsync(1);
      prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: ID }]);
      expect(await hiddenReviewIds()).toEqual([ID]);
    } finally {
      vi.useRealTimers();
    }
  });
});
