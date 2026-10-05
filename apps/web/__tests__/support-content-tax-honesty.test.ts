import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { COMPANY } from '../lib/company';
import { FAQ_ITEMS, AUTO_REPLY_RULES } from '../lib/support';
import { FREE_DELIVERY_THRESHOLD_INR, DELIVERY_FEE_INR } from '../lib/store-pricing';

/**
 * LEG-10 (prod sweep 2026-08-12), remaining web-side half — the tax story.
 *
 * LEG-10's own fix list has three parts. Two are the owner's (incorporate,
 * register for GST) and one is the API's (retitle the PDF away from "TAX
 * INVOICE"). The third is code, and it is here: "make the checkout total
 * consistent with the tax-inclusive claim in Terms".
 *
 * COM-06/S-09 removed the browser-computed 5% "GST (est.)" from the cart, and
 * `lib/store-pricing.ts` is now `subtotal + delivery` with no tax line — the
 * SAME function the API runs and enforces. But lib/support.ts, which is what
 * the FAQ, the help centre and the live-chat bot read from, was never swept.
 * It still tells a customer, in three separate places, that money is computed
 * at checkout that no code path computes:
 *
 *   sd-4  "Duties and taxes are calculated at checkout for transparency."
 *         computeStoreOrderTotals() takes no destination and no HSN code. It
 *         is `Σ(unitPrice × qty) + deliveryFee`. Nothing about a customs duty
 *         is calculated anywhere in either app — a grep of apps/api for
 *         duty/customs across the store path returns nothing. An overseas
 *         buyer is told the landed cost is settled and then gets a bill from
 *         the carrier.
 *
 *   bp-8  "Invoice includes GST breakup."
 *         COMPANY.tax.HAS_GST_REGISTRATION_VERIFIED is false and gstin is
 *         null. There is no GST component to break up, and a document that
 *         itemises GST without a GSTIN is the exact thing LEG-10 is about.
 *
 *   sd-2 + the store auto-reply  "free over ₹999, else ₹49"
 *         The cart charges free-above-₹499 / flat ₹49 (store-pricing.ts, and
 *         the API refuses an order whose total disagrees). LEG-12 already
 *         fixed /shipping and the store badge from COMPANY.store; this file
 *         was missed and is the surface support staff quote from.
 *
 * The rule these tests lock: lib/support.ts may not publish a money rule that
 * no shipped function implements, and every number in it comes from the module
 * that the charge itself comes from.
 */

/**
 * Comments in lib/support.ts quote the sentences that were removed and why —
 * without stripping them, the written record of a banned string would trip the
 * assertion that bans it.
 */
const supportSrc = readFileSync(path.resolve(__dirname, '..', 'lib/support.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const faq = (id: string) => {
  const item = FAQ_ITEMS.find((f) => f.id === id);
  expect(item, `FAQ ${id} not found`).toBeDefined();
  return item!;
};

const autoReply = (keyword: string) => {
  const rule = AUTO_REPLY_RULES.find((r) => r.keywords.includes(keyword));
  expect(rule, `auto-reply rule for "${keyword}" not found`).toBeDefined();
  return rule!;
};

describe('LEG-10 — support copy does not promise a duty calculation that does not exist', () => {
  it('the shipped totals function computes no tax and no duty', () => {
    // The guard for the guard: if a real duty line ever lands, this test must
    // be revisited rather than silently keeping the copy honest by accident.
    const pricing = readFileSync(path.resolve(__dirname, '..', 'lib/store-pricing.ts'), 'utf8');
    expect(pricing).not.toMatch(/\bduty|duties|customs\b/i);
    expect(pricing).toMatch(/subtotalInr \+ deliveryFeeInr/);
  });

  it('the outside-India FAQ promises no duty calculation and no foreign store delivery', () => {
    // Copy-truth sweep 2026-10-05: store delivery is India-only, so the answer
    // that used to explain landed cost for 40+ countries now says no.
    expect(faq('sd-4').answer).not.toMatch(/calculated at checkout/i);
    expect(faq('sd-4').answer).not.toMatch(/40\+ countries/i);
    expect(faq('sd-4').answer).toMatch(/within India only/i);
  });

  it('it states plainly that prasad is delivered within India only', () => {
    const answer = faq('sd-4').answer;
    expect(answer).toMatch(/prasad[^.]*within India only/i);
    expect(answer).not.toMatch(/write to support/i);
  });

  it('no answer anywhere in the FAQ claims a checkout-time duty or tax calculation', () => {
    for (const item of FAQ_ITEMS) {
      expect(
        item.answer,
        `FAQ ${item.id} still promises a checkout tax/duty calculation`,
      ).not.toMatch(/(dut(y|ies)|taxes)[^.]{0,40}\bare calculated at checkout/i);
    }
  });
});

describe('LEG-10 — support copy does not advertise a GST breakup with no GSTIN', () => {
  it('the platform is on record as not GST-registered', () => {
    expect(COMPANY.tax.HAS_GST_REGISTRATION_VERIFIED).toBe(false);
    expect(COMPANY.tax.gstin).toBeNull();
  });

  it('the invoice FAQ does not promise a GST breakup', () => {
    const answer = faq('bp-8').answer;
    expect(answer).not.toMatch(/GST breakup/i);
    expect(answer).not.toMatch(/business\/GSTIN invoices/i);
  });

  it('it says instead that no GST is charged and the document is not a tax invoice', () => {
    const answer = faq('bp-8').answer;
    expect(answer).toMatch(/not.{0,30}(GST[- ]registered|registered for GST)/i);
    expect(answer).toMatch(/not a (GST )?tax invoice/i);
  });
});

describe('LEG-12 neighbour — the shipping numbers in support come from the cart', () => {
  it('company.ts and store-pricing.ts already agree', () => {
    expect(COMPANY.store.freeDeliveryAboveInr).toBe(FREE_DELIVERY_THRESHOLD_INR);
    expect(COMPANY.store.flatDeliveryFeeInr).toBe(DELIVERY_FEE_INR);
  });

  it('no support surface still quotes the ₹999 threshold nobody charges', () => {
    expect(faq('sd-2').answer).not.toMatch(/999/);
    expect(autoReply('shipping').reply).not.toMatch(/999/);
    expect(supportSrc).not.toMatch(/(free shipping|free delivery)[^.]{0,30}999/i);
  });

  it('both quote the threshold the cart actually applies', () => {
    const threshold = String(COMPANY.store.freeDeliveryAboveInr);
    expect(faq('sd-2').answer).toContain(threshold);
    expect(autoReply('shipping').reply).toContain(threshold);
  });
});
