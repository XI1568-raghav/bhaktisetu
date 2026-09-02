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
import { readFileSync } from 'node:fs';
import path from 'node:path';

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
import AuthLayout from '../../layout';
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
    const dialog = screen.getByRole('dialog', { name: /cookies for darshan/i });

    // The real invariant, unchanged: the fix must never buy height by trimming
    // the disclosure. Every word is still in the DOM.
    expect(dialog.textContent).toContain('Essential cookies keep your account and bookings working');
    expect(dialog.textContent).toContain('only run with your consent');

    // Truncation is still banned. `line-clamp` and `truncate` DESTROY text —
    // the reader cannot recover it by any action.
    expect(String(dialog.innerHTML)).not.toMatch(/line-clamp|truncate/);
  });

  /**
   * AMENDED 2026-09-01. This assertion previously also banned `overflow-y-auto`
   * and `max-h-[`, on the reasoning that a scroll region is a way of hiding the
   * notice. A later pass measured a case that reasoning had not seen, and the
   * ban had to give way to it rather than the other way round.
   *
   * Four earlier passes shaved fixed pixels off the COLLAPSED banner, taking it
   * 262px -> 227px. But the height was still unbounded, so the guarantee was
   * only ever "227px, at today's copy, at the six sizes someone measured". On
   * the live site at 390x844 the collapsed banner is 277px (32.8% of the
   * viewport) — and expanding "Manage preferences", one tap on the banner's own
   * middle button, takes it to 521px, or 61.7%, leaving 227px of a 649px
   * sign-in card visible. The settings panel is ~244px of content that was
   * never in the padding budget, so no amount of arithmetic on the collapsed
   * state reaches it.
   *
   * A bounded, viewport-relative cap does reach it, and scrolling is not
   * hiding: every word stays reachable, which is what the assertion above now
   * enforces directly. What a naive `overflow-y: auto` on the whole card DOES
   * get wrong is the action row — measured, it pushed Reject/Accept/Manage to
   * y 840-936, off the bottom of an 844px screen. So that is what this test
   * checks instead, and it is a stronger check than the ban it replaces.
   */
  it('bounds its height by viewport fraction, and never scrolls the actions away', () => {
    render(<CookieBanner />);
    const dialog = screen.getByRole('dialog', { name: /cookies for darshan/i });
    const html = String(dialog.innerHTML);

    // AMENDED AGAIN 2026-09-02 (sixth pass). The cap is no longer written at
    // the call site — it is a policy in globals.css, read through a custom
    // property, because the number the sign-in page needs is not a fraction of
    // anything (see the block below). What survives here is the property that
    // made the fifth pass's cap defensible in the first place: whatever the
    // banner ends up bounded BY, the fallback must still be viewport-relative,
    // so a browser that never resolves the variable is no worse off than before.
    const cap = html.match(/max-h-\[([^\]]+)\]/);
    expect(cap, 'the banner card must still declare a height cap').toBeTruthy();
    const fallback = /^var\(--[a-z-]+,\s*([^)]+)\)$/.exec(cap![1]);
    expect(
      fallback ? fallback[1].trim() : cap![1],
      `height cap "${cap![1]}" must resolve to a viewport-relative value, not a fixed constant`,
    ).toMatch(/d?vh$/);

    // The load-bearing part: the action row must not live inside the scroller.
    const scroller = dialog.querySelector('[class*="overflow-y-auto"]');
    if (scroller) {
      for (const name of [/reject all/i, /manage preferences/i, /accept all/i]) {
        const btn = screen.getByRole('button', { name });
        expect(
          scroller.contains(btn),
          `"${btn.textContent}" is inside the scroll region — it can scroll out of reach`
        ).toBe(false);
      }
    }
  });

  it('every banner control still clears the 44px tap floor', () => {
    render(<CookieBanner />);
    for (const name of [/reject all/i, /manage preferences/i, /accept all/i]) {
      const btn = screen.getByRole('button', { name });
      expect(String(btn.className)).toMatch(/(^|\s)h-11(\s|$)/);
    }
  });

  /**
   * SIXTH PASS, 2026-09-02 — the two halves of the fix must stay wired to each
   * other.
   *
   * The fifth pass's flat `max-h-[45dvh]` was measured NOT to close the finding:
   * at 390x844 with "Manage preferences" expanded the banner is 388px, Sign In
   * is at y 508-552 with 0 of 44px on screen, and elementFromPoint at the
   * button's own centre returns the notice. A 1280x800 laptop failed even
   * collapsed. A fraction cannot work, because what the page needs is a
   * CONSTANT — the button's bottom edge is at y=552 at every width below sm, so
   * the notice must be given `100dvh` minus that, not a share of it.
   *
   * That constant belongs to the sign-in card, so the tightened cap is scoped to
   * the auth segment with `body:has([data-auth-shell])` in globals.css, and
   * `data-auth-shell` is rendered by app/auth/layout.tsx. Two files, one
   * coupling, no compiler or type between them: rename or drop either side and
   * the banner silently reverts to 45dvh with nothing red. That is the exact
   * regression this asserts — it reads the attribute out of the CSS selector and
   * requires the rendered auth layout to match it, so it cannot pass by
   * agreeing with itself.
   */
  it('the tightened auth cap in globals.css matches an attribute the auth layout renders', () => {
    // __dirname resolves under vitest's transform; import.meta.url does not
    // come back as a file: URL here.
    const css = readFileSync(path.resolve(__dirname, '../../../globals.css'), 'utf8');

    // 1. the default is still declared, so non-auth routes keep a cap at all
    expect(css).toMatch(/--consent-max-h:\s*45dvh/);

    // 2. the auth-scoped override exists and subtracts a constant from the
    //    viewport rather than taking a fraction of it
    const scoped = /body:has\((\[[a-z-]+\])\)\s*\{\s*--consent-max-h:\s*([^;]+);/.exec(css);
    expect(scoped, 'globals.css must scope a tighter --consent-max-h to the auth shell').toBeTruthy();
    expect(scoped![2]).toContain('calc(100dvh -');

    // 3. and the element that selector needs is really in the auth layout's
    //    output — this is the half that silently rots
    const { container } = render(
      <AuthLayout>
        <div />
      </AuthLayout>,
    );
    expect(
      container.querySelector(scoped![1]),
      `globals.css keys the auth consent cap off "${scoped![1]}", which app/auth/layout.tsx does not render`,
    ).not.toBeNull();
  });
});
