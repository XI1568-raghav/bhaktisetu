import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * CM-11 (prod sweep 2026-08-12, re-opened by adversarial verify) — the trust
 * strip WAS rewired to a server count, and then never printed one, because the
 * parser was written against a payload shape the API does not emit.
 *
 * The live contract, read off the running API on 2026-08-14:
 *
 *   $ curl -s 'http://127.0.0.1:4000/api/v1/temples?limit=1'
 *   TOP KEYS: [ 'temples', 'total', 'page', 'limit', 'totalPages' ]
 *   total = 20     pagination = undefined
 *
 * `lib/platform-stats.getPlatformCounts()` does a RAW fetch — it does not go
 * through `lib/api.serverFetch`, whose `normalizePaginated()` is the only thing
 * in the app that rewrites `{ temples, total, page, limit }` into
 * `{ data, pagination: { total } }`. So `templeTotalFromPayload` reading
 * `payload.pagination.total` returned null on every request, `verifiedTemples`
 * was always null, and the homepage always rendered the digit-free fallback
 * "Verified temples, manager-signed" instead of "20 verified temples".
 *
 * The honest fallback meant nothing false was ever published — which is why
 * this went unnoticed — but the finding asked for the true number, and the
 * true number never reached the page.
 *
 * These tests are written against the RAW envelope the API actually sends. The
 * `pagination` shape is kept as a second accepted form (a caller that has
 * already normalised must not silently lose its count), but it is no longer
 * the only one.
 */

/** The exact body of GET /api/v1/temples?limit=1, trimmed to the envelope. */
const RAW_TEMPLES_ENVELOPE = {
  temples: [{ id: 'd1e712f6', slug: 'tirumala-tirupati', name: 'Tirumala Tirupati Devasthanam' }],
  total: 20,
  page: 1,
  limit: 1,
  totalPages: 20,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('CM-11 — the parser reads the envelope the API actually sends', () => {
  it('reads the top-level total off the raw /temples payload', async () => {
    const { templeTotalFromPayload } = await import('../lib/platform-stats');
    expect(templeTotalFromPayload(RAW_TEMPLES_ENVELOPE)).toBe(20);
  });

  it('still reads an already-normalised { pagination: { total } } body', async () => {
    const { templeTotalFromPayload } = await import('../lib/platform-stats');
    expect(templeTotalFromPayload({ pagination: { total: 20 } })).toBe(20);
  });

  it('keeps refusing anything that is not a non-negative integer', async () => {
    const { templeTotalFromPayload } = await import('../lib/platform-stats');
    expect(templeTotalFromPayload({ total: '20' })).toBeNull();
    expect(templeTotalFromPayload({ total: 20.5 })).toBeNull();
    expect(templeTotalFromPayload({ total: -1 })).toBeNull();
    expect(templeTotalFromPayload({ total: NaN })).toBeNull();
    expect(templeTotalFromPayload({ temples: [] })).toBeNull();
    expect(templeTotalFromPayload(null)).toBeNull();
  });

  it('never counts the page it happens to hold as the catalogue size', async () => {
    const { templeTotalFromPayload } = await import('../lib/platform-stats');
    // 3 rows on the page, no total in the envelope: publishing 3 would be a
    // page size masquerading as an inventory count.
    expect(templeTotalFromPayload({ temples: [{}, {}, {}] })).toBeNull();
  });
});

describe('CM-11 — getPlatformCounts produces a printable count from the live shape', () => {
  it('returns 20 for the body the running API returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () =>
          String(url).includes('/temples')
            ? RAW_TEMPLES_ENVELOPE
            : { streams: [{ temple: { slug: 'kashi-vishwanath-varanasi' } }], total: 1 },
      })),
    );

    const { getPlatformCounts, verifiedTempleClaim } = await import('../lib/platform-stats');
    const counts = await getPlatformCounts();

    expect(counts.verifiedTemples).toBe(20);
    expect(verifiedTempleClaim(counts.verifiedTemples)).toBe('20 verified temples');
  });

  it('a failed fetch still yields null, never a remembered number', async () => {
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
});
