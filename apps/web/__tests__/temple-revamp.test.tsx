/**
 * Temple manager revamp (2026-08-05) — regression guards.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Temple manager — availableSlots editor (was missing from the form)', () => {
  it('puja form collects available time slots and submits them as availableSlots', () => {
    const src = read('app/temple-portal/pujas/page.tsx');
    expect(src).toContain('formSlots');
    expect(src).toContain('availableSlots');
    expect(src).toMatch(/Available Time Slots/);
  });

  it('edit form pre-fills the slot editor from the offering availableSlots', () => {
    const src = read('app/temple-portal/pujas/page.tsx');
    expect(src).toMatch(/setFormSlots\(slots\)/);
  });
});

describe('Temple manager — bookings list (was dashboard top-10 only)', () => {
  it('has a bookings page reading /temple-portal/bookings', () => {
    const src = read('app/temple-portal/bookings/page.tsx');
    expect(src).toContain('/temple-portal/bookings');
  });

  it('bookings is in the portal sidebar', () => {
    const src = read('app/temple-portal/layout.tsx');
    expect(src).toContain('/temple-portal/bookings');
  });
});
