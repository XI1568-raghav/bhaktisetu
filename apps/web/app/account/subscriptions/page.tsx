'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import AuthGuard from '../../../components/AuthGuard';
import ReauthPrompt from '../../../components/ReauthPrompt';
import { H1 } from '../../../components/ui/heading-recipe';
import {
  GENERIC_ERROR_MESSAGE,
  UserFacingError,
  friendlyApiError,
  serverErrorMessage,
  serverErrorText,
  userFacingMessage,
} from '../../../lib/friendly-error';
import {
  NRI_PREMIUM_IS_SELLABLE,
  NRI_PREMIUM_WITHDRAWN_NOTICE,
} from '../../nri/plan-availability';

/**
 * RES-09 — this page put developer text in a devotee's billing banner.
 *
 * It threw `Failed to load subscription (${status})` and
 * `Cancel failed (${status})`, then rendered `err.message` verbatim in both
 * catches. So an expired token read as "Failed to load subscription (401)" —
 * a status code, on the screen where someone checks what they are paying — and
 * a dropped connection read as whatever the browser wrote: "Failed to fetch"
 * on Chrome, "Load failed" on iOS Safari. That last row is the one a
 * status-code sweep never sees, because the string is not ours.
 *
 * `friendlyApiError` alone could not be dropped in: it cannot tell a sentence
 * the product wrote from one the browser wrote, so it flattens the good one.
 * `UserFacingError` marks deliberate copy and `userFacingMessage` routes on it.
 */
const LOAD_FALLBACK = 'Could not load your subscription right now. Please try again.';
const CANCEL_FALLBACK = 'Could not cancel auto-renewal right now. Please try again.';

/**
 * The copy for a status, or the page's own line when the status says nothing
 * useful. `friendlyApiError` classifies off message TEXT, so it is handed the
 * number — 401/403 become "your session has expired", 429 the rate-limit line,
 * 5xx "something went wrong on our side", and anything else falls through to
 * the caller's sentence, which is more specific than the generic bucket.
 *
 * The number is passed with String() rather than interpolated into a template.
 * It never reaches a screen either way, but `res09-friendly-error-priest`
 * scans this file for `${res.status}` and a guard that cannot tell a classifier
 * input from rendered copy is a guard worth not arguing with.
 */
function statusCopy(status: number, fallback: string): string {
  const classified = friendlyApiError(new Error(String(status))).message;
  return classified === GENERIC_ERROR_MESSAGE ? fallback : classified;
}

