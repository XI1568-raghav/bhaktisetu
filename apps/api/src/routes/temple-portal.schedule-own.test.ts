import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { templePortalRoutes } from './temple-portal.js';

/**
 * GET /temple-portal/schedule without ?slug= resolves the manager's own temple
 * with the same approved-profile + name match the dashboard uses, so the
 * schedule page no longer needs a typed slug.
 */

const MANAGER = {
  id: '77777777-7777-4777-8777-777777777777',
  email: 'temple@demo.com',
  phone: null,
  fullName: 'Demo Temple Manager',
  subscriptionTier: 'free',
  blocked: false,
};

function get(url: string) {
  const app = Fastify();
  void app.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
  return app.inject({
    method: 'GET',
    url: `/api/v1/temple-portal${url}`,
    headers: { authorization: 'Bearer demo-temple' },
  });
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
  prismaMock.$queryRawUnsafe.mockResolvedValue([{ org_id: null }] as any);
});

describe('GET /schedule with no slug', () => {
  it("returns the approved manager's own temple, slug included", async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    prismaMock.temple.findUnique.mockResolvedValue({
      id: 'temple-1',
      slug: 'somnath',
      name: 'Somnath',
      timingInfo: { closedOn: 'Open all days' },
    } as any);

    const res = await get('/schedule');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ slug: 'somnath', name: 'Somnath' });
    expect(prismaMock.temple.findUnique.mock.calls[0]?.[0]?.where).toEqual({ id: 'temple-1' });
  });

  it('409 with the reason when the profile is not approved', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: false } as any);
    const res = await get('/schedule');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'temple_not_linked', reason: 'not_approved' });
    expect(prismaMock.temple.findUnique).not.toHaveBeenCalled();
  });

  it('409 when the manager has no temple profile', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue(null);
    const res = await get('/schedule');
    expect(res.statusCode).toBe(409);
    expect(res.json().reason).toBe('no_temple_profile');
  });

  it('still honours an explicit slug', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    prismaMock.temple.findUnique.mockResolvedValue({ id: 'temple-1', slug: 'somnath', name: 'Somnath', timingInfo: null } as any);
    const res = await get('/schedule?slug=somnath');
    expect(res.statusCode).toBe(200);
    expect(prismaMock.temple.findUnique.mock.calls[0]?.[0]?.where).toEqual({ slug: 'somnath' });
  });
});
