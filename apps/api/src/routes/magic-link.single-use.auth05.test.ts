/**
 * AUTH-05 — a magic link must be usable ONCE.
 *
 * MEASURED AT HEAD BEFORE THIS FIX. `apps/api/src/routes/magic-link.ts` said so
 * itself, in the module header at lines 22-25:
 *
 *     "No new tables needed — we use the existing User table. The token itself
 *      is stateless, signed with JWT_SECRET. Single-use enforcement is by
 *      timestamp (15 min TTL) — for one-shot use we'd need a `usedTokens`
 *      table; for an MVP a 15-min window is acceptable."
 *
 * That reasoning stopped being true when PJ-08 landed ONBOARDING_TOKEN_TTL_MIN
 * (magic-link.ts:66) — 72 HOURS, not 15 minutes — and made that link the ONLY
 * credential a partnerships-provisioned provider has (there is no password
 * column on User). So a link sitting in a forwarded email, a shared inbox, a
 * mail-scanner log or a browser-history entry authenticates as a temple manager
 * or pandit, over and over, for three days, and nothing in the product can
 * revoke it. `verifyToken` checks an HMAC and a timestamp; both stay true for
 * every replay.
 *
 * The ledger is what makes "once" real: the row is written when the token is
 * MINTED, and `/verify` consumes it with one conditional UPDATE whose row count
 * is the whole decision.
 *
 * THREE PROPERTIES THAT ARE EASY TO GET WRONG AND ARE LOCKED HERE
 *
 *  1. A REPLAY MUST NOT BE DISTINGUISHABLE from a bad signature. Both answer
 *     400 with the identical 'Invalid or expired sign-in link' sentence. A
 *     distinct "already used" message turns the endpoint into an oracle that
 *     confirms a captured link was genuine.
 *
 *  2. AN ABSENT ROW COUNTS AS CONSUMED. If a missing row meant "allow", every
 *     token minted before the ledger existed — including 72-hour onboarding
 *     links already in inboxes — would bypass it entirely, which is the exact
 *     population the finding is about.
 *
 *  3. CONSUME BEFORE MINTING ANYTHING. The UPDATE has to commit before
 *     createEmailSession writes a session row and before setAuthCookies puts a
 *     cookie on the reply. Consuming afterwards still mints a live session for
 *     a replayed link and only then declines it.
 *
 * The migration guard block below is file-based on purpose: production has been
 * suspended since 2026-08-17 and there is no database to point at, but the
 * properties that decide whether this migration takes the API DOWN — plain
 * CREATE INDEX rather than CONCURRENTLY (25001 inside migrate deploy's
 * transaction blocked this repo for two months), additive-only DDL,
 * IF NOT EXISTS everywhere — are all statically checkable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// ── prisma mock ────────────────────────────────────────────────────────────
// Both the ledger writes and createEmailSession's INSERT go through
// $executeRawUnsafe, so one recording mock sees all of them and the SQL text
// tells them apart. `rawResult` lets a test say "the UPDATE matched 0 rows".
const rawCalls: unknown[][] = [];
let updateRowCount = 1;
let insertThrows = false;

const findFirst = vi.fn();
const findMany = vi.fn();

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      create: vi.fn(),
    },
    userRoleAssignment: {
      create: vi.fn(async () => ({})),
      findMany: (...args: unknown[]) => findMany(...args),
    },
    $executeRawUnsafe: vi.fn(async (...args: unknown[]) => {
      rawCalls.push(args);
      const sql = String(args[0] ?? '');
      if (/INSERT\s+INTO\s+magic_link_tokens/i.test(sql)) {
        if (insertThrows) throw new Error('relation "magic_link_tokens" does not exist');
        return 1;
      }
      if (/UPDATE\s+magic_link_tokens/i.test(sql)) return updateRowCount;
      return 1;
    }),
  },
}));

vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(async () => ({ ok: false, skipped: true })),
  magicLinkEmail: (link: string) => ({ subject: 'Sign in', html: link, text: link }),
}));

import Fastify from 'fastify';
import { magicLinkRoutes, __testing } from './magic-link.js';

const PROVIDER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const PROVIDER_EMAIL = 'mandir.trust@example.com';

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register((await import('@fastify/cookie')).default);
  await app.register((await import('@fastify/rate-limit')).default, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(
    async (instance) => {
      await magicLinkRoutes(instance);
    },
    { prefix: '/api/v1/auth/magic-link' },
  );
  return app;
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  rawCalls.length = 0;
  updateRowCount = 1;
  insertThrows = false;
  // The module captured JWT_SECRET at import time; unsetting lets both sign and
  // verify fall back to the same 'darshya-dev-secret'.
  delete process.env.JWT_SECRET;
  delete process.env.ADMIN_EMAILS;
  findFirst.mockResolvedValue({
    id: PROVIDER_ID,
    email: PROVIDER_EMAIL,
    fullName: 'Mandir Trust',
    phone: '+919812345678',
  });
  findMany.mockResolvedValue([
    { userId: PROVIDER_ID, role: 'TEMPLE_MANAGER', isPrimary: true, createdAt: new Date(0) },
  ]);
});

afterEach(() => {
  process.env = { ...originalEnv };
});

/** Every $executeRawUnsafe call whose SQL matches. */
function rawMatching(re: RegExp): unknown[][] {
  return rawCalls.filter((c) => re.test(String(c[0] ?? '')));
}

