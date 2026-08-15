/**
 * AO-17 — /admin/consultations could not say WHO a Rs 500 consultation is for.
 *
 * Sweep (2026-08-12), the single row on the page:
 *   ASTROLOGER  "Acharya Vinod Sharma" / 71e54617-6963-418e-845f-920f4350505b
 *   USER        "2b5bd615…"  (a truncated UUID — no name, no email)
 *
 * GET /consultation/admin/all serialises `userId` straight off the raw
 * astrologer_consultations row and never joins User, so the operator driving
 * the consultation lifecycle — the page's own note says only admin can — has
 * no way to tell which devotee the money belongs to without a DB lookup. The
 * astrologer's UUID is printed next to their name for no reason at all.
 *
 * The join is enriched HERE rather than in the page so the mobile admin screen
 * and any agent reading this endpoint get the same identity.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const DEVOTEE_ID = '2b5bd615-1111-4111-8111-111111111111';

const ROW = {
  id: 'ac-1',
  reference: 'AC-20260812-0266CC',
  user_id: DEVOTEE_ID,
  astrologer_id: '71e54617-6963-418e-845f-920f4350505b',
  astrologer_name: 'Acharya Vinod Sharma',
  minutes: 30,
  amount_inr: '500',
  currency: 'INR',
  status: 'confirmed',
  room_name: 'darshya-ac-1',
  scheduled_at: null,
  created_at: '2026-08-12T06:00:00.000Z',
  paid_at: '2026-08-12T06:01:00.000Z',
};

async function adminList() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await consultationRoutes(instance);
  }, { prefix: '/api/v1/consultation' });
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/consultation/admin/all',
    headers: { authorization: 'Bearer demo-admin' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
    /COUNT\(\*\)/i.test(sql) ? [{ total: 1 }] : [ROW],
  );
  prismaMock.commission.findMany.mockResolvedValue([{ bookingId: 'ac-1' }] as never);
  prismaMock.user.findMany.mockResolvedValue([
    { id: DEVOTEE_ID, fullName: 'Neha Srinivasan', email: 'neha@example.com', phone: '+919812345678' },
  ] as never);
});

describe('AO-17 — the admin consultation list names the devotee', () => {
  it('carries the devotee name and email, not just an id', async () => {
    const body = (await adminList()).json();
    const row = body.consultations[0];

    expect(row.userName).toBe('Neha Srinivasan');
    expect(row.userEmail).toBe('neha@example.com');
    // The id stays — it is what the lifecycle actions key off — but it is no
    // longer the only thing an operator has.
    expect(row.userId).toBe(DEVOTEE_ID);
  });

  it('resolves the identity in ONE query for the whole page', async () => {
    await adminList();
    // Never per row: this list is paginated to 50 and an N+1 here is 50 round
    // trips on an admin page load.
    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
  });

  it('falls back to null rather than inventing a name', async () => {
    prismaMock.user.findMany.mockResolvedValue([] as never);
    const row = (await adminList()).json().consultations[0];

    expect(row.userName).toBeNull();
    expect(row.userEmail).toBeNull();
    expect(row.userId).toBe(DEVOTEE_ID);
  });

  it('a failed identity lookup never takes the whole list down', async () => {
    prismaMock.user.findMany.mockRejectedValue(new Error('db hiccup') as never);
    const res = await adminList();

    // The consultation ledger is the point of the page; a cosmetic join must
    // not be able to blank it.
    expect(res.statusCode).toBe(200);
    expect(res.json().consultations).toHaveLength(1);
    expect(res.json().consultations[0].userName).toBeNull();
  });
});
