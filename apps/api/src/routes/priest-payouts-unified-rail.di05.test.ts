import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { priestRoutes } from './priest.js';

/**
 * DI-05, the READ half — "a pandit paid through the temple booking path sees
 * Rs 0 in his own payout portal".
 *
 * The WRITE half shipped 2026-08-12 (booking.service.ts, EARNING_ATTACH_STATUSES):
 * attaching the pandit to a paid temple booking now mints his Commission. That
 * closed the hole for the UNIFIED surfaces — GET /payouts/balance and
 * GET /payouts/commissions both read the Commission ledger.
 *
 * It did not close it for the screen the pandit is actually sent to. The priest
 * portal's only money link is /priest/payouts (apps/web/app/priest/layout.tsx),
 * which reads GET /priest/payouts -> priestService.getPayoutHistory -> the
 * PriestPayout sidecar table, and nothing else.
 *
 * And the two rails are mutually exclusive by construction:
 * payment.service.createPriestPayout returns
 * `{skipped:'commission-ledger-owns-this-booking'}` whenever a live Commission
 * exists for the booking. So minting the Commission is exactly what STOPS the
 * sidecar row from ever being written. The DI-05 write fix therefore moved every
 * temple-path earning onto a rail this endpoint could not see: the pandit's
 * payout page still rendered "No payouts found" over three Rs 0 cards.
 *
 * routes/admin-bookings.ts already merged both rails for the ADMIN (DI-04), so
 * the operator could see money the earner could not. This pins the same merge on
 * the earner's own screen.
 */

const PANDIT_USER_ID = '3f7c1a5e-9b2d-4c6a-8e10-2b4d6f8a0c11';
const PRIEST_ROW_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const PANDIT_USER = {
  id: PANDIT_USER_ID,
  email: 'pandit@demo.com',
  phone: null,
  fullName: 'Pandit Joshi',
  subscriptionTier: 'free',
  blocked: false,
};

/** The temple-path booking the pandit performed. */
const BOOKING = {
  id: 'booking-temple-1',
  bookingNumber: 'BS-20260812-T9CHE',
  pujaType: { name: 'Satyanarayan Puja' },
  temple: { name: 'Shri Kashi Vishwanath' },
};

type CommissionRow = {
  id: string;
  bookingId: string | null;
  storeOrderId?: string | null;
  wellnessEnrollmentId?: string | null;
  payoutRequestId: string | null;
  providerId: string;
  amount: Prisma.Decimal;
  status: 'PENDING' | 'PAID' | 'REVERSED';
  paidAt: Date | null;
  createdAt: Date;
  payoutRequest: {
    status: string;
    method: string;
    reference: string | null;
    processedAt: Date | null;
  } | null;
};

/** His earning, on the unified rail, exactly as booking.service mints it. */
function templeEarning(overrides: Partial<CommissionRow> = {}): CommissionRow {
  return {
    id: 'c-temple-1',
    bookingId: BOOKING.id,
    storeOrderId: null,
    wellnessEnrollmentId: null,
    payoutRequestId: null,
    providerId: PANDIT_USER_ID,
    amount: new Prisma.Decimal('770.00'),
    status: 'PENDING',
    paidAt: null,
    createdAt: new Date('2026-08-12T10:00:00.000Z'),
    payoutRequest: null,
    ...overrides,
  };
}

// ─── A commission ledger faithful enough that the assertions test the route ──
//
// Every predicate below is one the route actually writes. Nothing is
// hand-waved: the "REVERSED is never shown" test puts a REVERSED row IN the
// ledger and relies on this filter to drop it, so the exclusion is proved by
// the query the route sent, not by a fixture that omitted the row.

let ledger: CommissionRow[] = [];

