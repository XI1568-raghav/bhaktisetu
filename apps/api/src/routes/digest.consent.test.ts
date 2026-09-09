import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any, reply: any) => {
    if (!request.headers.authorization) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    // The mock trusts the header the way the real middleware trusts a verified
    // JWT: `Bearer user:<uuid>` names the caller. Nothing in the request BODY
    // may select whose preference is changed.
    request.currentUser = { id: String(request.headers.authorization).replace(/^Bearer user:/, '') };
  },
}));

import Fastify from 'fastify';
import {
  digestRoutes,
  signDigestUnsubscribeToken,
  LEGACY_UNSIGNED_LINKS_ACCEPTED_UNTIL,
} from './digest.js';

/**
 * CT-CONSENT-1 — the digest unsubscribe endpoint identified the subject by an
 * UNSIGNED raw primary key.
 *
 * The endpoint is deliberately unauthenticated, and that part is correct: the
 * link arrives from an email and the reader is very often signed out. The
 * defect was that `{userId: <raw uuid>}` is the whole proof of intent, and that
 * uuid is returned verbatim by `/auth/me` and printed into every digest email.
 * Anyone holding a user id could silently opt that user out of a channel they
 * had consented to. These tests assert the identifier is a capability (an HMAC
 * the server minted) rather than a name anyone can say.
 *
 * The second defect was that opting out was a one-way door: `WeeklyDigestOptOut`
 * was only ever INSERTed or SELECTed, and no route deleted from it, so a user
 * who unsubscribed — or was unsubscribed by someone else — had no way back.
 */

type OptOutRow = { user_id: string; opted_out_at: Date; reason: string | null };

const optOutRows = new Map<string, OptOutRow>();

/**
 * Postgres stand-in enforcing the one rule that matters for this table: a
 * text-bound $1 cannot reach a uuid column without an explicit cast. NOTIF-02
 * was exactly that mistake on the INSERT; the new DELETE and SELECT bind the
 * same column and would repeat it.
 */
function fakePostgresWrite(sql: string, ...params: unknown[]): number {
  const userId = String(params[0]);

  if (/INSERT\s+INTO\s+"WeeklyDigestOptOut"/i.test(sql)) {
    if (!/VALUES\s*\(\s*\$1\s*::\s*uuid/i.test(sql)) throw datatypeMismatch('INSERT');
    optOutRows.set(userId, { user_id: userId, opted_out_at: new Date(), reason: (params[1] ?? null) as string | null });
    return 1;
  }

  if (/DELETE\s+FROM\s+"WeeklyDigestOptOut"/i.test(sql)) {
    if (!/user_id\s*=\s*\$1\s*::\s*uuid/i.test(sql)) throw datatypeMismatch('DELETE');
    return optOutRows.delete(userId) ? 1 : 0;
  }

  return 0;
}

function fakePostgresRead(sql: string, ...params: unknown[]): { user_id: string }[] {
  if (!/SELECT[\s\S]*"WeeklyDigestOptOut"/i.test(sql)) return [];
  if (!/user_id\s*=\s*\$1\s*::\s*uuid/i.test(sql)) throw datatypeMismatch('SELECT');
  const row = optOutRows.get(String(params[0]));
  return row ? [{ user_id: row.user_id }] : [];
}

function datatypeMismatch(stmt: string): Error {
  const err = new Error(
    `Raw query failed. Code: \`42804\`. Message: \`ERROR: column "user_id" is of type uuid ` +
      `but expression is of type text\` (${stmt})`,
  );
  Object.assign(err, { code: 'P2010', meta: { code: '42804' } });
  return err;
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await digestRoutes(instance);
  }, { prefix: '/api/v1/digest' });
  return app;
}

const USER_ID = '2b5bd615-1633-4c95-9b09-03efb2b9e429';
const OTHER_USER_ID = '9f1c4d02-77a8-4f31-8a52-6e0b1c9d3a44';

