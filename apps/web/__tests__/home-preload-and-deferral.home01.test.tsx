/**
 * [HOME-01] Second deliverable, 2026-08-21 — what a phone actually pays AT LOAD,
 * and the two rows of the ranked deferral list that were never deferred.
 *
 * METHOD (production is 503 on a Render billing suspension, so nothing here is
 * measured against the live document):
 *
 *   markup  — `app/page.tsx` is rendered with `renderToStaticMarkup`, the two
 *             data calls stubbed, and the result parsed. Byte counts are the
 *             `outerHTML` length of each top-level child of the page wrapper.
 *             Re-measured 2026-08-21: 125,418 B total, 122,315 B across 26
 *             top-level children — the same 26 the 2026-08-15 triage counted on
 *             the live document, where it measured 121,470 B.
 *   images  — one HTTP HEAD per candidate URL against Commons/Unsplash (they
 *             are third-party hosts, not our suspended origin), the URL built
 *             by calling the same getter at the same width the page calls.
 *             Numbers quoted below were read on 2026-08-21.
 *
 * MEASURED IMAGE BYTES PER SECTION, ranked (below-fold only; every one of these
 * <img> is loading="lazy", so these are scroll-time bytes, not load-time):
 *
 *   1  YatraStrip "Pilgrimage with peace of mind"      228,608 B   7,864 B markup
 *        Kedarnath 99,511 · Tirumala 69,985 · Vaishno Devi 59,112 (all 500px)
 *   2  WorshipStrip "Watch the divine…"                222,464 B  14,105 B
 *        Jagannath 60,931 · Somnath 57,283 · Kashi 52,125 x2 (500px)
 *   3  Live Darshan "See the divine, from anywhere"    189,024 B   2,983 B
 *   4  Store strip "Everything for daily worship"       92,694 B   4,891 B
 *   5  Puja bento "Authentic rituals, verified priests" 71,158 B   9,818 B
 *   6  ShopStrip        0 B   7,609 B   already .defer-paint
 *   7  WisdomStrip      0 B   7,449 B   already .defer-paint
 *   8  ConsultStrip     0 B   6,828 B   already .defer-paint
 *   9  "What Darshya offers"   0 B   6,530 B   <- deferred by this change
 *  10  "Quick actions"         0 B   5,099 B   <- deferred by this change
 *
 * AT LOAD, a phone pays exactly ONE image, and it is not on that list. Every
 * <img> below the fold is lazy; the only eager one is the hero bento, and React
 * 19 emits a `<link rel="preload" as="image">` for it. That preload is the
 * subject of the first block below.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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
// Async server components: they suspend under renderToStaticMarkup (which is
// synchronous and cannot await a nested async component) and neither is what
// any assertion here is about. Stubbed to marker elements.
//
// 2026-08-23: NextFestivalStrip was replaced on the homepage by ThisWeek, which
// is async for the same reason — it resolves festival CTAs against the live
// catalogue instead of writing pujasAvailable[0] into an href. The stub moved
// with it. NextFestivalStrip's own mock is kept because the component file
// still exists and other suites render it directly.
vi.mock('../components/home/NextFestivalStrip', () => ({
  default: () => React.createElement('div', { 'data-stub': 'NextFestivalStrip' }),
}));
vi.mock('../components/home/ThisWeek', () => ({
  default: () => React.createElement('div', { 'data-stub': 'ThisWeek' }),
}));

const WEB_ROOT = path.resolve(__dirname, '..');

/** Source with block, JSX and line comments removed. */
function code(rel: string): string {
  return readFileSync(path.join(WEB_ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

let cachedHtml: string | undefined;
async function homeHtml(): Promise<string> {
  if (cachedHtml) return cachedHtml;
  const { default: HomePage } = await import('../app/page');
  const el = await (HomePage as unknown as () => Promise<React.ReactElement>)();
  cachedHtml = renderToStaticMarkup(el);
  return cachedHtml;
}

async function homeDoc(): Promise<HTMLElement> {
  const host = document.createElement('div');
  host.innerHTML = await homeHtml();
  return host;
}

/* ── candidate resolution ─────────────────────────────────────────────────
 * The browser multiplies the CSS px slot from `sizes` by the device pixel
 * ratio and takes the NARROWEST candidate that is still >= that number, or the
 * widest candidate when none is. Reimplemented here because the whole point of
 * a srcSet is which candidate gets picked, and a source scan cannot tell you.
 */
function parseSrcSet(attr: string): { url: string; w: number }[] {
  return attr
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [url, d] = p.split(/\s+/);
      return { url: url!, w: Number((d ?? '').replace(/w$/, '')) };
    })
    .sort((a, b) => a.w - b.w);
}

function pick(srcset: string, slotCssPx: number, dpr: number): number {
  const cands = parseSrcSet(srcset);
  const need = slotCssPx * dpr;
  return (cands.find((c) => c.w >= need) ?? cands[cands.length - 1]!).w;
}

describe('[HOME-01] the only image a phone fetches at load is the cheapest candidate', () => {
  /*
   * React 19 emits `<link rel="preload" as="image">` for the first non-lazy
   * <img> it renders, copying `srcSet` and `sizes` onto it as `imagesrcset` /
   * `imagesizes`. It cannot be given a `media`, so the preload fires on every
   * viewport — including the ones where the box it points at is
   * `hidden md:block`, i.e. display:none and never painted.
   *
   * Measured over the wire 2026-08-21, The_Golden_Temple_of_Amrithsar_7.jpg:
   *   120px  4,543 B      250px  16,790 B      330px  28,510 B      500px  61,099 B
   */
  it('React really does emit exactly one image preload, and it is the bento', async () => {
    const doc = await homeDoc();
    const links = [...doc.querySelectorAll('link[rel="preload"]')].filter(
      (l) => (l.getAttribute('as') ?? '') === 'image',
    );
    expect(links.length, 'the preload this block is about has moved or multiplied').toBe(1);
    const ss = links[0]!.getAttribute('imagesrcset') ?? links[0]!.getAttribute('imageSrcSet');
    expect(ss, 'the preload carries no candidate list, so `imagesizes` is inert').toBeTruthy();
    expect(ss!).toContain('The_Golden_Temple_of_Amrithsar_7.jpg');
  });

  it('the phone branch of `sizes` resolves to the 120px / 4,543 B candidate', async () => {
    const doc = await homeDoc();
    const link = doc.querySelector('link[rel="preload"][as="image"]')!;
    const ss = (link.getAttribute('imagesrcset') ?? link.getAttribute('imageSrcSet'))!;
    const sizes = (link.getAttribute('imagesizes') ?? link.getAttribute('imageSizes'))!;

    expect(sizes, 'the 1px phone branch is what makes the small candidate reachable').toContain(
      '(max-width: 767px) 1px',
    );
    // 1 CSS px x any DPR still needs < 120, so every phone takes the smallest.
    for (const dpr of [1, 2, 2.625, 3]) {
      expect(
        pick(ss, 1, dpr),
        `at DPR ${dpr} the phone preload should resolve to 120px (4,543 B). ` +
          'Without a 120 candidate it resolves to 250px (16,790 B) — 12,247 B ' +
          'fetched at preload priority into a `hidden md:block` box that is ' +
          'display:none below 768px and never painted. Every other <img> on ' +
          'this page is loading="lazy", so that is the whole of a phone visit\'s ' +
          'at-load image budget.',
      ).toBe(120);
    }
  });

  it('no desktop viewport can select the small candidates', async () => {
    const doc = await homeDoc();
    const link = doc.querySelector('link[rel="preload"][as="image"]')!;
    const ss = (link.getAttribute('imagesrcset') ?? link.getAttribute('imageSrcSet'))!;
    // The box appears at >=768px, where the slot is (100vw - 6rem) / 2.
    for (const [vw, dpr] of [
      [768, 1],
      [1024, 1],
      [1216, 1],
      [1440, 2],
    ] as const) {
      const slot = vw >= 1216 ? 528 : (vw - 96) / 2;
      expect(
        pick(ss, slot, dpr),
        `a ${vw}px viewport at DPR ${dpr} paints a ${slot} CSS px box; adding ` +
          'cheap candidates must not soften it',
      ).toBe(500);
    }
  });

  it('nothing else on the page is eager, so the preload is the whole at-load budget', async () => {
    const doc = await homeDoc();
    const eager = [...doc.querySelectorAll('img')].filter(
      (im) => (im.getAttribute('loading') ?? '') !== 'lazy',
    );
    expect(
      eager.map((im) => im.getAttribute('src')),
      'a second eager <img> changes what a phone pays at load and invalidates ' +
        'the budget claim above — re-measure before raising this.',
    ).toHaveLength(1);
  });
});

describe('[HOME-01] rows 9 and 10 of the ranked deferral list are deferred', () => {
  /*
   * docs/audit/triage-2026-08-15.md ranks ten below-fold sections and
   * recommends `content-visibility: auto` for rows 6-10, "which are text-only".
   * Rows 6-8 (ShopStrip / WisdomStrip / ConsultStrip) shipped in an earlier
   * pass. Rows 9 and 10 did not, and nothing recorded that they hadn't.
   *
   * Both are image-free, so this buys ZERO transfer bytes. It is layout and
   * paint work, and it is listed as such rather than counted as a saving.
   */
  /*
   * 2026-08-23 homepage revamp: BOTH rows on this list were DELETED rather
   * than deferred, so there is nothing left here to assert.
   *
   *   'What Darshya offers' (6,530 B, 8 inline svg) duplicated the category
   *   colour strip that sat directly above it — the same five destinations,
   *   twice, one screen apart.
   *
   *   'Quick actions' (5,099 B, 6 inline svg) put six equal-weight choices
   *   immediately below a hero whose whole job is to narrow to one.
   *
   * content-visibility bought zero transfer bytes on either (both are
   * image-free, which is why they were rows 9 and 10 rather than rows 1 and 2).
   * Deleting them buys the render work AND the markup. The guard is kept as an
   * empty list rather than removed so that re-adding either section without
   * reading this comment fails the "no section may reappear" check below.
   */
  const ROWS: [label: string, bytes: number, svgs: number][] = [];

  const DELETED = ['What Darshya offers', 'Quick actions'];

  for (const label of DELETED) {
    it(`"${label}" stays deleted rather than coming back undeferred`, async () => {
      const doc = await homeDoc();
      expect(
        doc.querySelector(`section[aria-label="${label}"]`),
        `${label} is back on the homepage. It was removed in the 2026-08-23 revamp ` +
          '(duplicate destinations / six equal choices under a single-CTA hero). ' +
          'If it is genuinely wanted again, re-measure the below-fold budget first ' +
          'and move it back into ROWS above with .defer-paint.',
      ).toBeNull();
    });
  }

  for (const [label, bytes, svgs] of ROWS) {
    it(`"${label}" (${bytes} B, ${svgs} inline svg) carries .defer-paint`, async () => {
      const doc = await homeDoc();
      const sec = doc.querySelector(`section[aria-label="${label}"]`);
      expect(sec, `no <section aria-label="${label}"> in the rendered page`).toBeTruthy();
      expect(
        sec!.getAttribute('class') ?? '',
        `${label} still lays out and paints on first load though it is text-only ` +
          'and below the fold',
      ).toMatch(/\bdefer-paint\b/);
      expect(sec!.querySelectorAll('img').length, 'a deferred row must stay image-free').toBe(0);
    });
  }

  it('.defer-paint is still a real rule with an intrinsic size', () => {
    // Deferring without contain-intrinsic-size makes the scrollbar jump as
    // sections resolve, which is the one way this change could cost anything.
    const css = readFileSync(path.join(WEB_ROOT, 'app/globals.css'), 'utf8');
    const rule = /\.defer-paint\s*\{([^}]*)\}/.exec(css)?.[1];
    expect(rule, '.defer-paint is not declared').toBeTruthy();
    expect(rule!).toMatch(/content-visibility:\s*auto/);
    expect(rule!).toMatch(/contain-intrinsic-size:/);
  });

  it('the hero and the first-viewport sections are still not deferred', async () => {
    const doc = await homeDoc();
    const wrapper = doc.querySelector('[data-scroll-progress]')!.nextElementSibling!;
    const first = [...wrapper.children].slice(0, 2);
    for (const c of first) {
      expect(
        c.getAttribute('class') ?? '',
        'deferring the first viewport would delay the paint this class exists to speed up',
      ).not.toMatch(/\bdefer-paint\b/);
    }
  });
});

