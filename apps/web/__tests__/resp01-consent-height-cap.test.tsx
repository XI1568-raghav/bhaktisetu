/**
 * RESP-01 (fifth pass) — the consent notice's height must be a BOUNDED
 * FRACTION of the viewport, not a measured constant.
 *
 * WHY THIS FILE EXISTS. Passes two through four shaved fixed pixels off the
 * banner (278 -> 262 -> 227) and each one recorded a per-viewport table of the
 * result. Every one of those tables was taken with the per-category panel
 * COLLAPSED, so none of them saw what one tap on the banner's own middle
 * button does. Measured on the live site (https://darshya.online/auth/login,
 * 2026-09-01, 390x844, consent cleared, scrollY 0):
 *
 *   collapsed                        banner 277px  (32.8% of the viewport)
 *   "Manage preferences" expanded    banner 521px  (61.7%), top edge y=323
 *
 * At 61.7% the 649px sign-in card has 227px left. No padding budget on the
 * collapsed state can reach that, because the settings panel is ~244px of
 * content that was never in the budget.
 *
 * So the guard here is structural, not numeric. It asserts the three things
 * that make the footprint bounded for ANY copy length, ANY expansion state and
 * ANY viewport — including sizes nobody has enumerated:
 *
 *   1. the card carries a cap expressed in viewport units (dvh), not px;
 *   2. the notice lives inside a scroll region, so growth is absorbed there;
 *   3. the action row is a SIBLING of that scroll region, never a descendant.
 *
 * (3) is the one a naive implementation gets wrong, and it is not theoretical:
 * capping the card and putting `overflow-y:auto` on the card itself was tried
 * against the live DOM first and pushed Reject all / Manage preferences / Save
 * preferences to y 840, 892 and 840 — all three below the bottom of an 844px
 * screen, i.e. a consent notice with no reachable way to consent.
 *
 * happy-dom computes no geometry (every rect is 0x0), so none of this is
 * asserted in pixels here — that is exactly the trap the older
 * CookieBanner.test.tsx fell into when it stubbed getBoundingClientRect to a
 * hardcoded 347 and then asserted --consent-h was "347px". These assertions
 * are on real rendered DOM relationships, which happy-dom does model, and each
 * one fails against the pre-fix markup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CookieBanner from '../components/CookieBanner';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function bannerCard(): HTMLElement {
  const dialog = screen.getByRole('dialog', { name: /cookies for darshan/i });
  return dialog.firstElementChild as HTMLElement;
}

/** The scroll region: the one descendant of the card that can scroll. */
function scrollRegion(card: HTMLElement): HTMLElement | null {
  return card.querySelector<HTMLElement>('.overflow-y-auto');
}

