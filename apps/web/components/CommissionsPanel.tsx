'use client';

import { useEffect, useMemo, useState } from 'react';
import {
 Loader2,
 AlertCircle,
 Inbox,
 Filter,
 IndianRupee,
 Clock,
 ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import {
 listMyCommissions,
 listCommissions,
 COMMISSION_PAGE_SIZE,
 type Commission,
 type CommissionStatus,
} from '../lib/commission-api';

type StatusFilter = 'all' | CommissionStatus;

interface Props {
 mode?: 'me' | 'admin';
 title?: string;
 description?: string;
}

/**
 * batch9-review (2026-08-11): these ids are the WIRE values, and they must stay
 * that way.
 *
 * They used to be lowercase — and three of the six ('processing', 'failed',
 * 'on_hold') were PayoutRequestStatus values a Commission can never hold. The
 * API spreads the raw Prisma row, so every status arrives as 'PENDING' | 'PAID'
 * | 'REVERSED'. The result was that every chip except "All" matched zero rows:
 * an admin looking at 40 pending commissions worth Rs 3,20,000 clicked "Pending"
 * and read "No commissions with status pending" — a live settlement queue
 * reading as empty. The same mismatch zeroed both summary cards.
 */
const STATUSES: { id: StatusFilter; label: string }[] = [
 { id: 'all', label: 'All' },
 { id: 'PENDING', label: 'Pending' },
 { id: 'PAID', label: 'Paid' },
 { id: 'REVERSED', label: 'Reversed' },
];

const STATUS_LABEL: Record<string, string> = {
 PENDING: 'Pending',
 PAID: 'Paid',
 REVERSED: 'Reversed',
};

/** Money arrives as a stringified Decimal — coerce, never concatenate. */
function toNumber(v: string | number | null | undefined): number | null {
 if (v === null || v === undefined || v === '') return null;
 const n = Number(v);
 return Number.isFinite(n) ? n : null;
}

function formatINR(v: string | number | null | undefined): string {
 const n = toNumber(v);
 if (n === null) return '—';
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
 PENDING: 'bg-amber-100 text-amber-700',
 PAID: 'bg-green-100 text-green-700',
 // A refund reversal is not a failure — grey, not red, so it doesn't read as
 // an incident in the ledger.
 REVERSED: 'bg-surface-200 text-surface-700',
 };
 return map[status] ?? 'bg-surface-100 text-surface-600';
}

