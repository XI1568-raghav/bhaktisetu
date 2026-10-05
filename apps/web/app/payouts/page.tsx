'use client';

/**
 * Unified provider payouts page (cross-cutting Phase 2, 2026-08-06).
 *
 * Before this, only priests had a payout surface (PriestPayout list); every
 * other provider role had a dead/empty earnings page with no way to actually
 * withdraw. This page is the single payout surface for ALL provider roles:
 * shows withdrawable balance, lets the provider request a payout (KYC-gated),
 * and lists their payout request history.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { IndianRupee, Clock, CheckCircle2, Loader2, AlertCircle, Wallet, ArrowUpRight } from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth, type UserRole } from '../../lib/auth-context';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import LoadErrorBanner from '../../components/LoadErrorBanner';
import {
  API_BASE_URL,
  DATA_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  loadErrorMessage,
  // AUTH-06: true ONLY for 401. A 403 on a payout screen is a suspended
  // provider, and sending her to sign in again succeeds and returns her to the
  // same refusal — see loadErrorIsForbidden in lib/api-config.ts.
  loadErrorIsReauth,
} from '../../lib/api-config';
import { serverErrorMessage } from '../../lib/friendly-error';

interface Balance {
  availableInr: number;
  /** Wellness earnings from sessions not yet held; not withdrawable until they run. */
  upcomingInr?: number;
  pendingInr: number;
  paidOutInr: number;
  /**
   * DI-05: the LEGACY pandit payout rail (PriestPayout), reported separately.
   * This page used to read the Commission ledger only, so a pandit whose
   * earnings sit on the sidecar rail saw his money on /priest/payouts and Rs 0
   * here — the page /settings/earnings redirects to. It is NOT part of
   * availableInr: POST /payouts/request settles Commission rows only, so
   * folding it in would put a withdrawable-looking figure next to a button
   * that cannot pay it.
   */
  legacyPandit?: {
    hasLegacyRail: boolean;
    pendingInr: number;
    paidOutInr: number;
  };
  kycVerified: boolean;
  kycOnFile: boolean;
}

interface PayoutRow {
  id: string;
  amount: string;
  status: string;
  method: string;
  reference: string | null;
  requestedAt: string;
  processedAt: string | null;
}

