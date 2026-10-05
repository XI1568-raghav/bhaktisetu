import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => {
    throw new Error('supabase must not be reached by a validation failure');
  },
}));

import Fastify, { type FastifyInstance } from 'fastify';

import { errorLocalizationPlugin } from './error-localization.js';
import { clearPreferredLanguageCache } from '../lib/i18n.js';
import { localizedError } from '../lib/error-i18n.js';
import { templeRoutes } from '../routes/temples.js';
import { authRoutes } from '../routes/auth.js';

/**
 * I-04 / I18N-03 — the two PRODUCTION probes, run against the real route files.
 *
 * These are not synthetic routes. They are the exact two requests that were
 * probed against api.darshya.online on 2026-08-16 and answered English despite
 * `Accept-Language: hi`:
 *
 *   GET  /api/v1/temples/__no_such__   -> {"error":"Temple not found"}
 *   POST /api/v1/auth/login  body {}   -> {"error":"ValidationError","message":"Required"}
 *
 * Both are `reply.code(...).send(...)` calls inside a route handler. They never
 * pass through `setErrorHandler`, which is why a previous pass could ship a
 * catalogue, a resolver and a green suite and still leave production English:
 * every test built its own Fastify with synthetic handlers, so nothing ever
 * asserted that a REAL route body gets localized.
 *
 * `buildApp` therefore mirrors src/server.ts's bootstrap order exactly — the
 * plugin first, the route plugins after — because Fastify resolves both the
 * error handler and the onSend hook from the encapsulation context a route was
 * registered in (AW-08).
 */

const HI = 'hi';

/** Devanagari appears in every Hindi catalogue string and in no English one. */
function isDevanagari(value: unknown): boolean {
  return typeof value === 'string' && /[ऀ-ॿ]/.test(value);
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await errorLocalizationPlugin(app, { isProd: true });
  await app.register(templeRoutes, { prefix: '/api/v1/temples' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPreferredLanguageCache();
});

describe('production probe 1 — GET /api/v1/temples/:slug, unknown slug', () => {
  beforeEach(() => {
    prismaMock.temple.findFirst.mockResolvedValue(null);
    prismaMock.temple.findUnique.mockResolvedValue(null);
  });

  it('answers Hindi for Accept-Language: hi', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/temples/__no_such__',
      headers: { 'accept-language': 'hi-IN,hi;q=0.9,en;q=0.8' },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(isDevanagari(body.message)).toBe(true);
    expect(body.message).toBe(localizedError('NOT_FOUND', HI));
    expect(body.code).toBe('NOT_FOUND');
  });

  it('still answers English when no language is asked for', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/temples/__no_such__' });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.message).toBe(localizedError('NOT_FOUND', 'en'));
    // The machine label clients switch on is untouched.
    expect(body.error).toBe('Temple not found');
  });

  it('honours ?lang= over the header', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/temples/__no_such__?lang=ta',
      headers: { 'accept-language': 'hi' },
    });

    expect(res.json().message).toBe(localizedError('NOT_FOUND', 'ta'));
  });
});

describe('production probe 2 — POST /api/v1/auth/login, empty body', () => {
  it('answers Hindi for Accept-Language: hi', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'accept-language': 'hi-IN,hi;q=0.9,en;q=0.8' },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(isDevanagari(body.message)).toBe(true);
    expect(body.message).toBe(localizedError('INVALID_BODY', HI));
    expect(body.code).toBe('INVALID_BODY');
    // The English label stays; only the human sentence moves language.
    expect(body.error).toBe('ValidationError');
  });

  it('keeps the raw Zod text reachable under details', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'accept-language': 'hi' },
      payload: {},
    });

    expect(res.json().details).toEqual({ validation: 'Required' });
  });

  it('answers Kannada for Accept-Language: kn', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'accept-language': 'kn' },
      payload: {},
    });

    expect(res.json().message).toBe(localizedError('INVALID_BODY', 'kn'));
  });
});

/**
 * Scanning routes/*.ts for `reply.code(4xx).send({ … })` finds 412 bodies that
 * carry an `error` sentence, no `message`, and a status (400/409/422) whose
 * meaning the status alone does not supply — so rule 5 cannot touch them. 117
 * distinct sentences, and none of them matches a catalogue string.
 *
 * But the ten most frequent are not sentences at all. "Invalid input" (×26),
 * "Invalid body" (×18), "Invalid request body" (×18), "Invalid query" (×15),
 * "Validation error" (×12), "INVALID_BODY" (×10), "BadRequest" (×7),
 * "Invalid query parameters" (×5), "BAD_QUERY" (×5), "Bad request" (×5) —
 * 121 responses — are developer labels for "the request was malformed", with
 * no caller-specific content whatsoever. They are the same thing
 * `error: 'ValidationError'` is, spelled ten ways. Mapping them costs nothing
 * and takes this file's scan of routes/*.ts from 401 to 522 localizable bodies
 * out of 892.
 *
 * The remaining 291 ("No matched temple for this manager", "Order ID mismatch.")
 * ARE caller-specific and stay English until someone authors translations for
 * them. That is a translation task, not a wiring one.
 */
