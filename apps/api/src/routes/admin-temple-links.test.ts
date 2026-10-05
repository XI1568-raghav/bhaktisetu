import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminTempleLinkRoutes } from './admin-temple-links.js';
import { templePortalRoutes } from './temple-portal.js';

const ADMIN = { id: 'admin-1', email: 'admin@demo.com', phone: null, fullName: 'Admin', subscriptionTier: 'bhakti_pass', blocked: false };
const MANAGER = { id: '77777777-7777-4777-8777-777777777777', email: 'temple@demo.com', phone: null, fullName: 'Mgr', subscriptionTier: 'free', blocked: false };
const TEMPLE_A = '11111111-1111-4111-8111-111111111111';
const TEMPLE_B = '22222222-2222-4222-8222-222222222222';

const sqlCalls = () => prismaMock.$executeRawUnsafe.mock.calls.map((c: any[]) => String(c[0]));

async function call(method: 'GET' | 'POST', url: string, payload?: unknown, auth = 'Bearer demo-admin-token') {
  const app = Fastify({ logger: false });
  await app.register(adminTempleLinkRoutes, { prefix: '/api/v1/admin/temple-links' });
  const res = await app.inject({
    method,
    url: `/api/v1/admin/temple-links${url}`,
    headers: { authorization: auth, 'content-type': 'application/json' },
    ...(payload || method === 'POST' ? { payload: JSON.stringify(payload ?? {}) } : {}),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_DEMO_TOKENS = 'true';
  prismaMock.user.findUnique.mockImplementation(async (a: any) =>
    a.where.email === 'admin@demo.com' ? ADMIN : a.where.email === 'temple@demo.com' ? MANAGER : null,
  );
  prismaMock.userRoleAssignment.findMany.mockImplementation(async (a: any) =>
    a.where?.userId === MANAGER.id ? [{ userId: MANAGER.id, role: 'TEMPLE_MANAGER' }] : [{ userId: ADMIN.id, role: 'ADMIN' }],
  );
  prismaMock.userRoleAssignment.findFirst.mockResolvedValue({ userId: MANAGER.id } as any);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  prismaMock.templeProfile.findUnique.mockResolvedValue({
    templeName: 'Shree Somnath Temple',
    city: 'Veraval',
    state: 'Gujarat',
    deity: 'Shiva',
    address: 'Prabhas Patan',
    description: 'Ancient Jyotirlinga.',
  } as any);
  prismaMock.temple.findFirst.mockResolvedValue(null);
  prismaMock.temple.findMany.mockResolvedValue([]);
  prismaMock.temple.create.mockImplementation(async (a: any) => ({ id: TEMPLE_A, slug: a.data.slug }));
  prismaMock.temple.findUnique.mockImplementation(async (a: any) => ({ id: a.where.id, name: 'Shree Somnath Temple', slug: 'shree-somnath-temple', isVerified: false }) as any);
});

describe('admin temple links: access', () => {
  it('is admin only', async () => {
    for (const [m, u, p] of [
      ['GET', '/temples', undefined],
      ['GET', `/${MANAGER.id}`, undefined],
      ['POST', `/${MANAGER.id}/link`, { templeId: TEMPLE_A }],
      ['POST', `/${MANAGER.id}/create`, undefined],
    ] as const) {
      expect((await call(m, u, p, 'Bearer demo-temple-token')).statusCode).toBe(403);
    }
    expect(prismaMock.temple.create).not.toHaveBeenCalled();
    expect(sqlCalls().some((s) => /INSERT INTO temple_manager_links/.test(s))).toBe(false);
  });

  it('refuses a target who is not a temple manager', async () => {
    prismaMock.userRoleAssignment.findFirst.mockResolvedValue(null);
    expect((await call('POST', `/${MANAGER.id}/create`)).statusCode).toBe(404);
    expect(prismaMock.temple.create).not.toHaveBeenCalled();
  });
});

describe('admin temple links: create from profile', () => {
  it('creates an UNVERIFIED temple with a slug and links it', async () => {
    const res = await call('POST', `/${MANAGER.id}/create`);
    expect(res.statusCode).toBe(201);
    expect(res.json().outcome).toBe('created');
    const data = (prismaMock.temple.create.mock.calls[0] as any[])[0].data;
    expect(data).toMatchObject({
      name: 'Shree Somnath Temple',
      slug: 'shree-somnath-temple',
      city: 'Veraval',
      state: 'Gujarat',
      deityPrimary: 'Shiva',
      addressLine: 'Prabhas Patan',
      description: 'Ancient Jyotirlinga.',
      isVerified: false,
      status: 'pending_review',
    });
    expect(sqlCalls().some((s) => /INSERT INTO temple_manager_links/.test(s))).toBe(true);
  });

  it('picks a unique slug when the natural one is taken', async () => {
    prismaMock.temple.findMany.mockResolvedValue([
      { slug: 'shree-somnath-temple' },
      { slug: 'shree-somnath-temple-2' },
    ] as any);
    await call('POST', `/${MANAGER.id}/create`);
    expect((prismaMock.temple.create.mock.calls[0] as any[])[0].data.slug).toBe('shree-somnath-temple-3');
  });

  it('retries on a slug race (P2002)', async () => {
    prismaMock.temple.create
      .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))
      .mockImplementation(async (a: any) => ({ id: TEMPLE_A, slug: a.data.slug }));
    const res = await call('POST', `/${MANAGER.id}/create`);
    expect(res.statusCode).toBe(201);
    expect(prismaMock.temple.create).toHaveBeenCalledTimes(2);
  });

  it('is idempotent: an existing link is returned, nothing is created', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ temple_id: TEMPLE_A }]);
    const res = await call('POST', `/${MANAGER.id}/create`);
    expect(res.statusCode).toBe(200);
    expect(res.json().outcome).toBe('already_linked');
    expect(prismaMock.temple.create).not.toHaveBeenCalled();
  });

  it('links a same-named temple instead of duplicating it', async () => {
    prismaMock.temple.findFirst.mockResolvedValue({ id: TEMPLE_B } as any);
    const res = await call('POST', `/${MANAGER.id}/create`);
    expect(res.json().outcome).toBe('linked_existing');
    expect(prismaMock.temple.create).not.toHaveBeenCalled();
    const insert = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) => /INSERT INTO temple_manager_links/.test(String(c[0]))) as any[];
    expect(insert.slice(1)).toEqual([MANAGER.id, TEMPLE_B]);
  });

  it('409s when the manager has no profile', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue(null);
    expect((await call('POST', `/${MANAGER.id}/create`)).statusCode).toBe(409);
  });
});

