import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { donationRoutes } from './donations.js';

/**
 * Temple manager test (2026-10-05): who may be named as a donation's donee.
 *
 * The gaushala path (S-05) resolves the donee BEFORE money moves and refuses one
 * that is not onboarded: "we do not take a donation for a donee that cannot be
 * paid and cannot be named on the receipt". The temple path did nothing of the
 * kind. Reproduced locally:
 *
 *   - a donation to Kashi Vishwanath Temple (a catalogue row with no manager, no
 *     profile, no relationship with Darshya) was accepted and banked;
 *   - a templeId that does not exist opened a Razorpay order and THEN died with
 *     a 500 on the donations INSERT.
 *
 * and /donations lists every verified catalogue temple as a donation cause.
 */

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

function donationInsert(): any[] | undefined {
  return prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) =>
    String(c[0]).includes('INSERT INTO donations'),
  );
}

function donate(templeId = TEMPLE_ID) {
  return makeApp().inject({
    method: 'POST',
    url: '/api/v1/donations/create-order',
    headers: { authorization: 'Bearer demo-devotee' },
    payload: { causeKind: 'temple', templeId, amountInr: 501 },
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
  prismaMock.temple.findUnique.mockResolvedValue({ id: TEMPLE_ID, name: 'QA Sheetla Mata Mandir', isVerified: true } as any);
  prismaMock.templeProfile.findFirst.mockResolvedValue({ userId: 'mgr-1' } as any);
});

describe('temple donations name a donee that exists and can be paid', () => {
  it('refuses a temple id that does not exist with a 404, not a 500 after the order', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(null);
    const res = await donate('11111111-1111-4111-8111-111111111111');
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('temple_not_found');
    expect(donationInsert()).toBeUndefined();
  });

  it('refuses a temple with no approved manager profile', async () => {
    prismaMock.templeProfile.findFirst.mockResolvedValue(null);
    const res = await donate();
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('temple_not_onboarded');
    expect(res.json().message).toMatch(/not yet onboarded/i);
    expect(donationInsert()).toBeUndefined();
  });

  it('accepts a temple whose approved manager is attached by an admin link, not by name', async () => {
    prismaMock.templeProfile.findFirst.mockResolvedValue(null);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ ok: 1 }] as any);
    const res = await donate();
    expect(res.statusCode).toBe(200);
    expect(donationInsert()).toBeDefined();
    prismaMock.$queryRawUnsafe.mockReset();
  });

  it('refuses an unverified temple even if a profile claims its name', async () => {
    prismaMock.temple.findUnique.mockResolvedValue({ id: TEMPLE_ID, name: 'QA Sheetla Mata Mandir', isVerified: false } as any);
    const res = await donate();
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('temple_not_onboarded');
    expect(donationInsert()).toBeUndefined();
  });

  it('matches the manager profile by approved + name, case-insensitively', async () => {
    const res = await donate();
    expect(res.statusCode).toBe(200);
    const where = (prismaMock.templeProfile.findFirst.mock.calls[0]?.[0] as any).where;
    expect(where.approved).toBe(true);
    expect(where.templeName).toEqual({ equals: 'QA Sheetla Mata Mandir', mode: 'insensitive' });
    expect(donationInsert()?.[3]).toBe(TEMPLE_ID);
  });
});

describe('GET /donations/temples lists only temples that can receive a donation', () => {
  it('returns verified temples whose manager profile is approved', async () => {
    prismaMock.templeProfile.findMany.mockResolvedValue([{ templeName: 'qa sheetla mata mandir ' }] as any);
    prismaMock.temple.findMany.mockResolvedValue([
      { id: TEMPLE_ID, name: 'QA Sheetla Mata Mandir', city: 'Gurugram', state: 'Haryana', deityPrimary: 'Sheetla Mata', description: 'x', images: [] },
    ] as any);
    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/donations/temples' });
    expect(res.statusCode).toBe(200);
    expect(res.json().temples).toHaveLength(1);
    const where = (prismaMock.temple.findMany.mock.calls[0]?.[0] as any).where;
    expect(where.isVerified).toBe(true);
    expect(where.OR).toEqual([{ name: { equals: 'qa sheetla mata mandir', mode: 'insensitive' } }]);
  });

  it('returns an empty list, without querying temples, when no profile is approved', async () => {
    prismaMock.templeProfile.findMany.mockResolvedValue([]);
    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/donations/temples' });
    expect(res.json().temples).toEqual([]);
    expect(prismaMock.temple.findMany).not.toHaveBeenCalled();
  });
});
