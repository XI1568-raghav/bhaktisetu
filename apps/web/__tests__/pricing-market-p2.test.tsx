/**
 * pricing-market P2 (prod-sweep-raw-2026-08-12) — PM-09a, "No GST treatment
 * anywhere in the pricing model".
 *
 * Grepping /pricing, lib/pricing.ts and the booking page for GST returned zero
 * hits: bare INR plan prices, no tax field on the API plan objects, and no tax
 * line in the booking total. Meanwhile the store checkout had been adding a
 * browser-computed 5% "GST (est.)" on top of a business with no GSTIN, which
 * COM-06/S-09 removed and settled the doctrine for the whole repo
 * (apps/api/src/lib/store-pricing.ts: "NO TAX LINE … quote tax-inclusive
 * prices until a GSTIN and per-HSN rates exist").
 *
 * What is NOT fixable here, and is stated as such in the finding record: the
 * aggregator-vs-supplier question, whether the puja service itself is taxable,
 * TDS 194-O vs 194J, and adding a tax field to the API plan/puja models. All
 * of those are a CA's call plus apps/api, which is out of this lane.
 *
 * What IS fixable is the surface the finding names: /pricing published prices
 * with nothing said about tax at all, so a provider could not tell whether GST
 * would be added at checkout. It is not, and the page now says so, gated on
 * company.ts so the sentence changes itself the day a GSTIN exists.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { COMPANY, taxTreatmentLine } from '../lib/company';
import { PRICING_FAQS } from '../app/pricing/faqs';

vi.mock('../lib/pricing', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  fetchSubscriptionPlans: async () => [],
}));

const readRepo = (rel: string) => readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');

describe('PM-09a — the published price says what it does about tax', () => {
  it('company.ts carries the GST gate, defaulting to not-registered', () => {
    expect(COMPANY.tax).toBeDefined();
    expect(COMPANY.tax.HAS_GST_REGISTRATION_VERIFIED).toBe(false);
    expect(COMPANY.tax.gstin).toBeNull();
  });

  it('states that nothing is added at checkout while unregistered', () => {
    const line = taxTreatmentLine();
    expect(line).toMatch(/nothing is added at checkout/i);
    expect(line).toMatch(/not GST-registered/i);
    expect(line).toMatch(/GST tax invoice/i);
  });

  it('matches the server: subscription.service bills plan.price with no tax added', () => {
    const svc = readRepo('apps/api/src/services/subscription.service.ts');
    expect(svc).toMatch(/amount:\s*plan\.price/);
    expect(svc).not.toMatch(/\bgst\b/i);
    // and the store totals helper the same sweep introduced adds no tax line
    const storePricing = readRepo('apps/api/src/lib/store-pricing.ts');
    expect(storePricing).toMatch(/subtotalInr \+ deliveryFeeInr/);
  });

  it('/pricing renders the tax treatment beside the plan prices', async () => {
    const { default: PricingPage } = await import('../app/pricing/page');
    const ui = await PricingPage();
    const text = render(ui).container.textContent ?? '';
    expect(text).toMatch(/nothing is added at checkout/i);
  });

  it('the FAQ answers the tax question instead of leaving it open', () => {
    const tax = PRICING_FAQS.find((f) => /GST/i.test(f.question));
    expect(tax, '/pricing has no FAQ answering whether GST is added').toBeDefined();
    expect(tax!.answer).toMatch(/nothing is added at checkout/i);
    // and it does not promise a tax treatment the CA question has not settled
    expect(tax!.answer).not.toMatch(/\b18%\b/);
  });

  it('flipping the gate would publish the GSTIN instead — the sentence is not hardcoded', () => {
    const src = readRepo('apps/web/lib/company.ts');
    expect(src).toMatch(/HAS_GST_REGISTRATION_VERIFIED && COMPANY\.tax\.gstin/);
    expect(src).toMatch(/inclusive of applicable Indian taxes/);
  });
});
