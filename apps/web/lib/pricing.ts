/**
 * Darshya Revenue Model — plan TIERS, commission rates, and helpers.
 *
 * PM-02b (prod sweep 2026-08-12) — THIS FILE NO LONGER HOLDS PRICES.
 *
 * It used to publish a universal ladder — Free ₹0 · Basic ₹499 · Pro ₹1,499 ·
 * Enterprise ₹4,999 — that /pricing rendered as fact. Nothing in the platform
 * charges those numbers. The money table lives server-side in
 * `apps/api/src/services/subscription.service.ts`: it is what
 * `createRazorpaySubscription()` bills from and what
 * `marketplaceSubscription.amount` is written from, and on 2026-08-13 it read
 *
 *     Pandit      ₹0 / ₹999   / ₹2,999
 *     Astrologer  ₹0 / ₹799   / ₹1,999
 *     Store       ₹0 / ₹1,499 / ₹3,999
 *     Wellness    ₹0 / ₹699
 *     Temple      ₹0 /        / ₹4,999
 *     Devotee     ₹99/day · ₹499/month · ₹5,000/year
 *
 * A store owner reading "Basic ₹499" was 3.0x below the ₹1,499 they would be
 * billed, and the advertised Enterprise tier does not exist for any provider
 * role. So the local `Plan` objects keep only tier identity, copy and
 * commission metadata; every rupee amount on /pricing now comes from
 * `fetchSubscriptionPlans()` below, i.e. from the same table the gateway is
 * asked for. If that fetch fails, /pricing shows NO price rather than a
 * plausible one.
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

/**
 * A plan TIER — identity, copy and commission metadata only.
 *
 * There is deliberately no `price` here. See the file header: prices are
 * role-specific and live in the API. Adding one back would reintroduce PM-02b.
 */
export interface Plan {
 id: PlanId;
 name: string;
 description: string;
 popular: boolean;
 features: PlanFeature[];
 maxListings: number | null; // null = unlimited
}

/**
 * What Darshya takes from one provider role.
 *
 * PM-08b — this used to carry `baseRate`, commented "free-tier commission",
 * alongside a `rates.free` that was a different number on all six rows (pandit
 * 20 vs 30, store 15 vs 25, astrologer 25 vs 35, wellness 20 vs 30, temple
 * 10 vs 15, gaushala 5 vs 10). The page rendered `rates`, so `baseRate` was
 * dead — and wrong — inside the file whose header calls itself the single
 * source of truth. It is gone.
 *
 * PM-01 (2026-08-28) — and so is `rates` itself, the four-column tier-discount
 * ladder (pandit 30/20/15/10, store 25/15/12/8, astrologer 35/25/18/12, …),
 * along with `Plan.commissionOverride`, the "N% platform commission" bullets on
 * each tier, `getCommissionRate()` and components/CommissionBanner.tsx.
 *
 * Nothing server-side reduces commission by subscription tier: `commissionOverride`
 * appears nowhere in apps/api and the five Commission writers each apply a flat
 * rate that never reads a subscription. The previous note kept the ladder on the
 * grounds that it was "NOT PUBLISHED, and deliberately not deleted" pending an
 * owner decision on whether to build the discount. That reasoning does not
 * survive contact with how the claim actually escaped: its only renderer,
 * CommissionBanner, carried a DO-NOT-MOUNT header and zero importers, and the
 * same claim still reached providers from a different direction entirely — the
 * API's own plan bullets, rendered raw by components/SubscriptionPanel.tsx on
 * five portal pages. An unpublished falsehood one import away from a dashboard
 * is the same risk on a delay.
 *
 * If a tier-based discount is ever built, it belongs in
 * apps/api/src/lib/commission-math.ts and this column comes back sourced from
 * there — not from a number typed here in advance of the feature.
 */
