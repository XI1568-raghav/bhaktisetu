import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

let currentUser: { id: string; roles: string[] } = { id: 'user-1', roles: ['PANDIT'] };

vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = currentUser;
  },
  requireAnyRole: (..._roles: string[]) => async (_request: any, _reply: any) => {
    // Role membership is asserted separately by the route's own ownership
    // check; this stub keeps the preHandler chain intact.
  },
}));

import Fastify from 'fastify';
import { providerRoutes } from './providers.js';

/**
 * TC-09 (delta sweep 2026-08-20, P1 / privilege escalation).
 *
 * PATCH /providers/:type/:id took `request.body` completely unvalidated and
 * handed the whole object to providerService.updateProvider, whose only
 * defence was destructuring four names away
 * (`approved`, `id`, `userId`, `createdAt`) before spreading the remainder
 * straight into `prisma.<model>.update({ data })`.
 *
 * A denylist of four names on a table with eighteen columns fails open for
 * every column it does not name, and fails open again for every column added
 * later. Concretely, a signed-in provider could write:
 *
 *   pandit    aadhaarVerified  the flag that unlocks payout eligibility
 *   pandit    rating / totalPujas   their own marketplace ranking inputs
 *   store     commission       the PLATFORM take rate that
 *                              store-commission.service.ts reads to split
 *                              every store order (default 0.20)
 *   gaushala  verified         the "personally verified" trust badge
 *   temple    verified         the temple trust badge
 *   astrologer rating / totalConsultations
 *
 * The fix is a per-type Zod ALLOWLIST at the route boundary. These tests pin
 * the escalation fields shut and pin the legitimate fields open.
 */

function makeApp() {
  const app = Fastify();
  void app.register(providerRoutes, { prefix: '/api/v1/providers' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: 'user-1', roles: ['PANDIT'] };
});

/** Arms the ownership check so the request reaches the update. */
function armOwnership(model: keyof typeof prismaMock, id = 'prof-1') {
  const m = prismaMock[model] as unknown as {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  m.findUnique.mockResolvedValue({ id, userId: 'user-1' });
  m.update.mockResolvedValue({ id, userId: 'user-1' });
  return m;
}

async function patch(type: string, body: unknown, roles: string[]) {
  currentUser = { id: 'user-1', roles };
  const app = makeApp();
  return app.inject({
    method: 'PATCH',
    url: `/api/v1/providers/${type}/prof-1`,
    payload: body as Record<string, unknown>,
  });
}

describe('TC-09 — PATCH /providers/:type/:id cannot be used to self-escalate', () => {
  it('a pandit cannot set aadhaarVerified, rating or totalPujas', async () => {
    const m = armOwnership('panditProfile');

    const res = await patch(
      'pandit',
      { bio: 'Vedic scholar', aadhaarVerified: true, rating: 5, totalPujas: 250 },
      ['PANDIT'],
    );

    expect(res.statusCode).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });

  it('a store owner cannot rewrite the platform commission rate', async () => {
    const m = armOwnership('storeProfile');

    const res = await patch('store', { storeName: 'Puja Bhandar', commission: 0 }, ['STORE_OWNER']);

    expect(res.statusCode).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });

  it('a gaushala manager cannot award themselves the verified badge', async () => {
    const m = armOwnership('gaushalaProfile');

    const res = await patch('gaushala', { verified: true }, ['GAUSHALA_MANAGER']);

    expect(res.statusCode).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });

  it('a temple manager cannot award themselves the verified badge or inflate totalStreams', async () => {
    const m = armOwnership('templeProfile');

    const res = await patch('temple', { verified: true, totalStreams: 9999 }, ['TEMPLE_MANAGER']);

    expect(res.statusCode).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });

  it('an astrologer cannot set their own rating or consultation count', async () => {
    const m = armOwnership('astrologerProfile');

    const res = await patch('astrologer', { rating: 5, totalConsultations: 900 }, ['ASTROLOGER']);

    expect(res.statusCode).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });

  it('an approved:true smuggled past the old four-name denylist is refused loudly, not silently dropped', async () => {
    const m = armOwnership('panditProfile');

    const res = await patch('pandit', { approved: true }, ['PANDIT']);

    expect(res.statusCode).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });

  it('ALLOWLIST, not denylist: an unrecognised column is refused by default', async () => {
    // This is the property a denylist cannot have. Any column added to
    // PanditProfile after this commit is refused until it is deliberately
    // allowlisted, instead of being writable the moment it exists.
    const m = armOwnership('panditProfile');

    const res = await patch('pandit', { someColumnAddedNextQuarter: true }, ['PANDIT']);

    expect(res.statusCode).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });

  it('legitimate self-service fields still reach the database', async () => {
    const m = armOwnership('panditProfile');

    const res = await patch(
      'pandit',
      { bio: 'Vedic scholar', city: 'Gurugram', pricePerPuja: 2500, languages: ['hi', 'en'] },
      ['PANDIT'],
    );

    expect(res.statusCode).toBe(200);
    expect(m.update).toHaveBeenCalledTimes(1);
    const data = (m.update.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data).toEqual({
      bio: 'Vedic scholar',
      city: 'Gurugram',
      pricePerPuja: 2500,
      languages: ['hi', 'en'],
    });
  });

  it('the ADMIN role does not get a bypass on this route either', async () => {
    // Approval/verification is an admin.service.ts flow with its own audit
    // trail. This route is the provider self-service surface; ADMIN passing
    // through it must not become a second, unaudited approval rail.
    const m = armOwnership('gaushalaProfile');

    const res = await patch('gaushala', { verified: true }, ['ADMIN']);

    expect(res.statusCode).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });
});
