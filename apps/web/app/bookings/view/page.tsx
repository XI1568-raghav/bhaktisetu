'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
 ChevronRight,
 ChevronLeft,
 Calendar,
 Clock,
 MapPin,
 Flame,
 Users,
 IndianRupee,
 Video,
 Package,
 Download,
 Star,
 MessageSquare,
 XCircle,
 Headphones,
 Loader2,
 AlertCircle,
 Copy,
 CreditCard,
 Truck,
 Gift,
 FileText,
 Play,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { friendlyApiError, serverErrorMessage } from '../../../lib/friendly-error';
// DB-09: shared with /bookings so the list CTA and this player agree about
// what counts as a playable recording.
import { videoProofState } from '../video-proof';
import AuthGuard from '../../../components/AuthGuard';
import BookingStatusTracker, { type BookingStatus } from '../../../components/BookingStatusTracker';

// ─── Types ──────────────────────────────────────────────────────

interface BookingDevotee {
 name: string;
 gotra: string | null;
 nakshatra: string | null;
}

type DetailStatus = BookingStatus | 'pending_payment' | 'cancelled' | 'refunded';

interface BookingDetail {
 id: string;
 bookingNumber: string;
 status: DetailStatus;
 templeName: string;
 templeSlug: string;
 templeCity: string;
 templeState: string;
 pujaName: string;
 pujaSlug: string;
 scheduledDate: string;
 scheduledTime: string;
 durationMinutes: number;
 devotees: BookingDevotee[];
 sankalp: string | null;
 specialInstructions: string | null;
 amount: number;
 amountPaid: number;
 amountRefunded: number;
 priestName: string | null;
 videoUrl: string | null;
 prasadDelivery: boolean;
 prasadTrackingId: string | null;
 timestamps: Partial<Record<BookingStatus, string>>;
 review: { rating: number; text: string } | null;
}

// ─── API → UI mapping ──────────────────────────────────────────
// S2C-03 (2026-08-10): GET /bookings/:id returns the raw Prisma record —
// nested temple/pujaType/priest, Decimal money as strings, devotees in a
// `devoteeNames` JSON column, and the API's own status vocabulary
// ('confirmed' where this UI says 'booked'). The old code assigned that
// object straight to a flat BookingDetail, so every field read back
// undefined and the render threw; the page only ever "worked" via the
// fabricated fallback below it. Normalize at the boundary instead, and
// never synthesize a value the API did not send.

interface ApiBookingDetail {
 id: string;
 bookingNumber: string;
 status: string;
 scheduledDate: string;
 scheduledTimeSlot?: string | null;
 devoteeNames?: unknown;
 sankalpDetails?: string | null;
 specialInstructions?: string | null;
 priceAmount?: string | number | null;
 videoProofUrl?: string | null;
 videoUploadedAt?: string | null;
 prasadDeliveryRequested?: boolean | null;
 prasadTrackingId?: string | null;
 rating?: number | null;
 reviewText?: string | null;
 createdAt?: string | null;
 temple?: { name?: string; slug?: string; city?: string; state?: string } | null;
 pujaType?: { name?: string; slug?: string; durationMinutes?: number } | null;
 priest?: { displayName?: string } | null;
 payments?: Array<{
  status?: string;
  amount?: string | number | null;
  refundAmount?: string | number | null;
 }> | null;
}

const API_STATUS_TO_UI: Record<string, DetailStatus> = {
 pending_payment: 'pending_payment',
 confirmed: 'booked',
 priest_assigned: 'priest_assigned',
 in_progress: 'in_progress',
 completed: 'completed',
 video_uploaded: 'video_uploaded',
 delivered: 'delivered',
 cancelled: 'cancelled',
 refunded: 'refunded',
};

// Money arrives as a Prisma Decimal serialized to a string. Parse once, here.
function toAmount(v: string | number | null | undefined): number {
 const n = typeof v === 'string' ? Number(v) : (v ?? 0);
 return Number.isFinite(n) ? Number(n) : 0;
}

function mapDevotees(raw: unknown): BookingDevotee[] {
 if (!Array.isArray(raw)) return [];
 return raw
  .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
  .map((d) => ({
   name: typeof d.name === 'string' ? d.name : '',
   gotra: typeof d.gotra === 'string' && d.gotra ? d.gotra : null,
   nakshatra: typeof d.nakshatra === 'string' && d.nakshatra ? d.nakshatra : null,
  }))
  .filter((d) => d.name.length > 0);
}

