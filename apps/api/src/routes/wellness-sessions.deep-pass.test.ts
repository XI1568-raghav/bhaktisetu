import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true }) }));

import Fastify from 'fastify';
import { wellnessSessionRoutes } from './wellness-sessions.js';
import { wellnessPortalRoutes } from './wellness-portal.js';

// Wellness deep pass 2026-10-29: edit/delete guards, ATTENDED seat + room handling,
// the roster contract and the instructor name students see.

const INSTRUCTOR = { id: '77777777-7777-4777-8777-777777777777', email: 'wellness@demo.com', phone: null, fullName: 'Account Name', subscriptionTier: 'free', blocked: false };
const OTHER = { id: '99999999-9999-4999-8999-999999999999', email: 'other@demo.com', phone: null, fullName: 'O', subscriptionTier: 'free', blocked: false };
const DEVOTEE = { id: '88888888-8888-4888-8888-888888888888', email: 'devotee@demo.com', phone: null, fullName: 'D', subscriptionTier: 'free', blocked: false };
const SES = '11111111-1111-4111-8111-111111111111';
const future = (h: number) => new Date(Date.now() + h * 3_600_000);

const sessionRow = (over: Record<string, unknown> = {}) => ({
  id: SES,
  instructorId: INSTRUCTOR.id,
  title: 'Morning yoga',
  description: 'd',
  type: 'YOGA',
  scheduledAt: future(72),
  durationMinutes: 60,
  capacity: 10,
  priceInr: '200',
  status: 'SCHEDULED',
  roomUrl: 'https://meet.jit.si/x',
  ...over,
});

async function call(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, token: string, payload?: unknown) {
  const app = Fastify({ logger: false });
  await app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  const res = await app.inject({
    method,
    url: `/api/v1/wellness${url}`,
    headers: { authorization: `Bearer ${token}` },
    ...(payload === undefined ? {} : { payload: payload as never }),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEMO_TOKENS = 'true';
  prismaMock.user.findUnique.mockImplementation(async (a: any) =>
    ({ 'wellness@demo.com': INSTRUCTOR, 'other@demo.com': OTHER, 'devotee@demo.com': DEVOTEE } as Record<string, unknown>)[a.where.email] ?? null,
  );
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow() as any);
  prismaMock.wellnessSession.update.mockImplementation(async (a: any) => ({ ...sessionRow(), ...a.data }) as any);
  prismaMock.wellnessEnrollment.count.mockResolvedValue(0);
  prismaMock.wellnessProfile.findMany.mockResolvedValue([]);
});

describe('PATCH /sessions/:id capacity and price guards', () => {
  it('refuses a capacity below the seats already held', async () => {
    prismaMock.wellnessEnrollment.count.mockResolvedValue(4);
    const res = await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { capacity: 3 });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('capacity_below_enrolled');
    expect(prismaMock.wellnessSession.update).not.toHaveBeenCalled();
    // ATTENDED learners still occupy a seat.
    const where = (prismaMock.wellnessEnrollment.count.mock.calls[0]![0] as any).where;
    expect(where.status.in).toEqual(expect.arrayContaining(['PAID', 'ATTENDED', 'PENDING_PAYMENT']));
  });

  it('allows a capacity equal to or above the seats held, and raising it with nobody enrolled', async () => {
    prismaMock.wellnessEnrollment.count.mockResolvedValue(4);
    expect((await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { capacity: 4 })).statusCode).toBe(200);
    prismaMock.wellnessEnrollment.count.mockResolvedValue(0);
    expect((await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { capacity: 50 })).statusCode).toBe(200);
  });

  it('refuses a price change once anyone holds a seat', async () => {
    prismaMock.wellnessEnrollment.count.mockResolvedValue(1);
    const res = await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { priceInr: 500 });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('price_locked_by_enrolments');
    expect(prismaMock.wellnessSession.update).not.toHaveBeenCalled();
  });

  it('accepts the unchanged price the edit form always resends, and a price change with nobody enrolled', async () => {
    prismaMock.wellnessEnrollment.count.mockResolvedValue(3);
    const same = await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { priceInr: 200, capacity: 10, title: 'New title' });
    expect(same.statusCode).toBe(200);
    expect(prismaMock.wellnessEnrollment.count).not.toHaveBeenCalled();
    prismaMock.wellnessEnrollment.count.mockResolvedValue(0);
    expect((await call('PATCH', `/sessions/${SES}`, 'demo-wellness', { priceInr: 350 })).statusCode).toBe(200);
  });

  it("403s another instructor's session", async () => {
    const res = await call('PATCH', `/sessions/${SES}`, 'demo-other', { title: 'Hijack' });
    expect([403]).toContain(res.statusCode);
    expect(prismaMock.wellnessSession.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /sessions/:id', () => {
  it('refuses while a learner is mid-checkout on a priced session', async () => {
    prismaMock.wellnessEnrollment.count.mockResolvedValue(1);
    const res = await call('DELETE', `/sessions/${SES}`, 'demo-wellness');
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('session_has_paid_enrolments');
    const where = (prismaMock.wellnessEnrollment.count.mock.calls[0]![0] as any).where;
    expect(where.status.in).toContain('PENDING_PAYMENT');
  });
});

describe('ATTENDED learners keep their seat and their room link', () => {
  it('enrolment capacity counts ATTENDED rows', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ status: 'LIVE', capacity: 2 }) as any);
    prismaMock.wellnessProfile.findUnique.mockResolvedValue({ approved: true } as any);
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(null);
    prismaMock.wellnessEnrollment.count.mockResolvedValue(2); // two ATTENDED, none PAID
    const res = await call('POST', `/sessions/${SES}/enroll`, 'demo-devotee', {});
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Session is full');
    const where = (prismaMock.wellnessEnrollment.count.mock.calls[0]![0] as any).where;
    expect(where.status.in).toContain('ATTENDED');
  });

  it('an ATTENDED learner cannot enrol again (it would reset their row to PENDING_PAYMENT)', async () => {
    prismaMock.wellnessProfile.findUnique.mockResolvedValue({ approved: true } as any);
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({ id: 'e1', status: 'ATTENDED' } as any);
    const res = await call('POST', `/sessions/${SES}/enroll`, 'demo-devotee', {});
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('You are already enrolled');
    expect(prismaMock.wellnessEnrollment.update).not.toHaveBeenCalled();
  });

  it('the class page still shows the room link after attendance is marked', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue({
      ...sessionRow({ status: 'LIVE' }),
      instructor: { id: INSTRUCTOR.id, fullName: 'Account Name' },
      _count: { enrollments: 1 },
    } as any);
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({ id: 'e1', status: 'ATTENDED' } as any);
    const res = await call('GET', `/sessions/${SES}`, 'demo-devotee');
    expect(res.statusCode).toBe(200);
    expect(res.json().data.roomUrl).toBe('https://meet.jit.si/x');
  });

  it('does not show the room link to someone who is merely PENDING_PAYMENT', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue({
      ...sessionRow(),
      instructor: { id: INSTRUCTOR.id, fullName: 'Account Name' },
      _count: { enrollments: 1 },
    } as any);
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue({ id: 'e1', status: 'PENDING_PAYMENT' } as any);
    const res = await call('GET', `/sessions/${SES}`, 'demo-devotee');
    expect(res.json().data.roomUrl).toBeUndefined();
  });
});

