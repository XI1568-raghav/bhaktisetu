import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';

/**
 * SCAL-04, further pass — /admin/revenue read EVERY active subscription row.
 *
 * `getRevenue` issued `marketplaceSubscription.findMany({ where: { status:
 * 'ACTIVE' } })` — no take, no cursor, no select — and then did two things with
 * it that Postgres does better: summed `amount` in a JS `reduce`, and bucketed
 * by (plan, role) in a JS `Map`. It is the same shape as every other site this
 * finding named: the whole table into a 512 MB container to produce a handful
 * of scalars.
 *
 * It is also the site that grows fastest with success — an ACTIVE subscription
 * row is one per paying customer and it never leaves the set while they pay.
 *
 * The numbers must be IDENTICAL after the swap, so both are asserted against a
 * ledger stated once here.
 */

let service: AdminService;

/** Everything getRevenue awaits apart from the subscription read under test. */
function wireRevenueBackground() {
  // `clearAllMocks` clears calls but keeps implementations, and the first test
  // installs a throwing one on the shared mock. Reset it so the later cases
  // fail (or pass) on their own assertions rather than on that guard.
  prismaMock.marketplaceSubscription.findMany.mockReset();
  prismaMock.commission.groupBy.mockResolvedValue([
    { percentage: new Prisma.Decimal('0.2000'), _sum: { amount: new Prisma.Decimal('800.00') } },
  ] as never);
  prismaMock.commission.aggregate.mockResolvedValue({
    _sum: { amount: new Prisma.Decimal('0') },
  } as never);
  prismaMock.commission.findMany.mockResolvedValue([] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
});

describe('SCAL-04 — /admin/revenue groups subscriptions in SQL', () => {
  it('never reads the subscription table row by row', async () => {
    wireRevenueBackground();
    prismaMock.marketplaceSubscription.groupBy.mockResolvedValue([] as never);
    prismaMock.marketplaceSubscription.findMany.mockImplementation(async () => {
      throw new Error('getRevenue must not read every active subscription — SCAL-04');
    });

    await expect(service.getRevenue()).resolves.toBeTruthy();
    expect(prismaMock.marketplaceSubscription.groupBy).toHaveBeenCalledTimes(1);
  });

  it('reports the same total and the same per-plan breakdown as the row scan did', async () => {
    wireRevenueBackground();
    // Three ACTIVE subscriptions: two on bhakti_pass/DEVOTEE at 499 each and one
    // on pro/PANDIT at 999. The row scan produced total 1997 and two buckets.
    prismaMock.marketplaceSubscription.groupBy.mockResolvedValue([
      {
        plan: 'bhakti_pass',
        role: 'DEVOTEE',
        _count: { _all: 2 },
        _sum: { amount: new Prisma.Decimal('998.00') },
      },
      {
        plan: 'pro',
        role: 'PANDIT',
        _count: { _all: 1 },
        _sum: { amount: new Prisma.Decimal('999.00') },
      },
    ] as never);

    const out = await service.getRevenue();

    expect(out.totalSubscriptions).toBe(1997);
    expect(out.subscriptionRevenue).toEqual(
      expect.arrayContaining([
        { plan: 'bhakti_pass', role: 'DEVOTEE', count: 2, totalAmount: 998 },
        { plan: 'pro', role: 'PANDIT', count: 1, totalAmount: 999 },
      ]),
    );
    expect(out.subscriptionRevenue).toHaveLength(2);
  });

  it('scopes the grouping to ACTIVE, the same filter the row scan carried', async () => {
    wireRevenueBackground();
    prismaMock.marketplaceSubscription.groupBy.mockResolvedValue([] as never);

    await service.getRevenue();

    const args = prismaMock.marketplaceSubscription.groupBy.mock.calls[0]![0] as {
      where?: { status?: string };
      by?: string[];
    };
    expect(args.where).toEqual({ status: 'ACTIVE' });
    expect(args.by).toEqual(expect.arrayContaining(['plan', 'role']));
  });

  it('treats an empty bucket sum as zero rather than NaN', async () => {
    wireRevenueBackground();
    prismaMock.marketplaceSubscription.groupBy.mockResolvedValue([
      { plan: 'free', role: 'DEVOTEE', _count: { _all: 4 }, _sum: { amount: null } },
    ] as never);

    const out = await service.getRevenue();
    expect(out.totalSubscriptions).toBe(0);
    expect(out.subscriptionRevenue).toEqual([
      { plan: 'free', role: 'DEVOTEE', count: 4, totalAmount: 0 },
    ]);
  });
});
