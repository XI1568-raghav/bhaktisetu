'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
 Plus,
 Ticket as TicketIcon,
 Inbox,
 ArrowRight,
 Loader2,
 AlertCircle,
} from 'lucide-react';
import {
 SUPPORT_CATEGORIES,
 STATUSES,
 ticketCategoryEmoji,
 ticketCategoryLabel,
 loadUserTickets,
 type Ticket,
 type TicketStatus,
 type TicketCategory,
} from '../../../lib/support';
import { listTickets } from '../../../lib/support-api';
import { useAuth } from '../../../lib/auth-context';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import {
 StatusBadge,
 PriorityBadge,
 formatDate,
} from '../../../components/support/badges';

export default function MyTicketsPage() {
 const { session } = useAuth();
 const [tickets, setTickets] = useState<Ticket[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
 const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const data = await listTickets(session?.accessToken);
 if (!cancelled) setTickets(data);
 } catch (err) {
 // Fall back to localStorage so offline / demo flows still render.
 if (!cancelled) {
 setTickets(loadUserTickets());
 setError(err instanceof Error ? err.message : 'Failed to load tickets');
 }
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [session?.accessToken]);

 const filtered = useMemo(() => {
 return tickets.filter((t) => {
 if (statusFilter !== 'all' && t.status !== statusFilter) return false;
 if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
 return true;
 });
 }, [tickets, statusFilter, categoryFilter]);

 return (
 <div className="bg-[#faf7f0] min-h-[100dvh] py-10">
 <div className="max-w-6xl mx-auto px-6">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className={H1.catalogue}>
 My tickets
 </h1>
 <p className="text-sm text-surface-500 mt-1">Track and reply to your support requests.</p>
 </div>
 <Link
 href="/support/ticket/new"
 className={buttonClass('primary', 'md')}
 >
 <Plus className="w-4 h-4" />
 New ticket
 </Link>
 </div>

 {error && (
 <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 <span>
 Showing locally cached tickets — couldn&apos;t reach the support
 server ({error}).
 </span>
 </div>
 )}

 {/* Filters */}
 <div className="bg-white rounded-xl border border-surface-200 p-4 mb-5 flex flex-wrap items-center gap-3">
 <div>
 <label className="text-xs font-semibold uppercase tracking-wide text-surface-500 block mb-1">
 Status
 </label>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
 className="px-3 py-1.5 rounded-lg border border-surface-200 text-sm bg-white"
 >
 <option value="all">All statuses</option>
 {STATUSES.map((s) => (
 <option key={s.id} value={s.id}>
 {s.label}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-semibold uppercase tracking-wide text-surface-500 block mb-1">
 Category
 </label>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | 'all')}
 className="px-3 py-1.5 rounded-lg border border-surface-200 text-sm bg-white"
 >
 <option value="all">All categories</option>
 {SUPPORT_CATEGORIES.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name}
 </option>
 ))}
 </select>
 </div>
 <div className="ml-auto text-sm text-surface-500">
 {filtered.length} ticket{filtered.length === 1 ? '' : 's'}
 </div>
 </div>

 {/* List */}
 {loading ? (
 <div className="flex items-center gap-2 text-sm text-surface-500 p-8">
 <Loader2 className="w-4 h-4 animate-spin" /> Loading tickets…
 </div>
 ) : filtered.length === 0 ? (
 <EmptyState hasAny={tickets.length > 0} />
 ) : (
 <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
 <table className="w-full text-sm">
 <thead className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
 <tr>
 <th className="text-left px-4 py-3 font-semibold">Ticket</th>
 <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Category</th>
 <th className="text-left px-4 py-3 font-semibold">Priority</th>
 <th className="text-left px-4 py-3 font-semibold">Status</th>
 <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Created</th>
 <th className="w-10 px-4 py-3" />
 </tr>
 </thead>
 <tbody>
 {filtered.map((t) => (
 <tr key={t.id} className="border-b border-surface-100 last:border-0 hover:bg-amber-50/40 transition-colors">
 <td className="px-4 py-3.5">
 <Link href={`/support/tickets/${t.id}`} className="block">
 <div className="font-mono text-xs text-saffron-700">{t.id}</div>
 <div className="font-medium text-surface-900 mt-0.5 line-clamp-1">{t.subject}</div>
 </Link>
 </td>
 <td className="px-4 py-3.5 hidden md:table-cell">
 <span className="text-xs text-surface-600">
 {ticketCategoryEmoji(t.category)} {ticketCategoryLabel(t.category)}
 </span>
 </td>
 <td className="px-4 py-3.5">
 <PriorityBadge priority={t.priority} />
 </td>
 <td className="px-4 py-3.5">
 <StatusBadge status={t.status} />
 </td>
 <td className="px-4 py-3.5 hidden sm:table-cell text-xs text-surface-500">
 {formatDate(t.createdAt)}
 </td>
 <td className="px-4 py-3.5">
 <Link
 href={`/support/tickets/${t.id}`}
 className="text-surface-400 hover:text-saffron-700"
 aria-label="Open"
 >
 <ArrowRight className="w-4 h-4" />
 </Link>
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

function EmptyState({ hasAny }: { hasAny: boolean }) {
 return (
 <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
 <div className="w-14 h-14 rounded-full bg-saffron-50 flex items-center justify-center mx-auto mb-4">
 <Inbox className="w-7 h-7 text-saffron-600" />
 </div>
 <h3 className="font-semibold text-surface-900 mb-1">
 {hasAny ? 'No tickets match those filters' : 'No tickets yet'}
 </h3>
 <p className="text-sm text-surface-500 mb-5">
 {hasAny
 ? 'Try adjusting the filters to see more.'
 : 'When you raise a support ticket, it will show up here.'}
 </p>
 <Link
 href="/support/ticket/new"
 className={buttonClass('primary', 'md')}
 >
 <TicketIcon className="w-4 h-4" /> Raise a ticket
 </Link>
 </div>
 );
}
