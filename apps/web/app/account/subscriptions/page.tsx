'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import AuthGuard from '../../../components/AuthGuard';
import { H1 } from '../../../components/ui/heading-recipe';

interface MySubscription {
  id: string;
  plan: string;
  role: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
}

export default function AccountSubscriptionsPage() {
  return (
    <AuthGuard>
      <AccountSubscriptionsInner />
    </AuthGuard>
  );
}

function AccountSubscriptionsInner() {
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !session?.accessToken) {
      router.push(`/auth?redirect=${encodeURIComponent('/account/subscriptions')}`);
      return;
    }
    void fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, session?.accessToken]);

  async function fetchSubscription() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/subscriptions/my`, {
        headers: { Authorization: `Bearer ${session!.accessToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load subscription (${res.status})`);
      const data = (await res.json()) as { subscription: MySubscription | null };
      setSubscription(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load subscription');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelAutoRenew() {
    if (!session?.accessToken) return;
    if (!confirm('Cancel auto-renewal? You will keep access until your current billing cycle ends.')) {
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE_URL}/subscriptions/cancel-auto-renew`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Cancel failed (${res.status})`);
      }
      setInfo(data.message || 'Auto-renewal cancelled.');
      await fetchSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel auto-renewal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] px-4 py-12" style={{ background: 'var(--color-bg, #fffbf5)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-14 h-14 gradient-saffron rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className={`${H1.portal} mb-1`}>My Subscriptions</h1>
          <p className="text-surface-500 text-sm">Manage your Darshya plan and auto-renewal</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        )}
        {info && (
          <div className="mb-4 px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{info}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-surface-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : !subscription ? (
          <div className="rounded-2xl bg-white p-6 border text-center" style={{ borderColor: 'var(--color-border, #e8dcc8)' }}>
            <p className="text-surface-600 mb-4">You don&rsquo;t have an active subscription.</p>
            <button
              onClick={() => router.push('/upgrade')}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--color-primary, #c2410c)' }}
            >
              See plans
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm border" style={{ borderColor: 'var(--color-border, #e8dcc8)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-surface-800">
                  {subscription.plan === 'ENTERPRISE' ? 'NRI Premium' : subscription.plan}
                </h2>
                <p className="text-sm text-surface-500 mt-0.5">{subscription.role}</p>
                {subscription.plan === 'ENTERPRISE' && (
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    All premium benefits unlocked
                  </p>
                )}
              </div>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: subscription.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                  color: subscription.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                }}
              >
                {subscription.status}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-y-2 text-sm mb-6">
              <dt className="text-surface-500">Amount</dt>
              <dd className="text-surface-800 font-medium">₹{subscription.amount}</dd>
              <dt className="text-surface-500">Started</dt>
              <dd className="text-surface-800 font-medium">{new Date(subscription.startDate).toLocaleDateString('en-IN')}</dd>
              <dt className="text-surface-500">Renews / Ends</dt>
              <dd className="text-surface-800 font-medium">{new Date(subscription.endDate).toLocaleDateString('en-IN')}</dd>
            </dl>

            {subscription.status === 'ACTIVE' && (
              <button
                onClick={handleCancelAutoRenew}
                disabled={busy}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ borderColor: '#fecaca', color: '#b91c1c', background: '#fff' }}
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Cancelling…
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" /> Cancel auto-renewal
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
