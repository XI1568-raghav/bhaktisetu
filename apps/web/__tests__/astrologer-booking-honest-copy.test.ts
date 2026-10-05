import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Customer test 2026-10-05 (astrologer, local E2E). Booking, payment, the
 * astrologer's dashboard, completion and the 80/20 earnings all work. Three
 * sentences around them promised more than the system does:
 *  - "Your astrologer has been notified" — notification is email-best-effort and
 *    the dashboard is what is reliable.
 *  - "Refund if astrologer doesn't join within 10 min" — nothing measures 10
 *    minutes; the real rule is cancel from this page, refund-eligible within 24h
 *    of paying (or 24h+ before a chosen slot).
 *  - The booking page said nothing when the astrologer is offline, yet took
 *    payment for an immediate start.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const read = (p: string) => strip(readFileSync(join(__dirname, '..', p), 'utf8'));

describe('consultation success page makes only true promises', () => {
  const src = read('app/consultation/[id]/success/page.tsx');
  it('does not claim the astrologer was notified', () => {
    expect(src).not.toMatch(/has been notified/i);
  });
  it('does not promise a 10-minute auto refund', () => {
    expect(src).not.toMatch(/within 10 min/i);
  });
  it('states the real cancel/refund rule', () => {
    expect(src).toMatch(/cancel/i);
    expect(src).toMatch(/24 hours/i);
  });
  it('does not promise an email as certain', () => {
    expect(src).not.toMatch(/Room link also emailed to you\./);
  });
});

describe('booking page is honest when the astrologer is offline', () => {
  const src = read('app/astrology/[id]/book/page.tsx');
  it('tells the devotee the astrologer is offline and what happens next', () => {
    expect(src).toMatch(/offline right now/i);
    expect(src).toMatch(/dashboard/i);
  });
  it('only shows that notice when the astrologer is not online', () => {
    expect(src).toMatch(/!astrologer\.isOnline/);
  });
});
