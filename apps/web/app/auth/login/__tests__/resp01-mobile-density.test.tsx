/**
 * RESP-01 — the cookie consent card buries the /auth/login form at 390x844.
 *
 * WHAT WAS MEASURED (not asserted here — see the caveat at the bottom).
 * Chromium via Playwright, viewport 390x844, the repo's own compiled Tailwind
 * bundle (apps/web/.next/static/css), the real markup of app/auth/layout.tsx +
 * app/auth/login/page.tsx + components/CookieBanner.tsx, MobileBottomTabs
 * correctly absent (it returns null on /auth/*):
 *
 *   BEFORE   banner 278px tall, top edge y=566
 *            card top y=96  (main's pt-16, then the auth wrapper's py-8)
 *            card height 569px
 *            Sign In  y 596-640      →  0 of 44px visible
 *            document.elementFromPoint(195, 618) === the banner's <h2>
 *
 *   AFTER    banner 262px tall, top edge y=582
 *            card height 489px
 *            Sign In  y 539-583      → 43 of 44px visible
 *            document.elementFromPoint(195, 561) === the Sign In button
 *
 * The page was always scrollable (document height 1208px against an 844px
 * viewport), so "un-tappable" overstated it — the button could be reached by
 * scrolling. What was true, and is what this fix addresses, is that the
 * primary CTA had zero pixels on screen at first paint and a tap at its centre
 * hit the consent banner instead.
 *
 * HOW THE FIX WORKS. Every vertical step between the top of the card and the
 * Sign In button is tightened below sm (640px) and restored at sm:, and the
 * banner's outer gutter and button-grid gaps are tightened the same way. No
 * copy is removed, shortened, clamped or collapsed at any breakpoint — the
 * DPDP/UK-GDPR notice is untouched — and no tap target drops below 44px, which
 * is why "Continue with Google" keeps py-3 and every banner button keeps h-11.
 *
 * WHAT THIS TEST CAN AND CANNOT DO. happy-dom has no layout engine, so this
 * asserts the *spacing budget* that produced the geometry above rather than
 * the geometry itself: it sums the un-prefixed (i.e. mobile) vertical spacing
 * utilities on the chrome between the card top and the Sign In button, and on
 * the banner. It reads rendered className values, never source text, so it
 * cannot be fooled by a commented-out class. It will catch a silent revert of
 * any one of these steps. It will NOT catch a new regression of the same class
 * — e.g. someone adding a tall element to the card, or lengthening the notice
 * so it wraps to another line. Only a real-layout runner catches that, and the
 * web suite does not have one.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/auth-context')>(
    '../../../../lib/auth-context',
  );
  return {
    ...actual,
    useAuth: () => ({
      signInWithCredentials: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithGoogle: vi.fn(),
      isAuthenticated: false,
      user: null,
      isLoading: false,
    }),
  };
});

vi.mock('../../../../lib/supabase', () => ({
  getSupabaseBrowserClient: () => null,
}));

import LoginPage from '../page';
import CookieBanner from '../../../../components/CookieBanner';

/**
 * Vertical space, in px, contributed by the MOBILE (un-prefixed) spacing
 * utilities on one element. A `sm:` / `md:` / `lg:` prefixed class is ignored
 * on purpose: this is a budget for viewports below 640px, which is where the
 * banner and the form compete for the same 844px.
 *
 * Tailwind's spacing unit is 0.25rem = 4px, so `py-4` is 4 * 4 * 2 = 32px.
 */
const AXIS_MULTIPLIER: Record<string, number> = {
  // both vertical edges. `p-`/`m-` are all-sides and contribute two edges too —
  // leaving them out was the first version of this helper's own bug: the
  // banner's `p-4` scored 0, so the banner budget passed against the very
  // markup it was written to reject.
  p: 2,
  m: 2,
  py: 2,
  my: 2,
  // one edge
  pt: 1,
  pb: 1,
  mt: 1,
  mb: 1,
};

function mobileVerticalSpacePx(el: Element | null | undefined): number {
  if (!el) return 0;
  let total = 0;
  for (const cls of String(el.className).split(/\s+/)) {
    if (!cls || cls.includes(':')) continue; // breakpoint-prefixed → not mobile
    const m = /^(py|my|pt|pb|mt|mb|p|m)-(\d+(?:\.\d+)?)$/.exec(cls);
    if (!m) continue;
    total += Number(m[2]) * 4 * AXIS_MULTIPLIER[m[1]];
  }
  return total;
}

/**
 * The nearest ANCESTOR of `start` that carries mobile vertical spacing.
 *
 * It starts at `start.parentElement`, never at `start` itself: a control's own
 * py-* is its tap target, not the chrome around it, and counting the input's
 * py-2.5 here would both inflate the budget and reward shrinking a tap target
 * to get back under it. That is the opposite of what this guard is for.
 */
