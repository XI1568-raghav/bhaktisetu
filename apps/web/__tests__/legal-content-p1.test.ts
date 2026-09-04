/**
 * legal-content P1 sweep (prod-sweep-raw-2026-08-12) — LEG-05, LEG-06, LEG-08,
 * LEG-09, LEG-10 (partial), LEG-11 (partial), LEG-12.
 *
 * Every assertion here locks a published legal/policy statement against the
 * thing that actually happens. The dominant failure mode on this site is a
 * published number nobody charges and a published guarantee nobody honours, so
 * these are deliberately content assertions against the source of the pages
 * themselves rather than render tests — a render test would pass on a page that
 * renders the wrong sentence perfectly.
 *
 * NOT covered here, deliberately: the puja cancellation ladder. Three ladders
 * are live at once (a hardcoded badge, /refunds' 100/50/0, and the engine's
 * 100/75/50/25) and picking one is the owner's commercial decision, not this
 * file's. LEG-01/LEG-03/CM-04 stay open.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { COMPANY } from '../lib/company';
import { FAQ_GROUPS } from '../lib/faqs';
import {
  NRI_PREMIUM_BENEFITS,
  nriPremiumFeatures,
  nriPremiumIsSellable,
  type EntitlementKey,
} from '../../api/src/services/subscription-entitlements';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const readRepo = (rel: string) => readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');

const terms = read('app/terms/page.tsx');
const refunds = read('app/refunds/page.tsx');
const privacy = read('app/privacy/page.tsx');
const contact = read('app/contact/page.tsx');
const shipping = read('app/shipping/page.tsx');
const nri = read('app/nri/page.tsx');
const nriPujas = read('app/nri-pujas/page.tsx');
const nriCa = read('app/nri/ca/page.tsx');
const whyDarshya = read('app/why-darshya/page.tsx');
const cartContext = read('components/CartContext.tsx');

describe('LEG-05 — Terms section 7 states the commission schedule the engine actually charges', () => {
  it('drops the third commission schedule (25% puja / 30% astrology / 25% wellness)', () => {
    expect(terms).not.toContain('Astrology consultation: 30%');
    expect(terms).not.toContain('Wellness session: 25%');
    expect(terms).not.toMatch(/Puja booking: 25%/);
  });

  it('publishes the uniform 20% platform / 80% provider doctrine', () => {
    expect(terms).toMatch(/20%[\s\S]{0,200}80%|80%[\s\S]{0,200}20%/);
  });

  it('does not name MedusaJS — the store runs on Prisma StoreProduct/StoreOrder', () => {
    expect(terms).not.toContain('MedusaJS');
  });

  it('does not publish a per-80G-receipt fee that nothing in the API charges', () => {
    // apps/api/src/routes/donations.ts mints the receipt number and the PDF
    // with no fee of any kind. A published fee is a charge that never happens.
    expect(terms).not.toMatch(/flat fee per 80G receipt/i);
    expect(nri).not.toMatch(/80G receipt PDF[\s\S]{0,120}(₹|&#8377;)49/);
  });
});

describe('LEG-06 — the video-proof guarantee describes the process that exists', () => {
  it('/refunds does not promise an automatic full refund at 48h', () => {
    // booking.service.escalateStaleBookings runs at 72h, only for
    // status 'priest_assigned', and DELIBERATELY issues no refund — it routes
    // the booking to the admin queue (routes/admin-bookings.ts /refunds/pending).
    expect(refunds).not.toMatch(/Video proof not provided within 48 hours/);
    expect(refunds).toContain('missingVideoEscalationHours');
  });

  it('the published escalation window equals the one the sweep actually uses', () => {
    const svc = readRepo('apps/api/src/services/booking.service.ts');
    const m = svc.match(/escalateStaleBookings\(staleHours\s*=\s*(\d+)\)/);
    expect(m, 'escalateStaleBookings signature not found').not.toBeNull();
    expect(COMPANY.refunds.missingVideoEscalationHours).toBe(Number(m![1]));
  });

  it('/nri/ca does not promise an automatic 48h no-video refund', () => {
    expect(nriCa).not.toMatch(/Refund if no video uploaded within 48h/);
  });

  it('/why-darshya does not offer an unconditional satisfaction refund', () => {
    expect(whyDarshya).not.toMatch(/Full refund if\s*\n?\s*you&apos;re not satisfied/);
  });

  /**
   * LEG-06, second half (re-opened by adversarial verify). Moving the published
   * window from 48h to 72h and dropping the word "automatic refund" fixed the
   * NUMBER but not the SCOPE. The replacement copy said the sweep "cancels the
   * booking automatically and places it in our refund review queue" as though
   * it applied to any booking with no video — and it does not.
   *
   * escalateStaleBookings (apps/api/src/services/booking.service.ts) filters on
   * ONE status:
   *
   *     where: { status: 'priest_assigned', videoProofUrl: null, … }
   *
   * BookingStatus has nine members (prisma/schema.prisma:93). The audit's own
   * evidence is three bookings sitting in `completed` with videoProofUrl NULL
   * and one in `video_uploaded` whose proof URL is two literal spaces. Not one
   * of them is reachable by the sweep, so a devotee in exactly the situation
   * the guarantee is written for waits for an automation that will never look
   * at their booking.
   *
   * The published text must therefore name the limit and tell that devotee to
   * write in instead of waiting.
   */
  it('the sweep really does cover a single status — the premise of the test below', () => {
    const svc = readRepo('apps/api/src/services/booking.service.ts');
    const sweep = svc.slice(svc.indexOf('async escalateStaleBookings'));
    expect(sweep).toMatch(/status:\s*'priest_assigned'/);
    // one status, not a set: `status: { in: [...] }` would change the answer
    expect(sweep.slice(0, 2000)).not.toMatch(/status:\s*\{\s*in:/);
  });

  it('/refunds does not describe the 72h sweep as covering every booking', () => {
    expect(refunds).not.toMatch(/we cancel the booking automatically and place it/i);
  });

  it('/refunds names the status the sweep is limited to', () => {
    expect(refunds).toMatch(/still waiting on (its |the )?assigned pandit/i);
  });

  it('/refunds tells a devotee outside that scope to write in rather than wait', () => {
    expect(refunds).toMatch(/rather than waiting for the sweep/i);
    expect(refunds).toMatch(/completed/);
  });
});

