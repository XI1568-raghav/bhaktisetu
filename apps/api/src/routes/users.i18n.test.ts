import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const CURRENT_USER = { id: 'user-1', email: 'a@example.com', roles: ['DEVOTEE'] };

vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: { currentUser?: unknown }) => {
    request.currentUser = { ...CURRENT_USER };
  },
}));

import Fastify from 'fastify';
import { SUPPORTED_LANGUAGES } from '@poojly/shared';
import { userRoutes } from './users.js';
import { localizedError } from '../lib/error-i18n.js';
import { clearPreferredLanguageCache } from '../lib/i18n.js';

/**
 * I-04 / I18N-03 / I18N-07 / I-11, end to end on the one route file this lane
 * owns.
 *
 * At HEAD every assertion about `message` below fails: the 400 answered with
 * the raw Zod string, the 409 with a hardcoded English sentence, the 404 with
 * "User profile not found.", and `preferredLanguage` was read by nothing at
 * all. Proof of red is in the report.
 */

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await userRoutes(instance);
  }, { prefix: '/api/v1/users' });
  return app;
}

/**
 * The profile row GET /me returns, and — separately — the narrow
 * `select: { preferredLanguage }` read the language resolver makes. One mock
 * serves both; branch on the select so they cannot be confused.
 */
function seedUser(preferredLanguage: string | null) {
  prismaMock.user.findUnique.mockImplementation(async (args: any) => {
    if (args?.select?.preferredLanguage) return { preferredLanguage };
    return {
      id: 'user-1',
      phone: null,
      email: 'a@example.com',
      fullName: 'Asha Devi',
      avatarUrl: null,
      preferredLanguage,
      locationCity: null,
      locationState: null,
      isNri: false,
      nriCountry: null,
      gotra: null,
      nakshatra: null,
      rashi: null,
      subscriptionTier: 'free',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      addresses: [],
      subscription: [],
      _count: { bookings: 0 },
    };
  });
}

beforeEach(() => {
  clearPreferredLanguageCache();
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.update.mockReset();
  seedUser(null);
});

describe('I-04 — PATCH /users/me answers validation failures in the caller\'s language', () => {
  it('localizes the message for Accept-Language: hi', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { 'accept-language': 'hi-IN,hi;q=0.9' },
      payload: { fullName: '' },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe(localizedError('INVALID_BODY', 'hi'));
    expect(res.json().code).toBe('INVALID_BODY');
  });

  it('keeps the English label clients switch on', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { 'accept-language': 'ta' },
      payload: { fullName: '' },
    });
    await app.close();

    expect(res.json().error).toBe('Validation Error');
    expect(res.json().message).toBe(localizedError('INVALID_BODY', 'ta'));
  });

  it('does not lose the field-level Zod detail the form needs', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { 'accept-language': 'hi' },
      payload: { email: 'not-an-email' },
    });
    await app.close();

    const details = res.json().details as Array<{ path: string[] }>;
    expect(Array.isArray(details)).toBe(true);
    expect(details[0]?.path).toEqual(['email']);
  });

  it('still answers English when nothing asks for otherwise', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      payload: { fullName: '' },
    });
    await app.close();

    expect(res.json().message).toBe(localizedError('INVALID_BODY', 'en'));
  });
});

describe('I-04 — the other error exits of this route file', () => {
  it('localizes the duplicate-email conflict', async () => {
    prismaMock.user.update.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['email'] } }),
    );
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { 'accept-language': 'ta' },
      payload: { email: 'taken@example.com' },
    });
    await app.close();

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Conflict');
    expect(res.json().message).toBe(localizedError('EMAIL_TAKEN', 'ta'));
  });

  it('localizes a missing profile', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { 'accept-language': 'kn' },
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe(localizedError('NOT_FOUND', 'kn'));
  });

  it('localizes a bad pagination query', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/bookings?page=0',
      headers: { 'accept-language': 'te' },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe(localizedError('INVALID_QUERY', 'te'));
  });

  /**
   * Guard, not an oversight. "or does not belong to you" is information no
   * catalogue code carries; translating it into the generic NOT_FOUND sentence
   * would be a downgrade. If someone adds an ADDRESS_NOT_FOUND code they may
   * change this — not before.
   */
  it('does NOT flatten the bespoke address 404 into a generic code', async () => {
    prismaMock.userAddress.findFirst.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me/addresses/abc',
      headers: { 'accept-language': 'hi' },
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe('Address not found or does not belong to you.');
  });
});

describe('I18N-07 — the stored preferredLanguage selects the language', () => {
  it('answers in the profile language even though the browser asks for English', async () => {
    seedUser('ta');
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { 'accept-language': 'en-GB,en;q=0.9' },
      payload: { fullName: '' },
    });
    await app.close();

    expect(res.json().message).toBe(localizedError('INVALID_BODY', 'ta'));
  });

  it('falls back to English for a supported-but-untranslated preference', async () => {
    seedUser('bn');
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      payload: { fullName: '' },
    });
    await app.close();

    expect(res.json().message).toBe(localizedError('INVALID_BODY', 'en'));
  });

  it('lets ?lang= override the stored preference', async () => {
    seedUser('ta');
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me?lang=hi',
      payload: { fullName: '' },
    });
    await app.close();

    expect(res.json().message).toBe(localizedError('INVALID_BODY', 'hi'));
  });
});

describe('I-11 — the route schema is the one list, not a hand-retyped copy', () => {
  it('accepts every supported language code', async () => {
    for (const language of SUPPORTED_LANGUAGES) {
      prismaMock.user.update.mockResolvedValue({
        id: 'user-1',
        phone: null,
        email: null,
        fullName: 'Asha Devi',
        avatarUrl: null,
        preferredLanguage: language,
        locationCity: null,
        locationState: null,
        isNri: false,
        nriCountry: null,
        gotra: null,
        nakshatra: null,
        rashi: null,
        subscriptionTier: 'free',
        createdAt: new Date(0),
        updatedAt: new Date(0),
      });
      const app = await buildApp();
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me',
        payload: { preferredLanguage: language },
      });
      await app.close();

      expect(res.statusCode, `${language} should be accepted`).toBe(200);
    }
  });

  it('rejects a code the Prisma enum cannot store, as a 400 not a 500', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      payload: { preferredLanguage: 'zz' },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
