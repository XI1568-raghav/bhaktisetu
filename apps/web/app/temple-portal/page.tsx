'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
 API_BASE_URL,
 DATA_FETCH_TIMEOUT_MS,
 fetchWithTimeout,
 loadErrorMessage,
} from '../../lib/api-config';
import Link from 'next/link';
import {
 IndianRupee,
 TrendingUp,
 Video,
 Flame,
 Heart,
 ArrowRight,
 Calendar,
} from 'lucide-react';
import { H1 } from '../../components/ui/heading-recipe';

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function getStatusBadge(status: string) {
 const map: Record<string, { label: string; cls: string }> = {
 confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-700' },
 in_progress: { label: 'In Progress', cls: 'bg-saffron-100 text-saffron-700' },
 completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
 };
 return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600' };
}

// ─── API types ──────────────────────────────────────────────────

type ApiBooking = {
 id: string;
 bookingNumber: string;
 devotee: string;
 pujaName: string;
 scheduledDate: string;
 priceInr: number;
 status: string;
};

type ApiDashboard = {
 profile: { templeName?: string | null; templeCity?: string | null; templeState?: string | null } | null;
 stats: {
  totalBookings: number;
  monthBookings: number;
  totalRevenueInr: number;
  monthRevenueInr: number;
  totalStreams: number;
 };
 recentBookings: ApiBooking[];
};

// ─── Component ──────────────────────────────────────────────────

