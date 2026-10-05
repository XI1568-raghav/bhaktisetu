import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (p: string) => readFileSync(path.join(__dirname, '..', p), 'utf8');

/**
 * Temple slots are IST. A devotee abroad must never see a bare "6:00 AM" on a
 * booking screen. Each surface below showed one before this wiring.
 */
describe('booking screens state that slot times are IST', () => {
  it('the puja wizard labels slot buttons, states the zone, and shows the local equivalent', () => {
    const src = read('app/pujas/book/page.tsx');
    expect(src).toContain('{withIst(slot.label)}');
    expect(src).toContain('{IST_TIME_NOTE}');
    expect(src).toContain('localEquivalent(selectedDate, selectedSlot)');
    // the three read-outs of the chosen slot all go through the labelled text
    expect(src.match(/selectedSlotText/g)!.length).toBeGreaterThanOrEqual(4);
    expect(src).not.toMatch(
      /slotAvailability\.find\(\(s\) => s\.time === selectedSlot\)\?\.label \|\| selectedSlot\s*\}/,
    );
  });

  it('the offering checkout labels its slot select', () => {
    const src = read('app/checkout/offering/page.tsx');
    expect(src).toContain('{withIst(s.label)}');
    expect(src).toContain('{IST_TIME_NOTE}');
  });

  it('my bookings list and booking view print IST after the time', () => {
    for (const f of ['app/bookings/page.tsx', 'app/bookings/view/page.tsx']) {
      const src = read(f);
      expect(src, f).toContain('${ampm} IST`');
      expect(src, f).toContain('withIst(time.trim())');
    }
  });
});
