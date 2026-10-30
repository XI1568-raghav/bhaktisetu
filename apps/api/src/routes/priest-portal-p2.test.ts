import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// Same isolation as priest-fulfilment.test.ts: the priest routes only delegate
// to BookingService for the status transitions, so stubbing it keeps this file
// on the pandit-portal surface and independent of in-flight booking.service edits.
const { uploadVideoProofMock, updateBookingStatusMock } = vi.hoisted(() => ({
  uploadVideoProofMock: vi.fn(),
  updateBookingStatusMock: vi.fn(),
}));
vi.mock('../services/booking.service.js', () => ({
  BookingService: vi.fn().mockImplementation(() => ({
    uploadVideoProof: uploadVideoProofMock,
    updateBookingStatus: updateBookingStatusMock,
  })),
  activeSlotHoldWhere: () => ({}),
}));
vi.mock('../services/booking-notify.service.js', () => ({
  notifyDevotee: vi.fn(async () => undefined),
  buildBookingCtx: vi.fn(() => ({})),
  notifyPandit: vi.fn(async () => undefined),
}));
vi.mock('./notifications.js', () => ({ notifyUser: vi.fn(async () => undefined) }));

import Fastify from 'fastify';
import { priestRoutes, __knownUnifiedClear } from './priest.js';

const PANDIT_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'pandit@demo.com',
  phone: null,
  fullName: 'Demo Pandit',
  subscriptionTier: 'free',
  blocked: false,
};
const PRIEST_ID = '6a56eba6-e340-40bc-b236-97440ada4001';

async function call(method: 'GET' | 'PATCH', url: string) {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await priestRoutes(instance);
  }, { prefix: '/api/v1/priest' });
  const res = await app.inject({
    method,
    url: `/api/v1/priest${url}`,
    headers: { authorization: 'Bearer demo-pandit' },
  });
  await app.close();
  return res;
}

// Amounts mirror the live pandit@demo.com row read out of Postgres on
// 2026-08-13: three PriestPayout rows, all `pending`, summing Rs 2,310, and
// nothing ever marked `completed`.
const COMPLETED_SUM = 0;
const PENDING_SUM = 2310;
const EVERY_STATUS_SUM = 2310;

/** Aggregate stub that answers by the status filter it was handed. */
function aggregateByStatus() {
  return async (args: { where?: { status?: unknown } }) => {
    const status = args?.where?.status;
    if (status === 'completed') return { _sum: { amount: COMPLETED_SUM } };
    if (status && typeof status === 'object') return { _sum: { amount: PENDING_SUM } };
    return { _sum: { amount: EVERY_STATUS_SUM } };
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  __knownUnifiedClear();
  process.env.NODE_ENV = 'test'; // enables the demo-token bypass in auth middleware
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'pandit@demo.com' ? PANDIT_USER : null,
  );
  prismaMock.priest.findUnique.mockResolvedValue({
    id: PRIEST_ID,
    userId: PANDIT_USER.id,
    status: 'active',
    displayName: 'Demo Pandit',
    avatarUrl: null,
    ratingAvg: 4.6,
    ratingCount: 43,
    isOnDuty: true,
    lastSeenAt: new Date('2026-08-13T04:00:00.000Z'),
  } as never);
  prismaMock.priestPayout.findMany.mockResolvedValue([] as never);
  prismaMock.priestPayout.count.mockResolvedValue(3 as never);
  prismaMock.priestPayout.aggregate.mockImplementation(aggregateByStatus() as never);
  prismaMock.priestPayout.findFirst.mockResolvedValue(null as never);
  prismaMock.pujaBooking.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.findMany.mockResolvedValue([] as never);
  prismaMock.pujaBooking.aggregate.mockResolvedValue({ _sum: {} } as never);
  // No unified-rail earnings: the presence groupBy answers "none".
  prismaMock.commission.groupBy.mockResolvedValue([] as never);
  prismaMock.commission.aggregate.mockResolvedValue({ _sum: { amount: null } } as never);
});

// ─── PF-12 ───────────────────────────────────────────────────────────────────
// /priest/payouts read "Total Earned Rs 2,310" while /priest read Rs 0 for the
// same account: the payouts summary aggregated every PriestPayout regardless of
// status, the dashboard aggregated only `completed` ones.

