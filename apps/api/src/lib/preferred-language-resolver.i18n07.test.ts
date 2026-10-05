import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './__mocks__/prisma.js';

vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

import type { FastifyRequest } from 'fastify';
import {
  PREFERRED_LANGUAGE_TTL_MS,
  clearPreferredLanguageCache,
  loadPreferredLanguageFromDb,
  preferredLanguageCacheSize,
  resolveRequestLanguage,
} from './i18n.js';

/**
 * I18N-07 — the resolver on the path PRODUCTION actually takes.
 *
 * WHAT THIS FILE COVERS THAT THE EXISTING I18N-07 TESTS DO NOT. Every existing
 * assertion about `User.preferredLanguage` injects the `loadPreferredLanguage`
 * test seam (plugins/error-localization.test.ts:286, :359 and
 * routes/users.i18n.test.ts). src/server.ts:176 injects NOTHING, so the loader
 * production runs — `loadPreferredLanguageFromDb`, the only code path that ever
 * touches the database — had zero direct coverage. That is precisely the shape
 * of the I18N-03 failure recorded at the top of plugins/error-localization.ts:
 * "This plugin, the catalogue, the resolver and a green suite all shipped, and
 * production was still English." A seam every test fills and no caller fills is
 * a suite that cannot see the deployed behaviour.
 *
 * WHAT IS DATA AND WHAT IS SOURCE. Everything asserted here is runtime
 * behaviour — the arguments the resolver hands Prisma and the language it
 * returns. No source text is scanned, so no comment can satisfy or break an
 * assertion in this file.
 */

function request(init: {
  userId?: string;
  acceptLanguage?: string;
  lang?: string;
}): FastifyRequest {
  return {
    query: init.lang ? { lang: init.lang } : {},
    headers: init.acceptLanguage ? { 'accept-language': init.acceptLanguage } : {},
    ...(init.userId ? { currentUser: { id: init.userId } } : {}),
  } as unknown as FastifyRequest;
}

beforeEach(() => {
  clearPreferredLanguageCache();
  prismaMock.user.findUnique.mockReset();
});

describe('I18N-07 — the default loader is the one production runs', () => {
  it('reads User.preferredLanguage through a narrow column select', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'ta' });

    const stored = await loadPreferredLanguageFromDb('user-9');

    expect(stored).toBe('ta');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-9' },
      select: { preferredLanguage: true },
    });
  });

  it('resolves an authenticated request from the database with NO seam injected', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'te' });

    // The exact call shape src/server.ts produces: no `loadPreferredLanguage`.
    const language = await resolveRequestLanguage(
      request({ userId: 'user-1', acceptLanguage: 'en-GB,en;q=0.9' }),
    );

    expect(language).toBe('te');
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('never queries for an anonymous request — Accept-Language covers those', async () => {
    const language = await resolveRequestLanguage(request({ acceptLanguage: 'hi-IN,hi;q=0.9' }));

    expect(language).toBe('hi');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('lets ?lang= win without paying for a lookup', async () => {
    const language = await resolveRequestLanguage(
      request({ userId: 'user-1', lang: 'mr', acceptLanguage: 'en' }),
    );

    expect(language).toBe('mr');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('falls back to the header when the database read throws', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));

    const language = await resolveRequestLanguage(
      request({ userId: 'user-1', acceptLanguage: 'ta-IN,ta;q=0.9' }),
    );

    expect(language).toBe('ta');
  });
});

/**
 * The cache that makes the lookup affordable must not become the reason the
 * process dies. `preferredLanguageCache` is a module-level Map keyed by user
 * id: an entry is written for every authenticated user who triggers a single
 * error response, and — before this fix — nothing ever removed one. Expiry only
 * decided whether an entry was TRUSTED, never whether it was KEPT, so the map
 * grew monotonically for the life of the process, one row per distinct devotee,
 * on a 512 MB Render instance that is never restarted between deploys.
 */
describe('I18N-07 — the preferred-language cache is bounded', () => {
  it('does not grow one permanent entry per user who ever saw an error', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'hi' });

    const base = Date.now();
    for (let i = 0; i < 12_000; i++) {
      await resolveRequestLanguage(request({ userId: `user-${i}`, acceptLanguage: 'en' }), {
        // Every user is a fresh request well after the previous entry expired.
        now: base + i * (PREFERRED_LANGUAGE_TTL_MS + 1),
      });
    }

    expect(preferredLanguageCacheSize()).toBeLessThanOrEqual(10_000);
  });

  it('still serves a live entry from cache instead of re-querying', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'hi' });
    const now = Date.now();

    await resolveRequestLanguage(request({ userId: 'user-1', acceptLanguage: 'en' }), { now });
    await resolveRequestLanguage(request({ userId: 'user-1', acceptLanguage: 'en' }), { now: now + 1000 });

    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('re-reads once the entry has expired', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'hi' });
    const now = Date.now();

    await resolveRequestLanguage(request({ userId: 'user-1', acceptLanguage: 'en' }), { now });
    await resolveRequestLanguage(request({ userId: 'user-1', acceptLanguage: 'en' }), {
      now: now + PREFERRED_LANGUAGE_TTL_MS + 1,
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2);
  });

  it('drops a single user on demand, which is what a profile update does', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ preferredLanguage: 'hi' });
    const now = Date.now();

    await resolveRequestLanguage(request({ userId: 'user-1', acceptLanguage: 'en' }), { now });
    clearPreferredLanguageCache('user-1');
    await resolveRequestLanguage(request({ userId: 'user-1', acceptLanguage: 'en' }), { now: now + 1 });

    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2);
  });
});
