'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Link from 'next/link';
import {
 Calendar,
 Clock,
 MapPin,
 Flame,
 ChevronRight,
 Eye,
 X as XIcon,
 Video,
 Search,
 Filter,
 CreditCard,
 Loader2,
 Inbox,
 ArrowRight,
 ChevronLeft,
 RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../../lib/api-config';
import { friendlyApiError } from '../../lib/friendly-error';
import AuthGuard from '../../components/AuthGuard';

// ─── Types ──────────────────────────────────────────────────────

// DB-02 (2026-08-12): this list is the shipped Prisma `BookingStatus` enum,
// verbatim and complete (apps/api/prisma/schema.prisma). It previously omitted
// pending_payment / confirmed / refunded and carried a `booked` member that is
// not a database value at all, so the three real statuses fell through
// getStatusConfig's `{ label: status }` fallback and the raw enum was printed
// to the customer. Keep this in lockstep with the enum — the Record below is
// exhaustive, so adding a member here without a label is a compile error.
type BookingStatus =
 | 'pending_payment'
 | 'confirmed'
 | 'priest_assigned'
 | 'in_progress'
 | 'completed'
 | 'video_uploaded'
 | 'delivered'
 | 'cancelled'
 | 'refunded';

interface BookingListItem {
 id: string;
 bookingNumber: string;
 templeName: string;
 templeCity: string;
 pujaName: string;
 scheduledDate: string;
 scheduledTime: string;
 status: BookingStatus;
 totalAmount: number;
 videoUrl: string | null;
 createdAt: string;
}

type TabFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

// ─── API → UI mapping ──────────────────────────────────────────
// Backend returns nested temple/pujaType/priest objects + Decimal amounts;
// UI uses flat strings/numbers. Normalize at the boundary, here.

interface ApiBooking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTimeSlot: string;
  priceAmount: string | number;
  videoProofUrl: string | null;
  createdAt: string;
  temple?: { name?: string; city?: string } | null;
  pujaType?: { name?: string } | null;
}

