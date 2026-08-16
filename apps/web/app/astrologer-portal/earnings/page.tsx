'use client';

/**
 * Astrologer Earnings (revamp 2026-08-05).
 *
 * Previously this rendered the shared commissions panel pointed at an
 * admin-only commissions route — it 403'd every real astrologer, so the page
 * was dead. Now it reads the astrologer's OWN earnings from the new
 * /astrologer-portal/earnings endpoint (their 80% share).
 */

import { useEffect, useState } from 'react';
import { Loader2, IndianRupee, Clock, CheckCircle2, TrendingUp, Inbox } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';

interface EarningRow {
  id: string;
  bookingId: string | null;
  status: string;
  createdAt: string;
  grossAmountInr: number;
  platformCutInr: number;
  earningsInr: number;
}

interface Summary {
  totalEarningsInr: number;
  pendingInr: number;
  paidInr: number;
  astrologerShare: number;
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function AstrologerEarningsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<EarningRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/astrologer-portal/earnings`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (cancelled) return;
        setRows(j.data ?? []);
        setSummary(j.summary ?? null);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.accessToken]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className={H1.portal}>Earnings</h1>
        <p className="text-sm text-surface-500 mt-1">
          Your net earnings — you keep {summary ? Math.round(summary.astrologerShare * 100) : 80}% of every consultation.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Total earnings</p>
              <p className="text-lg font-bold text-surface-800">
                {loading ? '…' : formatINR(summary?.totalEarningsInr ?? 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Pending payout</p>
              <p className="text-lg font-bold text-surface-800">
                {loading ? '…' : formatINR(summary?.pendingInr ?? 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Paid out</p>
              <p className="text-lg font-bold text-surface-800">
                {loading ? '…' : formatINR(summary?.paidInr ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="bg-white rounded-xl border border-surface-100">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="font-semibold text-surface-800">Recent consultations</h2>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-surface-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-500">No consultations yet. Go online to start receiving bookings.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800">
                      {formatINR(r.earningsInr)} <span className="text-surface-400 font-normal">earned</span>
                    </p>
                    <p className="text-xs text-surface-500">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {' · '}gross {formatINR(r.grossAmountInr)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.status === 'PAID' ? 'Paid' : 'Pending'}
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
