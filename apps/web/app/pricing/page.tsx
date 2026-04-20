import type { Metadata } from "next";
import {
  Check,
  X,
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
import {
  PLANS,
  COMMISSION_RATES,
  formatPrice,
  type PlanId,
} from "../../lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for devotees and service providers. Browse free or grow your devotional business with Poojly.",
};

const roleIcons: Record<string, React.ElementType> = {
  pandit: Flame,
  store_owner: Store,
  astrologer: Moon,
  wellness: Leaf,
  temple: Home,
  gaushala: Heart,
};

const faqs = [
  {
    question: "How does billing work?",
    answer:
      "Subscription fees are billed monthly to your linked payment method. Commission is deducted automatically from each transaction before payout. You can view a full breakdown in your earnings dashboard.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Payouts are processed every Monday for the previous week's completed orders. Funds typically reach your bank account within 2-3 business days after processing.",
  },
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes. You can upgrade or downgrade at any time from your subscription settings. Upgrades take effect immediately and you'll be charged the prorated difference. Downgrades take effect at the start of your next billing cycle.",
  },
  {
    question: "Is there a lock-in period?",
    answer:
      "No. All plans are month-to-month with no long-term commitment. Cancel anytime from your settings page — your plan stays active until the end of the current billing period.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept UPI, credit/debit cards, net banking, and wallets via Razorpay. For international providers, Stripe is available with USD billing.",
  },
  {
    question: "Do devotees need to pay?",
    answer:
      "No. Browsing temples, watching live darshan, reading content, and checking your daily horoscope is completely free. Premium devotee features may be introduced in the future, but the core experience will always remain free.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
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
        <div className="relative max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-primary)" }}
          >
            Pricing
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-inverse)",
              lineHeight: "var(--leading-tight)",
            }}
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
        </div>
      </section>

      {/* ── Tab Sections ───────────────────────────────────────────────── */}
      {/* For Devotees */}
      <section className="py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
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
            <p
              className="text-xs mt-6"
              style={{ color: "var(--color-text-faint)" }}
            >
              Premium features coming soon — early users will be grandfathered.
            </p>
          </div>
        </div>
      </section>

      {/* ── For Service Providers ───────────────────────────────────────── */}
      <section
        className="py-14 sm:py-20"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
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

          {/* Pricing cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
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

                <div className="mb-4">
                  <h3
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--color-text)" }}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {plan.description}
                  </p>
                </div>

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
                      /month
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-medium"
                  style={{
                    background: "var(--color-primary-highlight)",
                    color: "var(--color-primary)",
                  }}
                >
                  {plan.commissionOverride}% commission rate
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check
                          className="w-3.5 h-3.5 mt-0.5 shrink-0"
                          style={{ color: "var(--color-status-success)" }}
                        />
                      ) : (
                        <X
                          className="w-3.5 h-3.5 mt-0.5 shrink-0"
                          style={{ color: "var(--color-text-faint)" }}
                        />
                      )}
                      <span
                        className="text-xs"
                        style={{
                          color: feature.included
                            ? "var(--color-text)"
                            : "var(--color-text-faint)",
                        }}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.price === 0 ? "/auth/signup" : "/settings/subscription"}
                  className="block w-full text-center py-2.5 rounded-lg text-sm font-medium btn-press transition-colors"
                  style={
                    plan.popular
                      ? {
                          background: "var(--color-primary)",
                          color: "var(--color-text-inverse)",
                        }
                      : {
                          background: "var(--color-surface-offset)",
                          color: "var(--color-text)",
                        }
                  }
                >
                  {plan.price === 0 ? "Start Free" : "Start Free Trial"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission Comparison Table ─────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
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
              Pay Less as You Grow
            </h2>
            <p
              className="text-sm max-w-xl mx-auto leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              Commission rates decrease with higher subscription tiers. The
              table below shows rates by provider type and plan.
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
                    {PLANS.map((plan) => (
                      <th
                        key={plan.id}
                        className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          color: plan.popular
                            ? "var(--color-primary)"
                            : "var(--color-text-muted)",
                        }}
                      >
                        {plan.name}
                      </th>
                    ))}
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
                        {(["free", "basic", "pro", "enterprise"] as PlanId[]).map(
                          (planId) => (
                            <td
                              key={planId}
                              className="text-center px-4 py-3 text-sm"
                              style={{
                                color:
                                  planId === "pro"
                                    ? "var(--color-primary)"
                                    : "var(--color-text)",
                                fontWeight: planId === "pro" ? 600 : 400,
                              }}
                            >
                              {row.rates[planId]}%
                            </td>
                          ),
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section
        className="py-14 sm:py-20"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
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
            {faqs.map((faq) => (
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
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
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
            Join Poojly as a service provider. Start free, upgrade when you are
            ready. No lock-in, no hidden fees.
          </p>
          <a
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg btn-press transition-colors"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-text-inverse)",
            }}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
