import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { consultationRoutes, __resetConsultationTablesMemo } from './consultation.js';

/**
 * Astrologer deep pass 2026-10-29. Each block is a defect found on prod or in
 * the source that the empty-data UI walk-through could not reveal.
 */

const PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const ASTRO_USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const DEVOTEE_ID = '2b5bd615-1633-4c95-9b09-03efb2b9e429';
const CID = '5523ab80-6591-43f0-9205-59ac341035b0';

const USERS: Record<string, unknown> = {
  'devotee@demo.com': { id: DEVOTEE_ID, email: 'devotee@demo.com', phone: null, fullName: 'Demo Devotee', subscriptionTier: 'free', blocked: false },
  'astro@demo.com': { id: ASTRO_USER_ID, email: 'astro@demo.com', phone: null, fullName: 'Acharya', subscriptionTier: 'free', blocked: false },
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  return app;
}

/** The next `weekday` (0 = Sunday, IST) at least 3 days out, at `istHour`:00 IST, as an ISO instant. */
function nextIst(weekday: number, istHour: number): string {
  const d = new Date(Date.now() + 3 * 86_400_000);
  while (new Date(d.getTime() + 330 * 60_000).getUTCDay() !== weekday) d.setTime(d.getTime() + 86_400_000);
  const ist = new Date(d.getTime() + 330 * 60_000);
  const midnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 330 * 60_000;
  return new Date(midnight + istHour * 3_600_000).toISOString();
}
const SUNDAY_11_IST = () => nextIst(0, 11);
const nextMondayAt = (istHour: number) => nextIst(1, istHour);

const WEEK_SUNDAY_OFF_MONDAY_MORNING_ONLY = {
  Monday: { morning: true, afternoon: false, evening: false },
  Tuesday: { morning: true, afternoon: true, evening: true },
  Wednesday: { morning: true, afternoon: true, evening: true },
  Thursday: { morning: true, afternoon: true, evening: true },
  Friday: { morning: true, afternoon: true, evening: true },
  Saturday: { morning: true, afternoon: true, evening: true },
  Sunday: { morning: false, afternoon: false, evening: false },
};

function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: PROFILE_ID,
    userId: ASTRO_USER_ID,
    displayName: 'Acharya Vinod Sharma',
    pricePerMinute: 25,
    approved: true,
    availability: null,
    ...overrides,
  };
}

function insertedRows() {
  return prismaMock.$queryRawUnsafe.mock.calls.filter((c: unknown[]) => String(c[0]).includes('INSERT INTO astrologer_consultations'));
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetConsultationTablesMemo();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => (USERS[args.where.email ?? ''] ?? null) as never);
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
    String(sql).includes('INSERT INTO astrologer_consultations')
      ? [{ id: CID, reference: 'AC-1', astrologer_name: 'Acharya Vinod Sharma', minutes: 15 }]
      : [],
  );
});
afterEach(() => vi.restoreAllMocks());

async function book(token: string, payload: Record<string, unknown>) {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/consultation/book',
    headers: { authorization: `Bearer ${token}` },
    payload: { astrologerId: PROFILE_ID, minutes: 15, ...payload },
  });
  await app.close();
  return res;
}

describe('POST /book — an astrologer cannot book themselves', () => {
  it('409 SELF_BOOKING and no row, no gateway order', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile() as never);
    const res = await book('demo-astro', {});
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('SELF_BOOKING');
    expect(insertedRows()).toHaveLength(0);
  });

  it('a different devotee still books', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile() as never);
    const res = await book('demo-devotee', {});
    expect(res.statusCode).toBe(201);
    expect(insertedRows()).toHaveLength(1);
  });
});

describe('POST /book — the saved weekly availability is enforced for a requested slot', () => {
  it('refuses a Sunday slot when Sunday is off (the portal promises exactly this)', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile({ availability: WEEK_SUNDAY_OFF_MONDAY_MORNING_ONLY }) as never);
    const res = await book('demo-devotee', { scheduledAt: SUNDAY_11_IST() });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('OUTSIDE_AVAILABILITY');
    expect(res.json().error).toMatch(/IST/);
    expect(insertedRows()).toHaveLength(0);
  });

  it('allows a slot fully inside an open window', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile({ availability: WEEK_SUNDAY_OFF_MONDAY_MORNING_ONLY }) as never);
    const res = await book('demo-devotee', { scheduledAt: nextMondayAt(9), minutes: 30 });
    expect(res.statusCode).toBe(201);
  });

  it('refuses a session that starts in an open window but runs into a closed one', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile({ availability: WEEK_SUNDAY_OFF_MONDAY_MORNING_ONLY }) as never);
    // Monday morning ends 12:00 IST (afternoon is off): 11:50 + 30 min crosses it.
    const startsAt1150 = new Date(new Date(nextMondayAt(11)).getTime() + 50 * 60_000).toISOString();
    const res = await book('demo-devotee', { scheduledAt: startsAt1150, minutes: 30 });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('OUTSIDE_AVAILABILITY');
  });

  it('does not restrict an instant booking (no scheduledAt)', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile({ availability: WEEK_SUNDAY_OFF_MONDAY_MORNING_ONLY }) as never);
    expect((await book('demo-devotee', {})).statusCode).toBe(201);
  });

  it('does not restrict an astrologer with no schedule on file, or an unreadable one', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile({ availability: null }) as never);
    expect((await book('demo-devotee', { scheduledAt: SUNDAY_11_IST() })).statusCode).toBe(201);
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile({ availability: { hours: '9-5' } }) as never);
    expect((await book('demo-devotee', { scheduledAt: SUNDAY_11_IST() })).statusCode).toBe(201);
  });

  it('a 2099 slot is refused by the 60-day horizon', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile() as never);
    const res = await book('demo-devotee', { scheduledAt: '2099-01-05T05:30:00.000Z' });
    expect(res.statusCode).toBe(400);
    expect(insertedRows()).toHaveLength(0);
  });
});

