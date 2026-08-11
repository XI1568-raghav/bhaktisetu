'use client';

import { useEffect, useMemo, useState } from 'react';
import {
 Loader2,
 AlertCircle,
 Inbox,
 Filter,
 IndianRupee,
 Clock,
 CheckCircle2,
 ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import {
 listMyCommissions,
 listCommissions,
 type Commission,
 type CommissionStatus,
} from '../lib/commission-api';

type StatusFilter = 'all' | CommissionStatus;

interface Props {
 mode?: 'me' | 'admin';
 title?: string;
 description?: string;
}

const STATUSES: { id: StatusFilter; label: string }[] = [
 { id: 'all', label: 'All' },
 { id: 'pending', label: 'Pending' },
 { id: 'processing', label: 'Processing' },
 { id: 'paid', label: 'Paid' },
 { id: 'failed', label: 'Failed' },
 { id: 'on_hold', label: 'On hold' },
];

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
 pending: 'bg-amber-100 text-amber-700',
 processing: 'bg-blue-100 text-blue-700',
 paid: 'bg-green-100 text-green-700',
 failed: 'bg-red-100 text-red-700',
 on_hold: 'bg-surface-100 text-surface-600',
 };
 return map[status] ?? 'bg-surface-100 text-surface-600';
}

export function CommissionsPanel({ mode = 'me', title, description }: Props) {
 const { session } = useAuth();
 const [items, setItems] = useState<Commission[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filter, setFilter] = useState<StatusFilter>('all');

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const data =
 mode === 'admin'
 ? await listCommissions(session?.accessToken)
 : await listMyCommissions(session?.accessToken);
 if (!cancelled) setItems(data);
 } catch (err) {
 if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load commissions');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [mode, session?.accessToken]);

 const filtered = useMemo(() => {
 if (filter === 'all') return items;
 return items.filter((c) => c.status === filter);
 }, [items, filter]);

 const summary = useMemo(() => {
 // `amount` arrives from the API as a STRING (admin.ts stringifies the Decimal)
 // while the type says number, so `sum + c.amount` was concatenating digits —
 // two rows of 800 and 1200 rendered as "08001200". Coerce explicitly.
 const value = (c: Commission) => Number(c.netAmount ?? c.amount ?? 0) || 0;
 const totalEarned = items
 .filter((c) => c.status === 'paid')
 .reduce((sum, c) => sum + value(c), 0);
 const pending = items
 .filter((c) => c.status === 'pending' || c.status === 'processing')
 .reduce((sum, c) => sum + value(c), 0);
 const lastPaid = items
 .filter((c) => c.status === 'paid')
 .sort((a, b) => (b.processedAt ?? '').localeCompare(a.processedAt ?? ''))[0];
 return { totalEarned, pending, lastPaid };
 }, [items]);

 return (
 <div className="space-y-6 max-w-5xl">
 <div>
 <h1 className="text-lg font-semibold text-surface-800">
 {title ?? (mode === 'admin' ? 'All commissions' : 'My commissions')}
 </h1>
 <p className="text-surface-500 mt-1 text-sm">
 {description ??
 (mode === 'admin'
 ? 'Every commission record across providers.'
 : 'Net payouts after platform commission for completed bookings.')}
 </p>
 </div>

 {error && (
 <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {error}
 </div>
 )}

 {mode === 'me' && !loading && !error && (
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <SummaryCard
 label="Total earned (paid)"
 value={formatINR(summary.totalEarned)}
 icon={IndianRupee}
 color="text-green-700"
 bg="bg-green-50"
 />
 <SummaryCard
 label="Pending"
 value={formatINR(summary.pending)}
 icon={Clock}
 color="text-amber-700"
 bg="bg-amber-50"
 />
 <SummaryCard
 label="Last payout"
 value={summary.lastPaid ? formatINR(summary.lastPaid.netAmount ?? summary.lastPaid.amount) : '—'}
 subtitle={summary.lastPaid ? formatDate(summary.lastPaid.processedAt) : undefined}
 icon={ArrowUpRight}
 color="text-saffron-700"
 bg="bg-saffron-50"
 />
 </div>
 )}

 <div className="flex items-center gap-3">
 <Filter className="w-4 h-4 text-surface-400" />
 <div className="flex gap-1 overflow-x-auto">
 {STATUSES.map((s) => (
 <button
 key={s.id}
 onClick={() => setFilter(s.id)}
 className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
 filter === s.id
 ? 'bg-saffron-600 text-white'
 : 'bg-white border border-surface-200 text-surface-600 hover:border-saffron-300'
 }`}
 >
 {s.label}
 </button>
 ))}
 </div>
 </div>

 {loading ? (
 <div className="flex items-center gap-2 text-sm text-surface-500 p-8">
 <Loader2 className="w-4 h-4 animate-spin" /> Loading commissions…
 </div>
 ) : filtered.length === 0 ? (
 <div className="bg-white rounded-xl border border-surface-200 p-10 text-center">
 <Inbox className="w-8 h-8 text-surface-400 mx-auto mb-2" />
 <p className="text-sm text-surface-500">
 {filter === 'all' ? 'No commission records yet.' : `No commissions with status "${filter}".`}
 </p>
 </div>
 ) : (
 <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
 <tr>
 <th className="text-left px-4 py-3 font-semibold">Booking</th>
 {mode === 'admin' && <th className="text-left px-4 py-3 font-semibold">Provider</th>}
 <th className="text-right px-4 py-3 font-semibold">Gross</th>
 {/* `Commission.amount` is the PROVIDER's earning, not the platform's
     deduction — see apps/api/src/lib/commission-math.ts. This column was
     labelled "Commission" and rendered as a negative, so a Rs 1,000 booking
     showed the provider "-Rs 800". */}
 <th className="text-right px-4 py-3 font-semibold">Provider earning</th>
 <th className="text-right px-4 py-3 font-semibold">Net</th>
 <th className="text-left px-4 py-3 font-semibold">Status</th>
 <th className="text-left px-4 py-3 font-semibold">Date</th>
 <th className="text-left px-4 py-3 font-semibold">Reference</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((c) => (
 <tr key={c.id} className="border-b border-surface-100 last:border-0 hover:bg-amber-50/30">
 <td className="px-4 py-3">
 <div className="text-sm text-surface-800">{c.itemName ?? 'Booking'}</div>
 <div className="text-xs text-surface-500 font-mono">
 {c.bookingNumber ?? c.bookingId}
 </div>
 </td>
 {mode === 'admin' && (
 <td className="px-4 py-3">
 <div className="text-sm text-surface-800">{c.providerName ?? c.providerId}</div>
 {c.providerRole && (
 <div className="text-xs text-surface-500 capitalize">
 {c.providerRole.replace('_', ' ')}
 </div>
 )}
 </td>
 )}
 <td className="px-4 py-3 text-right text-sm text-surface-700">
 {formatINR(c.grossAmount)}
 </td>
 <td className="px-4 py-3 text-right text-sm text-emerald-700">
 {formatINR(c.amount)}
 </td>
 <td className="px-4 py-3 text-right text-sm font-semibold text-surface-900">
 {formatINR(c.netAmount ?? null)}
 </td>
 <td className="px-4 py-3">
 <span
 className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusClass(
 String(c.status),
 )}`}
 >
 {String(c.status).replace('_', ' ')}
 </span>
 </td>
 <td className="px-4 py-3 text-xs text-surface-500 whitespace-nowrap">
 {formatDate(c.processedAt ?? c.createdAt)}
 </td>
 <td className="px-4 py-3 text-xs text-surface-500 font-mono">
 {c.payoutReference ?? '—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 );
}

function SummaryCard({
 label,
 value,
 subtitle,
 icon: Icon,
 color,
 bg,
}: {
 label: string;
 value: string;
 subtitle?: string;
 icon: React.ComponentType<{ className?: string }>;
 color: string;
 bg: string;
}) {
 return (
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <div className="flex items-center gap-3 mb-3">
 <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${color}`} />
 </div>
 <span className="text-sm text-surface-500">{label}</span>
 </div>
 <p className="text-lg font-semibold text-surface-800">{value}</p>
 {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
 </div>
 );
}
