'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';
import EarningsCard from '../../components/provider/EarningsCard';
import KycStatusBadge from '../../components/provider/KycStatusBadge';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
 Star,
 Clock,
 Users,
 MessageSquare,
 ArrowRight,
 Calendar,
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
import { formatIst } from '../../lib/consultation-time';
import { ASTROLOGER_PRESENCE_EVENT } from '../../lib/use-astrologer-heartbeat';

// ─── Zero-state defaults ────────────────────────────────────────

const ZERO_STATS = {
 consultationsToday: 0,
 totalConsultations: 0,
 earningsToday: 0,
 earningsThisMonth: 0,
 totalEarnings: 0,
 activeClients: 0,
};

// ─── Component ──────────────────────────────────────────────────

// AW-01 (2026-08-12, P0): this used to be `upcomingSessions: unknown[]` and the
// field appeared NOWHERE else in the file — fetched from
// GET /astrologer-portal/dashboard and thrown away, while the panel below the
// stat cards was a hardcoded "No upcoming sessions" block. An astrologer whose
// stat card read "1 Today's Sessions" was told one line lower that they had
// none, and had no route to the Jitsi room the devotee had already paid for.
//
// Keys are snake_case because the API returns raw `astrologer_consultations`
// rows (there is no Prisma model for that table — see routes/consultation.ts).
// Everything is optional: this renders only what the row actually carries and
// never substitutes an invented time, amount or room.
type UpcomingSession = {
 id?: string | null;
 reference?: string | null;
 minutes?: number | null;
 amount_inr?: string | number | null;
 scheduled_at?: string | null;
 room_name?: string | null;
 status?: string | null;
 created_at?: string | null;
 jitsiUrl?: string | null;
};

type ApiAstroDashboard = {
 profile: { fullName?: string | null; rating?: number | null; ratingCount?: number | null } | null;
 stats: {
  totalConsultations: number;
  rating: number;
  pricePerMinute: number;
  approved: boolean;
  consultationsToday: number;
  earningsTodayInr: number;
  earningsMonthInr: number;
  totalEarningsInr: number;
  // AW-04 (2026-08-12, P1): the real settled/unsettled split off the Commission
  // ledger. Optional because an older API build does not send them — and when
  // they are missing the cards must render an em dash, never an invented ₹0.
  paidOutInr?: number | null;
  pendingPayoutInr?: number | null;
  // Halves of pendingPayoutInr: ready to withdraw vs already requested.
  readyInr?: number | null;
  requestedInr?: number | null;
  // Earned from consultations not yet completed; NOT part of pendingPayoutInr.
  upcomingInr?: number | null;
  astrologerShare?: number | null;
  activeClients: number;
 };
 upcomingSessions: UpcomingSession[];
};

function formatSessionWhen(session: UpcomingSession): string {
 // IST, labelled (was the browser's zone with no label).
 return formatIst(session.scheduled_at ?? null, 'Time to be agreed with the devotee');
}

function formatSessionAmount(session: UpcomingSession): string | null {
 const n = Number(session.amount_inr);
 if (!Number.isFinite(n) || n <= 0) return null;
 return new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
 }).format(n);
}

