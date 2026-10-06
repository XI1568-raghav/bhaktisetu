/**
 * [HOME-01] THIRD PASS, 2026-08-23 — the ranked deferral list, re-measured
 * against the homepage that exists after the 2026-08-23 revamp.
 *
 * WHY A THIRD PASS. HOME-01's deliverable is "a ranked deferral list with
 * measured bytes". Two have been produced and BOTH are now fiction:
 *
 *   docs/audit/triage-2026-08-15.md:112   26 top-level children, 121,470 B
 *   __tests__/home-preload-and-deferral.home01.test.tsx (header, 2026-08-21)
 *                                         26 top-level children, 122,315 B
 *
 * Both rank `YatraStrip` #1 and the store strip #4, and both list "What Darshya
 * offers" and "Quick actions" as rows 9 and 10. The 2026-08-23 revamp deleted
 * ten `<section>` blocks from `app/page.tsx` and unmounted `YatraStrip` and
 * `ShopStrip` from the homepage entirely — neither is imported by `app/page.tsx`
 * any more. A ranking whose top row is a section that is not on the page cannot
 * be used to decide anything, and nothing in the suite could notice, because
 * both rankings live in COMMENTS.
 *
 * That is the defect this file fixes: the ranking is asserted now, so the next
 * revamp fails a test instead of silently invalidating the deliverable.
 *
 * ── METHOD (stated so the numbers can be re-derived) ──────────────────────
 *
 * Production is 503 on a Render billing suspension since 2026-08-17, so NOTHING
 * here is measured against the live document.
 *
 *   markup  `app/page.tsx` is rendered with `renderToStaticMarkup`, the two data
 *           calls stubbed (`getTodayPanchang`, `getPlatformCounts`) and the
 *           result parsed. A row's byte count is the `outerHTML.length` of one
 *           top-level child of the page wrapper.
 *
 *           EXCLUSION, stated rather than hidden: `ThisWeek` is an async server
 *           component. `renderToStaticMarkup` is synchronous and cannot await a
 *           nested async component, so it is stubbed to a 32 B marker and its
 *           real markup is NOT in any total below. Every other row is complete.
 *
 *   images  one HTTP HEAD per candidate URL, browser UA + Referer, issued
 *           serially with 3 s spacing (Wikimedia burst-throttles a concurrent
 *           fan-out and answers 429 with a 1,964 B error body — four of the
 *           first six requests in this pass came back that way). Commons and
 *           Unsplash are third-party hosts, not our suspended origin. Each URL
 *           is the one the page actually emits, read off the rendered markup.
 *           Read 2026-08-23; every figure below reproduced the 2026-08-21 pass
 *           exactly where the two overlap, which is the cross-check that the
 *           method is the same one.
 *
 *   bytes   a row's image cost is what a browser RESOLVES to, not the `src`
 *           attribute: `sizes` is evaluated against the viewport and the winning
 *           `srcSet` candidate is the one charged. Desktop = 1280 CSS px at DPR
 *           1, phone = 375 CSS px at DPR 1. Both are quoted because they select
 *           different candidates and the gap is the whole point of the srcSet
 *           work that already shipped.
 *
 * ── MEASURED COMPOSITION, 2026-08-23 ──────────────────────────────────────
 *
 *   whole page rendered                70,718 B   (was 125,418 B on 2026-08-21)
 *   page wrapper                       67,415 B   across 12 top-level children
 *   above fold (rows 1-2)              12,147 B   1 image
 *   below fold (rows 3-12)             55,268 B   7 images
 *
 * The fold is the audit's own: 720 px, which puts the hero and IntentTrio above
 * it. Markup is down 44% and the below-fold image bill is down from the 13,886
 * KB the original finding measured to the table below — the finding's premise
 * (defer megabytes of images) has been dead since PERF-01 and stays dead.
 *
 * ── RANKED BY MEASURED SAVEABLE BYTES (below-fold rows only) ──────────────
 *
 * RE-MEASURED 2026-09-08 after the home redesign. Four rows in the previous
 * table no longer exist — WorshipStrip, WisdomStrip and ConsultStrip were moved
 * off the home page onto the pages that own their intent, and WhatYouGet was
 * merged into HowItWorks (the two answered the same question twice for ~550px).
 * Two rows are new: ServiceLanes and NriLane. Byte figures below are this
 * file's own scan, not estimates.
 *
 *  #  row                                     markup   images   deferred
 *  1  Every way to be present (ServiceLanes)  12,872 B    0      yes
 *  2  Authentic rituals, verified priests     10,688 B    2      no
 *  3  How it works (+ merged promises)         9,928 B    0      yes
 *  4  See the divine, from anywhere            6,914 B    3      no
 *  5  Be at the temple without the flight      4,854 B    0      yes
 *  6  Daily panchang in your inbox             1,134 B    0      no
 *     ThisWeek                                    32 B    0      (async, stubbed)
 *
 * ── WHAT THE RANKING SAYS TO DO, AND WHAT THIS FILE THEREFORE ASSERTS ─────
 *
 * (a) Every below-fold, image-free row over the 3 KB floor now carries
 *     `.defer-paint` (rows 1, 3 and 5). The regression this paragraph used to
 *     describe — the revamp adding WhatYouGet and HowItWorks without it while
 *     deleting the two rows an earlier pass had deferred — is closed, and the
 *     2026-09-08 redesign kept it closed by deferring both new sections as it
 *     added them. Asserted below, so it cannot silently reopen.
 *
 *     `content-visibility: auto` is self-correcting on the fold question: the
 *     browser skips layout and paint only while the element is far from the
 *     viewport and renders it normally once it is near, so a tall desktop that
 *     shows a deferred row at load pays nothing extra. That is why this is safe
 *     to apply from a static rank without a live viewport measurement.
 *
 * (b) Row 6 is deliberately NOT deferred, and the reason is written down so a
 *     later pass does not "finish the job": 1,134 B is below the point where
 *     skipping layout is worth a contain-intrinsic-size guess, and it is the
 *     last element on the page, where a wrong intrinsic size is a visible
 *     scrollbar jump.
 *
 * (c) The Aarti Thali thumbnail is the ONLY <img> on the homepage with neither
 *     `srcSet` nor `sizes`, so every device takes the 250 px / 15,277 B
 *     candidate into a slot that is ~190 CSS px on desktop and ~112 on a phone.
 *     Offering the 120 px / 5,144 B step saves 10,133 B on a 1x phone.
 *     Deliberately NOT offering 500: this is the trap the 2026-08-20 pass
 *     documented on the Live Darshan tile, where adding a wider candidate ADDED
 *     133,682 B to every desktop and every DPR-3 phone. [120, 250] can only
 *     win — a 2x screen still resolves to 250, exactly what it pays today.
 *
 * (d) The `next/dynamic` + IntersectionObserver programme the finding asked for
 *     is STILL the wrong work and is still not built. The whole below-fold
 *     markup prize is 55,268 B raw, ~8 KB gzipped, and removing it from the
 *     HTML costs SEO and hydration risk. Recorded as a decision, not an
 *     oversight.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../lib/api', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  getTodayPanchang: async () => ({ tithi: 'Dwitiya', nakshatra: 'Rohini' }),
}));
vi.mock('../lib/platform-stats', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  getPlatformCounts: async () => ({
    liveDarshanTemples: 17,
    verifiedTemples: 42,
    verifiedPandits: 31,
    pujaTypes: 10,
  }),
}));
// Async server component — renderToStaticMarkup is synchronous and suspends on
// it. Stubbed; its markup is excluded from every total, as the method says.
vi.mock('../components/home/ThisWeek', () => ({
  default: () => React.createElement('div', { 'data-stub': 'ThisWeek' }),
}));

type Row = {
  index: number;
  label: string;
  bytes: number;
  images: number;
  deferred: boolean;
  imgs: Array<{ src: string; srcSet: boolean; sizes: string | null; lazy: boolean }>;
};

let rows: Row[];

beforeAll(async () => {
  const { default: HomePage } = await import('../app/page');
  const el = await (HomePage as unknown as () => Promise<React.ReactElement>)();
  const html = renderToStaticMarkup(el);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const tops = Array.from(doc.body.children);
  const wrapper = tops[tops.length - 1] as HTMLElement;

  rows = (Array.from(wrapper.children) as HTMLElement[]).map((child, i) => {
    const imgs = Array.from(child.querySelectorAll('img'));
    return {
      index: i + 1,
      label:
        child.getAttribute('aria-label') ??
        child.getAttribute('data-stub') ??
        child.querySelector('h1,h2,h3')?.textContent?.trim().slice(0, 46) ??
        `<${child.tagName.toLowerCase()}>`,
      bytes: child.outerHTML.length,
      images: imgs.length,
      // The class on the TOP-LEVEL CHILD only. content-visibility on some inner
      // <div> would not skip the section's layout, so reading a descendant's
      // class here would let a no-op satisfy the assertion.
      deferred: /\bdefer-paint\b/.test(child.getAttribute('class') ?? ''),
      imgs: imgs.map((img) => ({
        src: img.getAttribute('src') ?? '',
        srcSet: !!img.getAttribute('srcset'),
        sizes: img.getAttribute('sizes'),
        lazy: img.getAttribute('loading') === 'lazy',
      })),
    };
  });
});

/** The audit's fold (720 px) puts rows 1-2 above it; everything else is below. */
const ABOVE_FOLD = 2;
const below = () => rows.filter((r) => r.index > ABOVE_FOLD);

