import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import path from 'node:path';
import React from 'react';
import NotFound from '../app/not-found';

/**
 * PERF-04 — intrinsic dimensions for CLS, and the weight of a 404.
 *
 * This file is a GUARD, not the fix. Both halves of PERF-04 land mostly
 * outside this pass, and the honest position is recorded here in code rather
 * than in a report nobody re-reads:
 *
 * 1. The three pages the finding names — the homepage, /pujas and
 *    /temples/[slug] — already carry width and height on every <img>. That was
 *    fixed before this pass; the first test only locks it so it cannot silently
 *    come back. The 33 <img> tags across 24 other files that still lacked
 *    dimensions have since been given the intrinsic ratio of the box they are
 *    painted in (taken from the wrapper's aspect-* or its fixed w-N h-N — CSS
 *    still does all the sizing), so the backlog is 0 and the ratchet below is
 *    now a floor, not slack.
 *
 * 2. The 404 weight cannot be fixed from not-found.tsx. The finding's own fix
 *    text asks to "replace not-found.tsx's full-layout render with a minimal
 *    standalone page (it does not need the mega-nav, footer, or 100+ inline SVG
 *    icons)" — but in the App Router `app/not-found.tsx` is always rendered
 *    inside `app/layout.tsx`. The mega-nav, the footer and those SVGs are
 *    declared in the root layout, not here, so slimming this file cannot move
 *    the number. The budget below just keeps this page from becoming part of
 *    the problem.
 *
 *    MEASURED FROM THE BUILD, 2026-08-19 (`.next` of build lshYpavE8I7iFJwQgyMlS,
 *    2026-08-16 — prod is 503 on a Render billing suspension, so a live curl is
 *    not available and this is the closest real artefact):
 *
 *      .next/server/app/_not-found.html   107,241 B   of which
 *          inline <script> (RSC flight)    68,244 B
 *          26 inline <svg> blocks          11,414 B
 *          109 <a> elements
 *          "Page not found" first appears at byte 2,102
 *      .next/server/app/_not-found.rsc     56,718 B
 *                                        ───────────
 *      HTML + RSC per 404                 163,959 B
 *      /_not-found/page JS chunks         351,864 B (shared, cached after hit 1)
 *
 *    This component itself renders 4,272 bytes and one <svg> — 4.0% of the HTML.
 *    The finding's 199,758-260,000 B range is the right order of magnitude.
 *
 *    CORRECTION to an earlier note here, which said "there is no supported way
 *    to opt out": for Next 15.5 there is. `app/global-not-found.tsx` renders a
 *    standalone document that does NOT nest inside the root layout (the file
 *    supplies its own <html>/<body>), behind `experimental.globalNotFound`. It
 *    is implemented in the version installed here, next@15.5.20 — see
 *    node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js,
 *    where 'global-not-found' is a FILE_TYPE with its own
 *    defaultGlobalNotFoundPath, and node_modules/next/dist/build/entries.js:672
 *    and :746, which pass `isGlobalNotFoundEnabled: config.experimental
 *    .globalNotFound ? true : undefined`. Adopting it would take the 404 from
 *    163,959 B to roughly this component's own 4,272 B plus a minimal shell.
 *    It is NOT adopted here: it needs a new `app/global-not-found.tsx` plus an
 *    experimental flag in next.config.ts, and with prod down there is no way to
 *    verify the resulting 404 actually serves before it ships. That is a
 *    deliberate deferral, not an impossibility.
 */

const WEB_ROOT = path.resolve(__dirname, '..');

/**
 * Strip block, JSX and line comments before counting. A source scan that keeps
 * comments counts the prose describing an <img> as an <img>, and the file
 * explaining a rule becomes the reason the rule reports a violation.
 */
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Count `<img>` tags that bind a src but declare no intrinsic box.
 *
 * A forwarding wrapper — `<img {...rest} src={src} />` inside a component whose
 * whole job is to pass the caller's props through — is NOT an offender: its
 * dimensions arrive from the call site and there is no correct literal to put
 * on it. Those are exempted here and covered instead by the call-site
 * assertion below, so the exemption cannot become a way to hide a real one.
 */

/**
 * An intrinsic box can be declared two ways, and both prevent the shift:
 *
 *   width + height   the literal ratio of the painted box. The right answer
 *                    whenever the dimensions are knowable.
 *   aspect-ratio     a DECLARED ratio, for the case where they are not — a
 *                    markdown `![alt](url)` carries no dimensions at all, so
 *                    there is no honest literal to write. The box still exists
 *                    before the first byte arrives, which is the whole point.
 *
 * Accepting only the first would have forced lib/markdown.ts to invent a
 * width and a height it cannot know.
 */
