import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PERF-04 — the three heaviest documents on the site, guarded structurally.
 *
 * WHY THIS FILE EXISTS AT ALL
 *
 * The lane that cut these pages was stopped before it wrote a guard, so the
 * reductions shipped naked: /aarti's sprite, /chants' bounded summary and
 * /calendar's bounded description are all one careless edit from being undone,
 * and nothing would say so. Production measurement is the only thing that
 * would have caught it, months later.
 *
 * WHY IT ASSERTS SHAPE AND NOT BYTES
 *
 * A byte-count assertion on rendered HTML flaps on every copy edit and then
 * gets raised until it means nothing — this repo already has one ratchet that
 * decayed into `HAND_ROLLED.length <= 2`, a ceiling any two files satisfy.
 * These assertions name the MECHANISM instead: a sprite rather than an icon
 * per row, and a bound applied before serialisation rather than in CSS.
 *
 * THE MEASUREMENTS THAT MOTIVATED EACH ONE (production, 2026-09-08, HTTP 200
 * asserted before the body was read — see OPS-12/F451, the origin serves
 * Cloudflare block pages under a concurrent burst):
 *
 *   /aarti     616,628 B raw / 43,758 gzip — 326 inline <svg>, 117,569 B of it
 *   /chants    419,824 B raw / 66,955 gzip — the WORST-compressing page here
 *   /calendar  382,166 B raw / 70,807 gzip / 31,090 brotli
 *
 * /chants is the one that explains why raw bytes mislead: it is half again
 * SMALLER than /aarti and compresses far worse, because /aarti's weight is 300
 * near-identical icons that gzip to almost nothing while /chants is unique
 * prose that does not compress and lands on the wire in full.
 */

const APP = join(__dirname, '..', 'app');
const read = (p: string) => readFileSync(join(APP, p), 'utf8');

/** Strip comments so a prose explanation cannot satisfy — or trip — a rule. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('PERF-04 — the comment stripper actually strips', () => {
  it('removes block and line comments, and keeps real code', () => {
    const out = stripComments('/* <svg> */\nconst a = 1;\n// <svg>\nconst b = 2;');
    expect(out).not.toContain('<svg>');
    expect(out).toContain('const a = 1;');
    expect(out).toContain('const b = 2;');
  });
});

describe('PERF-04 — /aarti draws icons from a sprite, not one set per row', () => {
  const src = stripComments(read('aarti/page.tsx'));

  it('emits <use> references rather than an inline icon per row', () => {
    expect(src).toMatch(/<use\s+href=/);
  });

  it('defines the icons once, as <symbol>', () => {
    expect(src).toMatch(/<symbol/);
  });

  it('does not re-import lucide-react into this page', () => {
    // The regression is not "an icon library exists" — it is this page pulling
    // a component that renders a fresh <svg> per row. 100 aartis made that
    // 117,569 B of literal SVG, and roughly double that in the RSC payload,
    // where every quote in ["$","svg",null,{...}] escapes to four bytes.
    expect(src).not.toMatch(/from\s+['"]lucide-react['"]/);
  });

  it('does not hide the sprite with display:none, which breaks <use>', () => {
    // Recorded at the call site by the lane that built it: a display:none
    // sprite fails to resolve <use> in some engines, so the icons vanish while
    // every test that only counts markup still passes.
    // Scoped to the sprite component itself. An earlier version of this
    // assertion sliced from the top of the file and banned /\bhidden\b/, which
    // flagged `aria-hidden="true"` ON THE SPRITE — an attribute that is correct
    // and required there — and any `overflow-hidden` className earlier in the
    // file tripped it too. A guard that fails on correct code gets deleted.
    const start = src.indexOf('function IconSprite');
    expect(start, 'IconSprite() not found — update this guard').toBeGreaterThan(-1);
    const sprite = src.slice(start, src.indexOf('</svg>', start));
    expect(sprite).not.toMatch(/display:\s*['"]?none/);
    // The technique that works: a zero-sized, absolutely positioned sprite.
    expect(sprite).toMatch(/width="0"/);
    expect(sprite).toMatch(/position:\s*'absolute'/);
  });
});

describe('PERF-04 — /chants and /calendar bound text BEFORE it is serialised', () => {
  const chants = stripComments(read('chants/page.tsx'));
  const calendar = stripComments(read('calendar/page.tsx'));

  it('/chants truncates the card summary in code', () => {
    expect(chants).toMatch(/CARD_SUMMARY_MAX/);
    expect(chants).toMatch(/\.slice\(0,\s*CARD_SUMMARY_MAX\)/);
  });

  it('/calendar truncates the festival description in code', () => {
    expect(calendar).toMatch(/\.slice\(0,\s*max\)/);
  });

  it('neither page relies on line-clamp ALONE to control weight', () => {
    // line-clamp is a paint instruction. It hides text after it has already
    // crossed the wire, so a page can look trimmed and still ship every byte.
    // Both pages may still USE line-clamp for layout — the rule is that a
    // truncation helper exists alongside it, not that the class is banned.
    for (const [name, src] of [
      ['chants', chants],
      ['calendar', calendar],
    ] as const) {
      if (/line-clamp-/.test(src)) {
        expect(src, `${name}: uses line-clamp with no code-side bound`).toMatch(
          /\.slice\(0,/,
        );
      }
    }
  });
});

describe('PERF-04 — the rules can fail', () => {
  // Non-vacuity, enforced in CI rather than observed once. Each detector is
  // re-run against a corpus carrying the exact regression it exists to catch.
  const detectors = {
    'icon per row': (s: string) => /from\s+['"]lucide-react['"]/.test(s),
    'no sprite': (s: string) => !/<symbol/.test(s),
    'unbounded text': (s: string) => /line-clamp-/.test(s) && !/\.slice\(0,/.test(s),
  };

  it('flags a page that re-imports an icon component per row', () => {
    expect(detectors['icon per row']("import { Music } from 'lucide-react';")).toBe(true);
    expect(detectors['icon per row']('<use href="#icon-music" />')).toBe(false);
  });

  it('flags a page with no sprite definition', () => {
    expect(detectors['no sprite']('<div>no icons here</div>')).toBe(true);
    expect(detectors['no sprite']('<symbol id="icon-music" />')).toBe(false);
  });

  it('flags line-clamp with no code-side bound, and accepts it with one', () => {
    expect(detectors['unbounded text']('<p className="line-clamp-2">{full}</p>')).toBe(true);
    expect(
      detectors['unbounded text']('const s = t.slice(0, MAX);<p className="line-clamp-2">{s}</p>'),
    ).toBe(false);
  });
});

describe('PERF-04 — the pages this guard names still exist', () => {
  // A guard that silently stops covering a renamed file is worse than no guard,
  // because the suite stays green while the coverage goes to zero.
  it.each(['aarti/page.tsx', 'chants/page.tsx', 'calendar/page.tsx'])('%s is present', (p) => {
    expect(existsSync(join(APP, p)), `${p} moved — update this guard`).toBe(true);
  });
});
