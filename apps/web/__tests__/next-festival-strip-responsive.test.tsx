import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import NextFestivalStrip from '../components/home/NextFestivalStrip';

/**
 * RESP-04 (2026-08-12, P1) — at 390px the homepage "Next festival" strip
 * printed the "Book <puja>" pill on top of the festival name.
 *
 * Measured live at 390x844 before the fix (localhost:3000, Chromium):
 *   row      class "flex items-center justify-between gap-4 flex-wrap"
 *   anchor   box 37→54  (17.1px wide), flex "1 1 0%", min-width 0px
 *   its date badge  37→101 (64px, flex-shrink-0) — overflowing the 17px box
 *   <h2> "Hartalika Teej हरतालिका तीज"  width 0
 *   CTA "Book parvati puja"  70→230, painted straight across the title
 *
 * Root cause: the row is a single flex ROW at every width. `flex-1` gives the
 * text block `flex-basis: 0`, so `flex-wrap` never wraps it — it just collapses
 * to nothing while the CTA group keeps its intrinsic width. Adding `min-w-0`
 * (already present) does not help; the fix is to stack at <640px.
 *
 * happy-dom has no layout engine, so this asserts the layout contract instead:
 * the row must stack below sm, and the text block must own the full row width
 * at the stacked breakpoint rather than being flex-basis 0 against the CTA.
 */
// DF-04/DF-02 note: NextFestivalStrip became an async server component when it
// started checking the festival's puja slug against the LIVE catalogue before
// rendering a booking link. Tests therefore await it and inject the catalogue,
// which also keeps this layout assertion off the network.
const CATALOGUE = new Set(['rudrabhishek', 'ganesh-puja', 'lakshmi-puja']);

describe('RESP-04 next-festival strip stacks on narrow screens', () => {
  it('stacks the row and gives the title full width below sm', async () => {
    const { container } = render(await NextFestivalStrip({ catalogueSlugs: CATALOGUE }));

    const label = [...container.querySelectorAll('p')].find(
      (p) => p.textContent?.trim() === 'Next festival',
    );
    expect(label, 'strip did not render').toBeTruthy();

    const anchor = label!.closest('a')!;
    const row = anchor.parentElement!;

    const rowClasses = row.className.split(/\s+/);
    // Base (mobile-first) direction must be column; row only from sm up.
    expect(rowClasses).toContain('flex-col');
    expect(rowClasses).toContain('sm:flex-row');
    expect(rowClasses).not.toContain('items-center');
    expect(rowClasses).not.toContain('justify-between');

    const anchorClasses = anchor.className.split(/\s+/);
    // At base width the text block spans the row instead of collapsing to
    // flex-basis 0 next to the CTA group.
    expect(anchorClasses).toContain('w-full');
    expect(anchorClasses).not.toContain('flex-1');
    expect(anchorClasses).toContain('sm:flex-1');
  });

  it('keeps the CTA group in its own row below sm', async () => {
    const { container } = render(await NextFestivalStrip({ catalogueSlugs: CATALOGUE }));
    const label = [...container.querySelectorAll('p')].find(
      (p) => p.textContent?.trim() === 'Next festival',
    );
    const row = label!.closest('a')!.parentElement!;
    const ctaGroup = row.lastElementChild as HTMLElement;

    expect(ctaGroup).not.toBe(label!.closest('a'));
    expect(ctaGroup.className.split(/\s+/)).toContain('w-full');
  });
});
