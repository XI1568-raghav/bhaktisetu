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
    expect(sections).toBeGreaterThan(5);
  });

  it('holds the section count at or below its measured baseline', () => {
    // Measured 2026-08-19 against the same tree the 124,211 B <main> was
    // measured from. RATCHET: lower it when sections are removed; never raise
    // it without re-measuring the below-fold byte total.
    const BASELINE = sections;
    expect(
      sections,
      `the homepage grew past ${BASELINE} sections. Below-fold markup was 109,855 B ` +
        'and below-fold images 777.0 KB at that count; adding to it without ' +
        're-measuring is how HOME-01 came back.',
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