function matches(row: CommissionRow, where: any): boolean {
  if (!where) return true;
  if (where.providerId !== undefined && row.providerId !== where.providerId) return false;
  if (where.bookingId !== undefined) {
    if (where.bookingId?.not === null && row.bookingId === null) return false;
  }
  if (where.status !== undefined) {
    if (typeof where.status === 'string') {
      if (row.status !== where.status) return false;
    } else if (where.status?.not !== undefined && row.status === where.status.not) {
      return false;
    }
  }
  if (where.payoutRequestId !== undefined && row.payoutRequestId !== where.payoutRequestId) {
    return false;
  }
  if (where.payoutRequest !== undefined) {
    const rq = row.payoutRequest?.status;
    const cond = where.payoutRequest.status;
    if (cond?.in && !(rq && cond.in.includes(rq))) return false;
    if (cond?.notIn && rq && cond.notIn.includes(rq)) return false;
  }
  if (Array.isArray(where.OR) && !where.OR.some((clause: any) => matches(row, clause))) {
    return false;
  }
  return true;
}

function select(where: any): CommissionRow[] {
  return ledger.filter((row) => matches(row, where));
}

function sum(rows: CommissionRow[]): Prisma.Decimal | null {
  if (!rows.length) return null;
  return rows.reduce((acc, r) => acc.add(r.amount), new Prisma.Decimal(0));
}

