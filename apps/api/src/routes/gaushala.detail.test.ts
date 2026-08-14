import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { gaushalaRoutes } from './gaushala.js';

// COM-07 (prod sweep 2026-08-12): /gaushala carries a strip headed "Verified
// gaushalas on Darshya — Approved gaushalas you can support directly", listing
// four real DB profiles, each linking to /gaushala/<uuid>. Every one 404s,
// because GET /api/v1/gaushala/:id resolved ONLY the hardcoded gs_001/2/3
// fixtures. Four onboarded partners had no reachable page and no way to
// receive a donation; the only clickable gaushalas were the fictional ones.

const OWNER_ID = '659a2081-0abe-444d-9cb7-ac06e4147cd6';
const PROFILE_ID = '69206fc0-9e9b-441a-a85f-b2d703b15afd';

const PROFILE = {
  id: PROFILE_ID,
  userId: OWNER_ID,
  gaushalaName: 'Shri Krishna Gaushala',
  address: 'Raman Reti, Vrindavan',
  city: 'Vrindavan',
  totalCows: 512,
  verified: true,
  description: 'ISKCON-affiliated cow shelter.',
  approved: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function makeApp() {
  const app = Fastify();
  void app.register(gaushalaRoutes, { prefix: '/api/v1/gaushala' });
  return app;
}

describe('GET /gaushala/:id — real profiles resolve (COM-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(null);
  });

  it('resolves an approved GaushalaProfile by its profile id', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(PROFILE as any);
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${PROFILE_ID}` });
    expect(res.statusCode).toBe(200);
    const g = res.json().gaushala;
    expect(g.name).toBe('Shri Krishna Gaushala');
    // The donate CTA needs the key donations are recorded against.
    expect(g.donationCauseId).toBe(OWNER_ID);
    expect(g.source).toBe('profile');
  });

  it('resolves by the owner user id too', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(PROFILE as any);
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${OWNER_ID}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().gaushala.donationCauseId).toBe(OWNER_ID);
  });

  it('does not invent cows a real profile has not listed', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(PROFILE as any);
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${PROFILE_ID}` });
    expect(res.json().gaushala.cows).toEqual([]);
  });

  it('still serves the legacy fixture ids', async () => {
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/gaushala/gs_001' });
    expect(res.statusCode).toBe(200);
    expect(res.json().gaushala.id).toBe('gs_001');
  });

  it('404s an id that is neither a fixture nor an approved profile', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/gaushala/00000000-0000-4000-8000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });

  it('does not leak an unapproved profile', async () => {
    // The route must ask for approved:true — an unapproved gaushala is not
    // "verified supply you can support directly".
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(null);
    const app = makeApp();
    await app.inject({ method: 'GET', url: `/api/v1/gaushala/${PROFILE_ID}` });
    const where = prismaMock.gaushalaProfile.findFirst.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ approved: true });
  });
});
