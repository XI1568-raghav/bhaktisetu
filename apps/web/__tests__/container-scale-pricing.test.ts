/**
 * DU-14 — the page container width changes route to route.
 *
 * __tests__/container-scale.test.ts declares the two widths in globals.css and
 * locks the FOUR routes an earlier wave migrated (/, /pujas, /temples, /store).
 * That file is deliberately left alone here; this one extends the finding by
 * one more route and puts a ratchet under the rest.
 *
 * /pricing was named in the finding as a route that disagreed with ITSELF: six
 * page shells across four widths (4xl hero, 5xl devotee cards, 6xl provider
 * cards, 5xl commission table, 3xl FAQ, 3xl bottom CTA), so the content edge
 * moved five times while scrolling one page.
 *
 * HOW THE TWO WIDTHS WERE CHOSEN — precedent, not preference. app/page.tsx
 * (migrated by the earlier wave) uses container-wide for 13 of its 14 shells,
 * including a centred CTA (`container-wide text-center`), and container-prose
 * exactly once for a genuine reading section. So: page shells are wide;
 * reading columns are prose. The FAQ accordion stack and the bottom CTA were
 * already 48rem, which is container-prose exactly — those two carry ZERO width
 * change, only the shared gutter ramp.
 *
 * WHAT IS DELIBERATELY NOT TOUCHED: the six surviving max-w-* on this route are
 * reading MEASURES on <p> elements — each one also carries a text-size class.
 * globals.css is explicit that a measure must stay a measure and that the
 * container utility is not a drop-in for every max-w-*. Converting them would
 * be the wrong fix, so this guard asserts they are still measures rather than
 * asserting they are gone.
 *
 * Comments are stripped before every assertion.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);

function code(rel: string): string {
  return readFileSync(root(rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const PRICING = 'app/pricing/page.tsx';

/** A centred container: mx-auto within 40 chars of a max-w-* on one class. */
const CONTAINER = /(?:mx-auto[^"'`]{0,40}max-w-[a-z0-9]+|max-w-[a-z0-9]+[^"'`]{0,40}mx-auto)/g;

/** The widths only a PAGE SHELL ever reaches for. A measure never uses these. */
const SHELL_WIDTH = /max-w-(3xl|4xl|5xl|6xl|7xl)\b/;

describe('DU-14 — /pricing has one content width per section, not four', () => {
  it('builds its shells from the declared containers', () => {
    const src = code(PRICING);
    expect(src, '/pricing never adopted the declared container').toMatch(
      /className="[^"]*container-(wide|prose)/,
    );
  });

  it('every one of its six shells is migrated, not just the easy ones', () => {
    const hits = code(PRICING).match(/container-(wide|prose)/g) ?? [];
    expect(hits.length, 'the route had six page shells; all six should be declared').toBe(6);
  });

  it('centres no ad-hoc shell width any more', () => {
    const leftovers = (code(PRICING).match(CONTAINER) ?? []).filter((s) => SHELL_WIDTH.test(s));
    expect(
      leftovers,
      'a hand-rolled centred shell is exactly what moves the content edge between sections',
    ).toEqual([]);
  });

  it('and keeps its reading measures as measures', () => {
    // The CONTAINER match is only the `max-w-2xl mx-auto` fragment, so the
    // type class that proves it is a measure has to be read off the whole
    // className — i.e. the enclosing line, not the matched substring.
    // Non-global copy: `.test()` on a /g regex carries lastIndex between calls
    // and would skip lines at random.
    const centred = new RegExp(CONTAINER.source);
    const lines = code(PRICING)
      .split('\n')
      .filter((l) => centred.test(l) && !SHELL_WIDTH.test(l));

    expect(lines.length, 'the paragraph measures were converted; that is the wrong fix').toBe(6);
    for (const l of lines) {
      expect(
        l.trim(),
        'this centres a width but sets no type — that is a shell, not a measure',
      ).toMatch(/text-(xs|sm|base|lg|xl)\b/);
    }
  });

  it('uses the prose width only where the section is genuinely a reading column', () => {
    // The FAQ accordion stack and the bottom CTA — both already 48rem.
    const prose = (code(PRICING).match(/container-prose/g) ?? []).length;
    expect(prose, 'prose is for reading columns; the card grids and the table are wide').toBe(2);
  });
});

describe('DU-14 — the unmigrated remainder is real, and cannot grow', () => {
  function sources(): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === '.next') continue;
          walk(p);
        } else if (/\.tsx$/.test(e.name)) out.push(p);
      }
    };
    walk(root('app'));
    walk(root('components'));
    return out;
  }

  function total(): number {
    let n = 0;
    for (const f of sources()) {
      const src = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      n += (src.match(CONTAINER) ?? []).length;
    }
    return n;
  }

  /**
   * Measured after the /pricing migration: 728, down from 734. This is a
   * RATCHET, not a target — it may fall as more routes migrate, and it must
   * never rise. If a new route needs a centred shell it should use
   * .container-wide / .container-prose, which this pattern does not match.
   */
  const BASELINE = 728;

  it('DU-14 is genuinely still open for the rest of the app', () => {
    expect(
      total(),
      'if this ever nears zero, DU-14 is finished and this guard should change',
    ).toBeGreaterThan(300);
  });

  it('no new ad-hoc centred container has been added', () => {
    expect(
      total(),
      'use .container-wide / .container-prose for a new page shell instead of a fresh max-w-* + mx-auto',
    ).toBeLessThanOrEqual(BASELINE);
  });
});
