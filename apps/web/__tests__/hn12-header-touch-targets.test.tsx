/**
 * HN-12 (prod sweep 2026-08-12, P3) — every control in the mobile header was
 * under the 44px minimum touch target.
 *
 * Measured at 390x844: brand link 28x28, Search 36x36, Cart (0 items) 36x36,
 * Open menu 36x36. WCAG 2.1 AA 2.5.5 and both platform HIGs specify 44px, and
 * these four sit in the one bar a phone user hits on every page.
 *
 * The remedy is padding, not bigger glyphs: the icons stay 20-24px and the hit
 * box grows around them. These tests measure the DECLARED minimum box on the
 * rendered element rather than a computed layout, because happy-dom does not
 * run Tailwind — so they assert the class contract that produces the box.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('../components/CartContext', () => ({
  useCart: () => ({ itemCount: 0, toggleCart: () => {} }),
}));

import NavCartButton from '../components/NavCartButton';
import { MobileNavV2 } from '../components/MobileNavV2';

/** 44 CSS px, expressed the way Tailwind arbitrary values write it. */
const MIN_TOUCH = /min-h-\[44px\]/;
const MIN_TOUCH_W = /min-w-\[44px\]/;

function classOf(el: Element): string {
  return el.getAttribute('class') ?? '';
}

/**
 * Source text with every comment removed. A guard that greps source must not
 * be satisfiable by prose describing the guard.
 */
function codeOf(rel: string): string {
  return readFileSync(path.resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('HN-12 — mobile header controls reach a 44px hit area', () => {
  it('the cart button', () => {
    render(<NavCartButton />);
    const cls = classOf(screen.getByRole('button', { name: /cart/i }));
    expect(cls).toMatch(MIN_TOUCH);
    expect(cls).toMatch(MIN_TOUCH_W);
  });

  it('the cart glyph itself stays small — the box grew, not the icon', () => {
    const { container } = render(<NavCartButton />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(classOf(svg!)).toContain('w-5');
    expect(classOf(svg!)).toContain('h-5');
  });

  it('the mobile menu trigger', () => {
    render(<MobileNavV2 />);
    const cls = classOf(screen.getByRole('button', { name: /open menu/i }));
    expect(cls).toMatch(MIN_TOUCH);
    expect(cls).toMatch(MIN_TOUCH_W);
  });

  it('the collapsed search trigger', () => {
    const src = codeOf('components/GlobalSearch.tsx');
    // The xl:hidden icon-only trigger — the one a phone actually gets.
    const collapsed = src.match(/className="xl:hidden[^"]*"/);
    expect(collapsed, 'collapsed search trigger not found').toBeTruthy();
    expect(collapsed![0]).toMatch(MIN_TOUCH);
    expect(collapsed![0]).toMatch(MIN_TOUCH_W);
  });

  it('the brand link in the header', () => {
    const src = codeOf('app/layout.tsx');
    const brand = src.match(/<a\s+href="\/"[\s\S]{0,220}?aria-label="Darshya home"/);
    expect(brand, 'header brand link not found').toBeTruthy();
    expect(brand![0]).toMatch(MIN_TOUCH);
    expect(brand![0]).toMatch(MIN_TOUCH_W);
  });
});
