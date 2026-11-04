import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { donationRoutes } from './donations.js';

// QA_PAYER_EMAILS: the Rs 101 donation floor drops to Rs 1 for an allowlisted
// tester account only. Everyone else keeps the Rs 101 floor and the same 400 body.

const DEVOTEE = {
  id: '99999999-9999-4999-8999-999999999999',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};
const TEMPLE_ID = '56955f8d-1b90-47f5-97ea-f86560cb58fe';
const ORIGINAL = process.env.QA_PAYER_EMAILS;

function donate(amountInr: unknown) {
  const app = Fastify();
  void app.register(donationRoutes, { prefix: '/api/v1/donations' });
  return app.inject({
    method: 'POST',
    url: '/api/v1/donations/create-order',
    headers: { authorization: 'Bearer demo-devotee' },
    payload: { causeKind: 'temple', templeId: TEMPLE_ID, amountInr },
  });
}
const insertCalls = () =>
  prismaMock.$executeRawUnsafe.mock.calls.filter((c: any[]) => String(c[0]).includes('INSERT INTO donations'));

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
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.QA_PAYER_EMAILS;
  else process.env.QA_PAYER_EMAILS = ORIGINAL;
});

describe('donation minimum with QA_PAYER_EMAILS', () => {
  it('env unset: Rs 1 and Rs 100 are refused with the Rs 101 message, Rs 101 passes', async () => {
    delete process.env.QA_PAYER_EMAILS;
    for (const amt of [1, 100]) {
      const res = await donate(amt);
      expect(res.statusCode).toBe(400);
      expect(res.json().details.fieldErrors.amountInr).toEqual(['Minimum donation is ₹101']);
    }
    expect(insertCalls()).toHaveLength(0);
    expect((await donate(101)).statusCode).toBe(200);
  });

  it('signed-in user NOT on the list is still held to Rs 101', async () => {
    process.env.QA_PAYER_EMAILS = 'someone.else@example.com';
    const res = await donate(1);
    expect(res.statusCode).toBe(400);
    expect(insertCalls()).toHaveLength(0);
  });

  it('allowlisted user (any case) can donate Rs 1: order is 100 paise and the row stores 1', async () => {
    process.env.QA_PAYER_EMAILS = 'Devotee@Demo.com';
    const res = await donate(1);
    expect(res.statusCode).toBe(200);
    expect(res.json().amount).toBe(100);
    const insert = insertCalls()[0] as any[];
    expect(insert[4]).toBe(1);
  });

  it('allowlisted user is still held to whole rupees and a positive amount', async () => {
    process.env.QA_PAYER_EMAILS = 'devotee@demo.com';
    expect((await donate(0)).statusCode).toBe(400);
    expect((await donate(0.5)).statusCode).toBe(400);
    expect((await donate(-1)).statusCode).toBe(400);
    expect((await donate(1000001)).statusCode).toBe(400);
    expect(insertCalls()).toHaveLength(0);
  });
});
