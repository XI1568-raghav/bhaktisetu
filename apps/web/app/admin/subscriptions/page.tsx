'use client';
export const runtime = 'edge';

import { useEffect, useMemo, useState } from 'react';
import {
 Loader2,
 AlertCircle,
 Filter,
 Sparkles,
 Inbox,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
 listAllSubscriptions,
 type MarketplaceSubscription,
} from '../../../lib/subscription-api';

const STATUSES = [
 { id: 'all', label: 'All' },
 { id: 'active', label: 'Active' },
 { id: 'pending', label: 'Pending' },
 { id: 'past_due', label: 'Past due' },
 { id: 'cancelled', label: 'Cancelled' },
 { id: 'expired', label: 'Expired' },
] as const;

type StatusFilter = (typeof STATUSES)[number]['id'];

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
 const { session } = useAuth();
 const [subs, setSubs] = useState<MarketplaceSubscription[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filter, setFilter] = useState<StatusFilter>('active');
 const [search, setSearch] = useState('');

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const data = await listAllSubscriptions(session?.accessToken);
 if (!cancelled) setSubs(data);
 } catch (err) {
 if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [session?.accessToken]);

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

 const stats = useMemo(() => {
 const active = subs.filter((s) => s.status === 'active');
 const mrr = active.reduce((sum, s) => sum + (s.plan?.priceMonthly ?? 0), 0);
 return { active: active.length, total: subs.length, mrr };
 }, [subs]);

 return (
 <div>
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
 <Sparkles className="w-6 h-6 text-saffron-600" />
 Marketplace subscriptions
 </h1>
 <p className="text-sm text-surface-500 mt-1">
 Active and historical subscriptions across all provider roles.
 </p>
 </div>
 </div>

 {error && (
 <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {error}
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
 <StatCard label="Active subs" value={String(stats.active)} />
 <StatCard label="Total records" value={String(stats.total)} />
 <StatCard label="Active MRR" value={formatINR(stats.mrr)} />
 </div>

 <div className="bg-white rounded-xl border border-surface-200 p-4 mb-5 flex flex-wrap items-end gap-3">
 <div className="flex-1 min-w-[220px]">
 <label className="text-[11px] font-semibold uppercase tracking-wide text-surface-500 block mb-1">
 Search
 </label>
 <input
 type="search"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="User ID, plan, razorpay subscription…"
 className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none"
 />
 </div>
 <div>
 <label className="text-[11px] font-semibold uppercase tracking-wide text-surface-500 block mb-1">
 Status
 </label>
 <select
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
 <Inbox className="w-8 h-8 text-surface-400 mx-auto mb-2" />
 <p className="text-sm text-surface-500">No subscriptions match the current filters.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
 <tr>
 <th className="text-left px-4 py-3 font-semibold">User</th>
 <th className="text-left px-4 py-3 font-semibold">Plan</th>
 <th className="text-right px-4 py-3 font-semibold">Price / mo</th>
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
 <div className="text-sm text-surface-800">
 {s.plan?.name ?? s.planId}
 </div>
 {s.plan?.role && (
 <div className="text-xs text-surface-500 capitalize">
 {String(s.plan.role).replace('_', ' ')}
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

function StatCard({ label, value }: { label: string; value: string }) {
 return (
 <div className="bg-white rounded-xl border border-surface-200 p-4">
 <p className="text-xs uppercase tracking-wider text-surface-500 font-semibold">{label}</p>
 <p className="text-2xl font-bold text-surface-900 mt-1">{value}</p>
 </div>
 );
}
