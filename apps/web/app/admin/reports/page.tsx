'use client';

import { useEffect, useState } from 'react';
import {
 TrendingUp,
 Users,
 MapPin,
 Download,
 Flame,
 Star,
 BarChart3,
 Loader2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
  getDashboard,
  getRevenue,
  getUsers,
  getReports,
  rowsToCsv,
  downloadCsv,
  type ReportsResponse,
} from '../../../lib/admin-api';
// AO-13: paginate the export to exhaustion. See the module for why a large
// `limit` is not a fix (the API clamps it to 100, silently).
import { fetchAllUsersForExport } from './export-users';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';
import { userFacingMessage } from '../../../lib/friendly-error';

type ExportType = 'users' | 'revenue' | 'all';

// Indian-locale grouping ("12,847") for headline numbers. Tiny helper so
// every cell on this page renders the same way without sprinkling
// `.toLocaleString('en-IN')` everywhere.
function inr(n: number): string {
  return n.toLocaleString('en-IN');
}

// Show "Rs. 18.7L" / "Rs. 1.2Cr" — matches the older mock format that
// designers signed off on, but driven by real DB revenue sums.
function revenueShort(amountInr: number): string {
  if (amountInr >= 1_00_00_000) {
    return `Rs. ${(amountInr / 1_00_00_000).toFixed(1)}Cr`;
  }
  if (amountInr >= 1_00_000) {
    return `Rs. ${(amountInr / 1_00_000).toFixed(1)}L`;
  }
  if (amountInr >= 1_000) {
    return `Rs. ${(amountInr / 1_000).toFixed(1)}K`;
  }
  return `Rs. ${amountInr}`;
}

function formatChange(changePct: number | null): { label: string; positive: boolean } {
  if (changePct === null) {
    return { label: '—', positive: true };
  }
  const sign = changePct >= 0 ? '+' : '';
  return { label: `${sign}${changePct}% vs last month`, positive: changePct >= 0 };
}