/**
 * The phrase that would betray each NRI Premium benefit if the FAQ advertised
 * it. Keyed by `EntitlementKey` so adding a benefit to the registry without
 * adding a needle here is a TYPE error, not a silent hole.
 */
const BENEFIT_NEEDLE: Record<EntitlementKey, RegExp> = {
  'ads.suppressed': /\bno ads\b/i,
  'booking.nri_surcharge_waived': /surcharge/i,
  'booking.priority_window': /priority booking/i,
  'consultation.weekly_priest_call': /weekly 1:1|priest (video )?call/i,
  'donation.receipt_pdf_free': /80G receipt/i,
  'ai_astro.unlimited': /unlimited AI/i,
};

/**
 * LEG-08, re-cut for TC-13. The old guard read the DECLARED literal and
 * hard-required the fiction.
 *
 * It scraped the `features: [` block out of
 * apps/api/src/services/subscription.service.ts and then demanded that the
 * published FAQ answer repeat four of those strings — 'NRI surcharge', 'ads',
 * 'Priority booking' and '80G receipt'. Every one of the six benefits carries
 * `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts, so
 * the list a BUYER is shown (`nriPremiumFeatures()`, applied on the way out of
 * `getPlans()` by `advertisedFeaturesFor()`) is EMPTY, and
 * `nriPremiumIsSellable()` is false: the plan is withdrawn and both activation
 * rails answer 400. The guard was pinning /faqs to a feature list no buyer is
 * shown, for a plan nobody can buy — and it was the single thing blocking
 * lib/faqs.ts from telling the truth (TC-03 / TC-04 / TC-13).
 *
 * It reads the DERIVED list now. The contract is two-sided, so it keeps
 * working the day a benefit is wired and the plan is re-opened: every ENFORCED
 * benefit must appear in the answer, and no UNENFORCED benefit may.
 */
