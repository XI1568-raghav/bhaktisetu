'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  IndianRupee,
  ClipboardCheck,
  ArrowRight,
  TrendingUp,
  ArrowUpRight,
  Download,
  ChevronRight,
} from 'lucide-react';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const stats = [
  {
    label: 'Total Users',
    value: '12,847',
    change: '+12.5%',
    trend: 'up',
    icon: Users,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Active Providers',
    value: '1,284',
    change: '+8.2%',
    trend: 'up',
    icon: UserCheck,
    color: 'bg-green-50 text-green-600',
  },
  {
    label: 'Revenue This Month',
    value: 'Rs. 24.8L',
    change: '+18.3%',
    trend: 'up',
    icon: IndianRupee,
    color: 'bg-saffron-50 text-saffron-700',
  },
  {
    label: 'Pending Approvals',
    value: '47',
    change: '+5',
    trend: 'up',
    icon: ClipboardCheck,
    color: 'bg-amber-50 text-amber-600',
  },
];

const roleBreakdown = [
  { role: 'Devotees', count: 9842, pct: 76.6, color: 'bg-blue-500' },
  { role: 'Pandits', count: 1123, pct: 8.7, color: 'bg-saffron-500' },
  { role: 'Store Owners', count: 687, pct: 5.3, color: 'bg-green-500' },
  { role: 'Astrologers', count: 412, pct: 3.2, color: 'bg-purple-500' },
  { role: 'Wellness Instructors', count: 318, pct: 2.5, color: 'bg-teal-500' },
  { role: 'Gaushala Managers', count: 265, pct: 2.1, color: 'bg-amber-500' },
  { role: 'Temple Managers', count: 200, pct: 1.6, color: 'bg-red-500' },
];

const recentSignups = [
  { id: '1', name: 'Priya Kumari', email: 'priya.kumari@gmail.com', role: 'devotee', date: '2026-04-16', status: 'active' },
  { id: '2', name: 'Pandit Vishnu Sharma', email: 'vishnu.sharma@gmail.com', role: 'priest', date: '2026-04-16', status: 'pending' },
  { id: '3', name: 'Arun Mehta', email: 'arun.mehta@gmail.com', role: 'store_owner', date: '2026-04-15', status: 'pending' },
  { id: '4', name: 'Deepa Nair', email: 'deepa.nair@gmail.com', role: 'devotee', date: '2026-04-15', status: 'active' },
  { id: '5', name: 'Jyotishi Rakesh Tiwari', email: 'rakesh.t@gmail.com', role: 'astrologer', date: '2026-04-15', status: 'pending' },
  { id: '6', name: 'Sneha Desai', email: 'sneha.desai@gmail.com', role: 'wellness_instructor', date: '2026-04-14', status: 'active' },
  { id: '7', name: 'Govind Yadav', email: 'govind.y@gmail.com', role: 'gaushala_manager', date: '2026-04-14', status: 'pending' },
  { id: '8', name: 'Meera Joshi', email: 'meera.j@gmail.com', role: 'devotee', date: '2026-04-14', status: 'active' },
  { id: '9', name: 'Rajesh Pandey', email: 'rajesh.p@gmail.com', role: 'temple_manager', date: '2026-04-13', status: 'pending' },
  { id: '10', name: 'Kavita Singh', email: 'kavita.s@gmail.com', role: 'devotee', date: '2026-04-13', status: 'active' },
];

const roleLabels: Record<string, string> = {
  devotee: 'Devotee',
  priest: 'Pandit',
  store_owner: 'Store Owner',
  astrologer: 'Astrologer',
  wellness_instructor: 'Wellness',
  gaushala_manager: 'Gaushala',
  temple_manager: 'Temple Mgr',
  admin: 'Admin',
};

const roleBadgeColors: Record<string, string> = {
  devotee: 'bg-blue-50 text-blue-700',
  priest: 'bg-saffron-50 text-saffron-700',
  store_owner: 'bg-green-50 text-green-700',
  astrologer: 'bg-purple-50 text-purple-700',
  wellness_instructor: 'bg-teal-50 text-teal-700',
  gaushala_manager: 'bg-amber-50 text-amber-700',
  temple_manager: 'bg-red-50 text-red-700',
  admin: 'bg-surface-100 text-surface-700',
};

const statusBadge: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  blocked: 'bg-red-50 text-red-700',
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-surface-800">Dashboard</h1>
          <p className="text-sm text-surface-500 mt-0.5">Platform overview and key metrics</p>
        </div>
        <span className="text-xs text-surface-400" suppressHydrationWarning>
          Last updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)]"
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-surface-800">{stat.value}</p>
                <p className="text-sm text-surface-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User breakdown */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">User Breakdown by Role</h2>
          <div className="space-y-3">
            {roleBreakdown.map((item) => (
              <div key={item.role}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-surface-600">{item.role}</span>
                  <span className="text-surface-800 font-medium">
                    {item.count.toLocaleString('en-IN')} ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-surface-800">Recent Signups</h2>
            <Link
              href="/admin/users"
              className="text-xs text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((user, i) => (
                  <tr
                    key={user.id}
                    className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/50' : ''}`}
                  >
                    <td className="py-3 px-5 font-medium text-surface-800">{user.name}</td>
                    <td className="py-3 px-4 text-surface-500 hidden sm:table-cell">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[user.role] || ''}`}>
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-surface-500 hidden md:table-cell">
                      {new Date(user.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge[user.status] || ''}`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/approvals"
          className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] hover:border-saffron-200 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-surface-800">Approve Providers</h3>
              <p className="text-xs text-surface-500 mt-1">47 pending approvals</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-surface-300 group-hover:text-saffron-500 transition-colors" />
          </div>
        </Link>

        <Link
          href="/admin/revenue"
          className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] hover:border-saffron-200 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                <IndianRupee className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-surface-800">View Revenue</h3>
              <p className="text-xs text-surface-500 mt-1">Rs. 24.8L this month</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-surface-300 group-hover:text-saffron-500 transition-colors" />
          </div>
        </Link>

        <button
          onClick={() => {
            const header = 'Name,Email,Role,Date,Status\n';
            const rows = recentSignups.map((u) =>
              `"${u.name}","${u.email}",${u.role},${u.date},${u.status}`
            ).join('\n');
            const blob = new Blob([header + rows], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `poojly-users-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] hover:border-saffron-200 transition-all group text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-surface-800">Export Data</h3>
              <p className="text-xs text-surface-500 mt-1">Download CSV reports</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-surface-300 group-hover:text-saffron-500 transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );
}
