/**
 * TC-03 (P0, trust) — /nri, second pass.
 *
 * The first remediation removed the "full refund within 14 days, no questions
 * asked" / "pro-rated refund within 90 days" pair. Verification accepted the
 * deletion and refused the finding as fixed, on two grounds this file closes:
 *
 *  1. THE REPLACEMENT IS ALSO UNBACKED, AND THE GUARD HARD-REQUIRED IT.
 *     The new copy said, three times, that "your access runs to the end of the
 *     year you have already paid for", and tc03-nri-refund-terms.test.ts
 *     asserts `/end of (the |your )?(paid |current )?(year|billing period|term)/i`
 *     — a regex that is satisfied by the false claim and by its negation alike,
 *     so it pins nothing. Read off the server:
 *
 *       SubscriptionService.cancel()  ->  marketplaceSubscription.update({
 *                                           data: { status: 'CANCELLED' } })
 *       SubscriptionService.isPremium ->  findFirst({ status: 'ACTIVE', ... })
 *       lib/ai-usage getActivePlan()  ->  findFirst({ status: 'ACTIVE', ... })
 *
 *     and `model MarketplaceSubscription` has no cancelAtPeriodEnd / grace /
 *     pendingCancel column at all. Cancelling therefore ends access at once.
 *
 *  2. THE ROOT CAUSE IS THAT THE PAGE IS SELLING A WITHDRAWN PLAN.
 *     `nri_premium_yearly` has `enforcedBy: null` on all six benefits, so
 *     nriPremiumIsSellable() is false: getPlans() drops it and both activation
 *     rails throw NRI_PREMIUM_WITHDRAWN_MESSAGE. A refund policy for a purchase
 *     the server refuses to complete is the same defect one layer up.
 *
 * Assertions run against RENDERED text (with <script> payloads removed) and
 * against API SOURCE WITH COMMENTS STRIPPED, so a note describing a deleted
 * claim can neither trip nor satisfy a guard.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

import {
  NRI_PREMIUM_IS_SELLABLE,
  NRI_PREMIUM_WITHDRAWN_NOTICE,
} from '../app/nri/plan-availability';

vi.mock('../components/EmailCapture', () => ({
  default: () => <div data-testid="email-capture" />,
}));

afterEach(cleanup);

const WEB = path.resolve(__dirname, '..');
const API = path.resolve(WEB, '../api');

/** API source with block and line comments removed. */
function apiSource(rel: string): string {
  return fs
    .readFileSync(path.join(API, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

async function renderNri(): Promise<string> {
  const { default: Page } = await import('../app/nri/page');
  const { container } = render(<Page />);
  container.querySelectorAll('script').forEach((s) => s.remove());
  const text = container.textContent ?? '';
  // A silently empty tree would make every negative assertion vacuous.
  expect(text.length).toBeGreaterThan(800);
  return text;
}

describe('TC-03 — the server really does revoke access the moment you cancel', () => {
  const svc = apiSource('src/services/subscription.service.ts');

  it('cancel() writes CANCELLED and nothing else', () => {
    const idx = svc.indexOf('async cancel(userId: string)');
    expect(idx).toBeGreaterThan(-1);
    const body = svc.slice(idx, idx + 900);
    expect(body).toMatch(/status:\s*'CANCELLED'/);
    // No deferred-cancellation bookkeeping of any kind.
    expect(body).not.toMatch(/cancelAtPeriodEnd|cancel_at_period_end|graceUntil|pendingCancel/);
  });

  it('every entitlement check requires status ACTIVE, so CANCELLED loses it at once', () => {
    const premiumIdx = svc.indexOf('async isPremium(');
    expect(premiumIdx).toBeGreaterThan(-1);
    expect(svc.slice(premiumIdx, premiumIdx + 400)).toMatch(/status:\s*'ACTIVE'/);

    const usage = apiSource('src/lib/ai-usage.ts');
    const planIdx = usage.indexOf('async function getActivePlan(');
    expect(planIdx).toBeGreaterThan(-1);
    expect(usage.slice(planIdx, planIdx + 400)).toMatch(/status:\s*'ACTIVE'/);
  });

  it('MarketplaceSubscription has no column that could keep access alive after cancel', () => {
    const schema = fs.readFileSync(path.join(API, 'prisma/schema.prisma'), 'utf8');
    const model = schema.slice(schema.indexOf('model MarketplaceSubscription'));
    const body = model.slice(0, model.indexOf('\n}'));
    expect(body).toMatch(/^\s*status\s+MarketplaceSubscriptionStatus/m);
    expect(body).not.toMatch(/cancelAtPeriodEnd|cancelledAt|graceUntil|pendingCancel/);
  });
});

describe('TC-03 — /nri publishes what cancelling actually does', () => {
  it('does not claim access continues to the end of the paid year', async () => {
    const text = await renderNri();
    expect(text).not.toMatch(/access runs to the end of the year/i);
    expect(text).not.toMatch(/access to the end of your paid year/i);
    expect(text).not.toMatch(/your access runs to the end of/i);
  });

  it('says instead that cancelling ends the subscription immediately', async () => {
    const text = await renderNri();
    expect(text).toMatch(/marked cancelled immediately|ends? (your )?access (at once|immediately)/i);
  });

  it('still refuses the automatic refund the previous wave removed', async () => {
    const text = await renderNri();
    expect(text).not.toMatch(/no questions asked/i);
    expect(text).not.toMatch(/pro[-\s]?rat/i);
    expect(text).toMatch(/not refunded automatically/i);
  });
});

describe('TC-03 — /nri advertises no cancellation window the booking engine refuses', () => {
  it('offers Premium no shorter cancellation notice than anyone else', async () => {
    const text = await renderNri();
    // booking.service.ts throws "Cancellation is not allowed within 24 hours of
    // the scheduled puja time." for EVERY devotee, and lib/cancellation-policy
    // records that the 4-24h and <4h tiers are therefore unreachable and must
    // not be advertised. The comparison table sold "4h notice" as a Premium
    // perk.
    expect(text).not.toMatch(/4h notice/i);
    expect(text).not.toMatch(/Cancellation flexibility/i);
  });

  it('the booking engine really blocks every devotee at 24h', () => {
    const booking = apiSource('src/services/booking.service.ts');
    expect(booking).toMatch(/Cancellation is not allowed within 24 hours of the scheduled puja time/);
    // No subscription tier is consulted anywhere in the cancellation path.
    const cancellation = apiSource('src/services/cancellation.service.ts');
    expect(cancellation).not.toMatch(/premium|nri_premium|isPremium/i);
  });
});

describe('TC-03 — /nri does not sell a plan the server refuses to sell', () => {
  it('the web mirror agrees with the API on whether the plan is sellable', () => {
    const ent = apiSource('src/services/subscription-entitlements.ts');
    const start = ent.indexOf('NRI_PREMIUM_BENEFITS');
    expect(start).toBeGreaterThan(-1);
    const block = ent.slice(start, ent.indexOf('] as const;', start));

    const enforced = (block.match(/enforcedBy:\s*\{/g) ?? []).length;
    const unenforced = (block.match(/enforcedBy:\s*null/g) ?? []).length;
    expect(enforced + unenforced).toBeGreaterThan(0);

    expect(
      NRI_PREMIUM_IS_SELLABLE,
      'apps/api/src/services/subscription-entitlements.ts now enforces ' +
        `${enforced} NRI Premium benefit(s). Update NRI_PREMIUM_IS_SELLABLE in ` +
        'apps/web/app/nri/plan-availability.ts in the same change.',
    ).toBe(enforced > 0);
  });

  it('the notice on the page is the server refusal verbatim', () => {
    const ent = apiSource('src/services/subscription-entitlements.ts');
    const m = /export const NRI_PREMIUM_WITHDRAWN_MESSAGE =([\s\S]*?);/.exec(ent);
    expect(m).toBeTruthy();
    const literal = m![1]
      .split('+')
      .map((part) => part.trim().replace(/^'/, '').replace(/'$/, ''))
      .join('');
    expect(NRI_PREMIUM_WITHDRAWN_NOTICE).toBe(literal);
  });

  it('the page prints that refusal instead of a buy button', async () => {
    // Guarded on the mirror so this test keeps working the day the plan is
    // sellable again — the point is a gate, not a deletion.
    const text = await renderNri();
    if (NRI_PREMIUM_IS_SELLABLE) {
      expect(text).toMatch(/Go Premium/);
      return;
    }
    expect(text).toMatch(/not currently sold/i);
    expect(text).not.toMatch(/Go Premium/);
  });
});

describe('TC-03 — /nri quotes no testimonial for a plan nobody can buy', () => {
  it('the fabricated NRI Premium review is gone', async () => {
    // "Saved over $400 in NRI surcharges" asserts the one benefit the
    // entitlement registry describes as impossible: "No surcharge waiver
    // exists on any booking path." A five-star review from a subscriber of a
    // withdrawn plan is fabricated social proof.
    const text = await renderNri();
    expect(text).not.toMatch(/Saved over \$400/i);
    expect(text).not.toMatch(/NRI Premium since 20\d\d/i);
  });

  it('the registry still says the surcharge waiver does not exist', () => {
    const ent = apiSource('src/services/subscription-entitlements.ts');
    const idx = ent.indexOf("key: 'booking.nri_surcharge_waived'");
    expect(idx).toBeGreaterThan(-1);
    const block = ent.slice(idx, idx + 600);
    expect(block).toMatch(/enforcedBy:\s*null/);
    expect(block).toMatch(/No surcharge waiver exists on any booking path/);
  });
});
