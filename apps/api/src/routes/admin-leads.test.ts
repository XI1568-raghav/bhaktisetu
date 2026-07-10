import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
// The email send is fire-and-forget in the route; stub it so no real I/O runs.
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import Fastify from 'fastify';
import { adminLeadsRoutes } from './admin-leads.js';

// PBO-6 (2026-07-10): POST /api/v1/admin/leads/:id/status with status=CONVERTED
// must provision a real User + provider profile (approved) and set
// lead.convertedUserId. Previously it flipped the status and sent a
// "you're verified, sign in" email WITHOUT creating any account.

const LEAD_ID = 'lead-0001';
const LEAD_EMAIL = 'pandit.ji@example.com';
const NEW_USER_ID = 'user-new-from-lead';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(adminLeadsRoutes, { prefix: '/api/v1/admin' });
  return app;
}

describe('PBO-6 — lead CONVERTED provisions User + approved profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
    );
    prismaMock.user.findFirst.mockResolvedValue(null); // no existing user by lead email
    prismaMock.user.create.mockResolvedValue({ id: NEW_USER_ID, email: LEAD_EMAIL });
    prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
    prismaMock.panditProfile.upsert.mockResolvedValue({ id: 'pp-1', userId: NEW_USER_ID });
    prismaMock.panditProfile.updateMany.mockResolvedValue({ count: 1 });
  });

  it('CONVERTED creates a User, seeds DEVOTEE + PANDIT role + profile, approves it, sets convertedUserId', async () => {
    prismaMock.lead.findUnique.mockResolvedValue({
      id: LEAD_ID,
      role: 'PRIEST',
      name: 'Pandit Sharma',
      email: LEAD_EMAIL,
      phone: null,
      city: 'Varanasi',
      state: 'UP',
      country: 'India',
      source: 'canada-pandit',
      convertedUserId: null,
      status: 'REPLIED',
      notes: '',
    });
    prismaMock.lead.update.mockResolvedValue({ id: LEAD_ID, status: 'CONVERTED' });

    const app = makeApp();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${LEAD_ID}/status`,
      headers: { authorization: 'Bearer demo-admin' },
      payload: { status: 'CONVERTED', sendEmail: false },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.provisionedUserId).toBe(NEW_USER_ID);

    // User find-or-create by email
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { email: LEAD_EMAIL } }));
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: LEAD_EMAIL, fullName: 'Pandit Sharma', locationCity: 'Varanasi' }),
    }));

    // DEVOTEE baseline role + provider role both seeded via upsert
    const roleUpserts = prismaMock.userRoleAssignment.upsert.mock.calls.map((c) => c[0]);
    expect(roleUpserts.some((c) => c.where.userId_role.role === 'DEVOTEE')).toBe(true);
    // upsertProviderProfile seeds the PANDIT role
    expect(roleUpserts.some((c) => c.where.userId_role.role === 'PANDIT')).toBe(true);

    // Provider profile upserted (panditProfile, since PRIEST → PANDIT)
    expect(prismaMock.panditProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: NEW_USER_ID } }));
    // ...and approved (approved=true + approvedAt)
    expect(prismaMock.panditProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: NEW_USER_ID },
      data: expect.objectContaining({ approved: true, approvedAt: expect.any(Date) }),
    }));

    // Lead stamped with convertedUserId (second lead.update call)
    const leadUpdates = prismaMock.lead.update.mock.calls.map((c) => c[0]);
    expect(leadUpdates.some((c) => c.data?.convertedUserId === NEW_USER_ID)).toBe(true);

    await app.close();
  });

  it('CONVERTED is idempotent — skips provisioning when convertedUserId already set', async () => {
    prismaMock.lead.findUnique.mockResolvedValue({
      id: LEAD_ID,
      role: 'ASTROLOGER',
      name: 'Astro Ravi',
      email: LEAD_EMAIL,
      phone: null,
      city: null,
      state: null,
      country: 'India',
      source: 'x',
      convertedUserId: 'user-already-exists',
      status: 'REPLIED',
      notes: '',
    });
    prismaMock.lead.update.mockResolvedValue({ id: LEAD_ID, status: 'CONVERTED' });

    const app = makeApp();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${LEAD_ID}/status`,
      headers: { authorization: 'Bearer demo-admin' },
      payload: { status: 'CONVERTED', sendEmail: false },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().provisionedUserId).toBeNull();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.astrologerProfile.updateMany).not.toHaveBeenCalled();
    await app.close();
  });

  it('non-CONVERTED status (EMAILED) does NOT provision', async () => {
    prismaMock.lead.findUnique.mockResolvedValue({
      id: LEAD_ID,
      role: 'PRIEST',
      name: 'Pandit Sharma',
      email: LEAD_EMAIL,
      phone: null,
      city: null,
      state: null,
      country: 'India',
      source: 'x',
      convertedUserId: null,
      status: 'NEW',
      notes: '',
    });
    prismaMock.lead.update.mockResolvedValue({ id: LEAD_ID, status: 'EMAILED' });

    const app = makeApp();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${LEAD_ID}/status`,
      headers: { authorization: 'Bearer demo-admin' },
      payload: { status: 'EMAILED', sendEmail: false },
    });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.panditProfile.updateMany).not.toHaveBeenCalled();
    await app.close();
  });
});