export interface CommissionRate {
 role: ProviderRole;
 label: string;
 /**
  * PM-03b — the platform's take TODAY, as a percentage, read off the server
  * constant named in `chargedRateSource`. `null` means this role is charged
  * NO platform commission: there is no `Commission` writer that credits it.
  * `__tests__/pricing-commission-truth.test.tsx` re-reads every one of these
  * constants out of apps/api and fails if this column drifts from it.
  */
 chargedRate: number | null;
 /** The server constant `chargedRate` was read from. Pinned by that test. */
 chargedRateSource: string;
 /** Plain English for the rows where `chargedRate` is null. */
 note?: string;
}

export const PLANS: Plan[] = [
 {
 id: "free",
 name: "Free",
 description: "Get started with a basic listing. No upfront cost.",
 popular: false,
 maxListings: 5,
 features: [
 { text: "Up to 5 listings", included: true },
 { text: "Basic provider profile", included: true },
 { text: "Standard search placement", included: true },
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
 description: "Grow your reach with more listings and insights.",
 popular: false,
 maxListings: 20,
 features: [
 { text: "Up to 20 listings", included: true },
 { text: "Enhanced provider profile", included: true },
 { text: "Standard search placement", included: true },
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
 description: "Stand out with priority placement and a verified badge.",
 popular: true,
 maxListings: null,
 features: [
 { text: "Unlimited listings", included: true },
 { text: "Premium provider profile", included: true },
 { text: "Priority search placement", included: true },
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
 description: "Everything included plus dedicated account management.",
 popular: false,
 maxListings: null,
 features: [
 { text: "Unlimited listings", included: true },
 { text: "Premium provider profile", included: true },
 { text: "Priority search placement", included: true },
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
 chargedRate: 20,
 chargedRateSource:
 "apps/api/prisma/schema.prisma — Priest.commissionRate @default(0.80): the pandit keeps 80%",
 },
 {
 role: "store_owner",
 label: "Store Owners",
 chargedRate: 20,
 chargedRateSource:
 "apps/api/prisma/schema.prisma — StoreProfile.commission @default(0.20)",
 },
 {
 role: "astrologer",
 label: "Astrologers",
 chargedRate: 20,
 chargedRateSource:
 "apps/api/src/services/astrologer.service.ts — ASTROLOGER_PLATFORM_RATE",
 },
 {
 role: "wellness",
 label: "Wellness Providers",
 chargedRate: 20,
 chargedRateSource:
 "apps/api/src/routes/wellness-sessions.ts — WELLNESS_PLATFORM_COMMISSION",
 },
 {
 // Not an oversight: no Commission writer credits a temple manager, so no
 // rate is deducted from a temple. Money moves the other way —
 // temple-payout.service mints a TemplePayout of DEFAULT_TEMPLE_SHARE_RATE
 // on every confirmed puja. Publishing "15%" here invented a charge.
 role: "temple",
 label: "Temples",
 chargedRate: null,
 chargedRateSource:
 "apps/api/src/services/temple-payout.service.ts — DEFAULT_TEMPLE_SHARE_RATE (paid TO the temple)",
 note: "No platform commission. Temples receive a 5% share of every puja confirmed at the temple.",
 },
 {
 // Same: gau seva donations mint no Commission row at all.
 role: "gaushala",
 label: "Gaushalas",
 chargedRate: null,
 chargedRateSource:
 "apps/api/src — no Commission writer is keyed to a gaushala; donations mint no commission row",
 note: "No platform commission. Gau seva donations reach the gaushala in full.",
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

/** The platform's take TODAY. `null` = this role is not charged a commission. */
export function chargedCommissionRate(role: ProviderRole): number | null {
 const entry = COMMISSION_RATES.find((c) => c.role === role);
 if (!entry) throw new Error(`Unknown provider role: ${role}`);
 return entry.chargedRate;
}

/**
 * Format price in INR / USD / GBP with appropriate currency symbol.
 * Pass `{ showCode: true }` for explicit "INR" / "USD" / "GBP" suffix to
 * disambiguate `$` (could be USD/CAD/AUD) and `£` (GBP) for NRI checkout flows.
 *
 * R-Q3-G-001 (UK launch): GBP support added. Caller is responsible for
 * converting the INR amount before passing it in; this fn only formats. Use
 * `gbpFromInr()` for that conversion.
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
 * Reference spot rate, reviewed quarterly. Last set 2026-06-15.
 * Display only — nothing is ever charged in GBP; Razorpay bills INR.
 */
export const FX_INR_PER_GBP = 105;

/**
 * £ equivalent of an INR amount, shown beside the INR price for reference.
 *
 * PM-05 (prod sweep 2026-08-12) — this used to take `multiplier = 10`, applying
 * the "NRI pricing is 9-10x domestic" business rule in the page and then
 * rounding to the nearest £5. /uk was the only caller, so a Rudrabhishek the
 * gateway is asked ₹1,100 for was published at £240 — roughly 23x the amount
 * actually charged.
 *
 * The 9-10x premium is NOT applied server-side: booking.service charges
 * `basePrice` to everyone (the isNri price swap was deliberately removed, with
 * a test pinning it), so a multiplier here priced something that does not
 * exist. The parameter is deleted rather than defaulted to 1, so it cannot be
 * passed back in. If a real NRI premium ever ships it has to arrive as a
 * server-QUOTED amount, rendered from the same value the gateway is asked for.
 */
export function gbpFromInr(inrAmount: number): number {
 if (!Number.isFinite(inrAmount) || inrAmount <= 0) return 0;
 return Math.max(1, Math.round(inrAmount / FX_INR_PER_GBP));
}

/** Get the next upgrade plan, or null if already on Enterprise */
export function getUpgradePlan(currentPlanId: PlanId): Plan | null {
 const order: PlanId[] = ["free", "basic", "pro", "enterprise"];
 const idx = order.indexOf(currentPlanId);
 if (idx === -1 || idx >= order.length - 1) return null;
 return getPlanById(order[idx + 1] as PlanId);
}

// ─── The real money table (PM-02b) ──────────────────────────────────────────
// Everything below reads GET /api/v1/subscriptions/plans — the same PLANS array
// that subscription.service.ts bills Razorpay from. Nothing below invents,
// defaults or rounds a number; on any failure the caller gets [] and the page
// shows no price.

/** API role enum as returned in `plan.roles`. */
export type ApiProviderRole =
 | "PANDIT"
 | "ASTROLOGER"
 | "STORE_OWNER"
 | "WELLNESS_INSTRUCTOR"
 | "TEMPLE_MANAGER"
 | "GAUSHALA_MANAGER"
 | "DEVOTEE";

/** One row of the server-side money table, exactly as the API sends it. */
export interface ApiSubscriptionPlan {
 id: string;
 name: string;
 /** Tier bucket: FREE | BASIC | PRO | ENTERPRISE. */
 tier: string;
 roles: string[];
 /** Rupees. The number Razorpay is asked for. */
 price: number;
 currency: string;
 /** month | year | day | forever */
 interval: string;
 features: string[];
 popular: boolean;
}

export const API_ROLE_LABELS: Record<string, string> = {
 PANDIT: "Pandits",
 ASTROLOGER: "Astrologers",
 STORE_OWNER: "Store Owners",
 WELLNESS_INSTRUCTOR: "Wellness Instructors",
 TEMPLE_MANAGER: "Temples",
 GAUSHALA_MANAGER: "Gaushalas",
 DEVOTEE: "Devotees",
};

/** Stable display order; roles absent from the API simply don't render. */
const ROLE_ORDER: string[] = [
 "PANDIT",
 "ASTROLOGER",
 "TEMPLE_MANAGER",
 "STORE_OWNER",
 "WELLNESS_INSTRUCTOR",
 "GAUSHALA_MANAGER",
 "DEVOTEE",
];

/**
 * Where a plan for `role` is actually sold.
 *
 * Deliberately never `/settings/subscription`: that page rendered a mock
 * current plan plus six fabricated "Paid" ₹499 invoices, so pointing a pricing
 * CTA at it was advertising a price against invented billing history.
 * A role with no self-serve checkout surface yet (store owner, gaushala,
 * devotee) goes to sign-up rather than to a page that cannot transact.
 */
export function planCheckoutPath(role: string): string {
 switch (role) {
 case "PANDIT":
 return "/priest/subscription";
 case "ASTROLOGER":
 return "/astrologer-portal/subscription";
 case "WELLNESS_INSTRUCTOR":
 return "/wellness-portal/subscription";
 case "TEMPLE_MANAGER":
 case "GAUSHALA_MANAGER":
 return "/temple-portal/subscription";
 default:
 return "/auth/signup";
 }
}

function isNonNegativeNumber(v: unknown): v is number {
 return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

/**
 * Parse the /subscriptions/plans body.
 *
 * A row without a usable numeric `price` is DROPPED, never defaulted to 0 —
 * defaulting is how "Pandit Basic — Free" ended up on a plan Razorpay bills
 * ₹999 for.
 */
export function plansFromPayload(payload: unknown): ApiSubscriptionPlan[] {
 if (!payload || typeof payload !== "object") return [];
 const rows = (payload as { plans?: unknown }).plans;
 if (!Array.isArray(rows)) return [];

 const out: ApiSubscriptionPlan[] = [];
 for (const row of rows) {
 if (!row || typeof row !== "object") continue;
 const r = row as Record<string, unknown>;
 if (typeof r.id !== "string" || typeof r.name !== "string") continue;
 if (!isNonNegativeNumber(r.price)) continue;
 const roles = Array.isArray(r.roles)
 ? r.roles.filter((x): x is string => typeof x === "string")
 : [];
 if (roles.length === 0) continue;
 out.push({
 id: r.id,
 name: r.name,
 tier: typeof r.plan === "string" ? r.plan : "",
 roles,
 price: r.price,
 currency: typeof r.currency === "string" ? r.currency : "INR",
 interval: typeof r.interval === "string" ? r.interval : "month",
 features: Array.isArray(r.features)
 ? r.features.filter((x): x is string => typeof x === "string")
 : [],
 popular: r.popular === true,
 });
 }
 return out;
}

function resolveApiBase(): string {
 const candidate =
 process.env.API_URL ||
 process.env.NEXT_PUBLIC_API_URL ||
 "https://api.darshya.online";
 return candidate.endsWith("/api/v1")
 ? candidate
 : `${candidate.replace(/\/$/, "")}/api/v1`;
}

/** Fetch the real plan table. Never throws; `[]` means "show no prices". */
export async function fetchSubscriptionPlans(): Promise<ApiSubscriptionPlan[]> {
 try {
 const res = await fetch(`${resolveApiBase()}/subscriptions/plans`, {
 next: { revalidate: 300, tags: ["subscription-plans"] },
 } as RequestInit);
 if (!res.ok) return [];
 return plansFromPayload(await res.json());
 } catch {
 return [];
 }
}

export interface RolePlanGroup {
 role: string;
 label: string;
 plans: ApiSubscriptionPlan[];
}

/**
 * Group real plans by the roles they are sold to. A plan shared by two roles
 * (Temple Pro covers TEMPLE_MANAGER and GAUSHALA_MANAGER) appears under both,
 * because that is literally who can buy it.
 */
export function groupPlansByRole(plans: ApiSubscriptionPlan[]): RolePlanGroup[] {
 const byRole = new Map<string, ApiSubscriptionPlan[]>();
 for (const plan of plans) {
 for (const role of plan.roles) {
 const list = byRole.get(role);
 if (list) list.push(plan);
 else byRole.set(role, [plan]);
 }
 }

 const seen = [...byRole.keys()];
 seen.sort((a, b) => {
 const ia = ROLE_ORDER.indexOf(a);
 const ib = ROLE_ORDER.indexOf(b);
 return (ia === -1 ? ROLE_ORDER.length : ia) - (ib === -1 ? ROLE_ORDER.length : ib);
 });

 return seen.map((role) => ({
 role,
 label: API_ROLE_LABELS[role] ?? role,
 plans: (byRole.get(role) ?? []).slice().sort((a, b) => a.price - b.price),
 }));
}

// ─── The real puja catalogue (PM-05) ────────────────────────────────────────
// GET /api/v1/pujas/types is the table /bookings/from-offering charges from.
// /uk used to publish a hardcoded rupee column instead — 3 of its 5 figures
// disagreed with this endpoint, one by 2.3x. Same rule as the plan table above:
// nothing here invents, defaults or rounds a price, and a failed fetch yields
// [] so the caller shows NO price rather than a plausible one.

/** One catalogue row, reduced to what a price table needs. */
export interface CatalogPuja {
 slug: string;
 name: string;
 category: string;
 /** Rupees. `basePrice` arrives as a STRING (Prisma Decimal serialisation). */
 basePrice: number;
}

/**
 * Parse the /pujas/types body.
 *
 * `basePrice` is a Decimal(10,2) and serialises as `"1100"`, not `1100`, so a
 * `typeof === 'number'` guard would silently drop every row. A row whose price
 * will not parse to a positive finite number is DROPPED, never defaulted.
 */
export function pujaCatalogFromPayload(payload: unknown): CatalogPuja[] {
 if (!payload || typeof payload !== "object") return [];
 const rows = (payload as { pujaTypes?: unknown }).pujaTypes;
 if (!Array.isArray(rows)) return [];

 const out: CatalogPuja[] = [];
 for (const row of rows) {
 if (!row || typeof row !== "object") continue;
 const r = row as Record<string, unknown>;
 if (typeof r.slug !== "string" || typeof r.name !== "string") continue;
 if (typeof r.basePrice !== "string" && typeof r.basePrice !== "number") continue;
 const price = Number(r.basePrice);
 if (!Number.isFinite(price) || price <= 0) continue;
 out.push({
 slug: r.slug,
 name: r.name,
 category: typeof r.category === "string" ? r.category : "",
 basePrice: price,
 });
 }
 return out;
}

/** Fetch the live puja catalogue. Never throws; `[]` means "show no prices". */
export async function fetchPujaCatalog(): Promise<CatalogPuja[]> {
 try {
 const res = await fetch(`${resolveApiBase()}/pujas/types`, {
 next: { revalidate: 3600, tags: ["puja-catalog"] },
 } as RequestInit);
 if (!res.ok) return [];
 return pujaCatalogFromPayload(await res.json());
 } catch {
 return [];
 }
}

/**
 * Pick catalogue rows in a preferred slug order, topping up from whatever else
 * the catalogue holds. A slug that has left the catalogue simply does not
 * render — it is never substituted with remembered copy or a remembered price.
 */
export function pickCatalogRows(
 catalog: CatalogPuja[],
 preferredSlugs: string[],
 limit: number,
): CatalogPuja[] {
 const bySlug = new Map(catalog.map((p) => [p.slug, p]));
 const picked: CatalogPuja[] = [];
 for (const slug of preferredSlugs) {
 const hit = bySlug.get(slug);
 if (hit && !picked.includes(hit)) picked.push(hit);
 if (picked.length === limit) return picked;
 }
 for (const p of catalog) {
 if (picked.length === limit) break;
 if (!picked.includes(p)) picked.push(p);
 }
 return picked;
}

/** "/month", "/year", "/session" — read from the API's own interval. */
export function intervalSuffix(interval: string): string {
 switch (interval) {
 case "month":
 return "/month";
 case "year":
 return "/year";
 case "day":
 return " per session";
 default:
 return "";
 }
}
