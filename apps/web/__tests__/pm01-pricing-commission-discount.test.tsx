/**
 * PM-01 — /pricing may not promise a commission discount, because no server
 * code applies one.
 *
 * The 2026-08-12 sweep recorded PM-01 as "paid plans advertise a commission
 * discount that is implemented nowhere". A later triage pass concluded that
 * only two sentences of hero copy survived. That was incomplete. Re-measured
 * on this branch, the claim is published in SIX places on the rendered page,
 * four of which are plan FEATURE BULLETS sitting next to a price:
 *
 *   apps/web/app/pricing/page.tsx  hero      "…or subscribe to reduce it…"
 *   apps/web/app/pricing/page.tsx  section   "Higher plans unlock lower commissions…"
 *   plan-pandit-pro   Rs 2,999/mo  bullet    "15% lower commission"
 *   plan-astro-pro    Rs 1,999/mo  bullet    "10% lower commission"
 *   plan-store-basic  Rs 1,499/mo  bullet    "Lower commission"
 *   plan-store-pro    Rs 3,999/mo  bullet    "Lowest commission"
 *
 * The bullets come from PLANS in apps/api/src/services/subscription.service.ts
 * and are rendered verbatim by `plan.features.map(...)` in the page. Nothing
 * on the server reads them: `commissionOverride` / `commission_override` do
 * not appear anywhere in apps/api, and the five commission writers
 * (consultation.ts, wellness-sessions.ts, booking.service.ts,
 * payment.service.ts, store-commission.service.ts) all take a flat rate that
 * never consults a subscription. A provider paying Rs 3,999/month for
 * "Lowest commission" is charged the same 20% as the free tier.
 *
 * These tests are about what the PAGE publishes, so they assert on rendered
 * text rather than on source. Source scanning would have to strip comments
 * first — this file's own subject matter appears in several explanatory
 * comments in page.tsx — and a comment-blind scan is the single most repeated
 * bug in this sweep's guards.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The four offending plans exactly as GET /api/v1/subscriptions/plans returns
 * them today, copied from PLANS in apps/api/src/services/subscription.service.ts
 * (lines 71-150). Held as a literal rather than imported so this test keeps
 * failing loudly if the page starts rendering server strings again, whatever
 * the server later says.
 */
const LIVE_PLANS_PAYLOAD = {
  plans: [
    {
      id: 'plan-pandit-pro',
      name: 'Pandit Pro',
      plan: 'PRO',
      roles: ['PANDIT'],
      price: 2999,
      currency: 'INR',
      interval: 'month',
      features: [
        'Unlimited bookings',
        'Top listing',
        'Verified badge',
        'Video consultation',
        'Dedicated support',
        '15% lower commission',
      ],
      popular: false,
    },
    {
      id: 'plan-astro-pro',
      name: 'Astrologer Pro',
      plan: 'PRO',
      roles: ['ASTROLOGER'],
      price: 1999,
      currency: 'INR',
      interval: 'month',
      features: [
        'Unlimited everything',
        'Video calls',
        'Top listing',
        'Verified badge',
        '10% lower commission',
      ],
      popular: false,
    },
    {
      id: 'plan-store-basic',
      name: 'Store Basic',
      plan: 'BASIC',
      roles: ['STORE_OWNER'],
      price: 1499,
      currency: 'INR',
      interval: 'month',
      features: [
        '100 product listings',
        'Lower commission',
        'Advanced analytics',
        'Priority support',
      ],
      popular: true,
    },
    {
      id: 'plan-store-pro',
      name: 'Store Pro',
      plan: 'PRO',
      roles: ['STORE_OWNER'],
      price: 3999,
      currency: 'INR',
      interval: 'month',
      features: [
        'Unlimited listings',
        'Lowest commission',
        'Featured placement',
        'Dedicated account manager',
      ],
      popular: false,
    },
    {
      id: 'plan-store-free',
      name: 'Store Starter',
      plan: 'FREE',
      roles: ['STORE_OWNER'],
      price: 0,
      currency: 'INR',
      interval: 'forever',
      features: ['10 product listings', 'Standard commission', 'Basic analytics'],
      popular: false,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function renderPricingWithLivePlans(): Promise<string> {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => LIVE_PLANS_PAYLOAD,
    }),
  );
  const PricingPage = (await import('../app/pricing/page')).default;
  render(await PricingPage());
  return document.body.textContent ?? '';
}

describe('PM-01 — no surface of /pricing promises a lower commission', () => {
  /**
   * Every phrasing of the claim that is live today, plus the two generic ones
   * a rewrite would most plausibly reach for. Matching is on the rendered
   * text, so a plan bullet and a paragraph are caught by the same rule.
   */
  const FORBIDDEN: Array<[RegExp, string]> = [
    [/lower commission/i, 'plan bullet "15% / 10% / Lower commission"'],
    [/lowest commission/i, 'plan bullet "Lowest commission"'],
    [/reduce (?:it|the|your)\b[^.]{0,40}commission/i, 'hero "subscribe to reduce it"'],
    [/commission[^.]{0,30}\bdiscount/i, 'generic "commission discount"'],
    [/reduced commission/i, 'generic "reduced commission"'],
  ];

  it('the rendered page contains no commission-reduction promise', async () => {
    const text = await renderPricingWithLivePlans();
    for (const [pattern, where] of FORBIDDEN) {
      expect(
        pattern.test(text),
        `/pricing still publishes a commission discount (${where}) — no server ` +
          'code applies one; grep commissionOverride across apps/api returns nothing',
      ).toBe(false);
    }
  });

  it('the hero paragraph states the commission without offering to reduce it', async () => {
    await renderPricingWithLivePlans();
    const hero = screen.getByTestId('pricing-commission-intro').textContent ?? '';
    expect(hero).toMatch(/commission/i);
    expect(hero).not.toMatch(/subscribe to reduce/i);
    expect(hero).not.toMatch(/lower commission/i);
  });

  it('the provider-plans lead-in does not sell commissions as a plan benefit', async () => {
    await renderPricingWithLivePlans();
    const lead = screen.getByTestId('pricing-provider-plans-intro').textContent ?? '';
    expect(lead).not.toMatch(/commission/i);
  });
});

describe('PM-01 — only the false bullet is dropped, not the whole plan', () => {
  it('Pandit Pro keeps every feature that is not a commission claim', async () => {
    await renderPricingWithLivePlans();
    const text = document.body.textContent ?? '';
    for (const kept of [
      'Unlimited bookings',
      'Top listing',
      'Verified badge',
      'Video consultation',
      'Dedicated support',
    ]) {
      expect(text, `a real Pandit Pro feature was dropped: ${kept}`).toContain(kept);
    }
    // ...and the plan itself is still on sale at its real price.
    expect(text).toContain('Pandit Pro');
    expect(text).toContain('2,999');
  });

  it('a plan whose ONLY commission line is "Standard commission" keeps its other bullets', async () => {
    await renderPricingWithLivePlans();
    const text = document.body.textContent ?? '';
    expect(text).toContain('10 product listings');
    expect(text).toContain('Basic analytics');
  });
});
