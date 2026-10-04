/**
 * POST /donations/create-order must refuse an approved-but-junk gaushala
 * (no Razorpay order, no donations row), and keep working for a good one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { donationRoutes } from './donations.js';
import { resolveGaushalaDonee } from '../lib/gaushala-donee.js';

const DEVOTEE = {
  id: '99999999-9999-4999-8999-999999999999',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};
const OWNER_ID = '03edd2ff-4479-48f3-9ad1-6940e5558a4d';
const PROFILE_ID = '69206fc0-9e9b-441a-a85f-b2d703b15afd';

const JUNK = {
  id: PROFILE_ID,
  userId: OWNER_ID,
  gaushalaName: 'saharanpur',
  description: 'skkss',
  address: 'ssdwdqe',
  approved: true,
};
const GOOD = {
  id: PROFILE_ID,
  userId: OWNER_ID,
  gaushalaName: 'Shri Krishna Gaushala',
  description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.',
  address: 'Vrindavan Road, Mathura',
  approved: true,
};

describe('resolveGaushalaDonee quality gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses an approved junk profile as not_onboarded', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(JUNK as never);
    expect(await resolveGaushalaDonee(PROFILE_ID)).toEqual({ ok: false, reason: 'not_onboarded' });
  });

  it('resolves a good profile unchanged', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(GOOD as never);
    const r = await resolveGaushalaDonee(PROFILE_ID);
    expect(r).toEqual({
      ok: true,
      donee: { doneeUserId: OWNER_ID, profileId: PROFILE_ID, gaushalaName: 'Shri Krishna Gaushala' },
    });
  });
});

describe('POST /donations/create-order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    prismaMock.user.findUnique.mockResolvedValue(DEVOTEE as never);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
    prismaMock.$queryRawUnsafe.mockResolvedValue([] as never);
  });

  async function createOrder() {
    const app = Fastify({ logger: false });
    await app.register(donationRoutes, { prefix: '/api/v1/donations' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/donations/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { causeKind: 'gaushala', gaushalaId: PROFILE_ID, amountInr: 501 },
    });
    await app.close();
    return res;
  }

  it('refuses an order for a junk approved gaushala with 400 and writes nothing', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(JUNK as never);

    const res = await createOrder();

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('gaushala_not_onboarded');
    const inserted = prismaMock.$executeRawUnsafe.mock.calls.some((c) =>
      String(c[0]).includes('INSERT INTO donations'),
    );
    expect(inserted).toBe(false);
  });

  it('accepts an order for a good gaushala', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(GOOD as never);

    const res = await createOrder();

    expect(res.statusCode).toBe(200);
  });
});