const LEDGER_INSERT = /INSERT\s+INTO\s+magic_link_tokens/i;
const LEDGER_UPDATE = /UPDATE\s+magic_link_tokens/i;
const SESSION_INSERT = /INSERT\s+INTO\s+email_sessions/i;

async function postVerify(token: string) {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/magic-link/verify',
    payload: { token },
  });
  await app.close();
  return res;
}

// ───────────────────────────────────────────────────────────────────────────
describe('AUTH-05 — the ledger row is written when the token is MINTED', () => {
  it('POST /request records the token before handing the link out', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/request',
      payload: { email: PROVIDER_EMAIL },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    const inserts = rawMatching(LEDGER_INSERT);
    expect(
      inserts.length,
      'no magic_link_tokens row written at /request — the link goes out with ' +
        'nothing to consume, so it is either replayable forever or (once an ' +
        'absent row counts as consumed) dead on arrival',
    ).toBe(1);
  });

  it('keys the row by sha256 of the token, never the token itself', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/request',
      payload: { email: PROVIDER_EMAIL },
    });
    await app.close();

    const link = res.json().devLink as string;
    const token = decodeURIComponent(new URL(link).searchParams.get('token')!);
    const params = rawMatching(LEDGER_INSERT)[0]!.slice(1).map(String);

    expect(params[0]).toBe(createHash('sha256').update(token).digest('hex'));
    expect(
      params.join('|'),
      'the raw token is in the ledger row — a database reader could then sign ' +
        'in as any pending recipient',
    ).not.toContain(token);
  });

  it('signToken records for callers it does not own — the 72h onboarding link', async () => {
    // apps/api/src/routes/admin-leads.ts mints the onboarding link through
    // signToken(email, ONBOARDING_TOKEN_TTL_MIN) and never sees /request. If
    // the write lived only in the /request handler, every onboarding link would
    // arrive with no ledger row and be rejected on first use.
    const { recorded } = __testing.signToken(PROVIDER_EMAIL, 72 * 60);
    await recorded;
    expect(rawMatching(LEDGER_INSERT).length).toBe(1);
  });

  it('refuses to send a link the ledger could not record', async () => {
    insertThrows = true;
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/magic-link/request',
      payload: { email: PROVIDER_EMAIL },
    });
    await app.close();
    expect(
      res.statusCode,
      'a link with no ledger row is dead on arrival once an absent row counts ' +
        'as consumed; sending it anyway strands the recipient with no way back',
    ).toBe(500);
  });
});