describe('LEG-08 — one NRI Premium feature list, matching the SKU that is sold', () => {
  const nriFaq = FAQ_GROUPS.flatMap((g) => g.faqs).find((f) =>
    /annual NRI membership/i.test(f.q),
  );

  it('the FAQ answer exists', () => {
    expect(nriFaq).toBeDefined();
  });

  it('does not promise 4 free pujas — no such entitlement exists in the plan', () => {
    // subscription.service.ts nri_premium_yearly.features has six entries and
    // none of them is a free puja.
    expect(nriFaq!.a).not.toMatch(/free pujas/i);
    expect(nriFaq!.a).not.toMatch(/prasad shipping discount/i);
    expect(nriFaq!.a).not.toMatch(/NRI-exclusive aarti recordings/i);
  });

  it('the advertised list is derived from the enforcement registry, not typed', () => {
    expect(nriPremiumFeatures()).toEqual(
      NRI_PREMIUM_BENEFITS.filter((b) => b.enforcedBy !== null).map((b) => b.label),
    );
    expect(nriPremiumIsSellable()).toBe(nriPremiumFeatures().length > 0);
  });

  it('quotes every benefit the server actually enforces', () => {
    for (const label of nriPremiumFeatures()) {
      expect(nriFaq!.a, `FAQ omits enforced benefit "${label}"`).toContain(label);
    }
  });

  it('advertises no benefit the server does not enforce', () => {
    for (const benefit of NRI_PREMIUM_BENEFITS) {
      if (benefit.enforcedBy !== null) continue;
      expect(
        nriFaq!.a,
        `FAQ advertises unenforced benefit "${benefit.label}" (${benefit.key})`,
      ).not.toMatch(BENEFIT_NEEDLE[benefit.key]);
    }
  });

  it('says the plan is withdrawn for as long as the server refuses to sell it', () => {
    // The two cases above own the re-opened case; this one owns today's.
    if (nriPremiumIsSellable()) return;
    expect(nriFaq!.a).toMatch(/not currently sold/i);
  });
});

describe('LEG-05 — the published take rate equals the rate the engine charges', () => {
  it('Terms says 20% and the API charges 20%', () => {
    const astro = readRepo('apps/api/src/services/astrologer.service.ts');
    const m = astro.match(/ASTROLOGER_PLATFORM_RATE\s*=\s*([\d.]+)/);
    expect(m, 'ASTROLOGER_PLATFORM_RATE not found').not.toBeNull();
    expect(Number(m![1])).toBe(0.2);

    const schema = readRepo('apps/api/prisma/schema.prisma');
    expect(schema).toMatch(/commission\s+Decimal\s+@default\(0\.20\)/);

    expect(terms).toMatch(/uniform <strong>20%<\/strong>/);
  });
});

describe('LEG-09 — currency claims match the one payment rail that exists', () => {
  it('/nri leads with the INR amount that Razorpay actually charges', () => {
    expect(nri).not.toContain('Go Premium — $60 USD / year');
    expect(nri).toMatch(/Go Premium — ₹5,000/);
  });

  it('/nri-pujas does not claim local-currency checkout', () => {
    expect(nriPujas).not.toMatch(/shown in your local currency at checkout/);
  });
});

describe('LEG-10 (partial) — the operator is identified on every policy page', () => {
  it('/privacy, /refunds and /contact render the operatedBy line', () => {
    expect(privacy).toContain('operatedByLine');
    expect(refunds).toContain('operatedByLine');
    expect(contact).toContain('operatedByLine');
  });
});