describe('admin temple links: link to existing', () => {
  it('upserts the link (re-linking repoints, never duplicates)', async () => {
    const res = await call('POST', `/${MANAGER.id}/link`, { templeId: TEMPLE_B });
    expect(res.statusCode).toBe(200);
    const insert = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) => /ON CONFLICT \(manager_user_id\) DO UPDATE/.test(String(c[0]))) as any[];
    expect(insert.slice(1)).toEqual([MANAGER.id, TEMPLE_B]);
  });

  it('404s on an unknown temple and 400s on a bad id', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(null);
    expect((await call('POST', `/${MANAGER.id}/link`, { templeId: TEMPLE_B })).statusCode).toBe(404);
    expect((await call('POST', `/${MANAGER.id}/link`, { templeId: 'nope' })).statusCode).toBe(400);
  });
});

describe('portal resolution prefers the explicit link', () => {
  async function dashboardTempleId() {
    const app = Fastify({ logger: false });
    await app.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
    const res = await app.inject({ method: 'GET', url: '/api/v1/temple-portal/pujas', headers: { authorization: 'Bearer demo-temple-token' } });
    await app.close();
    return res;
  }

  beforeEach(() => {
    prismaMock.templePujaOffering.findMany.mockResolvedValue([]);
  });

  it('link wins over a name match that points elsewhere', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ temple_id: TEMPLE_A }]);
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Other', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: TEMPLE_B } as any);
    const res = await dashboardTempleId();
    expect(res.json()).toMatchObject({ templeLinked: true });
    const where = (prismaMock.templePujaOffering.findMany.mock.calls[0] as any[])[0].where;
    expect(where.templeId).toBe(TEMPLE_A);
  });

  it('link works even when the profile name matches nothing', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ temple_id: TEMPLE_A }]);
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Typo Tmple', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue(null);
    expect((await dashboardTempleId()).json()).toMatchObject({ templeLinked: true });
  });

  it('falls back to the name match when there is no link', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: TEMPLE_B } as any);
    await dashboardTempleId();
    const where = (prismaMock.templePujaOffering.findMany.mock.calls[0] as any[])[0].where;
    expect(where.templeId).toBe(TEMPLE_B);
  });

  it('falls back to the name match when the link lookup throws', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('relation does not exist'));
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: TEMPLE_B } as any);
    expect((await dashboardTempleId()).json()).toMatchObject({ templeLinked: true });
  });

  it('the unlinked state tells the manager what happens next', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Nowhere', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue(null);
    const body = (await dashboardTempleId()).json();
    expect(body).toMatchObject({ templeLinked: false, reason: 'no_matching_temple' });
    expect(body.message ?? '').toMatch(/connects it by hand|connected/i);
  });
});
