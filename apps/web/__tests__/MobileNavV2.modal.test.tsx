/**
 * A11Y-04 — the mobile nav overlay is not a modal — plus the closed-drawer
 * defect found by hand at 390x844 against the running app.
 *
 * Measured on http://localhost:3000 at 390x844 before this suite existed.
 *
 * CLOSED drawer:
 *   { ariaHidden: "true", translate: "100%", rectLeft: 398 (= viewport width),
 *     display: "flex", visibility: "visible", hasInertAttr: false,
 *     tabbableChildren: 22 }
 *   => a keyboard user tabs into an invisible off-screen drawer, and the
 *      aria-hidden subtree can still take focus (a WCAG failure in itself).
 *
 * OPEN drawer:
 *   { role: null, ariaModal: null, mainInert: false, mainAriaHidden: null,
 *     insideFocusables: 22, outsideFocusables: 177,
 *     active: "BUTTON:Close menu", activeInside: false }
 *   and the 15 tab stops after the trigger were ALL outside the overlay
 *   ("Explore Temples", "Book a Puja", "Live Darshan", "Ask a Pandit", ...).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// Stub auth-context so the sheet renders without a provider tree.
vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

import { MobileNavV2 } from '../components/MobileNavV2';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function sheet(): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    'aside[aria-label="Mobile navigation"]',
  );
  if (!el) throw new Error('mobile nav sheet not rendered');
  return el;
}

function hamburger(): HTMLElement {
  return screen.getByRole('button', { name: /open menu/i });
}

/** Every focusable in the document that is not inside an inert subtree. */
function reachableFocusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert]'),
  );
}

/** Background = a body child that is not the portal root holding the sheet. */
function backgroundBodyChildren(): HTMLElement[] {
  const portalRoot = sheet().closest('body > *');
  return Array.from(document.body.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el !== portalRoot,
  );
}

function openSheet() {
  fireEvent.click(hamburger());
}

describe('MobileNavV2 closed drawer is inert (hand-found defect)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('marks the closed off-screen drawer inert so it holds no tab stops', () => {
    render(<MobileNavV2 />);
    const aside = sheet();

    // Still aria-hidden and still rendered (it animates in), but it must not
    // be focusable — 22 tabbable children were measured behind aria-hidden.
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(aside.querySelectorAll(FOCUSABLE).length).toBeGreaterThan(0);
    expect(aside.hasAttribute('inert')).toBe(true);

    // Nothing inside the closed drawer is reachable.
    const reachableInside = reachableFocusables().filter((el) =>
      aside.contains(el),
    );
    expect(reachableInside).toEqual([]);
  });

  it('drops inert while open and restores it on close', () => {
    render(<MobileNavV2 />);
    expect(sheet().hasAttribute('inert')).toBe(true);

    openSheet();
    expect(sheet().hasAttribute('inert')).toBe(false);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(sheet().hasAttribute('inert')).toBe(true);
  });
});

describe('MobileNavV2 open overlay is a real modal (A11Y-04)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes the open sheet as a modal dialog', () => {
    render(<MobileNavV2 />);
    openSheet();
    const aside = sheet();
    expect(aside).toHaveAttribute('role', 'dialog');
    expect(aside).toHaveAttribute('aria-modal', 'true');
    expect(aside).toHaveAttribute('aria-label', 'Mobile navigation');
    expect(aside.getAttribute('aria-hidden')).not.toBe('true');
  });

  it('moves focus into the sheet on open', () => {
    render(<MobileNavV2 />);
    openSheet();
    const aside = sheet();
    expect(aside.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toHaveAttribute('aria-label', 'Close menu');
  });

  it('makes every background control unreachable while open', () => {
    render(<MobileNavV2 />);
    // Some background chrome to stand in for the 177 measured controls.
    const bg = document.createElement('div');
    bg.innerHTML =
      '<a href="/temples">Explore Temples</a><a href="/pujas">Book a Puja</a><button>Live Darshan</button>';
    document.body.appendChild(bg);

    openSheet();

    for (const el of backgroundBodyChildren()) {
      expect(el.hasAttribute('inert')).toBe(true);
    }
    const aside = sheet();
    const reachable = reachableFocusables();
    expect(reachable.length).toBeGreaterThan(0);
    expect(reachable.every((el) => aside.contains(el))).toBe(true);
  });

  it('removes background inert again on close', () => {
    render(<MobileNavV2 />);
    openSheet();
    expect(backgroundBodyChildren().some((el) => el.hasAttribute('inert'))).toBe(
      true,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    for (const el of backgroundBodyChildren()) {
      expect(el.hasAttribute('inert')).toBe(false);
    }
  });

  it('traps Tab inside the sheet — last item wraps to first', () => {
    render(<MobileNavV2 />);
    openSheet();
    const aside = sheet();
    const items = Array.from(aside.querySelectorAll<HTMLElement>(FOCUSABLE));
    expect(items.length).toBeGreaterThan(1);

    const last = items[items.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(items[0], { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('Escape closes the sheet and restores focus to the hamburger', () => {
    render(<MobileNavV2 />);
    const trigger = hamburger();
    trigger.focus();
    openSheet();
    expect(document.activeElement).not.toBe(trigger);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(document.activeElement).toBe(trigger);
  });

  it('the Close button closes the sheet and restores focus to the hamburger', () => {
    render(<MobileNavV2 />);
    const trigger = hamburger();
    openSheet();

    // The hamburger relabels to "Close menu" while open, so scope to the sheet.
    fireEvent.click(within(sheet()).getByRole('button', { name: /close menu/i }));

    expect(document.activeElement).toBe(trigger);
    expect(sheet().hasAttribute('inert')).toBe(true);
  });

  it('keeps the body scroll-lock behaviour it already had', () => {
    render(<MobileNavV2 />);
    expect(document.body.style.overflow).not.toBe('hidden');
    openSheet();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
