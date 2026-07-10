'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';
import EarningsCard from '../../components/provider/EarningsCard';
import KycStatusBadge from '../../components/provider/KycStatusBadge';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
 Users,
 CalendarDays,
 Clock,
 ArrowRight,
 Leaf,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatTime(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Component ──────────────────────────────────────────────────

type ApiWellnessSession = {
 id: string;
 title: string;
 scheduledAt: string;
 durationMinutes: number;
 capacity: number;
 priceInr: number;
 enrolled: number;
};

type ApiWellnessDashboard = {
 profile: { fullName?: string | null } | null;
 stats: {
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  totalStudents: number;
  totalEarningsInr: number;
  monthEarningsInr: number;
 };
 upcomingSessions: ApiWellnessSession[];
 recentSessions: unknown[];
};

export default function WellnessDashboard() {
 const { session, user } = useAuth();
 const displayName = user?.fullName || 'Instructor';

 // P1-17: dashboard + KYC fetches migrated from manual useEffect/useState to
 // useQuery. Both were read-only fetch-once-per-session patterns (no
 // optimistic mutation), so the cache + single loading state come for free.
 // P0 #AP-07 (2026-07-10) still honored: demo tokens are sent in non-prod and
 // a non-OK/catch keeps the mock fallback (query stays in error/no-data).
 const { data: api } = useQuery({
  queryKey: ['wellness', 'dashboard', session?.accessToken],
  enabled: !!session?.accessToken,
  queryFn: async () => {
   const token = session!.accessToken;
   const r = await fetch(`${API_BASE_URL}/wellness-portal/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
   });
   if (!r.ok) throw new Error(`dashboard ${r.status}`);
   return (await r.json()) as ApiWellnessDashboard;
  },
  retry: false,
 });

 const { data: kyc } = useQuery({
  queryKey: ['provider-kyc', session?.accessToken],
  enabled: !!session?.accessToken,
  queryFn: async () => {
   const token = session!.accessToken;
   const r = await fetch(`${API_BASE_URL}/provider-kyc`, {
    headers: { Authorization: `Bearer ${token}` },
   });
   if (!r.ok) throw new Error(`kyc ${r.status}`);
   return (await r.json()) as { kyc?: { verified?: boolean; rejectionReason?: string | null } };
  },
  retry: false,
 });

 // Derive the KYC badge state from the query payload — replaces the old
 // imperative setKycState/setKycReason chain. Defaults to 'unsubmitted' until
 // the query resolves, matching the prior initial state.
 const { kycState, kycReason } = useMemo(() => {
  if (!kyc?.kyc) return { kycState: 'unsubmitted' as const, kycReason: null };
  if (kyc.kyc.verified) return { kycState: 'verified' as const, kycReason: null };
  if (kyc.kyc.rejectionReason) {
   return { kycState: 'rejected' as const, kycReason: kyc.kyc.rejectionReason };
  }
  return { kycState: 'pending' as const, kycReason: null };
 }, [kyc]);

 const liveStats = api?.stats;
 const statCards = [
  { label: 'Upcoming Sessions', value: liveStats?.upcomingSessions ?? 0, icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Total Students', value: liveStats?.totalStudents ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-surface-800">
 Namaste, {displayName.split(' ').pop()}!
 </h1>
 <div className="mt-1 flex items-center gap-3 flex-wrap">
 <p className="text-surface-500">Your wellness practice overview.</p>
 <KycStatusBadge state={kycState} reason={kycReason} />
 </div>
 </div>

 <MyProviderProfileCard role="WELLNESS_INSTRUCTOR" onboardingSlug="wellness_instructor" publicListingType="wellness" />

 <EarningsCard
 totalPaid={liveStats?.totalEarningsInr ?? 0}
 thisMonth={liveStats?.monthEarningsInr ?? 0}
 pending={null}
 />

 {/* Stats */}
 <div className="grid grid-cols-2 gap-4">
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

 {/* Upcoming Sessions */}
 <div className="bg-white rounded-xl border border-surface-100">
 <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
 <h2 className="font-semibold text-surface-800">Upcoming Sessions</h2>
 <Link
 href="/wellness-portal/sessions"
 className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
 >
 View All <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 <div className="divide-y divide-surface-50">
 {(!api || api.upcomingSessions.length === 0) ? (
  <div className="px-5 py-8 text-center">
   <CalendarDays className="w-10 h-10 text-surface-300 mx-auto mb-3" />
   <p className="text-sm text-surface-500">No upcoming sessions</p>
   <p className="text-xs text-surface-400 mt-1">Create a session to start accepting enrollments.</p>
  </div>
 ) : api.upcomingSessions.map((s) => (
   <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors">
    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
     <Leaf className="w-5 h-5 text-emerald-500" />
    </div>
    <div className="flex-1 min-w-0">
     <h3 className="text-sm font-semibold text-surface-800 truncate mb-0.5">{s.title}</h3>
     <div className="flex items-center gap-3 text-xs text-surface-400">
      <span className="flex items-center gap-1">
       <CalendarDays className="w-3 h-3" />
       {formatDate(s.scheduledAt)} at {formatTime(s.scheduledAt)}
      </span>
      <span className="flex items-center gap-1">
       <Clock className="w-3 h-3" />
       {s.durationMinutes} min
      </span>
      <span className="flex items-center gap-1">
       <Users className="w-3 h-3" />
       {s.enrolled}/{s.capacity}
      </span>
     </div>
    </div>
    <div className="text-right shrink-0">
     <p className="text-sm font-bold text-surface-800">{formatCurrency(s.priceInr)}</p>
     <p className="text-xs text-surface-400">per person</p>
    </div>
   </div>
  ))}
 </div>
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Link
 href="/wellness-portal/sessions"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
 <CalendarDays className="w-6 h-6 text-emerald-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Manage Sessions</h3>
 <p className="text-sm text-surface-500">Add, edit, or schedule sessions</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>

 <Link
 href="/wellness-portal/students"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
 <Users className="w-6 h-6 text-blue-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">View Students</h3>
 <p className="text-sm text-surface-500">See enrolled students and attendance</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>
 </div>
 </div>
 );
}
