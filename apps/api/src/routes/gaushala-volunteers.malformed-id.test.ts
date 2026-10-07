import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { gaushalaVolunteersRoutes } from './gaushala-volunteers.js';

/**
 * Role pass 2026-10-07: `DELETE /gaushala-portal/volunteers/not-a-uuid` was a 500
 * (Prisma P2023 on the uuid column) while the sibling cows routes answered 404.
 */
const MANAGER = {
  id: '77777777-7777-4777-8777-777777777777',
  email: 'gaushala@demo.com',
  phone: null,
  fullName: 'Demo Gaushala Manager',
  subscriptionTier: 'free',
  blocked: false,
};

function send(method: 'PATCH' | 'DELETE', url: string, payload?: object) {
  const app = Fastify();
  void app.register(gaushalaVolunteersRoutes, { prefix: '/api/v1/gaushala-portal' });
  return app.inject({
    method,
    url: `/api/v1/gaushala-portal${url}`,
    headers: { authorization: 'Bearer demo-gaushala' },
    ...(payload ? { payload } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEMO_TOKENS = 'true';
  (prismaMock as any).volunteer = {
    findFirst: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
    delete: vi.fn(),
  };
  prismaMock.user.findUnique.mockImplementation(async (args: any) =>
    args.where.email === 'gaushala@demo.com' ? MANAGER : null,
  );
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([
    { userId: MANAGER.id, role: 'GAUSHALA_MANAGER' },
  ] as any);
});

describe('gaushala volunteers: malformed ids', () => {
  it('DELETE with a non-uuid id is 404 and never reaches Prisma', async () => {
    const res = await send('DELETE', '/volunteers/not-a-uuid');
    expect(res.statusCode).toBe(404);
    expect((prismaMock as any).volunteer.findFirst).not.toHaveBeenCalled();
  });

  it('PATCH with a non-uuid id is 404 and never reaches Prisma', async () => {
    const res = await send('PATCH', '/volunteers/not-a-uuid', { fullName: 'Ram' });
    expect(res.statusCode).toBe(404);
    expect((prismaMock as any).volunteer.findFirst).not.toHaveBeenCalled();
  });

  it('a well-formed id that is not yours is still 404', async () => {
    const res = await send('DELETE', '/volunteers/11111111-1111-4111-8111-111111111111');
    expect(res.statusCode).toBe(404);
    expect((prismaMock as any).volunteer.delete).not.toHaveBeenCalled();
  });
});
