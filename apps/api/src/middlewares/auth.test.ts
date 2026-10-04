import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { supabaseGetUser } = vi.hoisted(() => ({ supabaseGetUser: vi.fn() }));
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: supabaseGetUser } },
  isDemoMode: false,
}));

import { authenticateUser, requireRole } from './auth.js';

// Minimal Fastify request/reply harness. We only exercise the slice the
// middleware touches: headers, log, currentUser, reply.code().send().
function makeReq(authHeader?: string) {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
    currentUser: undefined as any,
  } as any;
}

function makeReply() {
  const reply: any = {
    // AUTH-07 (2026-09-08): a real FastifyReply always has `header`/`getHeader`,
    // and `authenticateUser` now stamps `X-Auth-Reason` on every 401 it sends.
    // Without these on the stub the middleware threw, the throw was swallowed by
    // its own catch, and these tests read 500 where they assert 401 — a fake
    // failure produced entirely by an incomplete fake.
    headers: {} as Record<string, string>,
    header(name: string, value: string) {
      reply.headers[String(name).toLowerCase()] = value;
      return reply;
    },
    getHeader(name: string) {
      return reply.headers[String(name).toLowerCase()];
    },
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
    // A valid, non-revoked, non-expired email_sessions row must exist for the
    // token to be honored (A-005 fail-closed); the block gate then applies.
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { revoked_at: null, expires_at: new Date(Date.now() + 60 * 60 * 1000) },
    ]);
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

// ─── requireRole('priest') — verification gate (P0 #ag-01 / pp-04) ────────
// The legacy implementation short-circuited on the PANDIT role alone, BEFORE
// checking the Priest row's status. That let any self-signup pandit (no
// Priest row, or an inactive one) reach every priest endpoint. The fix
// requires an ACTIVE Priest record regardless of the PANDIT role.
describe("requireRole('priest') — must require an active Priest row", () => {
  const priestGuard = requireRole('priest');

  function reqWith(roles: string[], userId = 'u-real-uuid') {
    return {
      currentUser: { id: userId, roles } as any,
    } as any;
  }

  it('403s a PANDIT who has NO Priest row (self-signup bypass)', async () => {
    prismaMock.priest.findUnique.mockResolvedValue(null);
    const reply = makeReply();
    await priestGuard(reqWith(['PANDIT', 'DEVOTEE']), reply);
    expect(reply.statusCode).toBe(403);
  });

  it('403s a PANDIT whose Priest row is inactive (backfill / suspended)', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: 'p1', status: 'inactive', verificationStatus: 'pending' });
    const reply = makeReply();
    await priestGuard(reqWith(['PANDIT', 'DEVOTEE']), reply);
    expect(reply.statusCode).toBe(403);
  });

  it('passes a PANDIT with an ACTIVE Priest row (legit onboarded priest)', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: 'p1', status: 'active', verificationStatus: 'pending' });
    const reply = makeReply();
    await priestGuard(reqWith(['PANDIT', 'DEVOTEE']), reply);
    expect(reply.statusCode).toBe(200);
  });

  it('403s a synthetic demo- id even with PANDIT (never hits the DB lookup)', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: 'p1', status: 'active', verificationStatus: 'pending' });
    const reply = makeReply();
    await priestGuard(reqWith(['PANDIT', 'DEVOTEE'], 'demo-pandit'), reply);
    expect(reply.statusCode).toBe(403);
  });
});

// ── A-005 regression lock: forged email- token must NOT authenticate ──
// Before the 2026-08-10 fix, the email- branch fell through to "allow" when no
// email_sessions row existed — and no code ever wrote that table — so
// `email-<anyKnownUserId>-<any 32 hex>` authenticated as that user (incl. admin).
// These tests pin the fail-closed behavior shut. Kept as a self-contained
// top-level describe (with explicit mock resets) so its findUnique/queryRaw
// stubs cannot bleed into the order-sensitive blocked-user-gate tests above.
describe('A-005 — email- token forgery is rejected (fail-closed)', () => {
  const FORGED =
    'Bearer email-11111111-1111-1111-1111-111111111111-' + 'a'.repeat(32);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'production'; // no NODE_ENV gate on this branch — prove it holds in prod
    prismaMock.user.findUnique.mockReset();
    prismaMock.$queryRawUnsafe.mockReset();
  });

  it('rejects a well-formed email- token with NO session row (the forgery vector)', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]); // table empty → forged
    prismaMock.user.findUnique.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'victim@user.com',
      blocked: false,
    });

    const req = makeReq(FORGED);
    const reply = makeReply();
    await authenticateUser(req, reply);

    expect(reply.statusCode).toBe(401);
    expect(req.currentUser).toBeUndefined();
    // The user lookup must never even be reached for a rowless token.
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an email- token whose session row is revoked', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { revoked_at: new Date(), expires_at: new Date(Date.now() + 60_000) },
    ]);
    const req = makeReq(FORGED);
    const reply = makeReply();
    await authenticateUser(req, reply);
    expect(reply.statusCode).toBe(401);
    expect(req.currentUser).toBeUndefined();
  });

  it('rejects an email- token whose session row is expired', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { revoked_at: null, expires_at: new Date(Date.now() - 60_000) },
    ]);
    const req = makeReq(FORGED);
    const reply = makeReply();
    await authenticateUser(req, reply);
    expect(reply.statusCode).toBe(401);
    expect(req.currentUser).toBeUndefined();
  });

  it('accepts an email- token backed by a valid, unexpired, non-revoked row', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { revoked_at: null, expires_at: new Date(Date.now() + 60 * 60 * 1000) },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'real@user.com',
      blocked: false,
    });
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);

    const req = makeReq(FORGED);
    const reply = makeReply();
    await authenticateUser(req, reply);

    expect(reply.statusCode).toBe(200);
    expect(req.currentUser?.id).toBe('11111111-1111-1111-1111-111111111111');
  });
});
