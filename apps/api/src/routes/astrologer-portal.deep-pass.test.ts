import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologerPortalRoutes, __testing, istPeriodStarts, MAX_PRICE_PER_MINUTE } from './astrologer-portal.js';

/**
 * Astrologer deep pass 2026-10-29: input validation, the 100-row earnings cap,
 * the IST day boundary and the first-save race.
 */

const USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const ASTRO = { id: USER_ID, email: 'astro@demo.com', phone: null, fullName: 'Acharya', subscriptionTier: 'free', blocked: false };

async function app() {
  const a = Fastify({ logger: false });
  await a.register(astrologerPortalRoutes, { prefix: '/api/v1/astrologer-portal' });
  return a;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => (args.where.email === 'astro@demo.com' ? ASTRO : null) as never);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.pujaBooking.findMany.mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

describe('profile schema', () => {
  const { profileUpdateSchema: p } = __testing;

  it('a whitespace-only display name is rejected (it used to pass min(1) and be stored)', () => {
    expect(p.safeParse({ displayName: '    ' }).success).toBe(false);
    expect(p.safeParse({ displayName: '  Acharya  ' })).toMatchObject({ success: true, data: { displayName: 'Acharya' } });
  });

  it('blank and duplicate specialties/languages are dropped or rejected', () => {
    expect(p.safeParse({ specialties: ['Vedic', ' '] }).success).toBe(false);
    expect(p.safeParse({ specialties: ['Vedic', 'vedic ', 'Tarot'] })).toMatchObject({ success: true, data: { specialties: ['vedic', 'Tarot'] } });
    expect(p.safeParse({ languages: ['Hindi', 'Hindi'] })).toMatchObject({ success: true, data: { languages: ['Hindi'] } });
  });

  it.each([0, -5, 0.99, MAX_PRICE_PER_MINUTE + 1, 100000, Number.NaN, Number.POSITIVE_INFINITY])('rate %s is rejected', (v) => {
    expect(p.safeParse({ pricePerMinute: v }).success).toBe(false);
  });

  it('rate is rounded to the two decimals the column stores', () => {
    expect(p.safeParse({ pricePerMinute: 25.555 })).toMatchObject({ success: true, data: { pricePerMinute: 25.56 } });
    expect(p.safeParse({ pricePerMinute: 1 }).success).toBe(true);
    expect(p.safeParse({ pricePerMinute: MAX_PRICE_PER_MINUTE }).success).toBe(true);
  });

  it('60 minutes at the ceiling stays payable in one order', () => {
    expect(MAX_PRICE_PER_MINUTE * 60).toBeLessThanOrEqual(100_000);
  });

  it('experience bounds and bio length', () => {
    expect(p.safeParse({ experience: -1 }).success).toBe(false);
    expect(p.safeParse({ experience: 81 }).success).toBe(false);
    expect(p.safeParse({ experience: 12.5 }).success).toBe(false);
    expect(p.safeParse({ bio: 'x'.repeat(2001) }).success).toBe(false);
    expect(p.safeParse({ bio: 'x'.repeat(2000) }).success).toBe(true);
  });
});

describe('availability schema', () => {
  const { availabilityUpdateSchema: a } = __testing;
  const web = { Monday: { morning: true, afternoon: false, evening: false } };

  it.each([[null], [undefined], [5], ['x'], [[]], [{ hours: '9-5' }]])('rejects %j (null used to 500 the write)', (v) => {
    expect(a.safeParse({ availability: v }).success).toBe(false);
  });

  it('rejects a missing key', () => {
    expect(a.safeParse({}).success).toBe(false);
  });

  it('accepts the web grid, the mobile grid, and {} to clear', () => {
    expect(a.safeParse({ availability: web }).success).toBe(true);
    expect(a.safeParse({ availability: { weekly: [{ day: 'Mon', morning: true, afternoon: true, evening: false }] } }).success).toBe(true);
    expect(a.safeParse({ availability: {} }).success).toBe(true);
  });

  it('keeps the 64 KB cap', () => {
    expect(a.safeParse({ availability: { ...web, pad: 'x'.repeat(70_000) } }).success).toBe(false);
  });
});

