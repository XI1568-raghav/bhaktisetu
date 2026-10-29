'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
 API_BASE_URL,
 DATA_FETCH_TIMEOUT_MS,
 fetchWithTimeout,
 loadErrorMessage,
 // AUTH-06: the 401/403 split. `loadErrorIsReauth` is true ONLY for 401 —
 // a 403 is a suspended account or a role refusal, and offering sign-in there
 // loops the user back to the same wall.
 loadErrorIsReauth,
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
import LoadErrorBanner from '../../components/LoadErrorBanner';
import { getMyDonations, type TempleDonation } from '../../lib/temple-api';
import { templeBookingStatus } from '../../lib/temple-booking-status';

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}


// ─── API types ──────────────────────────────────────────────────

type ApiBooking = {
 id: string;
 bookingNumber: string;
 devotee: string;
 pujaName: string;
 scheduledDate: string;
 scheduledTimeSlot?: string | null;
 priceInr: number;
 status: string;
};

type ApiDashboard = {
 profile: { templeName?: string | null; city?: string | null; state?: string | null } | null;
 templeLinked?: boolean;
 reason?: 'no_temple_profile' | 'not_approved' | 'no_matching_temple';
 stats: {
  totalBookings: number;
  monthBookings: number;
  totalRevenueInr: number;
  monthRevenueInr: number;
  /** Share already releasable (puja performed and proved) or paid. */
  releasedInr?: number;
  monthReleasedInr?: number;
  /** Share minted at confirmation but still held until the puja is proved. */
  upcomingInr?: number;
  monthUpcomingInr?: number;
  totalStreams: number;
 };
 recentBookings: ApiBooking[];
 /** Whether devotees can find and book the temple (the catalogue row is verified by the Darshya team). */
 publicListing?: { verified: boolean; status: string; slug: string } | null;
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
 // AUTH-06: the decision `loadErrorMessage` makes internally and this page used
 // to throw away, so the banner below can offer a sign-in instead of a Retry
 // that re-fires the request with the same expired token.
 const [loadReauth, setLoadReauth] = useState(false);

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
    setLoadReauth(loadErrorIsReauth(r));
    return;
   }
   const j = (await r.json()) as ApiDashboard;
   setApi(j);
  } catch (err) {
   setLoadError(loadErrorMessage(err));
   setLoadReauth(loadErrorIsReauth(err));
  }
 }, [session?.accessToken]);

 useEffect(() => { void load(); }, [load]);

 // Latest donations for the card below. A failed read says so; it never reads as 'no donations'.
 const [donations, setDonations] = useState<TempleDonation[] | null>(null);
 const [donationsFailed, setDonationsFailed] = useState(false);
 useEffect(() => {
  if (!session?.accessToken) return;
  let cancelled = false;
  getMyDonations(session.accessToken).then(
   (rows) => { if (!cancelled) { setDonations(rows); setDonationsFailed(false); } },
   () => { if (!cancelled) setDonationsFailed(true); },
  );
  return () => { cancelled = true; };
 }, [session?.accessToken]);

 const liveStats = api?.stats;
 const liveBookings: ApiBooking[] = api?.recentBookings ?? [];
 const templeName = api?.profile?.templeName ?? 'My Temple';
 const templeCity = api?.profile?.city ?? '';
 const templeState = api?.profile?.state ?? '';
 // Say why the numbers are zero when the account is not linked to a temple yet.
 const linkNotice =
  api?.templeLinked === false
   ? api.reason === 'not_approved'
    ? 'Your portal is active. Your temple is not linked to a public temple page yet: complete the description and full address in your profile, or the Darshya team will confirm you manage a temple whose name is already listed. Bookings, donations and payouts appear here once it is linked.'
    : api.reason === 'no_matching_temple'
     ? 'Your temple profile is not connected to a public temple page on Darshya yet; the Darshya team connects it by hand, and your bookings and offerings will appear here once that is done.'
     : 'Complete your temple profile to start receiving bookings and donations.'
   : null;
 // CT-UI-1: join only the parts that exist — a bare ", ·" rendered for an
 // account with no temple profile yet.
 const templePlace = [templeCity, templeState].filter(Boolean).join(', ');

 // Never print a figure the server did not send. On a failed load these are
 // em dashes, not zeros — a fabricated zero revenue is indistinguishable from
 // a real one, and it is the number that makes a temple manager churn.
 const unread = !!loadError && !liveStats;
 // Released vs Upcoming, from the same release rule as the Payouts tab: the
 // temple's share is minted when payment confirms but only releasable once the
 // puja is performed and proved. Unreleased share is never shown as earned.
 // Older servers send only totalRevenueInr/monthRevenueInr (which then meant
 // "all share"), so fall back to em dashes rather than a wrong figure.
 const hasSplit = liveStats?.releasedInr !== undefined;
 const statCards: Array<{ label: string; value: string; sub?: string; testId?: string; icon: typeof Flame; color: string; bg: string }> = [
   { label: 'Total Bookings', value: unread ? '—' : (liveStats?.totalBookings ?? 0).toLocaleString('en-IN'), icon: Flame, color: 'text-saffron-600', bg: 'bg-saffron-50' },
   { label: 'Bookings This Month', value: unread ? '—' : (liveStats?.monthBookings ?? 0).toLocaleString('en-IN'), icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
   {
     label: 'Released temple share',
     value: unread || !hasSplit ? '—' : formatCurrency(liveStats?.releasedInr ?? 0),
     sub: unread || !hasSplit ? undefined : `${formatCurrency(liveStats?.monthReleasedInr ?? 0)} this month`,
     testId: 'temple-share-released',
     icon: TrendingUp, color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/20',
   },
   {
     label: 'Upcoming temple share',
     value: unread || !hasSplit ? '—' : formatCurrency(liveStats?.upcomingInr ?? 0),
     sub: 'Released after the puja is performed and proved',
     testId: 'temple-share-upcoming',
     icon: IndianRupee, color: 'text-red-500', bg: 'bg-red-50',
   },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className={H1.portal}>
 {templeName}
 </h1>
 <p className="text-surface-500 mt-1">
 {templePlace ? `${templePlace} · ` : ''}Temple management dashboard
 </p>
 </div>

 {loadError && (
 <LoadErrorBanner
 message={loadError}
 reauth={loadReauth}
 onRetry={() => { void load(); }}
 className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
 />
 )}

 {linkNotice && (
 <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
 {linkNotice}
 </div>
 )}

 {api?.publicListing && !api.publicListing.verified && (
  <div role="status" data-testid="listing-unverified" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
   <p className="font-medium">Your temple page is not public yet</p>
   <p className="mt-0.5">
    Devotees cannot find this temple or book pujas here until the Darshya team verifies it. Everything you set up in this portal
    (pujas, pandits, schedule, streams) is saved and starts working as soon as it is verified.
   </p>
  </div>
 )}

 <MyProviderProfileCard role="TEMPLE_MANAGER" onboardingSlug="temple_manager" publicListingType="temple" />

 {/* Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {statCards.map((card) => {
 const Icon = card.icon;
 return (
 <div key={card.label} data-testid={card.testId} className="bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3 mb-3">
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 </div>
 <p className="text-lg font-semibold text-surface-800">{card.value}</p>
 <p className="text-xs text-surface-500 mt-0.5">{card.label}</p>
 {card.sub ? <p className="text-xs text-surface-400 mt-0.5">{card.sub}</p> : null}
 </div>
 );
 })}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Recent Bookings */}
 <div className="bg-white rounded-xl border border-surface-100">
 <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
 <h2 className="font-semibold text-surface-800">Recent Puja Bookings</h2>
 <Link href="/temple-portal/bookings" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium inline-flex items-center gap-1">
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
   const badge = templeBookingStatus(b.status);
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
       <span>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}{b.scheduledTimeSlot ? ` · ${b.scheduledTimeSlot}` : ''}</span>
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
 {donations && donations.length > 0 ? (
  <div className="divide-y divide-surface-50" data-testid="dashboard-donations">
   {donations.slice(0, 5).map((d) => (
    <div key={d.id} className="flex items-center gap-4 px-5 py-3">
     <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
      <Heart className="w-4 h-4 text-red-400" />
     </div>
     <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-surface-800 truncate">{d.donor}</h3>
      <p className="text-xs text-surface-400">
       {new Date(d.paidAt ?? d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </p>
     </div>
     <div className="text-right shrink-0">
      <p className="text-sm font-semibold text-surface-800">{formatCurrency(d.amountInr)}</p>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${d.status === 'paid' ? 'bg-green-100 text-green-700' : d.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
       {d.status === 'paid' ? 'Received' : d.status === 'failed' ? 'Failed' : 'Not completed'}
      </span>
     </div>
    </div>
   ))}
  </div>
 ) : (
  <div className="px-5 py-8 text-center">
   <Heart className="w-10 h-10 text-surface-300 mx-auto mb-3" />
   <p className="text-sm text-surface-500">
    {donationsFailed ? 'Donations unavailable' : donations === null ? 'Loading donations…' : 'No donations yet'}
   </p>
   <p className="text-xs text-surface-400 mt-1">
    {donationsFailed
     ? 'We could not read your donations. Open the donations page to try again.'
     : 'Donations made to your temple appear here once devotees complete payment.'}
   </p>
  </div>
 )}
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
