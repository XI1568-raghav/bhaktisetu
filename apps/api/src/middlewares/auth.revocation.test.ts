import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';

/**
 * Access-token revocation (lib/token-revocation.ts) as seen through the real
 * auth middleware. A fake `auth_token_revocations` table sits behind the prisma
 * mock so the SQL contract (one read per user per cache window, upsert on write,
 * lazy create, fail open) is exercised end to end.
 */

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const { supabaseAdmin, prismaMock, db } = vi.hoisted(() => {
  const db = {
    rows: new Map<string, { user_id: string; session_id: string; valid_after: Date }>(),
    tableExists: true,
    failReads: false,
    reads: 0,
  };
  const prismaMock: Record<string, any> = {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    userRoleAssignment: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(async (sql: string, userId: string) => {
      db.reads += 1;
      if (db.failReads) throw new Error('connection reset');
      if (!db.tableExists) throw Object.assign(new Error('relation "auth_token_revocations" does not exist'), { code: 'P2010', meta: { code: '42P01' } });
      return [...db.rows.values()].filter((r) => r.user_id === userId);
    }),
    $executeRawUnsafe: vi.fn(async (sql: string, userId?: string, sessionId?: string) => {
      if (/^CREATE TABLE/i.test(sql.trim())) { db.tableExists = true; return 0; }
      if (/^DELETE/i.test(sql.trim())) return 0;
      if (/INSERT INTO "auth_token_revocations"/.test(sql)) {
        if (!db.tableExists) throw Object.assign(new Error('relation does not exist'), { meta: { code: '42P01' } });
        db.rows.set(`${userId}|${sessionId}`, { user_id: userId!, session_id: sessionId!, valid_after: new Date() });
        return 1;
      }
      return 0;
    }),
  };
  return { supabaseAdmin: { auth: { getUser: vi.fn() } }, prismaMock, db };
});

vi.mock('../lib/supabase.js', () => ({ supabaseAdmin, isDemoMode: false }));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { authenticateUser } from './auth.js';
import { __authCacheClear, invalidateAuthUser } from '../lib/auth-cache.js';
import { __revocationReset, __revocationEvictUser, __revocationStats, revokeUserTokens, isTokenRevoked } from '../lib/token-revocation.js';

const SECRET = 'project-jwt-secret-under-test';
const b64url = (i: string | Buffer) => Buffer.from(i).toString('base64url');

function token(over: Record<string, unknown> = {}, secret = SECRET): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({
    sub: UID, aud: 'authenticated', role: 'authenticated', email: 'devotee@demo.com',
    iat: now - 120, exp: now + 3600, session_id: 'sess-A', ...over,
  }));
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest();
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

const DB_USER = { id: UID, phone: null, email: 'devotee@demo.com', fullName: 'D', subscriptionTier: 'free', blocked: false };
const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  db.rows.clear(); db.tableExists = true; db.failReads = false; db.reads = 0;
  __authCacheClear(); __revocationReset();
  process.env.NODE_ENV = 'production';
  process.env.SUPABASE_JWT_SECRET = SECRET;
  prismaMock.user.findUnique.mockResolvedValue(DB_USER);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ role: 'DEVOTEE' }]);
});
afterEach(() => { process.env = { ...ORIG_ENV }; });

describe('token revocation', () => {
  it('normal users are unaffected and cost one read per 30 s window', async () => {
    for (let i = 0; i < 20; i++) {
      const { reply, req } = await call(token());
      expect(reply.statusCode).toBe(0);
      expect(req.currentUser?.id).toBe(UID);
    }
    expect(db.reads).toBe(1);
  });

  it('logout-all: old token is 401 session_revoked, even from the 60 s identity cache', async () => {
    const old = token();
    expect((await call(old)).reply.statusCode).toBe(0); // now cached
    await revokeUserTokens(UID);
    invalidateAuthUser(UID);
    const { reply } = await call(old);
    expect(reply.statusCode).toBe(401);
    expect(reply.headers['x-auth-reason']).toBe('session_revoked');
  });

  it('another container: cached identity + stale revocation cache expire within the window', async () => {
    const old = token();
    await call(old); // caches identity and "no revocation" state
    db.rows.set(`${UID}|`, { user_id: UID, session_id: '', valid_after: new Date() }); // written elsewhere
    expect((await call(old)).reply.statusCode).toBe(0); // still inside the 30 s window
    __revocationEvictUser(UID); // the window elapses
    expect((await call(old)).reply.statusCode).toBe(401);
  });

  it('a token minted after the cutoff (fresh sign-in / reset-password) works', async () => {
    await revokeUserTokens(UID);
    const fresh = token({ iat: Math.floor(Date.now() / 1000) + 1, session_id: 'sess-B' });
    expect((await call(fresh)).reply.statusCode).toBe(0);
  });

  it('password reset: the recovery-session token and every older token die; new login lives', async () => {
    const recovery = token({ session_id: 'recovery' });
    const phone = token({ session_id: 'phone' });
    await revokeUserTokens(UID); // /auth/logout global after updateUser
    expect((await call(recovery)).reply.statusCode).toBe(401);
    expect((await call(phone)).reply.statusCode).toBe(401);
    expect((await call(token({ iat: Math.floor(Date.now() / 1000) + 2, session_id: 'new' }))).reply.statusCode).toBe(0);
  });

  it('block: tokens issued before the block are rejected on the offline path', async () => {
    const old = token();
    expect((await call(old)).reply.statusCode).toBe(0);
    await revokeUserTokens(UID); // adminService.updateUser({blocked:true})
    invalidateAuthUser(UID);
    expect((await call(old)).reply.statusCode).toBe(401);
  });

  it('per-session logout only kills that session', async () => {
    const a = token({ session_id: 'sess-A' });
    const b = token({ session_id: 'sess-B' });
    await revokeUserTokens(UID, { sessionId: 'sess-A' });
    expect((await call(a)).reply.statusCode).toBe(401);
    expect((await call(b)).reply.statusCode).toBe(0);
  });

  it('other users are unaffected by someone else\'s revocation', async () => {
    await revokeUserTokens(OTHER);
    expect((await call(token())).reply.statusCode).toBe(0);
  });

  it('lookup failure fails OPEN and is not retried on every request', async () => {
    db.failReads = true;
    for (let i = 0; i < 5; i++) expect((await call(token())).reply.statusCode).toBe(0);
    expect(db.reads).toBe(1);
    expect(__revocationStats().failOpen).toBe(1);
  });

  it('a missing table means nothing is revoked, and the first write creates it', async () => {
    db.tableExists = false;
    expect((await call(token())).reply.statusCode).toBe(0);
    expect(await revokeUserTokens(UID)).toBe(true);
    expect(db.tableExists).toBe(true);
    expect(await isTokenRevoked(UID, token())).toBe(true);
  });

  it('demo tokens never touch the revocation table', async () => {
    process.env.NODE_ENV = 'development';
    prismaMock.user.findUnique.mockResolvedValue(DB_USER);
    const { reply } = await call('demo-devotee-token');
    expect(reply.statusCode).toBe(0);
    expect(db.reads).toBe(0);
  });

  it('a revocation write that cannot be made reports false instead of throwing', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValueOnce(new Error('boom'));
    expect(await revokeUserTokens(UID)).toBe(false);
  });
});
