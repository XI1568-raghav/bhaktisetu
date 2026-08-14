/**
 * A11Y-03 — keyboard operability of the desktop mega-menu (WCAG 2.1.1, Level A).
 *
 * Measured on the running app (http://localhost:3000, 1280x800) before this
 * suite existed:
 *   - ArrowDown on the "Worship" trigger => { menuOpen: true, movedIntoMenu: false }
 *     i.e. the panel opens but focus never leaves the trigger.
 *   - With the Worship panel open, the four tab stops after the Worship trigger
 *     were ["BUTTON:Library", "BUTTON:Astrology", "BUTTON:Yatra", "BUTTON:Shop"]
 *     and the first panel item only appeared at tab position 7. Because every
 *     trigger re-opened its own panel on focus, forward Tab could only ever
 *     reach the LAST trigger's items — Worship/Library/Astrology/Yatra were
 *     unreachable.
 *
 * These tests pin the fix: the trigger opens on Enter/Space/ArrowDown AND moves
 * focus into the panel, arrows rove between items, Escape closes and restores
 * focus to the trigger, and tabbing across triggers no longer swaps the panel.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryNav } from '../components/CategoryNav';
import { CATEGORY_TREE } from '../lib/category-tree';

const FOCUSABLE = 'a[href], button:not([disabled])';

function trigger(label: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
}

/** The open panel is the element the open trigger points at via aria-controls. */
function openPanel(): HTMLElement | null {
  const expanded = screen
    .getAllByRole('button')
    .find((b) => b.getAttribute('aria-expanded') === 'true');
  if (!expanded) return null;
  const id = expanded.getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
}

function panelItems(): HTMLElement[] {
  const panel = openPanel();
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
}

describe('CategoryNav keyboard operability (A11Y-03)', () => {
  it('closed nav puts no panel content in the tab order', () => {
    const { container } = render(<CategoryNav />);
    const tabbables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    // Only the five triggers.
    expect(tabbables).toHaveLength(CATEGORY_TREE.length);
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it.each(CATEGORY_TREE.map((c) => [c.label] as const))(
    'ArrowDown on the %s trigger opens the panel AND moves focus into it',
    (label) => {
      render(<CategoryNav />);
      const t = trigger(label);
      t.focus();
      fireEvent.keyDown(t, { key: 'ArrowDown' });

      expect(t).toHaveAttribute('aria-expanded', 'true');
      const panel = openPanel();
      expect(panel).not.toBeNull();
      const items = panelItems();
      expect(items.length).toBeGreaterThan(0);
      // The defect: activeElement stayed on the trigger.
      expect(panel!.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(items[0]);
    },
  );

  it('Enter on a trigger opens the panel and focuses its first item', () => {
    render(<CategoryNav />);
    const t = trigger('Worship');
    t.focus();
    fireEvent.keyDown(t, { key: 'Enter' });
    expect(document.activeElement).toBe(panelItems()[0]);
  });

  it('Space on a trigger opens the panel and focuses its first item', () => {
    render(<CategoryNav />);
    const t = trigger('Astrology');
    t.focus();
    fireEvent.keyDown(t, { key: ' ' });
    expect(document.activeElement).toBe(panelItems()[0]);
  });

  it('ArrowUp on a trigger opens the panel and focuses its LAST item', () => {
    render(<CategoryNav />);
    const t = trigger('Shop');
    t.focus();
    fireEvent.keyDown(t, { key: 'ArrowUp' });
    const items = panelItems();
    expect(items.length).toBeGreaterThan(1);
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('ArrowDown/ArrowUp rove between panel items and wrap', () => {
    render(<CategoryNav />);
    const t = trigger('Worship');
    t.focus();
    fireEvent.keyDown(t, { key: 'ArrowDown' });

    const items = panelItems();
    expect(items.length).toBeGreaterThan(2);

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0]);

    // wrap backwards off the first item
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[items.length - 1]);

    // wrap forwards off the last item
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('Home/End jump to the first and last panel item', () => {
    render(<CategoryNav />);
    const t = trigger('Yatra');
    t.focus();
    fireEvent.keyDown(t, { key: 'ArrowDown' });
    const items = panelItems();

    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);

    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('Escape from inside the panel closes it and returns focus to the trigger', () => {
    render(<CategoryNav />);
    const t = trigger('Library');
    t.focus();
    fireEvent.keyDown(t, { key: 'ArrowDown' });
    expect(panelItems().length).toBeGreaterThan(0);
    expect(document.activeElement).not.toBe(t);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

    expect(t).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(t);
  });

  it('tabbing across triggers does not swap the open panel out from under the user', () => {
    render(<CategoryNav />);
    const worship = trigger('Worship');
    worship.focus();
    fireEvent.keyDown(worship, { key: 'ArrowDown' });
    expect(worship).toHaveAttribute('aria-expanded', 'true');

    // Simulate Tab landing on each of the next triggers. Before the fix each
    // one re-opened its OWN panel on focus, which is what made the first four
    // categories unreachable by forward Tab.
    for (const label of ['Library', 'Astrology', 'Yatra', 'Shop']) {
      const t = trigger(label);
      t.focus();
      fireEvent.focus(t);
      expect(t).toHaveAttribute('aria-expanded', 'false');
    }
    expect(worship).toHaveAttribute('aria-expanded', 'true');
  });

  it('ArrowRight/ArrowLeft still move between triggers', () => {
    render(<CategoryNav />);
    const worship = trigger('Worship');
    worship.focus();
    fireEvent.keyDown(worship, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(trigger('Library'));

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(worship);
  });

  it('ArrowDown on an already-open trigger still moves focus into the panel', () => {
    render(<CategoryNav />);
    const t = trigger('Worship');
    fireEvent.click(t);
    expect(t).toHaveAttribute('aria-expanded', 'true');
    t.focus();
    fireEvent.keyDown(t, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(panelItems()[0]);
  });
});
