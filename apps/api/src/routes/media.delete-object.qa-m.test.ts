import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/r2.js', () => ({
  r2: { enabled: true },
  publicUrlFor: () => null,
  presignR2Upload: vi.fn(),
  deleteFromR2: vi.fn(async () => true),
  deletePrivateObject: vi.fn(async () => true),
}));
let roles: string[] = ['DEVOTEE'];
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'user-uuid-1', roles };
  },
}));

import Fastify from 'fastify';
import { mediaRoutes } from './media.js';
import { deleteFromR2, deletePrivateObject } from '../lib/r2.js';

async function del(key: string) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => mediaRoutes(i), { prefix: '/api/v1/media' });
  const res = await app.inject({ method: 'DELETE', url: `/api/v1/media/object?key=${encodeURIComponent(key)}` });
  await app.close();
  return res;
}

const profileModels = ['panditProfile', 'storeProfile', 'astrologerProfile', 'wellnessProfile', 'gaushalaProfile', 'templeProfile'] as const;
function approved(which: (typeof profileModels)[number] | null) {
  for (const m of profileModels) (prismaMock as any)[m] = { count: vi.fn(async () => (m === which ? 1 : 0)) };
}

describe('DELETE /media/object', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roles = ['DEVOTEE'];
    approved(null);
  });

  it('lets the owner delete an unapproved KYC document (private store)', async () => {
    const res = await del('kyc-document/user-uuid-1/1-abc.pdf');
    expect(res.statusCode).toBe(200);
    expect(deletePrivateObject).toHaveBeenCalledWith('kyc-document/user-uuid-1/1-abc.pdf');
  });

  it('lets the owner delete a profile photo (public store)', async () => {
    const res = await del('profile-photo/user-uuid-1/1-abc.png');
    expect(res.statusCode).toBe(200);
    expect(deleteFromR2).toHaveBeenCalled();
  });

  it("refuses another user's file", async () => {
    const res = await del('kyc-document/someone-else/1-abc.pdf');
    expect(res.statusCode).toBe(403);
    expect(deletePrivateObject).not.toHaveBeenCalled();
  });

  it('refuses keys outside kyc/photo and path tricks', async () => {
    expect((await del('puja-proof/user-uuid-1/1-abc.png')).statusCode).toBe(400);
    expect((await del('kyc-document/user-uuid-1/../x/1.pdf')).statusCode).toBe(400);
  });

  it('refuses the owner once a profile is approved', async () => {
    approved('panditProfile');
    const res = await del('kyc-document/user-uuid-1/1-abc.pdf');
    expect(res.statusCode).toBe(403);
    expect(deletePrivateObject).not.toHaveBeenCalled();
  });

  it('lets an admin delete after approval and for another user', async () => {
    roles = ['ADMIN'];
    approved('panditProfile');
    const res = await del('kyc-document/someone-else/1-abc.pdf');
    expect(res.statusCode).toBe(200);
  });
});
