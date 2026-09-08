import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// CT-CONSENT-1 added an authenticated /resubscribe to this router. None of the
// cases below touch it; the mock only keeps the real middleware (and the
// Supabase client it constructs at import) out of this file's graph.
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'unused-in-this-file' };
  },
}));

import Fastify from 'fastify';
import { digestRoutes, LEGACY_UNSIGNED_LINKS_ACCEPTED_UNTIL } from './digest.js';

// NOTIF-02 regression — digest unsubscribe must actually record the opt-out,
// and must never claim success when it did not.
//
// The bug: `WeeklyDigestOptOut.user_id` is a uuid column, but Prisma binds a
// JS string parameter as text, so `VALUES ($1, ...)` raised Postgres 42804
// (datatype_mismatch) on EVERY call. The catch block then answered
// 200 {ok:true, unsubscribed:true} — so the user was told they were off the
// list, the row was never written, and the weekly digest kept arriving. That
// is a consent-withdrawal failure, not merely a failed insert.
//
// These tests therefore assert the ROW, not the status code, per the audit's
// own remediation note. `fakePostgres` below is a stand-in for the real
// server-side type check: an INSERT into WeeklyDigestOptOut whose $1 is not
// explicitly cast to uuid raises the same 42804 Prisma surfaces as P2010.

type OptOutRow = { user_id: string; opted_out_at: Date; reason: string | null };

/** The rows the fake Postgres has actually persisted. */
const optOutRows = new Map<string, OptOutRow>();

/** Reproduces Prisma's P2010 wrapper around Postgres 42804. */
function datatypeMismatchError(): Error {
  const err = new Error(
    'Invalid `prisma.$executeRawUnsafe()` invocation:\n\n' +
      'Raw query failed. Code: `42804`. Message: `ERROR: column "user_id" is of ' +
      'type uuid but expression is of type text\nHINT: You will need to rewrite ' +
      'or cast the expression.`',
  );
  err.name = 'PrismaClientKnownRequestError';
  Object.assign(err, {
    code: 'P2010',
    meta: {
      code: '42804',
      message:
        'ERROR: column "user_id" is of type uuid but expression is of type text\n' +
        'HINT: You will need to rewrite or cast the expression.',
    },
  });
  return err;
}

/**
 * Minimal Postgres stand-in for the one statement this route issues.
 * Enforces the single rule the production DB enforces: a text-bound $1 cannot
 * be inserted into a uuid column without an explicit cast.
 */
function fakePostgres(sql: string, ...params: unknown[]): number {
  if (!/INSERT\s+INTO\s+"WeeklyDigestOptOut"/i.test(sql)) return 0;

  const userIdIsCastToUuid = /VALUES\s*\(\s*\$1\s*::\s*uuid/i.test(sql);
  if (!userIdIsCastToUuid) throw datatypeMismatchError();

  const userId = String(params[0]);
  const reason = (params[1] ?? null) as string | null;
  // ON CONFLICT (user_id) DO UPDATE — second click refreshes, never duplicates.
  optOutRows.set(userId, { user_id: userId, opted_out_at: new Date(), reason });
  return 1;
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await digestRoutes(instance);
  }, { prefix: '/api/v1/digest' });
  return app;
}

const USER_ID = '2b5bd615-1633-4c95-9b09-03efb2b9e429';

beforeEach(() => {
  vi.clearAllMocks();
  optOutRows.clear();
  prismaMock.$executeRawUnsafe.mockImplementation(fakePostgres as never);
  // These cases are about the uuid BIND, so they post a bare uuid the way the
  // pre-CT-CONSENT-1 link did. That shape is only honoured inside the legacy
  // grace window, so pin the clock into it — otherwise this file starts failing
  // on a calendar date rather than on a code change. Date only: faking
  // setImmediate as well would stall every app.inject().
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(LEGACY_UNSIGNED_LINKS_ACCEPTED_UNTIL - 24 * 60 * 60 * 1000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/v1/digest/unsubscribe', () => {
  it('persists the opt-out row (NOTIF-02: uuid bind, not text)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/unsubscribe',
      payload: { userId: USER_ID, reason: 'too many emails' },
    });

    // The row is the contract. Assert it before the status code.
    expect(optOutRows.has(USER_ID)).toBe(true);
    expect(optOutRows.get(USER_ID)?.reason).toBe('too many emails');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, unsubscribed: true });

    await app.close();
  });

  it('casts user_id to uuid in the INSERT so Postgres does not raise 42804', async () => {
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/v1/digest/unsubscribe',
      payload: { userId: USER_ID },
    });

    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, ...params] = prismaMock.$executeRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toMatch(/VALUES\s*\(\s*\$1::uuid/i);
    expect(params[0]).toBe(USER_ID);

    await app.close();
  });

  it('is idempotent — a second click refreshes the same single row', async () => {
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/v1/digest/unsubscribe',
      payload: { userId: USER_ID, reason: 'first' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/unsubscribe',
      payload: { userId: USER_ID, reason: 'second' },
    });

    expect(optOutRows.size).toBe(1);
    expect(optOutRows.get(USER_ID)?.reason).toBe('second');
    expect(res.statusCode).toBe(200);

    await app.close();
  });

  it('never claims success when the write fails', async () => {
    prismaMock.$executeRawUnsafe.mockImplementation((() => {
      throw datatypeMismatchError();
    }) as never);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/unsubscribe',
      payload: { userId: USER_ID },
    });

    // Nothing was recorded, so the user must not be told they are unsubscribed.
    expect(optOutRows.size).toBe(0);
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.ok).not.toBe(true);
    expect(body.unsubscribed).not.toBe(true);
    expect(body.error).toBeTruthy();

    await app.close();
  });

  it('does not claim success when the statement affects zero rows', async () => {
    prismaMock.$executeRawUnsafe.mockImplementation((() => 0) as never);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/unsubscribe',
      payload: { userId: USER_ID },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().unsubscribed).not.toBe(true);

    await app.close();
  });

  it('rejects a non-uuid userId with 400 and writes nothing', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/unsubscribe',
      payload: { userId: 'not-a-uuid' },
    });

    expect(res.statusCode).toBe(400);
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(optOutRows.size).toBe(0);

    await app.close();
  });
});