export default function AdminReportsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [exportLoading, setExportLoading] = useState<ExportType | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  // AO-13: the count that just left the building. Nobody re-counts a CSV
  // against the database, so the number has to be on screen at the moment of
  // export or a short file is never noticed.
  const [exportNote, setExportNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReportsLoading(true);
    setReportsError(null);
    getReports(token)
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setReportsError(userFacingMessage(err, 'Failed to load reports'));
        }
      })
      .finally(() => {
        if (!cancelled) setReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const today = () => new Date().toISOString().slice(0, 10);

  const handleExport = async (type: ExportType) => {
    setExportLoading(type);
    setExportError(null);
    setExportNote(null);
    try {
      if (type === 'users') {
        // AO-13: `getUsers(token)` with no params took the API's 20-row default
        // and wrote a CSV named like a complete export. Walk every page.
        const users = await fetchAllUsersForExport(getUsers, token);
        const rows = users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email ?? '',
          phone: u.phone,
          roles: (u.roles ?? []).join('|'),
          subscriptionTier: u.subscriptionTier ?? '',
          createdAt: u.createdAt,
        }));
        const csv = rowsToCsv(rows, [
          'id', 'fullName', 'email', 'phone', 'roles', 'subscriptionTier', 'createdAt',
        ]);
        downloadCsv(`darshya-users-${today()}.csv`, csv);
        setExportNote(`Exported ${rows.length} user${rows.length === 1 ? '' : 's'}.`);
      } else if (type === 'revenue') {
        const data = await getRevenue(token);
        const summaryRows = [
          { metric: 'Total Commissions (paid)', amountInr: data.totalCommissions },
          { metric: 'Total Subscriptions (active)', amountInr: data.totalSubscriptions },
          { metric: 'Pending Payouts', amountInr: data.pendingPayouts },
        ];
        const commissionRows = data.commissions.map((c) => ({
          metric: `Commission ${c.id}`,
          bookingId: c.bookingId,
          providerId: c.providerId,
          amountInr: c.amount,
          status: c.status,
          createdAt: c.createdAt,
        }));
        const csv =
          rowsToCsv(summaryRows, ['metric', 'amountInr']) +
          '\n' +
          rowsToCsv(commissionRows, [
            'metric', 'bookingId', 'providerId', 'amountInr', 'status', 'createdAt',
          ]);
        downloadCsv(`darshya-revenue-${today()}.csv`, csv);
        setExportNote(`Exported ${commissionRows.length} commission rows.`);
      } else {
        const [dash, rev, allUsers] = await Promise.all([
          getDashboard(token),
          getRevenue(token),
          // AO-13: "Export All" was capped at 20 users the same way.
          fetchAllUsersForExport(getUsers, token),
        ]);
        const dashRows = [
          { metric: 'Total Users', value: dash.totalUsers },
          { metric: 'Active Subscriptions', value: dash.activeSubscriptions },
          { metric: 'Pending Approvals', value: dash.pendingApprovals },
          { metric: 'Total Revenue', value: dash.totalRevenue },
          ...Object.entries(dash.usersByRole).map(([role, count]) => ({
            metric: `Users (${role})`,
            value: count,
          })),
        ];
        const revRows = [
          { metric: 'Total Commissions (paid)', value: rev.totalCommissions },
          { metric: 'Total Subscriptions (active)', value: rev.totalSubscriptions },
          { metric: 'Pending Payouts', value: rev.pendingPayouts },
        ];
        const userRows = allUsers.map((u) => ({
          metric: 'User',
          id: u.id,
          fullName: u.fullName,
          email: u.email ?? '',
          phone: u.phone,
          roles: (u.roles ?? []).join('|'),
          createdAt: u.createdAt,
        }));
        const csv =
          rowsToCsv(dashRows, ['metric', 'value']) +
          '\n' +
          rowsToCsv(revRows, ['metric', 'value']) +
          '\n' +
          rowsToCsv(userRows, [
            'metric', 'id', 'fullName', 'email', 'phone', 'roles', 'createdAt',
          ]);
        downloadCsv(`darshya-platform-${today()}.csv`, csv);
        setExportNote(`Exported ${userRows.length} user${userRows.length === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      // AO-13: a partial export is the same lie as a truncated one. The walk
      // throws rather than handing back what it managed to read, so nothing is
      // downloaded here — say so instead of leaving a stale success note up.
      setExportNote(null);
      setExportError(userFacingMessage(err, 'Export failed'));
    } finally {
      setExportLoading(null);
    }
  };

  const maxUsers = reports && reports.userGrowth.length > 0
    ? Math.max(...reports.userGrowth.map((m) => m.users), 1)
    : 1;
  const maxBookings = reports && reports.popularPujas.length > 0
    ? Math.max(...reports.popularPujas.map((p) => p.bookings), 1)
    : 1;
  const maxStatePct = reports && reports.geographicDistribution.length > 0
    ? Math.max(...reports.geographicDistribution.map((g) => g.pct), 1)
    : 1;

  // Headline trend pill ("+X% in 6 months"). Computed from the first and
  // last user-growth datapoints. Hidden when we lack two endpoints or the
  // start value was zero (division-by-zero / vanity inflation).
  const userGrowthTrend = (() => {
    if (!reports || reports.userGrowth.length < 2) return null;
    const first = reports.userGrowth[0]!.users;
    const last = reports.userGrowth[reports.userGrowth.length - 1]!.users;
    if (first <= 0) return null;
    const pct = ((last - first) / first) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% in 6 months`;
  })();

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className={H1.portal}>Reports</h1>
 <p className="text-sm text-surface-500 mt-0.5">Analytics, trends, and platform insights</p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => handleExport('users')}
 disabled={exportLoading !== null}
 className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium text-surface-700 rounded-lg hover:bg-surface-50 transition-colors disabled:opacity-60"
 >
 {exportLoading === 'users' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export Users
 </button>
 <button
 onClick={() => handleExport('revenue')}
 disabled={exportLoading !== null}
 className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium text-surface-700 rounded-lg hover:bg-surface-50 transition-colors disabled:opacity-60"
 >
 {exportLoading === 'revenue' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export Revenue
 </button>
 <button
 onClick={() => handleExport('all')}
 disabled={exportLoading !== null}
 className={buttonClass('primary', 'md')}
 >
 {exportLoading === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export All
 </button>
 </div>
 </div>

 {exportError && (
   <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     {exportError}
   </div>
 )}

 {/* AO-13: the row count of the file that was just downloaded. Shown only on
     success — the catch clears it, so a failed export can never leave a
     count on screen implying a file arrived. */}
 {exportNote && !exportError && (
   <div
     role="status"
     className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
   >
     {exportNote}
   </div>
 )}

 {reportsError && (
   <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     {reportsError}
   </div>
 )}

 {reportsLoading ? (
   <div className="flex items-center justify-center py-20 text-surface-500 text-sm">
     <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading live reports…
   </div>
 ) : (
 <>
 {/* User growth chart */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
 <Users className="w-4 h-4 text-blue-500" /> User Growth
 </h2>
 {userGrowthTrend && (
 <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
 <TrendingUp className="w-3 h-3" /> {userGrowthTrend}
 </span>
 )}
 </div>
 {reports && reports.userGrowth.length > 0 ? (
 <div className="flex items-end gap-4 h-48 px-2">
 {reports.userGrowth.map((m) => {
 const height = (m.users / maxUsers) * 100;
 const label = m.users >= 1000 ? `${(m.users / 1000).toFixed(1)}K` : String(m.users);
 return (
 <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
 <span className="text-xs font-semibold text-surface-800">{label}</span>
 <div className="w-full bg-surface-100 rounded-t-md relative" style={{ height: '150px' }}>
 <div
 className="absolute bottom-0 w-full bg-blue-500 rounded-t-md transition-all duration-500"
 style={{ height: `${height}%` }}
 />
 </div>
 <span className="text-xs text-surface-500">{m.month}</span>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-xs text-surface-500 py-8 text-center">No user growth data yet.</p>
 )}
 </div>

 {/* Booking stats */}
 {reports && reports.bookingStats.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 {reports.bookingStats.map((stat) => {
 const change = formatChange(stat.changePct);
 return (
 <div key={stat.label} className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
 <p className="text-xs text-surface-500">{stat.label}</p>
 <p className="text-xl font-bold text-surface-800 mt-1">{inr(stat.value)}</p>
 <span className={`text-xs font-medium ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
 {change.label}
 </span>
 </div>
 );
 })}
 </div>
 ) : null}

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Popular pujas */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
 <Flame className="w-4 h-4 text-saffron-500" /> Popular Pujas
 </h2>
 </div>
 <div className="p-5 space-y-3">
 {reports && reports.popularPujas.length > 0 ? reports.popularPujas.map((puja, i) => (
 <div key={puja.pujaTypeId} className="flex items-center gap-3">
 <span className="text-xs font-bold text-surface-400 w-5 text-right">{i + 1}</span>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-1">
 <span className="text-sm font-medium text-surface-800 truncate">{puja.name}</span>
 <span className="text-xs text-surface-500 shrink-0 ml-2">{puja.bookings} bookings</span>
 </div>
 <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
 <div
 className="h-full rounded-full bg-saffron-400"
 style={{ width: `${(puja.bookings / maxBookings) * 100}%` }}
 />
 </div>
 <div className="flex items-center gap-3 mt-1">
 {/* AO-15: this figure sums priceAmount over the bookings counted beside
     it, which now excludes cancelled/refunded but still includes rows in
     pending_payment. That is BOOKED value, not captured revenue, and it
     was rendered bare — an operator read "Rs. 54.7K" as money in the
     bank. The word is the whole fix; the number is honest with it. */}
 <span className="text-xs text-surface-500">
   {revenueShort(puja.revenueInr)} collected
   {puja.bookedValueInr !== undefined && puja.bookedValueInr !== puja.revenueInr && (
     <span className="text-surface-400"> · {revenueShort(puja.bookedValueInr)} booked</span>
   )}
 </span>
 {puja.avgRating !== null && (
 <span className="text-xs text-amber-600 flex items-center gap-0.5">
 <Star className="w-3 h-3" /> {puja.avgRating}
 </span>
 )}
 </div>
 </div>
 </div>
 )) : (
 <p className="text-xs text-surface-500 py-6 text-center">No puja bookings yet.</p>
 )}
 </div>
 </div>

 {/* Popular services + Geographic distribution */}
 <div className="space-y-6">
 {/* Popular services */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
 <BarChart3 className="w-4 h-4 text-purple-500" /> Popular Services
 </h2>
 </div>
 {reports && reports.popularServices.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[var(--color-border)]">
 <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Service</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Type</th>
 <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Sessions</th>
 <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Rating</th>
 </tr>
 </thead>
 <tbody>
 {reports.popularServices.map((s, i) => (
 <tr key={s.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
 <td className="py-2.5 px-5 font-medium text-surface-800">{s.name}</td>
 <td className="py-2.5 px-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.type === 'Astrology' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
 {s.type}
 </span>
 </td>
 <td className="py-2.5 px-4 text-right text-surface-600">{s.sessions}</td>
 <td className="py-2.5 px-5 text-right text-amber-600 font-medium">
 <span className="inline-flex items-center justify-end gap-0.5">
 <Star className="w-3 h-3" /> {s.rating !== null ? s.rating.toFixed(1) : '—'}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <p className="text-xs text-surface-500 py-6 px-5 text-center">No service activity yet.</p>
 )}
 </div>

 {/* Geographic distribution */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2 mb-4">
 <MapPin className="w-4 h-4 text-red-500" /> Geographic Distribution
 </h2>
 {reports && reports.geographicDistribution.length > 0 ? (
 <div className="space-y-2.5">
 {reports.geographicDistribution.map((g) => (
 <div key={g.state}>
 <div className="flex items-center justify-between text-sm mb-0.5">
 <span className="text-surface-600">{g.state}</span>
 <span className="text-surface-800 font-medium text-xs">
 {inr(g.users)} ({g.pct}%)
 </span>
 </div>
 <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
 <div
 className="h-full rounded-full bg-red-400"
 style={{ width: `${(g.pct / maxStatePct) * 100}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-xs text-surface-500 py-6 text-center">No location data captured yet.</p>
 )}
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 );
}
