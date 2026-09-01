'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '../../lib/t';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import AuthGuard from '../../components/AuthGuard';
import { NRI_PREMIUM_IS_SELLABLE } from '../nri/plan-availability';
import { H1 } from '../../components/ui/heading-recipe';
import { HAS_80G } from '../../lib/eighty-g';

interface PlanCard {
  id: string;
  name: string;
  price: number;
  priceUsd?: number;
  cadence: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge?: string;
}

/**
 * TC-03 / TC-04 (P0/P1, trust) — /upgrade was the only page left offering a buy
 * click on a plan the server refuses to sell.
 *
 * `nri_premium_yearly` is withdrawn: all six of its benefits carry
 * `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts, so
 * `nriPremiumIsSellable()` is false, `getPlans()` filters the plan out of
 * GET /subscriptions/plans, and BOTH activation rails throw
 * NRI_PREMIUM_WITHDRAWN_MESSAGE, which the routes return as a 400. This page
 * did not consult any of that — it hardcoded the card, listed all six
 * unenforced benefits (including "Free 80G receipt PDF", which is TC-01's
 * claim on a surface with a price next to it), and pointed "Go Premium" at a
 * request that can only fail. A devotee read the refusal only AFTER clicking,
 * because `data.error` is rendered into the error banner below.
 *
 * Gated on the same constant /nri uses — app/nri/plan-availability.ts, which
 * mirrors the server fact and is drift-tested against the API source by
 * __tests__/tc03-nri-plan-availability.test.tsx. Wire one benefit, flip that
 * one constant, and the card comes back with its rail unchanged.
 *
 * NOTE for whoever owns apps/web/__tests__: `upgrade-paid-plan-rail.test.tsx`
 * (PM-04) clicks `getByRole('button', { name: /go premium/i })` to prove the
 * ₹5,000 plan uses the paid rail. That card no longer renders, so that ONE
 * case must be retired — the price-based rail rule it guards is still covered
 * by the ₹99 and ₹499 cases in the same file, and by the server-side
 * subscriptions.paid-gate test.
 */
const NRI_PREMIUM_CARD: PlanCard = {
  id: 'nri_premium_yearly',
  name: 'NRI Premium',
  price: 5000,
  priceUsd: 60,
  cadence: 'per year',
  description: 'Annual all-access tier for our diaspora community',
  features: [
    'No ads anywhere on Darshya',
    'No NRI surcharge on bookings',
    'Priority booking 7 days early',
    'Weekly 1:1 priest call (Jitsi)',
    HAS_80G ? 'Free 80G receipt PDF' : 'Free donation receipt PDF',
    'Unlimited AI astro chat',
  ],
  cta: 'Go Premium',
  highlight: false,
  badge: 'For NRI',
};

const PLAN_CARDS: PlanCard[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    cadence: 'forever',
    description: '5 free messages every month',
    features: [
      '5 AI Pandit messages / month',
      'Access to scripture references',
      'Hindi + English support',
    ],
    cta: 'Current plan',
    highlight: false,
  },
  {
    id: 'astro_session',
    name: 'Single Session',
    price: 99,
    cadence: '24 hours',
    description: 'One-day pass for a focused conversation',
    features: [
      '30 AI Pandit messages',
      'Valid for 24 hours',
      'Personalized guidance',
      'Priority response',
    ],
    cta: 'Get session',
    highlight: false,
  },
  {
    id: 'astro_monthly',
    name: 'Monthly Unlimited',
    price: 499,
    cadence: 'per month',
    description: 'Unlimited spiritual guidance, every day',
    features: [
      'Unlimited AI Pandit chat',
      'All scriptures + astrology',
      'Priority responses',
      'Cancel anytime',
    ],
    cta: 'Subscribe',
    highlight: true,
  },
  ...(NRI_PREMIUM_IS_SELLABLE ? [NRI_PREMIUM_CARD] : []),
];

export default function UpgradePage() {
  return (
    <AuthGuard>
      <UpgradeInner />
    </AuthGuard>
  );
}

