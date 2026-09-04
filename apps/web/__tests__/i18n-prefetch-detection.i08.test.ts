/**
 * I-08 — how the root locale redirect decides that a request is a PREFETCH.
 *
 * The handoff on this finding asked for the `next-router-prefetch` branch in
 * middleware.ts to be deleted as dead, and for the prefetch to be detected
 * from the `_rsc` union query instead. Both halves are wrong, and this file is
 * the executable version of why — so the next person reads a red test instead
 * of re-deriving it.
 *
 * 1. THE HEADER IS NOT DEAD. next 15.5.20 (the version in this workspace) sets
 *    it in node_modules/next/dist/client/components/router-reducer/
 *    fetch-server-response.js:77, for `PrefetchKind.AUTO` — which is the
 *    default for <Link>, and is what the only `/`-targeting <Link> in the app
 *    (components/MobileNavV2.tsx:191) and the six footer locale links
 *    (app/layout.tsx:772-777) use. Nothing between the browser and this
 *    function removes it either: middleware runs inside the Next server
 *    process on Render, not in an edge adapter that rewrites headers.
 *
 * 2. `_rsc` IS NOT A PREFETCH SIGNAL. It is a cache-busting query appended to
 *    EVERY RSC fetch (set-cache-busting-search-param.js:52-56, called from
 *    createFetch for navigations and prefetches alike). Detecting a prefetch
 *    by it would classify a genuine client-side click as a prefetch and skip
 *    the redirect — undoing the exact clause of I-08 that was fixed. The
 *    "a real client navigation still redirects" case below is what goes red
 *    the moment somebody makes that swap.
 *
 * THE GAP THAT IS REAL, and which no header sniffing can close: `prefetch`
 * (PrefetchKind.FULL) and the segment cache's FetchStrategy.Full send `RSC: 1`
 * with NO prefetch header at all (fetch-server-response.js:76-78 and
 * segment-cache-impl/cache.js:1140-1160), so they are indistinguishable from a
 * soft navigation. It is latent rather than live: no <Link> in this app points
 * at `/` or at `?lang=` with `prefetch` set, and `experimental.clientSegmentCache`
 * is off in next.config.ts. If either of those changes, the root redirect will
 * start following prefetches again and the Router Cache can hold /hi under `/`.
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

import { middleware } from '../middleware';
import { LOCALE_COOKIE } from '../lib/i18n/locales';

function req(url: string, headers: Record<string, string> = {}, cookies: Record<string, string> = {}) {
  const r = new NextRequest(new URL(`https://darshya.online${url}`));
  for (const [k, v] of Object.entries(headers)) r.headers.set(k, v);
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}

const HINDI = { [LOCALE_COOKIE]: 'hi' };

/** The predicate the handoff proposed, written out so it can be measured. */
const looksLikePrefetchByUnionQuery = (r: NextRequest) => r.nextUrl.searchParams.has('_rsc');

describe('I-08 — `_rsc` cannot stand in for the prefetch header', () => {
  it('a real client-side navigation carries `_rsc` too', () => {
    // next/link soft navigation: RSC + state tree + the cache-busting query,
    // and NO prefetch header. Identical query, opposite intent.
    const navigation = req('/?_rsc=1a2b3c', {
      RSC: '1',
      'Next-Router-State-Tree': '%5B%22%22%2C%7B%7D%5D',
    }, HINDI);

    expect(looksLikePrefetchByUnionQuery(navigation)).toBe(true);
  });

  it('so the middleware must NOT use it: a real navigation still gets redirected', () => {
    const res = middleware(
      req('/?_rsc=1a2b3c', { RSC: '1', 'Next-Router-State-Tree': '%5B%22%22%2C%7B%7D%5D' }, HINDI),
    );

    // If someone swaps isPrefetch() over to the union query, this becomes a
    // 200 and the visitor who chose Hindi is silently kept on English.
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/hi');
  });

  it('and the redirect it emits stays unshareable', () => {
    const res = middleware(
      req('/?_rsc=1a2b3c', { RSC: '1' }, HINDI),
    );
    expect(res.headers.get('vary')).toContain('Cookie');
    expect(res.headers.get('cache-control') ?? '').toMatch(/no-store|private/);
  });
});

describe('I-08 — every prefetch shape Next actually emits is refused', () => {
  it('next/link PrefetchKind.AUTO — the header the handoff called dead', () => {
    const res = middleware(
      req('/', { RSC: '1', 'Next-Router-Prefetch': '1' }, HINDI),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('the segment cache sends the same header with the value "2"', () => {
    // segment-cache-impl/cache.js:1154 — FetchStrategy.PPRRuntime. A check
    // that compared against '1' would let this one through.
    const res = middleware(
      req('/', { RSC: '1', 'Next-Router-Prefetch': '2' }, HINDI),
    );
    expect(res.status).toBe(200);
  });

  it('a browser speculation-rules prefetch (Sec-Purpose)', () => {
    expect(middleware(req('/', { 'Sec-Purpose': 'prefetch;prerender' }, HINDI)).status).toBe(200);
    expect(middleware(req('/', { 'Sec-Purpose': 'prefetch' }, HINDI)).status).toBe(200);
  });

  it('the Google prefetch proxy (Purpose) and Firefox (X-moz)', () => {
    expect(middleware(req('/', { Purpose: 'prefetch' }, HINDI)).status).toBe(200);
    expect(middleware(req('/', { 'X-moz': 'prefetch' }, HINDI)).status).toBe(200);
  });
});

describe('I-08 — a prefetched ?lang= link never records a choice nobody made', () => {
  it('the footer "English →" link, prefetched, does not write the cookie', () => {
    const res = middleware(
      req('/?lang=en&_rsc=9f9f9f', { RSC: '1', 'Next-Router-Prefetch': '1' }, HINDI),
    );

    // Still redirected, so the router warms the URL it would land on…
    expect(res.status).toBe(307);
    // …but the visitor is still in Hindi, because they never clicked.
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('the same link CLICKED does write it, `_rsc` and all', () => {
    const res = middleware(
      req('/?lang=en&_rsc=9f9f9f', { RSC: '1' }, HINDI),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('set-cookie') ?? '').toContain(`${LOCALE_COOKIE}=en`);
  });
});
