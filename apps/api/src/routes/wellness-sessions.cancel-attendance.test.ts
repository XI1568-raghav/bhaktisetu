import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('./notifications.js', async (importOriginal) => ({ ...((await importOriginal()) as object), notifyUser: vi.fn().mockResolvedValue(1) }));

import Fastify from 'fastify';
import { wellnessSessionRoutes } from './wellness-sessions.js';

// QA 2026-10-13 (slice G): devotee cancel, instructor attendance, session cancel refunds.

const INSTRUCTOR = { id: 'user-demo-wellness-1', email: 'wellness@demo.com', phone: null, fullName: 'I', subscriptionTier: 'free', blocked: false };
const DEVOTEE = { id: 'user-demo-devotee-1', email: 'devotee@demo.com', phone: null, fullName: 'D', subscriptionTier: 'free', blocked: false };
const ENR = 'e1111111-1111-4111-8111-111111111111';
const SES = '11111111-1111-4111-8111-111111111111';
const future = (h: number) => new Date(Date.now() + h * 3_600_000);

const enr = (over: Record<string, unknown> = {}, ses: Record<string, unknown> = {}) => ({
  id: ENR, userId: DEVOTEE.id, status: 'PAID', razorpayOrderId: 'order_1', attendedAt: null,
  session: { id: SES, title: 'Yoga', scheduledAt: future(72), priceInr: '100', status: 'SCHEDULED', instructorId: INSTRUCTOR.id, ...ses },
  user: { fullName: 'D', email: null },
  ...over,
});

async function call(method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: unknown) {
  const app = Fastify({ logger: false });
  await app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  const res = await app.inject({ method, url: `/api/v1/wellness${url}`, headers: { authorization: `Bearer ${token}` }, ...(payload === undefined ? {} : { payload: payload as never }) });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: any) =>
    a.where.email === 'wellness@demo.com' ? INSTRUCTOR : a.where.email === 'devotee@demo.com' ? DEVOTEE : null,
  );
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr() as any);
  prismaMock.wellnessEnrollment.updateMany.mockResolvedValue({ count: 1 } as any);
  prismaMock.commission.findMany.mockResolvedValue([{ id: 'c1', amount: '80', status: 'PENDING', payoutRequestId: null }] as any);
  prismaMock.commission.update.mockResolvedValue({} as any);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
});

