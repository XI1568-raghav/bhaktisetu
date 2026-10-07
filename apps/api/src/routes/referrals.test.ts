import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// The programme switch is false in production (lib/referral-flag.ts). These tests cover the
// ownership/payment checks inside /reward for when it is turned on, so the flag is mocked true
// by default; the "flag off" block at the end flips it back.
const flag = vi.hoisted(() => ({ on: true }));
vi.mock('../lib/referral-flag.js', () => ({
  get HAS_REFERRAL_CREDIT() {
    return flag.on;
  },
}));

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
  flag.on = true;
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
    prismaMock.pujaBooking.findFirst.mockResolvedValueOnce({ id: 'paid-booking' });
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

  it('refuses to reward a booking that is not the referee\'s paid booking (no free credit)', async () => {
    prismaMock.referralClaim.findUnique.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'signed_up',
      referrerId: DEMO_PANDIT.id,
      refereeId: DEMO_DEVOTEE.id,
      rewardLedgerId: null,
    });
    prismaMock.pujaBooking.findFirst.mockResolvedValueOnce(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/reward',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({
        claimId: '00000000-0000-0000-0000-000000000001',
        bookingId: '11111111-1111-4111-8111-111111111111',
      }),
    });
    expect(res.statusCode).toBe(409);
    expect(prismaMock.userCredit.upsert).not.toHaveBeenCalled();
    expect(prismaMock.referralClaim.update).not.toHaveBeenCalled();
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

  // R-Q1-P-006 — credit-applied-once-per-referee guard.
  //
  // Two concurrent /reward calls for the SAME claim (e.g. user double-clicks
  // the confirmation page or webhook retries) must produce exactly ONE wallet
  // credit. The first call flips status='rewarded' + writes ledger entry;
  // the second call sees status='rewarded' on findUnique and short-circuits
  // to the alreadyRewarded branch — userCredit.upsert is NEVER called twice.
  it('credit-applied-once-per-referee: second /reward call for same claim is no-op (no double credit)', async () => {
    const CLAIM_ID = '00000000-0000-0000-0000-000000000010';
    const BOOKING_ID = '00000000-0000-0000-0000-000000000011';

    // First call: claim status is qualifying → wallet credited, status flips.
    prismaMock.referralClaim.findUnique.mockResolvedValueOnce({
      id: CLAIM_ID,
      status: 'qualifying',
      referrerId: DEMO_PANDIT.id,
      refereeId: DEMO_DEVOTEE.id,
      rewardLedgerId: null,
    });
    prismaMock.pujaBooking.findFirst.mockResolvedValueOnce({ id: 'paid-booking' });
    prismaMock.creditLedgerEntry.findUnique.mockResolvedValueOnce(null);
    prismaMock.userCredit.upsert.mockResolvedValueOnce({
      id: 'credit-pandit-2',
      userId: DEMO_PANDIT.id,
      balancePaise: 10000,
    });
    prismaMock.creditLedgerEntry.create.mockResolvedValueOnce({ id: 'ledger-first-call' });
    prismaMock.referralClaim.update.mockResolvedValueOnce({ id: CLAIM_ID });

    const app = await buildApp();
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/reward',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({ claimId: CLAIM_ID, bookingId: BOOKING_ID }),
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ status: 'rewarded', reused: false });
    expect(prismaMock.userCredit.upsert).toHaveBeenCalledTimes(1);

    // Second call: claim is now status='rewarded' → short-circuit.
    prismaMock.referralClaim.findUnique.mockResolvedValueOnce({
      id: CLAIM_ID,
      status: 'rewarded',
      referrerId: DEMO_PANDIT.id,
      refereeId: DEMO_DEVOTEE.id,
      rewardLedgerId: 'ledger-first-call',
    });

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/reward',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({ claimId: CLAIM_ID, bookingId: BOOKING_ID }),
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      status: 'rewarded',
      alreadyRewarded: true,
      ledgerId: 'ledger-first-call',
    });
    // Guard assertion: wallet upsert was NOT called a second time.
    expect(prismaMock.userCredit.upsert).toHaveBeenCalledTimes(1);
    // And the claim was NOT updated again (no second status flip).
    expect(prismaMock.referralClaim.update).toHaveBeenCalledTimes(1);
    await app.close();
  });
});

describe('POST /api/v1/referrals/reward while HAS_REFERRAL_CREDIT is false', () => {
  it('answers 404 referral_credit_unavailable and never reads a claim or touches the wallet', async () => {
    flag.on = false;
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals/reward',
      headers: { authorization: 'Bearer demo-devotee', 'content-type': 'application/json' },
      payload: JSON.stringify({
        claimId: '11111111-1111-4111-8111-111111111111',
        bookingId: '22222222-2222-4222-8222-222222222222',
      }),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'referral_credit_unavailable' });
    expect(prismaMock.referralClaim.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.userCredit.upsert).not.toHaveBeenCalled();
    expect(prismaMock.referralClaim.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('still answers 401 without a token (the gate sits behind auth)', async () => {
    flag.on = false;
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/referrals/reward', payload: {} });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('keeps GET /me working so stored referral data is untouched', async () => {
    flag.on = false;
    prismaMock.referralCode.upsert.mockResolvedValueOnce({ code: 'ABC1234', createdAt: new Date('2026-06-12T00:00:00Z') });
    prismaMock.referralClaim.count.mockResolvedValue(0);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/referrals/me', headers: { authorization: 'Bearer demo-devotee' } });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