export default function AstrologerDashboard() {
 const { session, user } = useAuth();
 const displayName = user?.fullName || 'Astrologer';
 // RES-06: 'unknown' until /provider-kyc answers. The old 'unsubmitted'
 // default plus `if (!r.ok) return;` told an approved astrologer their KYC was
 // missing on every backend hiccup.
 const [kycState, setKycState] = useState<'verified' | 'pending' | 'unsubmitted' | 'rejected' | 'unknown'>('unknown');
 const [kycReason, setKycReason] = useState<string | null>(null);
 const [api, setApi] = useState<ApiAstroDashboard | null>(null);
 // RES-02: `if (!r.ok) return;` rendered zeroes for every card on an HTTP 500
 // with no error at all.
 const [loadError, setLoadError] = useState<string | null>(null);
 // AUTH-06: the decision loadErrorMessage makes internally and this page
 // used to discard, so an expired session offers a sign-in rather than a
 // Retry that re-fires with the same dead token.
 const [loadReauth, setLoadReauth] = useState(false);

 // Go-online presence toggle (astrologer revamp 2026-08-05). The portal had
 // NO online/offline switch — devotees couldn't see who's available. POSTs to
 // /astrologer-portal/online; presence decays after a 15-min heartbeat.
 const [online, setOnline] = useState(false);
 const [onlineSaving, setOnlineSaving] = useState(false);
 // RES-11 (2026-08-12): the toggle was `if (r.ok) setOnline(next)` with an
 // empty `catch { /* keep prior */ }`, so any non-2xx or network failure
 // reverted the switch with NO message. This flag drives the live astrologer
 // directory, so an astrologer who thinks she is online sits waiting for
 // consultations that were never routed to her.
 const [onlineError, setOnlineError] = useState<string | null>(null);
 // The portal layout's heartbeat reads the server's presence every few minutes
 // and broadcasts it, so this switch follows reality (a restart or a decay to
 // offline) instead of staying on "ONLINE" while the directory says otherwise.
 useEffect(() => {
  const onPresence = (e: Event) => {
   const detail = (e as CustomEvent<{ online?: boolean }>).detail;
   if (typeof detail?.online === 'boolean') setOnline(detail.online);
  };
  window.addEventListener(ASTROLOGER_PRESENCE_EVENT, onPresence);
  return () => window.removeEventListener(ASTROLOGER_PRESENCE_EVENT, onPresence);
 }, []);
 useEffect(() => {
  if (!session?.accessToken) return;
  fetchWithTimeout(`${API_BASE_URL}/astrologer-portal/online`, {
   headers: { Authorization: `Bearer ${session.accessToken}` },
  }, DATA_FETCH_TIMEOUT_MS)
   .then((r) => (r.ok ? r.json() : null))
   .then((j) => { if (j) setOnline(!!j.online); })
   .catch(() => undefined);
 }, [session?.accessToken]);
 async function toggleOnline(next: boolean) {
  if (!session?.accessToken) return;
  setOnlineSaving(true);
  setOnlineError(null);
  try {
   const r = await fetchWithTimeout(`${API_BASE_URL}/astrologer-portal/online`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify({ online: next }),
   }, DATA_FETCH_TIMEOUT_MS);
   if (r.ok) {
    setOnline(next);
   } else {
    setOnlineError(
     next
      // RES-09: the consequence sentence is the useful half; the status
      // code is developer text and is dropped.
      ? 'Could not go online — devotees still cannot see you. Try again.'
      : 'Could not go offline — you are still listed as available. Try again.',
    );
   }
  } catch {
   setOnlineError(
    next
     ? 'Could not reach Darshya — devotees still cannot see you. Check your connection and try again.'
     : 'Could not reach Darshya — you are still listed as available. Check your connection and try again.',
   );
  }
  setOnlineSaving(false);
 }

 const loadDashboard = useCallback(async () => {
  // P0 #AP-07 (2026-07-09): do NOT skip the API for demo sessions. The old
  // `startsWith('demo-')` early-return left a demo astrologer on hardcoded
  // ZERO_STATS forever. The API accepts demo tokens in non-prod.
  if (!session?.accessToken) return;
  setLoadError(null);
  try {
   // RES-01: bare fetch has no timeout — a stalled socket froze this loader.
   const r = await fetchWithTimeout(
    `${API_BASE_URL}/astrologer-portal/dashboard`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
    DATA_FETCH_TIMEOUT_MS,
   );
   if (!r.ok) {
    setLoadError(loadErrorMessage(r));
    setLoadReauth(loadErrorIsReauth(r));
    return;
   }
   const j = (await r.json()) as ApiAstroDashboard;
   setApi(j);
  } catch (err) {
   setLoadError(loadErrorMessage(err));
   setLoadReauth(loadErrorIsReauth(err));
  }
 }, [session?.accessToken]);

 useEffect(() => { void loadDashboard(); }, [loadDashboard]);

 useEffect(() => {
 // P0 #AP-07: same fix — fetch KYC for demo sessions too (no demo-token skip).
 if (!session?.accessToken) return;
 (async () => {
 try {
 const r = await fetchWithTimeout(`${API_BASE_URL}/provider-kyc`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 }, DATA_FETCH_TIMEOUT_MS);
 // RES-06: leave the badge 'unknown' rather than accusing a verified
 // astrologer of missing KYC because one request failed.
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
 })();
 }, [session]);

 const liveStats = api?.stats;
 // AW-01: the paid consultations the API already returns. Never synthesised —
 // an absent/!ok response leaves this empty and the panel says so.
 const upcoming: UpcomingSession[] = Array.isArray(api?.upcomingSessions)
  ? (api.upcomingSessions as UpcomingSession[])
  : [];
 const quickStats = liveStats
  ? [
   { label: 'Today\'s Sessions', value: liveStats.consultationsToday, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
   { label: 'Total Consultations', value: liveStats.totalConsultations, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
   { label: 'Active Clients', value: liveStats.activeClients, icon: Users, color: 'text-saffron-600', bg: 'bg-saffron-50' },
   { label: 'Rating', value: liveStats.rating ? liveStats.rating.toFixed(1) : '—', icon: Star, color: 'text-temple-gold', bg: 'bg-amber-50' },
  ]
  : [
   { label: 'Today\'s Sessions', value: loadError ? '—' : ZERO_STATS.consultationsToday, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
   { label: 'Total Consultations', value: loadError ? '—' : ZERO_STATS.totalConsultations, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
   { label: 'Active Clients', value: loadError ? '—' : ZERO_STATS.activeClients, icon: Users, color: 'text-saffron-600', bg: 'bg-saffron-50' },
   { label: 'Rating', value: '—', icon: Star, color: 'text-temple-gold', bg: 'bg-amber-50' },
  ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className={H1.portal}>
 Namaste, {displayName.split(' ')[0]}!
 </h1>
 <div className="mt-1 flex items-center gap-3 flex-wrap">
 <p className="text-surface-500">Your astrology practice at a glance.</p>
 <KycStatusBadge state={kycState} reason={kycReason} />
 </div>
 </div>

 {loadError && (
 <LoadErrorBanner
 message={loadError}
 reauth={loadReauth}
 onRetry={() => { void loadDashboard(); }}
 className="flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
 />
 )}

 {/* Go-online presence toggle (revamp: devotees see who's online to consult) */}
 <div className={`rounded-xl border p-4 ${online ? 'border-tulsi-green-light bg-tulsi-green-light/10' : 'border-surface-100 bg-white'}`}>
 {onlineError && (
 <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
 {onlineError}
 </p>
 )}
 <div className="flex items-center justify-between">
 <div>
 <p className="font-semibold text-surface-800">
 {online ? 'You are ONLINE' : 'Go online to take consultations'}
 </p>
 <p className="text-xs text-surface-500">
 {online
 ? 'Devotees can see you and book a consultation now. Stay in the portal to remain online; you drop offline about 15 minutes after you close it.'
 : 'Turn on to appear as available to devotees (chat/call).'}
 </p>
 </div>
 <button
 onClick={() => toggleOnline(!online)}
 disabled={onlineSaving}
 className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${online ? 'bg-tulsi-green' : 'bg-surface-300'}`}
 aria-pressed={online}
 aria-label="Toggle online status"
 >
 <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${online ? 'translate-x-6' : 'translate-x-1'}`} />
 </button>
 </div>
 </div>

 <MyProviderProfileCard role="ASTROLOGER" onboardingSlug="astrologer" publicListingType="astrologer" />

 {/*
 AW-04 (2026-08-12, P1): "Paid out" used to be fed `totalEarningsInr`, which
 the API computed as SUM(amount_inr) over confirmed consultations — GROSS,
 before the 20% platform cut. An astrologer with one ₹375 consultation read
 "Paid out ₹375", checked their bank, found nothing, and their real earning
 was ₹300 anyway. `pending` was hardcoded `null`, so "Pending payout" was an
 em dash for everyone. Both figures now come from the Commission ledger, the
 same source the Earnings page and /payouts/balance read.

 `?? null` and NOT `?? 0`: if the API did not send the split, EarningsCard
 renders an em dash. A blank is honest; a confident ₹0 "paid out" is not.
 */}
 <EarningsCard
 totalPaid={liveStats?.paidOutInr ?? null}
 pending={typeof liveStats?.readyInr === 'number' ? liveStats.readyInr : liveStats?.pendingPayoutInr ?? null}
 pendingLabel={typeof liveStats?.readyInr === 'number' ? 'Ready to withdraw' : 'Pending payout'}
 thisMonth={liveStats?.earningsMonthInr ?? ZERO_STATS.earningsThisMonth}
 />
 {typeof liveStats?.readyInr === 'number' && (liveStats?.requestedInr ?? 0) > 0 && (
 <p data-testid="astro-requested-inr" className="text-xs text-surface-500 -mt-2">
 {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(liveStats!.requestedInr!)}{' '}
 requested, awaiting payout. It is already in a payout request and is not included in Ready to withdraw.
 </p>
 )}
 {(liveStats?.upcomingInr ?? 0) > 0 && (
 <p data-testid="astro-upcoming-inr" className="text-xs text-surface-500 -mt-2">
 {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(liveStats!.upcomingInr!)}{' '}
 earned from upcoming consultations. It becomes payable after the consultation is completed and is not
 included in {typeof liveStats?.readyInr === 'number' ? 'Ready to withdraw' : 'Pending payout'}.
 </p>
 )}

 {/* Quick Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {quickStats.map((card) => {
 const Icon = card.icon;
 return (
 <div key={card.label} className="bg-white rounded-xl border border-surface-100 p-4 text-center">
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 <p className="text-xl font-bold text-surface-800">{card.value}</p>
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
 href="/astrologer-portal/consultations"
 className="text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
 >
 View All <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 {upcoming.length === 0 ? (
 <div className="px-5 py-8 text-center">
 <Calendar className="w-10 h-10 text-surface-300 mx-auto mb-3" />
 <p className="text-sm text-surface-500">No upcoming sessions</p>
 <p className="text-xs text-surface-400 mt-1">Bookings will appear here once devotees consult you.</p>
 </div>
 ) : (
 <ul className="divide-y divide-surface-100">
 {upcoming.map((s, i) => {
 const amount = formatSessionAmount(s);
 return (
 <li key={s.id ?? s.reference ?? i} className="flex flex-wrap items-center gap-3 px-5 py-4">
 <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-50 flex items-center justify-center">
 <Calendar className="w-5 h-5 text-purple-600" />
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold text-surface-800 truncate">
 {s.reference ?? 'Consultation'}
 </p>
 <p className="text-xs text-surface-500">
 {formatSessionWhen(s)}
 {typeof s.minutes === 'number' ? ` · ${s.minutes} min` : ''}
 {amount ? ` · ${amount}` : ''}
 </p>
 </div>
 {s.jitsiUrl ? (
 <a
 href={s.jitsiUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
 >
 Join room
 </a>
 ) : (
 // No room minted yet — say so rather than render a dead button.
 <span className="text-xs text-surface-400">Room not ready</span>
 )}
 </li>
 );
 })}
 </ul>
 )}
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Link
 href="/astrologer-portal/availability"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
 <Clock className="w-6 h-6 text-purple-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Set Availability</h3>
 <p className="text-sm text-surface-500">Update your available time slots</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>

 <Link
 href="/astrologer-portal/profile"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center group-hover:bg-saffron-100 transition-colors">
 <Users className="w-6 h-6 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Edit Profile</h3>
 <p className="text-sm text-surface-500">Update your specialties and pricing</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>
 </div>
 </div>
 );
}
