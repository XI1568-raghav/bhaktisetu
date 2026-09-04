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

  /**
   * REWRITTEN 2026-08-28. The first assertion here used to be
   *
   *   expect(src).toMatch(/end of (the |your )?(paid |current )?(year|billing period|term)/i)
   *
   * and it could not tell the truth from the lie it existed to forbid. TC-03's
   * FIRST remediation replaced an unbacked "14-day no-questions-asked refund"
   * with an equally unbacked "your access runs to the end of the year you have
   * already paid for", and this regex was written to require that sentence. The
   * second pass established the sentence was false — `cancel()` performs one
   * write, `status: 'CANCELLED'`, and every entitlement consumer filters on
   * `status: 'ACTIVE'`, so access stops at the moment of cancellation — and
   * corrected the page to say the opposite.
   *
   * The regex stayed green through both, because it matches "runs to the end of
   * the year you paid for" AND "does not run to the end of the year you paid
   * for". So the guard was satisfied by whichever claim happened to be on the
   * page, which is the one thing it was meant to decide. The case below proves
   * that with the old pattern rather than asserting it.
   *
   * The replacement pins the page to the shared constant instead of to prose:
   * NRI_CANCELLATION_SENTENCE is the single place the truth is stated, the hero
   * / FAQ / closing CTA all interpolate it, and it cannot drift into a promise
   * without failing here.
   */
  it('the superseded regex could not distinguish the truth from the lie', () => {
    const OLD = /end of (the |your )?(paid |current )?(year|billing period|term)/i;
    const LIE = 'your access runs to the end of the year you have already paid for';
    const TRUTH = 'it does not hold your access open to the end of the year you have already paid for';
    expect(OLD.test(LIE)).toBe(true);
    expect(OLD.test(TRUTH)).toBe(true);
  });

  it('/nri states the cancellation truth from the one shared constant', async () => {
    const src = code('app/nri/page.tsx');
    // The page must interpolate the constant, not re-word it. Three surfaces
    // quote it (hero fine print, refund FAQ, closing CTA) and they drifted
    // apart the last time each carried its own sentence.
    expect(src).toMatch(/NRI_CANCELLATION_SENTENCE/);
    expect(src).toMatch(/no automatic refund|not refunded automatically|does not refund/i);

    const { NRI_CANCELLATION_SENTENCE } = await import('../app/nri/plan-availability');
    // The constant itself must say access stops NOW. Asserted as a positive
    // claim, so restoring the period-end promise fails here even though it
    // would still have matched the old pattern.
    expect(NRI_CANCELLATION_SENTENCE).toMatch(/immediately/i);
    expect(NRI_CANCELLATION_SENTENCE).toMatch(/stops the next renewal/i);
    expect(NRI_CANCELLATION_SENTENCE).toMatch(
      /does not hold your access open|does not run to the end/i,
    );
  });

  it('no NRI surface promises access to the end of the paid period', () => {
    // The affirmative form of the lie, on both pages. `(?!.*does not)` is not
    // used — the negated sentence is matched and excluded explicitly below, so
    // a rewording like "will not hold" cannot slip through a lookahead.
    for (const rel of NRI_PAGES) {
      for (const line of code(rel).split('\n')) {
        if (!/end of (the |your )?(paid |current )?(year|billing period|term)/i.test(line)) continue;
        expect(
          /does not|doesn't|not hold|stops? at that moment|immediately/i.test(line),
          `${rel} promises access to the end of the paid period: ${line.trim()}`,
        ).toBe(true);
      }
    }
  });
});

describe('TC-03 — the cancel confirm dialog does not promise period-end access', () => {
  /**
   * ADDED 2026-09-01. /account/subscriptions is the only screen from which a
   * devotee actually cancels, and its `confirm()` string read "You will keep
   * access until your current billing cycle ends." — the same false sentence
   * the API used to return, in the one place it changes a decision. The route
   * it posts to (`/subscriptions/cancel-auto-renew`) calls
   * cancelRazorpaySubscription, which stops the Razorpay billing at cycle end
   * and flips the local row to CANCELLED immediately; isPremium() requires
   * ACTIVE, so access stops now.
   */
  const CANCEL_SCREEN = 'app/account/subscriptions/page.tsx';

  it('tells the devotee access ends now, and separates that from billing', () => {
    const src = code(CANCEL_SCREEN);
    const confirms = [...src.matchAll(/confirm\(\s*([\s\S]*?)\)\s*\)/g)].map((m) => m[1]);
    expect(confirms.length).toBeGreaterThan(0);
    const blob = confirms.join('\n');
    expect(blob).not.toMatch(/keep access until/i);
    expect(blob).not.toMatch(/until your current billing cycle ends/i);
    expect(blob).toMatch(/Access ends now/i);
    expect(blob).toMatch(/not be charged again/i);
  });

  it('makes no other period-end access claim anywhere on the screen', () => {
    const src = code(CANCEL_SCREEN);
    for (const line of src.split('\n')) {
      if (!/keep access|access continues|access until/i.test(line)) continue;
      expect(false, `${CANCEL_SCREEN} promises continued access: ${line.trim()}`).toBe(true);
    }
  });
});

describe('TC-03 — the server really cannot refund a subscription', () => {
  it('subscriptionService.cancel moves no money', () => {
    const svc = fs.readFileSync(path.join(API, 'src/services/subscription.service.ts'), 'utf8');
    const stripped = svc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // Not one refund CALL SITE anywhere in the subscription service.
    expect(stripped).not.toMatch(
      /refundService|processRefund|createRefund|issueRefund|\.refunds?\.create|payments\.refund/i,
    );
    // The word itself may appear only in the cancellation disclosure, which
    // exists precisely to tell the devotee that no refund happens. Widened from
    // a blanket `not.toMatch(/refund/i)` when that disclosure was added: the
    // blanket form made the honest sentence indistinguishable from a refund
    // rail, so every surviving mention is now checked line by line instead.
    const mentions = stripped.split('\n').filter((l) => /refund/i.test(l));
    expect(mentions.length).toBeGreaterThan(0);
    for (const line of mentions) {
      expect(
        /No refund is issued automatically/.test(line),
        `unexpected refund mention in subscription.service.ts: ${line.trim()}`,
      ).toBe(true);
    }
  });

  it('the only refund engine is scoped to a puja booking', () => {
    const refundSvc = fs.readFileSync(path.join(API, 'src/services/refund.service.ts'), 'utf8');
    expect(refundSvc).toMatch(/prisma\.pujaBooking\.findUnique/);
    expect(refundSvc).not.toMatch(/marketplaceSubscription/);
  });
});
