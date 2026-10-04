'use client';

import { useCallback, useEffect, useState } from 'react';
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import {
 Users,
 UserCheck,
 IndianRupee,
 ClipboardCheck,
 TrendingUp,
 ArrowUpRight,
 Download,
 ChevronRight,
 RefreshCw,
 AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import {
 getDashboard,
 getPendingApprovals,
 getUsers,
 backendToUiRole,
 type BackendUser,
 type DashboardResponse,
 type PendingApprovalsResponse,
 type UsersResponse,
 type UiRole,
} from '../../lib/admin-api';
import { userFacingMessage } from '../../lib/friendly-error';
import WaitingBookingsCard from '../../components/admin/WaitingBookingsCard';

// ── Static label/colour maps (visual chrome — unchanged) ─────────────────────

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

// Per-role display order + bar colours. Server returns Prisma enum keys
// (DEVOTEE, PANDIT, …); we map to the UI's lowercase form for label lookup.
const roleBreakdownConfig: Array<{ backendKey: string; uiKey: string; color: string }> = [
 { backendKey: 'DEVOTEE', uiKey: 'devotee', color: 'bg-blue-500' },
 { backendKey: 'PANDIT', uiKey: 'priest', color: 'bg-saffron-600' },
 { backendKey: 'STORE_OWNER', uiKey: 'store_owner', color: 'bg-green-500' },
 { backendKey: 'ASTROLOGER', uiKey: 'astrologer', color: 'bg-purple-500' },
 { backendKey: 'WELLNESS_INSTRUCTOR', uiKey: 'wellness_instructor', color: 'bg-teal-500' },
 { backendKey: 'GAUSHALA_MANAGER', uiKey: 'gaushala_manager', color: 'bg-amber-500' },
 { backendKey: 'TEMPLE_MANAGER', uiKey: 'temple_manager', color: 'bg-red-500' },
];

const fullRoleLabels: Record<string, string> = {
 devotee: 'Devotees',
 priest: 'Pandits',
 store_owner: 'Store Owners',
 astrologer: 'Astrologers',
 wellness_instructor: 'Wellness Instructors',
 gaushala_manager: 'Gaushala Managers',
 temple_manager: 'Temple Managers',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

type UserStatus = 'active' | 'pending' | 'blocked';

interface SignupRow {
 id: string;
 name: string;
 email: string;
 role: UiRole;
 date: string;
 status: UserStatus;
}

function mapStatus(raw: BackendUser): UserStatus {
 const s = (raw.status ?? '').toLowerCase();
 if (s === 'blocked' || s === 'banned' || s === 'suspended') return 'blocked';
 if (s === 'pending' || s === 'pending_approval' || s === 'awaiting_approval') return 'pending';
 return 'active';
}

function mapUserToSignup(raw: BackendUser): SignupRow {
 const primary = (raw.roles?.[0] ?? 'DEVOTEE') as keyof typeof backendToUiRole;
 const uiRole = backendToUiRole[primary] ?? 'devotee';
 return {
 id: raw.id,
 name: raw.fullName,
 email: raw.email ?? '',
 role: uiRole,
 date: raw.createdAt,
 status: mapStatus(raw),
 };
}

// Indian rupee compactor: 24,80,000 → "Rs. 24.8L", 1,20,00,000 → "Rs. 1.2Cr".
// Keeps the same visual format as the original mock ("Rs. 24.8L").
function formatInrCompact(value: number): string {
 if (!Number.isFinite(value)) return 'Rs. 0';
 const abs = Math.abs(value);
 if (abs >= 1_00_00_000) return `Rs. ${(value / 1_00_00_000).toFixed(1)}Cr`;
 if (abs >= 1_00_000) return `Rs. ${(value / 1_00_000).toFixed(1)}L`;
 if (abs >= 1_000) return `Rs. ${(value / 1_000).toFixed(1)}K`;
 return `Rs. ${value.toLocaleString('en-IN')}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
 const { session } = useAuth();
 const token = session?.accessToken;

 const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
 const [approvals, setApprovals] = useState<PendingApprovalsResponse | null>(null);
 const [signups, setSignups] = useState<SignupRow[]>([]);

 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [signupsLoading, setSignupsLoading] = useState(true);
 const [signupsError, setSignupsError] = useState<string | null>(null);
 const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

 const fetchAll = useCallback(async () => {
 if (!token) return;
 setLoading(true);
 setSignupsLoading(true);
 setError(null);
 setSignupsError(null);

 const [dashRes, approvalRes, usersRes] = await Promise.allSettled([
 getDashboard(token),
 getPendingApprovals(token),
 getUsers(token, { limit: 10 }),
 ]);

 if (dashRes.status === 'fulfilled') {
 setDashboard(dashRes.value);
 } else {
 setError(userFacingMessage(dashRes.reason, 'Failed to load stats'));
 }

 if (approvalRes.status === 'fulfilled') {
 setApprovals(approvalRes.value);
 }
 // approvals failure is non-fatal — the dashboard stat tile already has
 // its own value from /dashboard. We just won't refresh the quick-action
 // sub-label if the dedicated endpoint flakes.

 if (usersRes.status === 'fulfilled') {
 const rows = (usersRes.value as UsersResponse).users.map(mapUserToSignup);
 setSignups(rows);
 } else {
 setSignupsError(userFacingMessage(usersRes.reason, 'Failed to load recent signups'));
 }

 setLoading(false);
 setSignupsLoading(false);
 setLastUpdated(new Date());
 }, [token]);

 useEffect(() => {
 fetchAll();
 }, [fetchAll]);

 // Stat tiles derived from the dashboard response. Active providers = sum of
 // every non-DEVOTEE / non-ADMIN role assignment.
 const activeProviders = dashboard
 ? Object.entries(dashboard.usersByRole)
 .filter(([role]) => role !== 'DEVOTEE' && role !== 'ADMIN')
 .reduce((sum, [, n]) => sum + n, 0)
 : 0;

 const stats = dashboard
 ? [
 {
 label: 'Total Users',
 value: dashboard.totalUsers.toLocaleString('en-IN'),
 icon: Users,
 color: 'bg-blue-50 text-blue-600',
 },
 {
 label: 'Active Providers',
 value: activeProviders.toLocaleString('en-IN'),
 icon: UserCheck,
 color: 'bg-green-50 text-green-600',
 },
 {
 label: 'Revenue This Month',
 value: formatInrCompact(dashboard.totalRevenue),
 icon: IndianRupee,
 color: 'bg-saffron-50 text-saffron-700',
 },
 {
 label: 'Pending Approvals',
 value: (approvals?.total ?? dashboard.pendingApprovals).toLocaleString('en-IN'),
 icon: ClipboardCheck,
 color: 'bg-amber-50 text-amber-600',
 },
 ]
 : [];

 // Per-role breakdown. The dashboard endpoint does return `usersByRole` so
 // we render real counts + computed percentages. If the map is empty we
 // hide the entire card (no fake placeholders).
 const totalRoleAssignments = dashboard
 ? Object.values(dashboard.usersByRole).reduce((sum, n) => sum + n, 0)
 : 0;

 const roleBreakdown = dashboard
 ? roleBreakdownConfig
 .map((cfg) => {
 const count = dashboard.usersByRole[cfg.backendKey] ?? 0;
 const pct = totalRoleAssignments > 0 ? (count / totalRoleAssignments) * 100 : 0;
 return {
 role: fullRoleLabels[cfg.uiKey] ?? cfg.uiKey,
 count,
 pct,
 color: cfg.color,
 };
 })
 .filter((r) => r.count > 0)
 : [];

 const showRoleBreakdownCard = roleBreakdown.length > 0;

 const handleExportCsv = () => {
 if (signups.length === 0) return;
 const header = 'Name,Email,Role,Date,Status\n';
 const rows = signups
 .map(
 (u) =>
 `"${u.name.replace(/"/g, '""')}","${u.email.replace(/"/g, '""')}",${u.role},${u.date},${u.status}`,
 )
 .join('\n');
 const blob = new Blob([header + rows], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `darshya-users-${new Date().toISOString().split('T')[0]}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 };

 return (
 <div className="space-y-6">
 {/* Page header */}
 <div className="flex items-center justify-between">
 <div>
 {/* DU-07: measured 18px — the smallest h1 in the product and smaller
     than an h3 on /pujas. The portal archetype is the compact one, but the
     page title still has to outrank its own sections. */}
 <h1 className={H1.portal}>Dashboard</h1>
 <p className="text-sm text-surface-500 mt-0.5">Platform overview and key metrics</p>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs text-surface-400" suppressHydrationWarning>
 {lastUpdated
 ? `Last updated: ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
 : 'Last updated: —'}
 </span>
 <button
 onClick={fetchAll}
 disabled={loading || signupsLoading || !token}
 className="p-1.5 rounded-md text-surface-400 hover:text-saffron-600 hover:bg-saffron-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
 title="Refresh"
 aria-label="Refresh dashboard"
 >
 <RefreshCw className={`w-4 h-4 ${loading || signupsLoading ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>

 {/* Stats grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {loading && !dashboard
 ? Array.from({ length: 4 }).map((_, i) => (
 <div
 key={i}
 className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] animate-pulse"
 >
 <div className="flex items-start justify-between">
 <div className="w-10 h-10 rounded-xl bg-surface-100" />
 <div className="h-3 w-10 bg-surface-100 rounded" />
 </div>
 <div className="mt-3 space-y-2">
 <div className="h-6 w-20 bg-surface-100 rounded" />
 <div className="h-3 w-24 bg-surface-100 rounded" />
 </div>
 </div>
 ))
 : error && !dashboard
 ? (
 <div className="col-span-full bg-[var(--color-surface)] rounded-xl p-5 border border-red-200 flex items-center justify-between">
 <div className="flex items-center gap-2 text-sm text-red-700">
 <AlertTriangle className="w-4 h-4" />
 Failed to load stats. {error}
 </div>
 <button
 onClick={fetchAll}
 className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
 >
 Retry
 </button>
 </div>
 )
 : stats.map((stat) => {
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
 <span className="inline-flex items-center gap-0.5 text-xs font-medium text-surface-400">
 <TrendingUp className="w-3 h-3" />
 live
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

 <div className={`grid grid-cols-1 ${showRoleBreakdownCard ? 'lg:grid-cols-3' : ''} gap-6`}>
 {/* User breakdown — hidden if backend returned no per-role data */}
 {showRoleBreakdownCard && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-base font-semibold text-surface-800 mb-4">User Breakdown by Role</h2>
 {loading && !dashboard ? (
 <div className="space-y-3 animate-pulse">
 {Array.from({ length: 5 }).map((_, i) => (
 <div key={i}>
 <div className="flex items-center justify-between mb-1">
 <div className="h-3 w-20 bg-surface-100 rounded" />
 <div className="h-3 w-12 bg-surface-100 rounded" />
 </div>
 <div className="w-full h-2 bg-surface-100 rounded-full" />
 </div>
 ))}
 </div>
 ) : (
 <div className="space-y-3">
 {roleBreakdown.map((item) => (
 <div key={item.role}>
 <div className="flex items-center justify-between text-sm mb-1">
 <span className="text-surface-600">{item.role}</span>
 <span className="text-surface-800 font-medium">
 {item.count.toLocaleString('en-IN')} ({item.pct.toFixed(1)}%)
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
 )}
 </div>
 )}

 {/* Recent signups */}
 <div className={`${showRoleBreakdownCard ? 'lg:col-span-2' : ''} bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]`}>
 <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
 {/* DU-07: measured 13.4px — smaller than the 16px body text under it. */}
 <h2 className="text-base font-semibold text-surface-800">Recent Signups</h2>
 <Link
 href="/admin/users"
 className="text-xs text-saffron-600 font-medium hover:text-saffron-700 tap-safe gap-1"
 >
 View All <ChevronRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 <div className="overflow-x-auto">
 {signupsLoading && signups.length === 0 ? (
 <div className="p-8 space-y-3 animate-pulse">
 {Array.from({ length: 5 }).map((_, i) => (
 <div key={i} className="h-8 bg-surface-100 rounded" />
 ))}
 </div>
 ) : signupsError ? (
 <div className="px-5 py-8 text-center">
 <p className="text-sm text-red-700 mb-3">Failed to load recent signups. {signupsError}</p>
 <button
 onClick={fetchAll}
 className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
 >
 Retry
 </button>
 </div>
 ) : signups.length === 0 ? (
 <div className="px-5 py-12 text-center text-sm text-surface-400">
 No recent signups yet.
 </div>
 ) : (
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
 {signups.map((user, i) => (
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
 )}
 </div>
 </div>
 </div>

 {/* Quick actions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <WaitingBookingsCard />
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
 <p className="text-xs text-surface-500 mt-1">
 {approvals
 ? `${approvals.total} pending approval${approvals.total === 1 ? '' : 's'}`
 : dashboard
 ? `${dashboard.pendingApprovals} pending approval${dashboard.pendingApprovals === 1 ? '' : 's'}`
 : '—'}
 </p>
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
 <p className="text-xs text-surface-500 mt-1">
 {dashboard ? `${formatInrCompact(dashboard.totalRevenue)} this month` : '—'}
 </p>
 </div>
 <ArrowUpRight className="w-5 h-5 text-surface-300 group-hover:text-saffron-500 transition-colors" />
 </div>
 </Link>

 <button
 onClick={handleExportCsv}
 disabled={signups.length === 0}
 className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] hover:border-saffron-200 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <div className="flex items-center justify-between">
 <div>
 <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
 <Download className="w-5 h-5 text-blue-600" />
 </div>
 <h3 className="text-sm font-semibold text-surface-800">Export Data</h3>
 <p className="text-xs text-surface-500 mt-1">
 {signups.length > 0
 ? `Download ${signups.length} recent signup${signups.length === 1 ? '' : 's'}`
 : 'No data to export yet'}
 </p>
 </div>
 <ArrowUpRight className="w-5 h-5 text-surface-300 group-hover:text-saffron-500 transition-colors" />
 </div>
 </button>
 </div>
 </div>
 );
}
