/**
 * Darshya Revenue Model — Pricing plans, commission rates, and helpers.
 * Single source of truth for all subscription/commission logic.
 */

export type PlanId = "free" | "basic" | "pro" | "enterprise";

export type ProviderRole =
 | "pandit"
 | "store_owner"
 | "astrologer"
 | "wellness"
 | "temple"
 | "gaushala";

export interface PlanFeature {
 text: string;
 included: boolean;
}

export interface Plan {
 id: PlanId;
 name: string;
 price: number;
 currency: string;
 billingPeriod: "month";
 description: string;
 popular: boolean;
 features: PlanFeature[];
 maxListings: number | null; // null = unlimited
 commissionOverride: number; // percentage — overrides base commission
}

export interface CommissionRate {
 role: ProviderRole;
 label: string;
 baseRate: number; // free-tier commission
 rates: Record<PlanId, number>;
}

export const PLANS: Plan[] = [
 {
 id: "free",
 name: "Free",
 price: 0,
 currency: "INR",
 billingPeriod: "month",
 description: "Get started with a basic listing. No upfront cost.",
 popular: false,
 maxListings: 5,
 commissionOverride: 30,
 features: [
 { text: "Up to 5 listings", included: true },
 { text: "Basic provider profile", included: true },
 { text: "Standard search placement", included: true },
 { text: "30% platform commission", included: true },
 { text: "Analytics dashboard", included: false },
 { text: "Priority listing", included: false },
 { text: "Verified badge", included: false },
 { text: "Dedicated support", included: false },
 { text: "Featured placement", included: false },
 ],
 },
 {
 id: "basic",
 name: "Basic",
 price: 499,
 currency: "INR",
 billingPeriod: "month",
 description: "Grow your reach with more listings and insights.",
 popular: false,
 maxListings: 20,
 commissionOverride: 20,
 features: [
 { text: "Up to 20 listings", included: true },
 { text: "Enhanced provider profile", included: true },
 { text: "Standard search placement", included: true },
 { text: "20% platform commission", included: true },
 { text: "Analytics dashboard", included: true },
 { text: "Priority listing", included: false },
 { text: "Verified badge", included: false },
 { text: "Dedicated support", included: false },
 { text: "Featured placement", included: false },
 ],
 },
 {
 id: "pro",
 name: "Pro",
 price: 1499,
 currency: "INR",
 billingPeriod: "month",
 description: "Stand out with priority placement and a verified badge.",
 popular: true,
 maxListings: null,
 commissionOverride: 15,
 features: [
 { text: "Unlimited listings", included: true },
 { text: "Premium provider profile", included: true },
 { text: "Priority search placement", included: true },
 { text: "15% platform commission", included: true },
 { text: "Analytics dashboard", included: true },
 { text: "Priority listing", included: true },
 { text: "Verified badge", included: true },
 { text: "Dedicated support", included: false },
 { text: "Featured placement", included: false },
 ],
 },
 {
 id: "enterprise",
 name: "Enterprise",
 price: 4999,
 currency: "INR",
 billingPeriod: "month",
 description: "Everything included plus dedicated account management.",
 popular: false,
 maxListings: null,
 commissionOverride: 10,
 features: [
 { text: "Unlimited listings", included: true },
 { text: "Premium provider profile", included: true },
 { text: "Priority search placement", included: true },
 { text: "10% platform commission", included: true },
 { text: "Analytics dashboard", included: true },
 { text: "Priority listing", included: true },
 { text: "Verified badge", included: true },
 { text: "Dedicated support", included: true },
 { text: "Featured placement", included: true },
 ],
 },
];

