'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import Link from 'next/link';
import {
 IndianRupee,
 TrendingUp,
 Users,
 Video,
 Flame,
 Heart,
 ArrowRight,
 Eye,
 Calendar,
 Clock,
} from 'lucide-react';

// ─── Mock Data ──────────────────────────────────────────────────

const dashboardData = {
 temple: {
 name: 'Shri Kashi Vishwanath Temple',
 city: 'Varanasi',
 state: 'Uttar Pradesh',
 },
 stats: {
 darshanViewersToday: 1842,
 pujaBookingsToday: 14,
 donationsToday: 28500,
 totalDonations: 2450000,
 totalBookings: 3456,
 activePriests: 8,
 },
 recentBookings: [
 {
 id: '1',
 pujaName: 'Rudrabhishek Puja',
 devoteeName: 'Rajesh Kumar',
 date: '2026-04-16',
 time: '09:00',
 amount: 1151,
 status: 'confirmed',
 },
 {
 id: '2',
 pujaName: 'Maha Mrityunjay Jaap',
 devoteeName: 'Amit Patel',
 date: '2026-04-16',
 time: '11:00',
 amount: 702,
 status: 'in_progress',
 },
 {
 id: '3',
 pujaName: 'Satyanarayan Katha',
 devoteeName: 'Priya Singh',
 date: '2026-04-17',
 time: '10:00',
 amount: 1701,
 status: 'confirmed',
 },
 {
 id: '4',
 pujaName: 'Ganesh Puja',
 devoteeName: 'Deepak Verma',
 date: '2026-04-17',
 time: '07:30',
 amount: 501,
 status: 'confirmed',
 },
 ],
 recentDonations: [
 { id: '1', donor: 'Meera Agarwal', amount: 5100, purpose: 'Anna Daan', date: '2026-04-16T10:30:00Z' },
 { id: '2', donor: 'Suresh Pandey', amount: 2100, purpose: 'Temple Maintenance', date: '2026-04-16T09:15:00Z' },
 { id: '3', donor: 'Kavita Reddy', amount: 11000, purpose: 'Gaushala Seva', date: '2026-04-16T08:00:00Z' },
 { id: '4', donor: 'Anonymous', amount: 1100, purpose: 'General Donation', date: '2026-04-15T18:45:00Z' },
 ],
};

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
 return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatTime(time: string): string {
 const parts = time.split(':').map(Number);
 const h = parts[0] ?? 0;
 const m = parts[1] ?? 0;
 return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
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

 useEffect(() => {
  if (!session?.accessToken || session.accessToken.startsWith('demo-')) return;
  (async () => {
   try {
    const r = await fetch(`${API_BASE_URL}/temple-portal/dashboard`, {
     headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!r.ok) return;
    const j = (await r.json()) as ApiDashboard;
    setApi(j);
   } catch {
    // graceful — keep mock
   }
  })();
 }, [session]);

 const data = dashboardData;
 const liveStats = api?.stats;
 const liveBookings: ApiBooking[] | null = api?.recentBookings ?? null;
 const templeName = api?.profile?.templeName ?? data.temple.name;
 const templeCity = api?.profile?.templeCity ?? data.temple.city;
 const templeState = api?.profile?.templeState ?? data.temple.state;

 const statCards = liveStats
 ? [
   { label: 'Total Bookings', value: liveStats.totalBookings.toLocaleString('en-IN'), icon: Flame, color: 'text-saffron-600', bg: 'bg-saffron-50' },
   { label: 'Bookings This Month', value: liveStats.monthBookings.toLocaleString('en-IN'), icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
   { label: 'Revenue This Month', value: formatCurrency(liveStats.monthRevenueInr), icon: TrendingUp, color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/20' },
   { label: 'Total Revenue', value: formatCurrency(liveStats.totalRevenueInr), icon: IndianRupee, color: 'text-red-500', bg: 'bg-red-50' },
  ]
 : [
   { label: 'Darshan Viewers Today', value: data.stats.darshanViewersToday.toLocaleString('en-IN'), icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
   { label: 'Puja Bookings Today', value: data.stats.pujaBookingsToday, icon: Flame, color: 'text-saffron-600', bg: 'bg-saffron-50' },
   { label: 'Donations Today', value: formatCurrency(data.stats.donationsToday), icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
   { label: 'Total Donations', value: formatCurrency(data.stats.totalDonations), icon: IndianRupee, color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/20' },
  ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-surface-800">
 {templeName}
 </h1>
 <p className="text-surface-500 mt-1">
 {templeCity}, {templeState} &middot; Temple management dashboard
 </p>
 </div>

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
 {liveBookings ? (
  liveBookings.length === 0 ? (
   <p className="px-5 py-6 text-xs text-surface-400">No bookings yet.</p>
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
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
     </div>
    </div>
   );
  })
 ) : data.recentBookings.map((booking) => {
 const badge = getStatusBadge(booking.status);
 return (
 <div key={booking.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50 transition-colors">
 <div className="w-10 h-10 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
 <Flame className="w-4 h-4 text-saffron-500" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-medium text-surface-800 truncate">{booking.pujaName}</h3>
 <div className="flex items-center gap-2 text-xs text-surface-400">
 <span>{booking.devoteeName}</span>
 <span>&middot;</span>
 <span>{formatDate(booking.date)} {formatTime(booking.time)}</span>
 </div>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-semibold text-surface-800">{formatCurrency(booking.amount)}</p>
 <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
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
 <div className="divide-y divide-surface-50">
 {data.recentDonations.map((donation) => (
 <div key={donation.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50 transition-colors">
 <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
 <Heart className="w-4 h-4 text-red-400" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-medium text-surface-800 truncate">{donation.donor}</h3>
 <p className="text-xs text-surface-400">{donation.purpose}</p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-semibold text-surface-800">{formatCurrency(donation.amount)}</p>
 <p className="text-[10px] text-surface-400">{formatDate(donation.date)}</p>
 </div>
 </div>
 ))}
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
