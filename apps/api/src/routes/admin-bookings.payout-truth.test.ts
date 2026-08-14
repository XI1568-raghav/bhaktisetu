import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminBookingsRoutes } from './admin-bookings.js';

/**
 * DI-03 / DI-04 (prod sweep 2026-08-12, both P1).
 *
 * GET /admin/bookings/payouts/pending is the screen an admin settles from —
 * the transfer itself happens by hand over bank/UPI, so whatever this endpoint
 * prints is what a pandit actually receives.
 *
 * DI-03  It recomputed the payout as `price_amount * 0.75`. Measured over
 *        priest 6a56eba6's 42 payable bookings: sum(price_amount) Rs 46,404,
 *        authoritative sum(priest_payout) Rs 32,340, screen formula
 *        Rs 34,803 — Rs 2,463 (+7.6%) overstated on every settlement run.
 *        Two compounding errors: 0.75 is a legacy 25% take that matches
 *        neither the uniform 20/80 doctrine nor the pandit's own negotiated
 *        commission_rate, and price_amount includes the Rs 51 platform fee and
 *        the Rs 150 prasad-delivery pass-through that no pandit has a claim
 *        on. The booking row already carries the resolved answer in
 *        priest_payout, computed at creation time honouring that pandit's rate.
 *
 * DI-04  The same human appeared TWICE — once keyed on Priest.id from the
 *        PriestPayout rail and once on User.id from the Commission ledger,
 *        both labelled 'Demo Pandit', with no indication they are one payee.
 *        The rails are disjoint per booking, so it is not a double count — but
 *        an admin working the queue by hand has no way to know that, and
 *        paying both rows transfers to the same provider twice.
 */

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const PRIEST_ROW_ID = 'priest-6a56eba6';
const PANDIT_USER_ID = 'user-b61f02c9';

async function getPending() {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminBookingsRoutes(i); }, {
    prefix: '/api/v1/admin/bookings',
  });
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/bookings/payouts/pending',
    headers: { authorization: 'Bearer demo-admin' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.pujaBooking.findMany.mockResolvedValue([] as never);
  prismaMock.priestPayout.findMany.mockResolvedValue([] as never);
  prismaMock.commission.findMany.mockResolvedValue([] as never);
  prismaMock.priest.findMany.mockResolvedValue([] as never);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([] as never);
  prismaMock.user.findMany.mockResolvedValue([] as never);
});

describe('DI-03 — the priest rail reports the authoritative split, not a legacy multiplier', () => {
  it('sums priest_payout instead of recomputing price_amount * 0.75', async () => {
    // One Rs 1,100 puja + Rs 51 platform fee + Rs 150 prasad delivery = Rs 1,301
    // gross, of which the pandit's persisted 80% share of the PUJA price is
    // Rs 880. The legacy formula would answer 1301 * 0.75 = Rs 975.75.
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: 'bk-1',
        priestId: PRIEST_ROW_ID,
        priceAmount: new Prisma.Decimal('1301.00'),
        priestPayout: new Prisma.Decimal('880.00'),
      },
    ] as never);
    prismaMock.priest.findMany.mockResolvedValue([
      { id: PRIEST_ROW_ID, userId: PANDIT_USER_ID, user: { fullName: 'Demo Pandit' } },
    ] as never);

    const res = await getPending();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const priestGroup = body.groups.find((g: { providerName: string }) => g.providerName === 'Demo Pandit');

    expect(priestGroup).toBeDefined();
    expect(priestGroup.totalPayout).toBe(880);
    expect(priestGroup.totalPayout).not.toBe(975.75);
  });

  it('never pays out on the platform fee or the prasad pass-through', async () => {
    // A booking whose persisted split is Rs 0 (nothing owed) must report Rs 0,
    // not 75% of a gross that is entirely platform revenue.
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: 'bk-fee-only',
        priestId: PRIEST_ROW_ID,
        priceAmount: new Prisma.Decimal('201.00'),
        priestPayout: new Prisma.Decimal('0.00'),
      },
    ] as never);
    prismaMock.priest.findMany.mockResolvedValue([
      { id: PRIEST_ROW_ID, userId: PANDIT_USER_ID, user: { fullName: 'Demo Pandit' } },
    ] as never);

    const body = (await getPending()).json();
    const priestGroup = body.groups.find((g: { providerName: string }) => g.providerName === 'Demo Pandit');
    expect(priestGroup.totalPayout).toBe(0);
  });
});

describe('DI-04 — one row per human, whichever rail the money is on', () => {
  it('merges the PriestPayout rail and the Commission ledger for the same person', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: 'bk-1',
        priestId: PRIEST_ROW_ID,
        priceAmount: new Prisma.Decimal('1301.00'),
        priestPayout: new Prisma.Decimal('880.00'),
      },
    ] as never);
    prismaMock.priest.findMany.mockResolvedValue([
      { id: PRIEST_ROW_ID, userId: PANDIT_USER_ID, user: { fullName: 'Demo Pandit' } },
    ] as never);
    // The SAME human, reached through the ledger rail on a different booking.
    prismaMock.commission.findMany.mockImplementation(async (args: { where?: { status?: string } }) => {
      if (args?.where?.status === 'PENDING') {
        return [{ providerId: PANDIT_USER_ID, amount: new Prisma.Decimal('770.00') }] as never;
      }
      return [] as never; // the ledger-owned lookup for the priest window
    });
    prismaMock.user.findMany.mockResolvedValue([
      { id: PANDIT_USER_ID, fullName: 'Demo Pandit' },
    ] as never);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: PANDIT_USER_ID, role: 'pandit', isPrimary: true },
    ] as never);

    const body = (await getPending()).json();
    const mine = body.groups.filter((g: { providerName: string }) => g.providerName === 'Demo Pandit');

    // ONE payee, ONE row. Two rows for one human on a hand-settled queue is an
    // invitation to transfer twice.
    expect(mine).toHaveLength(1);
    expect(mine[0].providerId).toBe(PANDIT_USER_ID);
    expect(mine[0].totalPayout).toBe(1650); // 880 booking rail + 770 ledger rail
    expect(mine[0].bookingsCount).toBe(2);
    // The per-rail split stays visible so an admin can reconcile the number.
    expect(mine[0].rails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rail: 'priest_payout', totalPayout: 880 }),
        expect.objectContaining({ rail: 'commission', totalPayout: 770 }),
      ]),
    );
  });

  it('keys the priest rail on the User id, never on the Priest row id', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: 'bk-1',
        priestId: PRIEST_ROW_ID,
        priceAmount: new Prisma.Decimal('1301.00'),
        priestPayout: new Prisma.Decimal('880.00'),
      },
    ] as never);
    prismaMock.priest.findMany.mockResolvedValue([
      { id: PRIEST_ROW_ID, userId: PANDIT_USER_ID, user: { fullName: 'Demo Pandit' } },
    ] as never);

    const body = (await getPending()).json();
    const ids = body.groups.map((g: { providerId: string }) => g.providerId);
    expect(ids).toContain(PANDIT_USER_ID);
    expect(ids).not.toContain(PRIEST_ROW_ID);
  });
});
