import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologyRoutes } from './astrology.js';

/**
 * AW-02 (P0) — the LAST door that still sold the 15 invented astrologers.
 *
 * The earlier pass closed the web funnel (AstrologyClient reads
 * /astrologers/live), the profile page, the reviews endpoint and the booking
 * endpoint (409 ASTROLOGER_NOT_BOOKABLE). It deliberately left
 * `GET /astrology/astrologers` on the in-memory fixture, recording the reason
 * in astrology-fixture-profile-unreachable.aw02.test.ts:14-17 — "GET
 * /astrology/astrologers still serves it and packages/api-client's
 * useAstrologers reads that list".
 *
 * That list is not unread. packages/api-client/src/hooks/providers.ts:35
 * (`useAstrologers`) is the ONLY astrologer source the Expo app has:
 *   - apps/mobile/app/(devotee)/astrology.tsx:186 prints
 *     "Astrology Services • {n} astrologers online" straight off `total`;
 *   - apps/mobile/app/(astrologer)/profile.tsx:24 looks the SIGNED-IN
 *     astrologer up inside that same list, so a genuinely onboarded astrologer
 *     never finds themselves and is shown invented fallback rates instead.
 * So the app advertises 15 astrologers who do not exist while the 3 real
 * approved profiles are invisible — the exact sentence of AW-02, one client
 * over.
 *
 * The fixture array itself is LOAD-BEARING and is NOT deleted: it still backs
 * GET /specializations, astrologyService.getReviews and
 * getAstrologerByIdOrSlug. Only the consumer-facing directory route is rebound
 * to real supply.
 */

const REAL_PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const SECOND_PROFILE_ID = 'c0ffee00-1111-4222-8333-444455556666';

const VEDIC = {
  id: REAL_PROFILE_ID,
  userId: 'ba87a424-e9d2-44f1-92a9-996441b31131',
  displayName: 'Acharya Vinod Sharma',
  specialties: ['Vedic', 'Kundali'],
  languages: ['Hindi', 'English'],
  experience: 22,
  rating: 4.2,
  totalConsultations: 2,
  pricePerMinute: 25,
  bio: 'Vedic astrologer.',
  approved: true,
};

const TAROT = {
  id: SECOND_PROFILE_ID,
  userId: 'd1d1d1d1-2222-4333-8444-555566667777',
  displayName: 'Ritika Menon',
  specialties: ['Tarot'],
  languages: ['English', 'Malayalam'],
  experience: 9,
  rating: 4.8,
  totalConsultations: 11,
  pricePerMinute: 18,
  bio: 'Tarot reader.',
  approved: true,
};

/** Names that only exist in apps/api/src/services/astrology.service.ts. */
const FIXTURE_NAMES = /Raghunath|Bhaskar Rao|Gopal Das|Ramesh Iyer|Priya Singh/;
/** Fixture ids are `astro_001`..`astro_015`. */
const FIXTURE_IDS = /astro_0\d\d/;

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(astrologyRoutes, { prefix: '/api/v1/astrology' });
  return app;
}

const DEMO_DEVOTEE = {
  id: '3f2a1b4c-5555-4666-8777-888899990000',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.astrologerProfile.findMany.mockResolvedValue([VEDIC, TAROT]);
  prismaMock.astrologerProfile.findUnique.mockResolvedValue(null);
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'devotee@demo.com' ? DEMO_DEVOTEE : null,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-02 — GET /astrologers is bound to real supply', () => {
  it('lists the approved AstrologerProfile rows, not the invented directory', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/astrology/astrologers' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.astrologers.map((a: { name: string }) => a.name)).toEqual([
      'Ritika Menon',
      'Acharya Vinod Sharma',
    ]);
    expect(res.body).not.toMatch(FIXTURE_NAMES);
    expect(res.body).not.toMatch(FIXTURE_IDS);
    await app.close();
  });

  it('reads the DB rather than answering from memory', async () => {
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/api/v1/astrology/astrologers' });
    expect(prismaMock.astrologerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { approved: true } }),
    );
    await app.close();
  });

  it('says zero when no astrologer is approved instead of inventing fifteen', async () => {
    prismaMock.astrologerProfile.findMany.mockResolvedValue([]);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/astrology/astrologers' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(0);
    expect(body.astrologers).toEqual([]);
    await app.close();
  });

  it('keeps the paginated envelope its clients read', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/astrologers?page=1&limit=1',
    });
    const body = res.json();
    expect(body).toMatchObject({ total: 2, page: 1, limit: 1, totalPages: 2 });
    expect(body.astrologers).toHaveLength(1);
    await app.close();
  });

  it('filters and sorts real rows the way the query contract promises', async () => {
    const app = await buildApp();

    const bySpec = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/astrologers?specialization=tarot',
    });
    expect(bySpec.json().astrologers.map((a: { name: string }) => a.name)).toEqual(['Ritika Menon']);

    const byLang = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/astrologers?language=malayalam',
    });
    expect(byLang.json().astrologers.map((a: { name: string }) => a.name)).toEqual(['Ritika Menon']);

    const byPrice = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/astrologers?priceRange=20-40',
    });
    expect(byPrice.json().astrologers.map((a: { name: string }) => a.name)).toEqual([
      'Acharya Vinod Sharma',
    ]);

    const byCheapest = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/astrologers?sort=price',
    });
    expect(byCheapest.json().astrologers.map((a: { perMinuteRate: number }) => a.perMinuteRate)).toEqual([
      18, 25,
    ]);

    await app.close();
  });

  it('reports nobody online while every real astrologer is offline', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/astrologers?online=true',
    });
    expect(res.json().total).toBe(0);
    await app.close();
  });
});

describe('AW-02 — POST /consult/start refuses an astrologer nobody can deliver', () => {
  it('409s a fixture slug instead of opening a session with an invented person', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/consult/start',
      headers: { authorization: 'Bearer demo-devotee-token' },
      payload: { astrologerId: 'astro_001', mode: 'chat' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.body).not.toMatch(FIXTURE_NAMES);
    expect(res.json().code).toBe('ASTROLOGER_NOT_BOOKABLE');
    await app.close();
  });

  it('409s a uuid whose profile is not approved', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({ ...VEDIC, approved: false });
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/consult/start',
      headers: { authorization: 'Bearer demo-devotee-token' },
      payload: { astrologerId: REAL_PROFILE_ID, mode: 'chat' },
    });
    expect(res.statusCode).toBe(409);
    await app.close();
  });
});

describe('AW-02 — the real directory is not disturbed', () => {
  it('GET /astrologers/live still answers with source=live', async () => {
    prismaMock.astrologerProfile.findMany.mockResolvedValue([VEDIC]);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/astrology/astrologers/live' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ total: 1, source: 'live' });
    await app.close();
  });

  it('the fixture array is still reachable where it is load-bearing', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/astrology/specializations' });
    expect(res.statusCode).toBe(200);
    expect(res.json().specializations.length).toBeGreaterThan(0);
    await app.close();
  });
});
