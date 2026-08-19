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
 *    inside `app/layout.tsx` and there is no supported way to opt out. The
 *    mega-nav, the footer and those SVGs are declared in the root layout, not
 *    here. Measured: this component renders 4,272 bytes and one <svg>, against
 *    the 199,758-259,962 bytes a 404 response actually transfers — 1.6-2.1% of
 *    it. Slimming this file further cannot move that number; the layout is
 *    where the weight is. The budget below just keeps this page from becoming
 *    part of the problem.
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
function countImgs(src: string): { total: number; missing: number } {
  let total = 0;
  let missing = 0;
  for (const m of stripComments(src).matchAll(/<img\s([\s\S]{0,900}?)\/>/g)) {
    const body = m[1]!;
    if (!/src=/.test(body)) continue;
    if (/\{\s*\.\.\.\w/.test(body)) continue; // forwards the caller's props
    total += 1;
    if (!/\bwidth[=\s]/.test(body) || !/\bheight[=\s]/.test(body)) missing += 1;
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

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
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
    const files = [...tsxFiles(path.join(WEB_ROOT, 'app')), ...tsxFiles(path.join(WEB_ROOT, 'components'))];
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
    const files = [
      ...tsxFiles(path.join(WEB_ROOT, 'app')),
      ...tsxFiles(path.join(WEB_ROOT, 'components')),
    ];
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
    // A src-less <img> is not counted at all, and a comment quoting one cannot
    // create a phantom offender.
    expect(countImgs('<img alt="" />').total).toBe(0);
    expect(countImgs('{/* <img src={x} /> */}').total).toBe(0);
    expect(countImgs('/* <img src={x} /> */').total).toBe(0);
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
