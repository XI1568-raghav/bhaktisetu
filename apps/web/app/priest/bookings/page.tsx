'use client';

import { formatTime } from '../../../lib/format-time-slot';
import ProofLink from '../../../components/provider/ProofLink';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
 Calendar,
 Clock,
 MapPin,
 Flame,
 CheckCircle2,
 Play,
 Video,
 Loader2,
 Inbox,
 ArrowRight,
 Users,
 XCircle,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { UserFacingError, classifyUserFacing, userFacingMessage, serverErrorText } from '../../../lib/friendly-error';
import ReauthPrompt from '../../../components/ReauthPrompt';
import { buttonClass } from '../../../components/ui/button-recipe';

// ─── Types ──────────────────────────────────────────────────────

type TabKey = 'all' | 'confirmed' | 'priest_assigned' | 'in_progress' | 'completed';

interface BookingItem {
 id: string;
 bookingNumber: string;
 status: string;
 scheduledDate: string;
 scheduledTimeSlot: string;
 priceAmount: number;
 priestPayout: number;
 currency: string;
 devoteeNames: Array<{ name: string; gotra?: string; nakshatra?: string }>;
 videoProofUrl: string | null;
 createdAt: string;
 temple: { id: string; name: string; city: string };
 pujaType: { id: string; name: string; durationMinutes: number };
 user: { fullName: string };
}

interface BookingCounts {
 all: number;
 confirmed: number;
 priest_assigned: number;
 in_progress: number;
 completed: number;
}

const ZERO_COUNTS: BookingCounts = {
 all: 0,
 confirmed: 0,
 priest_assigned: 0,
 in_progress: 0,
 completed: 0,
};

const PAGE_SIZE = 20;

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// PF-09 (prod sweep 2026-08-12): this used to be
// `new Date(dateStr + 'T00:00:00')`. The API sends scheduledDate as a full ISO
// instant ("2026-08-19T00:00:00.000Z"), so the concatenation produced
// "2026-08-19T00:00:00.000ZT00:00:00" and EVERY date in the pandit portal read
// "Invalid Date" — list, detail and dashboard.
//
// scheduledDate is a Postgres DATE, serialised at UTC midnight. Rendering it in
// the viewer's own zone would show the previous day to every NRI west of UTC,
// so the puja's own zone is pinned instead.
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


function getStatusConfig(status: string) {
 const map: Record<string, { label: string; cls: string }> = {
 confirmed: { label: 'Pending Accept', cls: 'bg-amber-100 text-amber-700' },
 priest_assigned: { label: 'Accepted', cls: 'bg-blue-100 text-blue-700' },
 in_progress: { label: 'In Progress', cls: 'bg-saffron-100 text-saffron-700' },
 completed: { label: 'Completed', cls: 'bg-tulsi-green-light/30 text-tulsi-green' },
 video_uploaded: { label: 'Video Uploaded', cls: 'bg-purple-100 text-purple-700' },
 delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700' },
 };
 return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600' };
}

// ─── Component ──────────────────────────────────────────────────

export default function PriestBookingsPage() {
 return (
  <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-saffron-500" /></div>}>
   <PriestBookingsInner />
  </Suspense>
 );
}

