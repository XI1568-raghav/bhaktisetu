// [PERF-02] + [PERF-03] — what the ROOT LAYOUT makes every route download
// before it has painted anything (prod sweep 2026-08-12).
//
// PERF-02 — app/layout.tsx carried
//     <link rel="preload" as="image" fetchPriority="high" href={getTempleHero('kashi-vishwanath')} />
//   A root layout runs on every route, and it cannot know the LCP element of an
//   arbitrary route. On /pujas/rudrabhishek the page renders zero <img> tags and
//   still transferred exactly one image: this preload. On `/` it was no better —
//   the homepage's only Kashi image is the 500px WorshipStrip card (a different
//   URL, ~4,600px down the page), so `fetchPriority="high"` took a connection
//   slot from the real LCP element to fetch bytes nothing ever painted. That is
//   worse than doing nothing.
//
// PERF-03 — the same <head> loaded a Fontshare stylesheet whose response is
//   HTTP 200 with a 162-byte body containing one comment ("Access to the
//   Fontshare API has been temporarily restricted") and zero @font-face rules.
//   Measured on the live homepage via CDP CSS.getPlatformFontsForNode: 5,545 of
//   5,604 glyphs painted in Arial, 0 in any webfont. Meanwhile next/font/google
//   downloaded 201.9 KB of Noto Sans / Noto Sans Devanagari / Crimson Pro that
//   nothing referenced, because --font-body/--font-display named only 'Satoshi'
//   and 'Cabinet Grotesk'. Every page paid a render-blocking cross-origin round
//   trip AND 201.9 KB of font bytes, and rendered in Arial anyway.
//
// The failure mode that matters here is SILENT: the brand faces disappeared and
// nothing broke, nothing logged, nothing 404'd. So assert on the stack that
// remains, not on "a font link exists".

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const WEB_DIR = path.resolve(__dirname, '../..');
const LAYOUT = path.join(WEB_DIR, 'app/layout.tsx');
const GLOBALS = path.join(WEB_DIR, 'app/globals.css');

/** Strip JS/JSX block + line comments so prose describing the removed tag
 *  cannot satisfy — or trip — an assertion about live markup. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const layoutSrc = stripComments(fs.readFileSync(LAYOUT, 'utf8'));
const globalsSrc = fs.readFileSync(GLOBALS, 'utf8');

describe('[PERF-02] the root layout preloads no image', () => {
  it('renders no <link rel="preload" as="image">', () => {
    const preloads = layoutSrc
      .split(/(?=<link\b)/)
      .filter((tag) => /rel\s*=\s*["']preload["']/.test(tag) && /as\s*=\s*["']image["']/.test(tag));

    expect(
      preloads.map((t) => t.split('\n').slice(0, 6).join(' ').replace(/\s+/g, ' ').trim()),
      'A layout-level image preload fires on EVERY route, including the ~1,400 ' +
        'pages that render no images at all.',
    ).toEqual([]);
  });

  it('uses no fetchPriority="high" anywhere in the layout', () => {
    expect(
      /fetchPriority\s*=\s*["'{]?\s*["']?high/.test(layoutSrc),
      'fetchPriority=high on a resource the route may not paint actively steals ' +
        'bandwidth from the element that IS the LCP.',
    ).toBe(false);
  });

  it('no longer imports the image helper it only needed for that preload', () => {
    // Not cosmetic: an unused getTempleHero import is the thing that grows a
    // second preload back.
    expect(/\bgetTempleHero\b/.test(layoutSrc)).toBe(false);
  });
});

describe('[PERF-03] no bytes are spent on the dead Fontshare stylesheet', () => {
  it('loads no api.fontshare.com stylesheet', () => {
    expect(
      /api\.fontshare\.com/.test(layoutSrc),
      'The endpoint returns 200 with a 162-byte comment and no @font-face rules; ' +
        'it is a render-blocking round trip that delivers nothing.',
    ).toBe(false);
  });

  it('preconnects to no fontshare origin', () => {
    // A preconnect to a host nothing requests is a wasted DNS + TLS handshake
    // in the critical path.
    expect(/fontshare\.com/.test(layoutSrc)).toBe(false);
  });
});

describe('[PERF-03] the fonts the site downloads are the fonts the site renders', () => {
  // next/font/local exposes each family as a CSS variable. If --font-body and
  // --font-display never name one of those variables, the 201.9 KB of woff2 the
  // <html> className pulls in paints nothing and the page falls back to Arial.
  const declaredFontVars = Array.from(layoutSrc.matchAll(/variable:\s*["'](--[\w-]+)["']/g)).map(
    (m) => m[1],
  );

  function stackFor(name: string): string {
    const m = new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, 'm').exec(globalsSrc);
    if (!m) throw new Error(`${name} is not declared in globals.css`);
    return m[1];
  }

  it('layout.tsx still loads at least one next/font family', () => {
    expect(declaredFontVars.length).toBeGreaterThan(0);
  });

  for (const name of ['--font-body', '--font-display']) {
    it(`${name} falls back to a font that is actually downloaded`, () => {
      const stack = stackFor(name);
      const referenced = declaredFontVars.filter((v) => stack.includes(`var(${v})`));
      expect(
        referenced,
        `${name} = ${stack.trim()} — none of these families is loaded by next/font ` +
          `(${declaredFontVars.join(', ')}) and none is self-hosted, so every glyph ` +
          `paints in the system default while the woff2 files download anyway.`,
      ).not.toEqual([]);
    });
  }

  it('keeps the brand faces first in the stack so self-hosting them takes over automatically', () => {
    // The fix must not quietly become "the brand is Noto Sans now". Satoshi /
    // Cabinet Grotesk stay ahead of the fallback, so dropping the licensed
    // woff2 into public/fonts via @font-face is the only change needed.
    expect(stackFor('--font-body')).toMatch(/^\s*'Satoshi'/);
    expect(stackFor('--font-display')).toMatch(/^\s*'Cabinet Grotesk'/);
  });
});