function ancestorWithVerticalSpace(start: Element | null, stopAt: Element | null): Element | null {
  let node = start?.parentElement ?? null;
  while (node && node !== stopAt) {
    if (mobileVerticalSpacePx(node) > 0) return node;
    node = node.parentElement;
  }
  return null;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('RESP-01 — /auth/login vertical budget below sm', () => {
  it('the helper reads mobile utilities only', () => {
    const el = document.createElement('div');
    el.className = 'px-6 py-4 sm:py-8';
    expect(mobileVerticalSpacePx(el)).toBe(32);
    el.className = 'mb-1.5 flex sm:mb-2';
    expect(mobileVerticalSpacePx(el)).toBe(6);
    el.className = 'relative my-3 sm:my-5';
    expect(mobileVerticalSpacePx(el)).toBe(24);
  });

  it('the chrome above the Sign In button stays inside its measured budget', () => {
    render(<LoginPage />);

    const heading = screen.getByRole('heading', { level: 1 });
    const cardHeader = heading.parentElement!;
    const cardBody = cardHeader.nextElementSibling!;

    const signIn = screen.getByRole('button', { name: /^sign in$/i });
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const orLabel = screen.getByText(/^or$/i);
    const mobileTab = screen.getByRole('button', { name: /^mobile$/i });

    const emailBlock = ancestorWithVerticalSpace(emailInput, cardBody)!;
    const passwordBlock = ancestorWithVerticalSpace(passwordInput, cardBody)!;
    const divider = ancestorWithVerticalSpace(orLabel, cardBody)!;
    const tabSwitcher = ancestorWithVerticalSpace(mobileTab, cardBody)!;

    // Sanity: the four blocks resolved to four DIFFERENT elements, so the sum
    // below is not the same node counted repeatedly.
    const resolved = new Set([emailBlock, passwordBlock, divider, tabSwitcher]);
    expect(resolved.size).toBe(4);

    const budget =
      mobileVerticalSpacePx(cardHeader) +
      mobileVerticalSpacePx(heading) +
      mobileVerticalSpacePx(cardBody) +
      mobileVerticalSpacePx(divider) +
      mobileVerticalSpacePx(tabSwitcher) +
      mobileVerticalSpacePx(emailBlock) +
      mobileVerticalSpacePx(passwordBlock);

    // 224px before the fix (py-8 + mb-2 + py-6 + my-5 + p-1/mb-5 + mb-4 + mb-5),
    // 146px after. 224px is what put Sign In 30px below the banner's top edge.
    expect(budget).toBeLessThanOrEqual(148);
    expect(signIn).toBeTruthy();
  });

  it('no tap target was shrunk to buy that space', () => {
    render(<LoginPage />);
    // RESP-06's 44px floor. buttonClass('primary','md') is h-11 = 44px, and the
    // Google button is hand-rolled with py-3 + text-sm = 12 + 20 + 12 = 44px.
    const google = screen.getByRole('button', { name: /continue with google/i });
    expect(String(google.className)).toContain('py-3');
    expect(String(google.className)).not.toMatch(/(^|\s)py-2(\.5)?(\s|$)/);
  });
});

describe('RESP-01 — the consent banner is the other half of the collision', () => {
  it('its mobile gutter and grid gaps stay inside budget', () => {
    render(<CookieBanner />);
    const dialog = screen.getByRole('dialog', { name: /cookies for darshan/i });
    const card = dialog.firstElementChild!;
    const actions = screen.getByRole('button', { name: /reject all/i }).parentElement!;

    // shell pb-4 (16) + card p-4 (2x16=32) + grid mt-3 (12) = 60 before,
    // shell pb-3 (12) + card p-3 (2x12=24) + grid mt-2.5 (10) = 46 after.
    const budget =
      mobileVerticalSpacePx(dialog) +
      mobileVerticalSpacePx(card) +
      mobileVerticalSpacePx(actions);
    expect(budget).toBeLessThanOrEqual(48);
  });

  it('still shows every word of the notice at mobile widths', () => {
    render(<CookieBanner />);
    // The fix must never buy height by trimming the disclosure. No clamp, no
    // line-clamp, no truncate, no max-height scroll region.
    const dialog = screen.getByRole('dialog', { name: /cookies for darshan/i });
    expect(dialog.textContent).toContain('Essential cookies keep your account and bookings working');
    expect(dialog.textContent).toContain('only run with your consent');
    expect(String(dialog.innerHTML)).not.toMatch(/line-clamp|truncate|overflow-y-auto|max-h-\[/);
  });

  it('every banner control still clears the 44px tap floor', () => {
    render(<CookieBanner />);
    for (const name of [/reject all/i, /manage preferences/i, /accept all/i]) {
      const btn = screen.getByRole('button', { name });
      expect(String(btn.className)).toMatch(/(^|\s)h-11(\s|$)/);
    }
  });
});
