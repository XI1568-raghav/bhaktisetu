import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, notifyUser: vi.fn().mockResolvedValue(0) };
});

import Fastify from 'fastify';
import { bookingRoutes } from './bookings.js';

/**
 * DI-05, residue — attaching a pandit WITHOUT moving the status still left him
 * owed money the ledger did not record.
 *
 * The original finding: a pandit paid through the temple booking path saw ₹0 in
 * his own payout portal. Commission rows are minted at CONFIRM time keyed to
 * whoever is on the booking then, and on the temple path nobody is — the pandit
 * is attached later. That was closed for every transition that MOVES the status
 * (booking.service's EARNING_ATTACH_STATUSES re-runs the mint on
 * priest_assigned/in_progress/completed/…).
 *
 * One door was left open. `PATCH /bookings/:id { status: <unchanged>, priestId }`
 * — the pure-reassignment path — commits its own transaction and RETURNS EARLY,
 * never reaching `updateBookingStatus`. Inside that transaction the only ledger
 * write is `commission.updateMany`, which MOVES an existing earning to the new
 * pandit and matches ZERO rows when the temple path never minted one. So an
 * admin who attaches a pandit to a paid, confirmed, temple-anchored booking
 * without advancing it leaves the pandit with nothing on /payouts, exactly as
 * before, on the screen the finding calls the most trust-destroying in a
 * marketplace.
 *
 * Money invariants under test (lib/commission-math.ts): `amount` is the
 * PROVIDER's earning; `percentage` is the PLATFORM's rate against the
 * fee-INCLUSIVE priceAmount, the same base both minting writers use.
 */

const ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const BOOKING_ID = '33333333-3333-3333-3333-333333333333';
const NEW_PRIEST_ID = '44444444-4444-4444-4444-444444444444';
const NEW_PRIEST_USER = '55555555-5555-5555-5555-555555555555';

/** A paid, confirmed, temple-path booking: no priest, and no Commission row. */
function templePathBooking() {
  prismaMock.pujaBooking.findUnique.mockImplementation(async (args: any) => {
    if (args?.select?.priestPayout) {
      return {
        priestPayout: new Prisma.Decimal('770.00'),
        platformCommission: new Prisma.Decimal('330.00'),
        priceAmount: new Prisma.Decimal('1100.00'),
      };
    }
    return {
      userId: 'user-devotee-1',
      priestId: null,
      status: 'confirmed',
      videoProofUrl: null,
      scheduledDate: new Date('2026-09-01T00:00:00.000Z'),
      scheduledTimeSlot: 'morning',
      priest: null,
    };
  });
  prismaMock.priest.findUnique.mockResolvedValue({
    id: NEW_PRIEST_ID,
    isVerified: true,
    status: 'active',
    userId: NEW_PRIEST_USER,
    // A plain number, because that is exactly what production hands over:
    // `Priest.commissionRate` is `Float @default(0.80)` (schema.prisma), and
    // Prisma maps Float to a JS number. `resolvePriestShare`'s
    // `typeof commissionRate === 'number'` guard therefore passes on every real
    // request and a negotiated rate IS honoured. This fixture is faithful to
    // production, not a convenient simplification.
    //
    // An earlier revision of this comment claimed the opposite — that the column
    // was Decimal(5,4), that Prisma returned a Decimal, and that every pandit
    // silently fell back to DEFAULT_PRIEST_SHARE. That was wrong, and it was
    // later re-reported as a live payout bug. The Decimal(5,4) rate is
    // `Commission.percentage`: a different column on a different model. Should
    // `commissionRate` ever become a Decimal, this fails at compile time, not
    // silently — bookings.ts calls
    // `resolvePriestShare(newPriestUser?.commissionRate)` against a parameter
    // typed `number | null | undefined`.
    commissionRate: 0.7,
  } as never);
  // The temple path never minted one — this is the whole point.
  prismaMock.commission.findFirst.mockResolvedValue(null as never);
  prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as never);
  prismaMock.commission.create.mockResolvedValue({ id: 'cm-new' } as never);
  prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);
  prismaMock.pujaBooking.update.mockResolvedValue({
    id: BOOKING_ID,
    priestId: NEW_PRIEST_ID,
  } as never);
  prismaMock.payment.count.mockResolvedValue(1 as never); // captured
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  prismaMock.$transaction.mockImplementation(async (fn: any) =>
    typeof fn === 'function' ? fn(prismaMock) : fn,
  );
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await bookingRoutes(instance);
    },
    { prefix: '/api/v1/bookings' },
  );
  return app;
}

/** The pure reassignment: same status in, pandit attached. */
async function attachPandit() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/v1/bookings/${BOOKING_ID}`,
    headers: { authorization: 'Bearer demo-admin', 'content-type': 'application/json' },
    payload: JSON.stringify({ status: 'confirmed', priestId: NEW_PRIEST_ID }),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? ADMIN : null,
  );
  templePathBooking();
});

describe('DI-05 — attaching a pandit mints his earning when none exists', () => {
  it('creates the Commission the temple path never minted', async () => {
    const res = await attachPandit();
    expect(res.statusCode).toBe(200);
    expect(prismaMock.commission.create).toHaveBeenCalledTimes(1);
  });

  it('credits the PANDIT and stores the PLATFORM rate, per commission-math', async () => {
    await attachPandit();

    const data = (prismaMock.commission.create.mock.calls[0]![0] as { data: any }).data;
    expect(data.bookingId).toBe(BOOKING_ID);
    // providerId is a User id — every payout read joins on User, not Priest.
    expect(data.providerId).toBe(NEW_PRIEST_USER);
    // Puja price is fee-EXCLUSIVE (priestPayout + platformCommission = 1100)
    // and this pandit's share is 0.70, so he earns 770.00.
    expect(new Prisma.Decimal(data.amount).toFixed(2)).toBe('770.00');
    // percentage = PLATFORM rate against the fee-INCLUSIVE priceAmount (1100):
    // (1100 - 770) / 1100 = 0.3000.
    expect(new Prisma.Decimal(data.percentage).toFixed(4)).toBe('0.3000');
    expect(data.status).toBe('PENDING');
  });

  it('never mints against an unpaid booking', async () => {
    prismaMock.payment.count.mockResolvedValue(0 as never);

    const res = await attachPandit();

    expect(res.statusCode).toBe(200);
    // No captured payment means no withdrawable balance may appear. Minting
    // here would be the S3-08 hole moved onto the reassignment path.
    expect(prismaMock.commission.create).not.toHaveBeenCalled();
  });

  it('still MOVES an existing earning rather than minting a second one', async () => {
    prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as never);

    await attachPandit();

    expect(prismaMock.commission.updateMany).toHaveBeenCalledTimes(1);
    // Two rows on one booking is a double payable. The mint is the fallback for
    // "nothing moved", never an addition to it.
    expect(prismaMock.commission.create).not.toHaveBeenCalled();
  });
});
