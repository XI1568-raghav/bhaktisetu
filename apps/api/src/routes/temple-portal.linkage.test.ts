import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { templePortalRoutes } from './temple-portal.js';

// S-06 (prod sweep 2026-08-12): a temple manager opens /temple-portal/pujas,
// fills the offering form including the Available Time Slots the #231 editor
// added, saves — and gets `400 {"error":"No matched Temple for this manager"}`.
// GET /pujas answered `{"offerings":[]}` with HTTP 200 and no explanation, so
// the screen looked merely empty. resolveManagerTempleId() needs a TempleProfile
// whose templeName string-matches a Temple row exactly; temple@demo.com has no
// TempleProfile at all. A correctly-built editor stranded behind a silent
// account-linkage failure.

const MANAGER = {
  id: '77777777-7777-4777-8777-777777777777',
  email: 'temple@demo.com',
  phone: null,
  fullName: 'Demo Temple Manager',
  subscriptionTier: 'free',
  blocked: false,
};

const PUJA_TYPE_ID = '00000000-0000-4000-8000-000000000001';

function makeApp() {
  const app = Fastify();
  void app.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
  return app;
}

describe('temple-portal — offering creation surfaces the real blocker (S-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'temple@demo.com' ? MANAGER : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: MANAGER.id, role: 'TEMPLE_MANAGER' },
    ] as any);
    prismaMock.templeProfile.findUnique.mockResolvedValue(null);
    prismaMock.temple.findFirst.mockResolvedValue(null);
    prismaMock.templePujaOffering.findMany.mockResolvedValue([]);
  });

  it('GET /pujas distinguishes "no temple linked" from "no offerings yet"', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/temple-portal/pujas',
      headers: { authorization: 'Bearer demo-temple' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      offerings: [],
      templeLinked: false,
      reason: 'no_temple_profile',
    });
  });

  it('reports the profile-exists-but-unmatched case separately', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      templeName: 'Shree Siddhivinayak Temple',
    } as any);
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/temple-portal/pujas',
      headers: { authorization: 'Bearer demo-temple' },
    });
    expect(res.json()).toMatchObject({ templeLinked: false, reason: 'no_matching_temple' });
  });

  it('confirms the link when a Temple matches', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath' } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/temple-portal/pujas',
      headers: { authorization: 'Bearer demo-temple' },
    });
    expect(res.json()).toMatchObject({ offerings: [], templeLinked: true });
  });

  it('matches the Temple case-insensitively and ignores stray whitespace', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      templeName: '  somnath temple  ',
    } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    const app = makeApp();
    await app.inject({
      method: 'GET',
      url: '/api/v1/temple-portal/pujas',
      headers: { authorization: 'Bearer demo-temple' },
    });
    const where = prismaMock.temple.findFirst.mock.calls[0]?.[0]?.where;
    expect(where.name).toEqual({ equals: 'somnath temple', mode: 'insensitive' });
  });

  it('POST /pujas answers a machine-readable code, not a raw internal string', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/temple-portal/pujas',
      headers: { authorization: 'Bearer demo-temple' },
      payload: { pujaTypeId: PUJA_TYPE_ID, availableSlots: ['06:00', '10:00', '18:00'] },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.code).toBe('temple_not_linked');
    expect(body.error).not.toMatch(/No matched Temple/);
    expect(body.message).toMatch(/temple/i);
    expect(prismaMock.templePujaOffering.create).not.toHaveBeenCalled();
  });

  it('creates the offering with its slots once a Temple is linked', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath' } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    prismaMock.templePujaOffering.create.mockImplementation(async (args: any) => ({
      id: 'off-1',
      ...args.data,
    }));
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/temple-portal/pujas',
      headers: { authorization: 'Bearer demo-temple' },
      payload: { pujaTypeId: PUJA_TYPE_ID, availableSlots: ['06:00', '10:00', '18:00'] },
    });
    expect(res.statusCode).toBe(201);
    const created = (prismaMock.templePujaOffering.create.mock.calls[0] as any[])[0].data;
    expect(created.templeId).toBe('temple-1');
    expect(created.availableSlots).toEqual(['06:00', '10:00', '18:00']);
  });
});