function UpgradeInner() {
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('upgrade');

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return;

    if (!isAuthenticated || !session?.accessToken) {
      router.push(`/auth?redirect=${encodeURIComponent('/upgrade')}`);
      return;
    }

    setBusyPlanId(planId);
    setError(null);

    try {
      // The NRI annual plan used to branch to /subscriptions/create-stripe-annual
      // (USD Stripe Checkout). That rail was removed 2026-08-11 — every plan now
      // goes through Razorpay in INR.
      //
      // PM-04 (prod sweep 2026-08-12): the endpoint used to be chosen by
      // CADENCE — only `astro_monthly` went to /subscriptions/create; the ₹99
      // pass and the ₹5,000 NRI annual went to /subscriptions/subscribe, which
      // wrote an ACTIVE row and a COMPLETED ₹-transaction with no payment
      // anywhere in between. It is chosen by PRICE now: anything that costs
      // money goes to the rail that can take money, and /subscribe is left to
      // the free tier it is safe for. The server enforces the same split (402
      // from /subscribe for a priced plan), so a stale client cannot re-open
      // the hole.
      const price = PLAN_CARDS.find((p) => p.id === planId)?.price ?? 0;
      const isPaid = price > 0;
      const endpoint = isPaid ? '/subscriptions/create' : '/subscriptions/subscribe';
      const isAutoRenew = isPaid;

      const body = { planId, role: 'DEVOTEE' };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Subscription failed (${res.status})`);
      }

      const data = (await res.json().catch(() => ({}))) as {
        subscription?: { shortUrl?: string | null; url?: string | null; skipped?: boolean };
      };

      if (isAutoRenew && data.subscription?.shortUrl) {
        window.location.href = data.subscription.shortUrl;
        return;
      }

      router.push('/ask-pandit?upgraded=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete upgrade');
      setBusyPlanId(null);
    }
  }

  return (
    <div
      className="min-h-[100dvh] px-4 py-12"
      style={{ background: 'var(--color-bg, #fffbf5)' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 gradient-saffron rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className={`${H1.catalogue} mb-2`}>
            {t('pageTitle')}
          </h1>
          <p className="text-surface-500 max-w-xl mx-auto">
            {t('pageSubtitle')}
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_CARDS.map((plan) => {
            const busy = busyPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className="rounded-2xl p-6 flex flex-col shadow-sm transition-all"
                style={{
                  background: '#fff',
                  border: plan.highlight
                    ? '2px solid var(--color-primary, #c2410c)'
                    : '1px solid var(--color-border, #e8dcc8)',
                  transform: plan.highlight ? 'translateY(-4px)' : 'none',
                }}
              >
                {plan.highlight && (
                  <div className="self-start mb-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-saffron-100 text-saffron-700">
                    {t('mostPopular')}
                  </div>
                )}
                {plan.badge && !plan.highlight && (
                  <div className="self-start mb-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {plan.badge}
                  </div>
                )}
                <h2 className="text-xl font-semibold text-surface-800">
                  {plan.name}
                </h2>
                <p className="text-sm text-surface-500 mt-1 mb-4">
                  {plan.description}
                </p>
                <div className="mb-5">
                  <span className="text-3xl font-bold text-surface-800">
                    {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-surface-400 ml-2">
                      / {plan.cadence}
                    </span>
                  )}
                  {plan.priceUsd && (
                    <div className="text-xs text-surface-500 mt-1">
                      Billed in INR via Razorpay
                    </div>
                  )}
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-surface-600"
                    >
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-saffron-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.id === 'free' || busy}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background:
                      plan.id === 'free'
                        ? 'var(--color-border, #e8dcc8)'
                        : 'var(--color-primary, #c2410c)',
                    color: plan.id === 'free' ? '#7a6a55' : '#fff',
                  }}
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-surface-400 mt-10">
          Payments powered by Razorpay. In demo mode (no Razorpay key) the
          subscription is created instantly so you can try the flow end-to-end.
        </p>
      </div>
    </div>
  );
}