export function CommissionsPanel({ mode = 'me', title, description }: Props) {
 const { session } = useAuth();
 const [items, setItems] = useState<Commission[]>([]);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(COMMISSION_PAGE_SIZE);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filter, setFilter] = useState<StatusFilter>('all');

 useEffect(() => {
  let cancelled = false;
  setLoading(true);
  setError(null);
  (async () => {
   try {
    const res =
     mode === 'admin'
      ? await listCommissions(session?.accessToken, { page })
      : await listMyCommissions(session?.accessToken, { page });
    if (!cancelled) {
     setItems(res.items);
     setTotal(res.total);
     setPageSize(res.pageSize);
    }
   } catch (err) {
    if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load commissions');
   } finally {
    if (!cancelled) setLoading(false);
   }
  })();
  return () => {
   cancelled = true;
  };
 }, [mode, page, session?.accessToken]);

 const filtered = useMemo(() => {
  if (filter === 'all') return items;
  return items.filter((c) => c.status === filter);
 }, [items, filter]);

 const summary = useMemo(() => {
  // `amount` arrives from the API as a STRING (the Decimal is stringified so it
  // never round-trips through a JS float), so `sum + c.amount` was
  // concatenating digits — two rows of 800 and 1200 rendered as "08001200".
  // Coerce explicitly.
  //
  // `amount` IS the provider's earning under the fixed ledger convention
  // (apps/api/src/lib/commission-math.ts). There is no separate "net".
  const value = (c: Commission) => toNumber(c.amount) ?? 0;
  const totalEarned = items
   .filter((c) => c.status === 'PAID')
   .reduce((sum, c) => sum + value(c), 0);
  const pending = items
   .filter((c) => c.status === 'PENDING')
   .reduce((sum, c) => sum + value(c), 0);
  const lastPaid = items
   .filter((c) => c.status === 'PAID')
   .sort((a, b) => (b.processedAt ?? '').localeCompare(a.processedAt ?? ''))[0];
  return { totalEarned, pending, lastPaid };
 }, [items]);

 const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
 const rangeEnd = rangeStart === 0 ? 0 : rangeStart + items.length - 1;
 const hasMore = rangeEnd < total;
 // The summary and the status chips only see the rows actually loaded. Say so
 // rather than presenting one page as the whole ledger.
 const partial = total > items.length;

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
 : 'Your earnings after platform commission for completed bookings.')}
 </p>
 </div>

 {error && (
 <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 {error}
 </div>
 )}

 {mode === 'me' && !loading && !error && (
 <div className="space-y-2">
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
 value={summary.lastPaid ? formatINR(summary.lastPaid.amount) : '—'}
 subtitle={summary.lastPaid ? formatDate(summary.lastPaid.processedAt) : undefined}
 icon={ArrowUpRight}
 color="text-saffron-700"
 bg="bg-saffron-50"
 />
 </div>
 {partial && (
 <p className="text-xs text-surface-400">
 Totals cover the {items.length} records on this page of {total}.
 </p>
 )}
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
 {filter === 'all'
 ? 'No commission records yet.'
 : `No ${(STATUS_LABEL[filter] ?? filter).toLowerCase()} commissions.`}
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
 <th className="text-right px-4 py-3 font-semibold">Platform cut</th>
 {/* `Commission.amount` is the PROVIDER's earning, not the platform's
     deduction — see apps/api/src/lib/commission-math.ts. This column was
     labelled "Commission" and rendered as a negative, so a Rs 1,000 booking
     showed the provider "-Rs 800". The old "Net" column that sat next to it
     is gone: under the fixed convention Net and Provider earning are the
     same number, and showing both invited exactly the confusion
     commission-math.ts was written to end. */}
 <th className="text-right px-4 py-3 font-semibold">Provider earning</th>
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
 {c.bookingNumber ?? c.bookingId ?? '—'}
 </div>
 </td>
 {mode === 'admin' && (
 <td className="px-4 py-3">
 <div className="text-sm text-surface-800">{c.providerName ?? c.providerId}</div>
 {c.providerRole && (
 <div className="text-xs text-surface-500 capitalize">
 {c.providerRole.replace(/_/g, ' ').toLowerCase()}
 </div>
 )}
 </td>
 )}
 <td className="px-4 py-3 text-right text-sm text-surface-700">
 {formatINR(c.grossAmount)}
 </td>
 <td className="px-4 py-3 text-right text-sm text-surface-600">
 {formatINR(c.platformCut)}
 {c.ratePercent !== null && c.ratePercent !== undefined && (
 <span className="block text-xs text-surface-400">{c.ratePercent}%</span>
 )}
 </td>
 <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">
 {formatINR(c.amount)}
 </td>
 <td className="px-4 py-3">
 <span
 className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${statusClass(
 String(c.status),
 )}`}
 >
 {STATUS_LABEL[String(c.status)] ?? String(c.status)}
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

 {!loading && !error && total > 0 && (
 <div className="flex items-center justify-between gap-3 text-xs text-surface-500">
 <span>
 Showing {rangeStart}–{rangeEnd} of {total}
 {filter !== 'all' && filtered.length !== items.length
 ? ` (${filtered.length} on this page match "${STATUS_LABEL[filter] ?? filter}")`
 : ''}
 </span>
 {(page > 1 || hasMore) && (
 <div className="flex gap-2">
 <button
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 disabled={page <= 1}
 className="px-3 py-1.5 rounded-lg border border-surface-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-saffron-300"
 >
 Previous
 </button>
 <button
 onClick={() => setPage((p) => p + 1)}
 disabled={!hasMore}
 className="px-3 py-1.5 rounded-lg border border-surface-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-saffron-300"
 >
 Next
 </button>
 </div>
 )}
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
