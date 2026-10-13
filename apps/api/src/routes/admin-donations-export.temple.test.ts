import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminDonationsExportRoutes } from './admin-donations-export.js';

// QA 2026-10-13: temple donations exported with an empty donee name and id
// (the query only joined gaushala_profiles) - useless for 80G reconciliation.

const ADMIN = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Admin',
  subscriptionTier: 'free',
  blocked: false,
};

describe('admin donations export - temple donee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (a: any) =>
      a.where.email === 'admin@demo.com' ? ADMIN : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  });

  it('joins temples so the donee is named', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    const app = Fastify();
    void app.register(adminDonationsExportRoutes, { prefix: '/api/v1/admin/donations' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/donations/export.csv',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(200);
    const sql = String(prismaMock.$queryRawUnsafe.mock.calls[0]?.[0]);
    expect(sql).toMatch(/LEFT JOIN temples t\s+ON t\.id = d\.temple_id/);
    expect(sql).toMatch(/COALESCE\(gp\.gaushala_name, t\.name\)/);
  });
});

describe('admin donations export - donor PAN', () => {
  it('selects the stored donor PAN instead of a hardcoded NULL', async () => {
    const src = (await import('node:fs')).readFileSync(new URL('./admin-donations-export.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/d\.donor_pan\s+AS donor_pan/);
    expect(src).not.toMatch(/NULL::text\s+AS donor_pan/);
  });
});
