import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';

// Mock prisma before importing the service.
const { prismaMock } = vi.hoisted(() => {
  const mock: Record<string, unknown> = {
    commission: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
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
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  };
  return { prismaMock: mock };
});

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(0) }));

import {
  getPayoutBalance,
  getKycStatus,
  requestPayout,
  processPayout,
  runWeeklySettlement,
  resolveProviderRoleForUser,
  PAYOUT_CONCURRENT_REQUEST_ERROR,
} from './payout.service.js';

const commission = prismaMock.commission as {
  findMany: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};
const payoutRequest = prismaMock.payoutRequest as {
  create: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};
const userRoleAssignment = (prismaMock.userRoleAssignment as { findMany: ReturnType<typeof vi.fn> });
const $queryRawUnsafe = prismaMock.$queryRawUnsafe as ReturnType<typeof vi.fn>;
const $transaction = prismaMock.$transaction as ReturnType<typeof vi.fn>;

const VERIFIED_KYC = [{ verified: true, bank_account_number: '1234', bank_ifsc: 'HDFC0001234' }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('payout.service — getPayoutBalance', () => {
  // RV-05: `pending` (payoutRequestId: null) and `inFlight` (linked to a
  // pending/processing request) are disjoint by construction, so available must
  // be the raw pending sum. The old code returned pending - inFlight.
  it('RV-05: available is the unlinked PENDING sum and never nets off in-flight', async () => {
    // Audit worked example: Rs 5,000 linked to a still-pending request, Rs 9,000
    // of newly earned commissions. Old code paid Rs 4,000 and marked all
    // Rs 9,000 PAID, destroying Rs 5,000.
    commission.findMany
      .mockResolvedValueOnce([{ amount: 4000 }, { amount: 5000 }]) // PENDING unlinked
      .mockResolvedValueOnce([]) // PAID
      .mockResolvedValueOnce([{ amount: 5000 }]); // in-flight (linked, NOT in the set above)
    const b = await getPayoutBalance('prov-1');
    expect(b.availableInr).toBe(9000);
    expect(b.pendingInr).toBe(5000);
    expect(b.paidOutInr).toBe(0);
  });

  it('RV-05: stays positive when in-flight exceeds newly earned (no lockout)', async () => {
    // Inverse case: old code returned -3,000 → web showed "-Rs 3,000", Withdraw
    // disabled, requestPayout threw "No withdrawable balance".
    commission.findMany
      .mockResolvedValueOnce([{ amount: 2000 }]) // PENDING unlinked
      .mockResolvedValueOnce([]) // PAID
      .mockResolvedValueOnce([{ amount: 5000 }]); // in-flight
    const b = await getPayoutBalance('prov-1');
    expect(b.availableInr).toBe(2000);
    expect(b.pendingInr).toBe(5000);
  });

  it('reports PAID separately as paidOut', async () => {
    commission.findMany
      .mockResolvedValueOnce([{ amount: 100 }, { amount: 250 }])
      .mockResolvedValueOnce([{ amount: 500 }])
      .mockResolvedValueOnce([]);
    const b = await getPayoutBalance('prov-1');
    expect(b).toEqual({ availableInr: 350, pendingInr: 0, paidOutInr: 500 });
  });

  it('returns zeros for a provider with no commissions', async () => {
    commission.findMany.mockResolvedValue([]);
    const b = await getPayoutBalance('prov-none');
    expect(b).toEqual({ availableInr: 0, pendingInr: 0, paidOutInr: 0 });
  });
});

describe('payout.service — KYC gating', () => {
  it('reads verified + bank presence from provider_kyc', async () => {
    $queryRawUnsafe.mockResolvedValue([{ verified: true, bank_account_number: '1234', bank_ifsc: 'HDFC0001234' }]);
    const k = await getKycStatus('prov-1');
    expect(k.verified).toBe(true);
    expect(k.hasBank).toBe(true);
  });

  it('returns unverified when no KYC row', async () => {
    $queryRawUnsafe.mockResolvedValue([]);
    const k = await getKycStatus('prov-none');
    expect(k.verified).toBe(false);
    expect(k.hasBank).toBe(false);
  });
});

describe('payout.service — requestPayout gating', () => {
  it('rejects when KYC has no bank details', async () => {
    $queryRawUnsafe.mockResolvedValue([{ verified: true, bank_account_number: null, bank_ifsc: null }]);
    await expect(requestPayout('prov-1', 'PANDIT')).rejects.toThrow(/bank\/UPI details/);
  });

  it('rejects when KYC not verified', async () => {
    $queryRawUnsafe.mockResolvedValue([{ verified: false, bank_account_number: '1', bank_ifsc: 'HDFC0001234' }]);
    await expect(requestPayout('prov-1', 'PANDIT')).rejects.toThrow(/pending verification/);
  });

  it('rejects when no withdrawable balance', async () => {
    $queryRawUnsafe.mockResolvedValue(VERIFIED_KYC);
    commission.findMany.mockResolvedValue([]); // no commissions at all
    await expect(requestPayout('prov-1', 'PANDIT')).rejects.toThrow(/No withdrawable balance/);
  });
});

describe('payout.service — requestPayout sizing (RV-05 / RV-06)', () => {
  /** Wire the pre-check read (3 findMany calls) then the in-transaction read. */
  function mockReads(opts: {
    previewPending: Array<{ amount: number | string }>;
    previewInFlight?: Array<{ amount: number | string }>;
    txRows: Array<{ id: string; amount: number | string }>;
  }) {
    commission.findMany
      .mockResolvedValueOnce(opts.previewPending) // getPayoutBalance: PENDING unlinked
      .mockResolvedValueOnce([]) // getPayoutBalance: PAID
      .mockResolvedValueOnce(opts.previewInFlight ?? []) // getPayoutBalance: in-flight
      .mockResolvedValueOnce(opts.txRows); // inside the transaction
    $transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({ payoutRequest, commission }),
    );
  }

  it('RV-06: sizes the request from the rows read INSIDE the transaction, not the pre-check', async () => {
    $queryRawUnsafe.mockResolvedValue(VERIFIED_KYC);
    // Pre-check saw Rs 4,000; by the time the transaction opened the provider
    // had earned more. The request must be worth what it actually links.
    mockReads({
      previewPending: [{ amount: 4000 }],
      txRows: [
        { id: 'c1', amount: 4000 },
        { id: 'c2', amount: 5000 },
      ],
    });
    payoutRequest.create.mockImplementation(async ({ data }: { data: { amount: unknown } }) => ({
      id: 'pr-1',
      ...data,
    }));
    commission.updateMany.mockResolvedValue({ count: 2 });

    const req = await requestPayout('prov-1', 'PANDIT');

    const created = payoutRequest.create.mock.calls[0]![0] as { data: { amount: Prisma.Decimal } };
    expect(created.data.amount.toString()).toBe('9000');
    expect(String(req.amount)).toBe('9000');
    expect(commission.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['c1', 'c2'] }, status: 'PENDING', payoutRequestId: null },
      data: { payoutRequestId: 'pr-1' },
    });
  });

  it('RV-06: sums money as Decimal — no float drift on the payout amount', async () => {
    $queryRawUnsafe.mockResolvedValue(VERIFIED_KYC);
    mockReads({
      previewPending: [{ amount: '16509.69' }],
      txRows: [
        { id: 'c1', amount: '6499.03' },
        { id: 'c2', amount: '1625.48' },
        { id: 'c3', amount: '8385.18' },
      ],
    });
    payoutRequest.create.mockImplementation(async ({ data }: { data: { amount: unknown } }) => ({
      id: 'pr-1',
      ...data,
    }));
    commission.updateMany.mockResolvedValue({ count: 3 });

    await requestPayout('prov-1', 'PANDIT');

    const created = payoutRequest.create.mock.calls[0]![0] as { data: { amount: Prisma.Decimal } };
    expect(created.data.amount.toString()).toBe('16509.69');
    // The drift this guards against: naive float summing gives 16509.690000000002,
    // which Prisma would round into the Decimal(10,2) column.
    expect(6499.03 + 1625.48 + 8385.18).not.toBe(16509.69);
  });

  it('RV-06: rejects when fewer rows link than were selected (concurrent claim)', async () => {
    $queryRawUnsafe.mockResolvedValue(VERIFIED_KYC);
    mockReads({
      previewPending: [{ amount: 9000 }],
      txRows: [
        { id: 'c1', amount: 4000 },
        { id: 'c2', amount: 5000 },
      ],
    });
    payoutRequest.create.mockResolvedValue({ id: 'pr-1', amount: new Prisma.Decimal(9000) });
    commission.updateMany.mockResolvedValue({ count: 1 }); // a rival tx took c2

    await expect(requestPayout('prov-1', 'PANDIT')).rejects.toThrow(PAYOUT_CONCURRENT_REQUEST_ERROR);
  });

  it('RV-06: refuses when the ledger emptied between the pre-check and the transaction', async () => {
    $queryRawUnsafe.mockResolvedValue(VERIFIED_KYC);
    mockReads({ previewPending: [{ amount: 9000 }], txRows: [] });

    await expect(requestPayout('prov-1', 'PANDIT')).rejects.toThrow(/No withdrawable balance/);
    expect(payoutRequest.create).not.toHaveBeenCalled();
  });
});

