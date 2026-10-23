import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { templePortalRoutes } from './temple-portal.js';

/**
 * Temple-manager end-to-end test (2026-10-05) — portal access and numbers.
 *
 *  1. Anyone can sign up as `temple_manager` (auth.ts seeds the role at once and
 *     a profile with approved=false). The portal checked the ROLE only, then
 *     linked the manager to a Temple by the free-text name on their own profile.
 *     So an unapproved stranger who typed "Kashi Vishwanath Temple" read that
 *     temple's donor names/emails, bookings and payouts, and could add or delete
 *     its offerings. The link must require an approved profile.
 *  2. The dashboard matched the name EXACTLY while every other tab matched
 *     case-insensitively, so a manager saw real bookings on the Bookings tab and
 *     zeros on the dashboard.
 *  3. The dashboard "Revenue" was the devotee's gross payment (puja price +
 *     platform fee), not what the temple earns. The temple earns its TemplePayout.
 *  4. The schedule editor answered 403 to the manager of the temple, because
 *     unlinked temples were admin-only and nothing links a temple to an org.
 *  5. `?status=nonsense` on the bookings list was a 500.
 */

const MANAGER = {
  id: '77777777-7777-4777-8777-777777777777',
  email: 'temple@demo.com',
  phone: null,
  fullName: 'Demo Temple Manager',
  subscriptionTier: 'free',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
  return app;
}

function get(url: string) {
  return makeApp().inject({ method: 'GET', url: `/api/v1/temple-portal${url}`, headers: { authorization: 'Bearer demo-temple' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEMO_TOKENS = 'true';
  prismaMock.user.findUnique.mockImplementation(async (args: any) =>
    args.where.email === 'temple@demo.com' ? MANAGER : null,
  );
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([
    { userId: MANAGER.id, role: 'TEMPLE_MANAGER' },
  ] as any);
  prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
});

describe('an unapproved temple profile is not linked to any temple', () => {
  beforeEach(() => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      templeName: 'Kashi Vishwanath Temple',
      approved: false,
    } as any);
  });

  it('GET /donations does not read donor details', async () => {
    const res = await get('/donations');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ donations: [], total: 0 });
    expect(prismaMock.donation.findMany).not.toHaveBeenCalled();
  });

  it('GET /bookings does not read bookings', async () => {
    const res = await get('/bookings');
    expect(res.json()).toMatchObject({ bookings: [] });
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
  });

  it('POST /pujas is refused and writes nothing', async () => {
    const res = await makeApp().inject({
      method: 'POST',
      url: '/api/v1/temple-portal/pujas',
      headers: { authorization: 'Bearer demo-temple' },
      payload: { pujaTypeId: '00000000-0000-4000-8000-000000000001' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().reason).toBe('not_approved');
    expect(prismaMock.templePujaOffering.create).not.toHaveBeenCalled();
  });

  it('GET /pujas says the portal is active but the temple is not linked yet, not that the name is wrong', async () => {
    const res = await get('/pujas');
    const body = res.json();
    expect(body).toMatchObject({ templeLinked: false, reason: 'not_approved' });
    // No "awaiting approval" wall: the manager is told the portal works and what links the temple.
    expect(body.message).toMatch(/portal is active/i);
    expect(body.message).not.toMatch(/awaiting approval/i);
  });
});

describe('dashboard', () => {
  beforeEach(() => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      templeName: '  somnath temple ',
      approved: true,
      totalStreams: 0,
    } as any);
    prismaMock.pujaBooking.count.mockResolvedValue(3);
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    prismaMock.templePayout.findMany.mockResolvedValue([]);
  });

  it('finds the temple the same tolerant way the other tabs do', async () => {
    await get('/dashboard');
    const where = prismaMock.temple.findFirst.mock.calls[0]?.[0]?.where;
    expect(where.name).toEqual({ equals: 'somnath temple', mode: 'insensitive' });
  });

  it('counts bookings in every live status, not only confirmed/completed (role pass 2026-10-07)', async () => {
    await get('/dashboard');
    const statuses = (prismaMock.pujaBooking.count.mock.calls[0]?.[0] as any).where.status.in;
    for (const s of ['confirmed', 'priest_assigned', 'in_progress', 'completed', 'video_uploaded', 'delivered']) {
      expect(statuses).toContain(s);
    }
    expect(statuses).not.toContain('cancelled');
    expect(statuses).not.toContain('pending_payment');
  });

  it('reports the temple share, not the devotee gross, as revenue', async () => {
    prismaMock.templePayout.findMany.mockResolvedValue([
      { bookingId: 'b1', amount: '100', status: 'completed', createdAt: new Date() },
    ] as any);
    const res = await get('/dashboard');
    expect(res.statusCode).toBe(200);
    const stats = res.json().stats;
    expect(stats.totalRevenueInr).toBe(100);
    expect(stats.monthRevenueInr).toBe(100);
    expect(prismaMock.pujaBooking.aggregate).not.toHaveBeenCalled();
    // A refunded booking's share is reversed and must not be counted.
    const first = prismaMock.templePayout.findMany.mock.calls[0]?.[0] as any;
    expect(first.where.status).toEqual({ in: ['pending', 'completed'] });
  });

  it('shows no stats for an unapproved profile', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      templeName: 'Somnath Temple',
      approved: false,
      totalStreams: 0,
    } as any);
    const res = await get('/dashboard');
    expect(res.json().stats.totalBookings).toBe(0);
    expect(prismaMock.pujaBooking.count).not.toHaveBeenCalled();
  });
});

