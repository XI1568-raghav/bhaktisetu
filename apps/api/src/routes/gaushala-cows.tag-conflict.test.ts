import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

const cowMock = vi.hoisted(() => ({ findFirst: vi.fn(), update: vi.fn() }));
vi.mock('../lib/prisma.js', () => ({ prisma: Object.assign(prismaMock, { cow: cowMock }) }));

import Fastify from 'fastify';
import { gaushalaCowsRoutes } from './gaushala-cows.js';

// QA 2026-10-13: PATCH /cows/:id onto a tag the gaushala already uses raised
// P2002 and answered 500; POST answers the same conflict as 409.

const MANAGER = {
  id: '55555555-5555-4555-8555-555555555555',
  email: 'gaushala@demo.com',
  phone: null,
  fullName: 'G',
  subscriptionTier: 'free',
  blocked: false,
};
const COW = '66666666-6666-4666-8666-666666666666';

describe('gaushala cows — tag conflict on update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (a: any) =>
      a.where.email === 'gaushala@demo.com' ? MANAGER : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    cowMock.findFirst.mockResolvedValue({ id: COW } as any);
  });

  it('answers 409, not 500', async () => {
    cowMock.update.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
    const app = Fastify();
    void app.register(gaushalaCowsRoutes, { prefix: '/api/v1/gaushala-portal' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/gaushala-portal/cows/${COW}`,
      headers: { authorization: 'Bearer demo-gaushala' },
      payload: { tagNumber: 'B-001' },
    });
    expect(res.statusCode).toBe(409);
  });
});
