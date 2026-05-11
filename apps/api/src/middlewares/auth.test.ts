import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { supabaseGetUser } = vi.hoisted(() => ({ supabaseGetUser: vi.fn() }));
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: supabaseGetUser } },
  isDemoMode: false,
}));

import { authenticateUser } from './auth.js';

// Minimal Fastify request/reply harness. We only exercise the slice the
// middleware touches: headers, log, currentUser, reply.code().send().
function makeReq(authHeader?: string) {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    log: { error: vi.fn() },
    currentUser: undefined as any,
  } as any;
}

function makeReply() {
  const reply: any = {
    statusCode: 200,
    body: undefined,
    code(c: number) {
      reply.statusCode = c;
      return reply;
    },
    send(b: any) {
      reply.body = b;
      return reply;
    },
  };
  return reply;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_DEMO_TOKENS = 'true';
});

describe('authenticateUser — blocked-user gate (P0 #6)', () => {
  // Regression lock for the User.blocked field. Spam/abuse handling
  // requires admins to flip a single boolean and have all 3 auth paths
  // refuse the next request immediately. No grace period — if a user
  // is blocked, they cannot consume a route. Returning 403 (not 401)
  // signals "we know who you are, you just can't be here" so the
  // frontend can show a proper "account suspended" screen instead of
  // bouncing back to login.

  it('blocks demo-token user when dbUser.blocked=true', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-demo-1',
      email: 'devotee@demo.com',
      phone: '+919999',
      fullName: 'Blocked Devotee',
      subscriptionTier: 'free',
      blocked: true,
      blockedReason: 'spam',
    });

    const req = makeReq('Bearer demo-devotee-x');
    const reply = makeReply();

    await authenticateUser(req, reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body?.error).toMatch(/forbidden/i);
    expect(reply.body?.message).toMatch(/suspend|block/i);
    expect(req.currentUser).toBeUndefined();
  });

  it('blocks email-session-token user when dbUser.blocked=true', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'mail@user.com',
      phone: null,
      fullName: 'Mail User',
      subscriptionTier: 'free',
      blocked: true,
    });

    const req = makeReq(
      'Bearer email-11111111-1111-1111-1111-111111111111-' + 'a'.repeat(32)
    );
    const reply = makeReply();

    await authenticateUser(req, reply);

    expect(reply.statusCode).toBe(403);
    expect(req.currentUser).toBeUndefined();
  });

  it('blocks Supabase-JWT user when dbUser.blocked=true', async () => {
    supabaseGetUser.mockResolvedValue({
      data: { user: { id: 'sb-1', phone: '+919999' } },
      error: null,
    });
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'u-jwt-1',
      email: 'jwt@user.com',
      phone: '+919999',
      fullName: 'JWT User',
      subscriptionTier: 'free',
      blocked: true,
    });
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);

    const req = makeReq('Bearer eyJ.fake.jwt');
    const reply = makeReply();

    await authenticateUser(req, reply);

    expect(reply.statusCode).toBe(403);
    expect(req.currentUser).toBeUndefined();
  });

  it('lets non-blocked user pass (sanity check)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-ok',
      email: 'devotee@demo.com',
      phone: '+919999',
      fullName: 'OK Devotee',
      subscriptionTier: 'free',
      blocked: false,
    });

    const req = makeReq('Bearer demo-devotee-x');
    const reply = makeReply();

    await authenticateUser(req, reply);

    expect(reply.statusCode).toBe(200);
    expect(req.currentUser?.id).toBe('u-ok');
  });
});