export default function TempleDashboard() {
 const { session } = useAuth();
 const [api, setApi] = useState<ApiDashboard | null>(null);
 // RES-02 (2026-08-12): `if (!r.ok) return;` left this page rendering
 // "0 Total Bookings / Rs 0 Revenue This Month / No bookings yet" on an HTTP
 // 500, with no error anywhere. A temple manager mid-incident was told their
 // temple earned nothing this month. Track the failure and say so.
 const [loadError, setLoadError] = useState<string | null>(null);

 const load = useCallback(async () => {
  // P0 #AP-07 (2026-07-10): fetch for demo sessions too. The old
  // startsWith('demo-') skip left a demo temple manager on hardcoded
  // zero stats, masking backend bugs during demo. The API accepts demo
  // tokens in non-prod.
  if (!session?.accessToken) return;
  setLoadError(null);
  try {
   // RES-01: a bare fetch never rejects on a stalled socket, so this loader
   // could hang forever with the page showing zeros and no way to recover.
   const r = await fetchWithTimeout(
    `${API_BASE_URL}/temple-portal/dashboard`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
    DATA_FETCH_TIMEOUT_MS,
   );
   if (!r.ok) {
    setLoadError(loadErrorMessage(r));
    return;
   }
   const j = (await r.json()) as ApiDashboard;
   setApi(j);
  } catch (err) {
   setLoadError(loadErrorMessage(err));
  }
 }, [session?.accessToken]);

 useEffect(() => { void load(); }, [load]);

 const liveStats = api?.stats;
 const liveBookings: ApiBooking[] = api?.recentBookings ?? [];
 const templeName = api?.profile?.templeName ?? 'My Temple';
 const templeCity = api?.profile?.templeCity ?? '';
 const templeState = api?.profile?.templeState ?? '';

 // Never print a figure the server did not send. On a failed load these are
 // em dashes, not zeros — a fabricated zero revenue is indistinguishable from
 // a real one, and it is the number that makes a temple manager churn.
 const unread = !!loadError && !liveStats;
 const statCards = [
   { label: 'Total Bookings', value: unread ? '—' : (liveStats?.totalBookings ?? 0).toLocaleString('en-IN'), icon: Flame, color: 'text-saffron-600', bg: 'bg-saffron-50' },
   { label: 'Bookings This Month', value: unread ? '—' : (liveStats?.monthBookings ?? 0).toLocaleString('en-IN'), icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
   { label: 'Revenue This Month', value: unread ? '—' : formatCurrency(liveStats?.monthRevenueInr ?? 0), icon: TrendingUp, color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/20' },
   { label: 'Total Revenue', value: unread ? '—' : formatCurrency(liveStats?.totalRevenueInr ?? 0), icon: IndianRupee, color: 'text-red-500', bg: 'bg-red-50' },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className={H1.portal}>
 {templeName}
 </h1>
 <p className="text-surface-500 mt-1">
 {templeCity}, {templeState} &middot; Temple management dashboard
 </p>
 </div>

 {loadError && (
 <div role="alert" className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
 <span className="flex-1 min-w-[12rem]">{loadError}</span>
 <button type="button" onClick={() => { void load(); }} className="font-semibold underline underline-offset-2 hover:text-amber-900">
 Retry
 </button>
 </div>
 )}

 <MyProviderProfileCard role="TEMPLE_MANAGER" onboardingSlug="temple_manager" publicListingType="temple" />

 {/* Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {statCards.map((card) => {
 const Icon = card.icon;
 return (
 <div key={card.label} className="bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3 mb-3">
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 </div>
 <p className="text-lg font-semibold text-surface-800">{card.value}</p>
 <p className="text-xs text-surface-500 mt-0.5">{card.label}</p>
 </div>
 );
 })}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Recent Bookings */}
 <div className="bg-white rounded-xl border border-surface-100">
 <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
 <h2 className="font-semibold text-surface-800">Recent Puja Bookings</h2>
 <Link href="/temple-portal/pujas" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium inline-flex items-center gap-1">
 View All <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 <div className="divide-y divide-surface-50">
 {liveBookings.length === 0 ? (
  <div className="px-5 py-8 text-center">
   <Flame className="w-10 h-10 text-surface-300 mx-auto mb-3" />
   {/* "No bookings yet" for a list we failed to read reads as "your bookings
       were deleted". Say what actually happened instead. */}
   <p className="text-sm text-surface-500">{loadError ? 'Bookings unavailable' : 'No bookings yet'}</p>
   <p className="text-xs text-surface-400 mt-1">{loadError ? 'We could not read your bookings — retry above.' : 'Puja bookings will appear here.'}</p>
  </div>
 ) : liveBookings.map((b) => {
   const badge = getStatusBadge(b.status);
   const d = new Date(b.scheduledDate);
   return (
    <div key={b.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50 transition-colors">
     <div className="w-10 h-10 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
      <Flame className="w-4 h-4 text-saffron-500" />
     </div>
     <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-surface-800 truncate">{b.pujaName}</h3>
      <div className="flex items-center gap-2 text-xs text-surface-400">
       <span>{b.devotee}</span>
       <span>&middot;</span>
       <span>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
      </div>
     </div>
     <div className="text-right shrink-0">
      <p className="text-sm font-semibold text-surface-800">{formatCurrency(b.priceInr)}</p>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
     </div>
    </div>
   );
  })}
 </div>
 </div>

 {/* Recent Donations */}
 <div className="bg-white rounded-xl border border-surface-100">
 <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
 <h2 className="font-semibold text-surface-800">Recent Donations</h2>
 <Link href="/temple-portal/donations" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium inline-flex items-center gap-1">
 View All <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 <div className="px-5 py-8 text-center">
 <Heart className="w-10 h-10 text-surface-300 mx-auto mb-3" />
 <p className="text-sm text-surface-500">Live donations feed pending</p>
 <p className="text-xs text-surface-400 mt-1">Visit the donations page for the full list.</p>
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <Link href="/temple-portal/darshan"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group">
 <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
 <Video className="w-6 h-6 text-purple-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Live Darshan</h3>
 <p className="text-sm text-surface-500">Manage streams</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>

 <Link href="/temple-portal/pujas"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group">
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center group-hover:bg-saffron-100 transition-colors">
 <Flame className="w-6 h-6 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Manage Pujas</h3>
 <p className="text-sm text-surface-500">Offerings & priests</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>

 <Link href="/temple-portal/donations"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group">
 <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
 <Heart className="w-6 h-6 text-red-500" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Donations</h3>
 <p className="text-sm text-surface-500">Track & manage</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>
 </div>
 </div>
 );
}
