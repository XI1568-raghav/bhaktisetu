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

import { useCallback, useEffect, useState } from 'react';
import { IndianRupee, Clock, CheckCircle2, Loader2, AlertCircle, Wallet, ArrowUpRight } from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth, type UserRole } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';

interface Balance {
  availableInr: number;
  pendingInr: number;
  paidOutInr: number;
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

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        fetch(`${API_BASE_URL}/payouts/balance`, { headers: { Authorization: `Bearer ${session.accessToken}` } }),
        fetch(`${API_BASE_URL}/payouts/my`, { headers: { Authorization: `Bearer ${session.accessToken}` } }),
      ]);
      if (bRes.ok) setBalance(await bRes.json());
      if (pRes.ok) {
        const j = await pRes.json();
        setPayouts(j.payouts ?? []);
      }
    } catch { /* keep */ }
    setLoading(false);
  }, [session?.accessToken]);

  useEffect(() => { load(); }, [load]);

  async function requestPayout() {
    if (!session?.accessToken) return;
    setRequesting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE_URL}/payouts/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ method: 'upi' }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice('Payout requested. It will be processed to your bank/UPI.');
        await load();
      } else {
        setError(j?.error ?? 'Could not request payout.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setRequesting(false);
  }

  return (
    <div className="min-h-[100dvh] bg-surface-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-surface-800">Payouts</h1>
        <p className="text-sm text-surface-500 mt-1">Withdraw your earnings to your bank / UPI.</p>

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
                <p className="text-xl font-bold text-surface-800">{loading ? '…' : formatINR(balance?.availableInr ?? 0)}</p>
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
                <p className="text-xl font-bold text-surface-800">{loading ? '…' : formatINR(balance?.pendingInr ?? 0)}</p>
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
                <p className="text-xl font-bold text-surface-800">{loading ? '…' : formatINR(balance?.paidOutInr ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

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
                <p className="font-semibold text-surface-800">Withdraw {loading ? '…' : formatINR(balance?.availableInr ?? 0)}</p>
                <p className="text-xs text-surface-500">Paid to your registered bank / UPI within 5-7 business days.</p>
              </div>
              <button
                onClick={requestPayout}
                disabled={requesting || loading || !balance || balance.availableInr <= 0}
                className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-semibold rounded-lg hover:bg-saffron-700 disabled:opacity-50"
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
