/**
 * Cause quality gate at approval: PATCH /admin/users/:id { approved: true }
 * must refuse a gaushala/temple profile that fails assessCauseQuality, while
 * rejection (approved: false) and good records are unaffected.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};
const TARGET = '5e6b1783-2782-43ae-ae1b-9b44894af94a';

const JUNK_GAUSHALA = {
  userId: TARGET,
  gaushalaName: 'saharanpur',
  description: 'skkss',
  address: 'ssdwdqe',
};
const GOOD_GAUSHALA = {
  userId: TARGET,
  gaushalaName: 'Shri Krishna Gaushala',
  description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.',
  address: 'Vrindavan Road, Mathura',
};
const JUNK_TEMPLE = { userId: TARGET, templeName: 'tt', description: 'x', address: 'y' };
const GOOD_TEMPLE = {
  userId: TARGET,
  templeName: 'Shri Mahakaleshwar Temple',
  description: 'Ancient jyotirlinga temple on the banks of the Shipra river.',
  address: 'Jaisinghpura, Ujjain, Madhya Pradesh',
};

async function patch(payload: Record<string, unknown>) {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await adminRoutes(instance);
    },
    { prefix: '/api/v1/admin' },
  );
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/v1/admin/users/${TARGET}`,
    headers: { authorization: 'Bearer demo-admin' },
    payload,
  });
  await app.close();
  return res;
}

function asRole(role: string) {
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([
    { userId: TARGET, role, isPrimary: true },
  ] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation((async (args: { where?: { id?: string; email?: string } }) => {
    if (args?.where?.email === 'admin@demo.com') return DEMO_ADMIN;
    if (args?.where?.id === TARGET) return { id: TARGET, fullName: 'Owner', email: 'o@x.com' };
    return null;
  }) as never);
  prismaMock.gaushalaProfile.updateMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.templeProfile.updateMany.mockResolvedValue({ count: 1 } as never);
});

describe('approval quality gate', () => {
  it('refuses to approve a junk gaushala with 400 and the reasons', async () => {
    asRole('GAUSHALA_MANAGER');
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue(JUNK_GAUSHALA as never);

    const res = await patch({ approved: true });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('cause_quality_failed');
    expect(body.reasons).toEqual([
      'description_too_short',
      'description_too_few_words',
      'address_too_short',
    ]);
    expect(prismaMock.gaushalaProfile.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to approve a junk temple with 400', async () => {
    asRole('TEMPLE_MANAGER');
    prismaMock.templeProfile.findUnique.mockResolvedValue(JUNK_TEMPLE as never);

    const res = await patch({ approved: true });

    expect(res.statusCode).toBe(400);
    expect(res.json().reasons).toContain('name_too_short');
    expect(prismaMock.templeProfile.updateMany).not.toHaveBeenCalled();
  });

  it('still approves a good gaushala', async () => {
    asRole('GAUSHALA_MANAGER');
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue(GOOD_GAUSHALA as never);

    const res = await patch({ approved: true });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.gaushalaProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: TARGET },
      data: { approved: true },
    });
  });

  it('still approves a good temple', async () => {
    asRole('TEMPLE_MANAGER');
    prismaMock.templeProfile.findUnique.mockResolvedValue(GOOD_TEMPLE as never);

    const res = await patch({ approved: true });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.templeProfile.updateMany).toHaveBeenCalled();
  });

  it('always allows un-approving a junk gaushala', async () => {
    asRole('GAUSHALA_MANAGER');
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue(JUNK_GAUSHALA as never);

    const res = await patch({ approved: false });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.gaushalaProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: TARGET },
      data: { approved: false },
    });
  });

  it('does not gate non-cause roles', async () => {
    asRole('STORE_OWNER');
    prismaMock.storeProfile.updateMany.mockResolvedValue({ count: 1 } as never);

    const res = await patch({ approved: true });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.gaushalaProfile.findUnique).not.toHaveBeenCalled();
  });
});
