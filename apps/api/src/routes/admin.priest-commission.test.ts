import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'admin-1', roles: ['ADMIN'] };
  },
  requireRole: () => async () => {},
}));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';

/**
 * PM-03 (prod sweep 2026-08-12, P0/money) — the second half.
 *
 * The first half shipped: `Priest.commissionRate` (the PANDIT's share) now
 * defaults to 0.80 in schema.prisma, and migration
 * 20260812000000_priest_commission_rate_80 sets the column default and lifts
 * rows still sitting on the stale 0.70. Before that, resolvePriestShare()
 * accepted any stored value in (0,1] as authoritative, 0.70 is inside that
 * range, and DEFAULT_PRIEST_SHARE = 0.8 therefore never fired — every
 * normally-onboarded pandit was paid 70%, a ₹1,000 shortfall on a ₹10,000
 * booking.
 *
 * The finding's own fix text is explicit about what must NOT be done: "Do not
 * implement the alternative of treating a stored 0.70 as 'unset' — that would
 * silently override any pandit genuinely negotiated onto 70%." Which requires
 * that a negotiated rate be settable in the first place. It was not: nothing in
 * apps/api ever writes commissionRate. PATCH /admin/priests/:id echoed its body
 * back — `{ message: 'Priest updated', updates: body }` — and touched no row,
 * so a negotiated split could only be applied with raw SQL against production.
 *
 * This pins the override: an admin can set a per-pandit share, it persists, it
 * is bounded, and it cannot be used to pay a pandit less than half.
 */

const PRIEST_ID = '33333333-3333-4333-8333-333333333333';

function makeApp() {
  const app = Fastify();
  void app.register(adminRoutes, { prefix: '/api/v1/admin' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

async function patch(payload: Record<string, unknown>, id = PRIEST_ID) {
  const app = makeApp();
  return await app.inject({
    method: 'PATCH',
    url: `/api/v1/admin/priests/${id}/commission-rate`,
    payload,
  });
}

describe('PM-03 — an admin can record a negotiated pandit share, and it persists', () => {
  it('writes the negotiated share to the priest row', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({
      id: PRIEST_ID,
      displayName: 'Pandit Sharma',
      commissionRate: 0.8,
    });
    prismaMock.priest.update.mockResolvedValue({
      id: PRIEST_ID,
      displayName: 'Pandit Sharma',
      commissionRate: 0.7,
    });

    const res = await patch({ commissionRate: 0.7, reason: 'Negotiated at onboarding' });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.priest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PRIEST_ID },
        data: expect.objectContaining({ commissionRate: 0.7 }),
      }),
    );
    const body = res.json() as { priest?: { commissionRate?: number; platformTakeRate?: number } };
    expect(body.priest?.commissionRate).toBe(0.7);
    // Commission.percentage is the PLATFORM rate; the response states it so an
    // admin never has to work out which side of the split they just set.
    expect(body.priest?.platformTakeRate).toBeCloseTo(0.3, 10);
  });

  it('404s for a pandit that does not exist rather than creating one', async () => {
    prismaMock.priest.findUnique.mockResolvedValue(null);

    const res = await patch({ commissionRate: 0.75 });

    expect(res.statusCode).toBe(404);
    expect(prismaMock.priest.update).not.toHaveBeenCalled();
  });

  it('rejects a share outside (0,1] — the range resolvePriestShare trusts', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST_ID, commissionRate: 0.8 });

    for (const bad of [0, -0.5, 1.5, 80]) {
      const res = await patch({ commissionRate: bad });
      expect(res.statusCode, `commissionRate=${bad}`).toBe(400);
    }
    expect(prismaMock.priest.update).not.toHaveBeenCalled();
  });

  it('refuses a share below 0.5 — a platform take over 50% is a typo, not a negotiation', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST_ID, commissionRate: 0.8 });

    const res = await patch({ commissionRate: 0.3 });

    expect(res.statusCode).toBe(400);
    expect(String((res.json() as { error?: string }).error)).toMatch(/0\.5|half/i);
    expect(prismaMock.priest.update).not.toHaveBeenCalled();
  });

  /**
   * The half that already shipped, pinned so it cannot silently regress: the
   * whole business is built on a uniform 20/80 split, and a schema default of
   * 0.70 reinstated here would put every newly-onboarded pandit back on 70%
   * without a single test failing anywhere else.
   */
  it('the schema still defaults a new pandit to the 80% share', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const schemaPath = fileURLToPath(new URL('../../prisma/schema.prisma', import.meta.url));
    const schema = readFileSync(schemaPath, 'utf8');
    const line = schema
      .split(/\r?\n/)
      .find((l) => /^\s*commissionRate\s+Float/.test(l));
    expect(line, 'Priest.commissionRate declaration').toBeDefined();
    expect(line).toMatch(/@default\(0\.80?\)/);
    expect(line).not.toMatch(/@default\(0\.7/);
  });

  it('is not the old echo stub — a body it accepts must reach the database', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST_ID, commissionRate: 0.8 });
    prismaMock.priest.update.mockResolvedValue({ id: PRIEST_ID, commissionRate: 0.85 });

    await patch({ commissionRate: 0.85 });

    expect(prismaMock.priest.update).toHaveBeenCalledTimes(1);
  });
});
