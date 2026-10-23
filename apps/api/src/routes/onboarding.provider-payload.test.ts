import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsertProviderProfile = vi.fn(async () => ({ role: 'PANDIT', profileId: 'p1' }));
vi.mock('../services/onboarding.service.js', () => ({
  onboardingService: {
    upsertProviderProfile: (...a: unknown[]) => upsertProviderProfile(...(a as [])),
    describeListing: async () => ({ listed: false, approvalRequired: false, missing: ['price'], message: 'Your portal is active. Add your price and details to be listed.' }),
  },
}));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'user-uuid-1', roles: ['DEVOTEE'] };
  },
}));

import Fastify from 'fastify';
import { onboardingRoutes } from './onboarding.js';

async function post(data: Record<string, unknown>) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => onboardingRoutes(i), { prefix: '/api/v1/onboarding' });
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/onboarding/provider',
    payload: { role: 'PANDIT', data },
    headers: { authorization: 'Bearer real-token', 'content-type': 'application/json' },
  });
  await app.close();
  return res;
}

describe('POST /onboarding/provider — pandit payload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts null for blank optional fields (the form sends null)', async () => {
    const res = await post({
      templeName: null, experience: 15, specialties: ['Rudrabhishek'], languages: [],
      city: 'Hyderabad', state: null, bio: null, pricePerPuja: 500,
    });
    expect(res.statusCode).toBe(200);
    expect(upsertProviderProfile).toHaveBeenCalledTimes(1);
  });

  it("accepts the caller's own uploaded document keys", async () => {
    const res = await post({
      experience: 3, pricePerPuja: 500,
      aadhaarDocKey: 'kyc-document/user-uuid-1/1-a.pdf',
      certificateDocKey: 'kyc-document/user-uuid-1/2-b.png',
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects another user's document key", async () => {
    const res = await post({
      experience: 3, pricePerPuja: 500,
      aadhaarDocKey: 'kyc-document/someone-else/1-a.pdf',
    });
    expect(res.statusCode).toBe(400);
    expect(upsertProviderProfile).not.toHaveBeenCalled();
  });

  it('rejects a document key that climbs out of the caller\'s own prefix', async () => {
    const res = await post({
      experience: 3, pricePerPuja: 500,
      aadhaarDocKey: 'kyc-document/user-uuid-1/../victim-id/1-a.pdf',
    });
    expect(res.statusCode).toBe(400);
    expect(upsertProviderProfile).not.toHaveBeenCalled();
  });

  it('rejects a non-http photoUrl (javascript: was stored as the avatar)', async () => {
    const res = await post({ experience: 3, pricePerPuja: 500, photoUrl: 'javascript:alert(1)' });
    expect(res.statusCode).toBe(400);
    expect(upsertProviderProfile).not.toHaveBeenCalled();
  });

  it('still accepts an https photoUrl', async () => {
    const res = await post({ experience: 3, pricePerPuja: 500, photoUrl: 'https://cdn.example.com/p.png' });
    expect(res.statusCode).toBe(200);
  });
});

describe('POST /onboarding/provider — inspect at attach', () => {
  it('refuses an empty / mislabelled KYC document and an unreachable store', async () => {
    vi.clearAllMocks();
    const inspect = await import('../lib/upload-inspect.js');
    const spy = vi.spyOn(inspect, 'inspectPrivateDocument');
    const base = { templeName: null, experience: 1, specialties: [], languages: [], city: 'X', state: null, bio: null, pricePerPuja: 500 };
    const key = 'kyc-document/user-uuid-1/1-abc.pdf';

    spy.mockResolvedValueOnce({ ok: false, reason: 'empty' });
    let res = await post({ ...base, aadhaarDocKey: key });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/empty/);

    spy.mockResolvedValueOnce({ ok: false, reason: 'wrong_type' });
    res = await post({ ...base, aadhaarDocKey: key });
    expect(res.statusCode).toBe(400);

    spy.mockResolvedValueOnce({ ok: false, reason: 'unreachable' });
    res = await post({ ...base, aadhaarDocKey: key });
    expect(res.statusCode).toBe(503);
    expect(upsertProviderProfile).not.toHaveBeenCalled();

    spy.mockResolvedValueOnce({ ok: true });
    res = await post({ ...base, aadhaarDocKey: key });
    expect(res.statusCode).toBe(200);
    spy.mockRestore();
  });
});


describe('POST /onboarding/provider — registration does not require a price', () => {
  beforeEach(() => vi.clearAllMocks());

  async function postRole(role: string, data: Record<string, unknown>) {
    const app = Fastify({ logger: false });
    await app.register(async (i) => onboardingRoutes(i), { prefix: '/api/v1/onboarding' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/provider',
      payload: { role, data },
      headers: { authorization: 'Bearer real-token', 'content-type': 'application/json' },
    });
    await app.close();
    return res;
  }

  it.each([
    ['PANDIT', { experience: 4, specialties: ['Satyanarayan Puja'] }],
    ['ASTROLOGER', { displayName: 'Acharya X', experience: 2, specialties: ['Vedic'] }],
    ['WELLNESS_INSTRUCTOR', { displayName: 'Yogi Y', experience: 1, specialties: ['Yoga'] }],
  ])('%s: accepted with no price (the signup form sends none)', async (role, data) => {
    const res = await postRole(role, data);
    expect(res.statusCode).toBe(200);
    expect(upsertProviderProfile).toHaveBeenCalledTimes(1);
    const body = res.json();
    expect(body.listing.message).toMatch(/portal is active/i);
    expect(JSON.stringify(body)).not.toMatch(/pending approval|awaiting approval|submitted for review/i);
  });

  it('a price that IS sent is still range-checked', async () => {
    expect((await postRole('PANDIT', { experience: 4, pricePerPuja: 5 })).statusCode).toBe(400);
    expect((await postRole('ASTROLOGER', { displayName: 'A B', experience: 1, pricePerMinute: 0 })).statusCode).toBe(400);
  });

  it('a blank price from a form is treated as absent', async () => {
    expect((await postRole('PANDIT', { experience: 4, pricePerPuja: '' })).statusCode).toBe(200);
    expect((await postRole('ASTROLOGER', { displayName: 'A B', experience: 1, pricePerMinute: null })).statusCode).toBe(200);
  });
});
