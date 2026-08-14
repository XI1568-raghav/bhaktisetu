import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

// The shared mock has no `donation` model; the investor feed aggregates one.
// Added here rather than in the shared mock so no other suite is affected.
const donation = { aggregate: vi.fn() };
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
Object.assign(prismaMock as Record<string, unknown>, { donation });

// The route reads CRON_AUTH_TOKEN at module load. ESM imports are hoisted, so
// the assignment has to be hoisted with them.
const TOKEN = vi.hoisted(() => {
  process.env.CRON_AUTH_TOKEN = 'scal04-test-token';
  return 'scal04-test-token';
});

import Fastify from 'fastify';
import { adminMetricsRoutes } from './admin-metrics.js';

/**
 * SCAL-04 — /admin/metrics/investor must count paying and active users in
 * Postgres.
 *
 * `paidUsers` was `payment.findMany({ select: { userId }, distinct: ['userId'] })`
 * read only for `.length` — 16,016 kB at 200k rows (EXPLAIN ANALYZE SERIALIZE) —
 * and the id array was then sent BACK to Postgres as an `IN (...)` list to get
 * the NRI count. `activeUsers` did the same twice more and de-duplicated in a JS
 * Set. This is the investor-digest cron's endpoint, so it runs unattended.
 */

async function callInvestor() {
  const app = Fastify();
  await app.register(adminMetricsRoutes);
  const res = await app.inject({
    method: 'GET',
    url: `/investor?token=${TOKEN}`,
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
  prismaMock.pujaBooking.aggregate.mockResolvedValue({
    _count: { _all: 0 },
    _sum: { priceAmount: 0, platformCommission: 0 },
  });
  donation.aggregate.mockResolvedValue({
    _count: { _all: 0 },
    _sum: { amountInr: 0 },
  });
  // Any row-streaming read from these two tables is the defect.
  prismaMock.payment.findMany.mockImplementation(async () => {
    throw new Error('investor feed must not stream payment rows — SCAL-04');
  });
  prismaMock.pujaBooking.findMany.mockImplementation(async () => {
    throw new Error('investor feed must not stream booking rows — SCAL-04');
  });
});

describe('SCAL-04 — investor feed audience counts', () => {
  it('counts paying, NRI and active users with COUNT queries only', async () => {
    // user.count answers, in call order: paying, NRI-paying, signups-7d, active.
    prismaMock.user.count
      .mockResolvedValueOnce(400) // paying users
      .mockResolvedValueOnce(100) // paying users who are NRI
      .mockResolvedValueOnce(37) // signups this week
      .mockResolvedValueOnce(512); // active in 30d

    const res = await callInvestor();

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.paidUsers).toBe(400);
    expect(body.nriMixPct).toBe(0.25);
    expect(body.signupsThisWeek).toBe(37);
    expect(body.activeUsers).toBe(512);

    expect(prismaMock.payment.findMany).not.toHaveBeenCalled();
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();

    // The NRI count filters on the relation, not on a materialised id list.
    const nriCall = prismaMock.user.count.mock.calls[1]![0]!;
    expect(nriCall.where).toEqual({
      isNri: true,
      payments: { some: { status: 'captured' } },
    });
    expect(JSON.stringify(nriCall.where)).not.toContain('"in"');

    // Active = a payment OR a booking in the window, counted once by the DB.
    const activeCall = prismaMock.user.count.mock.calls[3]![0]!;
    expect(activeCall.where.OR).toHaveLength(2);
    expect(activeCall.where.OR[0]).toHaveProperty('payments.some.createdAt');
    expect(activeCall.where.OR[1]).toHaveProperty('bookings.some.createdAt');
  });

  it('reports no NRI mix rather than dividing by zero when nobody has paid', async () => {
    prismaMock.user.count.mockResolvedValue(0);

    const res = await callInvestor();

    const body = res.json();
    expect(body.paidUsers).toBe(0);
    expect(body.nriMixPct).toBeNull();
  });
});
