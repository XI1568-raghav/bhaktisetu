'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';
import { H1 } from '../../components/ui/heading-recipe';

import { useState, useEffect, useCallback } from 'react';
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
import {
 API_BASE_URL,
 DATA_FETCH_TIMEOUT_MS,
 fetchWithTimeout,
 loadErrorMessage,
 // AUTH-06: true ONLY for 401. A 403 here is a suspended pandit or a role
 // refusal, and sending them to sign in again loops back to the same wall.
 loadErrorIsReauth,
} from '../../lib/api-config';
import EarningsCard from '../../components/provider/EarningsCard';
import KycStatusBadge from '../../components/provider/KycStatusBadge';
import LoadErrorBanner from '../../components/LoadErrorBanner';

// ─── Types ──────────────────────────────────────────────────────

interface DashboardData {
 priest: {
 id: string;
 displayName: string;
 avatarUrl: string | null;
 ratingAvg: number;
 ratingCount: number;
 // PF-14: the dispatch pool's view of this pandit. Optional on the type only
 // because an older API build may not send it — treated as false when absent,
 // never as "unknown".
 isOnDuty?: boolean;
 lastSeenAt?: string | null;
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

// ─── Zero-state defaults (new providers start at 0) ──────────────

function zeroDashboard(displayName: string): DashboardData {
 return {
 priest: { id: '', displayName, avatarUrl: null, ratingAvg: 0, ratingCount: 0, isOnDuty: false, lastSeenAt: null },
 earnings: { total: 0, thisMonth: 0, pending: 0 },
 bookings: { total: 0, upcoming: 0, completed: 0 },
 upcomingBookings: [],
 };
}

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

// PF-09 (prod sweep 2026-08-12): concatenating 'T00:00:00' onto an ISO instant
// ("2026-08-19T00:00:00.000Z") produced Invalid Date on every Upcoming Booking
// row. scheduledDate is a Postgres DATE serialised at UTC midnight, so the
// puja's own zone is pinned — otherwise every viewer west of UTC reads the
// previous day.
function formatDate(dateStr: string): string {
 const d = new Date(dateStr);
 if (Number.isNaN(d.getTime())) return dateStr;
 return d.toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
 });
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
 const { session, user } = useAuth();
 const [data, setData] = useState<DashboardData | null>(null);
 const [loading, setLoading] = useState(true);
 const [fetchError, setFetchError] = useState<string | null>(null);
 // AUTH-06: /priest never classified its failure at all — the non-ok branch
 // below throws `res.status` away and prints one fixed sentence, so an
 // expired session was indistinguishable from a 500 and the only control on
 // screen was a Retry that re-fires with the same dead token.
 const [fetchReauth, setFetchReauth] = useState(false);
 // RES-06 (2026-08-12): 'unknown' until /provider-kyc actually ANSWERS.
 // Defaulting to 'unsubmitted' and returning early on !r.ok meant every
 // backend hiccup told a verified, approved pandit "KYC required for payout"
 // — the most alarming sentence we can put in front of a provider, produced
 // by a transient 500. priests.is_verified was true for all seeded priests
 // while the badge said otherwise.
 const [kycState, setKycState] = useState<'verified' | 'pending' | 'unsubmitted' | 'rejected' | 'unknown'>('unknown');
 const [kycReason, setKycReason] = useState<string | null>(null);