function PriestBookingsInner() {
 const { session } = useAuth();
 const searchParams = useSearchParams();
 const router = useRouter();
 const pathname = usePathname();
 const initialTab = (searchParams.get('status') as TabKey) || 'all';

 const [bookings, setBookings] = useState<BookingItem[]>([]);
 const [counts, setCounts] = useState<BookingCounts>(ZERO_COUNTS);
 const [total, setTotal] = useState(0);
 const [totalPages, setTotalPages] = useState(1);
 const [page, setPage] = useState(1);
 const [loading, setLoading] = useState(true);
 // PF-15: a failed fetch used to be swallowed into an empty array, so every API
 // hiccup told the pandit "You have no assigned bookings yet" — indistinguishable
 // from a genuinely empty day, and invisible to anyone watching.
 const [loadError, setLoadError] = useState<string | null>(null);
 // AUTH-06: Retry cannot fix an expired session — it re-sends the dead token.
 const [loadReauth, setLoadReauth] = useState(false);
 const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
 const [actionLoading, setActionLoading] = useState<string | null>(null);
 // A failed action used to be invisible: `if (res.ok)` had no else and the
 // catch was marked "Silent fail for MVP", so a pandit clicking Accept saw
 // literally nothing happen and had no idea why.
 const [actionError, setActionError] = useState<string | null>(null);

 useEffect(() => {
  const qs = activeTab === 'all' ? '' : `?status=${activeTab}`;
  router.replace(`${pathname}${qs}`, { scroll: false });
 }, [activeTab, pathname, router]);

 // PF-07: the page used to fetch `/priest/bookings` with no page/limit, take the
 // server's 20-row default, then filter AND count that truncated array
 // client-side. A pandit with 51 assigned bookings saw 20 of them and a tab
 // strip claiming 15 accepted when he had 25 — and there was no pager, so his
 // oldest unaccepted jobs were unreachable and silently breached SLA.
 // Filtering and counting now both happen server-side, over the whole book.
 const fetchBookings = useCallback(async () => {
 if (!session?.accessToken) {
 // No session yet (signed out, or auth still hydrating). Stop the spinner
 // rather than leaving it running forever; the portal layout gates access.
 setLoading(false);
 return;
 }
 setLoading(true);
 setLoadError(null);
 try {
 const res = await fetch(
 `${API_BASE_URL}/priest/bookings?view=${activeTab}&page=${page}&limit=${PAGE_SIZE}`,
 { headers: { Authorization: `Bearer ${session.accessToken}` } },
 );
 if (!res.ok) {
 const detail = await res.text().catch(() => '');
 // RES-09: the status code and 140 raw characters of the response body
 // were rendered straight to a pandit. Keep the server's sentence only.
 // AUTH-06: carry the status. `serverErrorText` refuses "Unauthorized" as
 // a developer name, so a 401 falls back to this page's own sentence and
 // the only evidence that the SESSION died is destroyed before any
 // classifier sees it.
 throw new UserFacingError(
  serverErrorText(detail, 'Could not load your bookings. Please try again.'),
  res.status,
 );
 }
 const data = await res.json();
 setBookings(data.bookings || []);
 setCounts({ ...ZERO_COUNTS, ...(data.counts ?? {}) });
 setTotal(typeof data.total === 'number' ? data.total : (data.bookings?.length ?? 0));
 setTotalPages(Math.max(1, data.totalPages ?? 1));
 } catch (err) {
 const { message, reauth } = classifyUserFacing(
  err,
  'Could not load your bookings. Please try again.',
 );
 setLoadError(message);
 setLoadReauth(reauth);
 setBookings([]);
 } finally {
 setLoading(false);
 }
 }, [session, activeTab, page]);

 useEffect(() => {
 void fetchBookings();
 }, [fetchBookings]);

 function selectTab(key: TabKey) {
 setActiveTab(key);
 setPage(1);
 }

 // PF-15, second half. The error banner below split "load failed" from "empty
 // day" in the RESULT area but left this strip publishing `All 0 / Pending 0 /
 // Accepted 0 / In Progress 0 / Completed 0` on a failed load — `counts` starts
 // at ZERO_COUNTS and the catch never touches it. That is the exact strip the
 // sweep recorded for an account holding 25 bookings. A count is a claim about
 // the pandit's book; a book that was never read supports no claim, so the
 // badge reads "—" until one loads. `null` rather than 0 so the distinction
 // cannot be lost again by a later formatter.
 const tabs: { key: TabKey; label: string; count: number | null }[] = [
 { key: 'all', label: 'All', count: loadError ? null : counts.all },
 { key: 'confirmed', label: 'Pending', count: loadError ? null : counts.confirmed },
 { key: 'priest_assigned', label: 'Accepted', count: loadError ? null : counts.priest_assigned },
 { key: 'in_progress', label: 'In Progress', count: loadError ? null : counts.in_progress },
 { key: 'completed', label: 'Completed', count: loadError ? null : counts.completed },
 ];

 // PJ-09: there used to be a `video` branch here that collected the mandatory
 // proof URL through a raw browser dialog — on the screen the pandit
 // actually closes a booking from, on a phone, straight after a puja, and only
 // if he had already hosted the recording somewhere himself. The real
 // uploader (components/provider/VideoProofUpload, Supabase Storage with
 // progress and a validated paste fallback) lives on the detail page, so the
 // Completed card routes there instead. This handler now drives only the four
 // bodyless transitions; the prompt path is gone rather than left dormant.
 type BookingAction = 'accept' | 'reject' | 'start' | 'complete';

 async function handleAction(bookingId: string, action: BookingAction) {
 setActionLoading(`${bookingId}-${action}`);
 try {
 // No body on any of these. A Content-Type of application/json made Fastify
 // reject them with FST_ERR_CTP_EMPTY_JSON_BODY before the handler ran — so
 // every button here 400'd, and the silent `if (res.ok)` below meant the card
 // simply never changed. "Nothing happens at all" was the reported symptom.
 const res = await fetch(`${API_BASE_URL}/priest/bookings/${bookingId}/${action}`, {
 method: 'PATCH',
 headers: { Authorization: `Bearer ${session?.accessToken}` },
 });

 if (!res.ok) {
 const detail = await res.text().catch(() => '');
 setActionError(
 serverErrorText(detail, `Could not ${action} this booking. Please try again.`),
 );
 } else {
 setActionError(null);
 // Re-read from the server rather than guessing locally: the row may leave
 // the current view, and the tab counts must move with it.
 await fetchBookings();
 }
 } catch (err) {
 setActionError(userFacingMessage(err, 'Network error — please try again.'));
 } finally {
 setActionLoading(null);
 }
 }

 // PF-04, the reachability half. A delivery control was added to the detail
 // page, and that closed the literal finding — but `getActionButton` below had
 // no `video_uploaded` branch, so it fell through to `default: null` and this
 // screen rendered a booking that is one tap from paying the pandit with no
 // call to action at all. That matters because the Completed tab is precisely
 // where those rows live (PRIEST_BOOKING_VIEWS.completed = completed +
 // video_uploaded + delivered) and precisely where the dashboard's "Upload
 // Video" quick action lands him — so the one screen built to show unfinished
 // fulfilment work showed the stuck rows as inert. Any pandit who filed proof
 // and then closed the tab had to guess that the card itself was a link.
 //
 // This does NOT go through handleAction: delivery is not one of the four
 // bodyless /priest/bookings/:id/* transitions. It is the same call the detail
 // page makes — PATCH /bookings/:id {"status":"delivered"} — which the API
 // gates on the assigned pandit AND on a stored videoProofUrl
 // (ASSIGNED_PRIEST_ALLOWED_TRANSITIONS + checkVideoProofGate in
 // routes/bookings.ts), so nothing here can attest delivery of a puja with no
 // recording on file.
 async function handleDeliver(bookingId: string) {
 setActionLoading(`${bookingId}-deliver`);
 try {
 const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
 method: 'PATCH',
 headers: {
 Authorization: `Bearer ${session?.accessToken}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ status: 'delivered' }),
 });

 if (!res.ok) {
 const detail = await res.text().catch(() => '');
 setActionError(
 serverErrorText(detail, 'Could not mark this booking delivered. Please try again.'),
 );
 } else {
 setActionError(null);
 // Same reason as handleAction: the row changes status, so the tab counts
 // and the page contents both have to come from the server again.
 await fetchBookings();
 }
 } catch (err) {
 setActionError(userFacingMessage(err, 'Network error — please try again.'));
 } finally {
 setActionLoading(null);
 }
 }

 function getActionButton(booking: BookingItem) {
 const isLoading = (action: string) => actionLoading === `${booking.id}-${action}`;

 switch (booking.status) {
 case 'confirmed':
 // D3 fix: API had PATCH /priest/bookings/:id/reject but no UI ever rendered
 // a Reject button — a pandit who couldn't fulfil had no escape valve, so the
 // booking sat stuck. Now offer Accept + Decline side by side.
 return (
 <div className="flex items-center gap-2">
 <button
 onClick={(e) => { e.preventDefault(); handleAction(booking.id, 'accept'); }}
 disabled={!!actionLoading}
 className={buttonClass('primary', 'md')}
 >
 {isLoading('accept') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
 Accept
 </button>
 <button
 onClick={(e) => { e.preventDefault(); handleAction(booking.id, 'reject'); }}
 disabled={!!actionLoading}
 className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
 >
 {isLoading('reject') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
 Decline
 </button>
 </div>
 );
 case 'priest_assigned':
 return (
 <div className="flex items-center gap-2">
 <button
 onClick={(e) => { e.preventDefault(); handleAction(booking.id, 'start'); }}
 disabled={!!actionLoading}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
 >
 {isLoading('start') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
 Start Puja
 </button>
 <button
 onClick={(e) => { e.preventDefault(); handleAction(booking.id, 'reject'); }}
 disabled={!!actionLoading}
 title="Release this booking back to the queue"
 className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
 >
 {isLoading('reject') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
 Release
 </button>
 </div>
 );
 case 'in_progress':
 if (!booking.videoProofUrl?.trim()) {
 return (
 <Link
 href={`/priest/bookings/view?id=${booking.id}`}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
 >
 <Video className="w-3.5 h-3.5" />
 Upload video proof
 </Link>
 );
 }
 return (
 <button
 onClick={(e) => { e.preventDefault(); handleAction(booking.id, 'complete'); }}
 disabled={!!actionLoading}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-tulsi-green-dark text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
 >
 {isLoading('complete') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
 Mark Complete
 </button>
 );
 case 'completed':
 return (
 <Link
 href={`/priest/bookings/view?id=${booking.id}`}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
 >
 <Video className="w-3.5 h-3.5" />
 Upload Video
 </Link>
 );
 case 'video_uploaded':
 // The proof link is not decoration: without it this button would be a
 // blind attestation that the devotee received a recording the pandit
 // cannot see from here. It is a sibling of the card's stretched overlay
 // anchor, not a descendant of it, so PF-17's nested-<a> hydration bug
 // does not come back — same position the Upload Video link already
 // occupies.
 return (
 <div className="flex flex-col items-end gap-1.5">
 {booking.videoProofUrl && (
 <ProofLink bookingId={booking.id} stored={booking.videoProofUrl} token={session?.accessToken} className="inline-flex items-center gap-1 text-xs font-medium text-saffron-600 hover:text-saffron-700">
 <Video className="w-3.5 h-3.5" />
 Check proof
 </ProofLink>
 )}
 <button
 onClick={(e) => { e.preventDefault(); handleDeliver(booking.id); }}
 disabled={!!actionLoading}
 title="Confirms the devotee has received the recording and closes the booking"
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-tulsi-green-dark text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
 >
 {isLoading('deliver') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
 Mark Delivered
 </button>
 </div>
 );
 default:
 return null;
 }
 }

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Header */}
 <div>
 <h1 className={H1.portal}>My Bookings</h1>
 <p className="text-surface-500 mt-1">Manage your assigned puja bookings</p>
 </div>

 {/* Action failures must be visible. Setting actionError without rendering it
     would leave the exact silent failure this fix exists to remove. */}
 {actionError && (
 <div
 role="alert"
 className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
 >
 <span className="flex-1">{actionError}</span>
 <button
 type="button"
 onClick={() => setActionError(null)}
 className="shrink-0 font-medium text-red-600 hover:text-red-800"
 aria-label="Dismiss error"
 >
 ×
 </button>
 </div>
 )}

 {/* Tabs */}
 <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-100">
 {tabs.map((tab) => (
 <button
 key={tab.key}
 onClick={() => selectTab(tab.key)}
 className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
 activeTab === tab.key
 ? 'bg-saffron-600 text-white shadow-sm'
 : 'text-surface-600 hover:bg-surface-50'
 }`}
 >
 {tab.label}
 <span
 className={`rounded-full px-2 py-0.5 text-xs font-bold ${
 activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'
 }`}
 >
 {tab.count === null ? '—' : tab.count}
 </span>
 </button>
 ))}
 </div>

 {/* Loading */}
 {loading && (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
 <span className="ml-3 text-surface-500">Loading bookings...</span>
 </div>
 )}

 {/* Load failure — never rendered as "you have no work today". */}
 {!loading && loadError && (
 <div
 role="alert"
 className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 py-12 px-4 text-center"
 >
 <h3 className="text-lg font-semibold text-red-800">
 {loadReauth ? 'Your session has expired' : 'Could not load your bookings'}
 </h3>
 <p className="prose-meta text-red-700 max-w-md">{loadError}</p>
 {/* AUTH-06: the sign-in link REPLACES Retry. */}
 {loadReauth ? (
 <ReauthPrompt message="" className="flex flex-col items-center gap-3" />
 ) : (
 <button
 type="button"
 onClick={() => void fetchBookings()}
 className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
 >
 Retry
 </button>
 )}
 </div>
 )}

 {/* Empty */}
 {!loading && !loadError && bookings.length === 0 && (
 <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
 <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-saffron-50">
 <Inbox className="h-8 w-8 text-saffron-400" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-surface-700">No bookings found</h3>
 <p className="text-sm text-surface-500">
 {activeTab === 'all'
 ? 'You have no assigned bookings yet.'
 : `No bookings with "${tabs.find((t) => t.key === activeTab)?.label}" status.`}
 </p>
 </div>
 )}

 {/* Booking Cards */}
 {!loading && !loadError && bookings.length > 0 && (
 <div className="space-y-4">
 {bookings.map((booking) => {
 const statusCfg = getStatusConfig(booking.status);
 return (
 // PF-17: this wrapper used to be the card's own <Link>, and
 // getActionButton renders another <Link> ("Upload Video") inside it
 // for a completed booking. The console carried "<a> cannot contain a
 // nested <a>. This will cause a hydration error." Browsers split
 // nested anchors while parsing, so on the pandit's most-used page an
 // Upload Video tap could navigate somewhere else entirely.
 //
 // The card keeps ONE real anchor, stretched across the whole surface
 // so the click target and hover affordance are unchanged, and the
 // action column is now a SIBLING painted above it.
 // `pointer-events-none` on the content layer lets a click anywhere on
 // the card fall through to that anchor; the action column re-enables
 // pointer events for itself.
 <div
 key={booking.id}
 className="relative bg-white rounded-xl border border-surface-100 p-5 hover:border-saffron-200 card-hover transition-all"
 >
 <Link
 href={`/priest/bookings/view?id=${booking.id}`}
 aria-label={`Open booking ${booking.bookingNumber}`}
 className="absolute inset-0 z-0 rounded-xl focus-visible:ring-2 focus-visible:ring-saffron-500"
 />
 <div className="relative pointer-events-none flex flex-col sm:flex-row sm:items-start gap-4">
 {/* Icon */}
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
 <Flame className="w-5 h-5 text-saffron-500" />
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <h3 className="text-base font-semibold text-surface-800">
 {booking.pujaType.name}
 </h3>
 <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusCfg.cls}`}>
 {statusCfg.label}
 </span>
 </div>

 <span className="text-xs font-mono text-surface-400">{booking.bookingNumber}</span>

 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-surface-500">
 <span className="flex items-center gap-1">
 <MapPin className="w-3.5 h-3.5" />
 {booking.temple.name}, {booking.temple.city}
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="w-3.5 h-3.5" />
 {formatDate(booking.scheduledDate)}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3.5 h-3.5" />
 {formatTime(booking.scheduledTimeSlot)}
 </span>
 <span className="flex items-center gap-1">
 <Users className="w-3.5 h-3.5" />
 {booking.devoteeNames.length} devotee{booking.devoteeNames.length > 1 ? 's' : ''}
 </span>
 </div>

 <p className="text-xs text-surface-400 mt-1">
 Booked by: {booking.user.fullName}
 </p>
 </div>

 {/* Right side. PF-17: `pointer-events-auto` + a stacking context above
     the overlay anchor, so the buttons and the Upload Video link here
     receive their own clicks instead of the card's. */}
 <div className="pointer-events-auto relative z-10 flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
 <div className="text-right">
 <p className="text-lg font-bold text-surface-800">{formatCurrency(booking.priestPayout)}</p>
 <p className="text-xs text-surface-400">Your payout</p>
 </div>
 {getActionButton(booking)}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Pager. Without it rows 21+ had no route to the screen at all. */}
 {!loading && !loadError && total > 0 && (
 <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-100 bg-white px-4 py-3">
 <p className="text-sm text-surface-500">
 Showing {bookings.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
 {(page - 1) * PAGE_SIZE + bookings.length} of {total} bookings
 </p>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 disabled={page <= 1}
 className="px-3 py-1.5 text-sm font-medium rounded-lg border border-surface-200 text-surface-600 hover:border-saffron-300 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Previous
 </button>
 <span className="text-sm text-surface-500">
 Page {page} of {totalPages}
 </span>
 <button
 type="button"
 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
 disabled={page >= totalPages}
 className="px-3 py-1.5 text-sm font-medium rounded-lg border border-surface-200 text-surface-600 hover:border-saffron-300 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
