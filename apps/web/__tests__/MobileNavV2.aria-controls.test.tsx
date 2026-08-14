/**
 * A11Y-13 / A11Y-14 — the mobile nav sheet's accordion wiring.
 *
 * A11Y-14 as measured on the running app (prod sweep 2026-08-12): the sheet
 * renders five category accordions; each trigger sets `aria-controls` to the
 * id of its panel unconditionally, but the panel `<ul id={panelId}>` is only
 * rendered while that accordion is the open one. So on every page of the site
 * four of the five triggers pointed `aria-controls` at an element that does
 * not exist — a dangling IDREF (WCAG 4.1.2, and every automated audit flags
 * it). The trigger that IS open resolves correctly, which is why this survived.
 *
 * A11Y-13 is asserted here too so the closed-sheet `inert` cannot silently
 * regress: with the sheet closed its ~22 links must not be reachable.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

import { MobileNavV2 } from '../components/MobileNavV2';

function openSheet() {
  render(<MobileNavV2 />);
  fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
}

/** Accordion triggers = buttons inside the "Categories" nav. */
function accordionTriggers(): HTMLButtonElement[] {
  const nav = document.querySelector<HTMLElement>('nav[aria-label="Categories"]');
  if (!nav) throw new Error('Categories nav not rendered');
  return Array.from(nav.querySelectorAll('button'));
}

function dangling(): string[] {
  return accordionTriggers()
    .map((b) => b.getAttribute('aria-controls'))
    .filter((id): id is string => !!id && !document.getElementById(id));
}

describe('A11Y-14 — no dangling aria-controls on the mobile nav accordions', () => {
  it('renders the five category accordions (finding surface is live)', () => {
    openSheet();
    expect(accordionTriggers().length).toBeGreaterThanOrEqual(4);
  });

  it('every aria-controls on a closed accordion resolves to a real element', () => {
    openSheet();
    expect(
      dangling(),
      'aria-controls must be dropped while the panel is unrendered, not left pointing at nothing',
    ).toEqual([]);
  });

  it('the collapsed triggers are still announced as collapsed', () => {
    openSheet();
    const collapsed = accordionTriggers().filter(
      (b) => b.getAttribute('aria-expanded') === 'false',
    );
    expect(collapsed.length).toBeGreaterThan(0);
    for (const b of collapsed) expect(b.getAttribute('aria-controls')).toBeNull();
  });

  it('opening an accordion wires aria-controls to the panel it just rendered', () => {
    openSheet();
    const trigger = accordionTriggers()[0]!;
    fireEvent.click(trigger);
    const id = trigger.getAttribute('aria-controls');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(id, 'the open trigger must point at its panel').toBeTruthy();
    expect(document.getElementById(id!)).toBeTruthy();
    expect(dangling()).toEqual([]);
  });
});

describe('A11Y-13 — the closed sheet is inert', () => {
  it('keeps its links out of reach while closed', () => {
    render(<MobileNavV2 />);
    const el = document.querySelector<HTMLElement>('aside[aria-label="Mobile navigation"]');
    expect(el, 'mobile nav sheet not rendered').toBeTruthy();
    expect(el!.hasAttribute('inert')).toBe(true);
    expect(el!.getAttribute('aria-hidden')).toBe('true');
  });
});