 // T1 instant-pool on-duty toggle (booking revamp). When on, the pandit is a
 // candidate for instant dispatch offers. PATCH /priest/availability bumps
 // lastSeenAt (the heartbeat) so the pool knows they're live.
 // PF-14: this used to be `useState(false)` and was never hydrated — the
 // dashboard payload carried no isOnDuty at all. A pandit already in the pool
 // was shown "Go on duty", and to go OFF after a reload he had to click ON
 // first (sending isOnDuty:true and re-arming himself for 1-minute-SLA
 // offers) and then click again.
 const [onDuty, setOnDuty] = useState(false);
 const [dutySaving, setDutySaving] = useState(false);
 // RES-11 (2026-08-12): the toggle used to be `if (res.ok) setOnDuty(next)`
 // with an empty catch that just kept the prior state. On any non-2xx or network
 // failure the switch simply snapped back with NO message. The T1
 // instant-dispatch pool is driven by this flag, so a pandit who flips it,
 // assumes a rendering lag and walks away believes he is accepting work all
 // day while receiving nothing — lost revenue for him, unfilled T1 demand for
 // the platform. A control whose failure is invisible is worse than no
 // control.
 const [dutyError, setDutyError] = useState<string | null>(null);
 async function toggleDuty(next: boolean) {
 if (!session?.accessToken) return;
 setDutySaving(true);
 setDutyError(null);
 try {
 // RES-01: a stalled PATCH used to hang here with the toggle mid-flight.
 const res = await fetchWithTimeout(`${API_BASE_URL}/priest/availability`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
 body: JSON.stringify({ isOnDuty: next }),
 }, DATA_FETCH_TIMEOUT_MS);
 if (res.ok) {
 setOnDuty(next);
 } else {
 setDutyError(
 next
 ? 'Could not go on duty — you are still OFF duty and will not receive instant requests. Try again.'
 : 'Could not go off duty — you are still ON duty. Try again.',
 );
 }
 } catch {
 setDutyError(
 next
 ? 'Could not reach Darshya — you are still OFF duty and will not receive instant requests. Check your connection and try again.'
 : 'Could not reach Darshya — you are still ON duty. Check your connection and try again.',
 );
 }
 setDutySaving(false);
 }

 const loadAll = useCallback(async () => {
 async function fetchDashboard() {
 const displayName = user?.fullName || user?.email?.split('@')[0] || 'Pandit';
 try {
 // RES-01: bare fetch has no timeout. Held open, /priest showed
 // "Loading dashboard..." at T+10s AND at T+30s — the finally below
 // sits after an await that never returns.
 const res = await fetchWithTimeout(`${API_BASE_URL}/priest/dashboard`, {
 headers: { Authorization: `Bearer ${session?.accessToken}` },
 }, DATA_FETCH_TIMEOUT_MS);
 if (res.ok) {
 const payload = (await res.json()) as DashboardData;
 setData(payload);
 // PF-14: seed the toggle from the server row. A dashboard we could not
 // read leaves the toggle where it was rather than asserting "off".
 setOnDuty(payload.priest?.isOnDuty === true);
 setFetchError(null);
 setFetchReauth(false);
 } else {
 // RES-09: this carried `(status ${res.status})`. The wording otherwise
 // stays as it was — __tests__/resilience-load-honesty.test.tsx (RES-06)
 // waits on this exact banner to know both dashboard fetches have
 // settled before asserting the KYC state, so the leading clause is the
 // test's handle on "the load failed", not decoration.
 setFetchError('Could not load dashboard right now. Showing baseline figures.');
 // The sentence stays byte-identical on purpose:
 // __tests__/resilience-load-honesty.test.tsx waits on this exact banner to
 // know both dashboard fetches have settled. Only the CONTROL changes.
 setFetchReauth(loadErrorIsReauth(res));
 setData(zeroDashboard(displayName));
 }
 } catch (e) {
 setFetchError(loadErrorMessage(e));
 setFetchReauth(loadErrorIsReauth(e));
 setData(zeroDashboard(displayName));
 } finally {
 setLoading(false);
 }
 }
 async function fetchKyc() {
 // P0 #AP-07 (2026-07-10): fetch KYC for demo sessions too — the old
 // startsWith('demo-') skip left a demo priest on 'unsubmitted' KYC,
 // masking backend state during demo. The API accepts demo tokens in
 // non-prod; a non-OK / catch keeps the existing fallback.
 if (!session?.accessToken) return;
 try {
 const r = await fetchWithTimeout(`${API_BASE_URL}/provider-kyc`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 }, DATA_FETCH_TIMEOUT_MS);
 // RES-06: an unread KYC state stays 'unknown' (the badge renders
 // nothing) rather than falling back to the accusation.
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
 await Promise.all([fetchDashboard(), fetchKyc()]);
 }, [session, user?.fullName, user?.email]);

 useEffect(() => { void loadAll(); }, [loadAll]);

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
 <span className="ml-3 text-surface-500">Loading dashboard...</span>
 </div>
 );
 }

 // PF-14 / RES-09: `return null` here rendered a BLANK PAGE when
 // /priest/dashboard failed. Two things were wrong with that. The pandit lost
 // the on-duty control — the one switch that decides whether they receive
 // dispatched work — and the friendly error this component now computes was
 // never shown, so a 500 looked identical to a slow network.
 //
 // The toggle renders in its SAFE state: aria-pressed=false. Never claim
 // on-duty when the dashboard could not be read; a pandit who believes they are
 // on duty and is not will miss work silently.
 if (!data) {
   return (
     <div className="space-y-6 max-w-5xl">
       {fetchError && (
         <LoadErrorBanner
           message={fetchError}
           reauth={fetchReauth}
           onRetry={() => { void loadAll(); }}
           className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
         />
       )}
       <div className="rounded-xl border border-surface-100 bg-white p-4">
         <div className="flex items-center justify-between gap-3">
           <div>
             <p className="text-sm font-medium text-surface-800">On-duty</p>
             <p className="prose-meta text-surface-500">
               Your duty status could not be read, so it is shown as off.
             </p>
           </div>
           <button
             onClick={() => toggleDuty(!onDuty)}
             disabled={dutySaving}
             className="-m-2 inline-flex shrink-0 items-center justify-center p-2 disabled:opacity-50"
             aria-pressed={onDuty}
             aria-label="Toggle on-duty"
           >
             <span className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${onDuty ? 'bg-tulsi-green' : 'bg-surface-300'}`}>
               <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${onDuty ? 'translate-x-7' : 'translate-x-1'}`} />
             </span>
           </button>
         </div>
       </div>
     </div>
   );
 }

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
 <h1 className={H1.portal}>
 Namaste, {data.priest.displayName.split(' ')[0]}!
 </h1>
 <div className="mt-1 flex items-center gap-3 flex-wrap">
 <p className="prose-body text-surface-500">Here is your dashboard overview for today.</p>
 <KycStatusBadge state={kycState} reason={kycReason} />
 </div>
 </div>

 {/* T1 instant-pool on-duty toggle */}
 <div className={`rounded-xl border p-4 ${onDuty ? 'border-tulsi-green-light bg-tulsi-green-light/10' : 'border-surface-100 bg-white'}`}>
 {dutyError && (
 <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
 {dutyError}
 </p>
 )}
 <div className="flex items-center justify-between">
 <div>
 <p className="font-semibold text-surface-800">
 {onDuty ? 'You are ON DUTY' : 'Go on duty for instant bookings'}
 </p>
 <p className="prose-body text-surface-500">
 {onDuty
 ? 'You will receive instant puja requests near you. Respond within a minute.'
 : 'Turn on to receive instant puja requests near you (Uber-style dispatch).'}
 </p>
 {/* PJ-04: this toggle opted the pandit INTO dispatch and then left him
 with nowhere to see a request — offered bookings never appear under
 /priest/bookings because that list filters on priestId, which an
 un-accepted offer does not have yet. */}
 <Link
 href="/priest/offers"
 className="tap-safe mt-1 text-xs font-semibold text-saffron-700 underline underline-offset-2"
 >
 View your open offers
 </Link>
 </div>
 {/* RESP-11: measured 48x28 at 390px — the easiest control on the page to
     miss or flip by accident, and it is the one that decides whether this
     pandit receives dispatched work. The track grows to 56x32 and the
     button itself becomes the 72x48 hit area via padding; the negative
     margin gives the row back the space so nothing shifts. The track is an
     inner span so the padding is not painted green. */}
 <button
 onClick={() => toggleDuty(!onDuty)}
 disabled={dutySaving}
 className="-m-2 inline-flex shrink-0 items-center justify-center p-2 disabled:opacity-50"
 aria-pressed={onDuty}
 aria-label="Toggle on-duty"
 >
 <span
 className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${onDuty ? 'bg-tulsi-green' : 'bg-surface-300'}`}
 >
 <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${onDuty ? 'translate-x-7' : 'translate-x-1'}`} />
 </span>
 </button>
 </div>
 </div>

 <MyProviderProfileCard role="PANDIT" onboardingSlug="priest" publicListingType="pandit" />

 <EarningsCard
 totalPaid={data.earnings.total}
 pending={data.earnings.pending}
 thisMonth={data.earnings.thisMonth}
 />

 {fetchError && (
 <LoadErrorBanner
 message={fetchError}
 reauth={fetchReauth}
 onRetry={() => { void loadAll(); }}
 className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
 />
 )}

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
 {/* DU-07: this and the h3s below it all measured 16px/600 — visually
     identical, so a pandit scanning for the section had no anchor. */}
 <h2 className="text-lg font-semibold text-surface-800">Upcoming Bookings</h2>
 <Link
 href="/priest/bookings"
 className="text-sm text-saffron-600 hover:text-saffron-700 font-medium tap-safe gap-1"
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
 href={`/priest/bookings/view?id=${booking.id}`}
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
 <h3 className="text-sm font-semibold text-surface-800">Accept Bookings</h3>
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
 <h3 className="text-sm font-semibold text-surface-800">Upload Video</h3>
 <p className="text-sm text-surface-500">Upload video proof for completed pujas</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>
 </div>
 </div>
 );
}
