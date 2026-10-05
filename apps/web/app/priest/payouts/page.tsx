'use client';

import { useState, useEffect, useCallback } from 'react';
import {
 IndianRupee,
 TrendingUp,
 Clock,
 CheckCircle2,
 Loader2,
 Wallet,
 Calendar,
 ArrowUpRight,
 Inbox,
 Filter,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { UserFacingError, classifyUserFacing, serverErrorText } from '../../../lib/friendly-error';
import ReauthPrompt from '../../../components/ReauthPrompt';
import { balanceSplitCards, type BalanceSplit } from '../../../lib/payout-balance-labels';

// ─── Types ──────────────────────────────────────────────────────

type PayoutStatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed';

interface PayoutItem {
 id: string;
 amount: number;
 status: string;
 payoutMethod: string;
 payoutReference: string | null;
 processedAt: string | null;
 createdAt: string;
 booking: {
 id: string;
 bookingNumber: string;
 pujaType: { name: string };
 temple: { name: string };
 };
}

interface PayoutSummary {
 totalEarned: number;
 pending: number;
 lastPayout: { amount: number; date: string } | null;
}

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 });
}

function getPayoutStatusConfig(status: string) {
 const map: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
 pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', icon: Clock },
 processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-700', icon: Loader2 },
 completed: { label: 'Completed', cls: 'bg-tulsi-green-light/30 text-tulsi-green', icon: CheckCircle2 },
 failed: { label: 'Failed', cls: 'bg-red-100 text-red-700', icon: Clock },
 };
 return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600', icon: Clock };
}

// ─── Component ──────────────────────────────────────────────────

/** PF-18: the page size the table asks for. The API clamps to [1,100]. */
const PAGE_SIZE = 20;

