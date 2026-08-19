import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import {
  astrologyFetch,
  isAstrologyNetworkFailure,
  ASTROLOGY_FETCH_TIMEOUT_MS,
} from '../../../lib/astrologer-fetch';

/**
 * DF-12 (prod sweep 2026-08-12) — remaining half.
 *
 * "An invalid astrologer id spins on 'Loading…' forever with no error and no
 * 404." Two of the three parts already shipped:
 *   • /astrology/astrologers now exists as a real app-router segment instead of
 *     falling through to [id] and 307-ing to /astrology/view?id=astrologers
 *     (covered by __tests__/astrologer-directory-canonical-route.df12.test.tsx);
 *   • /astrology/astrologers/live exists (AW-03);
 *   • /astrology/view has a not-found state (covered by
 *     __tests__/astrology-profile-no-fixtures.test.tsx).
 *
 * What did NOT ship is the other half of the finding's own fix sentence: "and a
 * fetch timeout so it can never hang". Every astrology surface still called a
 * bare `fetch`, and a bare `fetch` never rejects on a stalled socket — so the
 * not-found state that was added is unreachable in precisely the failure the
 * spinner was reported for. A dead spinner is indistinguishable from a hung app.
 *
 * These tests bind to the BEHAVIOUR, not the spelling: a request that is
 * accepted and never answered must abort, and the page must leave its loading
 * state. Reverting any page to a bare `fetch` makes the matching case hang.
 */

// ─── Layer 1: the helper itself ──────────────────────────────────────────────

const realFetch = globalThis.fetch;

/** A server that accepts the connection and then says nothing, forever. */
function stalledFetch() {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        );
        // No signal => never settles. That is the bug, expressed.
      }),
  ) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DF-12 — astrologyFetch cannot hang', () => {
  it('aborts a request that never answers', async () => {
    globalThis.fetch = stalledFetch();
    await expect(astrologyFetch('https://example.invalid/astrologers/x', {}, 40)).rejects.toThrow(
      /abort/i,
    );
  });

  it('classifies the abort as a network failure, not a server answer', async () => {
    globalThis.fetch = stalledFetch();
    const err = await astrologyFetch('https://example.invalid/astrologers/x', {}, 40).catch(
      (e: unknown) => e,
    );
    expect(isAstrologyNetworkFailure(err)).toBe(true);
  });

  it('budgets the same 15s as the rest of the app', () => {
    expect(ASTROLOGY_FETCH_TIMEOUT_MS).toBe(15_000);
  });
});

// ─── Layer 2: the page the finding names ─────────────────────────────────────

const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/astrology/view',
  useParams: () => ({}),
}));

// NOT mocked down to `{ API_BASE_URL }` on purpose: this suite must exercise the
// pages' real timeout wiring, so lib/api-config is left alone entirely.

const AstrologerProfilePage = (await import('../view/AstrologerProfileClient')).default;

beforeEach(() => {
  searchParams.forEach((_v, k) => searchParams.delete(k));
  vi.clearAllMocks();
});

