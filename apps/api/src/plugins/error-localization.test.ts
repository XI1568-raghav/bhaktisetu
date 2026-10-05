import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

import { errorLocalizationPlugin, localizeErrorPayload } from './error-localization.js';
import { clearPreferredLanguageCache } from '../lib/i18n.js';
import { localizedError } from '../lib/error-i18n.js';

/**
 * I-04 / I18N-03 — the 5-language catalogue must reach responses by default.
 *
 * Every assertion here fails against HEAD, because at HEAD the only thing that
 * touched the catalogue was routes/bookings.ts. Proof: with the two
 * `app.register(errorLocalizationPlugin, …)` lines removed from this file's
 * `build*` helpers, the identical requests answer "Internal server error" /
 * "The requested resource was not found." in English for every Accept-Language.
 */

const HI_INTERNAL = localizedError('INTERNAL_ERROR', 'hi');
const TA_INTERNAL = localizedError('INTERNAL_ERROR', 'ta');
const HI_NOT_FOUND = localizedError('NOT_FOUND', 'hi');
const KN_CART_EMPTY = localizedError('CART_EMPTY', 'kn');

/** Sanity: the fixtures above are real translated strings, not English. */
describe('catalogue fixtures', () => {
  it('are actually translated', () => {
    expect(HI_INTERNAL).not.toBe(localizedError('INTERNAL_ERROR', 'en'));
    expect(TA_INTERNAL).not.toBe(localizedError('INTERNAL_ERROR', 'en'));
    expect(HI_NOT_FOUND).not.toBe(localizedError('NOT_FOUND', 'en'));
    expect(KN_CART_EMPTY).not.toBe(localizedError('CART_EMPTY', 'en'));
  });
});

/**
 * Default to production semantics, because that is what a user sees. In
 * development lib/error-redaction.ts deliberately echoes the raw 5xx message
 * for debugging, and this plugin does not take that away — see the
 * "development still echoes" test at the bottom.
 */
async function buildApp(
  opts: Parameters<typeof errorLocalizationPlugin>[1] = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Matches src/server.ts: the handler is installed BEFORE any route plugin,
  // otherwise Fastify's encapsulation makes it dead code (AW-08).
  await errorLocalizationPlugin(app, { isProd: true, ...opts });

  await app.register(
    async (s) => {
      s.get('/boom', async () => {
        throw new Error('kaboom');
      });

      s.get('/coded', async () => {
        const e = new Error('untranslated english') as Error & {
          statusCode?: number;
          code?: string;
        };
        e.statusCode = 404;
        e.code = 'BOOKING_NOT_FOUND';
        throw e;
      });

      s.get('/bespoke-4xx', async () => {
        const e = new Error('Astrologer not found.') as Error & { statusCode?: number };
        e.statusCode = 404;
        throw e;
      });

      s.get('/driver-leak', async () => {
        const e = new Error(
          'Invalid `prisma.astrologerProfile.findUnique()` invocation in E:\\app\\routes\\x.ts:53:52',
        ) as Error & { code?: string };
        e.code = 'P2023';
        throw e;
      });

      s.get('/hand-rolled', async (_req, reply) =>
        reply.code(400).send({ error: { code: 'CART_EMPTY', message: 'Your cart is empty.' } }),
      );

      s.get('/hand-rolled-flat', async (_req, reply) =>
        reply.code(404).send({ code: 'PUJA_NOT_FOUND', message: 'Puja not found.' }),
      );

      s.get('/no-code', async (_req, reply) =>
        reply.code(400).send({ error: 'Validation Error', message: 'City is required' }),
      );

      s.get('/ok', async () => ({ ok: true }));
    },
    { prefix: '/api/v1' },
  );

  return app;
}

beforeEach(() => clearPreferredLanguageCache());

describe('I-04 — a thrown error is localized by default', () => {
  it('answers a 500 in Hindi for Accept-Language: hi', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
      headers: { 'accept-language': 'hi-IN,hi;q=0.9,en;q=0.8' },
    });
    await app.close();

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe(HI_INTERNAL);
    expect(res.json().code).toBe('INTERNAL_ERROR');
  });

  it('answers the same 500 in Tamil for Accept-Language: ta', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
      headers: { 'accept-language': 'ta' },
    });
    await app.close();

    expect(res.json().message).toBe(TA_INTERNAL);
  });

  it('still answers English when nothing asks for otherwise', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/boom' });
    await app.close();

    expect(res.json().message).toBe(localizedError('INTERNAL_ERROR', 'en'));
  });

  it('honours an explicit ?lang= over the header', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom?lang=hi',
      headers: { 'accept-language': 'ta' },
    });
    await app.close();

    expect(res.json().message).toBe(HI_INTERNAL);
  });

  it('translates an error that names a catalogue code', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/coded',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe(localizedError('BOOKING_NOT_FOUND', 'hi'));
  });

  it('falls back to English for a supported-but-untranslated language', async () => {
    // Bengali is a valid User.preferredLanguage (Prisma enum) with no authored
    // catalogue. An English sentence beats leaking a raw code.
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
      headers: { 'accept-language': 'bn' },
    });
    await app.close();

    expect(res.json().message).toBe(localizedError('INTERNAL_ERROR', 'en'));
  });
});

