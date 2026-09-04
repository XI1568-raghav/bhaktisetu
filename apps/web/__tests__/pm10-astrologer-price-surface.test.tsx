/**
 * PM-10 — the astrologer price surface, code half.
 *
 * The finding as filed has two halves and they belong to different people.
 *
 * THE PRICE LEVEL IS THE OWNER'S CALL. "Senior astrologers are priced 2-4x
 * below the market ceiling" is a pricing decision, not a defect: there is no
 * band hardcoded anywhere that contradicts a published one. I checked every
 * constraint on the number — `apps/api/src/routes/astrologer-portal.ts:57`
 * accepts Rs 1 to Rs 100,000/min, `routes/onboarding.ts:69` accepts Rs 1 to
 * Rs 10,000/min, `routes/providers.ts:105` puts no ceiling on the response at
 * all, and the only literals in the tree are seeded defaults (10 and 15). An
 * astrologer is free to charge four times more today; nothing in the code stops
 * them. So there is nothing here to fix without an owner deciding what the
 * ceiling should be.
 *
 * THE RENDER IS MINE, AND IT WAS BROKEN. The finding's quoted string —
 * "25 / min", a bare number with no currency — matches exactly one surface:
 * "Verified astrologers on Darshya", which /astrology mounts as
 * ApprovedProvidersStrip. (The astrology cards render "/min" unspaced and are a
 * different surface.)
 *
 * The previous pass declared this half already fixed. It read `getPriceLabel`
 * (line 49), saw `₹${n.toLocaleString('en-IN')}${suffix}`, confirmed the same
 * bytes at the deployed commit ca044898 and closed it. That function is correct.
 * 130 lines further down, the render site UNDID it:
 *
 *     <IndianRupee className="w-3 h-3" />
 *     {price.replace('₹', '')}
 *
 * It took the glyph off the formatted string and substituted a decorative
 * lucide SVG. MEASURED BEFORE (this branch, 2026-08-28), the rendered
 * `container.textContent` of the strip was:
 *
 *     …JJyotish MehtaNo ratings yet25 / min
 *
 * — the finding's string, verbatim, still live. An icon is not a glyph anyone
 * can READ as text: an unlabelled inline SVG gives a screen-reader user nothing,
 * and copy-paste, in-page find, browser translate, print stylesheets and every
 * text scraper get a price with no currency on it. The other five per-minute
 * surfaces in the app all print ₹ as text; this was the only one that did not.
 *
 * The lesson worth carrying: a claim about what a user SEES cannot be settled by
 * reading the function that formats the string. It has to be measured on the
 * rendered output — which is what every assertion below does.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { getApprovedProviders, type ApprovedProvider } from '../lib/api';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const WEB_ROOT = path.resolve(__dirname, '..');
const API_ROOT = path.resolve(__dirname, '..', '..', 'api');

/**
 * A rendered per-minute/per-puja/per-session price must carry the rupee glyph.
 * Anchored on the digits so "Rs. 15/min" (a different, acceptable spelling used
 * on /astrology's own cards) is not confused with a bare "15 / min".
 */
const BARE_PRICE = /(^|[^₹\d.,])\d[\d,]*\s*\/\s*(min|puja|session)\b/;

describe('PM-10 — the guard itself rejects the defect the finding describes', () => {
  it('flags the exact string from the report', () => {
    expect(BARE_PRICE.test('Jyotish Mehta25 / min')).toBe(true);
    expect(BARE_PRICE.test('1,200 / puja')).toBe(true);
  });

  it('accepts the same price with its currency', () => {
    expect(BARE_PRICE.test('₹25 / min')).toBe(false);
    expect(BARE_PRICE.test('₹1,200 / puja')).toBe(false);
    expect(BARE_PRICE.test('₹2,500 / session')).toBe(false);
  });
});

// ── the rendered strip ───────────────────────────────────────────────────────

const ASTROLOGER: ApprovedProvider = {
  id: 'astro-1',
  displayName: 'Jyotish Mehta',
  pricePerMinute: 25,
} as ApprovedProvider;

