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
import { H1 } from '../components/ui/heading-recipe';
import {
 listPlans,
 getMySubscription,
 subscribeToFreePlan,
 createSubscriptionCheckout,
 cancelMySubscription,
 openRazorpayCheckout,
 type SubscriptionPlan,
 type MarketplaceSubscription,
 type ProviderRole,
} from '../lib/subscription-api';
import { userFacingMessage } from '../lib/friendly-error';

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
 /** Plan name whose checkout is open and unconfirmed. Never a success claim. */
 const [pendingPayment, setPendingPayment] = useState<string | null>(null);
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
 if (!cancelled) setError(userFacingMessage(err, 'Failed to load plans'));
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [role, session?.accessToken]);

 /**
  * PM-04 — free and paid plans take different rails, and a paid plan is never
  * marked current until the server says it is.
  *
  * This used to call POST /subscriptions/subscribe for every plan and then run
  * `setCurrent(resp.subscription)` unconditionally. That endpoint takes no
  * payment — it writes an ACTIVE row and a COMPLETED transaction for the plan
  * price — and it returns no `keyId`/`razorpaySubscriptionId`, so the checkout
  * branch below it could never fire. Net effect: click Subscribe on Pandit Pro
  * and the panel confirmed a ₹2,999/mo plan that nothing had charged for.
  *
  * Paid plans now go to POST /subscriptions/create, the rail that mints a real
  * Razorpay subscription and records the transaction as PENDING. Its success
  * means "checkout is ready", so the panel says exactly that and re-reads
  * GET /my after the gateway reports payment — the current-plan card only ever
  * renders server state.
  */
 const handleSubscribe = async (plan: SubscriptionPlan) => {
 setActionError(null);
 setPendingPayment(null);
 setActionPlanId(plan.id);
 try {
 if (plan.priceMonthly <= 0) {
 const claimed = await subscribeToFreePlan(session?.accessToken, plan.id, role);
 if (!claimed) {
 setActionError(
 'We could not confirm the plan change with our server. Please reload and check your current plan before trying again.',
 );
 return;
 }
 setCurrent(claimed);
 return;
 }

 const checkout = await createSubscriptionCheckout(
 session?.accessToken,
 plan.id,
 role,
 );

 // No usable handle = no way to take the money. Say so; do NOT present the
 // plan as bought. `sub_demo_*` means the gateway keys are unset on the
 // server, which is a misconfiguration, not a purchase.
 if (!checkout || checkout.isDemo) {
 setActionError(
 `We could not start a secure payment for ${plan.name}, so nothing has been charged and your plan is unchanged. Please try again shortly or contact support.`,
 );
 return;
 }

 const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
 const opened = keyId
 ? await openRazorpayCheckout({
 keyId,
 subscriptionId: checkout.subscriptionId,
 name: 'Darshya',
 description: `${plan.name} subscription`,
 prefill: {
 name: user?.fullName,
 email: user?.email ?? undefined,
 contact: user?.phone,
 },
 onSuccess: async () => {
 // Only the server can say the mandate was authorised.
 const refreshed = await getMySubscription(session?.accessToken).catch(
 () => null,
 );
 if (refreshed) {
 setCurrent(refreshed);
 setPendingPayment(null);
 }
 },
 })
 : false;

 if (!opened) {
 if (!checkout.shortUrl) {
 setActionError(
 `We could not open the payment page for ${plan.name}. Nothing has been charged. Please try again shortly or contact support.`,
 );
 return;
 }
 window.open(checkout.shortUrl, '_blank', 'noopener');
 }
 setPendingPayment(plan.name);
 } catch (err) {
 setActionError(userFacingMessage(err, 'Could not start subscription'));
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
 setActionError(userFacingMessage(err, 'Could not cancel subscription'));
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
 <h1 className={H1.portal}>{title ?? 'Subscription'}</h1>
 {/* PM-01: this default used to read "…to unlock listings, lower commission,
   and premium tooling." No plan changes any commission rate — the five
   Commission writers in apps/api each apply a flat rate that never reads a
   subscription — so the middle third of that sentence was a promise the
   product cannot keep. The two claims that survive are the two the plan
   cards below actually back. */}
 <p className="text-surface-500 mt-1 text-sm">
 {description ??
 'Choose a marketplace plan to unlock more listings and premium tooling.'}
 </p>
 </div>

 {error && (
 <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {error}
 </div>
 )}

 {actionError && (
 <div
 data-testid="subscription-action-error"
 role="alert"
 className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
 >
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {actionError}
 </div>
 )}

 {/* PM-04: checkout opened, payment NOT confirmed. This is deliberately not
   a current-plan card — the subscription becomes active only when the
   webhook records the authorised mandate. */}
 {pendingPayment && (
 <div
 data-testid="subscription-pending-payment"
 role="status"
 className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800"
 >
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 <span>
 Payment for <strong>{pendingPayment}</strong> is waiting to be completed in
 the checkout window. Your plan changes once the payment is confirmed —
 nothing has been charged yet.
 </span>
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
 // PM-04: GET /my identifies the live subscription by TIER ('PRO'), not by
 // plan id, so an id-only comparison never matched and the panel offered
 // "Subscribe" on the plan the user was already paying for.
 const isCurrent =
 current?.status === 'active' &&
 (current.planId === plan.id ||
 (!!plan.tier && current.planId === plan.tier));
 const busy = actionPlanId === plan.id;
 // A priced plan the server cannot charge for yet: say so up front instead of
 // offering a button that can only end in an error. Free plans, the current
 // plan and Cancel are never affected.
 const opensSoon = plan.priceMonthly > 0 && plan.purchasable === false && !isCurrent;
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
 <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-saffron-100 text-saffron-700">
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
 {/* PM-02b: this line used to render unconditionally against a field
   /subscriptions/plans does not send, so `maxListings === null` claimed
   "Unlimited listings" on every plan including a 5-bookings/month Starter.
   Show it only when the server actually said something.

   PM-01: a sibling line rendered `{plan.commissionOverride}% commission`
   against a field the API has never sent either. It printed nothing because
   the value was always undefined — but the rate it WOULD print is one no
   Commission writer applies, so it was a false claim waiting for a payload.
   Both the render site and the field are gone. */}
 {plan.maxListings !== undefined && (
 <li className="flex items-start gap-2">
 <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
 {plan.maxListings === null ? 'Unlimited listings' : `${plan.maxListings} listings`}
 </li>
 )}
 {plan.features?.map((f) => (
 <li key={f} className="flex items-start gap-2">
 <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
 {f}
 </li>
 ))}
 </ul>
 {opensSoon && (
 <p className="mt-auto mb-2 text-xs text-surface-500" data-testid="plan-opens-soon-note">
 Paid plans are not open yet. Your Free plan stays active and nothing is charged.
 </p>
 )}
 <button
 onClick={() => handleSubscribe(plan)}
 disabled={busy || isCurrent || opensSoon}
 aria-disabled={busy || isCurrent || opensSoon}
 className={`${opensSoon ? '' : 'mt-auto '}w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
 isCurrent || opensSoon
 ? 'bg-surface-100 text-surface-500 cursor-not-allowed'
 : 'bg-saffron-600 hover:bg-saffron-700 text-white'
 }`}
 >
 {busy && <Loader2 className="w-4 h-4 animate-spin" />}
 {isCurrent ? 'Current plan' : opensSoon ? 'Opens soon' : busy ? 'Starting…' : 'Subscribe'}
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
 className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
 map[status] ?? 'bg-surface-100 text-surface-600'
 }`}
 >
 {status.replace('_', ' ')}
 </span>
 );
}
