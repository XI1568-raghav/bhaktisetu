/**
 * QA 2026-10-13: /consultation/book stores the AstrologerProfile.id in
 * astrologer_id, but GET /:id compared it to the caller's USER id, so the
 * assigned astrologer was 403'd on their own consultation. A completed
 * consultation replayed through /verify-payment was also rewritten to confirmed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

const ASTRO = { id: '99999999-1111-4111-8111-111111111111', email: 'astro@demo.com', phone: null, fullName: 'A', subscriptionTier: 'free', blocked: false };
const DEVOTEE = { id: '2b5bd615-1111-4111-8111-111111111111', email: 'devotee@demo.com', phone: null, fullName: 'D', subscriptionTier: 'free', blocked: false };
const ID = '3b5bd615-1111-4111-8111-111111111111';
const PROFILE_ID = '5e3288d6-9c93-468f-bb5b-93afc5309de7';

function row(status: string) {
  return {
    id: ID, reference: 'AC-1', user_id: DEVOTEE.id, astrologer_id: PROFILE_ID, astrologer_name: 'X',
    minutes: 10, amount_inr: '100', currency: 'INR', status, room_name: 'darshya-ac',
    scheduled_at: null, created_at: new Date(), paid_at: new Date(),
  };
}

async function call(method: 'GET' | 'POST', url: string, token: string, payload?: unknown) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await consultationRoutes(i); }, { prefix: '/api/v1/consultation' });
  const res = await app.inject({ method, url: `/api/v1/consultation${url}`, headers: { authorization: `Bearer demo-${token}` }, payload: payload as any });
  await app.close();
  return res;
}

describe('consultation detail / verify edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (a: any) =>
      a.where.email === 'astro@demo.com' ? ASTRO : a.where.email === 'devotee@demo.com' ? DEVOTEE : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  });

  it('lets the assigned astrologer read the consultation by profile id', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row('confirmed')]);
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({ id: PROFILE_ID } as any);
    const res = await call('GET', `/${ID}`, 'astro');
    expect(res.statusCode).toBe(200);
    expect(res.json().consultation.userId).toBeUndefined();
  });

  it('still refuses an astrologer who is not assigned', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row('confirmed')]);
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({ id: 'someone-else' } as any);
    const res = await call('GET', `/${ID}`, 'astro');
    expect(res.statusCode).toBe(403);
  });

  it('does not rewrite a completed consultation on a replayed verify', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row('completed')]);
    const res = await call('POST', '/verify-payment', 'devotee', { consultationId: ID });
    expect(res.statusCode).toBe(200);
    const updates = prismaMock.$executeRawUnsafe.mock.calls.filter(([sql]) => /SET status = 'confirmed'/.test(String(sql)));
    expect(updates).toHaveLength(0);
  });
});