describe('[HOME-01] correction — the Live Darshan tile is NOT cheaper on a real phone', () => {
  /*
   * The 2026-08-19/20 pass recorded "Measured mobile saving: 132,270 B" for the
   * srcSet it added to this tile. That figure only holds at DPR 1.
   *
   * `sizes="(max-width: 768px) 100vw, 1088px"` with candidates 500w and 960w
   * (measured 2026-08-21: 500px = 56,754 B, 960px = 189,024 B). A 375 CSS px
   * phone at DPR 2 needs 750 and takes 960; a 390 px iPhone at DPR 3 needs
   * 1,170 and takes 960; a 412 px Pixel 7 at DPR 2.625 needs 1,081 and takes
   * 960. Only DPR 1 lands on the 500px candidate. So the saving is real for
   * DPR-1 clients and 0 B for essentially the whole modern handset fleet.
   *
   * THIS IS NOT A DEFECT TO FIX, and the assertions below deliberately pin the
   * current behaviour rather than demanding a smaller candidate. The Commons
   * ladder steps 500 -> 960 with nothing between, and the honest slot for a
   * 375 px 16:9 box at DPR 2-3 is 750-1,125 device px: 960 is the correct
   * choice. Under-declaring `sizes` to force the 500 candidate would paint a
   * 500 px image into a 1,125 device-px box. The tile is also below the fold
   * and lazy, so these are scroll-time bytes, not load-time ones.
   *
   * What this block prevents is the number being re-quoted as a load-time win.
   */
  it('a DPR-1 client takes the 500px / 56,754 B candidate', async () => {
    const doc = await homeDoc();
    const img = [...doc.querySelectorAll('img')].find((im) =>
      (im.getAttribute('src') ?? '').includes('Mahakaleshwar'),
    );
    expect(img, 'the Live Darshan tile moved').toBeTruthy();
    const ss = (img!.getAttribute('srcset') ?? img!.getAttribute('srcSet'))!;
    expect(ss, 'no srcset reached the DOM').toBeTruthy();
    expect(pick(ss, 375, 1)).toBe(500);
  });

  it('a DPR-2/2.625/3 phone still takes the 960px / 189,024 B candidate', async () => {
    const doc = await homeDoc();
    const img = [...doc.querySelectorAll('img')].find((im) =>
      (im.getAttribute('src') ?? '').includes('Mahakaleshwar'),
    )!;
    const ss = (img.getAttribute('srcset') ?? img.getAttribute('srcSet'))!;
    for (const [css, dpr] of [
      [375, 2],
      [390, 3],
      [412, 2.625],
    ] as const) {
      expect(
        pick(ss, css, dpr),
        `${css} CSS px at DPR ${dpr} needs ${Math.round(css * dpr)} device px`,
      ).toBe(960);
    }
  });

  it('the tile is below the fold and lazy, so those are scroll bytes', async () => {
    const doc = await homeDoc();
    const img = [...doc.querySelectorAll('img')].find((im) =>
      (im.getAttribute('src') ?? '').includes('Mahakaleshwar'),
    )!;
    expect(img.getAttribute('loading')).toBe('lazy');
  });
});

describe('[HOME-01] the candidate resolver is not vacuous', () => {
  it('picks the narrowest candidate that covers the requirement', () => {
    const ss = 'a 120w, b 250w, c 500w, d 960w';
    expect(pick(ss, 1, 3)).toBe(120);
    expect(pick(ss, 200, 1)).toBe(250);
    expect(pick(ss, 336, 1)).toBe(500);
    expect(pick(ss, 375, 2)).toBe(960);
    // Nothing wide enough: fall back to the widest, as browsers do.
    expect(pick(ss, 2000, 2)).toBe(960);
  });

  it('the comment-stripping source reader drops a quoted rule', () => {
    // Seven times in this sweep a source scan has matched the prose that
    // documents a rule. Nothing in this file scans raw source, but `code()` is
    // exercised so it cannot rot into a pass-through.
    expect(code('app/page.tsx')).not.toContain('ranked deferral list');
  });
});
