/**
 * A11Y-12 — the header search overlay is not exposed as a dialog and drops
 * focus to <body> when it closes.
 *
 * Measured on http://127.0.0.1:3000/ at desktop width (prod sweep 2026-08-12):
 *   on open   { "dialogs": 0, "info": [], "active": "INPUT/Search temples, pujas, aartis…",
 *               "bodyOverflow": "visible" }
 *   on Escape { "dialogs": 0, "active": "BODY " }
 *
 * Focus is correctly moved INTO the input on open; everything else is missing.
 * Landing on <body> means the next Tab restarts at the skip link, so a keyboard
 * user who opens search from the header and changes their mind has to tab back
 * across ~176 controls to get where they were.
 *
 * components/MobileNavV2.tsx already implements the modal contract this copies
 * (role/aria-modal, scroll lock, focus trap, focus restore).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { GlobalSearch } from '../components/GlobalSearch';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** The visible header trigger a user clicks. */
function searchTrigger(): HTMLElement {
  return screen.getAllByRole('button', { name: 'Search' })[0]!;
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="dialog"]');
}

beforeEach(() => {
  document.body.style.overflow = '';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch,
  );
});

describe('A11Y-12 — search overlay is a real dialog', () => {
  it('renders no dialog while closed', () => {
    render(<GlobalSearch />);
    expect(dialog()).toBeNull();
  });

  it('exposes role=dialog, aria-modal and an accessible name when open', () => {
    render(<GlobalSearch />);
    fireEvent.click(searchTrigger());

    const panel = dialog();
    expect(panel, 'the overlay must be exposed as a dialog').not.toBeNull();
    expect(panel!.getAttribute('aria-modal')).toBe('true');
    expect(
      panel!.getAttribute('aria-label') ?? panel!.getAttribute('aria-labelledby'),
      'a dialog needs an accessible name',
    ).toBeTruthy();

    // The one behaviour the sweep found already correct — do not regress it.
    expect(document.activeElement?.tagName).toBe('INPUT');
    expect(panel!.contains(document.activeElement)).toBe(true);
  });

  it('locks body scroll while open and releases it on close', () => {
    render(<GlobalSearch />);
    expect(document.body.style.overflow).not.toBe('hidden');

    fireEvent.click(searchTrigger());
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});

describe('A11Y-12 — focus returns to the trigger, never to <body>', () => {
  it('Escape restores focus to the Search trigger', () => {
    render(<GlobalSearch />);
    const trigger = searchTrigger();
    fireEvent.click(trigger);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('the Close button restores focus to the Search trigger', () => {
    render(<GlobalSearch />);
    const trigger = searchTrigger();
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole('button', { name: /close search/i }));

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('an outside click restores focus to the Search trigger', () => {
    render(<GlobalSearch />);
    const trigger = searchTrigger();
    fireEvent.click(trigger);

    fireEvent.mouseDown(document.body);

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('A11Y-12 — aria-modal is honest: Tab stays inside the dialog', () => {
  it('Tab from the last control wraps to the first', () => {
    render(<GlobalSearch />);
    fireEvent.click(searchTrigger());

    const panel = dialog()!;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    expect(items.length).toBeGreaterThan(1);

    const first = items[0]!;
    const last = items[items.length - 1]!;

    last.focus();
    fireEvent.keyDown(panel, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab from the first control wraps to the last', () => {
    render(<GlobalSearch />);
    fireEvent.click(searchTrigger());

    const panel = dialog()!;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0]!;
    const last = items[items.length - 1]!;

    first.focus();
    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('keeps the close control inside the dialog subtree', () => {
    render(<GlobalSearch />);
    fireEvent.click(searchTrigger());
    expect(
      within(dialog()!).getByRole('button', { name: /close search/i }),
    ).toBeTruthy();
  });
});
