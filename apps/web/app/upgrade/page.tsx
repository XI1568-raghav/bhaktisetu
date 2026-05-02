'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';

interface PlanCard {
  id: string;
  name: string;
  price: number;
  cadence: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

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
];

export default function UpgradePage() {
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return;

    if (!isAuthenticated || !session?.accessToken) {
      router.push(`/auth?redirect=${encodeURIComponent('/upgrade')}`);
      return;
    }

    setBusyPlanId(planId);
    setError(null);

    try {
      const isAutoRenew = planId === 'astro_monthly';
      const endpoint = isAutoRenew ? '/subscriptions/create' : '/subscriptions/subscribe';

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ planId, role: 'DEVOTEE' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Subscription failed (${res.status})`);
      }

      const data = (await res.json().catch(() => ({}))) as {
        subscription?: { shortUrl?: string | null; skipped?: boolean };
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
      className="min-h-screen px-4 py-12"
      style={{ background: 'var(--color-bg, #fffbf5)' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 gradient-saffron rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-surface-800 mb-2">
            Unlock Pandit Ji
          </h1>
          <p className="text-surface-500 max-w-xl mx-auto">
            Five free messages a month, then choose how you want to continue your
            spiritual journey on Darshya.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    Most popular
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
