import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * TC-12 (in-lane extension, found 2026-08-28) — the homepage and /list-temple
 * print "N verified temples" over a count that has never filtered on
 * verification.
 *
 * `lib/platform-stats.getPlatformCounts()` requests `/temples?limit=1` and
 * reads the envelope's `total`. That request carries NO `isVerified` param,
 * and on the API side (read at apps/api/src/routes/temples.ts:109) the filter
 * is applied only when the param is present:
 *
 *     isVerified: isVerified !== undefined ? isVerified === 'true' : undefined
 *
 * which reaches apps/api/src/services/temple.service.ts:51:
 *
 *     if (isVerified !== undefined) { where.isVerified = isVerified; }
 *
 * so with the param absent `where` stays `{ status: 'active' }` and the count
 * returned at temple.service.ts:114 is
 *
 *     prisma.temple.count({ where })   // every ACTIVE temple, verified or not
 *
 * `verifiedTempleClaim()` then labels that catalogue size "N verified
 * temples", and it is rendered by components/home/TrustStrip.tsx:46 (from
 * app/page.tsx:91) and by app/list-temple/page.tsx:86.
 *
 * This escaped the CM-11 sweep because it is not a fabricated number — it IS a
 * server count, which is what that finding asked for. It is the LABEL that
 * over-claims: the count answers "how many temples are listed", the sentence
 * asserts "how many temples we verified". Those two numbers were equal on
 * 2026-08-13 only because all 20 seeded rows happened to be `is_verified`
 * (this file's own header records that), so nothing false was published yet.
 * The first unverified active temple makes the homepage assert verification
 * over a row nobody verified — and unlike a hardcoded figure, it cannot be
 * spotted by grepping for a digit.
 *
 * This file's stated doctrine is "a number only reaches a page if the API
 * counted it". The count has to be a count of the thing the sentence names.
 *
 * The fix is to ask for the filtered count. The digit-free fallback stays the
 * failure mode: a filtered request that fails still yields null, never the
 * unfiltered total.
 */

/** Active temples in the catalogue: 20. Of those, `is_verified`: 12. */
const TOTAL_ACTIVE = 20;
const TOTAL_VERIFIED = 12;

/**
 * A fetch stub that behaves like the real route: it honours `isVerified=true`
 * and returns the full catalogue when the param is absent. Records every URL
 * so the request itself can be asserted.
 */
function stubApi(): { urls: string[] } {
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const href = String(url);
      urls.push(href);
      if (href.includes('/temples')) {
        const verifiedOnly = /[?&]isVerified=true(?:&|$)/.test(href);
        const total = verifiedOnly ? TOTAL_VERIFIED : TOTAL_ACTIVE;
        return {
          ok: true,
          json: async () => ({ temples: [{ id: 'd1e712f6' }], total, page: 1, limit: 1 }),
        };
      }
      return {
        ok: true,
        json: async () => ({ streams: [{ temple: { slug: 'kashi-vishwanath-varanasi' } }] }),
      };
    }),
  );
  return { urls };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('TC-12 — the count labelled "verified" is a count of verified temples', () => {
  it('reports the verified count, not the whole active catalogue', async () => {
    stubApi();
    const { getPlatformCounts } = await import('../lib/platform-stats');
    const counts = await getPlatformCounts();

    expect(
      counts.verifiedTemples,
      'verifiedTemples returned the unfiltered active-temple total; the trust strip ' +
        'would assert verification over rows nobody verified',
    ).toBe(TOTAL_VERIFIED);
    expect(counts.verifiedTemples).not.toBe(TOTAL_ACTIVE);
  });

  it('asks the API for the verified subset', async () => {
    const { urls } = stubApi();
    const { getPlatformCounts } = await import('../lib/platform-stats');
    await getPlatformCounts();

    const templeUrl = urls.find((u) => u.includes('/temples'));
    expect(templeUrl, 'no /temples request was made').toBeDefined();
    expect(
      templeUrl,
      'the temple count request carries no isVerified filter, so the API counts ' +
        'every active temple (temple.service.ts:51 skips the filter when undefined)',
    ).toMatch(/[?&]isVerified=true(?:&|$)/);
  });

  it('renders the filtered figure in the published sentence', async () => {
    stubApi();
    const { getPlatformCounts, verifiedTempleClaim } = await import('../lib/platform-stats');
    const counts = await getPlatformCounts();
    expect(verifiedTempleClaim(counts.verifiedTemples)).toBe('12 verified temples');
  });

  it('still falls back to digit-free copy when the filtered count is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('API down');
      }),
    );
    const { getPlatformCounts, verifiedTempleClaim } = await import('../lib/platform-stats');
    const counts = await getPlatformCounts();
    expect(counts.verifiedTemples).toBeNull();
    expect(verifiedTempleClaim(counts.verifiedTemples)).not.toMatch(/\d/);
  });

  it('leaves the live-darshan count alone', async () => {
    stubApi();
    const { getPlatformCounts } = await import('../lib/platform-stats');
    const counts = await getPlatformCounts();
    expect(counts.liveDarshanTemples).toBe(1);
  });
});