describe('PATCH /profile', () => {
  const patch = async (payload: unknown) => {
    const a = await app();
    const res = await a.inject({ method: 'PATCH', url: '/api/v1/astrologer-portal/profile', headers: { authorization: 'Bearer demo-astro' }, payload: payload as never });
    await a.close();
    return res;
  };
  const existing = { id: PROFILE_ID, userId: USER_ID, displayName: 'A', approved: true, bio: 'old' };

  it('an empty bio clears the stored bio (the portal used to drop the empty value and keep the old text)', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(existing as never);
    prismaMock.astrologerProfile.update.mockResolvedValue({ ...existing, bio: null } as never);
    const res = await patch({ bio: '   ' });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.astrologerProfile.update.mock.calls[0]![0].data).toMatchObject({ bio: null });
  });

  it('leaves the bio alone when the field is not sent', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(existing as never);
    prismaMock.astrologerProfile.update.mockResolvedValue(existing as never);
    await patch({ experience: 3 });
    expect(prismaMock.astrologerProfile.update.mock.calls[0]![0].data).not.toHaveProperty('bio');
  });

  it('a double-clicked first save: the loser of the create race applies its values as an update instead of a 500', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValueOnce(null as never).mockResolvedValue(existing as never);
    prismaMock.astrologerProfile.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
    );
    prismaMock.astrologerProfile.update.mockResolvedValue(existing as never);
    const res = await patch({ displayName: 'Acharya' });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.astrologerProfile.update).toHaveBeenCalledTimes(1);
  });

  it('any other create failure still surfaces', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(null as never);
    prismaMock.astrologerProfile.create.mockRejectedValue(new Error('db down'));
    const res = await patch({ displayName: 'Acharya' });
    expect(res.statusCode).toBeGreaterThanOrEqual(500);
  });

  it('whitespace display name on first save is "display_name_required"-or-invalid, never stored', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(null as never);
    const res = await patch({ displayName: '   ' });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.astrologerProfile.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /availability', () => {
  it('null is a 400, not a 500 from Prisma', async () => {
    const a = await app();
    const res = await a.inject({ method: 'PATCH', url: '/api/v1/astrologer-portal/availability', headers: { authorization: 'Bearer demo-astro' }, payload: { availability: null } });
    await a.close();
    expect(res.statusCode).toBe(400);
    expect(prismaMock.astrologerProfile.update).not.toHaveBeenCalled();
  });
});

describe('earnings ledger — totals cover every row, the list shows the newest 100', () => {
  const row = (i: number, status = 'PAID') => ({
    id: `c-${i}`, bookingId: `b-${i}`, providerId: USER_ID, amount: 100, percentage: 0.2, status,
    payoutRequestId: null, createdAt: new Date(Date.now() - i * 3_600_000),
  });

  it('150 paid commissions of Rs 100 total Rs 15,000, not the Rs 10,000 of the newest 100', async () => {
    prismaMock.commission.findMany.mockResolvedValue(Array.from({ length: 150 }, (_, i) => row(i)) as never);
    const a = await app();
    const res = await a.inject({ method: 'GET', url: '/api/v1/astrologer-portal/earnings', headers: { authorization: 'Bearer demo-astro' } });
    await a.close();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary.totalEarningsInr).toBe(15000);
    expect(body.summary.paidInr).toBe(15000);
    expect(body.data).toHaveLength(100);
    // newest first
    expect(body.data[0].id).toBe('c-0');
  });

  it('reads up to the cap, not 100', async () => {
    prismaMock.commission.findMany.mockResolvedValue([] as never);
    const a = await app();
    await a.inject({ method: 'GET', url: '/api/v1/astrologer-portal/earnings', headers: { authorization: 'Bearer demo-astro' } });
    await a.close();
    expect(prismaMock.commission.findMany.mock.calls[0]![0]).toMatchObject({ take: 5000 });
  });

  it('a REVERSED (refunded) row is listed as reversed and excluded from every total', async () => {
    prismaMock.commission.findMany.mockResolvedValue([row(0, 'REVERSED'), row(1, 'PAID')] as never);
    const a = await app();
    const res = await a.inject({ method: 'GET', url: '/api/v1/astrologer-portal/earnings', headers: { authorization: 'Bearer demo-astro' } });
    await a.close();
    const body = res.json();
    expect(body.summary.totalEarningsInr).toBe(100);
    expect(body.data.find((r: { id: string }) => r.id === 'c-0').releaseStatus).toBe('reversed');
  });
});

describe('IST day and month boundaries', () => {
  it('02:00 IST on 2 Nov (20:30Z on 1 Nov) is already "today = 2 Nov" and "month = November"', () => {
    const { dayStart, monthStart } = istPeriodStarts(new Date('2026-11-01T20:30:00Z'));
    expect(dayStart.toISOString()).toBe('2026-11-01T18:30:00.000Z');
    expect(monthStart.toISOString()).toBe('2026-10-31T18:30:00.000Z');
  });

  it('mid-afternoon IST is unaffected', () => {
    const { dayStart, monthStart } = istPeriodStarts(new Date('2026-11-15T09:00:00Z'));
    expect(dayStart.toISOString()).toBe('2026-11-14T18:30:00.000Z');
    expect(monthStart.toISOString()).toBe('2026-10-31T18:30:00.000Z');
  });

  it("the dashboard's 'today' SQL counts in IST and keeps completed sessions", async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({ id: PROFILE_ID, userId: USER_ID, approved: true, pricePerMinute: 25, rating: 0, totalConsultations: 0 } as never);
    prismaMock.commission.findMany.mockResolvedValue([] as never);
    const a = await app();
    await a.inject({ method: 'GET', url: '/api/v1/astrologer-portal/dashboard', headers: { authorization: 'Bearer demo-astro' } });
    await a.close();
    const sql = prismaMock.$queryRawUnsafe.mock.calls.map((c) => String(c[0])).find((s) => /Asia\/Kolkata/.test(s))!;
    expect(sql).toMatch(/status IN \('confirmed', 'completed'\)/);
    expect(sql).not.toMatch(/CURRENT_DATE/);
  });
});
