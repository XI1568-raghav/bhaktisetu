import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { signInWithPassword, getUser } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: { signInWithPassword, getUser } }),
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import { authRoutes } from './auth.js';

/**
 * A FAILURE TO VERIFY IS NOT AN AUTHENTICATION VERDICT.
 *
 * `POST /login`'s real-DB branch wrapped the whole lookup-and-verify sequence
 * in one try/catch and answered every throw with
 * `401 { error: 'Unauthorized', message: 'Invalid credentials.' }`. The only
 * way to reach that catch is a dependency failing — `prisma.user.findUnique`
 * throwing, or the Supabase client throwing — because both credential
 * REJECTIONS inside the try are explicit `return reply.code(401)` statements
 * that never throw. So the one code path that could not possibly know whether
 * the password was right was the one asserting it was wrong.
 *
 * The consequence is not cosmetic. A user whose password is correct is told to
 * fix a password that was never broken, during the exact window in which a
 * password reset — which also needs the database — cannot work either. And on
 * mobile it is worse: `packages/api-client/src/client.ts:233` fires the global
 * `onUnauthorised` hook on ANY 401, so a database outage during sign-in also
 * wiped the stored session of anyone already signed in.
 *
 * The correct answer was already in this same file, 110 lines earlier: the
 * demo branch's identical catch (auth.ts:1020) answers
 * `503 { error: 'ServiceUnavailable', message: 'Sign-in is temporarily
 * unavailable. Please try again in a moment.' }`. Two halves of one handler
 * disagreed about what an unreachable database means.
 *
 * BOTH halves have to move together. Changing only the status leaves the body
 * saying "Invalid credentials.", and `apps/web/lib/auth-context.tsx:942` reads
 * `errBody?.message || authHttpErrorMessage(res.status, …)` — the body message
 * WINS, so the honest 5xx sentence is unreachable while the body still blames
 * the credential. That is why every assertion below pairs a status with the
 * sentence a user actually reads.
 */

const REAL_USER = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'outage-probe@example.com',
  fullName: 'Real Person',
  phone: '+919000000001',
  avatarUrl: null,
  preferredLanguage: 'en',
  subscriptionTier: 'free',
  createdAt: new Date('2026-01-01'),
  blocked: false,
  blockedReason: null,
  subscription: [],
};

/** The kind of message a Prisma connection failure actually carries. */
const LEAKY_DB_ERROR =
  "Can't reach database server at `db.abcdefgh.supabase.co:5432` — " +
  'postgresql://darshya:s3cr3t-password@db.abcdefgh.supabase.co:5432/postgres';

type LogLine = Record<string, unknown>;

function makeApp(logLines: LogLine[]) {
  const app = Fastify({
    logger: {
      level: 'error',
      stream: {
        write(chunk: string) {
          try {
            logLines.push(JSON.parse(chunk) as LogLine);
          } catch {
            logLines.push({ raw: chunk });
          }
        },
      },
    },
  });
  void app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

async function login(app: ReturnType<typeof makeApp>, email: string, password: string) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });
}

