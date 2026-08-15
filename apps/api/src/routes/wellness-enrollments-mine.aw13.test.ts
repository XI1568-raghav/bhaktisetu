import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { wellnessSessionRoutes } from './wellness-sessions.js';

/**
 * AW-13 (2026-08-12, P2): a devotee who paid ₹1,000 for a wellness class had no
 * way to find it again. GET /wellness/enrollments/mine, /wellness/my-enrollments
 * and /wellness/enrollments all 404'd; the only route back to the class was
 * already knowing its UUID. Close the tab and the purchase was gone.
 *
 * The endpoint mirrors GET /consultation/mine and must honour the same room
 * gate as GET /sessions/:id: `roomUrl` belongs to a PAID enrollee, nobody else.
 */

const DEVOTEE_ID = '2b5bd615-1633-4c95-9b09-03efb2b9e429';
const SESSION_ID = '11111111-1111-1111-1111-111111111111';

const DEMO_DEVOTEE = {
  id: DEVOTEE_ID,
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

function enrollmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    sessionId: SESSION_ID,
    userId: DEVOTEE_ID,
    status: 'PAID',
    enrolledAt: new Date('2026-08-10T09:00:00.000Z'),
    attendedAt: null,
    session: {
      id: SESSION_ID,
      title: 'Sunrise Hatha',
      description: 'Morning flow',
      type: 'YOGA',
      scheduledAt: new Date('2026-09-01T05:30:00.000Z'),
      durationMinutes: 60,
      capacity: 12,
      priceInr: '1000.00',
      status: 'SCHEDULED',
      roomUrl: 'https://meet.jit.si/darshya-wellness-sunrise',
      instructor: { id: 'i-1', fullName: 'Ananya Devi' },
    },
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  return app;
}

function get(app: Awaited<ReturnType<typeof buildApp>>, url = '/api/v1/wellness/enrollments/mine', token = 'demo-devotee') {
  return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'devotee@demo.com' ? DEMO_DEVOTEE : null,
  );
  prismaMock.wellnessEnrollment.findMany.mockResolvedValue([enrollmentRow()]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-13 — GET /wellness/enrollments/mine', () => {
  it('exists and returns the devotee\'s paid class', async () => {
    const app = await buildApp();
    const res = await get(app);
    expect(res.statusCode).toBe(200);
    const rows = res.json().data;
    expect(rows).toHaveLength(1);
    expect(rows[0].session.title).toBe('Sunrise Hatha');
    expect(rows[0].status).toBe('PAID');
    await app.close();
  });

  it('carries the facts the "my classes" list needs — time, price, instructor', async () => {
    const app = await buildApp();
    const row = (await get(app)).json().data[0];
    expect(row.session.scheduledAt).toBeTruthy();
    expect(row.session.durationMinutes).toBe(60);
    expect(row.session.priceInr).toBe('1000.00');
    expect(row.session.instructorName).toBe('Ananya Devi');
    await app.close();
  });

  it('reveals the join link to a PAID enrollee', async () => {
    const app = await buildApp();
    const row = (await get(app)).json().data[0];
    expect(row.session.roomUrl).toBe('https://meet.jit.si/darshya-wellness-sunrise');
    await app.close();
  });

  it('withholds the join link while the enrolment is still PENDING_PAYMENT', async () => {
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([
      enrollmentRow({ status: 'PENDING_PAYMENT' }),
    ]);
    const app = await buildApp();
    const row = (await get(app)).json().data[0];
    expect(row.status).toBe('PENDING_PAYMENT');
    expect(row.session.roomUrl).toBeNull();
    await app.close();
  });

  it('scopes the query to the calling user only', async () => {
    const app = await buildApp();
    await get(app);
    const args = prismaMock.wellnessEnrollment.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(args.where).toMatchObject({ userId: DEVOTEE_ID });
    await app.close();
  });

  it('401s an anonymous caller rather than listing anyone\'s enrolments', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/wellness/enrollments/mine' });
    expect(res.statusCode).toBe(401);
    expect(prismaMock.wellnessEnrollment.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it('is matched as a literal path, not swallowed by /enrollments/:id/verify', async () => {
    const app = await buildApp();
    const res = await get(app);
    // A 400 "Invalid enrollment id" here would mean the static route lost to
    // the parametric one.
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
