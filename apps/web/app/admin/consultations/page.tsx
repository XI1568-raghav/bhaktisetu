'use client';


import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Calendar,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

type AdminConsultation = {
  id: string;
  reference: string;
  userId: string;
  astrologerId: string;
  astrologerName: string;
  minutes: number;
  amountInr: number;
  currency: string;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | string;
  roomName: string | null;
  jitsiUrl: string | null;
  scheduledAt: string | null;
  createdAt: string;
  paidAt: string | null;
};

type StatusFilter = 'all' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_payment', label: 'Payment Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// P1#4: HttpOnly cookie `darshya_session` is canonical. Bearer header retained
// as additive transition fallback (in-memory session — no localStorage read).
// Every fetch MUST pass `credentials: 'include'` for cross-origin cookie send.
function buildAuthHeaders(accessToken: string | undefined): Record<string, string> {
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

function statusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return { cls: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' };
    case 'completed':
      return { cls: 'bg-blue-100 text-blue-700', label: 'Completed' };
    case 'cancelled':
      return { cls: 'bg-surface-100 text-surface-600', label: 'Cancelled' };
    case 'pending_payment':
      return { cls: 'bg-amber-100 text-amber-700', label: 'Payment Pending' };
    default:
      return { cls: 'bg-surface-100 text-surface-600', label: status };
  }
}

function shortId(uuid: string): string {
  return uuid.slice(0, 8);
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ListContent() {
  const { session } = useAuth();
  const [items, setItems] = useState<AdminConsultation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') qs.set('status', filter);
      const res = await fetch(`${API_BASE_URL}/consultation/admin/all?${qs}`, {
        headers: buildAuthHeaders(session?.accessToken),
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) throw new Error('Sign in required');
      if (res.status === 403) throw new Error('Admin role required');
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setItems(data.consultations ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter, session?.accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleComplete(c: AdminConsultation) {
    if (!window.confirm(`Mark ${c.reference} (${c.astrologerName}) as completed?`)) return;
    setActionId(c.id);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/consultation/${c.id}/complete`, {
        method: 'PATCH',
        headers: buildAuthHeaders(session?.accessToken),
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
      }
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not mark complete');
    } finally {
      setActionId(null);
    }
  }

  const summary = useMemo(() => {
    const byStatus = items.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {});
    return { confirmed: byStatus.confirmed ?? 0, completed: byStatus.completed ?? 0, pending: byStatus.pending_payment ?? 0 };
  }, [items]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-saffron-500" />
            Astrologer consultations
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Operator dashboard for the AstrologerConsultation table. {total} rows
            {filter !== 'all' ? ` (filtered: ${filter})` : ''}.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-saffron-700 hover:text-saffron-800 underline"
        >
          ← Back to admin
        </Link>
      </div>

      <div className="rounded-xl bg-white border border-surface-100 p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
          <p className="text-xs text-surface-500">Payment pending</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-600">{summary.confirmed}</p>
          <p className="text-xs text-surface-500">Confirmed (joinable)</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600">{summary.completed}</p>
          <p className="text-xs text-surface-500">Completed</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filter === f.key
                ? 'bg-saffron-600 text-white border-saffron-600'
                : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-saffron-500" />
          <span className="ml-3 text-surface-500 text-sm">Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-surface-100 bg-white py-16 text-center text-surface-500 text-sm">
          No consultations match the current filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-50 text-xs uppercase text-surface-500">
              <tr>
                <th className="text-left px-3 py-2">Ref</th>
                <th className="text-left px-3 py-2">Astrologer</th>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Scheduled</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-right px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const badge = statusBadge(c.status);
                const isActing = actionId === c.id;
                const canComplete = c.status === 'confirmed';
                return (
                  <tr key={c.id} className="border-t border-surface-100 hover:bg-surface-50">
                    <td className="px-3 py-2 font-mono text-xs text-surface-700">{c.reference}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-surface-800">{c.astrologerName}</p>
                      <p className="text-xs text-surface-400 font-mono">{c.astrologerId}</p>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-surface-500">{shortId(c.userId)}…</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-surface-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatWhen(c.scheduledAt)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-surface-800">
                      <span className="inline-flex items-center gap-0.5">
                        <IndianRupee className="w-3 h-3" />
                        {c.amountInr.toLocaleString('en-IN')}
                      </span>
                      <p className="text-xs text-surface-400">{c.minutes}m</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-surface-500">{formatWhen(c.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      {canComplete ? (
                        <button
                          type="button"
                          onClick={() => handleComplete(c)}
                          disabled={isActing}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Complete
                        </button>
                      ) : (
                        <span className="text-xs text-surface-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-surface-400">
        Note: until real astrologer onboarding maps slug → User UUID, only admin can drive
        the full booking lifecycle on this table. Showing latest 100 rows; refresh to reload.
      </p>
    </div>
  );
}

export default function AdminConsultationsPage() {
  return (
    <AuthGuard>
      <ListContent />
    </AuthGuard>
  );
}