const PROVIDER_ROLES: UserRole[] = ['priest', 'astrologer', 'wellness_instructor', 'store_owner', 'temple_manager', 'gaushala_manager', 'admin'];

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function PayoutsContent() {
  const { session } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // RES-02: a failed load used to leave `balance` null, which every card below
  // renders as ₹0. A provider mid-incident was told they had ₹0 withdrawable,
  // ₹0 processing, ₹0 ever paid and "No payouts yet" — with no error anywhere.
  // That is the single most churn-inducing screen we own, and it was a lie.
  const [loadError, setLoadError] = useState<string | null>(null);
  // AUTH-06: the flag `loadErrorMessage` computes internally and this page used
  // to discard. Without it an expired session renders "sign in again" beside a
  // Retry that re-fires the request with the same dead credential.
  const [loadReauth, setLoadReauth] = useState(false);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setLoadError(null);
    try {
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      // RES-01: bare `fetch` has no timeout, so a stalled socket left this page
      // on "Available to withdraw …" forever — the `setLoading(false)` below
      // sits after an await that never returns.
      const [bRes, pRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE_URL}/payouts/balance`, { headers }, DATA_FETCH_TIMEOUT_MS),
        fetchWithTimeout(`${API_BASE_URL}/payouts/my`, { headers }, DATA_FETCH_TIMEOUT_MS),
      ]);
      if (bRes.ok) setBalance(await bRes.json());
      else {
        setLoadError(loadErrorMessage(bRes));
        setLoadReauth(loadErrorIsReauth(bRes));
      }
      if (pRes.ok) {
        const j = await pRes.json();
        setPayouts(j.payouts ?? []);
      } else if (bRes.ok) {
        setLoadError(loadErrorMessage(pRes));
        setLoadReauth(loadErrorIsReauth(pRes));
      }
    } catch (err) {
      setLoadError(loadErrorMessage(err));
      setLoadReauth(loadErrorIsReauth(err));
    }
    setLoading(false);
  }, [session?.accessToken]);

  useEffect(() => { load(); }, [load]);

  // RES-02: never print a currency figure the server did not send. While the
  // request is in flight that is an ellipsis; when it FAILED it is an em dash,
  // never ₹0 — a fabricated zero next to the word "withdraw" is what makes a
  // provider believe their earnings vanished.
  function money(n: number | undefined): string {
    if (loading) return '…';
    if (!balance) return '—';
    return formatINR(n ?? 0);
  }

  async function requestPayout() {
    if (!session?.accessToken) return;
    setRequesting(true);
    setError(null);
    setNotice(null);
    try {
      // RES-01: a stalled POST left "Requesting…" spinning forever on the one
      // button that moves the provider's money.
      const res = await fetchWithTimeout(`${API_BASE_URL}/payouts/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ method: 'upi' }),
      }, DATA_FETCH_TIMEOUT_MS);
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice('Payout requested. It will be processed to your bank/UPI.');
        await load();
      } else {
        setError(serverErrorMessage(j, 'Could not request payout.'));
      }
    } catch (err) {
      setError(loadErrorMessage(err));
    }
    setRequesting(false);
  }

  return (
    <div className="min-h-[100dvh] bg-surface-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className={H1.portal}>Payouts</h1>
        <p className="text-sm text-surface-500 mt-1">Withdraw your earnings to your bank / UPI.</p>

        {loadError && (
          <LoadErrorBanner
            message={loadError}
            reauth={loadReauth}
            onRetry={() => { void load(); }}
          />
        )}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}
        {notice && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {notice}
          </div>
        )}

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl border border-surface-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Available to withdraw</p>
                <p className="text-xl font-bold text-surface-800">{money(balance?.availableInr)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-surface-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Processing</p>
                <p className="text-xl font-bold text-surface-800">{money(balance?.pendingInr)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-surface-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Paid out (total)</p>
                <p className="text-xl font-bold text-surface-800">{money(balance?.paidOutInr)}</p>
              </div>
            </div>
          </div>
        </div>

        {(balance?.upcomingInr ?? 0) > 0 ? (
          <p className="mt-3 text-xs text-surface-500" data-testid="upcoming-inr">
            {money(balance?.upcomingInr)} earned from upcoming sessions. It becomes available to
            withdraw after the session has been held.
          </p>
        ) : null}

        {/* DI-05: legacy pandit rail. Only rendered when this provider actually
            has money on it, so no other role ever sees an empty extra card. */}
        {balance?.legacyPandit?.hasLegacyRail &&
        (balance.legacyPandit.pendingInr > 0 || balance.legacyPandit.paidOutInr > 0) ? (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-900">
              Earlier puja earnings (settled separately)
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {formatINR(balance.legacyPandit.pendingInr)} pending ·{' '}
              {formatINR(balance.legacyPandit.paidOutInr)} already paid
            </p>
            <p className="mt-2 text-xs text-amber-700">
              These bookings are paid out through your puja payouts, not the Withdraw
              button above. See them in your{' '}
              <Link href="/priest/payouts" className="underline font-medium">
                puja payouts
              </Link>
              .
            </p>
          </div>
        ) : null}

        {/* Request payout */}
        <div className="mt-6 bg-white rounded-xl border border-surface-100 p-6">
          {balance && !balance.kycOnFile ? (
            <div>
              <p className="text-sm text-surface-700 font-medium">Add your bank / UPI details to withdraw.</p>
              <p className="text-sm text-surface-500 mt-1">Complete KYC with your bank account or UPI to enable payouts.</p>
              <a href="/profile" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-saffron-600 hover:text-saffron-700">
                Complete KYC <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          ) : balance && !balance.kycVerified ? (
            <p className="text-sm text-surface-600">Your KYC is being verified. Payouts unlock once verified.</p>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-semibold text-surface-800">Withdraw {money(balance?.availableInr)}</p>
                <p className="text-xs text-surface-500">Paid to your registered bank / UPI within 5-7 business days.</p>
              </div>
              <button
                onClick={requestPayout}
                disabled={requesting || loading || !balance || balance.availableInr <= 0}
                className={buttonClass('primary', 'md')}
              >
                {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                {requesting ? 'Requesting…' : 'Request payout'}
              </button>
            </div>
          )}
        </div>

        {/* History */}
        <div className="mt-6 bg-white rounded-xl border border-surface-100">
          <div className="px-5 py-4 border-b border-surface-100">
            <h2 className="font-semibold text-surface-800">Payout history</h2>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="text-sm text-surface-400">Loading…</p>
            ) : loadError ? (
              // Never show "No payouts yet" for a list we failed to read — that
              // reads as "your payouts were deleted", not "we are down".
              <p className="text-sm text-surface-500 text-center py-6">Payout history unavailable — retry above.</p>
            ) : payouts.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-6">No payouts yet.</p>
            ) : (
              <div className="space-y-3">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-saffron-50 rounded-lg flex items-center justify-center shrink-0">
                      <IndianRupee className="w-4 h-4 text-saffron-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800">{formatINR(Number(p.amount))}</p>
                      <p className="text-xs text-surface-500">
                        {new Date(p.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {p.method ? ` · ${p.method.toUpperCase()}` : ''}
                        {p.reference ? ` · ref ${p.reference}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      p.status === 'completed' ? 'bg-green-100 text-green-700'
                      : p.status === 'rejected' || p.status === 'failed' ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <AuthGuard allowedRoles={PROVIDER_ROLES}>
      <PayoutsContent />
    </AuthGuard>
  );
}
