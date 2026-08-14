import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService, PENDING_APPROVAL_PAGE } from './admin.service.js';

/**
 * SCAL-04, remaining scope — the six unbounded moderation queues.
 *
 * `getPendingApprovals` issued SIX `findMany({ where: { approved: false } })`
 * calls with no `take`, no `orderBy` and no `select`, then concatenated the
 * whole lot. That is the single most likely list on the platform to accumulate:
 * every provider signup that nobody has got to yet stays in it forever, and
 * nothing about the query bounds how many that is. Each row is a full profile
 * (bio, address, description), so the transfer grows with the backlog while the
 * container it lands in stays at Render free's 512 MB.
 *
 * There is a correctness half too. With no `orderBy`, Postgres returns whatever
 * the heap gives it, so an admin cannot work the queue oldest-first — the
 * provider who has waited three weeks may simply never appear near the top, and
 * once the backlog is long enough to matter there is no page two to find them
 * on either.
 *
 * Oldest first, bounded, and the caller is told when more is waiting.
 */

let service: AdminService;

const ROW = (id: string, days: number) => ({
  id,
  userId: `u-${id}`,
  city: 'Gurugram',
  bio: null,
  storeName: 'S',
  templeName: null,
  createdAt: new Date(Date.now() - days * 86_400_000),
});

/** Capture the args each profile queue was called with. */
function wireQueues(rows: Record<string, unknown[]>) {
  for (const model of [
    'panditProfile',
    'storeProfile',
    'astrologerProfile',
    'wellnessProfile',
    'gaushalaProfile',
    'templeProfile',
  ] as const) {
    (prismaMock[model].findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      (rows[model] ?? []) as never,
    );
  }
  prismaMock.user.findMany.mockResolvedValue([] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
  wireQueues({});
});

describe('SCAL-04 — the pending-approval queues are bounded', () => {
  it('caps every one of the six queue reads', async () => {
    await service.getPendingApprovals();

    for (const model of [
      'panditProfile',
      'storeProfile',
      'astrologerProfile',
      'wellnessProfile',
      'gaushalaProfile',
      'templeProfile',
    ] as const) {
      const args = (prismaMock[model].findMany as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      expect(
        args.take,
        `${model}.findMany reads the whole approval backlog with no take`,
      ).toBeTypeOf('number');
    }
  });

  it('orders each queue oldest-first so the longest wait is worked first', async () => {
    await service.getPendingApprovals();

    for (const model of [
      'panditProfile',
      'storeProfile',
      'astrologerProfile',
      'wellnessProfile',
      'gaushalaProfile',
      'templeProfile',
    ] as const) {
      const args = (prismaMock[model].findMany as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as { orderBy?: { createdAt?: string } };
      expect(args.orderBy?.createdAt, `${model} queue has no deterministic order`).toBe('asc');
    }
  });

  it('returns at most one page and still reports the TRUE backlog size', async () => {
    // A bounded read makes `approvals.length` a lie about how many providers
    // are waiting. The count has to come from Postgres, or the admin queue
    // repeats SCAL-09's defect: a short page beside a number that agrees with
    // it, and a backlog nobody can see.
    const overflow = Array.from({ length: PENDING_APPROVAL_PAGE }, (_, i) => ROW(`p${i}`, i));
    wireQueues({ panditProfile: overflow });
    for (const model of [
      'panditProfile',
      'storeProfile',
      'astrologerProfile',
      'wellnessProfile',
      'gaushalaProfile',
      'templeProfile',
    ] as const) {
      (prismaMock[model].count as ReturnType<typeof vi.fn>).mockResolvedValue(
        model === 'panditProfile' ? (417 as never) : (0 as never),
      );
    }

    const page = await service.getPendingApprovals();

    expect(page.items.length).toBeLessThanOrEqual(PENDING_APPROVAL_PAGE);
    expect(page.total, 'the backlog size was reported as the page size').toBe(417);
    expect(page.hasMore).toBe(true);
  });

  it('reports hasMore false and an exact total when every queue fits', async () => {
    wireQueues({ panditProfile: [ROW('a', 3)], storeProfile: [ROW('b', 1)] });
    for (const model of [
      'panditProfile',
      'storeProfile',
      'astrologerProfile',
      'wellnessProfile',
      'gaushalaProfile',
      'templeProfile',
    ] as const) {
      (prismaMock[model].count as ReturnType<typeof vi.fn>).mockResolvedValue(
        (model === 'panditProfile' || model === 'storeProfile' ? 1 : 0) as never,
      );
    }

    const page = await service.getPendingApprovals();

    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(2);
    expect(page.hasMore).toBe(false);
    // Oldest wait first, across roles.
    expect(page.items[0]!.id).toBe('a');
  });
});
