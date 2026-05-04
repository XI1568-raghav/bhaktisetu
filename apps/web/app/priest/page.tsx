'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
 Calendar,
 CheckCircle2,
 Clock,
 Star,
 Video,
 ArrowRight,
 Loader2,
 MapPin,
 Flame,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import EarningsCard from '../../components/provider/EarningsCard';
import KycStatusBadge from '../../components/provider/KycStatusBadge';

// ─── Types ──────────────────────────────────────────────────────

interface DashboardData {
 priest: {
 id: string;
 displayName: string;
 avatarUrl: string | null;
 ratingAvg: number;
 ratingCount: number;
 };
 earnings: {
 total: number;
 thisMonth: number;
 pending: number;
 };
 bookings: {
 total: number;
 upcoming: number;
 completed: number;
 };
 upcomingBookings: Array<{
 id: string;
 bookingNumber: string;
 status: string;
 scheduledDate: string;
 scheduledTimeSlot: string;
 devoteeNames: Array<{ name: string }>;
 priestPayout: number;
 temple: { id: string; name: string; city: string };
 pujaType: { id: string; name: string };
 }>;
}

// ─── Fallback Data ──────────────────────────────────────────────

const fallbackDashboard: DashboardData = {
 priest: {
 id: '1',
 displayName: 'Pandit Ramesh Sharma',
 avatarUrl: null,
 ratingAvg: 4.8,
 ratingCount: 156,
 },
 earnings: {
 total: 185600,
 thisMonth: 24500,
 pending: 8400,
 },
 bookings: {
 total: 234,
 upcoming: 5,
 completed: 218,
 },
 upcomingBookings: [
 {
 id: '1',
 bookingNumber: 'BS-20260416-34521',
 status: 'priest_assigned',
 scheduledDate: '2026-04-16',
 scheduledTimeSlot: '09:00',
 devoteeNames: [{ name: 'Rajesh Kumar' }, { name: 'Sunita Kumar' }],
 priestPayout: 805,
 temple: { id: '1', name: 'Shri Kashi Vishwanath Temple', city: 'Varanasi' },
 pujaType: { id: '1', name: 'Rudrabhishek Puja' },
 },
 {
 id: '2',
 bookingNumber: 'BS-20260417-29874',
 status: 'priest_assigned',
 scheduledDate: '2026-04-17',
 scheduledTimeSlot: '07:30',
 devoteeNames: [{ name: 'Amit Patel' }],
 priestPayout: 490,
 temple: { id: '1', name: 'Shri Kashi Vishwanath Temple', city: 'Varanasi' },
 pujaType: { id: '2', name: 'Maha Mrityunjay Jaap' },
 },
 {
 id: '3',
 bookingNumber: 'BS-20260418-18432',
 status: 'confirmed',
 scheduledDate: '2026-04-18',
 scheduledTimeSlot: '10:00',
 devoteeNames: [{ name: 'Priya Singh' }, { name: 'Vikram Singh' }, { name: 'Ananya Singh' }],
 priestPayout: 1190,
 temple: { id: '1', name: 'Shri Kashi Vishwanath Temple', city: 'Varanasi' },
 pujaType: { id: '3', name: 'Satyanarayan Katha' },
 },
 {
 id: '4',
 bookingNumber: 'BS-20260420-12098',
 status: 'priest_assigned',
 scheduledDate: '2026-04-20',
 scheduledTimeSlot: '06:00',
 devoteeNames: [{ name: 'Deepak Verma' }],
 priestPayout: 665,
 temple: { id: '2', name: 'Trimbakeshwar Temple', city: 'Nashik' },
 pujaType: { id: '4', name: 'Ganesh Atharvashirsha Path' },
 },
 ],
};

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(time: string): string {
 const parts = time.split(':').map(Number);
 const h = parts[0] ?? 0;
 const m = parts[1] ?? 0;
 const ampm = h >= 12 ? 'PM' : 'AM';
 return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getStatusBadge(status: string) {
 const map: Record<string, { label: string; cls: string }> = {
 confirmed: { label: 'Pending Accept', cls: 'bg-amber-100 text-amber-700' },
 priest_assigned: { label: 'Accepted', cls: 'bg-blue-100 text-blue-700' },
 in_progress: { label: 'In Progress', cls: 'bg-saffron-100 text-saffron-700' },
 };
 return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600' };
}

// ─── Component ──────────────────────────────────────────────────

export default function PriestDashboard() {
 const { session } = useAuth();
 const [data, setData] = useState<DashboardData | null>(null);
 const [loading, setLoading] = useState(true);
 const [kycState, setKycState] = useState<'verified' | 'pending' | 'unsubmitted' | 'rejected'>('unsubmitted');
 const [kycReason, setKycReason] = useState<string | null>(null);

 useEffect(() => {
 async function fetchDashboard() {
 try {
 const res = await fetch(`${API_BASE_URL}/priest/dashboard`, {
 headers: { Authorization: `Bearer ${session?.accessToken}` },
 });
 if (res.ok) {
 setData(await res.json());
 } else {
 throw new Error('API unavailable');
 }
 } catch {
 setData(fallbackDashboard);
 } finally {
 setLoading(false);
 }
 }
 async function fetchKyc() {
 if (!session?.accessToken || session.accessToken.startsWith('demo-')) return;
 try {
 const r = await fetch(`${API_BASE_URL}/provider-kyc`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 });
 if (!r.ok) return;
 const j = await r.json();
 if (!j.kyc) setKycState('unsubmitted');
 else if (j.kyc.verified) setKycState('verified');
 else if (j.kyc.rejectionReason) {
 setKycState('rejected');
 setKycReason(j.kyc.rejectionReason);
 } else setKycState('pending');
 } catch {
 // graceful fallback
 }
 }
 fetchDashboard();
 fetchKyc();
 }, [session]);

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
 <span className="ml-3 text-surface-500">Loading dashboard...</span>
 </div>
 );
 }

 if (!data) return null;

 const statCards = [
 { label: 'Total Bookings', value: data.bookings.total, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
 { label: 'Upcoming', value: data.bookings.upcoming, icon: Clock, color: 'text-saffron-600', bg: 'bg-saffron-50' },
 { label: 'Completed', value: data.bookings.completed, icon: CheckCircle2, color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/20' },
 {
 label: 'Rating',
 value: `${data.priest.ratingAvg} (${data.priest.ratingCount})`,
 icon: Star,
 color: 'text-temple-gold',
 bg: 'bg-amber-50',
 },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-surface-800">
 Namaste, {data.priest.displayName.split(' ')[0]}!
 </h1>
 <div className="mt-1 flex items-center gap-3 flex-wrap">
 <p className="text-surface-500">Here is your dashboard overview for today.</p>
 <KycStatusBadge state={kycState} reason={kycReason} />
 </div>
 </div>

 <MyProviderProfileCard role="PANDIT" onboardingSlug="priest" publicListingType="pandit" />

 <EarningsCard
 totalPaid={data.earnings.total}
 pending={data.earnings.pending}
 thisMonth={data.earnings.thisMonth}
 />

 {/* Quick Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {statCards.map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.label}
 className="bg-white rounded-xl border border-surface-100 p-4 text-center"
 >
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 <p className="text-xl font-bold text-surface-800">{card.value}</p>
 <p className="text-xs text-surface-500 mt-0.5">{card.label}</p>
 </div>
 );
 })}
 </div>

 {/* Upcoming Bookings */}
 <div className="bg-white rounded-xl border border-surface-100">
 <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
 <h2 className="font-semibold text-surface-800">Upcoming Bookings</h2>
 <Link
 href="/priest/bookings"
 className="text-sm text-saffron-600 hover:text-saffron-700 font-medium inline-flex items-center gap-1"
 >
 View All <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 {data.upcomingBookings.length === 0 ? (
 <div className="p-8 text-center">
 <Calendar className="w-10 h-10 text-surface-300 mx-auto mb-3" />
 <p className="text-sm text-surface-500">No upcoming bookings</p>
 </div>
 ) : (
 <div className="divide-y divide-surface-50">
 {data.upcomingBookings.map((booking) => {
 const badge = getStatusBadge(booking.status);
 return (
 <Link
 key={booking.id}
 href={`/priest/bookings/${booking.id}`}
 className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors"
 >
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
 <Flame className="w-5 h-5 text-saffron-500" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <h3 className="text-sm font-semibold text-surface-800 truncate">
 {booking.pujaType.name}
 </h3>
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
 {badge.label}
 </span>
 </div>
 <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-surface-500">
 <span className="flex items-center gap-1">
 <MapPin className="w-3 h-3" />
 {booking.temple.name}
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledTimeSlot)}
 </span>
 </div>
 <p className="text-xs text-surface-400 mt-0.5">
 Devotees: {booking.devoteeNames.map((d) => d.name).join(', ')}
 </p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-bold text-surface-800">
 {formatCurrency(booking.priestPayout)}
 </p>
 <p className="text-xs text-surface-400">Payout</p>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Link
 href="/priest/bookings?status=confirmed"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center group-hover:bg-saffron-100 transition-colors">
 <CheckCircle2 className="w-6 h-6 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Accept Bookings</h3>
 <p className="text-sm text-surface-500">Review and accept new bookings</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>

 <Link
 href="/priest/bookings?status=completed"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
 <Video className="w-6 h-6 text-purple-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Upload Video</h3>
 <p className="text-sm text-surface-500">Upload video proof for completed pujas</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>
 </div>
 </div>
 );
}