describe('PF-12 — "Total Earned" means money actually paid, on both screens', () => {
  it('sums only completed payouts, not pending ones', async () => {
    const res = await call('GET', '/payouts');
    expect(res.statusCode).toBe(200);
    // Before the fix this was 2310 — three PENDING rows presented as earned.
    expect(res.json().summary.totalEarned).toBe(COMPLETED_SUM);
  });

  it('still reports the pending money separately', async () => {
    const res = await call('GET', '/payouts');
    expect(res.json().summary.pending).toBe(PENDING_SUM);
  });

  it('agrees with the dashboard earnings card for the same account', async () => {
    const payouts = (await call('GET', '/payouts')).json();
    const dashboard = (await call('GET', '/dashboard')).json();
    expect(payouts.summary.totalEarned).toBe(dashboard.earnings.total);
    expect(payouts.summary.pending).toBe(dashboard.earnings.pending);
  });

  it('asks Prisma for the completed-only aggregate', async () => {
    await call('GET', '/payouts');
    const wheres = prismaMock.priestPayout.aggregate.mock.calls.map(
      (c: unknown[]) => (c[0] as { where: Record<string, unknown> }).where,
    );
    expect(wheres).toContainEqual({ priestId: PRIEST_ID, status: 'completed' });
    // No unfiltered lifetime aggregate is left behind masquerading as earnings.
    expect(wheres).not.toContainEqual({ priestId: PRIEST_ID });
  });
});

// ─── PF-13 ───────────────────────────────────────────────────────────────────
// GET /priest/payouts?status=zzz reached Prisma and came back as a 400 whose
// body carried the server's absolute path, source file, line number and
// surrounding source lines. The bookings route was gated with an enum; the
// payouts route was left on `status as PayoutStatus`.

describe('PF-13 — /priest/payouts rejects an unknown ?status at the Zod layer', () => {
  it('400s an invalid status instead of handing it to Prisma', async () => {
    const res = await call('GET', '/payouts?status=zzz');
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid query');
    expect(prismaMock.priestPayout.findMany).not.toHaveBeenCalled();
  });

  it('never echoes a filesystem path or source text in the error body', async () => {
    const res = await call('GET', '/payouts?status=zzz');
    expect(res.body).not.toMatch(/priest\.service\.ts/);
    expect(res.body).not.toMatch(/NewClaude/);
  });

  it('accepts a real payout status and forwards it to the where clause', async () => {
    const res = await call('GET', '/payouts?status=completed');
    expect(res.statusCode).toBe(200);
    const where = (prismaMock.priestPayout.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    }).where;
    expect(where).toEqual({ priestId: PRIEST_ID, status: 'completed' });
  });

  it('clamps limit so a client cannot scrape the whole payout table', async () => {
    const res = await call('GET', '/payouts?limit=100000');
    expect(res.statusCode).toBe(400);
    expect(prismaMock.priestPayout.findMany).not.toHaveBeenCalled();
  });

  it('honours a valid page/limit pair', async () => {
    await call('GET', '/payouts?page=3&limit=10');
    const args = prismaMock.priestPayout.findMany.mock.calls[0]![0] as {
      skip: number;
      take: number;
    };
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
  });
});

// ─── PF-14 ───────────────────────────────────────────────────────────────────
// The dashboard payload carried no isOnDuty, so the toggle initialised to false
// on every load. A pandit who was IN the instant-dispatch pool was shown "Go on
// duty", and turning himself OFF took two clicks — the first of which re-armed
// him for 1-minute-SLA offers.

describe('PF-14 — GET /priest/dashboard reports the saved on-duty state', () => {
  it('returns isOnDuty from the Priest row', async () => {
    const res = await call('GET', '/dashboard');
    expect(res.statusCode).toBe(200);
    // Before the fix the key was absent entirely.
    expect(res.json().priest.isOnDuty).toBe(true);
  });

  it('returns the heartbeat timestamp alongside it', async () => {
    const res = await call('GET', '/dashboard');
    expect(res.json().priest.lastSeenAt).toBeTruthy();
  });

  it('reports off-duty as false, not as a missing key', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({
      id: PRIEST_ID,
      userId: PANDIT_USER.id,
      status: 'active',
      displayName: 'Demo Pandit',
      avatarUrl: null,
      ratingAvg: 0,
      ratingCount: 0,
      isOnDuty: false,
      lastSeenAt: null,
    } as never);
    const res = await call('GET', '/dashboard');
    expect(res.json().priest).toHaveProperty('isOnDuty');
    expect(res.json().priest.isOnDuty).toBe(false);
  });

  it('selects the column rather than over-fetching the whole Priest row', async () => {
    await call('GET', '/dashboard');
    const selects = prismaMock.priest.findUnique.mock.calls
      .map((c: unknown[]) => (c[0] as { select?: Record<string, unknown> }).select)
      .filter(Boolean) as Record<string, unknown>[];
    expect(selects.some((s) => s.isOnDuty === true)).toBe(true);
  });
});
