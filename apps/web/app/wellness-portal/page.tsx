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
import {
 API_BASE_URL,
 DATA_FETCH_TIMEOUT_MS,
 fetchWithTimeout,
 loadErrorMessage,
 // AUTH-06: the 401/403 split. True ONLY for 401 — a 403 is a suspended
 // account or a role refusal, and offering sign-in there loops the user back
 // to the same wall (see loadErrorIsForbidden in lib/api-config.ts).
 loadErrorIsReauth,
} from '../../lib/api-config';
import { H1 } from '../../components/ui/heading-recipe';
import LoadErrorBanner from '../../components/LoadErrorBanner';

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
  // AW-10: optional — an older API build omits them, and the page must render
  // a blank rather than invent a 0. See the EarningsCard block below.
  paidOutInr?: number | null;
  pendingPayoutInr?: number | null;
  // Earned from sessions not yet held: not withdrawable until they run.
  upcomingInr?: number | null;
  instructorShare?: number;
  platformRate?: number;
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
 const { data: api, error: dashError, refetch: refetchDashboard } = useQuery({
  queryKey: ['wellness', 'dashboard', session?.accessToken],
  enabled: !!session?.accessToken,
  queryFn: async () => {
   const token = session!.accessToken;
   // RES-01: react-query surfaces a rejection, but a bare fetch on a stalled
   // socket never rejects — the query stayed `pending` forever and the page
   // sat on its skeleton.
   const r = await fetchWithTimeout(`${API_BASE_URL}/wellness-portal/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
   }, DATA_FETCH_TIMEOUT_MS);
   // RES-02: carry the status so the banner can name it instead of showing
   // a fabricated "0 Upcoming Sessions / 0 Total Students".
   if (!r.ok) throw Object.assign(new Error(`dashboard ${r.status}`), { status: r.status });
   return (await r.json()) as ApiWellnessDashboard;
  },
  retry: false,
 });

 const { data: kyc, isSuccess: kycLoaded } = useQuery({
  queryKey: ['provider-kyc', session?.accessToken],
  enabled: !!session?.accessToken,
  queryFn: async () => {
   const token = session!.accessToken;
   const r = await fetchWithTimeout(`${API_BASE_URL}/provider-kyc`, {
    headers: { Authorization: `Bearer ${token}` },
   }, DATA_FETCH_TIMEOUT_MS);
   if (!r.ok) throw Object.assign(new Error(`kyc ${r.status}`), { status: r.status });
   return (await r.json()) as { kyc?: { verified?: boolean; rejectionReason?: string | null } };
  },
  retry: false,
 });

 // Derive the KYC badge state from the query payload — replaces the old
 // imperative setKycState/setKycReason chain. Defaults to 'unsubmitted' until
 // the query resolves, matching the prior initial state.
 const { kycState, kycReason } = useMemo(() => {
  // RES-06: an unread KYC state is 'unknown' (badge renders nothing), NOT
  // 'unsubmitted'. The old default accused a verified instructor of missing
  // KYC every time /provider-kyc 500'd.
  if (!kycLoaded) return { kycState: 'unknown' as const, kycReason: null };
  if (!kyc?.kyc) return { kycState: 'unsubmitted' as const, kycReason: null };
  if (kyc.kyc.verified) return { kycState: 'verified' as const, kycReason: null };
  if (kyc.kyc.rejectionReason) {
   return { kycState: 'rejected' as const, kycReason: kyc.kyc.rejectionReason };
  }
  return { kycState: 'pending' as const, kycReason: null };
 }, [kyc, kycLoaded]);

 const liveStats = api?.stats;
 // RES-02: the query already produced an `error` object; nothing rendered it,
 // so an HTTP 500 showed "0 Upcoming Sessions / 0 Total Students" as fact.
 const loadError = dashError ? loadErrorMessage(dashError) : null;
 // AUTH-06: derived, not stored — this page holds the raw error object from
 // the query rather than a message string, so the flag comes off the same
 // value as the sentence and the two can never disagree.
 const loadReauth = dashError ? loadErrorIsReauth(dashError) : false;
 const unread = !!loadError && !liveStats;
 const statCards = [
  { label: 'Upcoming Sessions', value: unread ? '—' : liveStats?.upcomingSessions ?? 0, icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Total Students', value: unread ? '—' : liveStats?.totalStudents ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className={H1.portal}>
 Namaste, {displayName.split(' ').pop()}!
 </h1>
 <div className="mt-1 flex items-center gap-3 flex-wrap">
 <p className="text-surface-500">Your wellness practice overview.</p>
 <KycStatusBadge state={kycState} reason={kycReason} />
 </div>
 </div>

 {loadError && (
 <LoadErrorBanner
 message={loadError}
 reauth={loadReauth}
 onRetry={() => { void refetchDashboard(); }}
 className="flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
 />
 )}

 <MyProviderProfileCard role="WELLNESS_INSTRUCTOR" onboardingSlug="wellness_instructor" publicListingType="wellness" />

 {/*
 AW-10 (2026-08-12, P2): the first card is labelled with settlement, and it
 used to be fed `totalEarningsInr` — the instructor's LIFETIME net share.
 An instructor with one paid ₹1,000 class read that ₹800 had been
 transferred to them while /payouts/balance said paidOutInr 0. `pending`
 was passed literally null, so the middle card was an em dash for everyone.
 Both figures now come from the Commission ledger, the same source
 /payouts/balance and the Earnings page read. Identical to the AW-04 fix on
 the astrologer dashboard.

 `?? null` and NOT `?? 0`: if the API did not send the split, the card
 renders a blank. A blank is honest; a confident zero is not.
 */}
 <EarningsCard
 totalPaid={unread ? null : liveStats?.paidOutInr ?? null}
 pending={unread ? null : liveStats?.pendingPayoutInr ?? null}
 thisMonth={unread ? null : liveStats?.monthEarningsInr ?? 0}
 />
 {!unread && (liveStats?.upcomingInr ?? 0) > 0 && (
 <p data-testid="upcoming-earnings" className="text-xs text-surface-500 -mt-2">
 {formatCurrency(liveStats!.upcomingInr!)} earned from upcoming sessions — it becomes
 withdrawable after the session has been held.
 </p>
 )}
 {!unread && liveStats?.totalEarningsInr != null && (
 <p data-testid="lifetime-earnings" className="text-xs text-surface-500 -mt-2">
 Lifetime earnings {formatCurrency(liveStats.totalEarningsInr)} — your share of every
 enrollment so far, settled or not.
 </p>
 )}
 {liveStats?.instructorShare != null && (
 <p className="text-xs text-surface-500 -mt-2">
 You keep {Math.round(liveStats.instructorShare * 100)}% of every enrollment (platform {Math.round((liveStats.platformRate ?? 0.2) * 100)}%).
 </p>
 )}

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
