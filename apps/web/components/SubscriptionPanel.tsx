'use client';

import { useEffect, useState } from 'react';
import {
 Check,
 X,
 Loader2,
 AlertCircle,
 Sparkles,
 Calendar,
 CreditCard,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import {
 listPlans,
 getMySubscription,
 subscribeToPlan,
 cancelMySubscription,
 openRazorpayCheckout,
 type SubscriptionPlan,
 type MarketplaceSubscription,
 type ProviderRole,
} from '../lib/subscription-api';

interface Props {
 role: ProviderRole;
 title?: string;
 description?: string;
}

function formatINR(n: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(n);
}

function formatDate(iso: string | null | undefined): string {
 if (!iso) return '—';
 return new Date(iso).toLocaleDateString('en-IN', {
 day: '2-digit',
 month: 'short',
 year: 'numeric',
 });
}

export function SubscriptionPanel({ role, title, description }: Props) {
 const { session, user } = useAuth();
 const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
 const [current, setCurrent] = useState<MarketplaceSubscription | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [actionPlanId, setActionPlanId] = useState<string | null>(null);
 const [actionError, setActionError] = useState<string | null>(null);
 const [cancelling, setCancelling] = useState(false);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const [p, mine] = await Promise.all([
 listPlans(role).catch(() => [] as SubscriptionPlan[]),
 getMySubscription(session?.accessToken).catch(() => null),
 ]);
 if (!cancelled) {
 setPlans(p);
 setCurrent(mine);
 }
 } catch (err) {
 if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load plans');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [role, session?.accessToken]);

 const handleSubscribe = async (plan: SubscriptionPlan) => {
 setActionError(null);
 setActionPlanId(plan.id);
 try {
 const resp = await subscribeToPlan(session?.accessToken, plan.id);
 setCurrent(resp.subscription);
 if (resp.keyId && resp.razorpaySubscriptionId) {
 const opened = await openRazorpayCheckout({
 keyId: resp.keyId,
 subscriptionId: resp.razorpaySubscriptionId,
 name: 'Darshya',
 description: `${plan.name} subscription`,
 prefill: {
 name: user?.fullName,
 email: user?.email ?? undefined,
 contact: user?.phone,
 },
 onSuccess: async () => {
 const refreshed = await getMySubscription(session?.accessToken).catch(() => null);
 if (refreshed) setCurrent(refreshed);
 },
 });
 if (!opened && resp.shortUrl) {
 window.open(resp.shortUrl, '_blank', 'noopener');
 }
 } else if (resp.shortUrl) {
 window.open(resp.shortUrl, '_blank', 'noopener');
 }
 } catch (err) {
 setActionError(err instanceof Error ? err.message : 'Could not start subscription');
 } finally {
 setActionPlanId(null);
 }
 };

 const handleCancel = async () => {
 setActionError(null);
 setCancelling(true);
 try {
 const updated = await cancelMySubscription(session?.accessToken);
 setCurrent(updated);
 } catch (err) {
 setActionError(err instanceof Error ? err.message : 'Could not cancel subscription');
 } finally {
 setCancelling(false);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center gap-2 text-sm text-surface-500 p-8">
 <Loader2 className="w-4 h-4 animate-spin" /> Loading subscription plans…
 </div>
 );
 }

 return (
 <div className="space-y-6 max-w-5xl">
 <div>
 <h1 className="text-lg font-semibold text-surface-800">{title ?? 'Subscription'}</h1>
 <p className="text-surface-500 mt-1 text-sm">
 {description ??
 'Choose a marketplace plan to unlock listings, lower commission, and premium tooling.'}
 </p>
 </div>

 {error && (
 <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {error}
 </div>
 )}

 {actionError && (
 <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {actionError}
 </div>
 )}

 {/* Current subscription */}
 {current && (
 <div className="bg-white rounded-xl border border-saffron-200 p-5">
 <div className="flex items-start justify-between gap-4 flex-wrap">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <Sparkles className="w-4 h-4 text-saffron-600" />
 <h2 className="text-sm font-semibold text-surface-900">
 Current plan: {current.plan?.name ?? current.planId}
 </h2>
 <StatusPill status={current.status} />
 </div>
 <div className="text-xs text-surface-500 flex items-center gap-3 flex-wrap mt-2">
 <span className="inline-flex items-center gap-1">
 <Calendar className="w-3.5 h-3.5" /> Started {formatDate(current.startedAt)}
 </span>
 {current.currentPeriodEnd && (
 <span className="inline-flex items-center gap-1">
 <CreditCard className="w-3.5 h-3.5" /> Renews {formatDate(current.currentPeriodEnd)}
 </span>
 )}
 </div>
 </div>
 {current.status === 'active' && (
 <button
 onClick={handleCancel}
 disabled={cancelling}
 className="text-xs font-medium px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1.5"
 >
 {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
 Cancel plan
 </button>
 )}
 </div>
 </div>
 )}

 {/* Plans grid */}
 {plans.length === 0 ? (
 <div className="bg-white rounded-xl border border-surface-200 p-10 text-center text-sm text-surface-500">
 No plans available for this role yet.
 </div>
 ) : (
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {plans.map((plan) => {
 const isCurrent = current?.planId === plan.id && current.status === 'active';
 const busy = actionPlanId === plan.id;
 return (
 <div
 key={plan.id}
 className={`rounded-xl border p-5 flex flex-col bg-white ${
 plan.popular ? 'border-saffron-400 shadow-sm' : 'border-surface-200'
 }`}
 >
 <div className="flex items-center justify-between mb-1">
 <h3 className="text-sm font-semibold text-surface-900">{plan.name}</h3>
 {plan.popular && (
 <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-saffron-100 text-saffron-700">
 Popular
 </span>
 )}
 </div>
 <div className="mb-3">
 <span className="text-2xl font-bold text-surface-900">
 {plan.priceMonthly > 0 ? formatINR(plan.priceMonthly) : 'Free'}
 </span>
 {plan.priceMonthly > 0 && (
 <span className="text-xs text-surface-500"> / month</span>
 )}
 </div>
 {plan.description && (
 <p className="text-xs text-surface-500 mb-3">{plan.description}</p>
 )}
 <ul className="space-y-1.5 mb-4 text-xs text-surface-700">
 <li className="flex items-start gap-2">
 <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
 {plan.commissionOverride}% commission
 </li>
 <li className="flex items-start gap-2">
 <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
 {plan.maxListings === null ? 'Unlimited listings' : `${plan.maxListings} listings`}
 </li>
 {plan.features?.map((f) => (
 <li key={f} className="flex items-start gap-2">
 <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
 {f}
 </li>
 ))}
 </ul>
 <button
 onClick={() => handleSubscribe(plan)}
 disabled={busy || isCurrent}
 className={`mt-auto w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
 isCurrent
 ? 'bg-surface-100 text-surface-500 cursor-not-allowed'
 : 'bg-saffron-600 hover:bg-saffron-700 text-white'
 }`}
 >
 {busy && <Loader2 className="w-4 h-4 animate-spin" />}
 {isCurrent ? 'Current plan' : busy ? 'Starting…' : 'Subscribe'}
 </button>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}

function StatusPill({ status }: { status: string }) {
 const map: Record<string, string> = {
 active: 'bg-green-100 text-green-700',
 cancelled: 'bg-surface-100 text-surface-600',
 past_due: 'bg-red-100 text-red-700',
 pending: 'bg-amber-100 text-amber-700',
 expired: 'bg-surface-100 text-surface-500',
 };
 return (
 <span
 className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
 map[status] ?? 'bg-surface-100 text-surface-600'
 }`}
 >
 {status.replace('_', ' ')}
 </span>
 );
}
