/**
 * PF-10 (prod sweep 2026-08-12, P3) — /pujas/home-puja/book served HTTP 200
 * with an h1 reading "Puja not found".
 *
 * The route was a `'use client'` page, and a client component cannot set a
 * status code — the 200 is already committed before it runs. So an unknown or
 * absent `?slug=` produced an indexable dead end. It matters now rather than
 * later because PF-01 pointed the ceremony CTAs at this wizard, so bare
 * no-slug traffic is about to arrive.
 *
 * These tests drive the server component directly and assert what it does with
 * the three shapes of query string. `redirect()` and `notFound()` signal by
 * throwing, so they are mocked to throw identifiably.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const nav = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => nav);

// The wizard itself is not under test here and pulls in the whole booking tree.
vi.mock('../app/pujas/home-puja/book/BookHomePujaClient', () => ({
  default: () => null,
}));

import BookHomePujaPage from '../app/pujas/home-puja/book/page';
import { resolveBookRoute } from '../app/pujas/home-puja/book/resolve-book-route';
import { homePujaCategories } from '../lib/home-pujas';

const KNOWN = homePujaCategories[0]!.slug;

function run(params: Record<string, string | string[] | undefined>) {
  return BookHomePujaPage({ searchParams: Promise.resolve(params) });
}

beforeEach(() => {
  nav.redirect.mockClear();
  nav.notFound.mockClear();
});

describe('PF-10 — the bare route stops being a dead end', () => {
  it('redirects to the ceremony catalogue when no slug is supplied', async () => {
    await expect(run({})).rejects.toThrow('REDIRECT:/pujas/home-puja');
    expect(nav.redirect).toHaveBeenCalledWith('/pujas/home-puja');
    expect(nav.notFound).not.toHaveBeenCalled();
  });

  it('treats an empty or whitespace slug the same as none at all', async () => {
    await expect(run({ slug: '' })).rejects.toThrow('REDIRECT:/pujas/home-puja');
    await expect(run({ slug: '   ' })).rejects.toThrow('REDIRECT:/pujas/home-puja');
  });
});

describe('PF-10 — an unknown slug is a real 404, not a 200 body', () => {
  it('calls notFound() rather than rendering a page', async () => {
    await expect(run({ slug: 'no-such-ceremony' })).rejects.toThrow('NOT_FOUND');
    expect(nav.notFound).toHaveBeenCalled();
    expect(nav.redirect).not.toHaveBeenCalled();
  });

  it('does not fall back to some other ceremony', async () => {
    await expect(run({ slug: 'no-such-ceremony' })).rejects.toThrow('NOT_FOUND');
  });
});

describe('PF-10 — a real ceremony still renders the wizard', () => {
  it('neither redirects nor 404s for a known slug', async () => {
    const el = await run({ slug: KNOWN });
    expect(el).toBeTruthy();
    expect(nav.redirect).not.toHaveBeenCalled();
    expect(nav.notFound).not.toHaveBeenCalled();
  });

  it('takes the first value when the param repeats', async () => {
    const el = await run({ slug: [KNOWN, 'no-such-ceremony'] });
    expect(el).toBeTruthy();
    expect(nav.notFound).not.toHaveBeenCalled();
  });

  it('classifies every seeded ceremony slug as renderable', () => {
    for (const c of homePujaCategories) {
      expect(resolveBookRoute(c.slug)).toEqual({ kind: 'render', slug: c.slug });
    }
  });

  it('the page file exports nothing the App Router would reject at build time', async () => {
    // `next build` type-checks a page against the recognised segment exports;
    // a stray named export passes tsc and vitest and then breaks the build.
    const mod = await import('../app/pujas/home-puja/book/page');
    expect(Object.keys(mod).sort()).toEqual(['default']);
  });
});