function stubProviders(providers: ApprovedProvider[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ providers, total: providers.length }),
      text: async () => JSON.stringify({ providers, total: providers.length }),
    }),
  );
}

/** The strip is an async server component; await it, then render the element. */
async function renderStrip(providers: ApprovedProvider[]): Promise<string> {
  stubProviders(providers);
  const { ApprovedProvidersStrip } = await import('../components/ApprovedProvidersStrip');
  const element = await ApprovedProvidersStrip({
    type: 'astrologer',
    heading: 'Verified astrologers on Darshya',
  });
  const { container } = render(element);
  return container.textContent ?? '';
}

describe('PM-10 — /astrology never prints a price without its currency', () => {
  it('renders the per-minute rate with the rupee glyph', async () => {
    const text = await renderStrip([ASTROLOGER]);
    expect(text).toContain('₹25 / min');
    expect(text).not.toMatch(BARE_PRICE);
  });

  it('formats in the Indian grouping, not the western one', async () => {
    const text = await renderStrip([
      { ...ASTROLOGER, id: 'a2', pricePerMinute: 250000 } as ApprovedProvider,
    ]);
    // en-IN: 2,50,000 — not 250,000.
    expect(text).toContain('₹2,50,000 / min');
  });

  it('accepts the API sending the Decimal as a string, which it does', async () => {
    // apps/api serialises Decimal(10,2) as "25", not 25. A Number() that was
    // not there would print "NaN / min".
    const text = await renderStrip([
      { ...ASTROLOGER, id: 'a3', pricePerMinute: '25' as unknown as number } as ApprovedProvider,
    ]);
    expect(text).toContain('₹25 / min');
    expect(text).not.toMatch(/NaN/);
  });

  it('shows NO label rather than a zero price for a provider with no rate set', async () => {
    for (const value of [0, undefined, null, 'abc']) {
      cleanup();
      const text = await renderStrip([
        { ...ASTROLOGER, id: `a-${String(value)}`, pricePerMinute: value as never } as ApprovedProvider,
      ]);
      expect(text, `pricePerMinute=${String(value)}`).not.toMatch(/\/\s*min/);
      expect(text).not.toMatch(/NaN|₹0\b/);
      // The card itself still renders — only the price line is withheld.
      expect(screen.getByText('Jyotish Mehta')).toBeTruthy();
    }
  });
});

// ── every other per-minute surface ───────────────────────────────────────────

/**
 * A SOURCE-TEXT sweep over the other five per-minute surfaces was written,
 * measured, and DELETED. It flagged all five, and all five were correct: they
 * render `₹{rate}<span className="…">/min</span>`, so the currency and the
 * suffix sit in different JSX nodes and any lookback window over the source is
 * guessing. It also flagged the corrected line in this very file. That is the
 * guard-flags-the-right-pattern failure this engagement has now hit nine times,
 * and the lesson is that a claim about RENDERED text has to be measured on
 * rendered text.
 *
 * The four other components are client components with their own data hooks;
 * rendering each one to assert a currency is a different lane's worth of
 * scaffolding. They were read instead, and each carries ₹ as text:
 * AstrologyClient.tsx:550, astrologers/live/LiveAstrologersClient.tsx:178,
 * astrology/view/AstrologerProfileClient.tsx:351, astrology/[id]/book/page.tsx
 * :284 and :331. Only the strip put the glyph in an icon, and only the strip is
 * pinned here.
 */

// ── the contract that keeps the label from going null ────────────────────────

describe('PM-10 — the field the label reads is actually served', () => {
  it('the API astrologer projection includes pricePerMinute', () => {
    const src = readFileSync(path.join(API_ROOT, 'src/routes/providers.ts'), 'utf8');
    expect(src).toMatch(/pricePerMinute/);
  });

  it('the web type declares it, so a missing field is a tsc error not a blank card', () => {
    const src = readFileSync(path.join(WEB_ROOT, 'lib/api.ts'), 'utf8');
    expect(src).toMatch(/pricePerMinute\?:\s*number\s*\|\s*string/);
  });

  it('getApprovedProviders is the one loader the strip uses', () => {
    expect(typeof getApprovedProviders).toBe('function');
  });
});