describe('schedule editor', () => {
  it('lets the approved manager of a temple with no org read its timings', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
    prismaMock.temple.findUnique.mockResolvedValue({ id: 'temple-1', slug: 'somnath', name: 'Somnath', timingInfo: null } as any);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ org_id: null }] as any);
    const res = await get('/schedule?slug=somnath');
    expect(res.statusCode).toBe(200);
  });

  it('still refuses a manager whose profile is linked to a different temple', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    prismaMock.temple.findUnique.mockResolvedValue({ id: 'temple-2', slug: 'other', name: 'Other', timingInfo: null } as any);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ org_id: null }] as any);
    const res = await get('/schedule?slug=other');
    expect(res.statusCode).toBe(403);
  });
});

describe('bookings list filters', () => {
  beforeEach(() => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
  });

  it('answers 400, not 500, for a status that does not exist', async () => {
    const res = await get('/bookings?status=nonsense');
    expect(res.statusCode).toBe(400);
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
  });

  it('answers 400, not 500, for an unreadable date', async () => {
    const res = await get('/bookings?dateFrom=garbage');
    expect(res.statusCode).toBe(400);
  });
});

// Role pass 2026-10-07 (providers).
describe('offerings: malformed ids, roster consent, darshan link state', () => {
  const OFFERING = '11111111-1111-4111-8111-111111111111';
  const PRIEST = '22222222-2222-4222-8222-222222222222';
  const send = (method: 'PATCH' | 'DELETE' | 'POST', url: string, payload?: unknown) =>
    makeApp().inject({
      method,
      url: `/api/v1/temple-portal${url}`,
      headers: { authorization: 'Bearer demo-temple' },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });

  beforeEach(() => {
    (prismaMock as any).templePriest = { findFirst: vi.fn().mockResolvedValue(null) };
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath Temple', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    prismaMock.templePujaOffering.findUnique.mockResolvedValue({
      id: OFFERING,
      templeId: 'temple-1',
      assignedPriestId: null,
    } as any);
  });

  it('a malformed :id is 404, not a 500 from Prisma', async () => {
    for (const [m, u] of [
      ['PATCH', '/pujas/not-a-uuid'],
      ['DELETE', '/pujas/not-a-uuid'],
      ['DELETE', '/priests/not-a-uuid'],
      ['PATCH', '/darshan/not-a-uuid'],
    ] as const) {
      const res = await send(m, u, m === 'DELETE' ? undefined : { isActive: true });
      expect(res.statusCode).toBe(404);
    }
    expect(prismaMock.templePujaOffering.findUnique).not.toHaveBeenCalled();
  });

  it('refuses to pin a priest who is not on the roster (no consent, and no FK 500 for unknown ids)', async () => {
    const res = await send('PATCH', `/pujas/${OFFERING}`, { assignedPriestId: PRIEST });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('priest_not_on_roster');
    expect(prismaMock.templePujaOffering.update).not.toHaveBeenCalled();
  });

  it('pins a priest who accepted (is on the roster)', async () => {
    (prismaMock as any).templePriest.findFirst.mockResolvedValue({ id: 'roster-1' });
    prismaMock.templePujaOffering.update.mockResolvedValue({ id: OFFERING, templeId: 'temple-1', assignedPriestId: PRIEST } as any);
    const res = await send('PATCH', `/pujas/${OFFERING}`, { assignedPriestId: PRIEST });
    expect(res.statusCode).toBe(200);
    expect((prismaMock as any).templePriest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { templeId: 'temple-1', priestId: PRIEST } }),
    );
  });

  it('un-pinning (null) needs no roster lookup', async () => {
    prismaMock.templePujaOffering.update.mockResolvedValue({ id: OFFERING, templeId: 'temple-1', assignedPriestId: null } as any);
    const res = await send('PATCH', `/pujas/${OFFERING}`, { assignedPriestId: null });
    expect(res.statusCode).toBe(200);
    expect((prismaMock as any).templePriest.findFirst).not.toHaveBeenCalled();
  });

  it('POST /darshan from an unapproved manager is the specific 409, like every other write', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath Temple', approved: false } as any);
    const res = await send('POST', '/darshan', { streamKey: 'k', playbackUrl: 'https://x.example/a.m3u8' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'temple_not_linked', reason: 'not_approved' });
  });
});
