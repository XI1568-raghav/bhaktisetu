import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * SCAL-04 — getPayoutBalance must not stream the provider's whole commission
 * ledger into Node to add it up.
 *
 * It issued THREE `commission.findMany({ select: { amount } })` calls and summed
 * them in JS with Decimal.add. EXPLAIN (ANALYZE, SERIALIZE) put the equivalent
 * unbounded read at 10,309 kB — and this endpoint is on the provider dashboard,
 * so every pandit/astrologer/store owner opening their earnings page pulls the
 * whole ledger into a 512 MB Render container.
 *
 * Postgres SUM on numeric is exact, so the Decimal correctness the old comment
 * protected survives the move into SQL — that is asserted below with a fractional
 * amount that a float reduction would mangle.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    commission: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
    payoutRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userRoleAssignment: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    // DI-05: getPayoutBalance also reports the LEGACY pandit rail now, so it
    // asks whether this provider is a pandit and, if so, reads the sidecar
    // table. Defaulted to "not a pandit" below — every case in THIS file is
    // about the unified rail's SQL aggregates and must stay that way.
    priest: { findUnique: vi.fn() },
    priestPayout: { findMany: vi.fn() },
    wellnessEnrollment: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  } as Record<string, any>,
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(0) }));

import { getPayoutBalance } from './payout.service.js';

const commission = prismaMock.commission as {
  findMany: ReturnType<typeof vi.fn>;
  aggregate: ReturnType<typeof vi.fn>;
};

/** A tiny ledger the aggregate mock filters on, so assertions bind to the where clause. */
type Row = { amount: string; status: string; linkedToOpenRequest: boolean };

function wireAggregate(ledger: Row[]) {
  commission.aggregate.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    const matched = ledger.filter((row) => {
      if (where.status && row.status !== where.status) return false;
      if (where.payoutRequestId === null && row.linkedToOpenRequest) return false;
      if (where.payoutRequest && !row.linkedToOpenRequest) return false;
      return true;
    });
    if (matched.length === 0) return { _sum: { amount: null } };
    return {
      _sum: {
        amount: matched.reduce(
          (s, r) => s.add(new Prisma.Decimal(r.amount)),
          new Prisma.Decimal(0),
        ),
      },
    };
  });
  // Any findMany reaching the DB here is the defect: fail loudly rather than
  // quietly answering from a second code path.
  commission.findMany.mockImplementation(async () => {
    throw new Error('getPayoutBalance must not use findMany — SCAL-04');
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Not a pandit: the DI-05 legacy-rail block is skipped entirely, so the
  // assertions below still describe only the unified rail's SQL aggregates.
  prismaMock.priest.findUnique.mockResolvedValue(null);
  prismaMock.priestPayout.findMany.mockResolvedValue([]);
  prismaMock.wellnessEnrollment.findMany.mockResolvedValue([]);
});

describe('SCAL-04 — payout balance is summed in SQL, not in Node', () => {
  it('never issues an unbounded commission.findMany', async () => {
    wireAggregate([
      { amount: '9000.00', status: 'PENDING', linkedToOpenRequest: false },
      { amount: '5000.00', status: 'PENDING', linkedToOpenRequest: true },
      { amount: '4000.00', status: 'PAID', linkedToOpenRequest: true },
    ]);

    const b = await getPayoutBalance('prov-1');

    expect(commission.findMany).not.toHaveBeenCalled();
    expect(commission.aggregate).toHaveBeenCalledTimes(3);
    for (const call of commission.aggregate.mock.calls) {
      expect(call[0]).toMatchObject({ _sum: { amount: true } });
      expect(call[0].where).toMatchObject({ providerId: 'prov-1' });
    }
    // DI-05 added an additive legacyPandit block; this provider is not a
    // pandit, so it is all zeros and the unified figures are untouched.
    expect(b).toEqual({
      availableInr: 9000,
      upcomingInr: 0,
      pendingInr: 5000,
      paidOutInr: 4000,
      legacyPandit: { hasLegacyRail: false, pendingInr: 0, paidOutInr: 0 },
    });
  });

  it('keeps Decimal exactness through the SQL sum', async () => {
    // 0.1 + 0.2 in float is 0.30000000000000004; Postgres numeric SUM is exact.
    wireAggregate([
      { amount: '0.10', status: 'PENDING', linkedToOpenRequest: false },
      { amount: '0.20', status: 'PENDING', linkedToOpenRequest: false },
    ]);

    const b = await getPayoutBalance('prov-1');

    expect(b.availableInr).toBe(0.3);
  });

  it('reports zeros — not NaN — when the provider has no commissions', async () => {
    wireAggregate([]);

    const b = await getPayoutBalance('prov-none');

    expect(b).toEqual({
      availableInr: 0,
      upcomingInr: 0,
      pendingInr: 0,
      paidOutInr: 0,
      legacyPandit: { hasLegacyRail: false, pendingInr: 0, paidOutInr: 0 },
    });
  });
});
