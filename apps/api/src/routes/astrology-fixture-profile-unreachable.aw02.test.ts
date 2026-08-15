import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologyRoutes } from './astrology.js';

/**
 * AW-02 (2026-08-12, P0) — the last consumer-reachable door onto the fixture.
 *
 * apps/api/src/services/astrology.service.ts still holds a 15-row in-memory
 * directory ('astro_001'..'astro_015': invented names, invented ratings,
 * invented review counts) because GET /astrology/astrologers still serves it
 * and packages/api-client's useAstrologers reads that list. What was NOT
 * defensible is that GET /astrology/astrologers/:id ALSO answered for those
 * slugs: /astrology/view?id=astro_001 rendered "Pt. Raghunath Sharma" as a real
 * profile, and /astrology/astro_001/book fetched the same endpoint and drew a
 * live "Pay & Start Consultation" button — over a person who does not exist.
 *
 * POST /consultation/book already refuses any astrologer id that is not an
 * approved AstrologerProfile (409 ASTROLOGER_NOT_BOOKABLE). The profile and
 * review endpoints now agree with it: an id the platform cannot sell is an id
 * the platform will not describe.
 *
 * The 409 booking guard is deliberately NOT touched here; it is asserted
 * unchanged by consultation-real-astrologer.test.ts.
 */

const REAL_PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const REAL_USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';

const APPROVED_PROFILE = {
  id: REAL_PROFILE_ID,
  userId: REAL_USER_ID,
  displayName: 'Acharya Vinod Sharma',
  specialties: ['Vedic', 'Kundali'],
  languages: ['Hindi', 'English'],
  experience: 22,
  rating: 0,
  totalConsultations: 2,
  pricePerMinute: 25,
  bio: 'Vedic astrologer.',
  approved: true,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(astrologyRoutes, { prefix: '/api/v1/astrology' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.astrologerProfile.findUnique.mockResolvedValue(APPROVED_PROFILE);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-02 — the fixture astrologers are not describable as real people', () => {
  it('404s the profile of a fixture slug instead of returning an invented person', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/astrology/astrologers/astro_001' });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toMatch(/Raghunath/);
    await app.close();
  });

  it('404s every fixture slug, not just the first', async () => {
    const app = await buildApp();
    for (const slug of ['astro_002', 'astro_007', 'astro_015']) {
      const res = await app.inject({ method: 'GET', url: `/api/v1/astrology/astrologers/${slug}` });
      expect(res.statusCode).toBe(404);
    }
    await app.close();
  });

  it('404s the fixture reviews — invented testimonials for an invented person', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/astrologers/astro_001/reviews',
    });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toMatch(/Priya|Rohit|Sneha/);
    await app.close();
  });

  it('still serves a REAL approved AstrologerProfile by uuid', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/astrology/astrologers/${REAL_PROFILE_ID}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.astrologer.name).toBe('Acharya Vinod Sharma');
    expect(body.astrologer.source).toBe('live');
    await app.close();
  });

  it('still 404s a uuid whose profile is not approved', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({
      ...APPROVED_PROFILE,
      approved: false,
    });
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/astrology/astrologers/${REAL_PROFILE_ID}`,
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('answers an empty review list for a real astrologer rather than borrowing fixture reviews', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/astrology/astrologers/${REAL_PROFILE_ID}/reviews`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ reviews: [], total: 0 });
    await app.close();
  });

  it('does not disturb GET /astrologers/live', async () => {
    prismaMock.astrologerProfile.findMany.mockResolvedValue([APPROVED_PROFILE]);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/astrology/astrologers/live' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ total: 1, source: 'live' });
    await app.close();
  });
});
