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
 *    come back. 33 <img> tags across 18 other files still lack dimensions, and
 *    the ratchet stops that number growing while they are worked through.
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

/** Count `<img>` tags that bind a src but declare no intrinsic box. */
function countImgs(src: string): { total: number; missing: number } {
  let total = 0;
  let missing = 0;
  for (const m of stripComments(src).matchAll(/<img\s([\s\S]{0,900}?)\/>/g)) {
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
     * Baseline measured 2026-08-15 across app/ and components/. Ratchet only:
     * a lower number passes silently, so fixing files never forces an edit
     * here. Raise this only with a written reason.
     */
    const BASELINE_MISSING = 33;
    const files = [...tsxFiles(path.join(WEB_ROOT, 'app')), ...tsxFiles(path.join(WEB_ROOT, 'components'))];
    const missing = files.reduce((n, f) => n + countImgs(readFileSync(f, 'utf8')).missing, 0);
    expect(missing).toBeLessThanOrEqual(BASELINE_MISSING);
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
