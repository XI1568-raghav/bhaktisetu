/**
 * HN-06 (prod sweep 2026-08-12, P2) — the supply-side entry point was invisible
 * on a standard laptop.
 *
 * Measured: at 1280x720 the header's "List your business" button had a
 * zero-height bounding box; at 1600x900 it appeared. The gate was a
 * `hidden 2xl:block` wrapper in app/layout.tsx — 1536px — so every temple
 * trust, pandit, astrologer and gaushala on a 1280 or 1440 laptop had no header
 * route to listing at all, only the footer 91 links down. That is the
 * acquisition funnel for the supply half of a marketplace.
 *
 * Two things are pinned here: the reveal happens at the standard lg breakpoint,
 * and the label that fits at 1024px is the short one while the accessible name
 * stays the full phrase (a shortened visible label must not shorten what a
 * screen reader announces).
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ListYourBusinessDropdown } from '../components/ListYourBusinessDropdown';

/** Source with comments removed, so prose cannot satisfy a code guard. */
function codeOf(rel: string): string {
  return readFileSync(path.resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('HN-06 — the header route to listing a business exists on a laptop', () => {
  it('app/layout.tsx no longer gates the control behind 2xl', () => {
    const src = codeOf('app/layout.tsx');
    const wrapper = src.match(/className="hidden \S+:block">\s*<ListYourBusinessDropdown/);
    expect(wrapper, 'the ListYourBusinessDropdown wrapper was not found').toBeTruthy();
    expect(wrapper![0]).not.toContain('2xl:block');
    expect(wrapper![0]).toContain('lg:block');
  });

  it('the accessible name stays the full phrase at every width', () => {
    render(<ListYourBusinessDropdown />);
    expect(screen.getByRole('button', { name: 'List your business' })).toBeTruthy();
  });

  it('the visible label collapses to a short form below 2xl', () => {
    const { container } = render(<ListYourBusinessDropdown />);
    const labels = Array.from(container.querySelectorAll('span[class*="inline"]')).map(
      (s) => ({ text: s.textContent?.trim(), cls: s.getAttribute('class') ?? '' }),
    );
    const short = labels.find((l) => l.cls.includes('2xl:hidden'));
    const full = labels.find((l) => l.cls.includes('2xl:inline'));
    expect(short, 'no sub-2xl label variant').toBeTruthy();
    expect(full, 'no 2xl label variant').toBeTruthy();
    expect(short!.text).toBe('For partners');
    expect(full!.text).toBe('List your business');
  });

  it('still opens the five supply destinations', () => {
    render(<ListYourBusinessDropdown />);
    fireEvent.click(screen.getByRole('button', { name: 'List your business' }));
    const hrefs = Array.from(document.querySelectorAll('a[role="menuitem"]')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual([
      '/list-temple',
      '/become-priest',
      '/become-astrologer',
      '/become-wellness',
      '/list-gaushala',
    ]);
  });
});