describe('what students see', () => {
  it('shows the instructor display name from the profile, falling back to the account name', async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([
      { ...sessionRow(), instructor: { id: INSTRUCTOR.id, fullName: 'Account Name' }, _count: { enrollments: 1 } },
    ] as any);
    prismaMock.wellnessProfile.findMany.mockResolvedValue([{ userId: INSTRUCTOR.id, displayName: 'Test Yoga Guru' }] as any);
    const named = await call('GET', '/sessions', 'demo-devotee');
    expect(named.json().data[0].instructorName).toBe('Test Yoga Guru');
    prismaMock.wellnessProfile.findMany.mockRejectedValue(new Error('db'));
    const fallback = await call('GET', '/sessions', 'demo-devotee');
    expect(fallback.json().data[0].instructorName).toBe('Account Name');
  });

  it('counts ATTENDED learners as taken seats in the public listing', async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([]);
    await call('GET', '/sessions', 'demo-devotee');
    const include = (prismaMock.wellnessSession.findMany.mock.calls[0]![0] as any).include;
    expect(include._count.select.enrollments.where.status.in).toContain('ATTENDED');
  });

  it("GET /sessions/mine does not leak the Prisma _count scaffolding", async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([{ ...sessionRow(), _count: { enrollments: 2 } }] as any);
    const res = await call('GET', '/sessions/mine', 'demo-wellness');
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0]._count).toBeUndefined();
    expect(res.json().data[0].enrolled).toBe(2);
  });
});

describe('GET /sessions/:id/enrollments (roster)', () => {
  it('returns an empty list for a class nobody has joined, scoped to paid/attended rows', async () => {
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([]);
    const res = await call('GET', `/sessions/${SES}/enrollments`, 'demo-wellness');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: [] });
    expect((prismaMock.wellnessEnrollment.findMany.mock.calls[0]![0] as any).where.status.in).toEqual(['PAID', 'ATTENDED']);
  });

  it('is instructor-only: another instructor and a devotee get 403, unknown class 404', async () => {
    expect((await call('GET', `/sessions/${SES}/enrollments`, 'demo-other')).statusCode).toBe(403);
    expect((await call('GET', `/sessions/${SES}/enrollments`, 'demo-devotee')).statusCode).toBe(403);
    prismaMock.wellnessSession.findUnique.mockResolvedValue(null);
    expect((await call('GET', `/sessions/${SES}/enrollments`, 'demo-wellness')).statusCode).toBe(404);
  });
});

describe('PATCH /wellness-portal/profile', () => {
  it('refuses a display name that is only spaces (it would publish a blank instructor)', async () => {
    const app = Fastify({ logger: false });
    await app.register(wellnessPortalRoutes, { prefix: '/api/v1/wellness-portal' });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/wellness-portal/profile',
      headers: { authorization: 'Bearer demo-wellness' },
      payload: { displayName: '     ' },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
    expect(prismaMock.wellnessProfile.update).not.toHaveBeenCalled();
  });
});
