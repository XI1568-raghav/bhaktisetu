'use client';

import { useEffect, useState } from 'react';
import {
 IndianRupee,
 ArrowUpRight,
 Wallet,
 CreditCard,
 Send,
 ChevronRight,
 Loader2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
  getRevenue,
  getDashboard,
  type RevenueResponse,
  type DashboardResponse,
} from '../../../lib/admin-api';

const roleBadgeColors: Record<string, string> = {
 PANDIT: 'bg-saffron-50 text-saffron-700',
 STORE_OWNER: 'bg-green-50 text-green-700',
 ASTROLOGER: 'bg-purple-50 text-purple-700',
 WELLNESS_INSTRUCTOR: 'bg-teal-50 text-teal-700',
 GAUSHALA_MANAGER: 'bg-amber-50 text-amber-700',
 TEMPLE_MANAGER: 'bg-red-50 text-red-700',
 ADMIN: 'bg-surface-200 text-surface-700',
 DEVOTEE: 'bg-blue-50 text-blue-700',
};

const roleLabels: Record<string, string> = {
 PANDIT: 'Pandit',
 STORE_OWNER: 'Store',
 ASTROLOGER: 'Astrologer',
 WELLNESS_INSTRUCTOR: 'Wellness',
 GAUSHALA_MANAGER: 'Gaushala',
 TEMPLE_MANAGER: 'Temple Mgr',
 ADMIN: 'Admin',
 DEVOTEE: 'Devotee',
};

