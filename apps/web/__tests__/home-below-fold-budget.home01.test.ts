/**
 * [HOME-01] The homepage's below-fold weight cannot silently grow back.
 *
 * The original finding measured 13,886 KB of below-fold images on /. That
 * premise is dead: the PERF-01 image pipeline (lib/images.ts remoteImage +
 * wikiThumb) cut it to 777.0 KB, and every below-fold <img> is already
 * loading="lazy". So the finding's proposed remedy — a next/dynamic +
 * IntersectionObserver deferral programme — is NOT the right work, and this
 * file deliberately does not assert for it.
 *
 * What IS still true, and what this guards:
 *
 *  (a) The single largest image on the page is the Live Darshan tile. It is a
 *      block-level aspect-[16/9] fill inside .container-wide (72rem box, 2rem
 *      gutters >=1024px => ~1088 CSS px painted), so 960px is already a slight
 *      upscale and dropping to 500px would be a 2.18x upscale — visibly soft.
 *      The right fix is a srcSet so a 375px phone pulls the 500px / 56,754 B
 *      candidate instead of the 960px / 189,024 B one, with desktop unchanged.
 *      Measured mobile saving: 132,270 B.
 *
 *  (b) 26 top-level sections and ~110 KB of below-fold markup. Nothing stopped
 *      that growing, because HOME-01 shipped a measurement and no guard at all.
 *
 * NOTE ON WHAT IS MEASURED. (b) is asserted against the SOURCE of the homepage
 * composition, not against a build artifact: .next/server/app/index.html only
 * exists after a build and would make this suite depend on build order. The
 * section count is the stable proxy — markup grows by sections being added.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);

function code(rel: string): string {
  return readFileSync(root(rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const page = code('app/page.tsx');

describe('[HOME-01] the largest homepage image serves a phone-sized candidate', () => {
  it('the Live Darshan tile is still the image being guarded', () => {
    // If this ever stops matching, the assertions below would silently measure
    // nothing — so the anchor is asserted, not assumed.
    expect(page, "the Live Darshan tile's source moved").toMatch(
      /getTempleHero\('mahakaleshwar'/,
    );
  });

  it('declares a srcSet so a 375px phone does not download the 960px candidate', () => {
    // The <img> block for the Live Darshan tile.
    const block = /<img[^>]*getTempleHero\('mahakaleshwar'[\s\S]{0,700}?\/>/.exec(page)?.[0];
    expect(block, 'could not isolate the Live Darshan <img>').toBeTruthy();
    expect(
      block!,
      'no srcSet: every viewport downloads the 960px / 189,024 B candidate, including ' +
        'a 375px phone that paints it at 375 CSS px. images.unoptimized is true in ' +
        'next.config.ts, so Next emits no srcset of its own — remoteSrcSet() is the ' +
        'only thing that can.',
    ).toMatch(/srcSet=/);
    expect(block!, 'the srcSet must include a phone-sized candidate').toMatch(
      /remoteSrcSet\([\s\S]*?IMG_W\.CARD/,
    );
  });

  it('declares the painted desktop slot honestly in `sizes`', () => {
    const block = /<img[^>]*getTempleHero\('mahakaleshwar'[\s\S]{0,700}?\/>/.exec(page)?.[0]!;
    // .container-wide is 72rem with 2rem gutters at >=1024px => ~1088 CSS px.
    // Declaring 960px understates the slot and makes the browser pick a
    // candidate one step too small on a 2x screen.
    expect(block, '`sizes` still claims a 960px desktop slot').not.toMatch(/,\s*960px"/);
    expect(block).toMatch(/sizes="[^"]*1088px"/);
  });

  it('does NOT downgrade the source width to CARD (the triage doc advises wrongly)', () => {
    // docs/audit/triage-2026-08-15.md:147 recommends IMG_W.WIDE -> IMG_W.CARD
    // here. That is a 2.18x upscale in a ~1088px slot. The srcSet above gets
    // the mobile saving without the desktop quality loss.
    expect(page).toMatch(/getTempleHero\('mahakaleshwar', IMG_W\.WIDE\)/);
  });
});

describe('[HOME-01] the homepage cannot silently grow more below-fold sections', () => {
  /** Top-level <section> openings in the homepage composition. */
  const sections = (page.match(/<section[\s>]/g) ?? []).length;

  it('counts real sections (the ratchet is measuring something)', () => {
    // Floor lowered 5 -> 3 alongside the 14 -> 4 ratchet below. This canary
    // exists so a regex that silently stops matching cannot be mistaken for a
    // page that got smaller; 3 keeps it doing that job at the new size.
    expect(sections).toBeGreaterThan(3);
  });

  it('holds the section count at or below its measured baseline', () => {
    // Measured 2026-08-19 against the same tree the 124,211 B <main> was
    // measured from. RATCHET: lower it when sections are removed; never raise
    // it without re-measuring the below-fold byte total.
    //
    // 2026-08-20: this read `const BASELINE = sections`, which compares a value
    // to itself — it passed at any section count and had never been capable of
    // failing. The number below is the count measured on 2026-08-20 (14 <section>
    // openings in app/page.tsx after comment stripping), written down so the
    // ratchet has something outside itself to hold against.
    // 2026-08-23 homepage revamp: RATCHET LOWERED 14 -> 4.
    //
    // Ten <section> blocks were deleted from app/page.tsx, not moved. Listing
    // them because "the ratchet went down" is only trustworthy if the deletions
    // are auditable:
    //
    //   category colour strip   the header already carries the same 5 mega-menus
    //   quick actions           6 equal choices directly under a single-CTA hero
    //   trust strip (4 cards)   2 of the 4 claims were contradicted by the code
    //   what we offer           duplicated the category strip one screen above
    //   AI Pandit mockup        not a revenue line
    //   Bhakti Store showcase   every store checkout 400s (non-UUID product ids)
    //   more features row       feature inventory, not an offer
    //   final CTA               a second filled primary competing with the hero
    //   library teaser          WisdomStrip already routes to the library
    //   yatra teaser            yatra is a lead form; no gateway loads in it
    //
    // Two sections were ADDED as components (ThisWeek, WhatYouGet), so they sit
    // outside this regex — see the denominator note below.
    const BASELINE = 4;
    expect(
      sections,
      `app/page.tsx grew past ${BASELINE} <section> openings. ` +
        'NOTE THE DENOMINATOR: this regex reads app/page.tsx ONLY, so a section ' +
        'moved into components/home/ is invisible to it. Moving a section into a ' +
        'component to get under this number buys ratchet headroom without ' +
        'removing anything real — do not do that. Below-fold markup was 109,855 B ' +
        'and below-fold images 777.0 KB when this stood at 14.',
    ).toBeLessThanOrEqual(BASELINE);
  });
});

