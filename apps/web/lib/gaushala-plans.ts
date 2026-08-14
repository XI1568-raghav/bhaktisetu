/**
 * DF-06 (prod sweep 2026-08-12) — one ladder for cow-adoption pricing.
 *
 * The homepage Worship rail advertised "Adopt a cow from Rs 500 a month" while
 * /gaushala offered exactly four tiers — Rs 51/day, Rs 3,000/month,
 * Rs 30,000/year, Rs 2,25,000 one-time. There has never been a Rs 500 monthly
 * tier, so a donor arriving from the homepage met a cheapest monthly
 * commitment six times what was promised. On a donation product where trust is
 * the whole proposition that is a bait-and-switch, and a reportable misleading
 * advertisement.
 *
 * Entry price is therefore derived here rather than retyped per surface.
 * `__tests__/funnel-inventory-claims.test.tsx` reads app/gaushala/page.tsx and
 * asserts this ladder still matches the plans that page renders, so the two
 * cannot silently drift apart again.
 */

export interface GaushalaPlan {
  id: string;
  /** Rendered price, rupee sign included, exactly as /gaushala prints it. */
  price: string;
  /** "/day", "/month", "/year", "one-time". */
  period: string;
  /** Rupees, for ordering. The entry tier is the cheapest per-period outlay. */
  amount: number;
}

export const GAUSHALA_PLANS: GaushalaPlan[] = [
  { id: 'plan_daily', price: '₹51', period: '/day', amount: 51 },
  { id: 'plan_monthly', price: '₹3,000', period: '/month', amount: 3000 },
  { id: 'plan_annual', price: '₹30,000', period: '/year', amount: 30000 },
  { id: 'plan_lifetime', price: '₹2,25,000', period: 'one-time', amount: 225000 },
];

/** The cheapest way in — currently Rs 51/day. */
export const GAUSHALA_ENTRY_PLAN: GaushalaPlan = GAUSHALA_PLANS.reduce((cheapest, plan) =>
  plan.amount < cheapest.amount ? plan : cheapest,
);

/** "from Rs51 a day" — the phrase every entry-point card must use. */
export const GAUSHALA_ENTRY_CLAIM = `from ${GAUSHALA_ENTRY_PLAN.price} a ${GAUSHALA_ENTRY_PLAN.period.replace(
  '/',
  '',
)}`;
