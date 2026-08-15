import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologerPortalRoutes } from './astrologer-portal.js';

/**
 * AW-14 (2026-08-12, P2): the dashboard's four quick-stat cards read
 * "1 Today's Sessions · 0 Total Consultations · 1 Active Clients · — Rating"
 * for an astrologer who had just delivered a paid consultation, and a second
 * paid consultation did not move the 0.
 *
 * Cause: `totalConsultations` was read straight off the AstrologerProfile
 * counter column, and nothing in the codebase ever incremented it —
 * /consultation/verify-payment writes a Commission row and stops. Two cards on
 * the same row therefore stated contradictory facts forever.
 *
 * The lifetime figure now comes from a COUNT over the same
 * `astrologer_consultations` rows that produce "Today's Sessions", so the pair
 * can no longer disagree.
 */

const ASTRO_USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';

const DEMO_ASTRO = {
  id: ASTRO_USER_ID,
  email: 'astro@demo.com',
  phone: null,
  fullName: 'Acharya Vinod Sharma',
  subscriptionTier: 'free',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(astrologerPortalRoutes, { prefix: '/api/v1/astrologer-portal' });
  return app;
}

/** Classifies which of the dashboard's raw statements is being asked. */
function kindOf(sql: string): 'today' | 'lifetime' | 'upcoming' | 'other' {
  const s = String(sql).replace(/--[^\n]*/g, '');
  if (/CURRENT_DATE/.test(s)) return 'today';
  if (/COUNT\(\*\)/.test(s)) return 'lifetime';
  if (/SELECT id, reference/.test(s)) return 'upcoming';
  return 'other';
}

/** The astrologer has 2 lifetime consultations, 1 of them paid today. */
function wireRawQueries(lifetime = 2) {
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
    switch (kindOf(sql)) {
      case 'today':
        return [{ count: '1', sum: '375' }];
      case 'lifetime':
        return [{ count: String(lifetime) }];
      case 'upcoming':
        return [
          {
            id: '5523ab80-6591-43f0-9205-59ac341035b0',
            reference: 'AC-20260812-628085',
            user_id: '2b5bd615-1633-4c95-9b09-03efb2b9e429',
            minutes: 15,
            amount_inr: '375',
            scheduled_at: null,
            room_name: 'darshya-astrologer-acharya-vinod-sharma-abc',
            status: 'confirmed',
            created_at: new Date(),
          },
        ];
      default:
        return [];
    }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'astro@demo.com' ? DEMO_ASTRO : null,
  );
  prismaMock.astrologerProfile.findUnique.mockResolvedValue({
    id: PROFILE_ID,
    userId: ASTRO_USER_ID,
    displayName: 'Acharya Vinod Sharma',
    pricePerMinute: 25,
    approved: true,
    rating: 0,
    // The never-incremented counter that used to be served verbatim.
    totalConsultations: 0,
  });
  prismaMock.commission.findMany.mockResolvedValue([]);
  prismaMock.pujaBooking.findMany.mockResolvedValue([]);
  wireRawQueries();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-14 — lifetime consultation count is derived, not read off a dead counter', () => {
  it('reports 2 lifetime consultations while the profile counter still says 0', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    expect(res.statusCode).toBe(200);
    const stats = res.json().stats;
    expect(stats.totalConsultations).toBe(2);
    await app.close();
  });

  it('never contradicts "Today\'s Sessions" — lifetime >= today', async () => {
    const app = await buildApp();
    const stats = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/astrologer-portal/dashboard',
        headers: { authorization: 'Bearer demo-astro' },
      })
    ).json().stats;
    expect(stats.consultationsToday).toBe(1);
    expect(stats.totalConsultations).toBeGreaterThanOrEqual(stats.consultationsToday);
    await app.close();
  });

  it('the lifetime COUNT is not date-bounded and matches on both id forms', async () => {
    const app = await buildApp();
    await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    const lifetime = prismaMock.$queryRawUnsafe.mock.calls.find(
      (c: unknown[]) => kindOf(c[0] as string) === 'lifetime',
    );
    expect(lifetime).toBeDefined();
    const sql = (lifetime![0] as string).replace(/--[^\n]*/g, '');
    expect(sql).toMatch(/astrologer_id\s*=\s*ANY\(\$1::text\[\]\)/);
    expect(sql).not.toMatch(/CURRENT_DATE/);
    // Both id spellings the TEXT column has carried must be passed.
    expect(lifetime![1]).toEqual([PROFILE_ID, ASTRO_USER_ID]);
    await app.close();
  });

  it('falls back to the stored counter only when the raw table is unreachable', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({
      id: PROFILE_ID,
      userId: ASTRO_USER_ID,
      displayName: 'Acharya Vinod Sharma',
      pricePerMinute: 25,
      approved: true,
      rating: 0,
      totalConsultations: 7,
    });
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('relation does not exist'));
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/astrologer-portal/dashboard',
      headers: { authorization: 'Bearer demo-astro' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().stats.totalConsultations).toBe(7);
    await app.close();
  });
});
