import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminGurukulsRoutes } from './admin-gurukuls.js';

// Admin gurukul moderation list (GET /api/v1/admin/gurukuls/?status=all).
// Regression guard for the health-smoke "gurukul-mut: list empty" alert: the
// smoke fails when the list comes back EMPTY (no gurukul row to toggle), not
// necessarily on a 401. Pin BOTH behaviors: an admin principal must reach the
// handler (200, never 401/403) AND the response shape must expose
// `gurukuls[].id` + `isVerified` so the smoke's verify-toggle can find a row.

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const GURUKUL_ROW = {
  id: 'gurukul-1',
  slug: 'sampurnanand-sanskrit-vidyalaya',
  name: 'Sampurnanand Sanskrit Vidyalaya',
  city: 'Varanasi',
  state: 'UP',
  tradition: 'Vedic',
  isVerified: true,
  isActive: true,
  contactEmail: 'info@example.com',
  contactPhone: null,
  websiteUrl: null,
  createdAt: new Date('2026-01-01'),
  owner: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner' },
  _count: { programs: 3 },
};

function makeApp() {
  const app = Fastify();
  void app.register(adminGurukulsRoutes, { prefix: '/api/v1/admin/gurukuls' });
  return app;
}

describe('admin-gurukuls — admin can list (never 401) + smoke-compatible shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    // authenticateUser (demo-token path) resolves the user by email.
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
    );
    // ADMIN role assignment for requireRole('admin').
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: DEMO_ADMIN.id, role: 'ADMIN' },
    ] as any);
  });

  it('returns 200 (not 401/403) for an admin principal', async () => {
    prismaMock.gurukul.findMany.mockResolvedValue([GURUKUL_ROW]);
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/gurukuls/?status=all',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('response exposes gurukuls[].id + isVerified (smoke verify-toggle contract)', async () => {
    prismaMock.gurukul.findMany.mockResolvedValue([GURUKUL_ROW]);
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/gurukuls/?status=all',
      headers: { authorization: 'Bearer demo-admin' },
    });
    const body = res.json();
    expect(Array.isArray(body.gurukuls)).toBe(true);
    expect(body.gurukuls[0]).toHaveProperty('id');
    expect(body.gurukuls[0]).toHaveProperty('isVerified');
  });

  it('returns 200 with an empty array (not an error) when no gurukuls exist', async () => {
    prismaMock.gurukul.findMany.mockResolvedValue([]);
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/gurukuls/?status=all',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().gurukuls).toEqual([]);
  });
});