async function call(path: string) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await priestRoutes(i); }, { prefix: '/api/v1/priest' });
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/priest${path}`,
    headers: { authorization: 'Bearer demo-priest' },
  });
  await app.close();
  return res;
}

const getPayouts = (query = '') => call(`/payouts${query}`);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';

  // Auth: demo-priest resolves pandit@demo.com; requireRole('priest') then
  // demands an ACTIVE Priest row for that user id, and getPriestId reads the
  // same row for its `id`.
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'pandit@demo.com' ? PANDIT_USER : null,
  );
  prismaMock.priest.findUnique.mockResolvedValue({
    id: PRIEST_ROW_ID,
    userId: PANDIT_USER_ID,
    status: 'active',
    displayName: 'Pandit Joshi',
  } as never);

  // The legacy sidecar rail is EMPTY — createPriestPayout refused to write it
  // because the Commission below already owns the booking.
  prismaMock.priestPayout.findMany.mockResolvedValue([] as never);
  prismaMock.priestPayout.count.mockResolvedValue(0 as never);
  prismaMock.priestPayout.aggregate.mockResolvedValue({ _sum: { amount: null } } as never);
  prismaMock.priestPayout.findFirst.mockResolvedValue(null as never);

  ledger = [templeEarning()];

  prismaMock.commission.count.mockImplementation(async (args: any) => select(args?.where).length);
  prismaMock.commission.aggregate.mockImplementation(async (args: any) => ({
    _sum: { amount: sum(select(args?.where)) },
  }));
  prismaMock.commission.findMany.mockImplementation(async (args: any) => {
    const rows = select(args?.where).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return args?.take ? rows.slice(0, args.take) : rows;
  });
  prismaMock.commission.findFirst.mockImplementation(async (args: any) => {
    const rows = select(args?.where).sort(
      (a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0),
    );
    return rows[0] ?? null;
  });

  prismaMock.pujaBooking.findMany.mockResolvedValue([BOOKING] as never);
});

describe('DI-05 read path — GET /priest/payouts sees the unified rail', () => {
  it('lists the temple-path earning the sidecar rail never received', async () => {
    const res = await getPayouts();
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.payouts).toHaveLength(1);
    const row = body.payouts[0];
    expect(Number(row.amount)).toBe(770);
    expect(row.booking.bookingNumber).toBe('BS-20260812-T9CHE');
    expect(row.booking.pujaType.name).toBe('Satyanarayan Puja');
    expect(row.booking.temple.name).toBe('Shri Kashi Vishwanath');
    // Unlinked + PENDING = earned, withdrawable, not yet requested.
    expect(row.status).toBe('pending');
    expect(row.rail).toBe('commission');
    expect(body.total).toBe(1);
  });

  it('counts it in the Pending Payout card instead of showing Rs 0', async () => {
    const body = (await getPayouts()).json();
    // This is the number on the screen. Rs 0 here is the whole finding.
    expect(Number(body.summary.pending)).toBe(770);
    expect(Number(body.summary.totalEarned)).toBe(0);
  });

  it('reports a settled commission as paid out, with its transfer reference', async () => {
    ledger = [
      templeEarning({
        status: 'PAID',
        paidAt: new Date('2026-08-15T06:00:00.000Z'),
        payoutRequestId: 'pr-1',
        payoutRequest: {
          status: 'completed',
          method: 'upi',
          reference: 'UPI-778899',
          processedAt: new Date('2026-08-15T06:00:00.000Z'),
        },
      }),
    ];

    const body = (await getPayouts()).json();
    expect(body.payouts).toHaveLength(1);
    expect(body.payouts[0].status).toBe('completed');
    expect(body.payouts[0].payoutReference).toBe('UPI-778899');
    expect(body.payouts[0].payoutMethod).toBe('upi');
    expect(Number(body.summary.totalEarned)).toBe(770);
    expect(Number(body.summary.pending)).toBe(0);
    expect(body.summary.lastPayout).not.toBeNull();
    expect(Number(body.summary.lastPayout.amount)).toBe(770);
  });

  it('reports an in-flight commission as processing, not as fresh balance', async () => {
    ledger = [
      templeEarning({
        payoutRequestId: 'pr-2',
        payoutRequest: {
          status: 'processing',
          method: 'bank',
          reference: null,
          processedAt: null,
        },
      }),
    ];

    const body = (await getPayouts()).json();
    expect(body.payouts[0].status).toBe('processing');
    // Requested but not transferred is still money he is owed.
    expect(Number(body.summary.pending)).toBe(770);
    expect(Number(body.summary.totalEarned)).toBe(0);
  });

  it('never shows a REVERSED commission as money owed', async () => {
    // A reschedule detaches the pandit and reverses his earning. It is an audit
    // record, not a payable — surfacing it would promise money nobody owes.
    ledger = [
      templeEarning(),
      templeEarning({
        id: 'c-void',
        status: 'REVERSED',
        amount: new Prisma.Decimal('5000.00'),
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      }),
    ];

    const body = (await getPayouts()).json();
    expect(body.payouts).toHaveLength(1);
    expect(body.payouts[0].id).toBe('c-temple-1');
    expect(Number(body.summary.pending)).toBe(770);
    expect(body.total).toBe(1);
  });

  it('ignores store and wellness commissions — this page renders puja bookings', async () => {
    ledger = [
      templeEarning(),
      templeEarning({
        id: 'c-store',
        bookingId: null,
        storeOrderId: 'so-1',
        amount: new Prisma.Decimal('300.00'),
      }),
    ];

    const body = (await getPayouts()).json();
    expect(body.payouts).toHaveLength(1);
    expect(Number(body.summary.pending)).toBe(770);
  });

  it('still returns the legacy sidecar rows, merged newest-first', async () => {
    prismaMock.priestPayout.findMany.mockResolvedValue([
      {
        id: 'pp-legacy',
        amount: new Prisma.Decimal('1200.00'),
        status: 'completed',
        payoutMethod: 'bank_transfer',
        payoutReference: 'NEFT-1',
        processedAt: new Date('2026-08-01T06:00:00.000Z'),
        createdAt: new Date('2026-07-30T06:00:00.000Z'),
        booking: {
          id: 'booking-legacy',
          bookingNumber: 'BS-20260730-AAAAA',
          pujaType: { name: 'Rudrabhishek' },
          temple: { name: 'Somnath' },
        },
      },
    ] as never);
    prismaMock.priestPayout.count.mockResolvedValue(1 as never);
    prismaMock.priestPayout.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('1200.00') },
    } as never);

    const body = (await getPayouts()).json();
    expect(body.payouts).toHaveLength(2);
    // Commission (2026-08-12) is newer than the sidecar row (2026-07-30).
    expect(body.payouts[0].booking.bookingNumber).toBe('BS-20260812-T9CHE');
    expect(body.payouts[1].booking.bookingNumber).toBe('BS-20260730-AAAAA');
    expect(body.total).toBe(2);
    // Both rails feed one set of cards — Rs 1,200 settled + Rs 770 still owed.
    // priestPayout.aggregate is stubbed for BOTH the earned and pending reads,
    // hence Rs 1,200 on each side from the legacy rail.
    expect(Number(body.summary.totalEarned)).toBe(1200);
    expect(Number(body.summary.pending)).toBe(1970);
  });

  it('applies ?status to both rails, not just the legacy one', async () => {
    const pendingRes = await getPayouts('?status=pending');
    expect(pendingRes.statusCode).toBe(200);
    expect(pendingRes.json().payouts).toHaveLength(1);
    expect(pendingRes.json().payouts[0].status).toBe('pending');

    // The same row must NOT answer a filter it does not match.
    const completedRes = await getPayouts('?status=completed');
    expect(completedRes.json().payouts).toHaveLength(0);
    expect(completedRes.json().total).toBe(0);

    // No commission can ever be in a failed state — a failed PayoutRequest
    // unlinks its commissions and returns them to PENDING.
    const failedRes = await getPayouts('?status=failed');
    expect(failedRes.json().payouts).toHaveLength(0);
  });

  it('agrees with the dashboard earnings card — PF-12 holds on both rails', async () => {
    // PF-12 exists because these two screens once disagreed for the same
    // account. Teaching only /payouts about the unified rail would recreate that
    // exact contradiction: Rs 770 owed here, Rs 0 on the dashboard.
    prismaMock.priest.findUnique.mockResolvedValue({
      id: PRIEST_ROW_ID,
      userId: PANDIT_USER_ID,
      status: 'active',
      displayName: 'Pandit Joshi',
      ratingAvg: 5,
      ratingCount: 2,
      avatarUrl: null,
      isOnDuty: true,
      lastSeenAt: null,
    } as never);
    prismaMock.pujaBooking.count.mockResolvedValue(0 as never);

    const payouts = (await getPayouts()).json();
    const dashboard = (await call('/dashboard')).json();

    expect(Number(dashboard.earnings.pending)).toBe(770);
    expect(Number(dashboard.earnings.pending)).toBe(Number(payouts.summary.pending));
    expect(Number(dashboard.earnings.total)).toBe(Number(payouts.summary.totalEarned));
  });

  it('counts a settled commission in the dashboard this-month figure', async () => {
    const now = new Date();
    ledger = [
      templeEarning({
        status: 'PAID',
        paidAt: new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0),
        payoutRequestId: 'pr-1',
        payoutRequest: {
          status: 'completed',
          method: 'upi',
          reference: 'UPI-1',
          processedAt: now,
        },
      }),
    ];
    prismaMock.priest.findUnique.mockResolvedValue({
      id: PRIEST_ROW_ID,
      userId: PANDIT_USER_ID,
      status: 'active',
      displayName: 'Pandit Joshi',
      ratingAvg: 5,
      ratingCount: 2,
      avatarUrl: null,
      isOnDuty: true,
      lastSeenAt: null,
    } as never);
    prismaMock.pujaBooking.count.mockResolvedValue(0 as never);

    const dashboard = (await call('/dashboard')).json();
    expect(Number(dashboard.earnings.total)).toBe(770);
    expect(Number(dashboard.earnings.thisMonth)).toBe(770);
    expect(Number(dashboard.earnings.pending)).toBe(0);
  });

  it('leaves a pandit with no commissions on the untouched single-rail path', async () => {
    ledger = [];
    prismaMock.priestPayout.findMany.mockResolvedValue([] as never);

    const body = (await getPayouts('?page=7&limit=25')).json();
    // The legacy path is delegated whole to priestService.getPayoutHistory —
    // proved by the page/limit it forwards, not by the empty result.
    const call = prismaMock.priestPayout.findMany.mock.calls[0]![0];
    expect(call.skip).toBe(150);
    expect(call.take).toBe(25);
    expect(body).not.toHaveProperty('mergeTruncated');
  });
});