describe('POST /book is idempotent for an open, identical order', () => {
  const open = { id: CID, reference: 'AC-OPEN', astrologer_name: 'Acharya Vinod Sharma', minutes: 15, razorpay_order_id: 'order_demo_existing' };

  it('re-uses the pending order instead of opening a second one (Pay pressed twice / modal dismissed)', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile() as never);
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      /status = 'pending_payment' AND razorpay_order_id IS NOT NULL/.test(String(sql)) ? [open] : [],
    );
    const res = await book('demo-devotee', {});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ consultationId: CID, razorpayOrderId: 'order_demo_existing', reused: true, amountInr: 375 });
    expect(insertedRows()).toHaveLength(0);
  });

  it('keys the probe on devotee, astrologer, minutes, price and slot, within 15 minutes', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile() as never);
    await book('demo-devotee', { minutes: 10 });
    const probe = prismaMock.$queryRawUnsafe.mock.calls.find((c) => /razorpay_order_id IS NOT NULL/.test(String(c[0])))!;
    expect(String(probe[0])).toMatch(/interval '15 minutes'/);
    expect(String(probe[0])).toMatch(/scheduled_at IS NOT DISTINCT FROM/);
    expect(probe.slice(1)).toEqual([DEVOTEE_ID, PROFILE_ID, 10, 250, null]);
  });

  it('a new price (the astrologer changed their rate) is a new order: amount is part of the key', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile({ pricePerMinute: 40 }) as never);
    const res = await book('demo-devotee', {});
    expect(res.statusCode).toBe(201);
    expect(res.json().amountInr).toBe(600);
  });
});