describe('RESP-01 — the consent notice is capped to a share of the viewport', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('caps the card in viewport units, so the cap cannot go stale with the copy', () => {
    render(<CookieBanner />);
    const cls = String(bannerCard().className);
    // A px cap would be the same class of mistake as the 227px budget: correct
    // for today's disclosure at today's font size and wrong the moment either
    // moves. Require the unit to be dvh (dynamic viewport height — vh is wrong
    // on mobile Safari, where the URL bar makes vh larger than what is on
    // screen, which would let the banner exceed its own cap).
    // AMENDED 2026-09-02. This required the literal `max-h-[NNdvh]`. A later
    // pass moved the policy into CSS — the class is now
    // `max-h-[var(--consent-max-h,45dvh)]` and globals.css gives the variable
    // 45dvh, 70dvh at sm, and `clamp(164px, calc(100dvh - 576px), 45dvh)` on
    // the auth shell so the sign-in card is guaranteed room. That is strictly
    // better than a flat cap, and the literal-form check would have forced it
    // back. The INVARIANT is what matters: the cap is expressed in dynamic
    // viewport units and never as a bare pixel constant.
    const literalDvh = /(^|\s)max-h-\[\d+dvh\](\s|$)/;
    const varWithDvhFallback = /(^|\s)max-h-\[var\(--[a-z-]+,\s*\d+dvh\)\](\s|$)/;
    expect(
      literalDvh.test(cls) || varWithDvhFallback.test(cls),
      `consent cap must be dvh-based, got: ${cls}`,
    ).toBe(true);

    // And the variable itself must never be handed a bare px cap. This is the
    // half the class string cannot show, so it is checked at the source — a
    // px floor inside clamp() is fine (it is a minimum, not the cap), but a
    // declaration with no dvh at all is the 227px mistake returning.
    const css = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8');
    const decls = [...css.matchAll(/--consent-max-h:\s*([^;]+);/g)].map((m) => m[1]!.trim());
    expect(decls.length, 'no --consent-max-h declarations found — check moved?').toBeGreaterThan(0);
    for (const d of decls) {
      expect(d, `--consent-max-h: ${d} is not viewport-relative`).toMatch(/dvh/);
    }
    // ...and the card must be a flex column, or the scroll region below has no
    // free space to be shrunk out of and the cap clips instead of scrolling.
    expect(cls).toMatch(/(^|\s)flex(\s|$)/);
    expect(cls).toMatch(/(^|\s)flex-col(\s|$)/);
  });

  it('puts the notice inside a scroll region that can actually shrink', () => {
    render(<CookieBanner />);
    const region = scrollRegion(bannerCard());
    expect(region).not.toBeNull();
    const cls = String(region!.className);
    // min-h-0 defeats a flex item's automatic minimum size; without it the
    // item refuses to shrink below its content and the cap is inert.
    expect(cls).toMatch(/(^|\s)min-h-0(\s|$)/);
    // flex-auto (flex:1 1 auto), never flex-1 (flex:1 1 0%). With a 0% basis
    // the scroller's hypothetical main size is 0 and min-h-0 has already
    // removed the floor, so an auto-height container collapses to just the
    // button row — the notice would render at zero height.
    expect(cls).toMatch(/(^|\s)flex-auto(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)flex-1(\s|$)/);
    // The disclosure itself has to be the thing inside it.
    expect(region!.contains(document.getElementById('darshya-cookie-title'))).toBe(true);
    expect(region!.textContent).toContain('Essential cookies keep your account');
  });

  it('keeps every consent control OUTSIDE the scroll region', () => {
    render(<CookieBanner />);
    const region = scrollRegion(bannerCard())!;
    for (const name of [/reject all/i, /accept all/i, /manage preferences/i]) {
      const btn = screen.getByRole('button', { name });
      expect(region.contains(btn)).toBe(false);
    }
  });

  it('absorbs the expanded per-category panel into the scroll region', () => {
    // This is the 521px case. The panel must land inside the scroller so the
    // banner's own height does not grow by ~244px; and the controls, including
    // the Save button that only exists in this state, must stay outside it.
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: /manage preferences/i }));

    const region = scrollRegion(bannerCard())!;
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);
    for (const cb of checkboxes) expect(region.contains(cb)).toBe(true);

    for (const name of [/reject all/i, /save preferences/i, /hide settings/i]) {
      expect(region.contains(screen.getByRole('button', { name }))).toBe(false);
    }
  });

  it('does not change what the notice says at any breakpoint', () => {
    // The cap is a layout change and must stay one. Shortening a DPDP/UK-GDPR
    // disclosure is a compliance decision; if a later pass reaches for the copy
    // instead of the geometry, this fails.
    render(<CookieBanner />);
    const text = bannerCard().textContent ?? '';
    expect(text).toContain(
      'Essential cookies keep your account and bookings working.',
    );
    expect(text).toContain('only run with your consent');
    expect(text).toContain('Cookie Policy');
    expect(screen.getByRole('heading', { name: /cookies for darshan/i })).toBeTruthy();
  });
});