describe('generic malformed-request labels are the catalogue in disguise', () => {
  async function labelApp(): Promise<FastifyInstance> {
    const app = Fastify({ logger: false });
    await errorLocalizationPlugin(app, { isProd: true });
    await app.register(async (s) => {
      s.get('/body', async (_r, reply) => reply.code(400).send({ error: 'Invalid input' }));
      s.get('/query', async (_r, reply) => reply.code(400).send({ error: 'Invalid query' }));
      s.get('/screaming', async (_r, reply) => reply.code(400).send({ error: 'INVALID_BODY' }));
      s.get('/specific', async (_r, reply) =>
        reply.code(400).send({ error: 'Invalid input', message: 'pincode must be 6 digits' }),
      );
      s.get('/named', async (_r, reply) =>
        reply.code(409).send({ error: 'No matched temple for this manager' }),
      );
    });
    return app;
  }

  it.each([
    ['/body', 'INVALID_BODY'],
    ['/query', 'INVALID_QUERY'],
    ['/screaming', 'INVALID_BODY'],
  ] as const)('localizes %s as %s', async (url, code) => {
    const app = await labelApp();
    const res = await app.inject({ method: 'GET', url, headers: { 'accept-language': 'hi' } });
    const body = res.json();
    expect(body.code).toBe(code);
    expect(body.message).toBe(localizedError(code, HI));
  });

  it('never overrides a caller-specific message that sits under a generic label', async () => {
    const app = await labelApp();
    const res = await app.inject({
      method: 'GET',
      url: '/specific',
      headers: { 'accept-language': 'hi' },
    });
    expect(res.json().message).toBe('pincode must be 6 digits');
    expect(res.json().code).toBeUndefined();
  });

  it('leaves a named, caller-specific 409 label alone', async () => {
    const app = await labelApp();
    const res = await app.inject({
      method: 'GET',
      url: '/named',
      headers: { 'accept-language': 'hi' },
    });
    expect(res.json()).toEqual({ error: 'No matched temple for this manager' });
  });
});

describe('the rewritten body survives the wire', () => {
  /**
   * Devanagari is 3 bytes per character where ASCII is 1, so the Hindi body is
   * substantially longer than the English one the route handed to `send`. If
   * Fastify had already fixed `content-length` before the onSend hook ran, the
   * response would be truncated mid-codepoint and every Hindi error would
   * arrive as unparseable JSON. Asserted over a real socket, not `inject`,
   * because `inject` does not enforce content-length.
   */
  it('serves a byte-correct 404 over real HTTP', async () => {
    prismaMock.temple.findFirst.mockResolvedValue(null);
    prismaMock.temple.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address();
    if (!addr || typeof addr === 'string') throw new Error('no port');

    try {
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/v1/temples/__no_such__`, {
        headers: { 'accept-language': 'hi' },
      });
      const text = await res.text();

      expect(res.status).toBe(404);
      expect(Number(res.headers.get('content-length'))).toBe(Buffer.byteLength(text, 'utf8'));
      expect(JSON.parse(text).message).toBe(localizedError('NOT_FOUND', HI));
    } finally {
      await app.close();
    }
  });
});

describe('what localization must NOT take away', () => {
  it('leaves a bespoke 4xx sentence alone', async () => {
    // 429 from the login-attempt bucket names a concrete wait ("15 minutes").
    // A generic translated RATE_LIMITED sentence would be strictly less useful,
    // so a message that is not a catalogue string is preserved verbatim.
    const app = await buildApp();
    const bespoke = 'Too many login attempts for this email. Try again in 15 minutes.';
    app.get('/bespoke', async (_req, reply) =>
      reply.code(429).send({ error: 'TooManyRequests', message: bespoke }),
    );
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/bespoke',
      headers: { 'accept-language': 'hi' },
    });
    expect(res.json().message).toBe(bespoke);
  });

  it('does not read preferredLanguage for a body it will not rewrite', async () => {
    // Widening the onSend pre-filter (it used to require `"code"`, which is why
    // it never fired) means every 4xx now reaches this hook. 291 of them are
    // deliberately left alone, so the language must be resolved only after the
    // rewrite is known to happen — otherwise each one costs a User lookup and
    // lib/i18n.ts's "an error storm cannot turn into a query storm" is false.
    const loadPreferredLanguage = vi.fn(async () => 'hi');
    const app = Fastify({ logger: false });
    await errorLocalizationPlugin(app, { isProd: true, loadPreferredLanguage });
    app.addHook('preHandler', async (request) => {
      (request as { currentUser?: unknown }).currentUser = { id: 'user-1' };
    });
    app.get('/bespoke', async (_req, reply) =>
      reply.code(409).send({ error: 'Order ID mismatch.' }),
    );
    app.get('/generic', async (_req, reply) => reply.code(400).send({ error: 'Invalid input' }));
    await app.ready();

    await app.inject({ method: 'GET', url: '/bespoke', headers: { 'accept-language': 'en' } });
    expect(loadPreferredLanguage).not.toHaveBeenCalled();

    // …but a body that IS rewritten still gets the stored preference.
    const res = await app.inject({ method: 'GET', url: '/generic', headers: { 'accept-language': 'en' } });
    expect(loadPreferredLanguage).toHaveBeenCalledTimes(1);
    expect(res.json().message).toBe(localizedError('INVALID_BODY', HI));
  });

  it('leaves 2xx bodies untouched', async () => {
    const app = await buildApp();
    app.get('/ok', async () => ({ error: 'not really', message: 'Required' }));
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/ok',
      headers: { 'accept-language': 'hi' },
    });
    expect(res.json()).toEqual({ error: 'not really', message: 'Required' });
  });
});