function mapBooking(b: ApiBooking): BookingListItem {
  // scheduledDate from API may be ISO datetime — strip time portion.
  const dateOnly =
    typeof b.scheduledDate === 'string' && b.scheduledDate.includes('T')
      ? b.scheduledDate.slice(0, 10)
      : b.scheduledDate;
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    templeName: b.temple?.name ?? 'Temple',
    templeCity: b.temple?.city ?? '',
    pujaName: b.pujaType?.name ?? 'Puja',
    scheduledDate: dateOnly,
    scheduledTime: b.scheduledTimeSlot ?? '',
    status: b.status,
    totalAmount: Number(b.priceAmount ?? 0),
    videoUrl: b.videoProofUrl ?? null,
    createdAt: b.createdAt,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

// Labels are the ones the detail page already shows (bookings/view/page.tsx
// getStatusBadge) — the two surfaces describe the same booking and must not
// disagree. `Record<BookingStatus, …>` is deliberate: it makes a missing label
// a type error instead of a silent raw-enum leak.
function getStatusConfig(status: BookingStatus) {
 const map: Record<BookingStatus, { label: string; color: string; bg: string }> = {
 pending_payment: { label: 'Payment Pending', color: 'text-amber-700', bg: 'bg-amber-100' },
 confirmed: { label: 'Confirmed', color: 'text-tulsi-green-dark', bg: 'bg-tulsi-green-light/30' },
 priest_assigned: { label: 'Priest Assigned', color: 'text-saffron-600', bg: 'bg-saffron-100' },
 in_progress: { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-100' },
 completed: { label: 'Completed', color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/30' },
 video_uploaded: { label: 'Video Ready', color: 'text-purple-600', bg: 'bg-purple-100' },
 delivered: { label: 'Delivered', color: 'text-tulsi-green-dark', bg: 'bg-tulsi-green-light/30' },
 cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
 refunded: { label: 'Refunded', color: 'text-red-600', bg: 'bg-red-100' },
 };
 // Kept only for a status the server adds before this file is updated. It must
 // never be a raw enum on screen, so an unknown value degrades to a neutral
 // "Processing" pill rather than to `pending_payment`.
 return map[status] || { label: 'Processing', color: 'text-surface-600', bg: 'bg-surface-100' };
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 });
}

// scheduledTimeSlot is free-form (the API's lib/slot-time.ts documents both
// '18:00' and 'Evening (6:00 PM)' in live data). The old split(':') turned a
// labelled slot into "12:NaN AM"; an unparseable slot now shows verbatim.
function formatTime(time: string): string {
 const m24 = /^\s*([01]?\d|2[0-3]):([0-5]\d)/.exec(time);
 if (!m24) return time.trim();
 const h = Number(m24[1]);
 const m = Number(m24[2]);
 const ampm = h >= 12 ? 'PM' : 'AM';
 const h12 = h % 12 || 12;
 return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Which tab a booking belongs to is decided by the API now (DB-01) — this
// local predicate survives only to decide whether to offer the Cancel button
// on a row that is already on screen.
function isUpcoming(booking: BookingListItem): boolean {
 const pujaDT = new Date(`${booking.scheduledDate}T${booking.scheduledTime}`);
 return (
 pujaDT > new Date() &&
 booking.status !== 'cancelled' &&
 booking.status !== 'completed' &&
 booking.status !== 'delivered' &&
 booking.status !== 'video_uploaded'
 );
}

/** Rows per page. Mirrors the API's default so page 1 costs one round trip. */
const PAGE_SIZE = 20;

interface TabCounts {
 all: number;
 upcoming: number;
 completed: number;
 cancelled: number;
}

interface BookingsPageData {
 items: BookingListItem[];
 total: number;
 page: number;
 totalPages: number;
 /** null only if the API predates DB-01 — then no count is shown at all,
  *  because printing the page length as if it were the total is the bug. */
 counts: TabCounts | null;
}

// ─── Component ──────────────────────────────────────────────────

function BookingsContent() {
 const { session } = useAuth();
 const queryClient = useQueryClient();
 const [activeTab, setActiveTab] = useState<TabFilter>('all');
 const [page, setPage] = useState(1);
 const [cancellingId, setCancellingId] = useState<string | null>(null);

 // A tab switch is a different query — never carry the old page number over,
 // or "Cancelled" opens on page 3 of a one-page list and looks empty.
 function selectTab(tab: TabFilter) {
  setActiveTab(tab);
  setPage(1);
 }

 // D1 fix: the Cancel button was rendered with no onClick (dead UI). Wire it
 // to POST /bookings/{id}/cancel, then invalidate the list so the status pill
 // flips to Cancelled without a manual refresh.
 async function handleCancel(bookingId: string) {
  if (!session?.accessToken) return;
  const ok = window.confirm('Cancel this booking? This cannot be undone.');
  if (!ok) return;
  setCancellingId(bookingId);
  try {
   // RES-01: a bare fetch never rejects on a stalled socket, so the `finally`
   // that clears `cancellingId` could not run — the row's Cancel button stayed
   // in its spinner state forever with no error, on the one action a devotee
   // takes when she is already unhappy.
   const res = await fetchWithTimeout(
    `${API_BASE_URL}/bookings/${bookingId}/cancel`,
    {
     method: 'POST',
     headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
     },
     body: JSON.stringify({}),
    },
    DATA_FETCH_TIMEOUT_MS,
   );
   if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    window.alert(body?.error ?? `Could not cancel (HTTP ${res.status}).`);
   }
  } catch {
   window.alert('Network error while cancelling. Please try again.');
  } finally {
   setCancellingId(null);
   // Cancelling the only row on the last page of the Upcoming tab would
   // otherwise leave the pager parked on a page that no longer exists.
   if (bookings.length === 1 && page > 1) setPage((p) => p - 1);
   await queryClient.invalidateQueries({ queryKey: ['bookings', 'my'] });
  }
 }

 // P1-17: replaced manual useEffect + useState(loading/error/bookings) with
 // useQuery — gives cached refetch, single loading/error state, and avoids
 // the old "setState after unmount" footgun. StaleTime 60s (QueryProvider
 // default) matches how often a devotee would realistically re-open the list.
 // DB-01 (prod sweep 2026-08-12): this used to fetch `/bookings/my` with NO
 // page or limit, so the API's default of 20 silently truncated the list — a
 // devotee with 81 bookings saw 20 of them, with no pager and no hint that the
 // rest existed (the booking they had just paid for was not guaranteed to be
 // in that page). The tab chips then counted that truncated array, so "All 20"
 // was presented as the total. Both halves are now the server's job: it filters
 // by `view` and returns a count per tab, and this page renders exactly what it
 // is given.
 const { data, isPending: loading, error, refetch, isFetching } = useQuery<BookingsPageData>({
  queryKey: ['bookings', 'my', session?.accessToken, activeTab, page],
  enabled: !!session?.accessToken,
  // Keep the previous page on screen while the next one loads — otherwise
  // every pager click flashes the full-page spinner.
  placeholderData: keepPreviousData,
  queryFn: async () => {
   const qs = new URLSearchParams({
    view: activeTab,
    page: String(page),
    limit: String(PAGE_SIZE),
   });
   // RES-01: without a timeout this queryFn never settles, so react-query stays
   // `isPending` forever and the page holds its skeleton — the exact state the
   // sweep measured at T+30s on /dashboard and /priest.
   const res = await fetchWithTimeout(
    `${API_BASE_URL}/bookings/my?${qs.toString()}`,
    {
     headers: {
      Authorization: `Bearer ${session?.accessToken ?? ''}`,
     },
    },
    DATA_FETCH_TIMEOUT_MS,
   );
   if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
   }
   const json = await res.json();
   const raw: ApiBooking[] = json.bookings ?? json.data ?? [];
   const items = raw.map(mapBooking);
   const total = typeof json.total === 'number' ? json.total : items.length;
   const counts: TabCounts | null =
    json.counts && typeof json.counts.all === 'number' ? json.counts : null;
   return {
    items,
    total,
    page: typeof json.page === 'number' ? json.page : page,
    totalPages:
     typeof json.totalPages === 'number' && json.totalPages > 0
      ? json.totalPages
      : Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts,
   };
  },
 });
 // RES-09 (2026-08-12): this used to render `error.message` verbatim, so a
 // devotee saw `API 500: {"error":"Internal Server Error"}` — and, when the
 // gateway served HTML as JSON, the JavaScript parser's own sentence
 // (`Unexpected token '<' …`). friendlyApiError() already mapped both to
 // human copy and was wired into exactly two admin screens.
 const loadError = error ? friendlyApiError(error) : null;

 const bookings = data?.items ?? [];
 const total = data?.total ?? 0;
 const totalPages = data?.totalPages ?? 1;
 const counts = data?.counts ?? null;
 // 1-based inclusive range of the rows actually on screen.
 const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
 const rangeTo = Math.min(page * PAGE_SIZE, total);

 // Counts come from the server (`counts`), never from `bookings.length` —
 // that is precisely the lie DB-01 was about. If an older API omits them the
 // chip renders with no number rather than with a wrong one.
 const tabs: { key: TabFilter; label: string; count: number | null }[] = [
 { key: 'all', label: 'All', count: counts?.all ?? null },
 { key: 'upcoming', label: 'Upcoming', count: counts?.upcoming ?? null },
 { key: 'completed', label: 'Completed', count: counts?.completed ?? null },
 { key: 'cancelled', label: 'Cancelled', count: counts?.cancelled ?? null },
 ];

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* Header */}
 <div className="border-b border-surface-100 bg-white">
 <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-lg font-semibold text-surface-800">My Bookings</h1>
 <p className="mt-1 text-sm text-surface-500">
 Track and manage your puja bookings
 </p>
 </div>
 <Link
 href="/pujas"
 className="hidden items-center gap-2 rounded-lg bg-saffron-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-saffron-700 sm:inline-flex"
 >
 <Flame className="h-4 w-4" />
 Book a Puja
 </Link>
 </div>
 </div>
 </div>

 <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
 {loadError && (
 <div
 role="alert"
 className="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
 >
 <span>Could not load your bookings. {loadError.message}</span>
 <button
 type="button"
 onClick={() => void refetch()}
 disabled={isFetching}
 className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 sm:self-auto"
 >
 <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
 Retry
 </button>
 </div>
 )}
 {/* Tabs */}
 <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-100">
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
 {tab.count !== null && (
 <span
 className={`rounded-full px-2 py-0.5 text-xs font-bold ${
 activeTab === tab.key
 ? 'bg-white/20 text-white'
 : 'bg-surface-100 text-surface-500'
 }`}
 >
 {tab.count}
 </span>
 )}
 </button>
 ))}
 </div>

 {/* How much there actually is. Before DB-01 no number on this page
     referred to anything but the 20 rows that happened to load. */}
 {!loading && total > 0 && (
 <p className="mb-4 text-sm text-surface-500">
 Showing {rangeFrom}&ndash;{rangeTo} of {total} booking{total === 1 ? '' : 's'}
 </p>
 )}

 {/* Loading */}
 {loading && (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="h-8 w-8 animate-spin text-saffron-500" />
 <span className="ml-3 text-surface-500">Loading your bookings...</span>
 </div>
 )}

 {/* Empty State — never under an error. RES-09: /bookings rendered
 "No bookings yet / Explore our pujas to book your first sacred
 ritual" directly beneath its own failure banner, so a devotee with
 confirmed pujas was told she had none. A failed load means the list
 is UNKNOWN, not empty. */}
 {!loading && !loadError && bookings.length === 0 && (
 <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
 <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-saffron-50">
 <Inbox className="h-8 w-8 text-saffron-400" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-surface-700">No bookings yet</h3>
 <p className="mb-6 max-w-sm text-center text-sm text-surface-500">
 {activeTab === 'all'
 ? 'Explore our pujas to book your first sacred ritual.'
 : `You have no ${activeTab} bookings at the moment.`}
 </p>
 <Link
 href="/pujas"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
 >
 <Flame className="h-4 w-4" />
 Explore Pujas
 <ArrowRight className="h-4 w-4" />
 </Link>
 </div>
 )}

 {/* Booking Cards */}
 {!loading && bookings.length > 0 && (
 <div className="space-y-4">
 {bookings.map((booking) => {
 const statusCfg = getStatusConfig(booking.status);
 const canCancel =
 isUpcoming(booking) &&
 booking.status !== 'in_progress' &&
 booking.status !== 'cancelled';

 return (
 <div
 key={booking.id}
 className="group rounded-xl border border-surface-100 bg-white p-5 transition-all hover:border-saffron-200 card-hover"
 >
 <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
 {/* Left side */}
 <div className="min-w-0 flex-1">
 <div className="mb-2 flex flex-wrap items-center gap-2">
 <span className="text-xs font-mono text-surface-400">
 {booking.bookingNumber}
 </span>
 <span
 className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}
 >
 {statusCfg.label}
 </span>
 </div>

 <h3 className="mb-1 text-lg font-semibold text-surface-800">
 {booking.pujaName}
 </h3>

 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500">
 <span className="flex items-center gap-1">
 <MapPin className="h-3.5 w-3.5" />
 {booking.templeName}, {booking.templeCity}
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="h-3.5 w-3.5" />
 {formatDate(booking.scheduledDate)}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="h-3.5 w-3.5" />
 {formatTime(booking.scheduledTime)}
 </span>
 </div>
 </div>

 {/* Right side */}
 <div className="flex items-center gap-3 sm:flex-col sm:items-end">
 <span className="text-xl font-bold text-surface-800">
 ₹{booking.totalAmount.toLocaleString('en-IN')}
 </span>
 </div>
 </div>

 {/* Action buttons */}
 {/* S2C-02 (2026-08-10): both links pointed at `/bookings/{id}`, a route that
     does not exist — every "View Details" / "Watch Video" click 404'd. The
     detail page is the query-param route `/bookings/view?id={id}` (it reads
     `useSearchParams().get('id')`), same shape as `/priest/bookings/view`. */}
 <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-surface-50 pt-4">
 <Link
 href={`/bookings/view?id=${booking.id}`}
 className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-50 px-3 py-2 text-xs font-semibold text-saffron-600 transition-colors hover:bg-saffron-100"
 >
 <Eye className="h-3.5 w-3.5" />
 View Details
 </Link>

 {/* DB-03 (2026-08-12): a pending_payment row had no way to be paid —
     only Cancel — so every failed or abandoned checkout was permanently
     unrecoverable revenue AND a slot held for nothing. /bookings/pay
     resumes payment on THIS booking rather than minting a new one. */}
 {booking.status === 'pending_payment' && (
 <Link
 href={`/bookings/pay?id=${booking.id}`}
 className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
 >
 <CreditCard className="h-3.5 w-3.5" />
 Complete payment
 </Link>
 )}

 {booking.videoUrl && (
 <Link
 href={`/bookings/view?id=${booking.id}#video`}
 className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-100"
 >
 <Video className="h-3.5 w-3.5" />
 Watch Video
 </Link>
 )}

 {canCancel && (
 <button
  onClick={() => handleCancel(booking.id)}
  disabled={cancellingId === booking.id}
  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
 >
  {cancellingId === booking.id ? (
   <Loader2 className="h-3.5 w-3.5 animate-spin" />
  ) : (
   <XIcon className="h-3.5 w-3.5" />
  )}
  {cancellingId === booking.id ? 'Cancelling…' : 'Cancel'}
 </button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Pager. Before DB-01 there was no page control at all, so rows 21+
     were unreachable from the UI no matter how many the devotee had. */}
 {!loading && totalPages > 1 && (
 <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-surface-100 bg-white px-4 py-3">
 <button
  type="button"
  onClick={() => setPage((p) => Math.max(1, p - 1))}
  disabled={page <= 1}
  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-40"
 >
  <ChevronLeft className="h-4 w-4" />
  Previous
 </button>

 <span className="text-sm text-surface-500">
  Page {page} of {totalPages}
 </span>

 <button
  type="button"
  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
  disabled={page >= totalPages}
  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-40"
 >
  Next
  <ChevronRight className="h-4 w-4" />
 </button>
 </div>
 )}
 </div>
 </div>
 );
}

export default function BookingsPage() {
 return (
 <AuthGuard>
 <BookingsContent />
 </AuthGuard>
 );
}