/** Inside the legacy grace window, so an unsigned link is still honoured. */
const DURING_GRACE = LEGACY_UNSIGNED_LINKS_ACCEPTED_UNTIL - 24 * 60 * 60 * 1000;
const AFTER_GRACE = LEGACY_UNSIGNED_LINKS_ACCEPTED_UNTIL + 24 * 60 * 60 * 1000;

function unsubscribe(app: Awaited<ReturnType<typeof buildApp>>, userId: string, reason?: string) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/digest/unsubscribe',
    payload: reason === undefined ? { userId } : { userId, reason },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  optOutRows.clear();
  process.env.JWT_SECRET = 'digest-consent-test-secret';
  prismaMock.$executeRawUnsafe.mockImplementation(fakePostgresWrite as never);
  prismaMock.$queryRawUnsafe.mockImplementation(fakePostgresRead as never);
  // Date only. A blanket vi.useFakeTimers() also fakes setImmediate, which
  // light-my-request needs to settle app.inject() — every request then hangs
  // forever instead of failing.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(DURING_GRACE);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CT-CONSENT-1 — the unsubscribe identifier must be signed', () => {
  it('opts the user out when the token carries a valid signature', async () => {
    const app = await buildApp();
    const res = await unsubscribe(app, signDigestUnsubscribeToken(USER_ID), 'too many emails');

    // The row is the contract, as in the NOTIF-02 tests.
    expect(optOutRows.has(USER_ID)).toBe(true);
    expect(optOutRows.get(USER_ID)?.reason).toBe('too many emails');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, unsubscribed: true });

    await app.close();
  });

  it('refuses a tampered signature and writes nothing', async () => {
    const token = signDigestUnsubscribeToken(USER_ID);
    const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

    const app = await buildApp();
    const res = await unsubscribe(app, tampered);

    expect(res.statusCode).toBe(403);
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(optOutRows.size).toBe(0);

    await app.close();
  });

  it('refuses a signature minted for a different user — the actual attack', async () => {
    // The attacker knows both uuids (both are returned by /auth/me) and holds a
    // valid token for their OWN account. Swapping the id must not carry the
    // signature over to the victim.
    const forged = `${OTHER_USER_ID}.${signDigestUnsubscribeToken(USER_ID).split('.')[1]}`;

    const app = await buildApp();
    const res = await unsubscribe(app, forged);

    expect(res.statusCode).toBe(403);
    expect(optOutRows.has(OTHER_USER_ID)).toBe(false);
    expect(optOutRows.size).toBe(0);

    await app.close();
  });

  it('refuses a signature minted under a different secret', async () => {
    const token = signDigestUnsubscribeToken(USER_ID);
    process.env.JWT_SECRET = 'a-different-secret';

    const app = await buildApp();
    const res = await unsubscribe(app, token);

    expect(res.statusCode).toBe(403);
    expect(optOutRows.size).toBe(0);

    await app.close();
  });

  it('refuses a bare uuid once the legacy grace window has closed', async () => {
    vi.setSystemTime(AFTER_GRACE);

    const app = await buildApp();
    const res = await unsubscribe(app, USER_ID);

    expect(res.statusCode).toBe(403);
    expect(optOutRows.size).toBe(0);

    await app.close();
  });

  it('still honours a bare uuid while the grace window is open, for links already in inboxes', async () => {
    const app = await buildApp();
    const res = await unsubscribe(app, USER_ID);

    expect(res.statusCode).toBe(200);
    expect(optOutRows.has(USER_ID)).toBe(true);

    await app.close();
  });

  it('rejects a structurally invalid identifier with 400, not 403', async () => {
    // The audit's control observation: a malformed body reaches the handler and
    // answers 400 where an authenticated route answers 401. That must stay true
    // — 400 means "this is not an identifier", 403 means "it is, and it is not
    // yours". Collapsing them hides which one happened.
    const app = await buildApp();
    for (const bad of ['not-a-uuid', 'not-a-uuid.somesig', '', 'a.b.c']) {
      const res = await unsubscribe(app, bad);
      expect(res.statusCode).toBe(400);
    }
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();

    await app.close();
  });

  it('is idempotent — a second click on the same signed link refreshes one row', async () => {
    const token = signDigestUnsubscribeToken(USER_ID);
    const app = await buildApp();
    await unsubscribe(app, token, 'first');
    const res = await unsubscribe(app, token, 'second');

    expect(optOutRows.size).toBe(1);
    expect(optOutRows.get(USER_ID)?.reason).toBe('second');
    expect(res.statusCode).toBe(200);

    await app.close();
  });

  it('never claims success when the write fails', async () => {
    prismaMock.$executeRawUnsafe.mockImplementation((() => {
      throw datatypeMismatch('INSERT');
    }) as never);

    const app = await buildApp();
    const res = await unsubscribe(app, signDigestUnsubscribeToken(USER_ID));

    expect(res.statusCode).toBe(500);
    expect(res.json().unsubscribed).not.toBe(true);

    await app.close();
  });
});

