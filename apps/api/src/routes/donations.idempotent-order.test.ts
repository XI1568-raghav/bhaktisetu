import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { donationRoutes } from './donations.js';

// QA 2026-10-13: the mobile app opened an order, then the web form opened a second one
// for the same donor / donee / amount, leaving an orphan 'created' row. A still-open
// order inside the window is reused. /donations/temples must list admin-linked temples.

const DEVOTEE = {
  id: '99999999-9999-4999-8999-999999999999',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};
const TEMPLE_ID = '56955f8d-1b90-47f5-97ea-f86560cb58fe';

function makeApp() {
  const app = Fastify();
  void app.register(donationRoutes, { prefix: '/api/v1/donations' });
  return app;
}
const insertCalls = () =>
  prismaMock.$executeRawUnsafe.mock.calls.filter((c: any[]) => String(c[0]).includes('INSERT INTO donations'));
const lookup = (sql: string) => sql.includes('FROM donations') && sql.includes("status = 'created'");

function donate(payload: Record<string, unknown> = {}) {
  return makeApp().inject({
    method: 'POST',
    url: '/api/v1/donations/create-order',
    headers: { authorization: 'Bearer demo-devotee' },
    payload: { causeKind: 'temple', templeId: TEMPLE_ID, amountInr: 101, ...payload },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEMO_TOKENS = 'true';
  prismaMock.user.findUnique.mockImplementation(async (args: any) =>
    args.where.email === 'devotee@demo.com' ? DEVOTEE : null,
  );
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.temple.findUnique.mockResolvedValue({ id: TEMPLE_ID, name: 'QA Mandir', isVerified: true } as any);
  prismaMock.templeProfile.findFirst.mockResolvedValue({ userId: 'mgr-1' } as any);
  prismaMock.$queryRawUnsafe.mockResolvedValue([] as any);
});

describe('POST /donations/create-order is idempotent per (donor, donee, amount)', () => {
  it('opens a new order when nothing is open', async () => {
    const res = await donate();
    expect(res.statusCode).toBe(200);
    expect(res.json().reused).toBeUndefined();
    expect(insertCalls()).toHaveLength(1);
  });

  it('reuses the open order: same donationId + gateway order, no second INSERT', async () => {
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      lookup(sql) ? [{ id: 'don_open_1', razorpay_order_id: 'order_open_1' }] : [],
    );
    const res = await donate({ dedication: 'for amma' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ donationId: 'don_open_1', razorpayOrderId: 'order_open_1', amount: 10100, reused: true });
    expect(insertCalls()).toHaveLength(0);
    const upd = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) => String(c[0]).startsWith('UPDATE donations'));
    expect(upd?.[1]).toBe('don_open_1');
    expect(upd?.[3]).toBe('for amma');
  });

  it('the lookup is scoped to the donor, the donee, the amount, status created and a 15 minute window', async () => {
    await donate();
    const call = prismaMock.$queryRawUnsafe.mock.calls.find((c: any[]) => lookup(String(c[0])));
    expect(call).toBeTruthy();
    const sql = String(call![0]);
    expect(sql).toMatch(/user_id = \$1::uuid/);
    expect(sql).toMatch(/temple_id = \$2::uuid/);
    expect(sql).toMatch(/amount_inr = \$3/);
    expect(sql).toMatch(/15 minutes/);
    expect(call!.slice(1)).toEqual([DEVOTEE.id, TEMPLE_ID, 101]);
  });

  it('a gaushala order looks up the gaushala column, not the temple one', async () => {
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => (String(sql).includes('gaushala_profiles') ? [{ user_id: 'x' }] : []));
    await donate({ causeKind: 'gaushala', templeId: undefined, gaushalaId: '4bafdaef-d978-41e5-ac43-8b44ee7716bb' }).catch(() => undefined);
    const call = prismaMock.$queryRawUnsafe.mock.calls.find((c: any[]) => lookup(String(c[0])));
    if (call) expect(String(call[0])).toMatch(/gaushala_id = \$2(?!::)/);
  });

  it('a failing lookup never blocks the donation: it falls through to a fresh order', async () => {
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (lookup(sql)) throw new Error('db hiccup');
      return [];
    });
    const res = await donate();
    expect(res.statusCode).toBe(200);
    expect(insertCalls()).toHaveLength(1);
  });

  it('ignores a malformed lookup row instead of reusing garbage', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ ok: 1 }] as any);
    const res = await donate();
    expect(res.statusCode).toBe(200);
    expect(res.json().reused).toBeUndefined();
    expect(insertCalls()).toHaveLength(1);
  });
});

describe('GET /donations/temples includes admin-linked temples', () => {
  it('queries the verified temples by name OR by a linked id', async () => {
    prismaMock.templeProfile.findMany.mockResolvedValue([{ templeName: 'Siddhivinayak Temple' }] as any);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: TEMPLE_ID }] as any);
    prismaMock.temple.findMany.mockResolvedValue([{ id: TEMPLE_ID, name: 'Akshardham' }] as any);
    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/donations/temples' });
    expect(res.statusCode).toBe(200);
    const where = (prismaMock.temple.findMany.mock.calls[0]![0] as any).where;
    expect(where.isVerified).toBe(true);
    expect(where.OR).toEqual(
      expect.arrayContaining([{ id: { in: [TEMPLE_ID] } }, { name: { equals: 'Siddhivinayak Temple', mode: 'insensitive' } }]),
    );
  });

  it('lists a linked temple even when no profile name matches any catalogue row', async () => {
    prismaMock.templeProfile.findMany.mockResolvedValue([] as any);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: TEMPLE_ID }] as any);
    prismaMock.temple.findMany.mockResolvedValue([{ id: TEMPLE_ID, name: 'Akshardham' }] as any);
    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/donations/temples' });
    expect(res.json().temples).toHaveLength(1);
  });

  it('is empty only when there is neither a name match nor a link', async () => {
    prismaMock.templeProfile.findMany.mockResolvedValue([] as any);
    prismaMock.$queryRawUnsafe.mockResolvedValue([] as any);
    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/donations/temples' });
    expect(res.json()).toEqual({ temples: [] });
    expect(prismaMock.temple.findMany).not.toHaveBeenCalled();
  });

  it('survives the links table being absent (unmigrated db): name matches still work', async () => {
    prismaMock.templeProfile.findMany.mockResolvedValue([{ templeName: 'QA Mandir' }] as any);
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('relation does not exist'));
    prismaMock.temple.findMany.mockResolvedValue([{ id: TEMPLE_ID, name: 'QA Mandir' }] as any);
    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/donations/temples' });
    expect(res.statusCode).toBe(200);
    expect(res.json().temples).toHaveLength(1);
  });
});
