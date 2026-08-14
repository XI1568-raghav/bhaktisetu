import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '../components/ui/Button';

/**
 * DU-03 — the primary CTA shipped in 11 pixel heights, 11 paddings, 4 radii
 * and 5 type styles across the 10 screens the sweep measured, because
 * apps/web/components/ui contained no Button at all (only DateInput and
 * CityAutocomplete). This is the single recipe. The assertions below are the
 * ones that make it worth adopting: one height per size, one radius token, one
 * type ramp, and a fill that carries white text at WCAG AA.
 */

const css = readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const s = parseInt(f.slice(i, i + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 100) / 100;
};

describe('DU-03 — Button is the one primary-CTA recipe', () => {
  it('renders a real button with its label', () => {
    render(<Button>Book Now</Button>);
    expect(screen.getByRole('button', { name: 'Book Now' })).toBeTruthy();
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('type')).toBe('button');
  });

  it('renders an anchor when href is given, keeping one visual recipe', () => {
    render(<Button href="/pujas">Browse pujas</Button>);
    const link = screen.getByRole('link', { name: 'Browse pujas' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/pujas');
    expect(link.className).toContain('rounded-lg');
  });

  it('every size is a single fixed height — the sprawl was 11 of them', () => {
    const heights = Object.values(BUTTON_SIZES).map(
      (cls) => /(?:^|\s)h-(\S+)/.exec(cls)?.[1],
    );
    expect(heights.every(Boolean), 'a size must pin its own height').toBe(true);
    expect(new Set(heights).size).toBe(heights.length);
  });

  it('every size clears the 44px tap floor except the explicitly compact one', () => {
    // h-11 = 2.75rem = 44px, h-12 = 48px. `sm` is the opt-in compact size and
    // is the only one allowed below the floor.
    expect(BUTTON_SIZES.md).toMatch(/\bh-11\b/);
    expect(BUTTON_SIZES.lg).toMatch(/\bh-12\b/);
  });

  it('every variant uses the same single radius token', () => {
    for (const cls of Object.values(BUTTON_SIZES)) expect(cls).not.toMatch(/\brounded-/);
    render(<Button variant="ghost">x</Button>);
    expect(screen.getByRole('button', { name: 'x' }).className).toContain('rounded-lg');
  });

  it('the primary fill is the single primary weight, not saffron-500', () => {
    expect(BUTTON_VARIANTS.primary).toMatch(/bg-saffron-600/);
    expect(
      BUTTON_VARIANTS.primary,
      'saffron-500 is 3.79:1 with white — that is the DU-04/A11Y-10 pairing',
    ).not.toMatch(/bg-saffron-500(?![\w-])/);
  });

  it('the primary fill carries white text at AA against the shipped token', () => {
    const hex = /--color-saffron-600:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1];
    expect(hex, '--color-saffron-600 missing from globals.css').toBeTruthy();
    expect(contrast(hex!, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('a disabled button is really disabled and says so to AT', () => {
    render(<Button disabled>Pay</Button>);
    const btn = screen.getByRole('button', { name: 'Pay' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('a disabled link is not a tab stop and carries no href', () => {
    render(
      <Button href="/checkout" disabled>
        Continue
      </Button>,
    );
    const el = screen.getByText('Continue').closest('a')!;
    expect(el.hasAttribute('href')).toBe(false);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  it('a loading button is busy, disabled, and keeps an accessible name', () => {
    render(<Button loading>Booking</Button>);
    const btn = screen.getByRole('button', { name: /Booking/ }) as HTMLButtonElement;
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBe(true);
  });

  it('caller classes append rather than replace the recipe', () => {
    render(<Button className="w-full">Wide</Button>);
    const btn = screen.getByRole('button', { name: 'Wide' });
    expect(btn.className).toContain('w-full');
    expect(btn.className).toContain('bg-saffron-600');
  });

  it('exposes exactly the four variants the design system defines', () => {
    expect(Object.keys(BUTTON_VARIANTS).sort()).toEqual(['danger', 'ghost', 'primary', 'secondary']);
  });
});
