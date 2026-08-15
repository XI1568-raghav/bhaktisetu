/**
 * A11Y-08 (in-lane slice) — the booking wizards are silent to assistive tech.
 *
 * Measured on the live wizard (prod sweep 2026-08-12, /pujas/book?slug=…),
 * identical at the initial step and after each of four Continue presses:
 *   {"fieldsets":0,"legends":0,"radiogroups":0,"radios":0,"forms":1,
 *    "progressbars":0}   liveRegions: []
 * and `grep aria-current` on the file returns nothing.
 *
 * app/pujas/book/page.tsx is owned by another agent in this sweep, so this
 * suite covers the two sibling wizards that carry the identical defect and are
 * in this lane — /pujas/home-puja/book and /pujas/marriage/book — through the
 * shared indicator they now both render.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Calendar, CreditCard, Home, Package, User } from 'lucide-react';

import { WizardSteps } from '../components/ui/WizardSteps';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const STEPS = [
  { id: 1, label: 'Event details', icon: Calendar },
  { id: 2, label: 'Select pandit', icon: User },
  { id: 3, label: 'Samagri', icon: Package },
  { id: 4, label: 'Your details', icon: Home },
  { id: 5, label: 'Review & pay', icon: CreditCard },
];

function liveRegions(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[aria-live], [role="status"], [role="alert"]'),
  );
}

describe('A11Y-08 — the step indicator carries step semantics', () => {
  it('renders an ordered list with one item per step', () => {
    render(<WizardSteps steps={STEPS} current={2} />);

    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('marks exactly the active step with aria-current="step"', () => {
    render(<WizardSteps steps={STEPS} current={2} />);

    const current = screen
      .getAllByRole('listitem')
      .filter((li) => li.getAttribute('aria-current') === 'step');

    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toContain('Select pandit');
  });

  it('names the progress landmark', () => {
    render(<WizardSteps steps={STEPS} current={1} />);
    expect(screen.getByRole('navigation', { name: /progress/i })).toBeTruthy();
  });

  it('tells a screen-reader user how far along they are', () => {
    render(<WizardSteps steps={STEPS} current={2} />);

    const regions = liveRegions();
    expect(regions.length, 'no aria-live region anywhere in the wizard').toBeGreaterThan(0);
    expect(regions.map((r) => r.textContent).join(' ')).toMatch(
      /Step 2 of 5.*Select pandit/,
    );
  });

  it('announces politely, and re-announces when the step changes', () => {
    const { rerender } = render(<WizardSteps steps={STEPS} current={2} />);

    const region = liveRegions()[0]!;
    expect(region.getAttribute('aria-live')).toBe('polite');

    rerender(<WizardSteps steps={STEPS} current={3} />);
    expect(liveRegions()[0]!.textContent).toMatch(/Step 3 of 5.*Samagri/);
  });

  it('does not paint white text on the 3.79:1 saffron-500 fill (A11Y-10)', () => {
    const src = read('components/ui/WizardSteps.tsx');
    expect(src).not.toMatch(/bg-saffron-500\s+text-white/);
    expect(src).not.toMatch(/bg-tulsi-green\s+text-white/);
  });
});

describe('A11Y-08 — both in-lane wizards render the accessible indicator', () => {
  // PF-10 moved the at-home wizard out of page.tsx, which is now the server
  // guard for the route. The component under inspection is unchanged.
  for (const page of [
    'app/pujas/home-puja/book/BookHomePujaClient.tsx',
    'app/pujas/marriage/book/page.tsx',
  ]) {
    it(`${page} uses WizardSteps instead of a bare div stepper`, () => {
      const src = read(page);
      expect(src).toMatch(/<WizardSteps\b/);
      expect(
        src,
        'the old inaccessible stepper markup must be gone, not merely duplicated',
      ).not.toMatch(/\{steps\.map\(/);
    });
  }
});