describe('DF-12 — /astrology/view leaves the spinner when the API never answers', () => {
  it('passes an AbortSignal to fetch (without one there is no timeout at all)', async () => {
    searchParams.set('id', 'zzz-not-a-real-astrologer-999');
    const spy = vi.fn(async () => new Response(JSON.stringify({ astrologer: null }), { status: 404 }));
    globalThis.fetch = spy as unknown as typeof fetch;

    render(<AstrologerProfilePage />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const init = spy.mock.calls[0]![1] as RequestInit | undefined;
    expect(init?.signal, '/astrology/view called fetch with no AbortSignal').toBeInstanceOf(
      AbortSignal,
    );
  });

  it('shows the unavailable state instead of spinning forever on a stalled socket', async () => {
    searchParams.set('id', 'zzz-not-a-real-astrologer-999');
    globalThis.fetch = stalledFetch();

    // Fake timers must be installed BEFORE the effect runs: the abort timer is
    // scheduled inside the fetch call, and a timer created under real timers
    // cannot be driven by the fake clock afterwards. The page owns its own 15s
    // budget, which is not a wait this suite can afford for real.
    vi.useFakeTimers();
    render(<AstrologerProfilePage />);
    await vi.advanceTimersByTimeAsync(0);

    // The spinner is the honest answer while the request is in flight…
    expect(
      screen.queryByText(/Loading astrologer/i),
      'the page should be loading before the budget expires',
    ).toBeTruthy();

    // …but it must not be the answer forever.
    await vi.advanceTimersByTimeAsync(ASTROLOGY_FETCH_TIMEOUT_MS + 1_000);
    vi.useRealTimers();

    await waitFor(() =>
      expect(screen.queryByText(/This astrologer profile is not available/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/Loading astrologer/i)).toBeNull();
  });
});

// ─── Layer 2b: the shell that ships without JavaScript ───────────────────────

/**
 * DF-12's own evidence is worth reading literally: "main.innerText stays
 * 'Loading…' indefinitely and performance shows ZERO requests to
 * api.darshya.online — so it never even attempts a lookup".
 *
 * Zero requests means no client code ran at all. The in-component spinner says
 * "Loading astrologer…"; the bare "Loading…" the sweep measured is the Suspense
 * fallback in the PRERENDERED shell (view/page.tsx:547) — the only thing on the
 * page before hydration. So the reported instance was the shell sitting there
 * with its client bundle never taking over (the repo already documents this
 * hazard: a one-year `s-maxage` on HTML behind a shared cache can serve a shell
 * whose chunk URLs the current build no longer has).
 *
 * The timeout above cannot help there — no JS runs to time anything out. What
 * CAN help is that the shell is server-rendered HTML: a link inside it works
 * with no JavaScript whatsoever. The finding's customer_impact is "parks the
 * devotee on a permanent spinner with NO WAY to understand what happened or
 * where to go"; an anchor in the shell is the way out, and it costs nothing.
 */
const { ProfileLoadingShell } = await import('../view/AstrologerProfileClient');

describe('DF-12 — the pre-hydration shell is not a trap', () => {
  it('offers a link out that works with no JavaScript at all', () => {
    render(<ProfileLoadingShell />);
    const links = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links, 'the shell the sweep measured offers no way out').toContain(
      '/astrology/astrologers/live',
    );
    expect(links).toContain('/astrology');
  });

  it('still says it is loading, so a normal fast load is not made to look broken', () => {
    render(<ProfileLoadingShell />);
    expect(document.body.textContent).toMatch(/Loading/i);
  });
});

// ─── Layer 3: the ratchet ────────────────────────────────────────────────────

/**
 * Strip comments before scanning source text.
 *
 * This sweep has now shipped five guards that matched their own documentation:
 * a localStorage ban tripping on the comment documenting the ban, a 5xx scan
 * flagging six valid 4xx echoes, a CTA test matching a comment naming the CTA,
 * and a ratchet held over baseline by a comment describing deleted code. Every
 * one of these files documents the bare-`fetch` bug in prose directly above the
 * call it replaced, so an unstripped scan would pass on the prose and fail on
 * nothing.
 *
 * String and template literals are skipped too, so the `//` in a URL literal is
 * not mistaken for the start of a line comment.
 */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i]!;
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += c;
      i++;
      while (i < n) {
        if (src[i] === '\\') {
          out += src[i]! + (src[i + 1] ?? '');
          i += 2;
          continue;
        }
        out += src[i]!;
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Every browser-side `fetch(` that is not a method call (`x.fetch(`). */
function bareFetchCalls(src: string): string[] {
  const code = stripComments(src);
  const hits: string[] = [];
  const re = /(?<![\w.$])fetch\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    hits.push(code.slice(m.index, m.index + 90).split('\n')[0]!.trim());
  }
  return hits;
}

describe('DF-12 ratchet — no bare fetch left on the astrology surfaces', () => {
  // Every astrology page that loads data behind a spinner. All three are
  // 'use client' components, so every call is a browser request a human is
  // watching a loader for. lib/astrologer-fetch.ts is the one place `fetch(`
  // may appear — it is the module that wraps it.
  const PAGES = [
    // DF-12 (second pass): this was app/astrology/view/page.tsx. That path is now
    // a server component that only gates the id, so pointing the ratchet at it
    // would make this assertion pass vacuously — the fetches live in the client
    // half, which moved here.
    'app/astrology/view/AstrologerProfileClient.tsx',
    'app/astrology/AstrologyClient.tsx',
    'app/astrology/[id]/book/page.tsx',
    'app/astrology/astrologers/live/LiveAstrologersClient.tsx',
  ];

  const WEB_ROOT = join(import.meta.dirname, '..', '..', '..');

  for (const rel of PAGES) {
    it(`${rel} has no bare fetch(`, () => {
      const src = readFileSync(join(WEB_ROOT, rel), 'utf8');
      const bare = bareFetchCalls(src);
      expect(bare, `${rel} still has ${bare.length} bare fetch( call(s): ${bare.join(' | ')}`).toEqual(
        [],
      );
    });
  }

  it('the comment stripper actually strips (this guard must not pass on prose)', () => {
    const proseOnly = `
      // the old code called fetch( here and hung forever
      /* another fetch( in a block comment */
      const url = 'https://api.test/x'; // fetch( in a trailing comment
      export const s = "fetch(";
    `;
    // The string literal is deliberately kept — only comments are removed — so
    // the stripper's job is provable without the test asserting zero.
    const stripped = stripComments(proseOnly);
    expect(stripped).not.toMatch(/old code called/);
    expect(stripped).not.toMatch(/block comment/);
    expect(stripped).toMatch(/https:\/\/api\.test\/x/);
    expect(bareFetchCalls('// fetch(\nconst a = 1;')).toEqual([]);
    expect(bareFetchCalls('const r = fetch(url);')).toHaveLength(1);
  });
});
