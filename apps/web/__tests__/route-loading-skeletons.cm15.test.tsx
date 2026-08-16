/**
 * CM-15 — "/temples and /astrology render an empty full-viewport div as their
 * loading state".
 *
 * Measured in the served HTML for /temples:
 *   <main …><!--$?--><template id="B:1"></template>
 *   <div class="min-h-[100dvh]"></div><!--/$-->…</main>
 * i.e. header, one screen of white, footer.
 *
 * There are TWO boundaries on each of these routes and they are not the same
 * thing:
 *
 *   (a) the in-page <Suspense> inside page.tsx, which covers the data fetch;
 *   (b) the route-segment boundary, which is what the App Router shows while
 *       the segment's RSC payload is still in flight on a client-side
 *       navigation — and which does not exist at all unless the segment has a
 *       loading.tsx.
 *
 * (a) on /temples was closed by TD-01's TemplesSkeleton. (b) did not exist on
 * either route, so every in-app navigation into /temples or /astrology — the
 * homepage's "Explore temples" link, the category strip's Astrology card, the
 * header nav — showed nothing until the whole segment resolved.
 *
 * This file covers (b) on both routes. It deliberately does NOT claim (a) on
 * /astrology: app/astrology/page.tsx:171 is still
 * `<Suspense fallback={<div className="min-h-[100dvh]" />}>` and that file is
 * outside this lane.
 *
 * /pujas added in the second pass. It is the same defect one route over and the
 * worst-placed instance of it: app/pujas/page.tsx is an async server component
 * that awaits the catalogue AND `getTranslations` with no <Suspense> of its own
 * and had no loading.tsx either, so the single highest-intent navigation on the
 * site — every "Book a puja" CTA, the header nav, the homepage category strip —
 * had no boundary of any kind and rendered nothing until the whole segment
 * resolved. CM-15 names /temples and /astrology because those are what the
 * sweep sampled; the finding is about blank screens reading as broken pages,
 * and this is the blank screen in front of the money.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import TemplesLoading from '../app/temples/loading';
import AstrologyLoading from '../app/astrology/loading';
import PujasLoading from '../app/pujas/loading';

afterEach(() => cleanup());

const ROUTES: Array<[string, () => JSX.Element]> = [
  ['/temples', TemplesLoading],
  ['/astrology', AstrologyLoading],
  ['/pujas', PujasLoading],
];

describe.each(ROUTES)('CM-15 — %s segment loading state', (route, Loading) => {
  it('is not an empty div', () => {
    const { container } = render(<Loading />);
    const text = (container.textContent ?? '').trim();
    expect(
      text.length,
      `${route} must say something while it loads; a blank screen reads as broken`,
    ).toBeGreaterThan(0);
  });

  it('announces itself to assistive tech', () => {
    const { container } = render(<Loading />);
    const status = container.querySelector('[role="status"]');
    expect(status, 'a loading region needs role=status').not.toBeNull();
    expect(status!.getAttribute('aria-busy')).toBe('true');
  });

  it('renders a card-grid skeleton, not a bare spinner', () => {
    const { container } = render(<Loading />);
    const shimmer = container.querySelectorAll('.animate-pulse');
    expect(
      shimmer.length,
      'a skeleton holds the user for the same duration a blank screen loses them',
    ).toBeGreaterThanOrEqual(6);
  });

  it('holds the viewport so the footer does not jump up under the header', () => {
    const { container } = render(<Loading />);
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root!.className).toMatch(/min-h-\[100dvh\]/);
  });

  it('shows no invented content that could be mistaken for real data', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    // Names from the live seed. A skeleton must never pre-render them.
    for (const name of ['Kashi Vishwanath', 'Somnath', 'Tirumala', 'Siddhivinayak']) {
      expect(text).not.toContain(name);
    }
  });
});