describe('[HOME-01] below-fold text-only sections skip render work', () => {
  const strips = ['components/home/ShopStrip.tsx', 'components/home/WisdomStrip.tsx', 'components/home/ConsultStrip.tsx'];

  it('.defer-paint exists and actually sets content-visibility', () => {
    const css = readFileSync(root('app/globals.css'), 'utf8');
    const rule = /\.defer-paint\s*\{([^}]*)\}/.exec(css)?.[1];
    expect(rule, '.defer-paint is not declared in globals.css').toBeTruthy();
    expect(rule!, 'without content-visibility the class is decoration').toMatch(
      /content-visibility:\s*auto/,
    );
    // Without an intrinsic size the scrollbar jumps as sections resolve.
    expect(rule!, 'contain-intrinsic-size missing — deferred sections cause scroll jump').toMatch(
      /contain-intrinsic-size:/,
    );
  });

  for (const rel of strips) {
    it(`${rel} carries .defer-paint on its section root`, () => {
      expect(code(rel), `${rel} still paints on first load though it is text-only and below fold`)
        .toMatch(/className="[^"]*\bdefer-paint\b/);
    });
  }

  it('nothing above the fold is deferred', () => {
    // The hero and the intent trio are the first viewport. Deferring either
    // would delay the paint this class exists to speed up.
    for (const rel of ['components/home/HeroCopyVariant.tsx', 'components/home/IntentTrio.tsx']) {
      try {
        expect(code(rel), `${rel} is above the fold and must not be deferred`).not.toMatch(
          /defer-paint/,
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * [HOME-01] SECOND PASS, 2026-08-20 — measured candidate selection.
 *
 * The first pass measured TOTALS (777 KB below the fold). A total cannot tell
 * you whether a change helped, because once `srcSet` exists the bytes a visitor
 * pays depend on which CANDIDATE their device picks — viewport x DPR resolved
 * against `sizes`. Re-measured per candidate, over the wire, 2026-08-20 (HEAD
 * requests to Commons/Unsplash; prod itself is 503 on a Render billing
 * suspension, so the live document could not be re-fetched):
 *
 *   Mahakaleshwar (Live Darshan tile)     500px  56,754 B
 *                                         960px 189,024 B
 *                                        1280px 322,706 B
 *   Golden Temple (hero bento)            250px  16,790 B
 *                                         330px  28,510 B
 *                                         500px  61,099 B
 *   Jagannath / Kashi / Somnath (Worship) 330px  27,304 / 27,426 / 27,364 B
 *                                         500px  60,931 / 52,125 / 57,283 B
 *   Bangalore Shiva (puja bento)          250px  17,262 B
 *                                         330px  27,483 B
 *                                         500px  55,881 B
 *
 * Reproduce: one HEAD request per URL, where each URL is built by importing
 * lib/images.ts and calling the same getter at the same width the page calls.
 * ═════════════════════════════════════════════════════════════════════════ */

/** The `<img …/>` block whose src is built from the getter matching `needle`. */
function imgFor(src: string, needle: RegExp): string {
  const blocks = src.match(/<img[\s\S]{0,900}?\/>/g) ?? [];
  const hit = blocks.find((b) => needle.test(b));
  expect(hit, 'no <img> block matching ' + String(needle)).toBeTruthy();
  return hit!;
}

describe('[HOME-01] no homepage image offers a candidate wider than its slot', () => {
  it('the Live Darshan srcSet stops at WIDE — the HERO candidate costs more than no srcSet at all', () => {
    const block = imgFor(page, /getTempleHero\('mahakaleshwar'/);
    const widths = /remoteSrcSet\([\s\S]*?\[([\s\S]*?)\]/.exec(block)?.[1] ?? '';
    expect(widths, 'the srcSet candidate list moved').toMatch(/IMG_W\.CARD/);
    expect(
      widths,
      'IMG_W.HERO (1280) is offered against sizes="…1088px". A 1x desktop needs ' +
        '1088 CSS px and therefore picks 1280 / 322,706 B; a 2.625x phone ' +
        '(Pixel 7, 412 CSS px) needs 1081 and picks it too — the crossover is ' +
        'DPR 2.56 at 375 CSS px, 2.46 at 390 and 2.33 at 412, so every DPR-3 ' +
        'handset is over it. Before any srcSet existed all of them took the ' +
        '960 / 189,024 B src. Offering 1280 therefore ADDS 133,682 B on desktop ' +
        'and on the densest half of the phone fleet, to buy back a 1.13x upscale ' +
        'on the image already furthest below the fold. Ship ' +
        '[CARD, WIDE]: the 1x-phone win (56,754 B) survives and nothing regresses.',
    ).not.toMatch(/IMG_W\.HERO/);
  });
});

describe('[HOME-01] the hero bento does not preload a phone-invisible image', () => {
  /*
   * PROVEN FROM THE BUILD, not inferred. .next/server/app/index.html (build
   * lshYpavE8I7iFJwQgyMlS) carries exactly one image preload in <head>:
   *
   *   <link rel="preload" as="image" href="…/500px-The_Golden_Temple_of_Amrithsar_7.jpg"/>
   *
   * no `imagesrcset`, no `imagesizes`, no `media`. next/image emits it for any
   * `priority` image (node_modules/next/dist/client/image-component.js:220,
   * ReactDOM.preload). The <img> it points at lives inside
   * `<ParallaxLayer className="hidden md:block">`, so on every phone the browser
   * fetches 61,099 B at the highest priority there is, into a box that is
   * display:none and never painted.
   *
   * PERF-02 already banned exactly this shape in app/layout.tsx — "fetchPriority
   * =high on a resource the route may not paint actively steals a connection".
   * The same rule has to hold one level down.
   */
  it('does not route the bento image through next/image `priority`', () => {
    expect(
      page,
      'a `priority` next/image emits <link rel=preload as=image> with no media ' +
        'query, so a phone pays 61,099 B for a `hidden md:block` box.',
    ).not.toMatch(/\bpriority\b/);
  });

  it('names a phone-sized slot in `sizes`, so the phone fetch is the 250px candidate', () => {
    const block = imgFor(page, /getTempleHero\('golden-temple'/);
    expect(block, 'no srcSet: the phone has no smaller candidate to choose').toMatch(
      /srcSet=\{remoteSrcSet\(/,
    );
    expect(
      block,
      '`sizes` still claims 100vw below md. The box is display:none there, so the ' +
        'honest declared width is ~0 and the browser should take the 250px / ' +
        '16,790 B candidate instead of the 500px / 61,099 B one — 44,309 B per ' +
        'phone visit. Desktop is untouched: every slot >= 464 CSS px still ' +
        'resolves to the 500px candidate.',
    ).not.toMatch(/sizes="\(max-width: 768px\) 100vw/);
    expect(block).toMatch(/sizes="\(max-width: 767px\) 1px/);
  });
});

describe('[HOME-01] no homepage <img> declares an inert `sizes`', () => {
  /*
   * `sizes` without `srcSet` is ignored outright — there are no candidates to
   * choose between, so every device downloads `src`. Seven of the fifteen <img>
   * tags in .next/server/app/index.html were in that state: four in
   * WorshipStrip and three in YatraStrip, each carrying a carefully written
   * `sizes` that has never once changed a byte.
   *
   * Measured consequence for WorshipStrip, whose real lg slot is
   * (1152 - 64 padding - 48 gaps) / 4 = 260 CSS px: a 1x desktop should take the
   * 330px candidates (27,304 + 27,426 + 27,364 B) and instead takes the 500px
   * ones (60,931 + 52,125 + 57,283 B) — 88,245 B over three unique files
   * (Kashi Vishwanath is requested twice and paid for once).
   *
   * YatraStrip is bound by the RULE but wins nothing: its slot is
   * (1088 - 32) / 3 = 352 CSS px and the Commons ladder jumps 330 -> 500, so
   * every device still resolves to 500. Fixed for correctness, credited zero.
   */
  const FILES = [
    'app/page.tsx',
    'components/home/WorshipStrip.tsx',
    'components/home/YatraStrip.tsx',
  ];

  function inertSizes(src: string): string[] {
    return (src.match(/<img[\s\S]{0,900}?\/>/g) ?? [])
      .filter((b) => /\bsizes=/.test(b) && !/\bsrcSet=/.test(b))
      .map((b) => /\bsizes="([^"]*)"/.exec(b)?.[1] ?? b.slice(0, 60));
  }

  /** The same de-commenting `code()` applies, exposed so it can be exercised. */
  const strip = (s: string): string =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('the scan can still see an offender (0 is not vacuous)', () => {
    expect(inertSizes('<img src={x} sizes="100vw" width={1} height={1} />')).toEqual(['100vw']);
    expect(inertSizes('<img src={x} srcSet={y} sizes="100vw" width={1} height={1} />')).toEqual([]);
  });

  it('a commented-out offender is not an offender', () => {
    // Six times in this repo a source scan has flagged the comment that
    // documents the rule. Every caller below passes de-commented source.
    expect(inertSizes(strip('{/* <img src={x} sizes="100vw" /> */}'))).toEqual([]);
    expect(inertSizes(strip('/* <img src={x} sizes="100vw" /> */'))).toEqual([]);
  });

  for (const rel of FILES) {
    it(rel + ' pairs every `sizes` with a `srcSet`', () => {
      expect(
        inertSizes(code(rel)),
        'these <img> tags declare `sizes` and no `srcSet`. The browser ignores ' +
          '`sizes` when there is nothing to choose between, so the declared slot ' +
          'is decoration and every device downloads `src`.',
      ).toEqual([]);
    });
  }
});

describe('[HOME-01] the deepest text-only sections skip render work too', () => {
  /*
   * The triage recommended content-visibility for "rows 6-10" of the ranked
   * list. Rows 6-8 (ShopStrip, WisdomStrip, ConsultStrip) shipped; the rows that
   * live inline in app/page.tsx did not. These two carry no image, no sticky
   * child and no above-fold content, and sit six or more screens down.
   *
   * This buys ZERO transfer bytes — it is render work, and the ranked
   * deliverable lists it as such rather than counting it as a byte saving.
   */
  /*
   * 2026-08-23 homepage revamp: both of these were DELETED rather than kept and
   * deferred, so there is no .defer-paint left to assert.
   *
   *   'Discover the Library'  WisdomStrip, four sections earlier, already routes
   *                           into the same library. Two teasers, one destination.
   *   'Pilgrimage circuits'   yatra has no Prisma model at all; bookings go to a
   *                           raw table via $executeRawUnsafe and no payment
   *                           gateway loads anywhere in the flow. It was also the
   *                           heaviest image payload on the page at ~217 KB.
   *
   * Kept as deletion guards rather than removed outright: content-visibility
   * bought ZERO transfer bytes on either (both are image-free, which is why they
   * ranked 9th and 10th and not 1st). Re-adding one "because it is deferred
   * anyway" would put the render work AND the markup back for nothing.
   */
  const DELETED = ['Discover the Library', 'Pilgrimage circuits'];

  for (const label of DELETED) {
    it('the "' + label + '" section stays deleted', () => {
      expect(
        page.indexOf('aria-label="' + label + '"'),
        label + ' is back on the homepage. It was removed in the 2026-08-23 revamp; ' +
          'see the comment above for why. If it is genuinely wanted again, re-measure ' +
          'the below-fold budget and raise the section ratchet deliberately.',
      ).toBe(-1);
    });
  }
});

describe('[HOME-01] the srcSet survives the render, not just the source scan', () => {
  /*
   * A source scan proves the prop is written. It does not prove the attribute
   * reaches the DOM: remoteSrcSet returns undefined for any host it cannot
   * resize, and React then omits the attribute entirely and leaves `sizes`
   * inert exactly as before. These render the two strips and read the markup.
   *
   * Every candidate URL below was HEAD-requested on 2026-08-20 and answered 200
   * with the byte counts quoted in the comments above.
   */
  it('WorshipStrip emits a 3-candidate srcset on every card', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const React = (await import('react')).default;
    const { default: WorshipStrip } = await import('../components/home/WorshipStrip');
    const html = renderToStaticMarkup(
      React.createElement(WorshipStrip as never, { liveDarshanTemples: 17 }),
    );
    const srcsets = html.match(/srcSet="[^"]*"|srcset="[^"]*"/g) ?? [];
    expect(srcsets.length, 'no srcset attribute reached the DOM').toBe(4);
    for (const s of srcsets) {
      expect(s, 'a candidate list collapsed to one entry').toMatch(/250w[\s\S]*330w[\s\S]*500w/);
    }
  });

  it('YatraStrip does too', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const React = (await import('react')).default;
    const { default: YatraStrip } = await import('../components/home/YatraStrip');
    const html = renderToStaticMarkup(React.createElement(YatraStrip as never));
    const srcsets = html.match(/srcSet="[^"]*"|srcset="[^"]*"/g) ?? [];
    expect(srcsets.length).toBe(3);
    for (const s of srcsets) expect(s).toMatch(/250w[\s\S]*330w[\s\S]*500w/);
  });
});