describe('I-04 — localization must not cost information', () => {
  /**
   * lib/error-redaction.ts's contract: a 4xx message is written for the caller
   * and is kept. Replacing "Astrologer not found." with a generic translated
   * "The requested resource was not found." would be a downgrade, and would
   * break error-redaction.test.ts. Do not "fix" this test by localizing here.
   */
  it('leaves a bespoke 4xx message alone', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bespoke-4xx',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe('Astrologer not found.');
    expect(res.json().message).not.toBe(HI_NOT_FOUND);
  });

  it('still redacts driver internals, and localizes what redaction left', async () => {
    // isProd:false on purpose — driver redaction is unconditional, so this is
    // the one 5xx whose message is generic even in development.
    const app = await buildApp({ isProd: false });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/driver-leak',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.body).not.toContain('P2023');
    expect(res.body).not.toContain('prisma.');
    expect(res.body).not.toContain('routes\\x.ts');
    expect(res.json().message).toBe(HI_INTERNAL);
  });

  it('leaves a successful response completely untouched', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ok',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('reports the error to the injected sink exactly once', async () => {
    const onError = vi.fn();
    const app = await buildApp({ onError });
    await app.inject({ method: 'GET', url: '/api/v1/boom' });
    await app.close();

    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('I-04 — hand-rolled error bodies that name a code are localized', () => {
  it('localizes a nested { error: { code } } body', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/hand-rolled',
      headers: { 'accept-language': 'kn' },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toBe(KN_CART_EMPTY);
    expect(res.json().error.code).toBe('CART_EMPTY');
  });

  it('localizes a flat { code, message } body', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/hand-rolled-flat',
      headers: { 'accept-language': 'te' },
    });
    await app.close();

    expect(res.json().message).toBe(localizedError('PUJA_NOT_FOUND', 'te'));
  });

  it('leaves a body with no code untouched', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/no-code',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.json()).toEqual({ error: 'Validation Error', message: 'City is required' });
  });
});

describe('I18N-07 — the stored preferredLanguage actually selects the language', () => {
  async function buildAuthedApp(
    storedLanguage: string | null,
    load = vi.fn(async () => storedLanguage),
  ) {
    const app = Fastify({ logger: false });
    app.decorateRequest('currentUser', undefined);
    app.addHook('onRequest', async (req) => {
      (req as { currentUser?: unknown }).currentUser = { id: 'user-1' };
    });
    await errorLocalizationPlugin(app, { isProd: true, loadPreferredLanguage: load });
    await app.register(
      async (s) => {
        s.get('/boom', async () => {
          throw new Error('kaboom');
        });
      },
      { prefix: '/api/v1' },
    );
    return { app, load };
  }

  it('answers in the profile language even when the browser asks for English', async () => {
    const { app } = await buildAuthedApp('ta');
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
      headers: { 'accept-language': 'en-GB,en;q=0.9' },
    });
    await app.close();

    expect(res.json().message).toBe(TA_INTERNAL);
  });

  it('lets ?lang= override the profile without a lookup', async () => {
    const { app, load } = await buildAuthedApp('ta');
    const res = await app.inject({ method: 'GET', url: '/api/v1/boom?lang=hi' });
    await app.close();

    expect(res.json().message).toBe(HI_INTERNAL);
    expect(load).not.toHaveBeenCalled();
  });

  it('falls back to the header when the profile has no usable language', async () => {
    const { app } = await buildAuthedApp(null);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.json().message).toBe(HI_INTERNAL);
  });

  it('does not fail the response when the lookup throws', async () => {
    const load = vi.fn(async () => {
      throw new Error('db down');
    });
    const { app } = await buildAuthedApp(null, load as never);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe(HI_INTERNAL);
  });

  it('reads the profile once per user, not once per error', async () => {
    const { app, load } = await buildAuthedApp('ta');
    for (let i = 0; i < 3; i += 1) {
      await app.inject({ method: 'GET', url: '/api/v1/boom', headers: { 'accept-language': 'en' } });
    }
    await app.close();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('never looks up a language for an anonymous request', async () => {
    const load = vi.fn(async () => 'ta');
    const app = await buildApp({ loadPreferredLanguage: load });
    await app.inject({ method: 'GET', url: '/api/v1/boom' });
    await app.close();

    expect(load).not.toHaveBeenCalled();
  });
});

describe('localizeErrorPayload', () => {
  it('returns non-objects unchanged', () => {
    expect(localizeErrorPayload(null, 'hi')).toBeNull();
    expect(localizeErrorPayload('nope', 'hi')).toBe('nope');
    expect(localizeErrorPayload([1, 2], 'hi')).toEqual([1, 2]);
  });

  it('returns the same reference when there is nothing to localize', () => {
    const body = { error: 'Bad Request', message: 'nope' };
    expect(localizeErrorPayload(body, 'hi')).toBe(body);
  });

  it('preserves sibling fields such as details', () => {
    const out = localizeErrorPayload(
      { error: { code: 'INVALID_BODY', message: 'x', details: [{ path: 'city' }] } },
      'hi',
    ) as { error: { details: unknown; message: string } };

    expect(out.error.details).toEqual([{ path: 'city' }]);
    expect(out.error.message).toBe(localizedError('INVALID_BODY', 'hi'));
  });

  it('ignores a code that is not in the catalogue', () => {
    const body = { code: 'SOME_OTHER_THING', message: 'keep me' };
    expect(localizeErrorPayload(body, 'hi')).toBe(body);
  });
});

describe('development still echoes the raw 5xx for debugging', () => {
  it('does not replace an un-redacted 5xx message outside production', async () => {
    const app = await buildApp({ isProd: false });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe('kaboom');
  });

  it('but still localizes a coded error in development', async () => {
    const app = await buildApp({ isProd: false });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/coded',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.json().message).toBe(localizedError('BOOKING_NOT_FOUND', 'hi'));
  });
});
