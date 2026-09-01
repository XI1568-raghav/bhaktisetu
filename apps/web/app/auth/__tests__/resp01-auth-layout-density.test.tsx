/**
 * RESP-01 — the /auth wrapper's own share of the collision with the cookie
 * banner. The banner half and the login-card half are guarded by
 * app/auth/login/__tests__/resp01-mobile-density.test.tsx; this file guards
 * app/auth/layout.tsx, which is the only chrome between <main>'s pt-16 and the
 * top of the sign-in card.
 *
 * WHAT WAS MEASURED, and how. Chromium (Playwright) against the repo's own
 * compiled Tailwind bundle (apps/web/.next/static/css/ac68e376c2390031.css),
 * with the REAL rendered markup of app/auth/login/page.tsx and
 * components/CookieBanner.tsx — dumped out of a render() so no hand-written
 * replica could drift from the components — inside a faithful shell of
 * app/layout.tsx's <body class="min-h-[100dvh] flex flex-col">, the fixed h-16
 * header, SiteChrome's consumer <main class="flex-1 pt-16 pb-20">, this
 * layout's wrapper, and globals.css's `body { padding-bottom: var(--consent-h) }`.
 * MobileBottomTabs is correctly absent: it returns null on /auth/*.
 *
 *   viewport   HEAD (py-8, items-center)        after (py-4, items-start)
 *   390x844    Sign In 44/44 visible,  12px     44/44,  28px clear of banner
 *              clear of the banner's top edge
 *   360x800    13/44 visible, a tap at its      29/44 visible, tap at its
 *              centre lands on the BANNER       centre lands on Sign In
 *   375x667    0/44 at first paint              0/44 at first paint
 *   412x915    44/44, card top y=113            44/44, card top y=80
 *   768x1024   44/44, card top y=188            unchanged (sm:items-center)
 *   1280x800   44/44                            unchanged
 *
 * TWO THINGS THE HANDOFF NOTE GOT WRONG, both measured:
 *
 *  1. `items-center` -> `items-start` on its own fixes NOTHING. At 360x800 and
 *     375x667 the wrapper is already taller than `100dvh - --consent-h`, so it
 *     is sized by its content and align-items has no free space to distribute.
 *     Byte-identical geometry at both sizes. The 32px of mobile py-8 is what
 *     actually moves the button. items-start is kept below sm anyway (it is
 *     free, and it stops a future taller banner from pushing the card DOWN via
 *     the centring offset) but it is not the fix.
 *
 *  2. 375x667 is not fixable by any padding change here, and no test should
 *     pretend otherwise: 667 - 64 (fixed header) - 262 (banner) = 341px of
 *     usable band against a 574px card. The page does scroll — verified by
 *     scrolling to the bottom and hit-testing the button's centre, which
 *     returns the button at every one of the six sizes — so "un-tappable" is
 *     not true at HEAD. It is below the fold at first paint, which is a
 *     different and smaller claim.
 *
 * This test asserts the spacing BUDGET that produced the geometry above, on
 * rendered className values — never on source text, so a commented-out class
 * cannot fool it and there is no comment-stripping step to get wrong.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AuthLayout from '../layout';

/**
 * Vertical px contributed by the MOBILE (un-prefixed) spacing utilities on one
 * element. A `sm:`/`md:`/`lg:` class is ignored on purpose — this is a budget
 * for viewports below 640px, where the banner and the form compete.
 * Tailwind's unit is 0.25rem = 4px, so py-4 is 4 * 4 * 2 = 32px.
 *
 * `p-`/`m-` are all-sides and contribute BOTH edges. Omitting them was the bug
 * in the first version of the sibling helper in
 * app/auth/login/__tests__/resp01-mobile-density.test.tsx, where the banner's
 * `p-4` scored 0 and the budget passed against the markup it was written to
 * reject.
 */
const AXIS: Record<string, number> = { p: 2, m: 2, py: 2, my: 2, pt: 1, pb: 1, mt: 1, mb: 1 };

