import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { wellnessSessionRoutes } from './wellness-sessions.js';

/**
 * AW-07 (2026-08-12, P1) — the wellness marketplace had a complete supply side
 * and zero demand side. `grep -rn "enroll" apps/web/app --include=*.tsx` matched
 * four files, all instructor-side; nothing in the website could invoke
 * POST /wellness/sessions/:id/enroll. Instructors created classes, saw
 * "1/10 enrolled" only when an engineer curled the API, and churned.
 *
 * The devotee catalog being built on top of GET /wellness/sessions needs two
 * facts the public listing did not carry: WHO teaches the class and how many
 * seats are actually left. Without them a catalog either omits them or invents
 * them — and this codebase's signature defect is inventing them (the /wellness
 * landing page shipped six fictional classes with hardcoded "8 spots left").
 *
 * roomUrl must stay stripped: only a PAID enrollee or the instructor may see it.
 */

const SESSION_ID = '11111111-1111-1111-1111-111111111111';
const INSTRUCTOR_ID = '9e15c3a2-0dc7-4677-ac45-f7dfaec619a6';

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    instructorId: INSTRUCTOR_ID,
    title: 'QA Deep Hatha Yoga',
    description: 'Morning hatha practice.',
    type: 'YOGA',
    scheduledAt: new Date(Date.now() + 86_400_000),
    durationMinutes: 60,
    capacity: 10,
    priceInr: '1000',
    roomUrl: 'https://meet.jit.si/secret-room',
    status: 'SCHEDULED',
    createdAt: new Date(),
    updatedAt: new Date(),
    instructor: { id: INSTRUCTOR_ID, fullName: 'Ananya Devi' },
    _count: { enrollments: 3 },
    ...overrides,
  };
}

function makeApp() {
  const app = Fastify({ logger: false });
  void app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
});

describe('AW-07 — GET /wellness/sessions is a usable public catalog', () => {
  it('names the instructor so a devotee knows who they are paying', async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([sessionRow()]);

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/wellness/sessions' });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].instructorName).toBe('Ananya Devi');
  });

  it('reports the REAL seats left, derived from paid+held enrolments', async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([sessionRow()]);

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/wellness/sessions' });
    await app.close();

    const row = res.json().data[0];
    expect(row.enrolledCount).toBe(3);
    expect(row.spotsLeft).toBe(7);
  });

  it('never reports negative seats when a class is over-held', async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([
      sessionRow({ capacity: 2, _count: { enrollments: 5 } }),
    ]);

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/wellness/sessions' });
    await app.close();

    expect(res.json().data[0].spotsLeft).toBe(0);
  });

  it('still strips roomUrl from the public listing', async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([sessionRow()]);

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/wellness/sessions' });
    await app.close();

    expect(res.json().data[0]).not.toHaveProperty('roomUrl');
    expect(JSON.stringify(res.json())).not.toContain('secret-room');
  });

  it('does not leak the instructor relation object or the raw _count', async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([sessionRow()]);

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/wellness/sessions' });
    await app.close();

    const row = res.json().data[0];
    expect(row).not.toHaveProperty('instructor');
    expect(row).not.toHaveProperty('_count');
  });

  it('returns an empty list honestly when nothing is scheduled', async () => {
    prismaMock.wellnessSession.findMany.mockResolvedValue([]);

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/wellness/sessions' });
    await app.close();

    expect(res.json().data).toEqual([]);
  });
});

/**
 * AW-07 remaining half (verifier-confirmed gap, 2026-08-14).
 *
 * The catalog listing gained instructorName / enrolledCount / spotsLeft, but
 * GET /wellness/sessions/:id was left a bare findUnique + serializeSession.
 * ClassDetailClient — the ONLY devotee-facing enrolment surface — reads all
 * three off the detail payload:
 *   ClassDetailClient.tsx:276  const spots = typeof detail.spotsLeft === 'number' ? … : null
 *   ClassDetailClient.tsx:277  const isFull = spots === 0
 *   ClassDetailClient.tsx:295  {detail.instructorName ? … }
 * With the field absent, `spots` is null, `isFull` is PERMANENTLY false, and a
 * class with zero seats presents an enabled "Enrol — ₹1,000" button that
 * POST /enroll then refuses with 409 "Session is full". The devotee is invited
 * to pay for a seat the server has already decided not to sell.
 *
 * Detail and listing must derive seats from the SAME set the enroll handler's
 * capacity gate counts (PAID + PENDING_PAYMENT), or the two disagree.
 */
describe('AW-07 — GET /wellness/sessions/:id carries the same facts as the listing', () => {
  it('names the instructor on the detail payload', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow());

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/wellness/sessions/${SESSION_ID}` });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().data.instructorName).toBe('Ananya Devi');
  });

  it('reports real seats left so a full class cannot present an Enrol button', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(
      sessionRow({ capacity: 10, _count: { enrollments: 10 } }),
    );

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/wellness/sessions/${SESSION_ID}` });
    await app.close();

    const row = res.json().data;
    expect(row.enrolledCount).toBe(10);
    // The number the client compares against 0 to disable the button.
    expect(row.spotsLeft).toBe(0);
  });

  it('counts the SAME enrolment statuses the enroll capacity gate counts', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow());

    const app = makeApp();
    await app.inject({ method: 'GET', url: `/api/v1/wellness/sessions/${SESSION_ID}` });
    await app.close();

    const arg = prismaMock.wellnessSession.findUnique.mock.calls[0]?.[0] as any;
    const where = arg?.include?._count?.select?.enrollments?.where;
    expect(where?.status?.in).toEqual(['PAID', 'PENDING_PAYMENT']);
  });

  it('never reports negative seats on the detail payload either', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(
      sessionRow({ capacity: 2, _count: { enrollments: 5 } }),
    );

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/wellness/sessions/${SESSION_ID}` });
    await app.close();

    expect(res.json().data.spotsLeft).toBe(0);
  });

  it('does not leak the instructor relation, the raw _count, or roomUrl to an anonymous caller', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow());

    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/wellness/sessions/${SESSION_ID}` });
    await app.close();

    const row = res.json().data;
    expect(row).not.toHaveProperty('instructor');
    expect(row).not.toHaveProperty('_count');
    expect(row).not.toHaveProperty('roomUrl');
    expect(JSON.stringify(res.json())).not.toContain('secret-room');
  });
});
