import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';

// ── batch9-review regression locks (2026-08-11) ──────────────────────────────
//
// GET /admin/commissions returned the raw Commission row and nothing else, so
// the admin ledger rendered Gross '—', Net '—', Reference '—' and both the
// provider and the booking as raw UUIDs. An admin cannot confirm a 20/80 split
// or even tell whose row it is before authorising a transfer, and `percentage`
// was fetched and stringified but never mapped to any UI field, so the take
// rate was invisible. `?status=REVERSED` also 400'd, hiding the post-refund
// reconciliation view as a class.

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await adminRoutes(instance);
  }, { prefix: '/api/v1/admin' });
  return app;
}

async function getCommissions(query = '') {
  const app = await buildApp();
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/admin/commissions${query}`,
    headers: { authorization: 'Bearer demo-admin' },
  });
  await app.close();
  return res;
}

const BOOKING_ID_1 = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOOKING_ID_2 = 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOOKING_ID_3 = 'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STORE_ORDER_ID_1 = 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ENROLLMENT_ID_1 = 'ccccccc1-cccc-4ccc-8ccc-cccccccccccc';

// DI-07 (F368): these ids are real uuids because the columns they land in are
// real uuids — `puja_bookings.id`, `store_orders.id` and
// `wellness_enrollments.id` are all `@db.Uuid`, and the route now filters the
// text-typed `commissions.*_id` values to uuid shape before handing them to
// those lookups (Prisma raises P2023 on a malformed one, which 500s the whole
// ledger). Fixtures like 'bk-1' could never exist in the database and were
// silently exercising a path production cannot reach.
/** A Rs 1,100 puja under the uniform 20/80 take rate. */
const PUJA_ROW = {
  id: 'com-1',
  bookingId: BOOKING_ID_1,
  storeOrderId: null,
  wellnessEnrollmentId: null,
  payoutRequestId: 'pr-1',
  providerId: 'prov-1',
  amount: new Prisma.Decimal('880.00'),
  percentage: new Prisma.Decimal('0.2000'),
  status: 'PENDING',
  paidAt: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  payoutRequest: { reference: 'UPI-77123', processedAt: new Date('2026-08-09T00:00:00.000Z') },
};

type Row = Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test'; // enables the demo-token bypass in auth middleware
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.commission.findMany.mockResolvedValue([] as never);
  prismaMock.commission.count.mockResolvedValue(0 as never);
  // DI-08 (2026-08-12): the route now also aggregates provider earnings vs the
  // platform take by rate, so the grouped query needs a default here. The
  // shared mock's `groupBy` is a bare vi.fn() and would resolve undefined.
  prismaMock.commission.groupBy.mockResolvedValue([] as never);
  prismaMock.user.findMany.mockResolvedValue([] as never);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([] as never);
  prismaMock.pujaBooking.findMany.mockResolvedValue([] as never);
  prismaMock.storeOrder.findMany.mockResolvedValue([] as never);
  prismaMock.wellnessEnrollment.findMany.mockResolvedValue([] as never);
});

describe('GET /admin/commissions — derived money columns', () => {
  it('derives gross and the platform cut from amount + take rate', async () => {
    prismaMock.commission.findMany.mockResolvedValue([PUJA_ROW] as never);
    prismaMock.commission.count.mockResolvedValue(1 as never);

    const row = (await getCommissions()).json().data[0] as Row;

    // amount IS the provider's earning; gross = amount / (1 - rate) and the
    // platform cut is the remainder — via lib/commission-math.ts, never inline.
    expect(row.amount).toBe('880');
    expect(row.grossAmount).toBe('1100');
    expect(row.platformCut).toBe('220');
    expect(row.ratePercent).toBe(20);
    // Decimal-derived: a float `Number(percentage) * 100` renders 5% as
    // 5.000000000000001 in the take-rate column.
    expect(String(row.ratePercent)).toBe('20');
    // The three must reconcile, or the ledger cannot be used to check a split.
    expect(Number(row.platformCut) + Number(row.amount)).toBe(Number(row.grossAmount));
  });

  it('keeps a non-round take rate free of float noise', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      { ...PUJA_ROW, percentage: new Prisma.Decimal('0.0500') },
    ] as never);
    prismaMock.commission.count.mockResolvedValue(1 as never);

    const row = (await getCommissions()).json().data[0] as Row;
    expect(row.ratePercent).toBe(5);
    expect(String(row.ratePercent)).toBe('5');
  });

  it('never emits a negative or infinite gross for a degenerate take rate', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      { ...PUJA_ROW, percentage: new Prisma.Decimal('1.0000') },
    ] as never);
    prismaMock.commission.count.mockResolvedValue(1 as never);

    const row = (await getCommissions()).json().data[0] as Row;
    expect(row.grossAmount).toBe('0');
    expect(row.platformCut).toBe('0');
  });

  it('names the provider and their payout role instead of a bare UUID', async () => {
    prismaMock.commission.findMany.mockResolvedValue([PUJA_ROW] as never);
    prismaMock.commission.count.mockResolvedValue(1 as never);
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'prov-1', fullName: 'Pandit Ramesh' },
    ] as never);
    // Dual-role provider: precedence must give the same answer the payout engine
    // stamps onto a PayoutRequest, or the ledger and the queue disagree.
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'prov-1', role: 'PANDIT', isPrimary: false },
      { userId: 'prov-1', role: 'STORE_OWNER', isPrimary: false },
    ] as never);

    const row = (await getCommissions()).json().data[0] as Row;
    expect(row.providerName).toBe('Pandit Ramesh');
    expect(row.providerRole).toBe('STORE_OWNER');
  });

  it('labels the source row for a puja, a store order and a wellness enrolment', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      PUJA_ROW,
      { ...PUJA_ROW, id: 'com-2', bookingId: null, storeOrderId: STORE_ORDER_ID_1 },
      { ...PUJA_ROW, id: 'com-3', bookingId: null, wellnessEnrollmentId: ENROLLMENT_ID_1 },
    ] as never);
    prismaMock.commission.count.mockResolvedValue(3 as never);
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      { id: BOOKING_ID_1, bookingNumber: 'BS-20260801-ABCDE', pujaType: { name: 'Satyanarayan Puja' } },
    ] as never);
    prismaMock.storeOrder.findMany.mockResolvedValue([
      { id: STORE_ORDER_ID_1, orderNumber: 'SO-1042' },
    ] as never);
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([
      { id: ENROLLMENT_ID_1, session: { title: 'Sunrise Yoga' } },
    ] as never);

    const data = (await getCommissions()).json().data as Row[];
    expect(data[0]!.bookingNumber).toBe('BS-20260801-ABCDE');
    expect(data[0]!.itemName).toBe('Satyanarayan Puja');
    // Store-order and wellness rows have a null bookingId — they used to render
    // a blank Booking cell with nothing identifying them at all.
    expect(data[1]!.bookingNumber).toBe('SO-1042');
    expect(data[2]!.itemName).toBe('Sunrise Yoga');
  });

  it('carries the settling transfer reference from the payout request', async () => {
    prismaMock.commission.findMany.mockResolvedValue([PUJA_ROW] as never);
    prismaMock.commission.count.mockResolvedValue(1 as never);

    const row = (await getCommissions()).json().data[0] as Row;
    expect(row.payoutReference).toBe('UPI-77123');
    expect(row.processedAt).toBe('2026-08-09T00:00:00.000Z');
    // The joined relation itself is an implementation detail, not payload.
    expect(row.payoutRequest).toBeUndefined();
  });

  it('issues one batched join per source table, never a query per row', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      PUJA_ROW,
      { ...PUJA_ROW, id: 'com-2', bookingId: BOOKING_ID_2 },
      { ...PUJA_ROW, id: 'com-3', bookingId: BOOKING_ID_3 },
    ] as never);
    prismaMock.commission.count.mockResolvedValue(3 as never);

    await getCommissions();
    expect(prismaMock.pujaBooking.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    expect(
      (prismaMock.pujaBooking.findMany.mock.calls[0]![0] as { where: { id: { in: string[] } } })
        .where.id.in,
    ).toEqual([BOOKING_ID_1, BOOKING_ID_2, BOOKING_ID_3]);
    // No booking/order ids on the page ⇒ no pointless `IN ()` round-trips.
    expect(prismaMock.storeOrder.findMany).not.toHaveBeenCalled();
    expect(prismaMock.wellnessEnrollment.findMany).not.toHaveBeenCalled();
  });
});

describe('GET /admin/commissions — status filter', () => {
  it('accepts REVERSED so refunded rows can be reconciled as a class', async () => {
    const res = await getCommissions('?status=REVERSED');
    expect(res.statusCode).toBe(200);
    expect(
      (prismaMock.commission.findMany.mock.calls[0]![0] as { where: { status?: string } }).where
        .status,
    ).toBe('REVERSED');
  });

  it('still rejects a status the enum cannot hold', async () => {
    expect((await getCommissions('?status=pending')).statusCode).toBe(400);
    expect((await getCommissions('?status=on_hold')).statusCode).toBe(400);
  });

  it('leaves status unfiltered when none is supplied', async () => {
    await getCommissions();
    expect(
      (prismaMock.commission.findMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where,
    ).toEqual({});
  });
});