function declaresBox(body: string): boolean {
  if (/\bwidth[=\s]/.test(body) && /\bheight[=\s]/.test(body)) return true;
  return /aspect-ratio\s*:/.test(body) || /\baspect-\[/.test(body);
}

function countImgs(src: string): { total: number; missing: number } {
  let total = 0;
  let missing = 0;
  for (const m of stripComments(src).matchAll(/<img\s([\s\S]{0,900}?)\/>/g)) {
    const body = m[1]!;
    if (!/src=/.test(body)) continue;
    if (/\{\s*\.\.\.\w/.test(body)) continue; // forwards the caller's props
    total += 1;
    if (!declaresBox(body)) missing += 1;
  }
  return { total, missing };
}

/** Every `<Wrapper …/>` usage of a forwarding image component. */
function countWrapperUses(src: string, tag: string): { total: number; missing: number } {
  let total = 0;
  let missing = 0;
  const re = new RegExp(`<${tag}\\s([\\s\\S]{0,900}?)\\/>`, 'g');
  for (const m of stripComments(src).matchAll(re)) {
    const body = m[1]!;
    if (!/src=/.test(body)) continue;
    total += 1;
    if (!/\bwidth[=\s]/.test(body) || !/\bheight[=\s]/.test(body)) missing += 1;
  }
  return { total, missing };
}

/**
 * DENOMINATOR (widened 2026-09-01). This used to collect `.tsx` under `app/`
 * and `components/` only, while the assertion below called itself "the
 * app-wide backlog". Two structural blind spots came with that:
 *
 *   - `lib/` was never walked. It holds real render code — `lib/meta-pixel.ts`
 *     builds the Meta `<noscript>` pixel, and `lib/markdown.ts` emits raw HTML
 *     — so a dimensionless image there would have read as zero.
 *   - `.ts` was excluded, so any of that code that is not JSX-shaped was out of
 *     scope on file extension alone.
 *
 * Both are in now. Re-measured after widening: still 0 offenders, so this is a
 * denominator fix and not a backlog change. The one `<img>` the widening adds
 * is the Meta pixel, which is `createElement('img', { height: 1, width: 1,
 * style: { display: 'none' } })` — dimensioned and un-painted, and asserted by
 * name below because `countImgs` scans JSX text and cannot see a
 * `createElement` call.
 */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(full) && !/\.(test|spec)\./.test(full)) out.push(full);
  }
  return out;
}

/** Every source file the two assertions below judge. */
function scannedFiles(): string[] {
  return [
    ...sourceFiles(path.join(WEB_ROOT, 'app')),
    ...sourceFiles(path.join(WEB_ROOT, 'components')),
    ...sourceFiles(path.join(WEB_ROOT, 'lib')),
  ];
}