const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ['ADMIN_EMAILS', 'NODE_ENV'] as const;

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  delete process.env.ADMIN_EMAILS;
  process.env.NODE_ENV = 'test';
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([
    { role: 'DEVOTEE', isPrimary: true, createdAt: new Date('2026-01-01') },
  ]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('POST /login — an unreachable database is an outage, not a rejected password', () => {
  it('answers 503 ServiceUnavailable when the user lookup throws', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error(LEAKY_DB_ERROR));

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'outage-status@example.com', 'the-correct-password');

    // 401 is a verdict about a credential. Nothing in this path verified one.
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('ServiceUnavailable');
    await app.close();
  });

  it('says the service is unavailable, not that the credentials are wrong', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error(LEAKY_DB_ERROR));

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'outage-message@example.com', 'the-correct-password');

    const message = String(res.json().message);
    // The sentence a user actually reads. apps/web/lib/auth-context.tsx:942
    // prefers this body message over its own status branch, so if this still
    // blames the credential the user still sees "invalid password" — whatever
    // the status code says.
    expect(message).not.toMatch(/credential/i);
    expect(message).not.toMatch(/password/i);
    expect(message).toMatch(/temporarily unavailable/i);
    // Byte-identical to the demo branch's answer for the same failure
    // (auth.ts:1026). One handler, one sentence.
    expect(message).toBe('Sign-in is temporarily unavailable. Please try again in a moment.');
    await app.close();
  });

  it('answers 503 when the Supabase client itself throws', async () => {
    prismaMock.user.findUnique.mockResolvedValue(REAL_USER);
    signInWithPassword.mockRejectedValue(new Error('getaddrinfo ENOTFOUND abcdefgh.supabase.co'));

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'outage-supabase@example.com', 'the-correct-password');

    expect(res.statusCode).toBe(503);
    expect(String(res.json().message)).not.toMatch(/password/i);
    await app.close();
  });

  it('never leaks the underlying database error, its host or its credentials', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error(LEAKY_DB_ERROR));

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'outage-leak@example.com', 'the-correct-password');

    const raw = res.body;
    expect(raw).not.toMatch(/supabase\.co/i);
    expect(raw).not.toMatch(/postgres/i);
    expect(raw).not.toMatch(/s3cr3t/i);
    expect(raw).not.toMatch(/5432/);
    // No stack, no `err`, nothing but the two fields the contract names.
    expect(Object.keys(res.json()).sort()).toEqual(['error', 'message']);
    await app.close();
  });

  it('logs the outage with the cause and a greppable event, so an operator learns of it', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error(LEAKY_DB_ERROR));

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    await login(app, 'outage-log@example.com', 'the-correct-password');
    await app.close();

    const outage = lines.find((l) => l['event'] === 'login_db_unreachable');
    // A 503 nobody can find in the logs is an outage nobody diagnoses.
    expect(outage).toBeDefined();
    // The error itself belongs in the log, where only an operator sees it —
    // that is the whole reason the response body may stay generic.
    expect(JSON.stringify(outage)).toMatch(/supabase\.co/);
  });
});

describe('POST /login — a genuine credential rejection is unchanged', () => {
  it('still answers 401 with the credentials message when Supabase rejects the password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(REAL_USER);
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'wrong-password@example.com', 'not-the-password');

    // THE REGRESSION THAT MATTERS MOST. Widening the outage to 503 must not
    // widen a wrong password to 503 — that would tell an attacker (and an
    // honest user) that the platform is down whenever they mistype.
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
    expect(String(res.json().message)).toMatch(/invalid email or password/i);
    expect(String(res.json().message)).not.toMatch(/temporarily unavailable/i);
    await app.close();
  });

  it('still answers 401 for an email that has no account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'no-such-account@example.com', 'any-password');

    expect(res.statusCode).toBe(401);
    expect(String(res.json().message)).toMatch(/invalid email or password/i);
    // Still the same sentence as a wrong password: an unknown address must not
    // become an account-enumeration oracle just because the outage moved.
    expect(String(res.json().message)).not.toMatch(/temporarily unavailable/i);
    await app.close();
  });

  it('still answers 403 for a suspended account (AUTH-08 stays closed)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...REAL_USER,
      blocked: true,
      blockedReason: 'Chargeback fraud',
    });
    signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'jwt-access',
          refresh_token: 'jwt-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: REAL_USER.id },
        },
      },
      error: null,
    });

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'suspended-still@example.com', 'the-correct-password');

    expect(res.statusCode).toBe(403);
    expect(String(res.json().message)).toMatch(/suspend/i);
    await app.close();
  });

  it('still signs a valid account in', async () => {
    prismaMock.user.findUnique.mockResolvedValue(REAL_USER);
    signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'jwt-access',
          refresh_token: 'jwt-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: REAL_USER.id },
        },
      },
      error: null,
    });

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'happy-path@example.com', 'the-correct-password');

    expect(res.statusCode).toBe(200);
    expect(res.json().session.accessToken).toBe('jwt-access');
    await app.close();
  });
});

describe('POST /login — the two halves of the handler now agree', () => {
  it('the demo branch already answered 503 for the same failure, and still does', async () => {
    // The pre-existing behaviour this fix was modelled on (auth.ts:1020).
    prismaMock.user.findUnique.mockRejectedValue(new Error(LEAKY_DB_ERROR));

    const lines: LogLine[] = [];
    const app = makeApp(lines);
    const res = await login(app, 'devotee@demo.com', 'demo123');

    expect(res.statusCode).toBe(503);
    expect(String(res.json().message)).toBe(
      'Sign-in is temporarily unavailable. Please try again in a moment.',
    );
    await app.close();
  });
});