function mapBookingDetail(b: ApiBookingDetail): BookingDetail {
 // scheduledDate is a DATE column serialized as an ISO datetime — keep the
 // date part only, because formatDate() appends its own 'T00:00:00'.
 const dateOnly =
  typeof b.scheduledDate === 'string' && b.scheduledDate.includes('T')
   ? b.scheduledDate.slice(0, 10)
   : (b.scheduledDate ?? '');

 const payments = Array.isArray(b.payments) ? b.payments : [];
 // A payment that reached the gateway's capture is money the devotee actually
 // parted with; 'refunded'/'partially_refunded' were captured first.
 const amountPaid = payments
  .filter((p) => p.status === 'captured' || p.status === 'refunded' || p.status === 'partially_refunded')
  .reduce((sum, p) => sum + toAmount(p.amount), 0);
 const amountRefunded = payments.reduce((sum, p) => sum + toAmount(p.refundAmount), 0);

 const timestamps: Partial<Record<BookingStatus, string>> = {};
 if (b.createdAt) timestamps.booked = b.createdAt;
 if (b.videoUploadedAt) timestamps.video_uploaded = b.videoUploadedAt;

 return {
  id: b.id,
  bookingNumber: b.bookingNumber,
  // An unmapped status (a future API enum value) is passed through as-is: the
  // badge renders it verbatim and every action gate below fails closed, which
  // beats guessing a state the server never claimed.
  status: API_STATUS_TO_UI[b.status] ?? (b.status as DetailStatus),
  templeName: b.temple?.name ?? 'Temple',
  templeSlug: b.temple?.slug ?? '',
  templeCity: b.temple?.city ?? '',
  templeState: b.temple?.state ?? '',
  pujaName: b.pujaType?.name ?? 'Puja',
  pujaSlug: b.pujaType?.slug ?? '',
  scheduledDate: dateOnly,
  scheduledTime: b.scheduledTimeSlot ?? '',
  durationMinutes: b.pujaType?.durationMinutes ?? 0,
  devotees: mapDevotees(b.devoteeNames),
  sankalp: b.sankalpDetails ?? null,
  specialInstructions: b.specialInstructions ?? null,
  amount: toAmount(b.priceAmount),
  amountPaid,
  amountRefunded,
  priestName: b.priest?.displayName ?? null,
  videoUrl: b.videoProofUrl ?? null,
  prasadDelivery: !!b.prasadDeliveryRequested,
  prasadTrackingId: b.prasadTrackingId ?? null,
  timestamps,
  review:
   typeof b.rating === 'number' && b.rating > 0
    ? { rating: b.rating, text: b.reviewText ?? '' }
    : null,
 };
}