describe('payout.service — requestPayout concurrency race (RV-06)', () => {
  type LedgerRow = {
    id: string;
    providerId: string;
    amount: string;
    status: 'PENDING' | 'PAID';
    payoutRequestId: string | null;
  };
  type LedgerRequest = { id: string; providerId: string; amount: Prisma.Decimal; status: string };

  /**
   * A tiny in-memory stand-in for the Commission/PayoutRequest tables, faithful
   * on the two points that matter: updateMany re-evaluates its predicate at
   * write time (Postgres EvalPlanQual under READ COMMITTED), and a throwing
   * transaction rolls back only its own writes.
   */
  function makeLedger(rows: LedgerRow[], gate: () => Promise<void>) {
    const state = { commissions: rows.map((r) => ({ ...r })), requests: [] as LedgerRequest[] };
    let seq = 0;

    const select = (where: Record<string, any>) =>
      state.commissions.filter((row) => {
        if (where.providerId && row.providerId !== where.providerId) return false;
        if (where.status && row.status !== where.status) return false;
        if (where.payoutRequestId === null && row.payoutRequestId !== null) return false;
        if (where.id?.in && !where.id.in.includes(row.id)) return false;
        if (where.payoutRequest?.status?.in) {
          const req = state.requests.find((q) => q.id === row.payoutRequestId);
          if (!req || !where.payoutRequest.status.in.includes(req.status)) return false;
        }
        return true;
      });

    const read = async ({ where }: { where: Record<string, any> }) =>
      select(where).map((r) => ({ id: r.id, amount: r.amount }));

    const txClient = (mine: string[]) => ({
      commission: {
        findMany: read,
        updateMany: async ({ where, data }: { where: Record<string, any>; data: Record<string, any> }) => {
          await gate(); // stand-in for blocking on the rival transaction's row locks
          const hit = select(where);
          hit.forEach((r) => Object.assign(r, data));
          return { count: hit.length };
        },
      },
      payoutRequest: {
        create: async ({ data }: { data: Omit<LedgerRequest, 'id'> }) => {
          const req = { id: `pr-${++seq}`, ...data };
          state.requests.push(req);
          mine.push(req.id);
          return req;
        },
      },
    });

    commission.findMany.mockImplementation(read);
    $transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const mine: string[] = [];
      try {
        return await fn(txClient(mine));
      } catch (err) {
        // rollback: drop this transaction's request rows + unlink its rows
        state.requests = state.requests.filter((r) => !mine.includes(r.id));
        state.commissions.forEach((c) => {
          if (c.payoutRequestId && mine.includes(c.payoutRequestId)) c.payoutRequestId = null;
        });
        throw err;
      }
    });

    return state;
  }

  it('two concurrent withdrawals settle ONE request for the balance, not two', async () => {
    $queryRawUnsafe.mockResolvedValue(VERIFIED_KYC);

    // The first updateMany to arrive blocks until we release it, letting the
    // second caller commit in between — the exact double-click interleaving.
    let enteredFirst!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((res) => (enteredFirst = res));
    const held = new Promise<void>((res) => (release = res));
    let first = true;
    const gate = async () => {
      if (first) {
        first = false;
        enteredFirst();
        await held;
      }
    };

    const state = makeLedger(
      [
        { id: 'c1', providerId: 'prov-race', amount: '12000.00', status: 'PENDING', payoutRequestId: null },
        { id: 'c2', providerId: 'prov-race', amount: '8000.00', status: 'PENDING', payoutRequestId: null },
      ],
      gate,
    );

    const slow = requestPayout('prov-race', 'STORE_OWNER'); // snapshots, then blocks
    await entered;
    const winner = await requestPayout('prov-race', 'STORE_OWNER'); // commits fully
    release();

    await expect(slow).rejects.toThrow(PAYOUT_CONCURRENT_REQUEST_ERROR);

    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]!.id).toBe(winner.id);
    expect(state.requests[0]!.amount.toString()).toBe('20000');
    // Every commission is linked to the single surviving request — no hollow
    // second request, and nothing left double-payable.
    expect(state.commissions.every((c) => c.payoutRequestId === winner.id)).toBe(true);
  });
});

