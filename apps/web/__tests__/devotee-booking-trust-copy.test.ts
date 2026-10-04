import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatInrExact } from '../lib/format-money';

/**
 * Devotee end-to-end customer test, 2026-10-05. Four things a booked devotee
 * sees that were wrong:
 *
 *  1. The cancel dialog rounded each figure on its own: refund 376.50 and
 *     retained 125.50 printed as ₹377 and ₹126, which add up to ₹503 on a
 *     ₹502 booking. Money screens must not invent a rupee.
 *  2. The help line printed "+91 80-BHAKTI-00" — a placeholder, not a number —
 *     above a tel: link to the real one.
 *  3. The footer promised "Free cancellation to 24h / Full refund before the
 *     pandit is assigned". The engine refunds 100% at 48h or more, 75% from 24
 *     to 48h and refuses inside 24h, whether or not a pandit is assigned.
 *  4. The payment card called the booking total (puja + platform fee) "Puja
 *     Amount", under a footer promising "one price, shown first".
 */
const root = join(__dirname, '..');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const src = (rel: string) => strip(readFileSync(join(root, rel), 'utf8'));

describe('formatInrExact', () => {
  it('prints paise only when there are some, so the parts always add up', () => {
    expect(formatInrExact(376.5)).toBe('₹376.50');
    expect(formatInrExact(125.5)).toBe('₹125.50');
    expect(formatInrExact(502)).toBe('₹502');
    expect(formatInrExact(1234.5)).toBe('₹1,234.50');
    expect(formatInrExact(0)).toBe('₹0');
  });

  it('refund + retained prints the booking total for a half-rupee quote', () => {
    const refund = 376.5;
    const kept = 125.5;
    expect(refund + kept).toBe(502);
    expect(formatInrExact(refund)).not.toBe('₹377');
  });
});

describe('booking detail and footer wording', () => {
  it('shows a real support number, not a placeholder', () => {
    const s = src('app/bookings/view/page.tsx');
    expect(s).not.toMatch(/BHAKTI-00/);
    expect(s).toMatch(/\+91 92551 09400/);
  });

  it('formats the cancel quote through the exact formatter', () => {
    expect(src('app/bookings/view/page.tsx')).toMatch(/formatInrExact\(cancelQuote\.refundAmountInr\)/);
    expect(src('app/bookings/view/page.tsx')).not.toMatch(/Math\.round\(amount\)/);
  });

  it('the footer states the real cancellation ladder', () => {
    const s = src('app/layout.tsx');
    expect(s).not.toMatch(/Free cancellation to 24h/);
    expect(s).not.toMatch(/Full refund before the pandit is assigned/);
    expect(s).toMatch(/Free cancellation up to 48h before/);
    expect(s).toMatch(/75% back from 24 to 48h/);
  });

  it('labels the booking total as a total, not as the puja price', () => {
    expect(src('app/bookings/view/page.tsx')).not.toMatch(/>Puja Amount</);
  });
});
