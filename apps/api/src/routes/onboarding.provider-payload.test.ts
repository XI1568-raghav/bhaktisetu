import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsertProviderProfile = vi.fn(async () => ({ role: 'PANDIT', profileId: 'p1' }));
vi.mock('../services/onboarding.service.js', () => ({
  onboardingService: { upsertProviderProfile: (...a: unknown[]) => upsertProviderProfile(...(a as [])) },
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