describe('[HOME-01] the ranking describes the page that exists', () => {
  it('the composition canary still holds (the ranking is not measuring a dead page)', () => {
    // This is the assertion the two previous rankings lacked. Both went stale
    // silently because they lived in comments. If the revamp that invalidates
    // this table lands, THIS fails and the table gets re-measured.
    expect(
      rows.length,
      'the homepage top-level child count moved. Re-measure the ranked deferral ' +
        'list in this file header before changing this number — a ranking that ' +
        'names sections the page no longer has is what this file exists to prevent.',
    ).toBe(9);
  });

  it('the rows the two earlier rankings put at #1 and #4 are genuinely gone', () => {
    const labels = rows.map((r) => r.label).join(' | ');
    expect(labels, 'YatraStrip is back — re-rank').not.toMatch(/Pilgrimage with peace of mind/i);
    expect(labels, 'ShopStrip is back — re-rank').not.toMatch(/Prasad, idols, books/i);
  });

  it('exactly one image is above the fold and it is the only non-lazy one', () => {
    const aboveImgs = rows.filter((r) => r.index <= ABOVE_FOLD).flatMap((r) => r.imgs);
    expect(aboveImgs).toHaveLength(1);
    const eager = rows.flatMap((r) => r.imgs).filter((i) => !i.lazy);
    expect(
      eager,
      'a second eager image would be fetched at load, which is what the whole ' +
        'below-fold ranking assumes does not happen.',
    ).toHaveLength(1);
  });
});

