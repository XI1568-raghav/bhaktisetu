/**
 * PF-11 (prod sweep 2026-08-12, P3) — the wedding wizard showed an unquantified
 * "+ GST" through every step where the couple is actually deciding.
 *
 * Observed on step 1: the persistent sidebar read "Tier Traditional /
 * Duration 4-hour ceremony / Amount ₹25,000 + GST". The rupee figure existed —
 * the page already computes "GST (18%) ₹4,500" and "Estimated total ₹29,500" —
 * but only inside the step-5 review block. So for four of five steps the number
 * on screen was ₹25,000 against a real commitment of ₹29,500, and the ₹4,500
 * gap surfaced only after names, date, pandit and venue had been entered.
 *
 * These tests render the wizard at its initial step and require the sidebar to
 * carry the quantified line, plus require both places to agree.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import BookMarriage from '../app/pujas/marriage/book/page';
import { marriagePricingTiers } from '../lib/home-pujas';

/** The tier the wizard opens on. */
const DEFAULT_TIER = marriagePricingTiers.find((t) => t.slug === 'traditional')!;
const AMOUNT = DEFAULT_TIER.price;
const GST = Math.round(AMOUNT * 0.18);
const TOTAL = Math.round(AMOUNT * 1.18);

function sidebarText(): string {
  const aside = document.querySelector('aside');
  if (!aside) throw new Error('wedding summary sidebar not rendered');
  return aside.textContent ?? '';
}

beforeEach(() => {
  cleanup();
});

describe('PF-11 — the sidebar quantifies GST from step 1', () => {
  it('the fixture the finding measured is still the default tier', () => {
    expect(AMOUNT).toBe(25000);
    expect(GST).toBe(4500);
    expect(TOTAL).toBe(29500);
  });

  it('shows the rupee value of the GST, not a bare "+ GST"', () => {
    render(<BookMarriage />);
    const text = sidebarText();
    expect(text).toContain(GST.toLocaleString('en-IN'));
  });

  it('shows the estimated total the couple will actually be quoted', () => {
    render(<BookMarriage />);
    expect(sidebarText()).toContain(TOTAL.toLocaleString('en-IN'));
  });

  it('names the rate so the number is checkable', () => {
    render(<BookMarriage />);
    expect(sidebarText()).toMatch(/GST\s*\(18%\)/);
  });

  it('no longer leaves an unquantified "+ GST" dangling in the sidebar', () => {
    render(<BookMarriage />);
    // The bare marker: a "+ GST" with no digits attached to it.
    expect(sidebarText()).not.toMatch(/\+\s*GST(?!\s*\()/);
  });

  it('still shows the pre-tax amount, so the breakdown is not replaced by a total', () => {
    render(<BookMarriage />);
    expect(sidebarText()).toContain(AMOUNT.toLocaleString('en-IN'));
  });
});