// Format paise/rupee scalar to a compact INR display: "Rs. 1.24Cr",
// "Rs. 8.6L", "Rs. 24,500". Caller passes whole rupees.
function formatInrCompact(amount: number): string {
  if (amount >= 1_00_00_000) return `Rs. ${(amount / 1_00_00_000).toFixed(2)}Cr`;
  if (amount >= 1_00_000) return `Rs. ${(amount / 1_00_000).toFixed(1)}L`;
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

export default function AdminRevenuePage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [rev, dash] = await Promise.all([getRevenue(token), getDashboard(token)]);
        if (cancelled) return;
        setRevenue(rev);
        setDashboard(dash);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load revenue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-surface-800">Revenue</h1>
          <p className="text-sm text-surface-500 mt-0.5">Platform revenue, commissions, and payout management</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <Loader2 className="w-6 h-6 text-surface-400 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-surface-500">Loading revenue data…</p>
        </div>
      </div>
    );
  }

  if (error || !revenue || !dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-surface-800">Revenue</h1>
          <p className="text-sm text-surface-500 mt-0.5">Platform revenue, commissions, and payout management</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Could not load revenue data.'}
        </div>
      </div>
    );
  }

  const totalRevenue = dashboard.totalRevenue;
  const totalCommissions = revenue.totalCommissions;
  const totalSubscriptions = revenue.totalSubscriptions;
  const pendingPayouts = revenue.pendingPayouts;

  const overviewCards = [
    { label: 'Total Revenue', value: formatInrCompact(totalRevenue), icon: IndianRupee, color: 'bg-green-50 text-green-600' },
    { label: 'Commissions Earned', value: formatInrCompact(totalCommissions), icon: Wallet, color: 'bg-saffron-50 text-saffron-600' },
    { label: 'Subscriptions', value: formatInrCompact(totalSubscriptions), icon: CreditCard, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending Payouts', value: formatInrCompact(pendingPayouts), icon: Send, color: 'bg-amber-50 text-amber-600' },
  ];

  // Subscription revenue by role.
  const totalSubAmount = revenue.subscriptionRevenue.reduce((sum, s) => sum + s.totalAmount, 0);
  const subBreakdown = revenue.subscriptionRevenue.map((s, i) => ({
    source: `${s.plan} · ${roleLabels[s.role] ?? s.role}`,
    amount: s.totalAmount,
    pct: totalSubAmount > 0 ? Math.round((s.totalAmount / totalSubAmount) * 1000) / 10 : 0,
    color: ['bg-saffron-500', 'bg-green-500', 'bg-purple-500', 'bg-teal-500', 'bg-amber-500', 'bg-red-500', 'bg-blue-500'][i % 7] ?? 'bg-saffron-500',
  }));

  // Commission rows for the side table.
  const commissionRows = revenue.commissions.slice(0, 12);

  // Pending payouts derived from PENDING-status commissions.
  const pendingPayoutRows = revenue.commissions.filter((c) => c.status === 'PENDING');

 return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-lg font-semibold text-surface-800">Revenue</h1>
 <p className="text-sm text-surface-500 mt-0.5">Platform revenue, commissions, and payout management</p>
 </div>

 {/* Overview cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {overviewCards.map((card) => {
 const Icon = card.icon;
 return (
 <div key={card.label} className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)]">
 <div className="flex items-start justify-between">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
 <Icon className="w-5 h-5" />
 </div>
 <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
 <ArrowUpRight className="w-3 h-3" />
 Live
 </span>
 </div>
 <p className="text-2xl font-bold text-surface-800 mt-3">{card.value}</p>
 <p className="text-sm text-surface-500 mt-0.5">{card.label}</p>
 </div>
 );
 })}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Subscription revenue by plan/role */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Subscription Revenue by Plan</h2>
 {subBreakdown.length === 0 ? (
   <p className="text-sm text-surface-400 py-6 text-center">No subscription revenue yet.</p>
 ) : (
 <div className="space-y-3">
 {subBreakdown.map((item) => (
 <div key={item.source}>
 <div className="flex items-center justify-between text-sm mb-1">
 <span className="text-surface-600">{item.source}</span>
 <span className="text-surface-800 font-medium">
 {formatInrCompact(item.amount)} ({item.pct}%)
 </span>
 </div>
 <div className="w-full h-2.5 bg-surface-100 rounded-full overflow-hidden">
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

 {/* Recent transactions (from dashboard) */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Recent Transactions</h2>
 {dashboard.recentTransactions.length === 0 ? (
   <p className="text-sm text-surface-400 py-6 text-center">No recent transactions.</p>
 ) : (
   <div className="space-y-2">
     {dashboard.recentTransactions.slice(0, 8).map((t) => (
       <div key={t.id} className="flex items-center justify-between text-sm border-b border-[var(--color-border)] last:border-0 py-2">
         <div className="min-w-0">
           <p className="font-medium text-surface-800 truncate">{t.type}</p>
           <p className="text-xs text-surface-400">
             {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
           </p>
         </div>
         <div className="text-right">
           <p className="font-semibold text-surface-800">{formatInrCompact(t.amount)}</p>
           <p className="text-xs text-surface-400 capitalize">{t.status.toLowerCase()}</p>
         </div>
       </div>
     ))}
   </div>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Commissions list */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800">Recent Commissions</h2>
 </div>
 {commissionRows.length === 0 ? (
   <p className="text-sm text-surface-400 py-12 text-center">No commissions yet.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[var(--color-border)]">
 <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Booking</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Status</th>
 <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Amount</th>
 </tr>
 </thead>
 <tbody>
 {commissionRows.map((c, i) => (
 <tr key={c.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
 <td className="py-2.5 px-5">
 <p className="font-medium text-surface-800 truncate">{c.bookingId}</p>
 <p className="text-xs text-surface-400">
 {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
 </p>
 </td>
 <td className="py-2.5 px-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
   c.status === 'PAID' ? 'bg-green-50 text-green-700' :
   c.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
   'bg-surface-100 text-surface-600'
 }`}>{c.status.toLowerCase()}</span>
 </td>
 <td className="py-2.5 px-5 text-right font-medium text-surface-800">
 {formatInrCompact(c.amount)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Subscription details */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800">Subscriptions by Role</h2>
 </div>
 {revenue.subscriptionRevenue.length === 0 ? (
   <p className="text-sm text-surface-400 py-12 text-center">No active subscriptions.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[var(--color-border)]">
 <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Plan</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
 <th className="text-center py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Subs</th>
 <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Total</th>
 </tr>
 </thead>
 <tbody>
 {revenue.subscriptionRevenue.map((s, i) => (
 <tr key={`${s.plan}-${s.role}`} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
 <td className="py-2.5 px-5 text-surface-800 font-medium">{s.plan}</td>
 <td className="py-2.5 px-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[s.role] ?? 'bg-surface-100 text-surface-600'}`}>
 {roleLabels[s.role] ?? s.role}
 </span>
 </td>
 <td className="py-2.5 px-4 text-center text-surface-600">{s.count}</td>
 <td className="py-2.5 px-5 text-right font-medium text-surface-800">{formatInrCompact(s.totalAmount)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>

 {/* Pending payouts */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800">Pending Payouts</h2>
 <span className="text-xs text-saffron-600 font-medium flex items-center gap-1">
 {formatInrCompact(pendingPayouts)} due <ChevronRight className="w-3.5 h-3.5" />
 </span>
 </div>
 {pendingPayoutRows.length === 0 ? (
   <p className="text-sm text-surface-400 py-12 text-center">No pending payouts.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[var(--color-border)]">
 <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Booking</th>
 <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Created</th>
 <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Amount</th>
 <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Action</th>
 </tr>
 </thead>
 <tbody>
 {pendingPayoutRows.map((p, i) => (
 <tr key={p.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
 <td className="py-2.5 px-5 font-medium text-surface-800 truncate max-w-[180px]">{p.providerId}</td>
 <td className="py-2.5 px-4 text-surface-500 truncate max-w-[160px]">{p.bookingId}</td>
 <td className="py-2.5 px-4 text-surface-500">
 {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
 </td>
 <td className="py-2.5 px-4 text-right font-semibold text-surface-800">
 {formatInrCompact(p.amount)}
 </td>
 <td className="py-2.5 px-5 text-right">
 <button className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors">
 Pay Now
 </button>
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
