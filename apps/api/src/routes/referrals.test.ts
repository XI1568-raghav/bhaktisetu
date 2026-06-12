import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { referralsRoutes } from './referrals.js';

// Tier-2 of R-Q2-M-011. Mounts referralsRoutes under /api/v1/referrals,
// exercises 6 path: GET /me unauth → 401; POST /claim self-ref → 400;
// POST /claim happy path 201; POST /claim duplicate → 200 alreadyClaimed;
// POST /reward happy path → wallet credited; GET /me returns stats.
//
// Demo-token auth: 'demo-devotee' / 'demo-pandit' map to seeded users via
// prisma.user.findUnique({ where: { email: 'devotee@demo.com' } }). We mock
// that lookup to return synthetic user records — no DB needed.

const DEMO_DEVOTEE = {
  id: 'user-demo-devotee-1',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const DEMO_PANDIT = {
  id: 'user-demo-pandit-1',
  email: 'pandit@demo.com',
  phone: null,
  fullName: 'Demo Pandit',
  subscriptionTier: 'free',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await referralsRoutes(instance);
  }, { prefix: '/api/v1/referrals' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: demo token → devotee. Override per-test.
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
    if (args.where.email === 'pandit@demo.com') return DEMO_PANDIT;
    return null;
  });
  process.env.NODE_ENV = 'test'; // enables demo-token bypass in auth middleware
});

describe('GET /api/v1/referrals/me', () => {
  it('401 without auth header', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/referrals/me' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns derived code + zero-claim stats for new demo user', async () => {
    prismaMock.referralCode.upsert.mockResolvedValueOnce({
      code: 'ABC1234',
      createdAt: new Date('2026-06-12T00:00:00Z'),
    });
    prismaMock.referralClaim.count.mockResolvedValue(0);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/referrals/me',
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.code).toBe('ABC1234');
    expect(body.stats).toEqual({ totalClaims: 0, rewardedClaims: 0 });
    expect(body.rewardPerSide).toEqual({ amount: 100, currency: 'INR' });
    await app.close();
  });
});

describe('POST /api/v1/referrals/claim', () => {
  it('400 on self-referral (referrer code maps to caller)', async () => {
    prismaMock.referralCode.findUnique.mockResolvedValueOnce({
      id: 'code-1',
      userId: DEMO_DEVOTEE.id, // same as caller
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/claim',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({ code: 'SELFCODE' }),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'self_referral_not_allowed' });
    await app.close();
  });

  it('404 on unknown code', async () => {
    prismaMock.referralCode.findUnique.mockResolvedValueOnce(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/claim',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({ code: 'NOPEXYZ' }),
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('happy path: 201 + signed_up status on first claim', async () => {
    prismaMock.referralCode.findUnique.mockResolvedValueOnce({
      id: 'code-1',
      userId: DEMO_PANDIT.id, // different user = legal claim
    });
    prismaMock.referralClaim.findFirst.mockResolvedValueOnce(null); // no prior claim
    prismaMock.referralClaim.create.mockResolvedValueOnce({
      id: 'claim-new-1',
      status: 'signed_up',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/claim',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({ code: 'PANDITSC' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ status: 'signed_up', claimed: true });
    expect(prismaMock.referralClaim.create).toHaveBeenCalled();
    await app.close();
  });

  it('idempotent: duplicate referrer+referee pair returns existing claim, no double create', async () => {
    prismaMock.referralCode.findUnique.mockResolvedValueOnce({
      id: 'code-1',
      userId: DEMO_PANDIT.id,
    });
    prismaMock.referralClaim.findFirst.mockResolvedValueOnce({
      id: 'claim-existing-1',
      status: 'qualifying',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/claim',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({ code: 'PANDITSC' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'qualifying', alreadyClaimed: true });
    expect(prismaMock.referralClaim.create).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('POST /api/v1/referrals/reward', () => {
  it('credits referrer wallet ₹100 and flips claim to rewarded', async () => {
    // Claim owned by demo devotee as referee.
    prismaMock.referralClaim.findUnique.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'qualifying',
      referrerId: DEMO_PANDIT.id,
      refereeId: DEMO_DEVOTEE.id,
      rewardLedgerId: null,
    });
    // Wallet path: no idempotency hit + transaction credits referrer.
    prismaMock.creditLedgerEntry.findUnique.mockResolvedValueOnce(null);
    prismaMock.userCredit.upsert.mockResolvedValueOnce({
      id: 'credit-pandit-1',
      userId: DEMO_PANDIT.id,
      balancePaise: 10000,
    });
    prismaMock.creditLedgerEntry.create.mockResolvedValueOnce({ id: 'ledger-1' });
    prismaMock.referralClaim.update.mockResolvedValueOnce({ id: 'claim-1' });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/reward',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({
        claimId: '00000000-0000-0000-0000-000000000001',
        bookingId: '00000000-0000-0000-0000-000000000002',
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.status).toBe('rewarded');
    expect(body.rewardPaise).toBe(10000);
    expect(body.newBalancePaise).toBe(10000);
    expect(body.reused).toBe(false);
    expect(prismaMock.referralClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        data: expect.objectContaining({
          status: 'rewarded',
          rewardLedgerId: 'ledger-1',
        }),
      }),
    );
    await app.close();
  });

  it('idempotent: already-rewarded claim returns existing ledger, skips wallet write', async () => {
    prismaMock.referralClaim.findUnique.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'rewarded',
      referrerId: DEMO_PANDIT.id,
      refereeId: DEMO_DEVOTEE.id,
      rewardLedgerId: 'ledger-prior-1',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/reward',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({
        claimId: '00000000-0000-0000-0000-000000000001',
        bookingId: '00000000-0000-0000-0000-000000000002',
      }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'rewarded',
      alreadyRewarded: true,
      ledgerId: 'ledger-prior-1',
    });
    expect(prismaMock.userCredit.upsert).not.toHaveBeenCalled();
    await app.close();
  });
});
