import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologyRoutes } from './astrology.js';
import { setAstrologerOnline } from '../services/astrologer.service.js';

/**
 * AW-02 (P0) — the OTHER half of the door.
 *
 * The previous pass closed `POST /consult/start` against the 15 invented
 * astrologers: a non-UUID id, or a UUID whose `AstrologerProfile` is not
 * approved, is refused 409 ASTROLOGER_NOT_BOOKABLE. That half is covered by
 * astrology-directory-real-supply.aw02.test.ts and is not re-tested here.
 *
 * What nothing covered is the half AW-02 actually asks for: that the astrologers
 * who DO exist can be consulted. They could not. The route gate demands an
 * approved `AstrologerProfile.id` and then handed that UUID to
 * `astrologyService.startConsultation`, whose only directory is the in-memory
 * fixture keyed `astro_001`..`astro_015`. A real profile id can never appear in
 * it, so every approved astrologer came back `{ error: 'Astrologer not found.' }`
 * → HTTP 400. The endpoint refused the fictional 15 AND the real 3: shut to
 * everyone, in both directions.
 *
 * The fixture array is LOAD-BEARING and is deliberately NOT deleted — it still
 * backs GET /specializations, astrologyService.getReviews and
 * getAstrologerByIdOrSlug, and `startConsultation` keeps its fixture lookup as
 * the fallback branch. Real supply is MERGED IN AHEAD of it, never in place of
 * it.
 */

const REAL_PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const REAL_USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';

const VEDIC = {
  id: REAL_PROFILE_ID,
  userId: REAL_USER_ID,
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

/** Names that exist ONLY in the fixture in apps/api/src/services/astrology.service.ts. */
const FIXTURE_NAMES = /Raghunath|Bhaskar Rao|Gopal Das|Ramesh Iyer|Priya Singh/;
/** Fixture ids are `astro_001`..`astro_015`. */
const FIXTURE_IDS = /astro_0\d\d/;

const DEMO_DEVOTEE = {
  id: '3f2a1b4c-5555-4666-8777-888899990000',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

// `demo-astro-token` maps to the `astro` handle → astro@demo.com
// (apps/api/src/middlewares/auth.ts:136). Give that seat the REAL astrologer's
// User UUID, which is what an onboarded astrologer authenticates as.
const DEMO_ASTROLOGER = {
  id: REAL_USER_ID,
  email: 'astro@demo.com',
  phone: null,
  fullName: 'Acharya Vinod Sharma',
  subscriptionTier: 'free',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(astrologyRoutes, { prefix: '/api/v1/astrology' });
  return app;
}

function startConsult(app: Awaited<ReturnType<typeof buildApp>>, mode = 'chat') {
  return app.inject({
    method: 'POST',
    url: '/api/v1/astrology/consult/start',
    headers: { authorization: 'Bearer demo-devotee-token' },
    payload: { astrologerId: REAL_PROFILE_ID, mode },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.astrologerProfile.findMany.mockResolvedValue([VEDIC]);
  prismaMock.astrologerProfile.findUnique.mockResolvedValue(VEDIC);
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string; id?: string } }) => {
    if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
    if (args.where.email === 'astro@demo.com') return DEMO_ASTROLOGER;
    return null;
  });
  // The astrologer has pressed "go online" in their portal.
  setAstrologerOnline(REAL_USER_ID, true, { chat: true, call: true });
});

afterEach(() => {
  setAstrologerOnline(REAL_USER_ID, false);
  vi.restoreAllMocks();
});

describe('AW-02 — an approved astrologer can actually be consulted', () => {
  it('opens a session against a real approved AstrologerProfile', async () => {
    const app = await buildApp();
    const res = await startConsult(app);
    expect(
      res.statusCode,
      `expected a session, got ${res.statusCode} ${res.body}`,
    ).toBe(200);
    await app.close();
  });

  it('names the real astrologer and charges their own rate', async () => {
    const app = await buildApp();
    const res = await startConsult(app);
    const session = res.json().session;
    expect(session.astrologerName).toBe('Acharya Vinod Sharma');
    expect(session.perMinuteRate).toBe(25);
    expect(session.astrologerId).toBe(REAL_PROFILE_ID);
    expect(session.status).toBe('waiting');
    await app.close();
  });

  it('borrows nothing from the invented directory', async () => {
    const app = await buildApp();
    const res = await startConsult(app);
    expect(res.body).not.toMatch(FIXTURE_NAMES);
    expect(res.body).not.toMatch(FIXTURE_IDS);
    await app.close();
  });

  it('the session reaches the astrologer whose profile it was booked against', async () => {
    const app = await buildApp();
    const started = await startConsult(app);
    const sessionId = started.json().session?.sessionId;
    expect(sessionId, 'no session was created').toBeTruthy();

    // The astrologer signs in as themselves: currentUser.id is the User UUID,
    // while /consult/start was addressed with the AstrologerProfile id. A
    // session the astrologer cannot see is a guaranteed no-show.
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/consultations?role=astrologer',
      headers: { authorization: 'Bearer demo-astro-token' },
    });
    expect(list.statusCode).toBe(200);
    const ids = (list.json().consultations as Array<{ id: string }>).map((c) => c.id);
    expect(ids, 'the astrologer cannot see the consultation booked with them').toContain(sessionId);
    await app.close();
  });
});

describe('AW-02 — an approved astrologer who is offline is refused honestly', () => {
  it('says they are offline rather than that they do not exist', async () => {
    setAstrologerOnline(REAL_USER_ID, false);
    const app = await buildApp();
    const res = await startConsult(app);
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.code).toBe('ASTROLOGER_OFFLINE');
    // "Astrologer not found." was the old answer for a real, approved, merely
    // offline astrologer — the same sentence an id that names nobody gets.
    expect(res.body).not.toMatch(/not found/i);
    await app.close();
  });
});

describe('AW-02 — the fixture directory is still load-bearing, not deleted', () => {
  it('startConsultation still resolves a fixture slug when called directly', async () => {
    const { astrologyService } = await import('../services/astrology.service.js');
    const anyOnline = astrologyService
      .getAstrologers({ limit: 100 })
      .astrologers.find((a) => a.isOnline && !a.isBusy);
    expect(anyOnline, 'the fixture directory has been emptied').toBeTruthy();
    const out = astrologyService.startConsultation('u1', anyOnline!.id, 'chat');
    expect('error' in out, `fixture path broke: ${JSON.stringify(out)}`).toBe(false);
  });
});