// ─── batch5-review: weekly settlement sweep ────────────────────────────────────

describe('payout.service — runWeeklySettlement', () => {
  // commission.findMany serves four different queries here; dispatch on args so
  // each one answers what the code actually asked for.
  function wireLedger(opts: { providerId: string; unlinkedInr: string }) {
    commission.findMany.mockImplementation(async (args: any) => {
      if (args?.distinct) return [{ providerId: opts.providerId }];
      const where = args?.where ?? {};
      if (where.status === 'PENDING' && where.payoutRequestId === null) {
        // Selected with {id, amount} inside requestPayout's transaction, and
        // with {amount} by getPayoutBalance — one row satisfies both.
        return [{ id: 'c-1', amount: new Prisma.Decimal(opts.unlinkedInr), status: 'PENDING' }];
      }
      return []; // PAID rows and in-flight rows
    });
    $queryRawUnsafe.mockResolvedValue(VERIFIED_KYC);
  }

  it('skips a provider who already has a request awaiting an admin', async () => {
    wireLedger({ providerId: 'prov-astro', unlinkedInr: '9000.00' });
    payoutRequest.count.mockResolvedValue(1); // last week's is still pending

    const out = await runWeeklySettlement();

    expect(out.skippedInFlight).toBe(1);
    expect(out.requestsCreated).toBe(0);
    // The whole point: no second indistinguishable row in the admin queue.
    expect(payoutRequest.create).not.toHaveBeenCalled();
  });

  it('stamps the provider’s real role, not PANDIT', async () => {
    wireLedger({ providerId: 'prov-astro', unlinkedInr: '9000.00' });
    payoutRequest.count.mockResolvedValue(0);
    userRoleAssignment.findMany.mockResolvedValue([{ role: 'ASTROLOGER' }]);
    payoutRequest.create.mockResolvedValue({ id: 'pr-new', providerId: 'prov-astro', amount: new Prisma.Decimal('9000.00') });
    commission.updateMany.mockResolvedValue({ count: 1 });
    $transaction.mockImplementation(async (fn: any) => fn({ commission, payoutRequest }));

    const out = await runWeeklySettlement();

    expect(out.requestsCreated).toBe(1);
    expect(payoutRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ASTROLOGER' }) }),
    );
  });

  it('skips — rather than mislabels — a provider with no payout-capable role', async () => {
    wireLedger({ providerId: 'prov-orphan', unlinkedInr: '9000.00' });
    payoutRequest.count.mockResolvedValue(0);
    userRoleAssignment.findMany.mockResolvedValue([{ role: 'DEVOTEE' }]);

    const out = await runWeeklySettlement();

    expect(out.skippedRole).toBe(1);
    expect(out.requestsCreated).toBe(0);
    expect(payoutRequest.create).not.toHaveBeenCalled();
  });
});