export const COMMISSION_RATES: CommissionRate[] = [
 {
 role: "pandit",
 label: "Pandits",
 baseRate: 20,
 rates: { free: 30, basic: 20, pro: 15, enterprise: 10 },
 },
 {
 role: "store_owner",
 label: "Store Owners",
 baseRate: 15,
 rates: { free: 25, basic: 15, pro: 12, enterprise: 8 },
 },
 {
 role: "astrologer",
 label: "Astrologers",
 baseRate: 25,
 rates: { free: 35, basic: 25, pro: 18, enterprise: 12 },
 },
 {
 role: "wellness",
 label: "Wellness Providers",
 baseRate: 20,
 rates: { free: 30, basic: 20, pro: 15, enterprise: 10 },
 },
 {
 role: "temple",
 label: "Temples",
 baseRate: 10,
 rates: { free: 15, basic: 10, pro: 8, enterprise: 5 },
 },
 {
 role: "gaushala",
 label: "Gaushalas",
 baseRate: 5,
 rates: { free: 10, basic: 5, pro: 4, enterprise: 3 },
 },
];

/** Get full plan object by ID */
export function getPlanById(planId: PlanId): Plan {
 const plan = PLANS.find((p) => p.id === planId);
 if (!plan) throw new Error(`Unknown plan: ${planId}`);
 return plan;
}

/** Get list of features for a plan */
export function getPlanFeatures(planId: PlanId): PlanFeature[] {
 return getPlanById(planId).features;
}

/** Get commission rate for a specific role + plan combo */
export function getCommissionRate(role: ProviderRole, planId: PlanId): number {
 const entry = COMMISSION_RATES.find((c) => c.role === role);
 if (!entry) throw new Error(`Unknown provider role: ${role}`);
 return entry.rates[planId];
}

/**
 * Format price in INR / USD / GBP with appropriate currency symbol.
 * Pass `{ showCode: true }` for explicit "INR" / "USD" / "GBP" suffix to
 * disambiguate `$` (could be USD/CAD/AUD) and `£` (GBP) for NRI checkout flows.
 *
 * R-Q3-G-001 (UK launch): GBP support added. NRI 9-10x domestic pricing rule
 * applies — a ₹2,500 puja becomes ~£25 (10x at ~£1=₹100 reference). Caller
 * is responsible for converting INR→GBP amount before passing in; this fn
 * only formats. Use `gbpFromInr()` helper for the conversion.
 */
export function formatPrice(
 amount: number,
 opts: { showCode?: boolean; currency?: "INR" | "USD" | "GBP" } = {},
): string {
 const { showCode = false, currency = "INR" } = opts;
 if (amount === 0) return "Free";
 const locale =
  currency === "USD" ? "en-US" : currency === "GBP" ? "en-GB" : "en-IN";
 const formatted = new Intl.NumberFormat(locale, {
 style: "currency",
 currency,
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 }).format(amount);
 return showCode ? `${formatted} ${currency}` : formatted;
}

/**
 * NRI 9-10x domestic pricing rule per R-Q3-G-001 + business rule.
 * Reference FX rates as of 2026-06-15 (founder reviews quarterly):
 * - 1 GBP ≈ ₹105 (£1 ≈ ₹105 spot)
 * - We apply 10x multiplier first (₹2500 → ₹25000), then divide by ₹105
 *   to land on £238 — a deliberately premium NRI tier.
 * - Round to nearest £5 for clean checkout UX.
 */
export function gbpFromInr(inrAmount: number, multiplier = 10): number {
 if (inrAmount <= 0) return 0;
 const FX_INR_PER_GBP = 105;
 const raw = (inrAmount * multiplier) / FX_INR_PER_GBP;
 return Math.round(raw / 5) * 5;
}

/** Get the next upgrade plan, or null if already on Enterprise */
export function getUpgradePlan(currentPlanId: PlanId): Plan | null {
 const order: PlanId[] = ["free", "basic", "pro", "enterprise"];
 const idx = order.indexOf(currentPlanId);
 if (idx === -1 || idx >= order.length - 1) return null;
 return getPlanById(order[idx + 1] as PlanId);
}