describe('LEG-11 — one grievance contact, one SLA, one source of truth', () => {
  it('company.ts owns the grievance block', () => {
    expect(COMPANY.grievance).toBeDefined();
    expect(COMPANY.grievance.email).toMatch(/@/);
    expect(typeof COMPANY.grievance.acknowledgeHours).toBe('number');
    expect(typeof COMPANY.grievance.resolveBusinessDays).toBe('number');
  });

  it('/privacy and /refunds stop hardcoding the alias and the two SLAs', () => {
    expect(privacy).not.toContain('grievance@darshya.online');
    expect(refunds).not.toContain('grievance@darshya.online');
    expect(privacy).not.toMatch(/acknowledge within 48\s*\n?\s*hours and resolve within 30 days/);
    expect(refunds).not.toMatch(/respond within 15 business\s*\n?\s*days/);
  });

  it('/privacy/v2 no longer links the grievance officer to a 404', () => {
    const v2 = read('app/privacy/v2/page.tsx');
    expect(v2).not.toMatch(/href="\/grievance"/);
    expect(v2).not.toContain('dpo@darshya.online');
    expect(v2).toMatch(/grievanceOfficerLine/);
  });

  it('both pages read the grievance block from company.ts', () => {
    const sourced = /COMPANY\.grievance|grievanceOfficerLine|grievanceSlaLine/;
    expect(privacy).toMatch(sourced);
    expect(refunds).toMatch(sourced);
    expect(contact).toMatch(sourced);
  });
});

describe('LEG-12 — one delivery-fee rule across the policy, the badge and the cart', () => {
  it('company.ts owns the delivery constants', () => {
    expect(COMPANY.store.freeDeliveryAboveInr).toBe(499);
    expect(COMPANY.store.flatDeliveryFeeInr).toBe(49);
  });

  it('the charging code uses exactly what company.ts publishes', () => {
    // COM-06/S-09 moved this computation out of CartContext into a shared
    // module (apps/web/lib/store-pricing.ts) whose API twin refuses an order
    // when the two disagree. That is strictly better than the inline ternary
    // this test originally scraped — but it also means the old regex, which
    // hunted for two literal digits, can no longer see the rule: the expression
    // is now `>= FREE_DELIVERY_THRESHOLD_INR ? 0 : DELIVERY_FEE_INR`.
    //
    // So assert the CONSTANTS rather than the expression. Same guarantee, and
    // it no longer breaks the next time someone refactors the arithmetic:
    // the policy page and the charging code must never publish two different
    // thresholds.
    const pricing = readRepo('apps/web/lib/store-pricing.ts');

    const threshold = pricing.match(/FREE_DELIVERY_THRESHOLD_INR\s*=\s*(\d+)/);
    const fee = pricing.match(/DELIVERY_FEE_INR\s*=\s*(\d+)/);
    expect(threshold, 'FREE_DELIVERY_THRESHOLD_INR not found in lib/store-pricing.ts').not.toBeNull();
    expect(fee, 'DELIVERY_FEE_INR not found in lib/store-pricing.ts').not.toBeNull();
    expect(Number(threshold![1])).toBe(COMPANY.store.freeDeliveryAboveInr);
    expect(Number(fee![1])).toBe(COMPANY.store.flatDeliveryFeeInr);

    // And the rule itself is free-above-threshold, flat-fee-below — not a
    // weight band, not a percentage.
    expect(pricing).toMatch(/>=\s*FREE_DELIVERY_THRESHOLD_INR\s*\?\s*0\s*:\s*DELIVERY_FEE_INR/);

    // The cart must consume that module rather than recomputing its own total.
    expect(cartContext).toMatch(/store-pricing/);
  });

  it('/shipping publishes the real rule, not ₹999 and a weight band', () => {
    expect(shipping).not.toMatch(/(₹|&#8377;)999/);
    expect(shipping).not.toMatch(/based on weight and\s*\n?\s*destination/);
    expect(shipping).toMatch(/deliveryFeeLine\(\)|COMPANY\.store/);
  });
});