describe('AUTH-05 — /verify consumes the token exactly once', () => {
  it('the first use succeeds and runs one conditional UPDATE', async () => {
    const { token } = __testing.signToken(PROVIDER_EMAIL);
    rawCalls.length = 0;
    const res = await postVerify(token);

    expect(res.statusCode).toBe(200);
    const updates = rawMatching(LEDGER_UPDATE);
    expect(updates.length).toBe(1);
    const sql = String(updates[0]![0]);
    expect(sql).toMatch(/consumed_at\s*=\s*now\(\)/i);
    expect(
      sql,
      'the UPDATE must be conditional on consumed_at IS NULL — an unconditional ' +
        'one matches a row every time and the replay is never detected',
    ).toMatch(/consumed_at\s+IS\s+NULL/i);
    expect(String(updates[0]![1])).toBe(createHash('sha256').update(token).digest('hex'));
  });

  it('a replay is rejected — the UPDATE matches no unconsumed row', async () => {
    const { token } = __testing.signToken(PROVIDER_EMAIL);
    updateRowCount = 0; // the row exists but consumed_at is already set
    const res = await postVerify(token);
    expect(
      res.statusCode,
      'the same link authenticated twice — a forwarded 72h onboarding email is ' +
        'a permanent credential for anyone who reads it',
    ).toBe(400);
  });

  it('says exactly what a bad signature says — no already-used oracle', async () => {
    const { token } = __testing.signToken(PROVIDER_EMAIL);
    updateRowCount = 0;
    const replay = await postVerify(token);
    const forged = await postVerify('not-a-real-token');
    expect(replay.json().error).toBe(forged.json().error);
    expect(replay.json()).toEqual(forged.json());
  });

  it('treats an ABSENT row as consumed — pre-ledger links do not bypass it', async () => {
    // updateRowCount 0 is also what a token minted before this migration looks
    // like: nothing to update. Allowing that case would exempt exactly the
    // outstanding 72-hour links the finding is about.
    const { token } = __testing.signToken(PROVIDER_EMAIL);
    updateRowCount = 0;
    const res = await postVerify(token);
    expect(res.statusCode).toBe(400);
  });

  it('consumes BEFORE minting a session or setting a cookie', async () => {
    const { token } = __testing.signToken(PROVIDER_EMAIL);
    updateRowCount = 0;
    rawCalls.length = 0;
    const res = await postVerify(token);

    expect(rawMatching(LEDGER_UPDATE).length).toBe(1);
    expect(
      rawMatching(SESSION_INSERT).length,
      'an email_sessions row was minted for a replayed link — the session is ' +
        'live in the database even though the response says 400',
    ).toBe(0);
    const setCookie = res.headers['set-cookie'];
    expect(
      setCookie,
      'a darshya_session cookie was issued for a replayed link',
    ).toBeUndefined();
  });

  it('does not consume when the signature never verified', async () => {
    await postVerify('garbage.token');
    expect(
      rawMatching(LEDGER_UPDATE).length,
      'an unverified token reached the ledger — an attacker could burn a ' +
        'victim\'s pending link by guessing its hash input',
    ).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('AUTH-05 — the migration that ships the ledger', () => {
  const migrationsDir = fileURLToPath(new URL('../../prisma/migrations', import.meta.url));
  const schemaPath = fileURLToPath(new URL('../../prisma/schema.prisma', import.meta.url));

  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const dir = dirs.find((d) => /auth05_magic_link_token_ledger$/.test(d));

  it('the migration exists', () => {
    expect(dir, `no *_auth05_magic_link_token_ledger migration in ${migrationsDir}`).toBeTruthy();
  });

  const sqlRaw = dir ? readFileSync(`${migrationsDir}/${dir}/migration.sql`, 'utf8') : '';
  /** SQL line comments stripped: this file explains the CONCURRENTLY ban in
   *  prose, and prose that names the banned pattern must not be searched. */
  const sql = sqlRaw.replace(/--[^\n]*/g, ' ');

  it('the SQL comment stripper is actually doing something', () => {
    expect(sqlRaw).toMatch(/--/);
    expect(sql).not.toMatch(/--/);
  });

  it('creates magic_link_tokens idempotently', () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"magic_link_tokens"/i);
    expect(sql).toMatch(/"consumed_at"/);
    expect(sql).toMatch(/"expires_at"/);
  });

  it('never uses CREATE INDEX CONCURRENTLY — 25001 blocks every later migration', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/i);
    expect(sql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i);
  });

  it('is additive only — it auto-applies unattended on API boot', () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  it('schema.prisma declares the model so the table is not invisible drift', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const start = schema.indexOf('model MagicLinkToken {');
    expect(start, 'model MagicLinkToken missing from schema.prisma').toBeGreaterThan(-1);
    const end = schema.indexOf('\n}', start);
    const rawBlock = schema.slice(start, end);
    // Comments stripped: the block documents the hashing rule in prose and the
    // prose names the very fields these assertions look for.
    const block = rawBlock.replace(/\/\/[^\n]*/g, ' ');
    expect(rawBlock, 'sanity: the block is expected to carry prose').toMatch(/\/\//);
    expect(block, 'the comment stripper did nothing').not.toMatch(/\/\//);
    expect(block).toMatch(/@@map\("magic_link_tokens"\)/);
    expect(block).toMatch(/consumedAt/);
  });
});
