import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';

/**
 * Latency (2026-10-29): the first request on a fresh access token (every page
 * load, right after /auth/refresh) read the user row, then the revocation
 * cutoff, then the role rows, one after the other, ~0.4 s each against the
 * remote database. They are keyed on the same id, so they now run together.
 * The decision order and every response stay as they were.
 */

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const { supabaseAdmin, prismaMock, timeline } = vi.hoisted(() => {
  const timeline: string[] = [];
  const prismaMock: Record<string, any> = {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    userRoleAssignment: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  };
  return { supabaseAdmin: { auth: { getUser: vi.fn() } }, prismaMock, timeline };
});

vi.mock('../lib/supabase.js', () => ({ supabaseAdmin, isDemoMode: false }));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { authenticateUser } from './auth.js';
import { __authCacheClear } from '../lib/auth-cache.js';
import { __revocationReset } from '../lib/token-revocation.js';

const SECRET = 'project-jwt-secret-under-test';
const b64url = (i: string | Buffer) => Buffer.from(i).toString('base64url');
function token(over: Record<string, unknown> = {}): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({
    sub: UID, aud: 'authenticated', role: 'authenticated', email: 'devotee@demo.com',
    iat: now - 120, exp: now + 3600, session_id: 'sess-A', ...over,
  }));
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${b64url(sig)}`;
}
function makeRequest(tok: string) {
  return { headers: { authorization: `Bearer ${tok}` }, cookies: {}, url: '/x', log: { warn: vi.fn(), error: vi.fn() }, currentUser: undefined as unknown } as any;
}
function makeReply() {
  const reply: any = {
    headers: {} as Record<string, string>,
    header(n: string, v: string) { reply.headers[n.toLowerCase()] = v; return reply; },
    getHeader(n: string) { return reply.headers[n.toLowerCase()]; },
    statusCode: 0, payload: undefined,
    code(c: number) { reply.statusCode = c; return reply; },
    send(p: unknown) { reply.payload = p; return reply; },
  };
  return reply;
}
async function call(tok: string) {
  const req = makeRequest(tok); const reply = makeReply();
  await authenticateUser(req, reply);
  return { req, reply };
}
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const DB_USER = { id: UID, phone: null, email: 'devotee@demo.com', fullName: 'D', subscriptionTier: 'free', blocked: false };
const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  timeline.length = 0;
  __authCacheClear(); __revocationReset();
  process.env.NODE_ENV = 'production';
  process.env.SUPABASE_JWT_SECRET = SECRET;
  prismaMock.user.findUnique.mockImplementation(async () => {
    timeline.push('user:start'); await tick(); timeline.push('user:end'); return DB_USER;
  });
  prismaMock.userRoleAssignment.findMany.mockImplementation(async () => {
    timeline.push('roles:start'); await tick(); timeline.push('roles:end'); return [{ role: 'PANDIT' }];
  });
  prismaMock.$queryRawUnsafe.mockImplementation(async () => {
    timeline.push('revoke:start'); await tick(); timeline.push('revoke:end'); return [];
  });
});
afterEach(() => { process.env = { ...ORIG_ENV }; });

describe('authenticateUser cold path', () => {
  it('starts the user, revocation and role reads before any of them finishes', async () => {
    const { reply, req } = await call(token());
    expect(reply.statusCode).toBe(0);
    const firstEnd = timeline.findIndex((e) => e.endsWith(':end'));
    expect(timeline.slice(0, firstEnd).sort()).toEqual(['revoke:start', 'roles:start', 'user:start']);
    expect(req.currentUser).toMatchObject({ id: UID, roles: ['PANDIT', 'DEVOTEE'] });
  });

  it('a blocked account is still refused with 403 (and never cached)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...DB_USER, blocked: true, blockedReason: 'fraud' });
    const { reply, req } = await call(token());
    expect(reply.statusCode).toBe(403);
    expect(req.currentUser).toBeUndefined();
  });

  it('an unknown account is still refused with registration_incomplete', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    const { reply } = await call(token({ email: undefined }));
    expect(reply.statusCode).toBe(401);
    expect(reply.headers['x-auth-reason']).toBe('registration_incomplete');
  });

  it('a user found by e-mail under a different id gets that id\'s roles and revocation check', async () => {
    prismaMock.user.findUnique.mockImplementation(async (args: any) => (args.where.id ? null : { ...DB_USER, id: OTHER }));
    const asked: string[] = [];
    prismaMock.userRoleAssignment.findMany.mockImplementation(async (args: any) => {
      asked.push(args.where.userId);
      return args.where.userId === OTHER ? [{ role: 'TEMPLE_MANAGER' }] : [];
    });
    prismaMock.$queryRawUnsafe.mockImplementation(async (_sql: string, userId: string) => {
      asked.push('revoke:' + userId);
      return [];
    });
    const { reply, req } = await call(token());
    expect(reply.statusCode).toBe(0);
    expect(req.currentUser).toMatchObject({ id: OTHER, roles: ['TEMPLE_MANAGER', 'DEVOTEE'] });
    expect(asked).toContain('revoke:' + OTHER);
    expect(asked).toContain(OTHER);
  });

  it('a revoked token is refused even though roles were read early', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ session_id: '', valid_after: new Date(Date.now() + 60_000) }]);
    const { reply, req } = await call(token());
    expect(reply.statusCode).toBe(401);
    expect(reply.headers['x-auth-reason']).toBe('session_revoked');
    expect(req.currentUser).toBeUndefined();
  });
});