describe('PATCH /:id/cancel and /:id/complete are compare-and-set', () => {
  const confirmed = (over: Record<string, unknown> = {}) => ({
    id: CID,
    reference: 'AC-1',
    user_id: DEVOTEE_ID,
    astrologer_id: PROFILE_ID,
    astrologer_name: 'Acharya',
    minutes: 20,
    amount_inr: '500.00',
    currency: 'INR',
    status: 'confirmed',
    room_name: 'r',
    scheduled_at: null,
    created_at: new Date(),
    paid_at: new Date(),
    ...over,
  });

  it('cancel: when the row changed under it (0 rows flipped) it answers 409 and reverses nothing', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([confirmed()] as never);
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/v1/consultation/${CID}/cancel`, headers: { authorization: 'Bearer demo-devotee' } });
    await app.close();
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('CONSULTATION_STATE_CHANGED');
    expect(prismaMock.commission.updateMany).not.toHaveBeenCalled();
    // The flip names the status it expected.
    const flip = prismaMock.$executeRawUnsafe.mock.calls.find(([sql]) => /SET status = 'cancelled'/.test(String(sql)));
    expect(String(flip?.[0])).toMatch(/AND status = \$2/);
    expect(flip?.[2]).toBe('confirmed');
  });

  it('complete: SQL only completes a row that is still confirmed', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([confirmed({ astrologer_id: ASTRO_USER_ID })] as never);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
    const app = await buildApp();
    const res = await app.inject({ method: 'PATCH', url: `/api/v1/consultation/${CID}/complete`, headers: { authorization: 'Bearer demo-astro' } });
    await app.close();
    expect(res.statusCode).toBe(200);
    const upd = prismaMock.$executeRawUnsafe.mock.calls.find(([sql]) => /SET status = 'completed'/.test(String(sql)));
    expect(String(upd?.[0])).toMatch(/AND status = 'confirmed'/);
  });

  it('complete: a double click (0 rows, now completed) answers like the first, not 409', async () => {
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      /SELECT status FROM/.test(String(sql)) ? [{ status: 'completed' }] : [confirmed({ astrologer_id: ASTRO_USER_ID })],
    );
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);
    const app = await buildApp();
    const res = await app.inject({ method: 'PATCH', url: `/api/v1/consultation/${CID}/complete`, headers: { authorization: 'Bearer demo-astro' } });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json().alreadyCompleted).toBe(true);
  });

  it('complete: does not overwrite a cancel that landed first (0 rows, now cancelled -> 409)', async () => {
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      /SELECT status FROM/.test(String(sql)) ? [{ status: 'cancelled' }] : [confirmed({ astrologer_id: ASTRO_USER_ID })],
    );
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);
    const app = await buildApp();
    const res = await app.inject({ method: 'PATCH', url: `/api/v1/consultation/${CID}/complete`, headers: { authorization: 'Bearer demo-astro' } });
    await app.close();
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/cancelled/);
  });
});

describe('GET /astrologer/mine', () => {
  async function list(query = '') {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({ id: PROFILE_ID } as never);
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      /COUNT\(\*\)/.test(String(sql))
        ? [{ total: 1 }]
        : [{ id: CID, reference: 'AC-1', user_id: DEVOTEE_ID, astrologer_id: PROFILE_ID, astrologer_name: 'A', minutes: 5, amount_inr: '125', currency: 'INR', status: 'confirmed', room_name: 'r', scheduled_at: null, created_at: new Date(), paid_at: new Date() }],
    );
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/consultation/astrologer/mine${query}`, headers: { authorization: 'Bearer demo-astro' } });
    await app.close();
    return res;
  }

  it('never hands the astrologer the devotee account id', async () => {
    const res = await list();
    expect(res.statusCode).toBe(200);
    expect(res.json().consultations[0]).not.toHaveProperty('userId');
    expect(JSON.stringify(res.json())).not.toContain(DEVOTEE_ID);
  });

  it('by default lists only paid sessions (no abandoned pending_payment rows)', async () => {
    await list();
    const sql = String(prismaMock.$queryRawUnsafe.mock.calls.find((c) => /SELECT \* FROM astrologer_consultations/.test(String(c[0])))?.[0]);
    expect(sql).toMatch(/status IN \('confirmed', 'completed'\)/);
    expect(sql).toMatch(/status = 'cancelled' AND paid_at IS NOT NULL/);
  });

  it('an explicit ?status= is honoured as asked', async () => {
    await list('?status=pending_payment');
    const sql = String(prismaMock.$queryRawUnsafe.mock.calls.find((c) => /SELECT \* FROM astrologer_consultations/.test(String(c[0])))?.[0]);
    expect(sql).not.toMatch(/paid_at IS NOT NULL/);
    expect(sql).toMatch(/AND status = \$2/);
  });
});

describe('ensureConsultationTables runs its DDL once per process, not once per request', () => {
  it('two GET /mine calls issue the five DDL statements a single time', async () => {
    const app = await buildApp();
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/v1/consultation/mine', headers: { authorization: 'Bearer demo-devotee' } });
      expect(res.statusCode).toBe(200);
    }
    await app.close();
    const ddl = prismaMock.$executeRawUnsafe.mock.calls.filter(([sql]) => /CREATE TABLE|CREATE INDEX|ALTER TABLE/.test(String(sql)));
    expect(ddl).toHaveLength(5);
  });

  it('a failed DDL is not cached: the next request retries', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValueOnce(new Error('db down'));
    const app = await buildApp();
    const first = await app.inject({ method: 'GET', url: '/api/v1/consultation/mine', headers: { authorization: 'Bearer demo-devotee' } });
    expect(first.statusCode).toBeGreaterThanOrEqual(500);
    const second = await app.inject({ method: 'GET', url: '/api/v1/consultation/mine', headers: { authorization: 'Bearer demo-devotee' } });
    expect(second.statusCode).toBe(200);
    await app.close();
  });
});

describe('POST /book — gateway failure', () => {
  it('says nothing was charged and carries a machine code (was a bare "Payment gateway unavailable")', async () => {
    // Force the non-demo branch with a rejecting SDK.
    vi.resetModules();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_realish';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
    vi.doMock('razorpay', () => ({
      default: class {
        api = { rq: { defaults: {} } };
        orders = { create: async () => { throw { statusCode: 401, error: { code: 'BAD_REQUEST_ERROR', description: 'Authentication failed' } }; } };
      },
    }));
    vi.doMock('../lib/prisma.js', () => ({ prisma: prismaMock }));
    const { consultationRoutes: routes } = await import('./consultation.js');
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(profile() as never);
    const app = Fastify({ logger: false });
    await app.register(routes, { prefix: '/api/v1/consultation' });
    const res = await app.inject({
      method: 'POST', url: '/api/v1/consultation/book', headers: { authorization: 'Bearer demo-devotee' },
      payload: { astrologerId: PROFILE_ID, minutes: 15 },
    });
    await app.close();
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    vi.doUnmock('razorpay');
    expect(res.statusCode).toBe(502);
    expect(res.json().code).toBe('PAYMENT_GATEWAY_UNAVAILABLE');
    expect(res.json().error).toMatch(/Nothing has been charged/);
    expect(JSON.stringify(res.json())).not.toContain('Authentication failed');
  });
});
