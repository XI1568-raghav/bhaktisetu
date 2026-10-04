'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
 LifeBuoy,
 Search,
 Clock,
 CheckCircle2,
 AlertCircle,
 TrendingUp,
 Filter,
 Loader2,
} from 'lucide-react';
import {
 SUPPORT_CATEGORIES,
 STATUSES,
 PRIORITIES,
 ticketCategoryEmoji,
 ticketCategoryLabel,
 SAMPLE_ADMIN_TICKETS,
 type Ticket,
 type TicketStatus,
 type TicketPriority,
 type TicketCategory,
} from '../../../lib/support';
import { listTickets } from '../../../lib/support-api';
import { useAuth } from '../../../lib/auth-context';
import {
 StatusBadge,
 PriorityBadge,
 formatDate,
 timeAgo,
} from '../../../components/support/badges';
import { H1 } from '../../../components/ui/heading-recipe';
import { userFacingMessage } from '../../../lib/friendly-error';

export default function AdminSupportPage() {
 const { session } = useAuth();
 const [tickets, setTickets] = useState<Ticket[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
 const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
 const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
 const [search, setSearch] = useState('');

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const data = await listTickets(session?.accessToken, { all: true });
 if (!cancelled) setTickets(data);
 } catch (err) {
 if (!cancelled) {
 setTickets(SAMPLE_ADMIN_TICKETS);
 setError(userFacingMessage(err, 'Failed to load tickets'));
 }
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [session?.accessToken]);

 const stats = useMemo(() => {
 const open = tickets.filter((t) => t.status === 'open').length;
 const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
 const todayIso = new Date().toISOString().slice(0, 10);
 const resolvedToday = tickets.filter(
 (t) => t.status === 'resolved' && t.updatedAt.slice(0, 10) === todayIso,
 ).length;
 return { open, inProgress, resolvedToday, avgResponse: '—' };
 }, [tickets]);

 const filtered = useMemo(() => {
 const s = search.trim().toLowerCase();
 return tickets.filter((t) => {
 if (statusFilter !== 'all' && t.status !== statusFilter) return false;
 if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
 if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
 if (s) {
 const hay = `${t.id} ${t.subject} ${t.userName ?? ''} ${t.userEmail ?? ''}`.toLowerCase();
 if (!hay.includes(s)) return false;
 }
 return true;
 });
 }, [tickets, statusFilter, priorityFilter, categoryFilter, search]);

 return (
 <div>
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className={`${H1.portal} flex items-center gap-2`}>
 <LifeBuoy className="w-6 h-6 text-saffron-600" />
 Support Tickets
 </h1>
 <p className="text-sm text-surface-500 mt-1">
 Manage customer tickets across all categories.
 </p>
 </div>
 </div>

 {error && (
 <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
 Showing sample tickets — couldn&apos;t reach the support server ({error}).
 </div>
 )}

 {/* Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 <StatCard label="Open tickets" value={stats.open} icon={AlertCircle} accent="amber" />
 <StatCard label="In progress" value={stats.inProgress} icon={Clock} accent="blue" />
 <StatCard label="Resolved today" value={stats.resolvedToday} icon={CheckCircle2} accent="green" />
 <StatCard label="Avg response time" value={stats.avgResponse} icon={TrendingUp} accent="saffron" />
 </div>

 {/* Filter bar */}
 <div className="bg-white rounded-xl border border-surface-200 p-4 mb-5">
 <div className="flex flex-wrap items-end gap-3">
 <div className="flex-1 min-w-[220px]">
 <label className="text-xs font-semibold uppercase tracking-wide text-surface-500 block mb-1">
 Search
 </label>
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
 <input
 type="search"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Ticket ID, subject, user..."
 className="w-full pl-9 pr-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none"
 />
 </div>
 </div>
 <SelectFilter
 label="Status"
 value={statusFilter}
 onChange={(v) => setStatusFilter(v as TicketStatus | 'all')}
 options={[{ id: 'all', label: 'All' }, ...STATUSES]}
 />
 <SelectFilter
 label="Priority"
 value={priorityFilter}
 onChange={(v) => setPriorityFilter(v as TicketPriority | 'all')}
 options={[{ id: 'all', label: 'All' }, ...PRIORITIES]}
 />
 <SelectFilter
 label="Category"
 value={categoryFilter}
 onChange={(v) => setCategoryFilter(v as TicketCategory | 'all')}
 options={[
 { id: 'all', label: 'All' },
 ...SUPPORT_CATEGORIES.map((c) => ({ id: c.id, label: c.name })),
 ]}
 />
 <div className="ml-auto text-xs text-surface-500 flex items-center gap-1.5 pb-1">
 <Filter className="w-3.5 h-3.5" /> {filtered.length} results
 </div>
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
 {loading ? (
 <div className="flex items-center gap-2 text-sm text-surface-500 p-8">
 <Loader2 className="w-4 h-4 animate-spin" /> Loading tickets…
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
 <tr>
 <th className="text-left px-4 py-3 font-semibold">Ticket</th>
 <th className="text-left px-4 py-3 font-semibold">User</th>
 <th className="text-left px-4 py-3 font-semibold">Category</th>
 <th className="text-left px-4 py-3 font-semibold">Priority</th>
 <th className="text-left px-4 py-3 font-semibold">Status</th>
 <th className="text-left px-4 py-3 font-semibold">Assigned</th>
 <th className="text-left px-4 py-3 font-semibold">Created</th>
 <th className="text-left px-4 py-3 font-semibold">Updated</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((t) => (
 <tr
 key={t.id}
 className="border-b border-surface-100 last:border-0 hover:bg-amber-50/40"
 >
 <td className="px-4 py-3">
 <Link href={`/admin/support/${t.id}`} className="block">
 <div className="font-mono text-xs text-saffron-700">{t.id}</div>
 <div className="font-medium text-surface-900 mt-0.5 line-clamp-1 max-w-xs">
 {t.subject}
 </div>
 </Link>
 </td>
 <td className="px-4 py-3">
 <div className="text-sm text-surface-900">{t.userName}</div>
 <div className="text-xs text-surface-500">{t.userEmail}</div>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs text-surface-600 whitespace-nowrap">
 {ticketCategoryEmoji(t.category)} {ticketCategoryLabel(t.category)}
 </span>
 </td>
 <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
 <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
 <td className="px-4 py-3 text-xs text-surface-600">
 {t.assignedTo ?? <span className="text-surface-400">Unassigned</span>}
 </td>
 <td className="px-4 py-3 text-xs text-surface-500 whitespace-nowrap">
 {formatDate(t.createdAt)}
 </td>
 <td className="px-4 py-3 text-xs text-surface-500 whitespace-nowrap">
 {timeAgo(t.updatedAt)}
 </td>
 </tr>
 ))}
 {filtered.length === 0 && (
 <tr>
 <td colSpan={8} className="px-4 py-10 text-center text-sm text-surface-500">
 No tickets match the current filters.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 );
}

function StatCard({
 label,
 value,
 icon: Icon,
 accent,
}: {
 label: string;
 value: number | string;
 icon: React.ComponentType<{ className?: string }>;
 accent: 'amber' | 'blue' | 'green' | 'saffron';
}) {
 const accentMap = {
 amber: 'bg-amber-50 text-amber-700',
 blue: 'bg-blue-50 text-blue-700',
 green: 'bg-green-50 text-green-700',
 saffron: 'bg-saffron-50 text-saffron-700',
 };
 return (
 <div className="bg-white rounded-xl border border-surface-200 p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs uppercase tracking-wider text-surface-500 font-semibold">
 {label}
 </p>
 <p className="text-2xl font-bold text-surface-900 mt-1">{value}</p>
 </div>
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
 <Icon className="w-5 h-5" />
 </div>
 </div>
 </div>
 );
}

function SelectFilter({
 label,
 value,
 onChange,
 options,
}: {
 label: string;
 value: string;
 onChange: (v: string) => void;
 options: { id: string; label: string }[];
}) {
 return (
 <div>
 <label className="text-xs font-semibold uppercase tracking-wide text-surface-500 block mb-1">
 {label}
 </label>
 <select
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none"
 >
 {options.map((o) => (
 <option key={o.id} value={o.id}>
 {o.label}
 </option>
 ))}
 </select>
 </div>
 );
}
