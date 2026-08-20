/**
 * TC-03 (P0, trust) — /nri may not publish a subscription refund the code
 * cannot issue.
 *
 * At HEAD, app/nri/page.tsx sold NRI Premium (₹5,000/yr) with:
 *
 *   "Yes — full refund within 14 days, no questions asked. Pro-rated refund
 *    within 90 days."                                     (FAQ answer)
 *   "cancel anytime · 14-day full refund"                 (hero fine print)
 *   "Full refund within 14 days."                         (closing CTA)
 *   "14-day money back"                                   (CTA checklist)
 *
 * Read off the server, no refund exists for a subscription at all:
 *
 *  - `subscriptionService.cancel()` (apps/api/src/services/subscription.service
 *    .ts) does exactly one thing: flips MarketplaceSubscription.status to
 *    CANCELLED and returns "Access continues until end of current billing
 *    period." It moves no money and calls no gateway.
 *  - `subscribe()` writes a `marketplaceSubscription` row and nothing else —
 *    there is no `Payment` row and no `PujaBooking` for the annual fee.
 *  - The ONLY refund engine, `refund.service.processRefund`, opens with
 *    `prisma.pujaBooking.findUnique({ where: { id: bookingId } })` and refunds
 *    the captured Payment attached to that booking. A subscription has neither,
 *    so the refund queue cannot see it. A grep for `refund` across
 *    subscription.service.ts returns nothing.
 *
 * So "no questions asked" is a promise with no code behind it, and the 90-day
 * pro-rata is worse: nothing in the repo pro-rates anything (the plan-change
 * answer on /pricing was corrected for exactly this reason — `subscribe()`
 * cancels and re-charges at full price in both directions).
 *
 * Comments are stripped before scanning so the note recording a removed promise
 * cannot trip or satisfy its own guard.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const API = path.resolve(WEB, '../api');

function code(rel: string): string {
  return fs
    .readFileSync(path.join(WEB, rel), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const NRI_PAGES = ['app/nri/page.tsx', 'app/nri/ca/page.tsx'];

describe('TC-03 — the NRI Premium pages promise no unbacked subscription refund', () => {
  it.each(NRI_PAGES)('%s publishes no 14-day money-back window', (rel) => {
    const src = code(rel);
    expect(src).not.toMatch(/14[-\s]day (full )?(refund|money[-\s]back)/i);
    expect(src).not.toMatch(/refund within 14 days/i);
    expect(src).not.toMatch(/no questions asked/i);
  });

  it.each(NRI_PAGES)('%s publishes no pro-rated refund window', (rel) => {
    const src = code(rel);
    expect(src).not.toMatch(/pro[-\s]?rat/i);
    expect(src).not.toMatch(/refund within 90 days/i);
  });

  it('/nri says plainly that cancelling stops renewal rather than refunding', () => {
    const src = code('app/nri/page.tsx');
    expect(src).toMatch(/end of (the |your )?(paid |current )?(year|billing period|term)/i);
    expect(src).toMatch(/no automatic refund|not refunded automatically|does not refund/i);
  });
});

describe('TC-03 — the server really cannot refund a subscription', () => {
  it('subscriptionService.cancel moves no money', () => {
    const svc = fs.readFileSync(path.join(API, 'src/services/subscription.service.ts'), 'utf8');
    const stripped = svc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // Not one refund call site anywhere in the subscription service.
    expect(stripped).not.toMatch(/refund/i);
  });

  it('the only refund engine is scoped to a puja booking', () => {
    const refundSvc = fs.readFileSync(path.join(API, 'src/services/refund.service.ts'), 'utf8');
    expect(refundSvc).toMatch(/prisma\.pujaBooking\.findUnique/);
    expect(refundSvc).not.toMatch(/marketplaceSubscription/);
  });
});
