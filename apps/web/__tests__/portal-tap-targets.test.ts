/**
 * RESP-11 — portal controls under 44px at 390x844.
 *
 * Most of what the sweep measured is now reached by the small-viewport floor
 * in globals.css: it selects `button`, `[role="button"]`, `select`, `summary`,
 * `nav li > a`, `footer li > a`, and gives icon-only controls a 44px
 * min-WIDTH via `button:has(> svg:only-child)`. The 20x20 sidebar close button
 * in the six provider layouts is a `<button>` whose only child is an icon, so
 * it is floored to 44x44 by that rule with no markup change — verified by
 * reading the selectors, and asserted in __tests__/design-tokens.test.ts.
 *
 * What that CSS structurally CANNOT reach is a bare `<a>` outside a list. The
 * KYC status pill on all six provider dashboards is exactly that: an anchor
 * wrapping a `text-xs px-2.5 py-1` pill, measured 168.8x26 on /priest. It has
 * to opt into `.tap-safe`, and this file is the guard that it does.
 *
 * Source is read with comments stripped — a guard that a comment can satisfy
 * is not a guard.
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

const css = readFileSync(root('app/globals.css'), 'utf8');

describe('RESP-11 — the KYC pill is a real tap target', () => {
  const src = code('components/provider/KycStatusBadge.tsx');

  it('the pill itself is still small, so this is a hit-box fix, not a redesign', () => {
    expect(src, 'the visual pill should keep its compact padding').toMatch(
      /text-xs font-semibold px-2\.5 py-1 rounded-full/,
    );
  });

  it('the anchor around it opts into the 44px floor', () => {
    const link = /<Link\s+href=\{href\}([^>]*)>/.exec(src);
    expect(link, '<Link href={href}> not found in KycStatusBadge').not.toBeNull();
    expect(
      link![1],
      'a bare anchor is invisible to every selector in the globals.css tap-target block',
    ).toMatch(/className="[^"]*\btap-safe\b/);
  });

  it('.tap-safe actually delivers 44px without changing the visual rhythm', () => {
    const rule = /\.tap-safe\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/min-height:\s*44px/);
    const pad = /padding-block:\s*([\d.]+)rem/.exec(rule)?.[1];
    const neg = /margin-block:\s*-([\d.]+)rem/.exec(rule)?.[1];
    expect(pad, 'padding-block missing').toBeTruthy();
    expect(neg, 'the negative margin is what keeps the row height unchanged').toBe(pad);
  });

  it('the verified state stays a plain span — there is nothing to tap', () => {
    expect(src).toMatch(/state === 'verified' \? inner :/);
  });
});

describe('RESP-11 — the floor the CSS does reach is still declared', () => {
  const MARKER = 'tap-target floor */';
  const from = css.indexOf(MARKER);
  const scope = from < 0 ? '' : css.slice(from, css.indexOf('\n}', css.indexOf('@media', from)));

  it('icon-only buttons get a 44px min-width, which is what floors the sidebar close control', () => {
    expect(scope).toMatch(/button:has\(> svg:only-child\)/);
    expect(scope).toMatch(/min-width:\s*44px/);
  });

  it('the six provider sidebars really do close with an icon-only button', () => {
    const LAYOUTS = [
      'app/priest/layout.tsx',
      'app/store-admin/layout.tsx',
      'app/temple-portal/layout.tsx',
      'app/wellness-portal/layout.tsx',
      'app/astrologer-portal/layout.tsx',
      'app/gaushala-portal/layout.tsx',
    ];
    for (const f of LAYOUTS) {
      const src = code(f);
      expect(
        src,
        `${f}: the close control must stay icon-only or the :has() rule stops matching it`,
      ).toMatch(/<button[\s\S]{0,200}?>\s*<X className="w-5 h-5" \/>\s*<\/button>/);
    }
  });
});
