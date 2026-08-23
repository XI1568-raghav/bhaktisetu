import type { Metadata } from "next";
import { H1 } from "../../components/ui/heading-recipe";
import { buttonClass } from "../../components/ui/button-recipe";
import {
 Check,
 Flame,
 Store,
 Moon,
 Leaf,
 Home,
 Heart,
 ChevronDown,
 Sparkles,
 ArrowRight,
} from "lucide-react";
// PM-02b (prod sweep 2026-08-12): this page used to publish a hardcoded ladder
// — Basic ₹499 / Pro ₹1,499 / Enterprise ₹4,999 — that nothing in the platform
// charges. Live on 2026-08-13 the API sold Pandit Basic at ₹999 (2.0x) and
// Store Basic at ₹1,499 (3.0x), and no Enterprise plan existed for any provider
// role. Prices now come from the same server-side table Razorpay is billed
// from; PLANS keeps only tier copy and commission percentages.
// PM-03b/PM-08b (same sweep): the commission table published a four-column
// tier ladder (pandit 30/20/15/10, astrologer 35/25/18/12, …). Its free column
// was wrong for all six roles, and the three paid columns describe a discount
// no server code applies — grep `commissionOverride` across apps/api returns
// nothing. The table now prints one number per role: the rate actually charged,
// read off the server constant named in `chargedRateSource`.
import {
 COMMISSION_RATES,
 formatPrice,
 fetchSubscriptionPlans,
 groupPlansByRole,
 planCheckoutPath,
 intervalSuffix,
} from "../../lib/pricing";
import { taxTreatmentLine } from "../../lib/company";
import { PRICING_FAQS } from "./faqs";

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/pricing' },
 title: "Pricing — Free & Paid Plans for Devotees and Providers",
 description:
 "Simple, transparent pricing for devotees, pandits, store owners, astrologers, gaushalas and gurukuls. Browse Darshya free or grow your devotional business with low-commission paid plans built for India and NRI audiences.",
};

const roleIcons: Record<string, React.ElementType> = {
 pandit: Flame,
 store_owner: Store,
 astrologer: Moon,
 wellness: Leaf,
 temple: Home,
 gaushala: Heart,
};

export const revalidate = 300;

