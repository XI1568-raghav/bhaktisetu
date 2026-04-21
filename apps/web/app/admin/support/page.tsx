'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Filter,
} from 'lucide-react';
import {
  SAMPLE_ADMIN_TICKETS,
  SUPPORT_CATEGORIES,
  STATUSES,
  PRIORITIES,
  CATEGORY_MAP,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
} from '../../../lib/support';
import {
  StatusBadge,
  PriorityBadge,
  formatDate,
  timeAgo,
} from '../../../components/support/badges';

export default function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const open = SAMPLE_ADMIN_TICKETS.filter((t) => t.status === 'open').length;
    const inProgress = SAMPLE_ADMIN_TICKETS.filter((t) => t.status === 'in_progress').length;
    const todayIso = new Date().toISOString().slice(0, 10);
    const resolvedToday = SAMPLE_ADMIN_TICKETS.filter(
      (t) => t.status === 'resolved' && t.updatedAt.slice(0, 10) === todayIso,
    ).length;
    return { open, inProgress, resolvedToday, avgResponse: '1h 42m' };
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return SAMPLE_ADMIN_TICKETS.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (s) {
        const hay = `${t.id} ${t.subject} ${t.userName} ${t.userEmail}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [statusFilter, priorityFilter, categoryFilter, search]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-saffron-600" />
            Support Tickets
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage customer tickets across all categories.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Open tickets"
          value={stats.open}
          icon={AlertCircle}
          accent="amber"
        />
        <StatCard
          label="In progress"
          value={stats.inProgress}
          icon={Clock}
          accent="blue"
        />
        <StatCard
          label="Resolved today"
          value={stats.resolvedToday}
          icon={CheckCircle2}
          accent="green"
        />
        <StatCard
          label="Avg response time"
          value={stats.avgResponse}
          icon={TrendingUp}
          accent="saffron"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-surface-500 block mb-1">
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
                      {CATEGORY_MAP[t.category].emoji} {CATEGORY_MAP[t.category].name}
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
      <label className="text-[11px] font-semibold uppercase tracking-wide text-surface-500 block mb-1">
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
