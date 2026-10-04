import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { supportRoutes } from './support.js';

/**
 * Two support defects, both of them authorization-shaped.
 *
 * 1. /support/tickets/view rendered "Mark resolved" and "Escalate" for the
 *    DEVOTEE and wired both to PATCH /tickets/:id — a route that answers
 *    403 "Admin role required" to everybody but an admin. The reporter of a
 *    ticket got a permission error from a button on their own ticket.
 *
 *    The fix is NOT a looser PATCH guard. PATCH also writes priority and
 *    assignedToId, so widening it would hand the support queue's controls to
 *    every devotee — a worse bug than the one being fixed. POST
 *    …/tickets/:id/resolve is a second, narrower door: owner only, RESOLVED or
 *    CLOSED only, status + resolvedAt only.
 *
 * 2. The admin assignee picker offered five hardcoded display names and sent
 *    the chosen NAME at `assignedToId: z.string().uuid()`, so every assignment
 *    400'd. GET /agents is where the real ids come from — admin-gated, id and
 *    display name only, never a user directory.
 *
 * The field names are pinned by RE-READING the route source at the bottom of
 * this file. `z.object` STRIPS unknown keys rather than rejecting them, so a
 * renamed or misspelled field fails SILENTLY with a 200 — that exact mechanism
 * has produced four separate bugs in this feature already.
 */

const OWNER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const ADMIN = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const TICKET_ID = '33333333-3333-4333-8333-333333333333';

/** A ticket owned by OWNER. */
const TICKET = {
  id: TICKET_ID,
  ticketNumber: 'ST-20260908-AB12',
  userId: OWNER.id,
  subject: 'Prasad never arrived',
  body: 'Category: Puja Bookings\n\nStill nothing.',
  category: 'BOOKING',
  status: 'OPEN',
  priority: 'MEDIUM',
  assignedToId: null,
  resolvedAt: null,
  createdAt: new Date('2026-09-07T06:00:00.000Z'),
  updatedAt: new Date('2026-09-07T06:00:00.000Z'),
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await supportRoutes(instance);
  }, { prefix: '/api/v1/support' });
  return app;
}

