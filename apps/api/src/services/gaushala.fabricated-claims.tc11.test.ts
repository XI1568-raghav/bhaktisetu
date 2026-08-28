import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { GaushalaService } from './gaushala.service.js';
import { gaushalaRoutes } from '../routes/gaushala.js';

/**
 * TC-11 — the API half of the gaushala verification claims.
 *
 * apps/web stopped asserting that every listed gaushala is personally verified
 * with complete financial transparency, and app/gaushala/[id]/page.tsx now
 * carries a rendered "This is a sample listing" disclosure over its fixtures.
 * The API went on serving the claims the web pages had just stopped making:
 *
 *  - Five sample rows headed "Real organizations with verified details", each
 *    with `isVerified: true`. Nothing in the product verifies a gaushala. The
 *    only real approval path — admin.service, gaushala-portal, onboarding,
 *    auth, gaushala-cows — sets `approved`, never `verified`.
 *
 *  - An `affiliation` badge on each: "ISKCON-affiliated", "Government
 *    Registered", "Shri Saibaba Sansthan Trust affiliated", "Organic Products
 *    Certified", "Nationally Recognized Model Gaushala". These name REAL
 *    third-party organisations and assert an endorsement relationship with
 *    them, and every one was typed into the fixture.
 *
 *  - A `contactPhone` and `contactEmail` per row — "+91 9876543210" and the
 *    like. Publishing invented contact details under a real charity's name is
 *    the one entry here that can route a devotee to a stranger.
 *
 *  - Five cows marked adopted by "Rajesh Kumar", "Priya Sharma", "Amit
 *    Agarwal", "Sunita Devi", "Ganesh Patil" and "Dr. Rakesh Mishra" —
 *    invented donors, rendered by the detail page as "This cow has been
 *    adopted by {name}". They also suppress `availableCows`, so the fabricated
 *    donors make real supply look scarcer than it is.
 *
 *  - GET /gaushala/:id echoed `verified: profile.verified` for real DB rows.
 *    `GaushalaProfile.verified` is written by NOTHING (verified by grepping
 *    every write path: gaushala-portal.ts:152/:163, admin.service.ts:694/:748,
 *    onboarding.service.ts:302, auth.ts:1279, gaushala-cows.ts:35 — all set
 *    `approved`), so the field could only ever be `false`, and a client that
 *    trusted it would be reading a verification signal the product cannot
 *    produce.
 *
 * Every assertion below was confirmed RED against the service and route as
 * they stood before this fix.
 */

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

describe('TC-11 — the sample roster asserts nothing the product cannot back', () => {
  const service = new GaushalaService();

  it('has a roster at all, so the assertions below are not vacuous', () => {
    expect(service.getGaushalas().length).toBeGreaterThan(0);
    expect(service.getCows().length).toBeGreaterThan(0);
  });

  it('claims no gaushala is verified, because nothing verifies one', () => {
    for (const gs of service.getGaushalas()) {
      expect(gs.isVerified, `${gs.id} still claims verification`).toBe(false);
    }
  });

  it('awards no affiliation badge naming a real third-party organisation', () => {
    for (const gs of service.getGaushalas()) {
      expect(gs.affiliation, `${gs.id} still publishes an affiliation badge`).toBe('');
    }
  });

  it('publishes no invented phone number or email under a real charity name', () => {
    for (const gs of service.getGaushalas()) {
      expect(gs.contactPhone, `${gs.id} still publishes a contact phone`).toBe('');
      expect(gs.contactEmail, `${gs.id} still publishes a contact email`).toBe('');
    }
  });

  it('names no adopter who does not exist', () => {
    for (const cow of service.getCows()) {
      expect(cow.adopterName, `${cow.id} still names an adopter`).toBeNull();
    }
  });

  it('counts every sample cow as available, since no real adoption happened', () => {
    // The five fabricated adoptions were also arithmetic: getGaushalas derives
    // availableCows from `!isAdopted`, so invented donors made real supply look
    // scarcer. Un-adopting them has to move that number, not just the label.
    for (const cow of service.getCows()) {
      expect(cow.isAdopted, `${cow.id} is still marked adopted`).toBe(false);
    }
    for (const gs of service.getGaushalas()) {
      expect(gs.availableCows).toBe(gs.cowsListed);
    }
  });
});

describe('TC-11 — GET /gaushala/:id publishes no unwritable verification flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(null);
  });

  it('omits `verified` from a real profile response', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(PROFILE as never);
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${PROFILE_ID}` });
    expect(res.statusCode).toBe(200);
    const g = res.json().gaushala;
    // Not merely false — absent. A `verified: false` on a gaushala the admin
    // HAS approved reads as "we checked and it failed", which is worse than
    // saying nothing.
    expect(Object.keys(g)).not.toContain('verified');
  });

  it('reports the flag the approval path actually writes', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(PROFILE as never);
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${PROFILE_ID}` });
    expect(res.json().gaushala.approved).toBe(true);
  });

  it('the route still resolves real profiles at all (COM-07 must not regress)', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(PROFILE as never);
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${PROFILE_ID}` });
    expect(res.json().gaushala.donationCauseId).toBe(OWNER_ID);
    expect(res.json().gaushala.source).toBe('profile');
  });
});
