import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { wellnessSessionRoutes } from './wellness-sessions.js';

// QA 2026-10-13: a price above Decimal(10,2) reached Prisma and answered 500.

const INSTRUCTOR = {
  id: '77777777-7777-4777-8777-777777777777',
  email: 'wellness@demo.com',
  phone: null,
  fullName: 'W',
  subscriptionTier: 'free',
  blocked: false,
};

describe('wellness session price ceiling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (a: any) =>
      a.where.email === 'wellness@demo.com' ? INSTRUCTOR : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  });

  it('answers 400 for an overflowing price on create', async () => {
    const app = Fastify();
    void app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/wellness/sessions',
      headers: { authorization: 'Bearer demo-wellness' },
      payload: {
        title: 'Yoga',
        description: 'd',
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        durationMinutes: 30,
        capacity: 5,
        priceInr: 99999999999,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.wellnessSession.create).not.toHaveBeenCalled();
  });
});

describe('wellness enrolment after the start time', () => {
  it('refuses a SCHEDULED session that has already started', async () => {
    prismaMock.user.findUnique.mockImplementation(async (a: any) =>
      a.where.email === 'devotee@demo.com'
        ? { id: '88888888-8888-4888-8888-888888888888', email: 'devotee@demo.com', phone: null, fullName: 'D', subscriptionTier: 'free', blocked: false }
        : null,
    );
    prismaMock.wellnessSession.findUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() - 3_600_000),
      capacity: 5,
      priceInr: 101,
      instructorId: '77777777-7777-4777-8777-777777777777',
    } as any);
    const app = Fastify();
    void app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/wellness/sessions/11111111-1111-4111-8111-111111111111/enroll',
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('session_started');
  });
});

describe('wellness session delete with paid enrolments', () => {
  it('refuses with 409 instead of erasing paid enrolments', async () => {
    prismaMock.user.findUnique.mockImplementation(async (a: any) =>
      a.where.email === 'wellness@demo.com' ? INSTRUCTOR : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.wellnessSession.findUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      instructorId: INSTRUCTOR.id,
      priceInr: 101,
    } as any);
    prismaMock.wellnessEnrollment.count.mockResolvedValue(2);
    const app = Fastify();
    void app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/wellness/sessions/11111111-1111-4111-8111-111111111111',
      headers: { authorization: 'Bearer demo-wellness' },
    });
    expect(res.statusCode).toBe(409);
  });
});