export default function PriestPayoutsPage() {
 const { session } = useAuth();
 const [payouts, setPayouts] = useState<PayoutItem[]>([]);
 const [summary, setSummary] = useState<PayoutSummary | null>(null);
 // GET /payouts/balance: available / upcoming / requested. Optional: when it
 // cannot be read the cards fall back to the old single "Pending Payout" label.
 const [balance, setBalance] = useState<BalanceSplit | null>(null);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState<PayoutStatusFilter>('all');
 // PF-18: server-side paging. Matches the pager already on /priest/bookings.
 const [page, setPage] = useState(1);
 const [total, setTotal] = useState(0);
 const [totalPages, setTotalPages] = useState(1);
 // PF-15: a non-OK response used to be thrown and caught into an empty array
 // plus a zeroed summary, so any API hiccup rendered "You have no payout
 // records yet" over ₹0 cards — indistinguishable from a pandit who genuinely
 // has not been paid, and invisible to anyone watching. An unread ledger is an
 // error, never a balance.
 const [loadError, setLoadError] = useState<string | null>(null);
 // AUTH-06: whether the ledger refused because the SESSION is gone, in which
 // case Retry re-fires the same dead credential forever.
 const [loadReauth, setLoadReauth] = useState(false);

 // PF-18: the fetch used to carry no query string at all, so the API's 20-row
 // default silently capped the table while the summary cards above it
 // aggregated EVERY row — past 20 payouts the two stopped agreeing and nothing
 // said so. It also filtered client-side, which means a `failed` transfer
 // sitting on page 3 could not be found by any chip. Both now go to the
 // server, which already supports `status`, `page` and `limit` and returns
 // `total`/`totalPages` (routes/priest.ts GET /payouts).
 const fetchPayouts = useCallback(async () => {
 setLoading(true);
 setLoadError(null);
 try {
 const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
 if (filter !== 'all') qs.set('status', filter);
 const res = await fetch(`${API_BASE_URL}/priest/payouts?${qs.toString()}`, {
 headers: { Authorization: `Bearer ${session?.accessToken}` },
 });
 if (!res.ok) {
 const detail = await res.text().catch(() => '');
 // RES-09: the status code and a 140-char slice of the raw body were being
 // rendered to a pandit. The server's own sentence is kept when it wrote one.
 // AUTH-06: carry the status. `serverErrorText` refuses a developer name
 // for the status, so a 401 answering {"error":"Unauthorized"} falls back
 // to this page's own sentence and the 401 disappears — after which no
 // classifier can tell an expired session from a broken ledger query.
 throw new UserFacingError(
 serverErrorText(detail, 'Could not load your payouts. Please try again.'),
 res.status,
 );
 }
 const data = await res.json();
 setPayouts(data.payouts || []);
 setSummary(data.summary || null);
 setTotal(typeof data.total === 'number' ? data.total : (data.payouts?.length ?? 0));
 setTotalPages(Math.max(1, data.totalPages ?? 1));
 } catch (err) {
 setPayouts([]);
 setSummary(null);
 setTotal(0);
 setTotalPages(1);
 const { message, reauth } = classifyUserFacing(
 err,
 'Could not load your payouts. Please try again.',
 );
 setLoadError(message);
 setLoadReauth(reauth);
 } finally {
 setLoading(false);
 }
 // Keyed on the token, not the session object: a new object identity on every
 // render would re-arm the effect after each setState and re-fetch forever.
 }, [session?.accessToken, filter, page]);

 useEffect(() => {
 void fetchPayouts();
 }, [fetchPayouts]);

 useEffect(() => {
 if (!session?.accessToken) return;
 let cancelled = false;
 fetch(`${API_BASE_URL}/payouts/balance`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 })
 .then((r) => (r.ok ? r.json() : null))
 .then((d) => { if (!cancelled) setBalance(d && typeof d === 'object' ? d : null); })
 .catch(() => { if (!cancelled) setBalance(null); });
 return () => { cancelled = true; };
 }, [session?.accessToken]);

 // PF-18: the server already applied the status filter, so the page IS the
 // filtered set. Re-filtering here would drop rows the server deliberately
 // returned and reintroduce the "chip matches nothing on this page" bug.
 const filteredPayouts = payouts;

 function selectFilter(next: PayoutStatusFilter) {
 setFilter(next);
 setPage(1);
 }

 const summaryCards = [
 {
 // PF-12: this card said "Total Earned" over a figure that summed every
 // PriestPayout regardless of status, so the same pandit read ₹2,310 earned
 // here and ₹0 on /priest. The server now reports settled money only; the
 // label uses the dashboard EarningsCard's own word so the two screens can
 // never be read as contradicting each other again.
 label: 'Paid out',
 value: formatCurrency(summary?.totalEarned ?? 0),
 icon: IndianRupee,
 color: 'text-tulsi-green',
 bg: 'bg-tulsi-green-light/20',
 },
 // One mixed number is gone: Ready to withdraw / Upcoming / Requested come
 // from GET /payouts/balance. The old label is only the fallback when the
 // server did not send those fields.
 ...(balanceSplitCards(balance).length > 0
 ? balanceSplitCards(balance).map((c) => ({
 label: c.label,
 value: formatCurrency(c.amount),
 icon: Clock,
 color: 'text-amber-600',
 bg: 'bg-amber-50',
 }))
 : [
 {
 label: 'Pending Payout',
 value: formatCurrency(summary?.pending ?? 0),
 icon: Clock,
 color: 'text-amber-600',
 bg: 'bg-amber-50',
 },
 ]),
 {
 label: 'Last Payout',
 value: summary?.lastPayout ? formatCurrency(summary.lastPayout.amount) : 'N/A',
 subtitle: summary?.lastPayout ? formatDate(summary.lastPayout.date) : undefined,
 icon: ArrowUpRight,
 color: 'text-saffron-600',
 bg: 'bg-saffron-50',
 },
 ];

 // PF-18: PayoutStatusFilter has always declared 'failed' and
 // getPayoutStatusConfig has always rendered a red badge for it — the chip
 // row simply never offered it, so a pandit whose bank transfer bounced had
 // no way to filter to the one row he most needs to see. Every member of the
 // union now has a chip, so the two cannot fall out of step again.
 const statusFilters: { key: PayoutStatusFilter; label: string }[] = [
 { key: 'all', label: 'All' },
 { key: 'pending', label: 'Pending' },
 { key: 'processing', label: 'Processing' },
 { key: 'completed', label: 'Completed' },
 { key: 'failed', label: 'Failed' },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Header */}
 <div>
 <h1 className={H1.portal}>Payouts</h1>
 <p className="text-surface-500 mt-1">Track your earnings and payout history</p>
 </div>

 {/* PF-15: a ledger we could not read is an error, not a balance. Shown
     instead of — never alongside — the summary cards and the empty state. */}
 {!loading && loadError && (
 <div
 role="alert"
 className="flex flex-wrap items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
 >
 {/* AUTH-06: the sign-in link replaces Retry, never sits beside it. */}
 {loadReauth ? (
 <ReauthPrompt message={loadError} className="flex flex-1 flex-col items-start gap-3" />
 ) : (
 <>
 <span className="flex-1 min-w-[12rem]">{loadError}</span>
 <button
 type="button"
 onClick={() => { void fetchPayouts(); }}
 className="shrink-0 font-semibold underline underline-offset-2"
 >
 Retry
 </button>
 </>
 )}
 </div>
 )}

 {/* Summary Cards */}
 {!loading && !loadError && summary && (
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {summaryCards.map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.label}
 className="bg-white rounded-xl border border-surface-100 p-5"
 >
 <div className="flex items-center gap-3 mb-3">
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 <span className="text-sm text-surface-500">{card.label}</span>
 </div>
 <p className="text-lg font-semibold text-surface-800">{card.value}</p>
 {'subtitle' in card && card.subtitle && (
 <p className="text-xs text-surface-400 mt-0.5">{card.subtitle}</p>
 )}
 </div>
 );
 })}
 </div>
 )}

 {/* Filter */}
 <div className="flex items-center gap-3">
 <Filter className="w-4 h-4 text-surface-400" />
 <div className="flex gap-1 overflow-x-auto">
 {statusFilters.map((sf) => (
 <button
 key={sf.key}
 onClick={() => selectFilter(sf.key)}
 className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
 filter === sf.key
 ? 'bg-saffron-600 text-white'
 : 'bg-white border border-surface-200 text-surface-600 hover:border-saffron-300'
 }`}
 >
 {sf.label}
 </button>
 ))}
 </div>
 </div>

 {/* Loading */}
 {loading && (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
 </div>
 )}

 {/* Empty — only ever shown for a response we actually read. */}
 {!loading && !loadError && filteredPayouts.length === 0 && (
 <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
 <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-saffron-50">
 <Wallet className="h-8 w-8 text-saffron-400" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-surface-700">No payouts found</h3>
 <p className="text-sm text-surface-500">
 {filter === 'all'
 ? 'You have no payout records yet.'
 : `No payouts with "${filter}" status.`}
 </p>
 </div>
 )}

 {/* Payouts List */}
 {!loading && !loadError && filteredPayouts.length > 0 && (
 <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
 {/* Table header - desktop */}
 <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-50 text-xs font-semibold text-surface-500 uppercase tracking-wider border-b border-surface-100">
 <div className="col-span-4">Booking</div>
 <div className="col-span-2">Amount</div>
 <div className="col-span-2">Status</div>
 <div className="col-span-2">Date</div>
 <div className="col-span-2">Reference</div>
 </div>

 <div className="divide-y divide-surface-50">
 {filteredPayouts.map((payout) => {
 const statusCfg = getPayoutStatusConfig(payout.status);
 return (
 <div key={payout.id} className="px-5 py-4 hover:bg-surface-50/50 transition-colors">
 {/* Desktop layout */}
 <div className="hidden md:grid grid-cols-12 gap-4 items-center">
 <div className="col-span-4">
 <p className="text-sm font-medium text-surface-800">{payout.booking.pujaType.name}</p>
 <p className="text-xs text-surface-500">{payout.booking.temple.name}</p>
 <p className="text-xs text-surface-400 font-mono">{payout.booking.bookingNumber}</p>
 </div>
 <div className="col-span-2">
 <p className="text-sm font-bold text-surface-800">{formatCurrency(payout.amount)}</p>
 </div>
 <div className="col-span-2">
 <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${statusCfg.cls}`}>
 {statusCfg.label}
 </span>
 </div>
 <div className="col-span-2">
 <p className="text-sm text-surface-600">
 {payout.processedAt ? formatDate(payout.processedAt) : formatDate(payout.createdAt)}
 </p>
 </div>
 <div className="col-span-2">
 <p className="text-xs text-surface-500 font-mono truncate">
 {payout.payoutReference || '-'}
 </p>
 <p className="text-xs text-surface-400 capitalize">
 {payout.payoutMethod.replace('_', ' ')}
 </p>
 </div>
 </div>

 {/* Mobile layout */}
 <div className="md:hidden space-y-2">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm font-medium text-surface-800">{payout.booking.pujaType.name}</p>
 <p className="text-xs text-surface-500">{payout.booking.temple.name}</p>
 </div>
 <p className="text-sm font-bold text-surface-800">{formatCurrency(payout.amount)}</p>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
 {statusCfg.label}
 </span>
 <span className="text-xs text-surface-400 font-mono">{payout.booking.bookingNumber}</span>
 <span className="text-xs text-surface-400">
 {payout.processedAt ? formatDate(payout.processedAt) : formatDate(payout.createdAt)}
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* PF-18: without this, rows 21+ had no route to the screen — and the
     summary cards above kept aggregating every one of them, so the totals
     silently stopped matching the table. `total` is the server's count,
     never the length of what happens to be rendered. */}
 {!loading && !loadError && total > 0 && (
 <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-100 bg-white px-4 py-3">
 <p className="text-sm text-surface-500">
 Showing {filteredPayouts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
 {(page - 1) * PAGE_SIZE + filteredPayouts.length} of {total} payouts
 </p>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 disabled={page <= 1}
 className="px-3 py-1.5 text-sm font-medium rounded-lg border border-surface-200 text-surface-600 hover:border-saffron-300 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Previous
 </button>
 <span className="text-sm text-surface-500">
 Page {page} of {totalPages}
 </span>
 <button
 type="button"
 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
 disabled={page >= totalPages}
 className="px-3 py-1.5 text-sm font-medium rounded-lg border border-surface-200 text-surface-600 hover:border-saffron-300 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
