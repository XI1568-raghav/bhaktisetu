/**
 * Launch fix 2026-10-07: a wellness session cannot be marked COMPLETED before its scheduled
 * start, and cannot be moved into the past (which would release the held earnings the same
 * way: payout.service holds them while scheduledAt > now and status != COMPLETED).
 * Also: roomUrl accepts http(s) only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { wellnessSessionRoutes } from './wellness-sessions.js';

const INSTRUCTOR = {
  id: 'user-demo-wellness-1',
  email: 'wellness@demo.com',
  phone: null,
  fullName: 'Demo Instructor',
  subscriptionTier: 'free',
  blocked: false,
};
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

function session(over: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    instructorId: INSTRUCTOR.id,
    title: 'Morning yoga',
    description: 'x',
    type: 'YOGA',
    scheduledAt: new Date('2999-01-01T10:00:00Z'),
    durationMinutes: 60,
    capacity: 10,
    priceInr: 100,
    roomUrl: null,
    status: 'SCHEDULED',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    ...over,
  };
}

async function patch(path: string, body: unknown) {
  const app = Fastify({ logger: false });
  await app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/v1/wellness/sessions/${SESSION_ID}${path}`,
    headers: { authorization: 'Bearer demo-wellness', 'content-type': 'application/json' },
    payload: JSON.stringify(body),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'wellness@demo.com' ? INSTRUCTOR : null,
  );
  prismaMock.wellnessSession.update.mockImplementation(async (args: { data: Record<string, unknown> }) =>
    session(args.data),
  );
});

describe('PATCH /wellness/sessions/:id, completion window', () => {
  it('refuses status COMPLETED before the scheduled start with 409 too_early_to_complete', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session() as never);
    const res = await patch('', { status: 'COMPLETED' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'too_early_to_complete' });
    expect(prismaMock.wellnessSession.update).not.toHaveBeenCalled();
  });

  it('allows status COMPLETED once the scheduled start has passed', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(
      session({ scheduledAt: new Date('2020-01-01T10:00:00Z') }) as never,
    );
    const res = await patch('', { status: 'COMPLETED' });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.wellnessSession.update).toHaveBeenCalledTimes(1);
  });

  it('refuses back-dating a session into the past (the other way to release held earnings)', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session() as never);
    for (const body of [
      { scheduledAt: '2020-01-01T00:00:00.000Z' },
      { scheduledAt: '2020-01-01T00:00:00.000Z', status: 'COMPLETED' },
    ]) {
      const res = await patch('', body);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toMatchObject({ code: 'scheduled_in_past' });
    }
    expect(prismaMock.wellnessSession.update).not.toHaveBeenCalled();
  });

  it('still lets an instructor cancel and clean up a session with a past time', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session() as never);
    const res = await patch('', { scheduledAt: '2020-01-01T00:00:00.000Z', status: 'CANCELLED' });
    expect(res.statusCode).toBe(200);
  });

  it('does not block ordinary edits of a future session', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session() as never);
    const res = await patch('', { title: 'Evening yoga', scheduledAt: '2999-06-01T10:00:00.000Z' });
    expect(res.statusCode).toBe(200);
  });
});

describe('PATCH /wellness/sessions/:id/room, http(s) only', () => {
  it.each(['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://example.com/x', 'not a url'])(
    'rejects %s',
    async (roomUrl) => {
      prismaMock.wellnessSession.findUnique.mockResolvedValue(session() as never);
      const res = await patch('/room', { roomUrl });
      expect(res.statusCode).toBe(400);
      expect(prismaMock.wellnessSession.update).not.toHaveBeenCalled();
    },
  );

  it.each(['https://meet.jit.si/room-1', 'http://example.com/room'])('accepts %s', async (roomUrl) => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(session() as never);
    const res = await patch('/room', { roomUrl });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.wellnessSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { roomUrl } }),
    );
  });
});
