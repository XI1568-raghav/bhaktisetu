/**
 * Phase 0 booking-fix assertions (booking revamp 2026-08-04).
 *
 * These are source-level regression guards for the dead/broken things the
 * research scan found. They read the real page source and assert the fix is
 * present — so a future refactor that re-introduces the dead button / broken
 * link / missing reject fails CI loudly instead of silently shipping.
 *
 * Why source-level (not full DOM render): these pages are large client
 * components with heavy auth/query deps; the bugs were "wired or not" wiring
 * defects, which a source assertion catches deterministically and fast.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Phase 0 — devotee booking fixes', () => {
  it('D1: My Bookings Cancel button is wired to an onClick handler', () => {
    const src = read('app/bookings/page.tsx');
    // The bug: a <button>Cancel</button> with NO onClick (dead UI).
    // The fix wires handleCancel -> POST /bookings/{id}/cancel.
    expect(src).toContain('handleCancel');
    expect(src).toMatch(/onClick=\{\(\)\s*=>\s*handleCancel\(booking\.id\)\}/);
    expect(src).toContain('/cancel');
  });

  it('D2: checkout success links to /bookings, not the dead /profile/bookings', () => {
    const src = read('app/checkout/success/page.tsx');
    expect(src).toContain('href="/bookings"');
    expect(src).not.toContain('href="/profile/bookings"');
  });

  it('D7: booking detail page offers Reschedule calling the reschedule endpoint', () => {
    const src = read('app/bookings/view/page.tsx');
    expect(src).toContain('/reschedule');
    expect(src).toContain('handleReschedule');
    expect(src).toMatch(/Reschedule/);
  });
});

describe('Phase 0 — pandit portal fixes', () => {
  it('D3: priest bookings list renders a Reject/Decline action wired to reject', () => {
    const src = read('app/priest/bookings/page.tsx');
    // API had PATCH /priest/bookings/:id/reject but no UI ever rendered it.
    expect(src).toMatch(/handleAction\(booking\.id,\s*'reject'\)/);
    expect(src).toContain('Decline');
    // The released booking returns to `confirmed` server-side. This used to
    // assert the client's optimistic status map, which PF-07 replaced with a
    // refetch — the row can leave the active view and the tab counts have to
    // move with it, so guessing locally is wrong.
    expect(src).toMatch(/await fetchBookings\(\)/);
  });

  it('T1: priest dashboard has an on-duty toggle calling /priest/availability', () => {
    const src = read('app/priest/page.tsx');
    expect(src).toContain('/priest/availability');
    expect(src).toMatch(/toggleDuty|onDuty/);
  });
});
