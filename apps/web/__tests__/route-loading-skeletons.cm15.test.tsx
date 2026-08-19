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

import React from 'react';
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

/**
 * CM-15, second half — the boundary that is actually in the PRERENDERED HTML.
 *
 * Everything above unit-renders the three loading.tsx components. That covers
 * the route-segment boundary, which only shows on a client-side navigation. It
 * does NOT cover the defect the sweep measured on /astrology, which is a cold
 * or direct visit: AstrologyClient calls useSearchParams and the route is
 * prerenderable (ApprovedProvidersStrip fetches with `{ revalidate: 60 }`, and
 * page.tsx sets no `dynamic`), so React bails out of that subtree at build time
 * and bakes the in-page <Suspense> FALLBACK into the static HTML. A loading.tsx
 * cannot substitute for it.
 *
 * So this block asserts on page.tsx's own render output: no empty
 * full-viewport div may be handed to a Suspense boundary. A source grep would
 * be satisfied by a comment, and would not survive the fallback being extracted
 * to a variable — this renders the component and inspects the DOM.
 */
describe('CM-15 — no route hands its Suspense boundary a blank screen', () => {
  const ROUTES: Array<{ label: string; load: () => Promise<{ default: () => unknown }> }> = [
    { label: '/astrology', load: () => import('../app/astrology/page') },
    { label: '/support/faq', load: () => import('../app/support/faq/page') },
    { label: '/waitlist/welcome', load: () => import('../app/waitlist/welcome/page') },
  ];

  /**
   * Every <Suspense> in an element tree, WITHOUT rendering it.
   *
   * Rendering is no good here: in jsdom the client subtree resolves
   * synchronously, so the fallback never appears and the assertion would pass
   * against the defect. The fallback is inspected as a prop instead — which is
   * also what Next bakes into the prerendered HTML when React bails out of a
   * useSearchParams subtree at build time.
   */
  function suspenseNodes(node: unknown, acc: React.ReactElement[] = []): React.ReactElement[] {
    if (Array.isArray(node)) {
      for (const n of node) suspenseNodes(n, acc);
      return acc;
    }
    if (!React.isValidElement(node)) return acc;
    if (node.type === React.Suspense) acc.push(node);
    const kids = (node.props as { children?: unknown }).children;
    if (kids !== undefined) suspenseNodes(kids, acc);
    return acc;
  }

  for (const { label, load } of ROUTES) {
    it(`${label} hands every Suspense boundary a real skeleton, not a blank screen`, async () => {
      const { default: Page } = await load();
      const tree = Page();
      const boundaries = suspenseNodes(tree);
      expect(
        boundaries.length,
        `${label} has no <Suspense> at all — this guard would measure nothing`,
      ).toBeGreaterThan(0);

      const blank: string[] = [];
      for (const b of boundaries) {
        const fallback = (b.props as { fallback?: React.ReactNode }).fallback;
        if (fallback === null || fallback === undefined) {
          blank.push('(no fallback)');
          continue;
        }
        const { container } = render(fallback as React.ReactElement);
        const text = (container.textContent ?? '').trim();
        const hasSkeleton = container.querySelectorAll('.animate-pulse').length > 0;
        const hasStatus = container.querySelector('[role="status"]') !== null;
        if (!text && !hasSkeleton && !hasStatus) blank.push(container.innerHTML || '(empty)');
      }

      expect(
        blank,
        `${label} paints a blank Suspense fallback. This is the boundary that ends up in ` +
          'the PRERENDERED HTML (the client subtree reads useSearchParams and the route is ' +
          'prerenderable), so a cold visitor gets a whole viewport of nothing above the fold. ' +
          'A loading.tsx does not cover that case — reuse its component as the fallback.\n' +
          blank.join('\n'),
      ).toEqual([]);
    });
  }
});
