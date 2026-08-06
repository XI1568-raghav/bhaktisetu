'use client';

/**
 * Temple payouts (revamp 2026-08-05).
 *
 * Previously this rendered <CommissionsPanel mode="me">, which queried
 * /commissions by providerId=user.id — but no Commission row is ever keyed to a
 * temple, so a temple manager always saw an EMPTY list. Now it reads the
 * temple's real payout rows from GET /temple-portal/payouts (TemplePayout —
 * the temple administration's share of each puja booking).
 */

import { useCallback, useEffect, useState } from 'react';
import { IndianRupee, Clock, CheckCircle2, Loader2, Inbox, Landmark } from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

interface TemplePayoutRow {
  id: string;
  bookingId: string;
  amount: string;
  status: string;
  reference: string | null;
  processedAt: string | null;
  createdAt: string;
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function TemplePayoutsContent() {
  const { session } = useAuth();
  const [rows, setRows] = useState<TemplePayoutRow[]>([]);
  const [pendingInr, setPendingInr] = useState(0);
  const [paidInr, setPaidInr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/temple-portal/payouts`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRows(j.payouts ?? []);
      setPendingInr(j.pendingInr ?? 0);
      setPaidInr(j.paidInr ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-800">Temple Payouts</h1>
        <p className="text-sm text-surface-500 mt-1">
          Your temple's share of every puja booked through Darshya.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Pending settlement</p>
              <p className="text-xl font-bold text-surface-800">{loading ? '…' : formatINR(pendingInr)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Settled (total)</p>
              <p className="text-xl font-bold text-surface-800">{loading ? '…' : formatINR(paidInr)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-100">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="font-semibold text-surface-800">Payout history</h2>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-surface-500 justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 text-center py-6">{error}</p>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-500">No temple payouts yet. They appear as pujas are booked and confirmed at your temple.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800">{formatINR(Number(r.amount))}</p>
                    <p className="text-xs text-surface-500">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {r.reference ? ` · ref ${r.reference}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.status === 'completed' ? 'Settled' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TemplePayoutsPage() {
  return (
    <AuthGuard allowedRoles={['temple_manager', 'admin']}>
      <TemplePayoutsContent />
    </AuthGuard>
  );
}