describe('POST /enrollments/:id/cancel', () => {
  it('lets the owner cancel a paid enrolment: refund owed, status CANCELLED', async () => {
    const res = await call('POST', `/enrollments/${ENR}/cancel`, 'demo-devotee', { reason: 'busy' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ cancelled: true, alreadyCancelled: false, status: 'CANCELLED', refundOwedInr: 100, commissionReversed: 1 });
  });

  it('is idempotent on a second call', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr({ status: 'CANCELLED' }) as any);
    const res = await call('POST', `/enrollments/${ENR}/cancel`, 'demo-devotee');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ cancelled: true, alreadyCancelled: true, refundOwedInr: 0 });
  });

  it('answers 409 inside the 24h window for a paid enrolment', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr({}, { scheduledAt: future(5) }) as any);
    const res = await call('POST', `/enrollments/${ENR}/cancel`, 'demo-devotee');
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('cancellation_window_closed');
  });

  it("403s someone else's enrolment, 404s an unknown one, 400s a malformed id, 401s anonymous", async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({ ...enr(), userId: 'other' } as any);
    expect((await call('POST', `/enrollments/${ENR}/cancel`, 'demo-devotee')).statusCode).toBe(403);
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(null);
    expect((await call('POST', `/enrollments/${ENR}/cancel`, 'demo-devotee')).statusCode).toBe(404);
    expect((await call('POST', '/enrollments/xyz/cancel', 'demo-devotee')).statusCode).toBe(400);
    const app = Fastify({ logger: false });
    await app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
    const anon = await app.inject({ method: 'POST', url: `/api/v1/wellness/enrollments/${ENR}/cancel` });
    await app.close();
    expect(anon.statusCode).toBe(401);
  });

  it('rejects an oversized reason', async () => {
    const res = await call('POST', `/enrollments/${ENR}/cancel`, 'demo-devotee', { reason: 'x'.repeat(500) });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /enrollments/:id/attendance', () => {
  const started = { scheduledAt: new Date(Date.now() - 3_600_000) };

  it('marks a PAID learner ATTENDED once the class has started and reports earnings released', async () => {
    prismaMock.wellnessEnrollment.findUnique
      .mockResolvedValueOnce(enr({}, started) as any)
      .mockResolvedValueOnce({ id: ENR, status: 'ATTENDED', attendedAt: new Date() } as any);
    const res = await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: { status: 'ATTENDED' }, earningsReleased: true });
    const upd = prismaMock.wellnessEnrollment.updateMany.mock.calls[0]![0] as any;
    expect(upd.where).toEqual({ id: ENR, status: 'PAID' });
    expect(upd.data.status).toBe('ATTENDED');
    expect(upd.data.attendedAt).toBeInstanceOf(Date);
    // attendance never touches money
    expect(prismaMock.commission.update).not.toHaveBeenCalled();
  });

  it('refuses before the class starts (earnings must not be released early)', async () => {
    const res = await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness');
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('session_not_started');
    expect(prismaMock.wellnessEnrollment.updateMany).not.toHaveBeenCalled();
  });

  it('a LIVE session accepts attendance before the clock time, but earnings are not yet released', async () => {
    prismaMock.wellnessEnrollment.findUnique
      .mockResolvedValueOnce(enr({}, { status: 'LIVE' }) as any)
      .mockResolvedValueOnce({ id: ENR, status: 'ATTENDED', attendedAt: new Date() } as any);
    const res = await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness');
    expect(res.statusCode).toBe(200);
    expect(res.json().earningsReleased).toBe(false);
  });

  it('is idempotent for an ATTENDED learner', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr({ status: 'ATTENDED', attendedAt: new Date() }, started) as any);
    const res = await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness');
    expect(res.statusCode).toBe(200);
    expect(res.json().alreadyMarked).toBe(true);
    expect(prismaMock.wellnessEnrollment.updateMany).not.toHaveBeenCalled();
  });

  it.each(['PENDING_PAYMENT', 'CANCELLED', 'REFUNDED'])('refuses a %s enrolment', async (status) => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr({ status }, started) as any);
    const res = await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness');
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('enrollment_not_paid');
  });

  it('refuses a cancelled session', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr({}, { ...started, status: 'CANCELLED' }) as any);
    expect((await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness')).statusCode).toBe(409);
  });

  it("only the session's instructor may mark it (the learner gets 403)", async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr({}, started) as any);
    expect((await call('POST', `/enrollments/${ENR}/attendance`, 'demo-devotee')).statusCode).toBe(403);
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr({}, { ...started, instructorId: 'another-instructor' }) as any);
    expect((await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness')).statusCode).toBe(403);
  });

  it('loses a race with a cancel cleanly (claim count 0 -> 409)', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(enr({}, started) as any);
    prismaMock.wellnessEnrollment.updateMany.mockResolvedValue({ count: 0 } as any);
    const res = await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness');
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('enrollment_changed');
  });

  it('404s unknown, 400s malformed', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(null);
    expect((await call('POST', `/enrollments/${ENR}/attendance`, 'demo-wellness')).statusCode).toBe(404);
    expect((await call('POST', '/enrollments/zzz/attendance', 'demo-wellness')).statusCode).toBe(400);
  });
});

describe('GET /sessions/:id/enrollments (roster)', () => {
  it('shows the instructor their paid learners and refuses everyone else', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue({ id: SES, instructorId: INSTRUCTOR.id } as any);
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([{ id: ENR, status: 'PAID', user: { id: 'u', fullName: 'D' } }] as any);
    const ok = await call('GET', `/sessions/${SES}/enrollments`, 'demo-wellness');
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data).toHaveLength(1);
    expect((prismaMock.wellnessEnrollment.findMany.mock.calls[0]![0] as any).where.status).toEqual({ in: ['PAID', 'ATTENDED'] });
    expect((await call('GET', `/sessions/${SES}/enrollments`, 'demo-devotee')).statusCode).toBe(403);
  });
});

