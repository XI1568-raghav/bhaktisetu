/**
 * An approved gaushala/temple must not be able to edit its own profile down to
 * junk while staying approved + public. The quality gate used to run only at
 * admin approval. Applies to PATCH /gaushala-portal/profile and to
 * PATCH /providers/(gaushala|temple)/:id (the temple's only self-edit path).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

let currentUser = { id: 'user-1', roles: ['GAUSHALA_MANAGER'] as string[] };
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = currentUser;
  },
  requireAnyRole: () => async () => {},
}));

import Fastify from 'fastify';
import { gaushalaPortalRoutes } from './gaushala-portal.js';
import { providerRoutes } from './providers.js';

const GOOD = {
  gaushalaName: 'Shri Krishna Gaushala',
  description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.',
  address: 'Vrindavan Road, Mathura',
};

function portalPatch(body: unknown) {
  const app = Fastify();
  void app.register(gaushalaPortalRoutes, { prefix: '/api/v1/gaushala-portal' });
  return app.inject({ method: 'PATCH', url: '/api/v1/gaushala-portal/profile', payload: body as object });
}
function providerPatch(type: string, roles: string[], body: unknown) {
  currentUser = { id: 'user-1', roles };
  const app = Fastify();
  void app.register(providerRoutes, { prefix: '/api/v1/providers' });
  return app.inject({ method: 'PATCH', url: `/api/v1/providers/${type}/prof-1`, payload: body as object });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: 'user-1', roles: ['GAUSHALA_MANAGER'] };
});

describe('PATCH /gaushala-portal/profile', () => {
  it('rejects junk edits on an approved profile with 400 and a plain-English list, writes nothing', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ id: 'p', userId: 'user-1', approved: true, ...GOOD } as never);
    const res = await portalPatch({ description: 'skkss', address: 'ssdwdqe' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('cause_quality_failed');
    expect(body.message).toMatch(/description/i);
    expect(body.message).toMatch(/address/i);
    expect(prismaMock.gaushalaProfile.update).not.toHaveBeenCalled();
  });

  it('allows a good edit on an approved profile', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ id: 'p', userId: 'user-1', approved: true, ...GOOD } as never);
    prismaMock.gaushalaProfile.update.mockResolvedValue({ id: 'p' } as never);
    const res = await portalPatch({ city: 'Mathura' });
    expect(res.statusCode).toBe(200);
    expect(prismaMock.gaushalaProfile.update).toHaveBeenCalled();
  });

  it('does not gate an unapproved profile (still being drafted)', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ id: 'p', userId: 'user-1', approved: false, gaushalaName: 'Abc', description: null, address: null } as never);
    prismaMock.gaushalaProfile.update.mockResolvedValue({ id: 'p' } as never);
    const res = await portalPatch({ description: 'draft' });
    expect(res.statusCode).toBe(200);
  });
});

describe('PATCH /providers/:type/:id', () => {
  it('rejects a junk temple edit on an approved profile', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      id: 'prof-1', userId: 'user-1', approved: true, templeName: 'Kashi Temple',
      description: 'Ancient temple on the banks of the Ganga.', address: 'Dashashwamedh Road, Varanasi',
    } as never);
    const res = await providerPatch('temple', ['TEMPLE_MANAGER'], { description: 'x' });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('cause_quality_failed');
    expect(prismaMock.templeProfile.update).not.toHaveBeenCalled();
  });

  it('rejects a junk gaushala edit on an approved profile', async () => {
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ id: 'prof-1', userId: 'user-1', approved: true, ...GOOD } as never);
    const res = await providerPatch('gaushala', ['GAUSHALA_MANAGER'], { address: 'x' });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.gaushalaProfile.update).not.toHaveBeenCalled();
  });

  it('allows a good temple edit on an approved profile', async () => {
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      id: 'prof-1', userId: 'user-1', approved: true, templeName: 'Kashi Temple',
      description: 'Ancient temple on the banks of the Ganga.', address: 'Dashashwamedh Road, Varanasi',
    } as never);
    prismaMock.templeProfile.update.mockResolvedValue({ id: 'prof-1' } as never);
    const res = await providerPatch('temple', ['TEMPLE_MANAGER'], { city: 'Varanasi' });
    expect(res.statusCode).toBe(200);
  });
});