describe('CT-CONSENT-1 — opting out must be reversible', () => {
  async function optOut(app: Awaited<ReturnType<typeof buildApp>>, userId = USER_ID) {
    const res = await unsubscribe(app, signDigestUnsubscribeToken(userId));
    expect(res.statusCode).toBe(200);
  }

  it('resubscribe deletes the opt-out row, so the digest resumes', async () => {
    const app = await buildApp();
    await optOut(app);
    expect(optOutRows.has(USER_ID)).toBe(true);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/resubscribe',
      headers: { authorization: `Bearer user:${USER_ID}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, subscribed: true });
    // The row is the contract: the fan-out reads this table, not the response.
    expect(optOutRows.has(USER_ID)).toBe(false);

    await app.close();
  });

  it('resubscribe requires authentication — it is positive consent, not a link click', async () => {
    const app = await buildApp();
    await optOut(app);

    const res = await app.inject({ method: 'POST', url: '/api/v1/digest/resubscribe' });

    expect(res.statusCode).toBe(401);
    expect(optOutRows.has(USER_ID)).toBe(true);

    await app.close();
  });

  it('resubscribe acts on the authenticated caller, never on a userId in the body', async () => {
    const app = await buildApp();
    await optOut(app, USER_ID);
    await optOut(app, OTHER_USER_ID);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/resubscribe',
      headers: { authorization: `Bearer user:${USER_ID}` },
      payload: { userId: OTHER_USER_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(optOutRows.has(USER_ID)).toBe(false);
    // Body-supplied id ignored: re-subscribing someone else is consent forgery
    // in the direction that actually sends mail.
    expect(optOutRows.has(OTHER_USER_ID)).toBe(true);

    await app.close();
  });

  it('resubscribe succeeds for a user who was never opted out', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/resubscribe',
      headers: { authorization: `Bearer user:${USER_ID}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, subscribed: true });

    await app.close();
  });

  it('resubscribe reports failure instead of faking success', async () => {
    const app = await buildApp();
    prismaMock.$executeRawUnsafe.mockImplementation((() => {
      throw datatypeMismatch('DELETE');
    }) as never);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/digest/resubscribe',
      headers: { authorization: `Bearer user:${USER_ID}` },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().subscribed).not.toBe(true);

    await app.close();
  });

  it('reports the current preference so a settings toggle can render it', async () => {
    const app = await buildApp();
    const headers = { authorization: `Bearer user:${USER_ID}` };

    const before = await app.inject({ method: 'GET', url: '/api/v1/digest/preference', headers });
    expect(before.json()).toMatchObject({ optedOut: false });

    await optOut(app);
    const after = await app.inject({ method: 'GET', url: '/api/v1/digest/preference', headers });
    expect(after.json()).toMatchObject({ optedOut: true });

    await app.close();
  });

  it('the preference read requires authentication', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/digest/preference' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