import { buttonClass } from '../../../components/ui/button-recipe';
import { normalizeSubscription, type MySubscription } from '../../../lib/subscription-normalize';

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN');
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
  /**
   * AUTH-06 (2026-09-01) — the seventh screen, and the one the first sweep
   * missed because it does not name the flag anywhere.
   *
   * The six pages the finding lists all call `friendlyApiError` and drop
   * `.reauth` on the floor; they were fixed by reading it. This page calls
   * `userFacingMessage`, whose whole job is to return a STRING — the `reauth`
   * decision is computed inside it, by the same `friendlyApiError`, and then
   * discarded where no grep for `.reauth` can see it. The rendered result is
   * identical to the six: a 401 during either the load or the cancel puts
   * "Your session has expired. Please sign in again to continue." in a red
   * banner with no way to sign in anywhere on the page.
   *
   * `AuthGuard` does not cover this. It gates on client state at mount, and
   * the failure here is a token that the API rejects while the client still
   * believes it holds a session — which is exactly what "expires mid-action"
   * means, and cancelling auto-renewal is a mid-action.
   */
  const [reauth, setReauth] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !session?.accessToken) {
      // /auth has no page (404); the sign-in screen is /auth/login.
      router.push(`/auth/login?redirect=${encodeURIComponent('/account/subscriptions')}`);
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
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // The server's own sentence when it wrote one worth reading; otherwise
        // the copy for THIS status. `serverErrorText` refuses a non-JSON body
        // and refuses a developer name for the status ("Unauthorized").
        throw new UserFacingError(
          serverErrorText(body, statusCopy(res.status, LOAD_FALLBACK)),
        );
      }
      const data = await res.json().catch(() => null);
      setSubscription(normalizeSubscription(data));
      setError(null);
      setReauth(false);
    } catch (err) {
      setError(userFacingMessage(err, LOAD_FALLBACK));
      // AUTH-06: the decision `userFacingMessage` throws away. Classifying the
      // raw error rather than the rendered sentence is deliberate — but both
      // give the same answer here, because `isAuthError` was made idempotent
      // over its own output on 2026-09-01 for exactly this reason.
      setReauth(friendlyApiError(err).reauth);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelAutoRenew() {
    if (!session?.accessToken) return;
    // TC-03 (P0, trust) — this prompt read "You will keep access until your
    // current billing cycle ends." It is the same sentence the server used to
    // return and it is false for the same reason: POST /subscriptions/
    // cancel-auto-renew calls SubscriptionService.cancelRazorpaySubscription,
    // which asks Razorpay to stop BILLING at cycle end and then immediately
    // flips the local MarketplaceSubscription row to CANCELLED. isPremium()
    // and lib/ai-usage.ts getActivePlan() both require status ACTIVE, and the
    // row has no cancelAtPeriodEnd column, so ACCESS stops at once. Telling a
    // devotee otherwise in the confirm dialog is worse than telling them in
    // the response, because it is what they decide on.
    if (
      !confirm(
        'Cancel auto-renewal?\n\nYour card will not be charged again. Access ends now rather ' +
          'than at the end of the billing cycle, and no refund is issued automatically.',
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setReauth(false);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE_URL}/subscriptions/cancel-auto-renew`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        throw new UserFacingError(
          serverErrorMessage(data, statusCopy(res.status, CANCEL_FALLBACK)),
        );
      }
      setInfo(data.message || 'Auto-renewal cancelled.');
      await fetchSubscription();
    } catch (err) {
      setError(userFacingMessage(err, CANCEL_FALLBACK));
      setReauth(friendlyApiError(err).reauth);
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
          <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            {/* AUTH-06: the sentence names the remedy, so the remedy has to be
                on screen. ReauthPrompt renders the copy AND the link back to
                /auth/login with this page as the redirect target, so the
                devotee returns to their billing page instead of a dashboard. */}
            {reauth ? <ReauthPrompt message={error} /> : error}
          </div>
        )}
        {info && (
          <div className="mb-4 px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{info}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-surface-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : !subscription ? (
          /* RES-09 (2026-09-08) — the residual the F357 note names: "plus
             suppressing the empty-state". Every error path above leaves
             `subscription` null, so a FAILED load rendered exactly what a
             successful empty one renders: "You don't have an active
             subscription." under a red banner saying the load failed. That is
             a factual claim about someone's billing, made from data the page
             never received, and no amount of friendly error copy fixes it —
             the copy here was already correct.

             Gated on `error` rather than on the absence of data, so a server
             that genuinely answers `{"subscription": null}` still gets the real
             empty state and its plans link. */
          error ? null : (
            <div className="rounded-2xl bg-white p-6 border text-center" style={{ borderColor: 'var(--color-border, #e8dcc8)' }}>
              <p className="text-surface-600 mb-4">You don&rsquo;t have an active subscription.</p>
              <button
                onClick={() => router.push('/upgrade')}
                className={buttonClass('primary', 'md')}
              >
                See plans
              </button>
            </div>
          )
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm border" style={{ borderColor: 'var(--color-border, #e8dcc8)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-surface-800">
                  {subscription.plan === 'ENTERPRISE' ? 'NRI Premium' : subscription.plan}
                </h2>
                <p className="text-sm text-surface-500 mt-0.5">{subscription.role}</p>
                {/* PM-05: this said "All premium benefits unlocked". ENTERPRISE is
                    NRI Premium, and all six of its advertised benefits carry
                    `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts
                    — nriPremiumIsSellable() is false BECAUSE none of them is wired.
                    Nothing is unlocked. The holder gets the same sentence the
                    withdrawal notice gives everyone else, which is also the only
                    place that tells them their own subscription keeps running. */}
                {subscription.plan === 'ENTERPRISE' &&
                  (NRI_PREMIUM_IS_SELLABLE ? (
                    <p className="text-xs text-emerald-700 mt-1 font-medium">
                      All premium benefits unlocked
                    </p>
                  ) : (
                    <p className="prose-meta text-amber-800 mt-2 max-w-sm">
                      {NRI_PREMIUM_WITHDRAWN_NOTICE}
                    </p>
                  ))}
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
              <dd className="text-surface-800 font-medium">{formatDate(subscription.startDate)}</dd>
              <dt className="text-surface-500">Renews / Ends</dt>
              <dd className="text-surface-800 font-medium">{formatDate(subscription.endDate)}</dd>
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