function mobileVerticalSpacePx(el: Element): number {
  let total = 0;
  for (const cls of String(el.className).split(/\s+/)) {
    if (!cls || cls.includes(':')) continue; // breakpoint-prefixed -> not mobile
    const m = /^(py|my|pt|pb|mt|mb|p|m)-(\d+(?:\.\d+)?)$/.exec(cls);
    if (m) total += Number(m[2]) * 4 * AXIS[m[1]];
  }
  return total;
}

function renderWrapper(): HTMLElement {
  const { container } = render(<AuthLayout><div data-testid="child" /></AuthLayout>);
  return container.firstElementChild as HTMLElement;
}

describe('RESP-01 — the /auth layout wrapper below sm', () => {
  it('the helper reads mobile utilities only, all-sides included', () => {
    const el = document.createElement('div');
    el.className = 'px-6 py-4 sm:py-8';
    expect(mobileVerticalSpacePx(el)).toBe(32);
    el.className = 'p-3 sm:p-6';
    expect(mobileVerticalSpacePx(el)).toBe(24);
    el.className = 'flex sm:py-8';
    expect(mobileVerticalSpacePx(el)).toBe(0);
  });

  it('spends at most 16px of mobile vertical padding, none of it above the card', () => {
    // py-8 = 64px at HEAD, py-4 = 32px after the third pass. The FOURTH pass
    // (2026-09-01) took the top edge to 0: measured in Chromium, the card top
    // moves y=80 -> y=64 and Sign In y 524-568 -> y 508-552, which is what
    // flips 360x800 from "15 of 44px on screen, hit test returns the BANNER" to
    // "44 of 44, hit test returns the button".
    //
    // Only the TOP padding moves the button, so assert that specifically as
    // well as the total — a future `pt-2 pb-2` would keep the total at 16 while
    // pushing Sign In back down by 8px.
    const el = renderWrapper();
    expect(mobileVerticalSpacePx(el)).toBeLessThanOrEqual(16);
    const cls = String(el.className);
    expect(cls).toMatch(/(^|\s)pt-0(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)(py|pt)-[1-9]/);
  });

  it('keeps the roomier desktop padding at sm and up', () => {
    // The fix must be a mobile-only reclaim, not a site-wide tightening: at
    // 768x1024 and 1280x800 the button already cleared the banner by a wide
    // margin and nothing there needed changing. `sm:pt-8 sm:pb-8` is the old
    // `sm:py-8` split in two, because the mobile side now needs an asymmetric
    // `pt-0 pb-4` and a bare `py-4` can no longer carry it.
    const cls = String(renderWrapper().className);
    expect(cls).toMatch(/(^|\s)(sm:py-8|sm:pt-8)(\s|$)/);
    expect(cls).toMatch(/(^|\s)(sm:py-8|sm:pb-8)(\s|$)/);
  });

  it('does not vertically centre the card at mobile widths', () => {
    // With align-items:center, any growth in the banner's height raises
    // `100dvh - --consent-h`... and on the viewports where there IS free space
    // that pushes the card DOWN, toward the banner. Below sm the card starts at
    // the top of the wrapper, so its distance from the header is a constant.
    const cls = String(renderWrapper().className);
    expect(cls).toMatch(/(^|\s)items-start(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)items-center(\s|$)/);
    // ...while sm and up still centre, so tablet/desktop are visually unchanged.
    expect(cls).toMatch(/(^|\s)sm:items-center(\s|$)/);
  });

  it('still reserves the banner height out of the wrapper min-height', () => {
    // This is the part of the earlier fix that makes 390x844 clear at all. A
    // revert to a plain 100dvh puts Sign In back under the banner there.
    const style = renderWrapper().getAttribute('style') ?? '';
    expect(style.replace(/\s+/g, '')).toContain('calc(100dvh-var(--consent-h,0px))');
  });
});
