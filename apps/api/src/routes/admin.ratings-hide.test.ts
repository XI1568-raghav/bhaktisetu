import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';
import { __resetReviewModerationCache } from '../lib/review-moderation.js';

// QA 2026-10-13: POST /admin/ratings/:id/hide used to be a stub answering ok:false.

const ADMIN = { id: '11111111-aaaa-4aaa-8aaa-111111111111', email: 'admin@demo.com', phone: null, fullName: 'Admin', subscriptionTier: 'bhakti_pass', blocked: false };
const RID = 'aaaaaaaa-0000-4000-8000-000000000001';

async function call(method: 'GET' | 'POST', url: string, payload?: Record<string, unknown>, token = 'demo-admin') {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminRoutes(i); }, { prefix: '/api/v1/admin' });
  const res = await app.inject({ method, url: `/api/v1/admin${url}`, headers: { authorization: `Bearer ${token}` }, ...(payload ? { payload } : {}) });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetReviewModerationCache();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: any) => (a.where.email === 'admin@demo.com' ? ADMIN : null));
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.review.findUnique.mockResolvedValue({ id: RID } as any);
});

describe('POST /admin/ratings/:id/hide', () => {
  it('hides the rating for real (ok:true, a moderation row is written)', async () => {
    const res = await call('POST', `/ratings/${RID}/hide`, { reason: 'abusive' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, hidden: true, alreadyHidden: false });
    const insert = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) => String(c[0]).includes('INSERT INTO "review_moderation"'));
    expect(insert?.slice(1)).toEqual([RID, ADMIN.id, 'abusive']);
  });

  it('is idempotent', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const res = await call('POST', `/ratings/${RID}/hide`);
    expect(res.json().alreadyHidden).toBe(true);
  });

  it('404s an unknown rating and 400s a malformed id', async () => {
    prismaMock.review.findUnique.mockResolvedValue(null);
    expect((await call('POST', `/ratings/${RID}/hide`)).statusCode).toBe(404);
    expect((await call('POST', '/ratings/not-a-uuid/hide')).statusCode).toBe(400);
  });

  it('is admin only', async () => {
    const res = await call('POST', `/ratings/${RID}/hide`, undefined, 'demo-devotee');
    expect([401, 403]).toContain(res.statusCode);
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('answers 500 (not a fake ok) when the write fails', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('read-only db'));
    const res = await call('POST', `/ratings/${RID}/hide`);
    expect(res.statusCode).toBe(500);
    expect(res.json().ok).toBe(false);
  });
});

describe('GET /admin/ratings and unhide', () => {
  it('flags hidden rows so the moderator can see and undo them', async () => {
    prismaMock.review.findMany.mockResolvedValue([
      { id: RID, userId: 'u', providerId: 'p', providerType: 'WELLNESS', rating: 1, comment: 'x', createdAt: new Date() },
      { id: 'aaaaaaaa-0000-4000-8000-000000000002', userId: 'u', providerId: 'p', providerType: 'WELLNESS', rating: 5, comment: 'y', createdAt: new Date() },
    ] as any);
    prismaMock.review.count.mockResolvedValue(2);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: RID }]);
    const body = (await call('GET', '/ratings')).json();
    expect(body.data.map((r: any) => r.isHidden)).toEqual([true, false]);
  });

  it('unhide removes the moderation row', async () => {
    const res = await call('POST', `/ratings/${RID}/unhide`);
    expect(res.json()).toMatchObject({ ok: true, hidden: false, wasHidden: true });
    const del = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) => String(c[0]).includes('DELETE FROM "review_moderation"'));
    expect(del?.[1]).toBe(RID);
  });
});
