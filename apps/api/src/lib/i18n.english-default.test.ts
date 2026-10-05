import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyRequest } from 'fastify';

import {
  clearPreferredLanguageCache,
  resolveRequestLanguage,
  resolveRequestLanguageSync,
} from './i18n.js';
import { errorLocalizationPlugin } from '../plugins/error-localization.js';
import { localizedError } from './error-i18n.js';

/**
 * API errors answer in English unless the client asks for another language.
 *
 * Observed: an authenticated request with NO Accept-Language header got
 * {"error":"ASTROLOGER role required","message":"आपके पास यह करने की अनुमति नहीं है।"}
 * because `User.preferredLanguage` defaults to 'hi' at signup, and the stored
 * preference outranked the (absent) header. A stored default nobody chose is not
 * the client asking for Hindi.
 */

const EN_FORBIDDEN = localizedError('FORBIDDEN', 'en');
const HI_FORBIDDEN = localizedError('FORBIDDEN', 'hi');

function request(init: {
  userId?: string;
  acceptLanguage?: string;
  lang?: string;
  preferredOnRequest?: string;
}): FastifyRequest {
  return {
    query: init.lang ? { lang: init.lang } : {},
    headers: init.acceptLanguage ? { 'accept-language': init.acceptLanguage } : {},
    ...(init.userId
      ? { currentUser: { id: init.userId, preferredLanguage: init.preferredOnRequest } }
      : {}),
  } as unknown as FastifyRequest;
}

beforeEach(() => clearPreferredLanguageCache());

describe('resolveRequestLanguage — English by default', () => {
  it('no header, anonymous -> en', async () => {
    expect(await resolveRequestLanguage(request({}))).toBe('en');
  });

  it('no header, authenticated user whose stored default is hi -> en, and no DB read', async () => {
    const load = vi.fn().mockResolvedValue('hi');
    expect(await resolveRequestLanguage(request({ userId: 'u1' }), { loadPreferredLanguage: load })).toBe('en');
    expect(load).not.toHaveBeenCalled();
  });

  it('no header, preference already on the request (hi) -> en (sync + async)', async () => {
    const req = request({ userId: 'u1', preferredOnRequest: 'hi' });
    expect(await resolveRequestLanguage(req)).toBe('en');
    expect(resolveRequestLanguageSync(req)).toBe('en');
  });

  it('Accept-Language: hi -> hi', async () => {
    expect(await resolveRequestLanguage(request({ acceptLanguage: 'hi' }))).toBe('hi');
    expect(await resolveRequestLanguage(request({ acceptLanguage: 'hi-IN,hi;q=0.9' }))).toBe('hi');
  });

  it('?lang=hi -> hi even with no header', async () => {
    expect(await resolveRequestLanguage(request({ lang: 'hi' }))).toBe('hi');
  });

  it('a browser that sends a header still gets the profile language the user picked', async () => {
    const load = vi.fn().mockResolvedValue('hi');
    const lang = await resolveRequestLanguage(
      request({ userId: 'u1', acceptLanguage: 'en-US,en;q=0.9' }),
      { loadPreferredLanguage: load },
    );
    expect(lang).toBe('hi');
  });
});

describe('error responses over HTTP', () => {
  async function build() {
    const app = Fastify({ logger: false });
    await errorLocalizationPlugin(app, {
      isProd: true,
      loadPreferredLanguage: async () => 'hi',
    });
    app.get('/guard', async (req, reply) => {
      (req as unknown as { currentUser: { id: string } }).currentUser = { id: 'u1' };
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    });
    return app;
  }

  it('no Accept-Language -> English message', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/guard' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'ASTROLOGER role required', message: EN_FORBIDDEN });
    await app.close();
  });

  it('Accept-Language: hi -> Hindi message', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/guard', headers: { 'accept-language': 'hi' } });
    expect(res.json()).toMatchObject({ error: 'ASTROLOGER role required', message: HI_FORBIDDEN });
    await app.close();
  });
});