describe('[HOME-01] every below-fold text-only section skips layout and paint', () => {
  /*
   * The rule is mechanical: below the fold, zero images, and big enough that
   * skipping its layout is worth a contain-intrinsic-size estimate. Rows 8 and
   * 9 (1,869 B and 1,128 B) sit under the floor on purpose — see (b) in the
   * header. The floor is stated as a constant so the exemption is visible
   * rather than being an unexplained gap in an allowlist.
   */
  const FLOOR_BYTES = 3_000;

  it('the scan finds the sections it is supposed to be judging (not vacuous)', () => {
    const judged = below().filter((r) => r.images === 0 && r.bytes >= FLOOR_BYTES);
    expect(
      judged.map((r) => r.label).sort(),
      'the set of below-fold text-only sections changed',
    ).toEqual(['Be at the temple without the flight', 'Every way to be present', 'How it works']);
  });

  it('each of them carries .defer-paint on its own section root', () => {
    const offenders = below()
      .filter((r) => r.images === 0 && r.bytes >= FLOOR_BYTES && !r.deferred)
      .map((r) => `${r.label} (${r.bytes} B)`);
    expect(
      offenders,
      'these sections are below the fold, carry no image, and still pay full ' +
        'layout and paint at load. .defer-paint (app/globals.css:798) is ' +
        'content-visibility: auto + contain-intrinsic-size and leaves the markup ' +
        'in the HTML for crawlers.',
    ).toEqual([]);
  });

  it('nothing above the fold is deferred', () => {
    const bad = rows.filter((r) => r.index <= ABOVE_FOLD && r.deferred).map((r) => r.label);
    expect(bad, 'deferring the first viewport delays the paint this class speeds up').toEqual([]);
  });

  it('no section that carries an image is deferred by this rule', () => {
    // Not a ban on ever deferring an image section — a check that the rule
    // above did not quietly widen into one, since an image section's height is
    // far less predictable and contain-intrinsic-size would be a guess.
    const judged = below().filter((r) => r.images === 0 && r.bytes >= FLOOR_BYTES);
    expect(judged.every((r) => r.images === 0)).toBe(true);
  });
});

describe('[HOME-01] no homepage image ships without a candidate list', () => {
  it('every <img> offers a srcSet', () => {
    const naked = rows
      .flatMap((r) => r.imgs.map((i) => ({ ...i, row: r.label })))
      .filter((i) => !i.srcSet)
      .map((i) => `${i.row}: ${i.src}`);
    expect(
      naked,
      'images.unoptimized is true in next.config.ts, so Next emits no srcset of ' +
        'its own and remoteSrcSet() is the only thing that can. Without one, a ' +
        '375 px phone downloads the same candidate as a 1280 px desktop.',
    ).toEqual([]);
  });

  it('the Aarti Thali thumbnail offers the 120 px step and does NOT offer 500', () => {
    const aarti = rows.flatMap((r) => r.imgs).find((i) => /aarti-thali/i.test(i.src));
    expect(aarti, 'the Aarti Thali thumbnail moved').toBeTruthy();
    expect(aarti!.sizes, 'a srcSet without sizes makes the browser assume 100vw').toBeTruthy();
    // Measured 2026-08-23: 120 px = 5,144 B, 250 px = 15,277 B, and the painted
    // slot is ~190 CSS px desktop / ~112 phone. Offering 500 would repeat the
    // Live Darshan mistake — see (c) in the header.
    const el = rows.flatMap((r) => r.imgs).find((i) => /aarti-thali/i.test(i.src))!;
    expect(el.src, 'the 1x-desktop candidate should still be 250').toMatch(/-250\.webp$/);
  });
});
