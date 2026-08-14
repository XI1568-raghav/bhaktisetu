/**
 * LEG-13 — the parser behind the /about trust strip.
 *
 * The rule: a published count is the number the API just returned, or it is
 * not published. Anything that cannot be read comes back `null` so the caller
 * omits the stat. Falling back to the length of the page we happen to hold
 * would publish the page size (20) as the catalogue; falling back to a
 * remembered figure is how "200+" survived against 20 temples for months.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  templeCountFromPayload,
  pujaTypeCountFromPayload,
  fetchPublicStats,
} from '../lib/live-stats';

describe('LEG-13 — count parsers never invent a number', () => {
  it('reads the envelope total the list endpoints send', () => {
    // exact shape of GET /api/v1/temples?limit=1, verified live 2026-08-13
    expect(templeCountFromPayload({ temples: [{}], total: 20, page: 1, limit: 1, totalPages: 20 })).toBe(20);
    expect(pujaTypeCountFromPayload({ pujaTypes: [{}], total: 10, page: 1, limit: 1, totalPages: 10 })).toBe(10);
  });

  it('returns null — not the page length — when `total` is missing', () => {
    expect(templeCountFromPayload({ temples: [{}, {}, {}] })).toBeNull();
    expect(pujaTypeCountFromPayload({ pujaTypes: [{}, {}] })).toBeNull();
  });

  it('returns null for a non-numeric, negative or absent total', () => {
    expect(templeCountFromPayload({ temples: [], total: '20' })).toBeNull();
    expect(templeCountFromPayload({ temples: [], total: -1 })).toBeNull();
    expect(templeCountFromPayload({ temples: [], total: Number.NaN })).toBeNull();
    expect(templeCountFromPayload(null)).toBeNull();
    expect(templeCountFromPayload('nope')).toBeNull();
    expect(templeCountFromPayload({ error: 'Internal Server Error' })).toBeNull();
  });

  it('accepts a genuine zero — an empty catalogue is a fact, not a failure', () => {
    expect(templeCountFromPayload({ temples: [], total: 0 })).toBe(0);
  });
});

describe('LEG-13 — fetchPublicStats degrades to null, never throws', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('nulls both counts when the API is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(fetchPublicStats()).resolves.toEqual({ templeCount: null, pujaTypeCount: null });
  });

  it('nulls a count on a non-2xx without touching the other', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          String(url).includes('/temples')
            ? ({ ok: false, status: 500, json: async () => ({}) } as Response)
            : ({ ok: true, status: 200, json: async () => ({ pujaTypes: [], total: 10 }) } as Response),
        ),
      ),
    );
    await expect(fetchPublicStats()).resolves.toEqual({ templeCount: null, pujaTypeCount: 10 });
  });

  it('returns both when both answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () =>
            String(url).includes('/temples')
              ? { temples: [], total: 20 }
              : { pujaTypes: [], total: 10 },
        } as Response),
      ),
    );
    await expect(fetchPublicStats()).resolves.toEqual({ templeCount: 20, pujaTypeCount: 10 });
  });
});