describe('PATCH /sessions/:id status CANCELLED refunds enrolments', () => {
  const session = (over: Record<string, unknown> = {}) => ({
    id: SES, instructorId: INSTRUCTOR.id, title: 'Yoga', description: 'x', type: 'YOGA', scheduledAt: future(72),
    durationMinutes: 60, capacity: 10, priceInr: 100, roomUrl: null, status: 'SCHEDULED', ...over,
  });
  beforeEach(() => {
    prismaMock.wellnessSession.update.mockImplementation(async (a: any) => session(a.data));
  });

  it('sweeps every paid + unpaid enrolment and reports the totals', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session() as any);
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([{ id: 'a', status: 'PAID' }, { id: 'b', status: 'PENDING_PAYMENT' }] as any);
    prismaMock.wellnessEnrollment.findUnique.mockImplementation(async (args: any) =>
      enr({ id: args.where.id, status: args.where.id === 'b' ? 'PENDING_PAYMENT' : 'PAID' }) as any,
    );
    const res = await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { status: 'CANCELLED' });
    expect(res.statusCode).toBe(200);
    expect(res.json().cancellation).toEqual({ released: 1, refunded: 1, refundOwedInr: 100, ledgerManualReview: 0 });
    expect(res.json().data.status).toBe('CANCELLED');
  });

  it('repeating the PATCH on an already cancelled session re-runs the sweep (nothing left -> zeros)', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session({ status: 'CANCELLED' }) as any);
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([] as any);
    const res = await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { status: 'CANCELLED' });
    expect(res.statusCode).toBe(200);
    expect(res.json().cancellation).toEqual({ released: 0, refunded: 0, refundOwedInr: 0, ledgerManualReview: 0 });
  });

  it('refuses to cancel a COMPLETED session (earnings already released)', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session({ status: 'COMPLETED', scheduledAt: new Date('2020-01-01') }) as any);
    const res = await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { status: 'CANCELLED' });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('session_already_completed');
    expect(prismaMock.wellnessSession.update).not.toHaveBeenCalled();
  });

  it('a non-cancel edit does not touch enrolments', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session() as any);
    const res = await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { title: 'New title' });
    expect(res.statusCode).toBe(200);
    expect(res.json().cancellation).toBeUndefined();
    expect(prismaMock.wellnessEnrollment.findMany).not.toHaveBeenCalled();
  });
});

describe('re-paying a cancelled enrolment re-opens the instructor earning', () => {
  async function verifyWith(existing: Record<string, unknown> | null) {
    prismaMock.wellnessEnrollment.findUnique
      .mockResolvedValueOnce(enr({ status: 'PENDING_PAYMENT' }) as any) // verify handler
      .mockResolvedValue({ id: ENR, session: { instructorId: INSTRUCTOR.id, priceInr: '100' } } as any); // commission writer
    prismaMock.wellnessEnrollment.update.mockResolvedValue({ id: ENR, status: 'PAID' } as any);
    prismaMock.commission.findFirst.mockResolvedValue(existing as any);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as any);
    prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as any);
    const res = await call('POST', `/enrollments/${ENR}/verify`, 'demo-devotee', {});
    await new Promise((r) => setTimeout(r, 20));
    return res;
  }

  it('a REVERSED commission is set back to PENDING at the full share instead of minting nothing', async () => {
    const res = await verifyWith({ id: 'c1', status: 'REVERSED', payoutRequestId: null });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.commission.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', status: { in: ['REVERSED', 'PENDING'] }, payoutRequestId: null },
      data: { status: 'PENDING', amount: 80, percentage: 0.2 },
    });
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('a commission already PAID or inside a payout request is left alone', async () => {
    await verifyWith({ id: 'c1', status: 'PAID', payoutRequestId: null });
    expect(prismaMock.commission.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('with no commission yet, one is minted as before', async () => {
    await verifyWith(null);
    expect(prismaMock.commission.createMany).toHaveBeenCalled();
  });
});