export default async function PricingPage() {
 const apiPlans = await fetchSubscriptionPlans();
 const groups = groupPlansByRole(apiPlans);
 const providerGroups = groups.filter((g) => g.role !== "DEVOTEE");
 const devoteePlans = groups.find((g) => g.role === "DEVOTEE")?.plans ?? [];
 return (
 <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
 {/* ── Hero ────────────────────────────────────────────────────────── */}
 <section
 className="relative overflow-hidden py-16 sm:py-24"
 style={{ background: "linear-gradient(135deg, #2a2520, #3a3530)" }}
 >
 <div
 className="absolute top-10 right-20 w-80 h-80 rounded-full opacity-15"
 style={{ background: "var(--color-primary)", filter: "blur(120px)" }}
 />
 <div
 className="absolute bottom-0 left-10 w-60 h-60 rounded-full opacity-10"
 style={{ background: "#D4A438", filter: "blur(100px)" }}
 />
 <div className="relative container-wide text-center">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-4"
 style={{ color: "var(--color-primary)" }}
 >
 Pricing
 </p>
 {/* DU-05: this was Cabinet Grotesk 43.2px w700 while the home hero was
   Cabinet Grotesk 70.4px w600 - two marketing pages, two recipes. */}
 <h1
 className={`${H1.marketing} mb-4`}
 style={{ color: "var(--color-text-inverse)" }}
 >
 Simple, Transparent Pricing
 </h1>
 <p
 className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
 style={{ color: "var(--color-text-faint)" }}
 >
 Free for devotees, always. Service providers pay a small commission
 on each transaction — or subscribe to reduce it and unlock premium
 tools.
 </p>
 {/* PM-09 (prod sweep 2026-08-12): every price on this page was published
   with nothing said about tax — a provider could not tell whether GST
   would be added at checkout. It is not: subscription.service writes
   `amount: plan.price` and bills that same figure, and the store totals
   helper computes subtotal + delivery with no tax line. Rendered from
   company.ts so the day a GSTIN is issued this sentence becomes the
   tax-inclusive one instead of staying wrong. */}
 <p
 className="prose-meta max-w-2xl mx-auto mt-5"
 style={{ color: "var(--color-text-faint)" }}
 data-testid="pricing-tax-treatment"
 >
 {taxTreatmentLine()}
 </p>
 </div>
 </section>

 {/* ── Tab Sections ───────────────────────────────────────────────── */}
 {/* For Devotees */}
 <section className="py-14 sm:py-20">
 <div className="container-wide">
 <div className="text-center mb-10">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
 style={{
 background: "var(--color-primary-highlight)",
 color: "var(--color-primary)",
 }}
 >
 <Sparkles className="w-3.5 h-3.5" />
 For Devotees
 </div>
 <h2
 className="text-xl sm:text-2xl font-bold mb-3"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Always Free for Devotees
 </h2>
 <p
 className="text-sm max-w-xl mx-auto leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 Browse temples, watch live darshan, read spiritual content, and
 check your daily horoscope — all completely free. No hidden fees,
 no paywall.
 </p>
 </div>

 <div
 className="rounded-xl p-6 sm:p-8 text-center"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
 {[
 { icon: Home, label: "Browse temples & darshan" },
 { icon: Flame, label: "Book pujas & sevas" },
 { icon: Moon, label: "Daily horoscope & panchang" },
 { icon: Sparkles, label: "Ask Pandit AI guidance" },
 ].map((item) => {
 const Icon = item.icon;
 return (
 <div
 key={item.label}
 className="flex flex-col items-center gap-3 p-4 rounded-xl"
 style={{ background: "var(--color-bg)" }}
 >
 <div
 className="w-10 h-10 rounded-lg flex items-center justify-center"
 style={{ background: "var(--color-primary-highlight)" }}
 >
 <Icon
 className="w-5 h-5"
 style={{ color: "var(--color-primary)" }}
 />
 </div>
 <span
 className="text-sm font-medium"
 style={{ color: "var(--color-text)" }}
 >
 {item.label}
 </span>
 </div>
 );
 })}
 </div>
 {/* PM-02b: the page used to say "Premium features coming soon". They
   are not coming — the API sells them today (astro_session ₹99,
   astro_monthly ₹499, NRI Premium ₹5,000/yr) and astro_monthly is what
   grants AI Pandit quota. Listing them at the price the gateway
   charges, or saying nothing at all if the API is unreachable. */}
 {devoteePlans.length > 0 ? (
 <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--color-border)" }}>
 <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
 Optional paid add-ons for devotees — everything listed above stays free.
 </p>
 <ul className="flex flex-wrap justify-center gap-2">
 {devoteePlans.map((plan) => (
 <li
 key={plan.id}
 className="text-xs px-3 py-1.5 rounded-full"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 color: "var(--color-text)",
 }}
 >
 {plan.name} — {formatPrice(plan.price)}
 {plan.price > 0 ? intervalSuffix(plan.interval) : ""}
 </li>
 ))}
 </ul>
 </div>
 ) : null}
 </div>
 </div>
 </section>

 {/* ── For Service Providers ───────────────────────────────────────── */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="container-wide">
 <div className="text-center mb-12">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
 style={{
 background: "var(--color-primary-highlight)",
 color: "var(--color-primary)",
 }}
 >
 <Store className="w-3.5 h-3.5" />
 For Service Providers
 </div>
 <h2
 className="text-xl sm:text-2xl font-bold mb-3"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Grow Your Devotional Business
 </h2>
 <p
 className="text-sm max-w-xl mx-auto leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 Choose a plan that fits your scale. Higher plans unlock lower
 commissions, more listings, and premium placement.
 </p>
 </div>

 {/* Pricing cards — PM-02b: rendered from GET /api/v1/subscriptions/plans,
   the same table subscription.service.ts bills Razorpay from, grouped by
   the role each plan is actually sold to. If that fetch fails there is no
   fallback ladder: the page states it cannot show prices. */}
 {providerGroups.length === 0 ? (
 <div
 className="rounded-xl p-6 text-center"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 }}
 >
 <p className="text-sm" style={{ color: "var(--color-text)" }}>
 Plan prices are temporarily unavailable.
 </p>
 <p
 className="prose-meta mt-2 max-w-md mx-auto"
 style={{ color: "var(--color-text-muted)" }}
 >
 We could not reach our billing system, so we are showing no price
 rather than one we cannot honour at checkout. Commission rates below
 are unaffected.
 </p>
 <a href="/auth/signup" className={buttonClass('primary', 'md', 'mt-4')}>
 Create a provider account
 <ArrowRight className="w-3.5 h-3.5" />
 </a>
 </div>
 ) : (
 <div className="space-y-12">
 {providerGroups.map((group) => (
 <div key={group.role}>
 <h3
 className="text-sm font-semibold mb-4"
 style={{ color: "var(--color-text)" }}
 >
 {group.label}
 </h3>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {group.plans.map((plan) => (
 <div
 key={`${group.role}-${plan.id}`}
 className="relative rounded-xl p-5 flex flex-col card-hover"
 style={{
 background: "var(--color-bg)",
 border: plan.popular
 ? "2px solid var(--color-primary)"
 : "1px solid var(--color-border)",
 }}
 >
 {plan.popular && (
 <div
 className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold"
 style={{
 background: "var(--color-primary)",
 color: "var(--color-text-inverse)",
 }}
 >
 Most Popular
 </div>
 )}

 <h4
 className="text-sm font-semibold mb-4"
 style={{ color: "var(--color-text)" }}
 >
 {plan.name}
 </h4>

 <div className="mb-5">
 <span
 className="text-2xl font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 {formatPrice(plan.price)}
 </span>
 {plan.price > 0 && (
 <span
 className="text-xs ml-1"
 style={{ color: "var(--color-text-faint)" }}
 >
 {intervalSuffix(plan.interval)}
 </span>
 )}
 </div>

 <ul className="space-y-2 mb-6 flex-1">
 {plan.features.map((feature) => (
 <li key={feature} className="flex items-start gap-2">
 <Check
 className="w-3.5 h-3.5 mt-0.5 shrink-0"
 style={{ color: "var(--color-status-success)" }}
 />
 <span
 className="text-xs"
 style={{ color: "var(--color-text)" }}
 >
 {feature}
 </span>
 </li>
 ))}
 </ul>

 {/* PM-02b: "Start Free Trial" sat on every paid card and no plan
   object carries any trial — the first charge is immediate. */}
 <a
 href={
 plan.price === 0
 ? "/auth/signup"
 : planCheckoutPath(group.role)
 }
 className={buttonClass(
 plan.popular ? 'primary' : 'secondary',
 'md',
 'w-full btn-press',
 )}
 >
 {plan.price === 0 ? "Start Free" : "Subscribe"}
 </a>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </section>

 {/* ── Commission Comparison Table ─────────────────────────────────── */}
 <section className="py-14 sm:py-20">
 <div className="container-wide">
 <div className="text-center mb-10">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Commission Breakdown
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold mb-3"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 What Darshya Takes
 </h2>
 <p
 className="text-sm max-w-xl mx-auto leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 The platform&apos;s share of each transaction, by provider type.
 This is the rate applied today — everything else reaches you.
 </p>
 </div>

 <div
 className="rounded-xl overflow-hidden"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr style={{ background: "var(--color-surface-offset)" }}>
 <th
 className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
 style={{ color: "var(--color-text-muted)" }}
 >
 Provider Type
 </th>
 <th
 className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide"
 style={{ color: "var(--color-text-muted)" }}
 >
 Platform Commission
 </th>
 </tr>
 </thead>
 <tbody>
 {COMMISSION_RATES.map((row, i) => {
 const Icon = roleIcons[row.role] ?? Flame;
 return (
 <tr
 key={row.role}
 style={{
 borderTop: "1px solid var(--color-border)",
 background:
 i % 2 === 0
 ? "transparent"
 : "var(--color-surface-offset)",
 }}
 >
 <td className="px-5 py-3">
 <span className="flex items-center gap-2">
 <Icon
 className="w-4 h-4"
 style={{ color: "var(--color-primary)" }}
 />
 <span
 className="text-sm font-medium"
 style={{ color: "var(--color-text)" }}
 >
 {row.label}
 </span>
 </span>
 </td>
 <td
 className="text-center px-4 py-3 text-sm"
 style={{
 color:
 row.chargedRate === null
 ? "var(--color-text-muted)"
 : "var(--color-text)",
 fontWeight: row.chargedRate === null ? 400 : 600,
 }}
 >
 {row.chargedRate === null
 ? "Not charged"
 : `${row.chargedRate}%`}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Footnote sits OUTSIDE the table: the notes quote the temple share,
   and a rate inside the table must only ever be a charged rate. */}
 <ul className="mt-4 space-y-1.5">
 {COMMISSION_RATES.filter((row) => row.note).map((row) => (
 <li
 key={row.role}
 className="text-xs leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 <span style={{ color: "var(--color-text)" }}>{row.label}:</span>{" "}
 {row.note}
 </li>
 ))}
 </ul>
 </div>
 </section>

 {/* ── FAQ ─────────────────────────────────────────────────────────── */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="container-prose">
 <div className="text-center mb-10">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 FAQ
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Frequently Asked Questions
 </h2>
 </div>

 <div className="space-y-3">
 {PRICING_FAQS.map((faq) => (
 <details
 key={faq.question}
 className="group rounded-xl"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 }}
 >
 <summary
 className="flex items-center justify-between px-5 py-4 cursor-pointer list-none text-sm font-medium"
 style={{ color: "var(--color-text)" }}
 >
 {faq.question}
 <ChevronDown
 className="w-4 h-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
 style={{ color: "var(--color-text-faint)" }}
 />
 </summary>
 <div className="px-5 pb-4">
 <p
 className="text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 {faq.answer}
 </p>
 </div>
 </details>
 ))}
 </div>
 </div>
 </section>

 {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
 <section className="py-14 sm:py-20">
 <div className="container-prose text-center">
 <h2
 className="text-xl sm:text-2xl font-bold mb-3"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Ready to Reach Millions of Devotees?
 </h2>
 <p
 className="text-sm mb-6 leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 Join Darshya as a service provider. Start free, upgrade when you are
 ready. No lock-in, no hidden fees.
 </p>
 <a href="/auth/signup" className={buttonClass('primary', 'lg', 'btn-press')}>
 Get Started Free
 <ArrowRight className="w-4 h-4" />
 </a>
 </div>
 </section>
 </div>
 );
}