async function resolveAs(token: string, body: unknown) {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/support/tickets/${TICKET_ID}/resolve`,
    headers: { authorization: `Bearer ${token}` },
    payload: body as Record<string, unknown>,
  });
  await app.close();
  return res;
}

async function agentsAs(token: string) {
  const app = await buildApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/support/agents',
    headers: { authorization: `Bearer ${token}` },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test'; // enables the demo-token bypass in auth middleware
  delete process.env.ADMIN_EMAILS;
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'admin@demo.com') return ADMIN;
    if (args.where.email === 'devotee@demo.com') return OWNER;
    return null;
  });
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([] as never);
  prismaMock.supportTicket.findUnique.mockResolvedValue(TICKET as never);
  prismaMock.supportTicket.update.mockImplementation(
    async (args: { data: Record<string, unknown> }) =>
      ({ ...TICKET, ...args.data }) as never,
  );
  prismaMock.user.findMany.mockResolvedValue([] as never);
});

describe('POST /support/tickets/:id/resolve — the reporter closes their own ticket', () => {
  it('lets the OWNER mark their own ticket resolved', async () => {
    const res = await resolveAs('demo-devotee', { status: 'RESOLVED' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('RESOLVED');
    expect(prismaMock.supportTicket.update).toHaveBeenCalledTimes(1);
  });

  it('defaults to RESOLVED when the body says nothing', async () => {
    const res = await resolveAs('demo-devotee', {});
    expect(res.statusCode).toBe(200);
    const args = prismaMock.supportTicket.update.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(args.data.status).toBe('RESOLVED');
  });

  it('accepts CLOSED — the other way a reporter says "done"', async () => {
    const res = await resolveAs('demo-devotee', { status: 'CLOSED' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('CLOSED');
  });

  // ── The guard ────────────────────────────────────────────────────────────

  it('403s a devotee who does NOT own the ticket, and writes nothing', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue({
      ...TICKET,
      userId: '44444444-4444-4444-8444-444444444444',
    } as never);
    const res = await resolveAs('demo-devotee', { status: 'RESOLVED' });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/opened this ticket/i);
    expect(prismaMock.supportTicket.update).not.toHaveBeenCalled();
  });

  it('403s an ADMIN on somebody else’s ticket — this door is the owner’s, not a second admin route', async () => {
    const res = await resolveAs('demo-admin', { status: 'CLOSED' });
    expect(res.statusCode).toBe(403);
    expect(prismaMock.supportTicket.update).not.toHaveBeenCalled();
  });

  it('401s an anonymous caller', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/support/tickets/${TICKET_ID}/resolve`,
      payload: { status: 'RESOLVED' },
    });
    await app.close();
    expect(res.statusCode).toBe(401);
    expect(prismaMock.supportTicket.update).not.toHaveBeenCalled();
  });

  it('404s a ticket that does not exist', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue(null as never);
    const res = await resolveAs('demo-devotee', { status: 'RESOLVED' });
    expect(res.statusCode).toBe(404);
  });

  // ── The narrowness ───────────────────────────────────────────────────────

  it('refuses every status but RESOLVED and CLOSED — an owner cannot reopen or take queue state', async () => {
    for (const status of ['OPEN', 'IN_PROGRESS', 'resolved', 'DELETED']) {
      vi.clearAllMocks();
      prismaMock.supportTicket.findUnique.mockResolvedValue(TICKET as never);
      const res = await resolveAs('demo-devotee', { status });
      expect(res.statusCode, `status=${status} must be rejected`).toBe(400);
      expect(prismaMock.supportTicket.update).not.toHaveBeenCalled();
    }
  });

  it('writes status and resolvedAt and NOTHING else', async () => {
    await resolveAs('demo-devotee', { status: 'RESOLVED' });
    const args = prismaMock.supportTicket.update.mock.calls[0]![0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(args.where).toEqual({ id: TICKET_ID });
    expect(Object.keys(args.data).sort()).toEqual(['resolvedAt', 'status']);
    expect(args.data.resolvedAt).toBeInstanceOf(Date);
  });

  it('a body smuggling priority / assignedToId cannot escalate or assign — z.object strips them', async () => {
    // The stripping is the mechanism that made four earlier bugs silent. Here
    // it is the safety property: an owner posting the admin route's fields at
    // this route changes nothing but the status.
    const res = await resolveAs('demo-devotee', {
      status: 'RESOLVED',
      priority: 'URGENT',
      assignedToId: ADMIN.id,
      userId: ADMIN.id,
    });
    expect(res.statusCode).toBe(200);
    const args = prismaMock.supportTicket.update.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(args.data).not.toHaveProperty('priority');
    expect(args.data).not.toHaveProperty('assignedToId');
    expect(args.data).not.toHaveProperty('userId');
  });

  it('leaves PATCH /tickets/:id admin-only — the owner is still refused there', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/support/tickets/${TICKET_ID}`,
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { status: 'RESOLVED' },
    });
    await app.close();
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('Admin role required');
    expect(prismaMock.supportTicket.update).not.toHaveBeenCalled();
  });
});

describe('GET /support/agents — real ids for the assignee picker', () => {
  it('403s a non-admin: this is not a user directory', async () => {
    const res = await agentsAs('demo-devotee');
    expect(res.statusCode).toBe(403);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it('401s an anonymous caller', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/support/agents' });
    await app.close();
    expect(res.statusCode).toBe(401);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it('returns id + display name only — no email, no phone', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: ADMIN.id, fullName: 'Demo Admin', email: 'admin@demo.com' },
    ] as never);
    const res = await agentsAs('demo-admin');
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([{ id: ADMIN.id, name: 'Demo Admin' }]);
    const body = res.body;
    expect(body).not.toContain('admin@demo.com');
    expect(body).not.toContain('phone');
  });

  it('every id it offers is a uuid — a name here is what 400d every assignment', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: ADMIN.id, fullName: 'Demo Admin', email: 'admin@demo.com' },
      { id: OWNER.id, fullName: '', email: 'ops.lead@darshya.online' },
    ] as never);
    const res = await agentsAs('demo-admin');
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const agent of res.json().data as Array<{ id: string; name: string }>) {
      expect(agent.id).toMatch(uuid);
      expect(agent.name.length).toBeGreaterThan(0);
    }
    // A blank fullName falls back to the local part, never to an empty option.
    expect((res.json().data as Array<{ name: string }>)[1]!.name).toBe('ops.lead');
  });

  it('asks for role-assignment admins AND the ADMIN_EMAILS allow-list, and skips blocked accounts', async () => {
    process.env.ADMIN_EMAILS = 'Owner@Darshya.Online , ops@darshya.online';
    await agentsAs('demo-admin');
    const args = prismaMock.user.findMany.mock.calls[0]![0] as {
      where: { blocked: boolean; OR: Array<Record<string, unknown>> };
      select: Record<string, boolean>;
      take: number;
    };
    expect(args.where.blocked).toBe(false);
    expect(args.where.OR[0]).toEqual({ roleAssignments: { some: { role: 'ADMIN' } } });
    // Trimmed + lowercased exactly as middlewares/auth.ts parses the same env.
    expect(args.where.OR.slice(1)).toEqual([
      { email: { equals: 'owner@darshya.online', mode: 'insensitive' } },
      { email: { equals: 'ops@darshya.online', mode: 'insensitive' } },
    ]);
    // Never selects anything the picker does not render.
    expect(Object.keys(args.select).sort()).toEqual(['email', 'fullName', 'id']);
    expect(args.take).toBe(100);
  });

  it('an unset ADMIN_EMAILS contributes no blank-email clause', async () => {
    process.env.ADMIN_EMAILS = '';
    await agentsAs('demo-admin');
    const args = prismaMock.user.findMany.mock.calls[0]![0] as {
      where: { OR: Array<Record<string, unknown>> };
    };
    expect(args.where.OR).toHaveLength(1);
    expect(args.where.OR[0]).toEqual({ roleAssignments: { some: { role: 'ADMIN' } } });
  });

  it('reports a lookup failure instead of answering with an empty picker', async () => {
    prismaMock.user.findMany.mockRejectedValue(new Error('db down') as never);
    const res = await agentsAs('demo-admin');
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('Failed to list support agents');
  });
});

describe('the field names this feature is pinned to', () => {
  // `z.object` strips unknown keys, so a rename on either side is a silent
  // 200 that does nothing. Re-read the route rather than restate it.
  const routeSrc = readFileSync(fileURLToPath(new URL('./support.ts', import.meta.url)), 'utf8');

  it('the owner route is a POST at …/resolve with its own owner guard', () => {
    expect(routeSrc).toContain("server.post('/tickets/:id/resolve'");
    expect(routeSrc).toMatch(/ticket\.userId !== request\.currentUser!\.id/);
  });

  it('the owner schema admits RESOLVED and CLOSED and nothing else', () => {
    const members = /ownerResolutionSchema = z\.object\(\{\s*status: z\.enum\(\[([^\]]+)\]\)/.exec(
      routeSrc,
    )?.[1];
    expect(members).toBeTruthy();
    expect([...members!.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1])).toEqual([
      'RESOLVED',
      'CLOSED',
    ]);
    // priority / assignedToId are not fields on it.
    const schemaBlock = /ownerResolutionSchema = z\.object\(\{[\s\S]*?\}\);/.exec(routeSrc)![0];
    expect(schemaBlock).not.toContain('priority');
    expect(schemaBlock).not.toContain('assignedToId');
  });

  it('the assignee field is still assignedToId and still a uuid', () => {
    expect(routeSrc).toMatch(/assignedToId: z\.string\(\)\.uuid\(\)/);
  });

  it('the agents route is admin-gated in its own body', () => {
    const block = /server\.get\('\/agents'[\s\S]*?\n  \}\);/.exec(routeSrc)?.[0] ?? '';
    expect(block).toContain('if (!isAdmin(request))');
    expect(block).toContain('Admin role required');
  });
});
