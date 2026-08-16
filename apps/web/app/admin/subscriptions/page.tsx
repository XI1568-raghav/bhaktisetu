'use client';

/**
 * /admin/subscriptions — marketplace subscriptions.
 *
 * AO-09 (prod sweep 2026-08-12, P1): this screen rendered "ACTIVE SUBS 0 /
 * TOTAL RECORDS 0 / ACTIVE MRR Rs. 0" and "No subscriptions match the current
 * filters", while /admin/revenue listed six Subscriptions-by-Role rows and
 * /admin/dashboard answered activeSubscriptions: 6 — all three reading the same
 * MarketplaceSubscription table. Two admin screens disagreed about one
 * quantity, and the one whose entire job is subscriptions was the wrong one.
 *
 * The cause is server-side: routes/admin-subscriptions.ts returns a literal
 * `const subs: unknown[] = []` plus a `note` field explaining itself that no UI
 * ever rendered. What this page can do is stop publishing a zero it cannot
 * support — take the count from the endpoints that DO query the table, show the
 * real per-role breakdown, and say plainly that per-subscription detail is
 * missing instead of "no subscriptions exist".
 *
 * The third tile is no longer called MRR. `MarketplaceSubscription.amount` is
 * what a subscription is billed over its own term — the live ENTERPRISE row is
 * Rs 5,000 for a year — so labelling a mixed monthly/annual sum "Active MRR"
 * overstates monthly recurring revenue 12x for every annual plan.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertCircle, Filter, Sparkles, Info } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import AuthGuard from '../../../components/AuthGuard';
import type { MarketplaceSubscription } from '../../../lib/subscription-api';
import {
  listAdminSubscriptions,
  fetchSubscriptionTotals,
  type SubscriptionTotals,
} from './subscriptions-api';
import { H1 } from '../../../components/ui/heading-recipe';

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'past_due', label: 'Past due' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'expired', label: 'Expired' },
] as const;

type StatusFilter = (typeof STATUSES)[number]['id'];

const roleLabels: Record<string, string> = {
  PANDIT: 'Pandit',
  STORE_OWNER: 'Store',
  ASTROLOGER: 'Astrologer',
  WELLNESS_INSTRUCTOR: 'Wellness',
  GAUSHALA_MANAGER: 'Gaushala',
  TEMPLE_MANAGER: 'Temple Mgr',
  DEVOTEE: 'Devotee',
  ADMIN: 'Admin',
};

function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
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

function statusClass(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    past_due: 'bg-red-100 text-red-700',
    cancelled: 'bg-surface-100 text-surface-600',
    expired: 'bg-surface-100 text-surface-500',
  };
  return map[status] ?? 'bg-surface-100 text-surface-600';
}

export default function AdminSubscriptionsPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminSubscriptionsContent />
    </AuthGuard>
  );
}

function AdminSubscriptionsContent() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [subs, setSubs] = useState<MarketplaceSubscription[]>([]);
  const [listNote, setListNote] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [totals, setTotals] = useState<SubscriptionTotals | null>(null);
  const [totalsError, setTotalsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      const [listResult, totalsResult] = await Promise.allSettled([
        listAdminSubscriptions(token),
        fetchSubscriptionTotals(token),
      ]);
      if (cancelled) return;

      if (listResult.status === 'fulfilled') {
        setSubs(listResult.value.subscriptions);
        setListNote(listResult.value.note);
      } else {
        setSubs([]);
        setListError(
          listResult.reason instanceof Error
            ? listResult.reason.message
            : 'Failed to load subscriptions',
        );
      }

      if (totalsResult.status === 'fulfilled') {
        setTotals(totalsResult.value);
      } else {
        setTotals(null);
        setTotalsError(
          totalsResult.reason instanceof Error
            ? totalsResult.reason.message
            : 'Failed to load subscription totals',
        );
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return subs.filter((sub) => {
      if (filter !== 'all' && sub.status !== filter) return false;
      if (s) {
        const hay = `${sub.userId} ${sub.plan?.name ?? sub.planId} ${sub.razorpaySubscriptionId ?? ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [subs, filter, search]);

  // The list endpoint returning nothing while the table holds ACTIVE rows is not
  // "no subscriptions" — it is a gap between two views of the same data, and the
  // operator has to be told which one is missing.
  const detailGap = !loading && subs.length === 0 && (totals?.activeCount ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${H1.portal} flex items-center gap-2`}>
            <Sparkles className="w-6 h-6 text-saffron-600" />
            Marketplace subscriptions
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Active and historical subscriptions across all provider roles.
          </p>
        </div>
      </div>

      {totalsError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Subscription totals unavailable — {totalsError}. The tiles read &ldquo;—&rdquo; rather
            than 0: an unknown count is not a count of zero.
          </span>
        </div>
      )}
      {listError && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Subscription list unavailable — {listError}. This is not an empty list.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Active subs"
          value={totals ? String(totals.activeCount) : '—'}
          hint="Same count as /admin/dashboard and /admin/revenue."
        />
        <StatCard
          label="Detail rows"
          value={loading ? '—' : String(subs.length)}
          hint="Per-subscription records this endpoint returned."
        />
        <StatCard
          label="Active subscription value"
          value={totals ? formatINR(totals.activeValue) : '—'}
          hint="Sum of each active subscription's billed amount over its own term — not a monthly figure."
        />
      </div>

      {(detailGap || listNote) && (
        <div className="mb-6 flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            {detailGap && (
              <p>
                Per-subscription detail is not available: the list endpoint returned 0 rows while{' '}
                {totals?.activeCount} subscriptions are ACTIVE. The breakdown below comes from
                /admin/revenue, which reads the same table. Nothing here means a subscription was
                cancelled.
              </p>
            )}
            {listNote && <p className={detailGap ? 'mt-1 text-xs' : ''}>{listNote}</p>}
          </div>
        </div>
      )}

      {/* Breakdown by plan + role — the real ACTIVE rows, grouped. */}
      {totals && totals.groups.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-surface-800">Active subscriptions by plan</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold">Role</th>
                  <th className="text-center px-4 py-3 font-semibold">Subs</th>
                  <th className="text-right px-4 py-3 font-semibold">Billed value</th>
                </tr>
              </thead>
              <tbody>
                {totals.groups.map((g) => (
                  <tr key={`${g.plan}-${g.role}`} className="border-b border-surface-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-surface-800">{g.plan}</td>
                    <td className="px-4 py-3 text-surface-600">{roleLabels[g.role] ?? g.role}</td>
                    <td className="px-4 py-3 text-center text-surface-600">{g.count}</td>
                    <td className="px-4 py-3 text-right text-surface-800">{formatINR(g.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label
            htmlFor="subscription-search"
            className="text-xs font-semibold uppercase tracking-wide text-surface-500 block mb-1"
          >
            Search
          </label>
          <input
            id="subscription-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="User ID, plan, razorpay subscription…"
            className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="subscription-status"
            className="text-xs font-semibold uppercase tracking-wide text-surface-500 block mb-1"
          >
            Status
          </label>
          <select
            id="subscription-status"
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-xs text-surface-500 flex items-center gap-1.5 pb-1">
          <Filter className="w-3.5 h-3.5" /> {filtered.length} results
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-surface-500 p-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading subscriptions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-surface-500">
              {detailGap
                ? 'This endpoint returns no per-subscription rows yet — see the note above.'
                : listError
                  ? 'The subscription list could not be loaded.'
                  : 'No subscriptions match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">User</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-right px-4 py-3 font-semibold">Billed</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Started</th>
                  <th className="text-left px-4 py-3 font-semibold">Renews</th>
                  <th className="text-left px-4 py-3 font-semibold">Razorpay sub</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-surface-100 last:border-0 hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-mono text-xs text-surface-700">{s.userId}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-surface-800">{s.plan?.name ?? s.planId}</div>
                      {s.plan?.role && (
                        <div className="text-xs text-surface-500">
                          {roleLabels[String(s.plan.role).toUpperCase()] ?? String(s.plan.role)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-surface-700">
                      {formatINR(s.plan?.priceMonthly ?? null)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusClass(s.status)}`}
                      >
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-500 whitespace-nowrap">
                      {formatDate(s.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-500 whitespace-nowrap">
                      {formatDate(s.currentPeriodEnd)}
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-500 font-mono">
                      {s.razorpaySubscriptionId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4">
      <p className="text-xs uppercase tracking-wider text-surface-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-surface-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-surface-400 mt-1 leading-snug">{hint}</p>}
    </div>
  );
}