describe('payout.service — resolveProviderRoleForUser', () => {
  it('prefers the primary role (queried isPrimary-first) and maps it to a ProviderRole', async () => {
    userRoleAssignment.findMany.mockResolvedValue([{ role: 'STORE_OWNER' }, { role: 'PANDIT' }]);
    await expect(resolveProviderRoleForUser('u-1')).resolves.toBe('STORE_OWNER');
    expect(userRoleAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }] }),
    );
  });

  it('skips non-provider roles rather than returning them', async () => {
    userRoleAssignment.findMany.mockResolvedValue([{ role: 'DEVOTEE' }, { role: 'ASTROLOGER' }]);
    await expect(resolveProviderRoleForUser('u-1')).resolves.toBe('ASTROLOGER');
  });

  it('returns null when the user holds no payout-capable role', async () => {
    userRoleAssignment.findMany.mockResolvedValue([{ role: 'DEVOTEE' }, { role: 'ADMIN' }]);
    await expect(resolveProviderRoleForUser('u-1')).resolves.toBeNull();
  });
});

describe('payout.service — processPayout', () => {
  // The linked set a healthy pr-1 owns: two PENDING commissions summing to the
  // request's own amount of 350.
  const HEALTHY_LINKED = [
    { amount: new Prisma.Decimal('200.00'), status: 'PENDING' },
    { amount: new Prisma.Decimal('150.00'), status: 'PENDING' },
  ];

  it('complete marks commissions PAID + sets reference', async () => {
    payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'pending', amount: new Prisma.Decimal('350.00'), providerId: 'prov-1' });
    payoutRequest.update.mockResolvedValue({ id: 'pr-1', status: 'completed', amount: new Prisma.Decimal('350.00'), providerId: 'prov-1' });
    commission.findMany.mockResolvedValue(HEALTHY_LINKED);
    $transaction.mockImplementation(async (fn) => fn({ payoutRequest, commission }));

    const out = await processPayout('pr-1', 'complete', 'admin-1', 'UTR123');
    expect(out.status).toBe('completed');
    expect(commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // Scoped to PENDING so a REVERSED row can never be resurrected to PAID.
        where: { payoutRequestId: 'pr-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'PAID' }),
      }),
    );
  });

  it('reject releases commissions back to PENDING (unlinks, balance preserved)', async () => {
    payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'pending', amount: 350, providerId: 'prov-1' });
    payoutRequest.update.mockResolvedValue({ id: 'pr-1', status: 'rejected', amount: 350, providerId: 'prov-1' });
    $transaction.mockImplementation(async (fn) => fn({ payoutRequest, commission }));

    const out = await processPayout('pr-1', 'reject', 'admin-1', undefined, 'bank rejected');
    expect(out.status).toBe('rejected');
    expect(commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { payoutRequestId: 'pr-1' },
        data: { payoutRequestId: null },
      }),
    );
  });

  it('is idempotent on an already-completed payout', async () => {
    payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'completed', amount: 350, providerId: 'prov-1' });
    $transaction.mockImplementation(async (fn) => fn({ payoutRequest, commission }));
    const out = await processPayout('pr-1', 'complete', 'admin-1');
    expect(out.status).toBe('completed');
    expect(payoutRequest.update).not.toHaveBeenCalled();
  });

  // batch5-review: RV-06 closed the CREATION side of the hollow-request
  // problem. These lock the completion side — the half the write-up claimed but
  // never implemented.
  describe('completion guard (hollow-request vector)', () => {
    beforeEach(() => {
      $transaction.mockImplementation(async (fn: any) => fn({ payoutRequest, commission }));
    });

    for (const status of ['rejected', 'failed'] as const) {
      it(`refuses to complete a ${status} request — its commissions are back in the balance`, async () => {
        payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status, amount: new Prisma.Decimal('350.00'), providerId: 'prov-1' });
        commission.findMany.mockResolvedValue([]);

        await expect(processPayout('pr-1', 'complete', 'admin-1', 'UTR123')).rejects.toThrow(
          /Cannot complete a payout request in "(rejected|failed)" status/,
        );
        expect(payoutRequest.update).not.toHaveBeenCalled();
        expect(commission.updateMany).not.toHaveBeenCalled();
      });
    }

    it('refuses a request that owns no commissions (nothing to pay)', async () => {
      payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'pending', amount: new Prisma.Decimal('350.00'), providerId: 'prov-1' });
      commission.findMany.mockResolvedValue([]);

      await expect(processPayout('pr-1', 'complete', 'admin-1')).rejects.toThrow(/owns no commissions/);
      expect(payoutRequest.update).not.toHaveBeenCalled();
    });

    it('refuses when the linked commissions no longer sum to the request amount', async () => {
      payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'pending', amount: new Prisma.Decimal('350.00'), providerId: 'prov-1' });
      // One row was claimed elsewhere — paying 350 would over-transfer by 150.
      commission.findMany.mockResolvedValue([{ amount: new Prisma.Decimal('200.00'), status: 'PENDING' }]);

      await expect(processPayout('pr-1', 'complete', 'admin-1')).rejects.toThrow(
        /₹350.00 does not match its linked commissions \(₹200.00\)/,
      );
      expect(payoutRequest.update).not.toHaveBeenCalled();
    });

    it('refuses when a linked commission is no longer PENDING', async () => {
      payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'pending', amount: new Prisma.Decimal('350.00'), providerId: 'prov-1' });
      commission.findMany.mockResolvedValue([
        { amount: new Prisma.Decimal('200.00'), status: 'PENDING' },
        // RV-02 reversal, or an already-settled row.
        { amount: new Prisma.Decimal('150.00'), status: 'REVERSED' },
      ]);

      await expect(processPayout('pr-1', 'complete', 'admin-1')).rejects.toThrow(/no longer PENDING/);
      expect(payoutRequest.update).not.toHaveBeenCalled();
    });

    it('still allows reject on an already-rejected request (release stays idempotent)', async () => {
      payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'rejected', amount: new Prisma.Decimal('350.00'), providerId: 'prov-1' });
      payoutRequest.update.mockResolvedValue({ id: 'pr-1', status: 'rejected', amount: new Prisma.Decimal('350.00'), providerId: 'prov-1' });

      const out = await processPayout('pr-1', 'reject', 'admin-1', undefined, 'retry');
      expect(out.status).toBe('rejected');
    });
  });
});