describe('PERF-04 — intrinsic image dimensions', () => {
  it('the three pages the finding named still declare width and height everywhere', () => {
    const named = ['app/page.tsx', 'app/pujas/page.tsx', 'app/temples/[slug]/page.tsx'];
    const offenders = named
      .map((rel) => [rel, countImgs(readFileSync(path.join(WEB_ROOT, rel), 'utf8'))] as const)
      .filter(([, c]) => c.missing > 0)
      .map(([rel, c]) => `${rel}: ${c.missing} of ${c.total}`);
    expect(offenders).toEqual([]);
  });

  it('the app-wide backlog of dimensionless <img> never grows', () => {
    /*
     * Baseline was 33 on 2026-08-15 and is 0 as of 2026-08-19: every <img> in
     * app/ and components/ now declares an intrinsic box. Left at 33 this was a
     * no-op that would have silently absorbed the fixes AND allowed 33 fresh
     * regressions, which is the failure mode a ratchet exists to prevent.
     *
     * NAMES the offenders rather than printing a number, so the next person
     * does not have to re-derive the list.
     */
    const BASELINE_MISSING = 0;
    const files = scannedFiles();
    expect(files.length, 'the file walk found nothing — the backlog would read 0').toBeGreaterThan(
      300,
    );
    const offenders: string[] = [];
    let missing = 0;
    for (const f of files) {
      const c = countImgs(readFileSync(f, 'utf8'));
      if (c.missing > 0) {
        missing += c.missing;
        offenders.push(`${path.relative(WEB_ROOT, f).split(path.sep).join('/')}: ${c.missing} of ${c.total}`);
      }
    }
    expect(
      missing,
      'these <img> tags declare no intrinsic box, so the browser reserves zero height ' +
        'until the bytes arrive and everything below them jumps. Copy the pattern at ' +
        'app/pujas/page.tsx:679 — width/height are the ratio of the painted box, taken ' +
        "from the wrapper's aspect-* or its fixed w-N h-N; CSS keeps doing the sizing.\n" +
        offenders.join('\n'),
    ).toBeLessThanOrEqual(BASELINE_MISSING);
  });

  it('forwarding image wrappers are declared at their call sites instead', () => {
    /*
     * components/RemoteImage.tsx exists so a rate-limited Wikimedia hotlink
     * removes itself rather than painting an empty box (CM-08). It spreads the
     * caller's props onto the <img>, so the literal width/height live at the
     * call site — and this is what checks they are actually there. Without it,
     * routing an image through the wrapper would be a way out of the ratchet.
     */
    const WRAPPERS = ['RemoteImage'];
    const files = scannedFiles();
    const offenders: string[] = [];
    let uses = 0;
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const tag of WRAPPERS) {
        const c = countWrapperUses(src, tag);
        uses += c.total;
        if (c.missing > 0) {
          const rel = path.relative(WEB_ROOT, f).split(path.sep).join('/');
          offenders.push(`${rel}: ${c.missing} <${tag}> of ${c.total}`);
        }
      }
    }
    expect(uses, 'no wrapper usage found — this assertion would measure nothing').toBeGreaterThan(0);
    expect(offenders, 'these pass no intrinsic box through the wrapper').toEqual([]);
  });

  it('the counter can still see a dimensionless <img> (0 is not vacuous)', () => {
    // With the backlog at 0 the ratchet passes whether or not countImgs works.
    // Exercise it against synthetic sources so a parsing regression that makes
    // everything look "covered" fails here instead of going unnoticed.
    expect(countImgs('<img src={x} className="a" />').missing).toBe(1);
    expect(countImgs('<img src={x} width={10} height={20} />').missing).toBe(0);
    expect(countImgs('<img src={x} width={10} />').missing).toBe(1);
    // The second spelling, and the thing it must NOT accept: a declared ratio
    // counts, the word "aspect" on its own does not.
    expect(countImgs('<img src={x} style="aspect-ratio:16/9" />').missing).toBe(0);
    expect(countImgs('<img src={x} className="aspect-[4/3]" />').missing).toBe(0);
    expect(countImgs('<img src={x} className="aspect" alt="aspect ratio" />').missing).toBe(1);
    // A src-less <img> is not counted at all, and a comment quoting one cannot
    // create a phantom offender.
    expect(countImgs('<img alt="" />').total).toBe(0);
    expect(countImgs('{/* <img src={x} /> */}').total).toBe(0);
    expect(countImgs('/* <img src={x} /> */').total).toBe(0);
  });

  it('the one image built by createElement rather than JSX is dimensioned too', () => {
    /*
     * countImgs reads JSX text, so `createElement('img', {...})` is invisible
     * to it. lib/meta-pixel.ts is the only place in the tree that does that —
     * asserted here rather than assumed, because widening the walk to lib/ is
     * what made this file part of the denominator at all. If a second one is
     * ever added, this assertion's file list is the place it has to be
     * declared.
     */
    const usesCreateElementImg = scannedFiles().filter((f) =>
      /createElement\(\s*['"]img['"]/.test(stripComments(readFileSync(f, 'utf8'))),
    );
    expect(usesCreateElementImg.map((f) => path.relative(WEB_ROOT, f).split(path.sep).join('/'))).toEqual(
      ['lib/meta-pixel.ts'],
    );
    const src = stripComments(readFileSync(path.join(WEB_ROOT, 'lib/meta-pixel.ts'), 'utf8'));
    const call = /createElement\(\s*['"]img['"]\s*,\s*\{([\s\S]{0,400}?)\}\s*\)/.exec(src)?.[1];
    expect(call, 'could not isolate the pixel <img> props').toBeTruthy();
    expect(call!, 'the tracking pixel declares no height').toMatch(/height:\s*1\b/);
    expect(call!, 'the tracking pixel declares no width').toMatch(/width:\s*1\b/);
    expect(call!, 'the tracking pixel is painted, so its 1x1 box IS layout').toMatch(
      /display:\s*'none'/,
    );
  });
});

describe('PERF-04 — the 404 body stays small', () => {
  it('not-found.tsx renders under 6 KB and carries at most one inline SVG', () => {
    const html = renderToStaticMarkup(React.createElement(NotFound));
    expect(Buffer.byteLength(html, 'utf8')).toBeLessThanOrEqual(6 * 1024);
    expect((html.match(/<svg/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it('still renders the copy, the search box and the recovery links a 404 needs', () => {
    // A weight budget that can be met by deleting the page is not a budget.
    const html = renderToStaticMarkup(React.createElement(NotFound));
    expect(html).toContain('Page not found');
    expect(html).toContain('action="/search"');
    expect(html).toContain('href="/pujas"');
    expect(html).toContain('href="/temples"');
  });
});