// Statuses BookingStatusTracker knows how to draw. pending_payment/cancelled/
// refunded are not steps on that rail, so the tracker is hidden for them
// instead of rendering every step as "not reached".
const TRACKED_STATUSES: BookingStatus[] = [
 'booked',
 'priest_assigned',
 'in_progress',
 'completed',
 'video_uploaded',
 'delivered',
];

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 return d.toLocaleDateString('en-IN', {
 weekday: 'long',
 day: 'numeric',
 month: 'long',
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

function getStatusBadge(status: BookingDetail['status']) {
 const map: Record<string, { label: string; color: string; bg: string }> = {
 pending_payment: { label: 'Payment Pending', color: 'text-amber-700', bg: 'bg-amber-100' },
 booked: { label: 'Booked', color: 'text-ganga-blue', bg: 'bg-ganga-blue-light/30' },
 priest_assigned: { label: 'Priest Assigned', color: 'text-saffron-600', bg: 'bg-saffron-100' },
 in_progress: { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-100' },
 completed: { label: 'Completed', color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/30' },
 video_uploaded: { label: 'Video Ready', color: 'text-purple-600', bg: 'bg-purple-100' },
 delivered: { label: 'Delivered', color: 'text-tulsi-green-dark', bg: 'bg-tulsi-green-light/30' },
 cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
 refunded: { label: 'Refunded', color: 'text-red-600', bg: 'bg-red-100' },
 };
 return map[status] || { label: status, color: 'text-surface-600', bg: 'bg-surface-100' };
}

// ─── Component ──────────────────────────────────────────────────

function BookingDetailContent() {
 const sp = useSearchParams();
 const bookingId = sp.get('id') ?? '';
 const { session } = useAuth();

 const [booking, setBooking] = useState<BookingDetail | null>(null);
 const [loading, setLoading] = useState(true);
 // S2C-03: why the fetch failed, so the page can say so instead of inventing
 // a booking. null + no error = "not found"; null + error = "could not load".
 const [loadError, setLoadError] = useState<string | null>(null);

 // Review state
 const [reviewRating, setReviewRating] = useState(0);
 const [reviewHover, setReviewHover] = useState(0);
 const [reviewText, setReviewText] = useState('');
 const [submittingReview, setSubmittingReview] = useState(false);
 const [reviewSubmitted, setReviewSubmitted] = useState(false);
 // S2C-04: a rejected review must say so instead of rendering as saved.
 const [reviewError, setReviewError] = useState<string | null>(null);

 // Cancel state
 const [showCancelConfirm, setShowCancelConfirm] = useState(false);
 // RV-16: surfaces a failed cancel instead of silently rendering success.
 const [cancelMsg, setCancelMsg] = useState<string | null>(null);
 const [cancelling, setCancelling] = useState(false);

 // Reschedule state (D7) — pick a new date/slot; booking re-queues if a
 // pandit was attached. Previously there was no reschedule anywhere.
 const [showReschedule, setShowReschedule] = useState(false);
 const [rescheduling, setRescheduling] = useState(false);
 const [newDate, setNewDate] = useState('');
 const [newTime, setNewTime] = useState('');
 const [rescheduleMsg, setRescheduleMsg] = useState<string | null>(null);

 // Refund state — devotee-initiated refund for paid bookings >24h before slot.
 const [showRefundConfirm, setShowRefundConfirm] = useState(false);
 const [refunding, setRefunding] = useState(false);
 const [refundReason, setRefundReason] = useState('');
 const [refundRequested, setRefundRequested] = useState(false);
 const [refundError, setRefundError] = useState<string | null>(null);

 // S2C-03 (2026-08-10): every failure path used to fall back to a hardcoded
 // "completed" booking — a temple, a priest, a video-proof URL and a ₹1,301
 // price breakdown that belonged to nobody. A devotee whose token had expired,
 // or who opened someone else's booking id (403), was shown fabricated payment
 // data for a puja that may never have happened. The fallback is gone: a
 // failed load now reports the failure and renders nothing else.
 useEffect(() => {
 let cancelled = false;

 async function fetchBooking() {
 if (!bookingId) {
 if (!cancelled) {
 setBooking(null);
 setLoadError('No booking was specified.');
 setLoading(false);
 }
 return;
 }
 try {
 const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
 headers: {
 Authorization: `Bearer ${session?.accessToken ?? ''}`,
 },
 });
 if (!res.ok) {
 const body = (await res.json().catch(() => ({}))) as { error?: string };
 // 401 takes precedence over the server's own wording ("Unauthorized"
 // tells a devotee nothing); for everything else prefer the API message.
 throw new Error(
 res.status === 401
 ? 'Your session has expired. Please sign in again to view this booking.'
 : (body?.error ??
 (res.status === 404
 ? 'We could not find this booking.'
 : res.status === 403
 ? 'This booking belongs to another account.'
 : `Could not load this booking (HTTP ${res.status}).`)),
 );
 }
 const data = (await res.json()) as { booking?: ApiBookingDetail } & ApiBookingDetail;
 const raw = data.booking ?? data;
 if (!raw?.id) {
 throw new Error('The server returned an unrecognised booking.');
 }
 if (!cancelled) {
 setBooking(mapBookingDetail(raw));
 setLoadError(null);
 }
 } catch (err) {
 if (!cancelled) {
 setBooking(null);
 setLoadError(
 err instanceof Error && err.message
 ? err.message
 : 'Could not reach the server. Please check your connection and try again.',
 );
 }
 } finally {
 if (!cancelled) setLoading(false);
 }
 }

 fetchBooking();
 return () => {
 cancelled = true;
 };
 }, [bookingId, session]);

 // S2C-04 (2026-08-10): this awaited the POST, discarded the response, swallowed
 // network errors as "Demo mode - still show success", and then flipped
 // reviewSubmitted unconditionally. A 409 ("review already submitted"), a 403,
 // or an offline device all rendered the devotee's review back to them as if it
 // had been saved — it never reached the priest's rating. Mirrors the res.ok
 // handling handleCancelBooking already uses.
 const handleSubmitReview = async () => {
 if (reviewRating === 0 || !booking) return;
 setSubmittingReview(true);
 setReviewError(null);
 try {
 const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/review`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session?.accessToken ?? ''}`,
 },
 body: JSON.stringify({ rating: reviewRating, text: reviewText }),
 });
 if (!res.ok) {
 const body = (await res.json().catch(() => ({}))) as { error?: string };
 setReviewError(
 body?.error ?? `Could not submit your review (HTTP ${res.status}). Please try again.`,
 );
 setSubmittingReview(false);
 return; // leave the form up with the rating intact
 }
 setReviewSubmitted(true);
 } catch {
 setReviewError(
 'Could not reach the server. Your review has NOT been saved — please try again.',
 );
 }
 setSubmittingReview(false);
 };

 // RV-16 (2026-08-10): this used to discard the response entirely and flip the
 // UI to 'cancelled' unconditionally — so a 409 ("within 24 hours") or a 403
 // rendered as a green "Cancelled" badge plus "if you were charged, a refund
 // will be processed". The devotee believed they had cancelled and been
 // refunded while the booking was still live and their money untouched; the
 // pandit still turns up. The sibling handleReschedule below already checks
 // res.ok — this now matches it.
 const handleCancelBooking = async () => {
 if (!booking) return;
 setCancelling(true);
 setCancelMsg(null);
 try {
 const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
 method: 'POST',
 headers: {
 Authorization: `Bearer ${session?.accessToken}`,
 },
 });
 if (!res.ok) {
 const body = await res.json().catch(() => ({}) as { error?: string });
 setCancelMsg(
 body?.error ||
 (res.status === 409
 ? 'This booking can no longer be cancelled (within 24 hours of the scheduled time).'
 : `Could not cancel this booking (${res.status}). Please contact support@darshya.online.`),
 );
 setCancelling(false);
 return; // leave status untouched — the booking is still live
 }
 setBooking({ ...booking, status: 'cancelled' });
 setShowCancelConfirm(false);
 } catch {
 setCancelMsg(
 'Could not reach the server. Your booking has NOT been cancelled — please check your connection and try again.',
 );
 }
 setCancelling(false);
 };

 // D7: submit a reschedule to POST /bookings/{id}/reschedule.
 const handleReschedule = async () => {
 if (!booking || !newDate) return;
 setRescheduling(true);
 setRescheduleMsg(null);
 try {
 const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/reschedule`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session?.accessToken}`,
 },
 body: JSON.stringify({ newDate, ...(newTime ? { newTimeSlot: newTime } : {}) }),
 });
 if (res.ok) {
 setBooking({ ...booking, scheduledDate: newDate, ...(newTime ? { scheduledTime: newTime } : {}) });
 setRescheduleMsg('Rescheduled successfully.');
 setShowReschedule(false);
 } else {
 const body = await res.json().catch(() => ({}));
 setRescheduleMsg(body?.error ?? 'Could not reschedule. Try a date more than 24h away.');
 }
 } catch {
 setRescheduleMsg('Network error. Please try again.');
 }
 setRescheduling(false);
 };

 // Devotee-initiated refund — eligibility (paid + scheduled > now+24h) is
 // re-checked server-side; client gates UI by visible status only.
 const handleRequestRefund = async () => {
 if (!booking) return;
 setRefunding(true);
 setRefundError(null);
 try {
 const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/request-refund`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session?.accessToken}`,
 },
 body: JSON.stringify({ reason: refundReason || 'Devotee requested refund' }),
 });
 if (!res.ok) {
 // RES-09 (2026-08-12): the fallback here was the literal string
 // `HTTP ${res.status}`, rendered straight into the refund panel — a
 // devotee asking for her money back was shown "HTTP 500". The server's
 // own sentence ("Refund window has closed") is still preferred; only
 // when it has nothing to say do we substitute human copy.
 const body = (await res.json().catch(() => null)) as { error?: string } | null;
 setRefundError(
 serverErrorMessage(body, friendlyApiError(`HTTP ${res.status}`).message),
 );
 return;
 }
 setRefundRequested(true);
 setBooking({ ...booking, status: 'cancelled' });
 } catch (err) {
 // A network/timeout failure used to surface the browser's own
 // "Failed to fetch".
 setRefundError(friendlyApiError(err).message);
 } finally {
 setRefunding(false);
 setShowRefundConfirm(false);
 }
 };

 if (loading) {
 return (
 <div className="flex min-h-[100dvh] items-center justify-center bg-saffron-50">
 <div className="text-center">
 <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-saffron-500" />
 <p className="text-sm text-surface-500">Loading booking details...</p>
 </div>
 </div>
 );
 }

 // S2C-03: the honest failure state. Nothing about the booking is rendered,
 // because nothing about it is known.
 if (!booking) {
 return (
 <div className="flex min-h-[100dvh] items-center justify-center bg-saffron-50 px-4">
 <div className="max-w-md text-center">
 <AlertCircle className="mx-auto mb-4 h-12 w-12 text-surface-300" />
 <h2 className="mb-2 text-xl font-bold text-surface-700">
 We could not load this booking
 </h2>
 <p className="mb-6 text-sm text-surface-500">
 {loadError ?? 'We could not find this booking.'}
 </p>
 <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
 <Link
 href="/bookings"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
 >
 View All Bookings
 </Link>
 <a
 href="mailto:support@darshya.online"
 className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-6 py-3 font-medium text-surface-600 hover:bg-surface-50"
 >
 <Headphones className="h-4 w-4" />
 Contact Support
 </a>
 </div>
 </div>
 </div>
 );
 }

 const statusBadge = getStatusBadge(booking.status);
 // Allowlist mirroring the API's CANCELLABLE_STATUSES (pending_payment,
 // confirmed, priest_assigned) — a denylist let 'refunded' show a Cancel button.
 const isCancellable =
 booking.status === 'pending_payment' ||
 booking.status === 'booked' ||
 booking.status === 'priest_assigned';
 // Refund only when booking is paid (i.e. past pending_payment & not yet
 // performed) AND scheduled date+time is more than 24h away.
 const scheduledMs = (() => {
 const parts = (booking.scheduledTime || '00:00').split(':').map(Number);
 const d = new Date(booking.scheduledDate + 'T00:00:00');
 d.setHours(parts[0] ?? 0, parts[1] ?? 0, 0, 0);
 return d.getTime();
 })();
 const isRefundable =
 !refundRequested &&
 (booking.status === 'booked' ||
 booking.status === 'priest_assigned') &&
 scheduledMs - Date.now() > 24 * 60 * 60 * 1000;
 const canReview =
 !booking.review &&
 !reviewSubmitted &&
 (booking.status === 'delivered' ||
 booking.status === 'video_uploaded' ||
 booking.status === 'completed');
 // Hoisted so the <a href> below narrows to string without relying on
 // property-path narrowing inside JSX.
 const videoUrl = booking.videoUrl;
 // DB-09: three-way, not truthy/falsy. `playableVideoUrl` is non-null exactly
 // when the state is 'player', which keeps the href narrowed to string without
 // reintroducing a truthiness gate that "not a url at all" would satisfy.
 const videoState = videoProofState(booking.status, videoUrl);
 const playableVideoUrl = videoState === 'player' ? (videoUrl as string) : null;

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* Breadcrumb */}
 <div className="border-b border-surface-100 bg-white">
 <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
 <nav className="flex items-center gap-2 text-sm text-surface-500">
 <Link href="/" className="hover:text-orange-600">Home</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <Link href="/bookings" className="hover:text-orange-600">My Bookings</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <span className="font-medium text-surface-700">{booking.bookingNumber}</span>
 </nav>
 </div>
 </div>

 <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
 {/* Header */}
 <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <div className="mb-1 flex items-center gap-3">
 <h1 className="text-xl font-bold text-surface-800 sm:text-2xl">{booking.pujaName}</h1>
 <span
 className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge.bg} ${statusBadge.color}`}
 >
 {statusBadge.label}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className="font-mono text-sm text-surface-400">{booking.bookingNumber}</span>
 <button
 onClick={() => navigator.clipboard?.writeText(booking.bookingNumber)}
 className="text-surface-400 hover:text-saffron-600"
 title="Copy booking number"
 >
 <Copy className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 <Link
 href="/bookings"
 className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50"
 >
 <ChevronLeft className="h-4 w-4" />
 All Bookings
 </Link>
 </div>

 {/* Status Tracker */}
 {TRACKED_STATUSES.includes(booking.status as BookingStatus) && (
 <div className="mb-8 rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-6 text-lg font-bold text-surface-800">Booking Progress</h2>
 <BookingStatusTracker
 currentStatus={booking.status as BookingStatus}
 timestamps={booking.timestamps}
 />
 </div>
 )}

 {/* DB-03 (2026-08-12): this banner was text with no action. The list row
     already offers "Complete payment"; the page the row links to did not,
     so a devotee who followed the CTA arrived at a dead end. Same label,
     same route, so the two surfaces read as one product. */}
 {booking.status === 'pending_payment' && (
 <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-start sm:justify-between">
 <div className="flex items-start gap-3">
 <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
 <div>
 <h3 className="font-semibold text-amber-800">Payment Pending</h3>
 <p className="text-sm text-amber-700">
 This booking is not confirmed yet — we have not received your payment.
 Your slot stays reserved for a short while; complete the payment to
 confirm it, or cancel to release it for someone else.
 </p>
 </div>
 </div>
 <Link
 href={`/bookings/pay?id=${booking.id}`}
 className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
 >
 <CreditCard className="h-4 w-4" />
 Complete payment
 </Link>
 </div>
 )}

 {/* Cancelled banner */}
 {(booking.status === 'cancelled' || booking.status === 'refunded') && (
 <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
 <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
 <div>
 <h3 className="font-semibold text-red-800">
 {booking.status === 'refunded' ? 'Booking Refunded' : 'Booking Cancelled'}
 </h3>
 {/* S2C-03: only state a refund when the payment record shows one. */}
 <p className="text-sm text-red-600">
 {booking.amountRefunded > 0
 ? `This booking has been cancelled. ₹${booking.amountRefunded.toLocaleString('en-IN')} has been refunded and will reach your account within 5-7 business days.`
 : booking.amountPaid > 0
 ? 'This booking has been cancelled. Any refund due will be processed within 5-7 business days — contact support if you do not see it.'
 : 'This booking has been cancelled. No payment was taken for it.'}
 </p>
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 {/* Left Column */}
 <div className="space-y-6 lg:col-span-2">
 {/* Booking Info */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <FileText className="h-5 w-5 text-saffron-500" />
 Booking Details
 </h2>
 <div className="space-y-4">
 <DetailRow icon={Flame} label="Puja" value={booking.pujaName} />
 <DetailRow icon={MapPin} label="Temple">
 <div>
 {/* Only link when the API sent a slug — `/temples/` is a 404. */}
 {booking.templeSlug ? (
 <Link
 href={`/temples/${booking.templeSlug}`}
 className="font-medium text-saffron-600 hover:underline"
 >
 {booking.templeName}
 </Link>
 ) : (
 <span className="font-medium text-surface-700">{booking.templeName}</span>
 )}
 <p className="text-xs text-surface-400">
 {[booking.templeCity, booking.templeState].filter(Boolean).join(', ')}
 </p>
 </div>
 </DetailRow>
 <DetailRow
 icon={Calendar}
 label="Date"
 value={formatDate(booking.scheduledDate)}
 />
 <DetailRow
 icon={Clock}
 label="Time"
 value={
 booking.durationMinutes > 0
 ? `${formatTime(booking.scheduledTime)} (${booking.durationMinutes} min)`
 : formatTime(booking.scheduledTime)
 }
 />
 {booking.priestName && (
 <DetailRow icon={Users} label="Priest" value={booking.priestName} />
 )}
 </div>
 </div>

 {/* Devotee Info */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Users className="h-5 w-5 text-saffron-500" />
 Devotees ({booking.devotees.length})
 </h2>
 <div className="space-y-3">
 {booking.devotees.map((devotee, i) => (
 <div
 key={i}
 className="flex items-center gap-3 rounded-lg border border-surface-100 bg-surface-50/50 p-3"
 >
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-sm font-bold text-saffron-600">
 {i + 1}
 </div>
 <div>
 <p className="font-medium text-surface-700">{devotee.name}</p>
 <div className="flex items-center gap-3 text-xs text-surface-500">
 {devotee.gotra && <span>Gotra: {devotee.gotra}</span>}
 {devotee.nakshatra && <span>Nakshatra: {devotee.nakshatra}</span>}
 </div>
 </div>
 </div>
 ))}
 {booking.devotees.length === 0 && (
 <p className="text-sm text-surface-500">
 No devotee names were recorded on this booking.
 </p>
 )}
 </div>
 {booking.sankalp && (
 <div className="mt-4 rounded-lg border border-saffron-100 bg-saffron-50/50 p-3">
 <p className="mb-1 text-xs font-semibold text-saffron-700">Sankalp</p>
 <p className="text-sm text-surface-600">{booking.sankalp}</p>
 </div>
 )}
 {booking.specialInstructions && (
 <div className="mt-3 rounded-lg border border-surface-100 bg-surface-50 p-3">
 <p className="mb-1 text-xs font-semibold text-surface-600">Special Instructions</p>
 <p className="text-sm text-surface-600">{booking.specialInstructions}</p>
 </div>
 )}
 </div>

 {/* Video Proof Section.
     DB-09 (2026-08-12): this block was gated on `videoUrl` truthiness, so a
     stored "" rendered nothing at all under a "Video Ready" status pill, and
     a stored "not a url at all" rendered a play surface and a Download
     button whose href a browser resolves RELATIVE to this page — the devotee
     clicks the one thing they paid extra trust for and lands on a 404, with
     no path to report it. `videoProofState` splits the three cases: a real
     recording, a promised-but-missing one, and nothing to show. */}
 {videoState === 'pending' && (
 <div id="video" className="rounded-xl border border-amber-200 bg-amber-50 p-6">
 <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-amber-900">
 <Video className="h-5 w-5 text-amber-600" />
 Your video is being processed
 </h2>
 <p className="text-sm text-amber-800">
 This booking is marked as recorded, but the video is not available to play
 yet. If it does not appear within 24 hours, contact support with booking{' '}
 <span className="font-mono font-semibold">{booking.bookingNumber}</span> and
 we will chase the recording for you.
 </p>
 <Link
 href="/support"
 className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
 >
 Contact support
 </Link>
 </div>
 )}

 {playableVideoUrl && (
 <div id="video" className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Video className="h-5 w-5 text-purple-500" />
 Your Puja Video Proof
 </h2>
 {/* S2C-03: videoUrl is now the real videoProofUrl, so the play surface
     and the download button open it instead of being inert decoration. */}
 <div className="overflow-hidden rounded-xl bg-surface-800">
 <a
 href={playableVideoUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="relative flex aspect-video items-center justify-center"
 >
 <div className="text-center">
 <div className="mx-auto mb-3 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
 <Play className="ml-1 h-8 w-8 text-white" />
 </div>
 <p className="text-sm text-white/80">Click to play video proof</p>
 </div>
 <div className="absolute left-4 top-4 rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white">
 Video Proof
 </div>
 </a>
 </div>
 <div className="mt-3 flex items-center justify-between">
 <p className="text-sm text-surface-500">
 Recorded on {formatDate(booking.scheduledDate)}
 </p>
 <a
 href={playableVideoUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-100"
 >
 <Download className="h-3.5 w-3.5" />
 Download Video
 </a>
 </div>
 </div>
 )}

 {/* Prasad Delivery — S2C-03: the only prasad fact the API records is
     `prasadTrackingId`. Carrier, courier status and an expected-delivery
     date were invented by the old fallback; they are not shown because
     nothing in the system knows them. */}
 {booking.prasadDelivery && (
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Package className="h-5 w-5 text-saffron-500" />
 Prasad Delivery
 </h2>
 <div className="rounded-xl border border-saffron-100 bg-saffron-50/50 p-4">
 {booking.prasadTrackingId ? (
 <div>
 <p className="text-xs font-medium text-surface-500">Tracking ID</p>
 <p className="font-mono text-sm font-medium text-surface-700">
 {booking.prasadTrackingId}
 </p>
 </div>
 ) : (
 <p className="text-sm text-surface-600">
 Prasad delivery is included in this booking. Your tracking ID will appear
 here once the parcel is dispatched.
 </p>
 )}
 </div>
 </div>
 )}

 {/* Review Section */}
 {canReview && (
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <MessageSquare className="h-5 w-5 text-saffron-500" />
 Rate Your Experience
 </h2>

 {/* Star Rating */}
 <div className="mb-4">
 <p className="mb-2 text-sm text-surface-600">
 How was your puja experience?
 </p>
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 onClick={() => setReviewRating(star)}
 onMouseEnter={() => setReviewHover(star)}
 onMouseLeave={() => setReviewHover(0)}
 className="p-0.5 transition-transform hover:scale-110"
 >
 <Star
 className={`h-8 w-8 ${
 star <= (reviewHover || reviewRating)
 ? 'fill-amber-500 text-amber-500'
 : 'text-surface-300'
 }`}
 />
 </button>
 ))}
 {reviewRating > 0 && (
 <span className="ml-2 text-sm font-medium text-surface-600">
 {reviewRating === 5
 ? 'Excellent!'
 : reviewRating === 4
 ? 'Very Good'
 : reviewRating === 3
 ? 'Good'
 : reviewRating === 2
 ? 'Fair'
 : 'Poor'}
 </span>
 )}
 </div>
 </div>

 <textarea
 value={reviewText}
 onChange={(e) => setReviewText(e.target.value.slice(0, 200))}
 rows={3}
 maxLength={200}
 placeholder="Share your experience with the priest... (optional, max 200 chars)"
 className="mb-1 w-full rounded-xl border border-surface-200 px-4 py-3 text-sm text-surface-700 placeholder:text-surface-400 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 <p className="mb-3 text-right text-xs text-surface-400">
 {reviewText.length}/200
 </p>

 <button
 onClick={handleSubmitReview}
 disabled={reviewRating === 0 || submittingReview}
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-saffron-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {submittingReview ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 Submitting...
 </>
 ) : (
 'Submit Review'
 )}
 </button>
 {/* S2C-04: a rejected review must say so — it used to render as saved. */}
 {reviewError && (
 <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
 {reviewError}
 </p>
 )}
 </div>
 )}

 {/* Review submitted */}
 {(booking.review || reviewSubmitted) && (
 <div className="rounded-xl border border-tulsi-green-light/50 bg-tulsi-green-light/10 p-6">
 <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-surface-800">
 <MessageSquare className="h-5 w-5 text-tulsi-green" />
 Your Review
 </h2>
 <div className="flex items-center gap-1 mb-2">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className={`h-5 w-5 ${
 star <= (booking.review?.rating || reviewRating)
 ? 'fill-amber-500 text-amber-500'
 : 'text-surface-300'
 }`}
 />
 ))}
 </div>
 {(booking.review?.text || reviewText) && (
 <p className="text-sm text-surface-600">
 {booking.review?.text || reviewText}
 </p>
 )}
 </div>
 )}
 </div>

 {/* Right Column - Sidebar */}
 <div className="space-y-6">
 {/* Payment — S2C-03: the old "Puja Fee / Platform Fee / Prasad Delivery"
     split came entirely from the fallback constant. The booking record
     carries one devotee-facing figure (`priceAmount`); the 20/80 split is
     internal and is not a line item the devotee was charged. Show the real
     amount, what the gateway actually captured, and any refund. */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h3 className="mb-4 flex items-center gap-2 font-bold text-surface-800">
 <IndianRupee className="h-5 w-5 text-saffron-500" />
 Payment
 </h3>
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Puja Amount</span>
 <span className="font-medium text-surface-700">
 ₹{booking.amount.toLocaleString('en-IN')}
 </span>
 </div>
 {booking.amountRefunded > 0 && (
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Refunded</span>
 <span className="font-medium text-tulsi-green">
 −₹{booking.amountRefunded.toLocaleString('en-IN')}
 </span>
 </div>
 )}
 <div className="border-t border-surface-100 pt-3">
 <div className="flex justify-between">
 <span className="font-bold text-surface-800">
 {booking.amountPaid > 0 ? 'Total Paid' : 'Amount Due'}
 </span>
 <span className="text-xl font-bold text-saffron-600">
 ₹{(booking.amountPaid > 0 ? booking.amountPaid : booking.amount).toLocaleString('en-IN')}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h3 className="mb-4 font-bold text-surface-800">Actions</h3>
 <div className="space-y-3">
 {/* Reschedule (D7) */}
 {(booking.status === 'booked' || booking.status === 'priest_assigned') && (
 showReschedule ? (
 <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
 <p className="mb-2 text-sm text-blue-800">Pick a new date (more than 24h from now):</p>
 <input
 type="date"
 value={newDate}
 onChange={(e) => setNewDate(e.target.value)}
 min={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
 className="mb-2 w-full rounded-md border border-blue-300 px-2 py-1.5 text-sm text-surface-700"
 />
 <input
 type="text"
 value={newTime}
 onChange={(e) => setNewTime(e.target.value)}
 placeholder="New time slot (optional, e.g. 10:00)"
 className="mb-2 w-full rounded-md border border-blue-300 px-2 py-1.5 text-sm text-surface-700"
 />
 {rescheduleMsg && <p className="mb-2 text-xs text-blue-700">{rescheduleMsg}</p>}
 <div className="flex gap-2">
 <button
 onClick={handleReschedule}
 disabled={rescheduling || !newDate}
 className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
 >
 {rescheduling ? 'Rescheduling…' : 'Confirm new date'}
 </button>
 <button
 onClick={() => setShowReschedule(false)}
 className="flex-1 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-semibold text-surface-600 hover:bg-surface-50"
 >
 Back
 </button>
 </div>
 </div>
 ) : (
 <button
 onClick={() => setShowReschedule(true)}
 className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
 >
 <Calendar className="h-4 w-4" />
 Reschedule
 </button>
 )
 )}
 {rescheduleMsg && !showReschedule && (
 <div className="rounded-lg border border-tulsi-green-light/50 bg-tulsi-green-light/10 p-3 text-xs text-tulsi-green-dark">
 {rescheduleMsg}
 </div>
 )}

 {isCancellable && (
 <>
 {showCancelConfirm ? (
 <div className="rounded-lg border border-red-200 bg-red-50 p-3">
 {/* S2C-03: don't promise a refund on a booking nothing was paid for. */}
 <p className="mb-3 text-sm text-red-700">
 {booking.amountPaid > 0
 ? 'Are you sure you want to cancel this booking? Any refund due under the cancellation policy will be processed within 5-7 business days.'
 : 'Are you sure you want to cancel this booking?'}
 </p>
 <div className="flex gap-2">
 <button
 onClick={handleCancelBooking}
 disabled={cancelling}
 className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
 >
 {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
 </button>
 <button
 onClick={() => setShowCancelConfirm(false)}
 className="flex-1 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-semibold text-surface-600 hover:bg-surface-50"
 >
 No, Keep
 </button>
 </div>
 </div>
 ) : (
 <button
 onClick={() => setShowCancelConfirm(true)}
 className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
 >
 <XCircle className="h-4 w-4" />
 Cancel Booking
 </button>
 )}
 {/* RV-16: a rejected cancel must say so — previously it rendered as success. */}
 {cancelMsg && (
 <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
 {cancelMsg}
 </p>
 )}
 </>
 )}

 {isRefundable && (
 showRefundConfirm ? (
 <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
 <p className="mb-2 text-sm text-amber-800">
 Confirm cancellation &amp; refund. Your payment will be returned within 5-7 business days.
 </p>
 <textarea
 value={refundReason}
 onChange={(e) => setRefundReason(e.target.value.slice(0, 200))}
 placeholder="Reason (optional)"
 rows={2}
 className="mb-2 w-full rounded-md border border-amber-300 px-2 py-1.5 text-xs text-surface-700"
 />
 <div className="flex gap-2">
 <button
 onClick={handleRequestRefund}
 disabled={refunding}
 className="flex-1 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
 >
 {refunding ? 'Submitting…' : 'Confirm refund'}
 </button>
 <button
 onClick={() => setShowRefundConfirm(false)}
 className="flex-1 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-semibold text-surface-600 hover:bg-surface-50"
 >
 Back
 </button>
 </div>
 {refundError && (
 <p className="mt-2 text-xs text-red-600">{refundError}</p>
 )}
 </div>
 ) : (
 <button
 onClick={() => setShowRefundConfirm(true)}
 className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-300 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50"
 >
 <XCircle className="h-4 w-4" />
 Request cancellation &amp; refund
 </button>
 )
 )}

 {refundRequested && (
 <div className="rounded-lg border border-tulsi-green-light/50 bg-tulsi-green-light/10 p-3 text-xs text-tulsi-green-dark">
 Refund requested. It will be processed within 1 hour and credited within 5-7 business days.
 </div>
 )}

 <Link
 href="mailto:support@darshya.online"
 className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-surface-200 py-2.5 text-sm font-semibold text-surface-600 transition-colors hover:bg-surface-50"
 >
 <Headphones className="h-4 w-4" />
 Contact Support
 </Link>

 <Link
 href={booking.pujaSlug ? `/pujas/${booking.pujaSlug}` : '/pujas'}
 className="flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-saffron-700"
 >
 <Flame className="h-4 w-4" />
 Book Again
 </Link>
 </div>
 </div>

 {/* Quick Info */}
 <div className="rounded-xl border border-saffron-100 bg-saffron-50/50 p-4">
 <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-saffron-700">
 Need Help?
 </h4>
 <p className="text-xs leading-relaxed text-surface-600">
 For any queries about your booking, contact our support team at{' '}
 <a href="mailto:support@darshya.online" className="font-medium text-saffron-600 hover:underline">
 support@darshya.online
 </a>{' '}
 or call{' '}
 <a href="tel:+919255109400" className="font-medium text-saffron-600 hover:underline">
 +91 80-BHAKTI-00
 </a>
 .
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

// ─── Detail Row Component ───────────────────────────────────────

function DetailRow({
 icon: Icon,
 label,
 value,
 children,
}: {
 icon: React.ComponentType<{ className?: string }>;
 label: string;
 value?: string;
 children?: React.ReactNode;
}) {
 return (
 <div className="flex items-start gap-3">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-50">
 <Icon className="h-4 w-4 text-saffron-500" />
 </div>
 <div>
 <p className="text-xs font-medium text-surface-500">{label}</p>
 {value ? <p className="text-sm font-medium text-surface-700">{value}</p> : children}
 </div>
 </div>
 );
}

// ─── Export ─────────────────────────────────────────────────────

export default function BookingDetailPage() {
 return (
 <Suspense fallback={<div className="p-8 text-sm text-surface-500">Loading…</div>}>
 <AuthGuard>
 <BookingDetailContent />
 </AuthGuard>
 </Suspense>
 );
}
