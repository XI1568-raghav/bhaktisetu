import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { priestRoutes, __knownUnifiedClear } from './priest.js';

/**
 * DI-05, the double-payable — ONE booking holding a row on BOTH payout rails.
 *
 * The rails were only ONE-WAY exclusive. payment.service.createPriestPayout
 * refuses to write a PriestPayout when a live Commission exists, but the
 * Commission mint never checked for a PriestPayout. `video_uploaded ->
 * delivered` is a legal transition and both statuses are in
 * EARNING_ATTACH_STATUSES, so a booking already carrying a legacy sidecar row
 * minted a Commission on its next move and ended up on both rails at once.
 *
 * The merge added to GET /priest/payouts then turned that latent inconsistency
 * into a visible one: it concatenated `[...legacy.payouts, ...unified]` with NO
 * dedupe, and `total` / `summary.totalEarned` / `summary.pending` were plain
 * additions of the two rails. So the pandit's own screen listed the same puja
 * TWICE and told him he was owed DOUBLE the money.
 *
 * The write side is now symmetric (provider-earning-mint.ts guard 2), so no new
 * booking can land on both. This file covers the read side for the rows that
 * already did — and pins the rail precedence: the COMMISSION row wins, matching
 * the documented direction in payment.service.
 *
 * No existing test covered this; the one merge test in
 * priest-payouts-unified-rail.di05.test.ts uses two DIFFERENT bookings.
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

/** The ONE booking. Rs 770 owed, once. */
const BOOKING = {
  id: 'booking-double-1',
  bookingNumber: 'BS-20260812-DBL01',
  pujaType: { name: 'Satyanarayan Puja' },
  temple: { name: 'Shri Kashi Vishwanath' },
};

const AMOUNT = new Prisma.Decimal('770.00');

/** The legacy sidecar row, written first. */
const LEGACY_ROW = {
  id: 'pp-1',
  amount: AMOUNT,
  status: 'pending' as const,
  payoutMethod: 'bank_transfer',
  payoutReference: null,
  processedAt: null,
  createdAt: new Date('2026-08-12T09:00:00.000Z'),
  booking: BOOKING,
};

/** The Commission the mint added later for the SAME booking. */
const COMMISSION_ROW = {
  id: 'c-1',
  bookingId: BOOKING.id,
  storeOrderId: null,
  wellnessEnrollmentId: null,
  payoutRequestId: null,
  providerId: PANDIT_USER_ID,
  amount: AMOUNT,
  status: 'PENDING' as const,
  paidAt: null,
  createdAt: new Date('2026-08-12T10:00:00.000Z'),
  payoutRequest: null,
};

/** Mutable so a test can swap which booking the legacy rail carries. */
let legacyRail: Array<typeof LEGACY_ROW> = [];

async function getPayouts(query = '') {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await priestRoutes(i); }, { prefix: '/api/v1/priest' });
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/priest/payouts${query}`,
    headers: { authorization: 'Bearer demo-priest' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  __knownUnifiedClear();
  process.env.NODE_ENV = 'test';

  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'pandit@demo.com' ? PANDIT_USER : null,
  );
  prismaMock.priest.findUnique.mockResolvedValue({
    id: PRIEST_ROW_ID,
    userId: PANDIT_USER_ID,
    status: 'active',
    displayName: 'Pandit Joshi',
  } as never);

  // ── legacy rail: ONE pending row on BOOKING ──
  //
  // Filter-aware, because the route asks this table TWO different questions:
  // "give me the pandit's payout page" (no bookingId filter) and "which of
  // these commission-backed bookings do you ALSO carry?" (bookingId: { in }).
  // A blanket mock answers the same row to both, which fakes an overlap for
  // every booking and would make the dedupe look correct for the wrong reason.
  legacyRail = [LEGACY_ROW];
  prismaMock.priestPayout.findMany.mockImplementation(async (args: any) => {
    const ids: string[] | undefined = args?.where?.bookingId?.in;
    const rows = legacyRail.filter((r) => !ids || ids.includes(r.booking.id));
    if (args?.select?.bookingId) {
      return rows.map((r) => ({
        bookingId: r.booking.id,
        amount: r.amount,
        status: r.status,
      })) as never;
    }
    return rows as never;
  });
  prismaMock.priestPayout.count.mockImplementation(async () => legacyRail.length as never);
  prismaMock.priestPayout.findFirst.mockResolvedValue(null as never);
  // getPayoutHistory aggregates twice: `completed` (=> totalEarned) and
  // pending/processing (=> pending). Keyed on the where it actually sends.
  prismaMock.priestPayout.aggregate.mockImplementation(async (args: any) => {
    const status = args?.where?.status;
    if (status === 'completed') return { _sum: { amount: null } };
    return { _sum: { amount: AMOUNT } };
  });

  // ── unified rail: ONE PENDING commission on the SAME booking ──
  prismaMock.commission.count.mockResolvedValue(1 as never);
  // The presence + PAID/PENDING sums come from one groupBy over the base set.
  prismaMock.commission.groupBy.mockResolvedValue([{ status: 'PENDING', _sum: { amount: AMOUNT } }] as never);
  prismaMock.commission.findMany.mockResolvedValue([COMMISSION_ROW] as never);
  prismaMock.commission.findFirst.mockResolvedValue(null as never);
  prismaMock.commission.aggregate.mockImplementation(async (args: any) => {
    // unifiedEarnings: PAID => total/thisMonth, PENDING+unlinked => pending.
    const status = args?.where?.status;
    if (status === 'PAID') return { _sum: { amount: null } };
    return { _sum: { amount: AMOUNT } };
  });

  prismaMock.pujaBooking.findMany.mockResolvedValue([BOOKING] as never);
});

describe('DI-05 — a booking on BOTH rails is paid once, not twice', () => {
  it('lists the booking ONCE', async () => {
    const res = await getPayouts();
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // Pre-fix this was 2: the same puja rendered twice on the pandit's screen.
    expect(body.payouts).toHaveLength(1);
    expect(body.payouts[0].booking.id).toBe(BOOKING.id);
  });

  it('keeps the COMMISSION row and drops the legacy duplicate (documented precedence)', async () => {
    const body = (await getPayouts()).json();
    expect(body.payouts[0].rail).toBe('commission');
    expect(body.payouts[0].id).toBe('c-1');
  });

  it('counts the money ONCE in the Pending card', async () => {
    const body = (await getPayouts()).json();
    // Pre-fix: 770 + 770 = 1540 — the pandit told he is owed double.
    expect(Number(body.summary.pending)).toBe(770);
  });

  it('reports a total of ONE payout, not two', async () => {
    const body = (await getPayouts()).json();
    expect(body.total).toBe(1);
  });

  it('still shows BOTH when the two rails carry DIFFERENT bookings', async () => {
    // The dedupe must key on bookingId, never collapse unrelated earnings.
    const other = { ...BOOKING, id: 'booking-other', bookingNumber: 'BS-20260812-OTH02' };
    legacyRail = [{ ...LEGACY_ROW, booking: other }];
    prismaMock.pujaBooking.findMany.mockResolvedValue([BOOKING, other] as never);

    const body = (await getPayouts()).json();
    expect(body.payouts).toHaveLength(2);
    expect(Number(body.summary.pending)).toBe(1540);
    expect(body.total).toBe(2);
  });
});
