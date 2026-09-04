'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
 ArrowLeft,
 Calendar,
 Clock,
 MapPin,
 Flame,
 Users,
 IndianRupee,
 CheckCircle2,
 Play,
 Video,
 ExternalLink,
 Loader2,
 MessageSquare,
 Star,
} from 'lucide-react';
import { useAuth } from '../../../../lib/auth-context';
import { API_BASE_URL } from '../../../../lib/api-config';
import VideoProofUpload from '../../../../components/provider/VideoProofUpload';
import { H1 } from '../../../../components/ui/heading-recipe';
import { UserFacingError, userFacingMessage, serverErrorText } from '../../../../lib/friendly-error';

interface BookingDetail {
 id: string;
 bookingNumber: string;
 status: string;
 scheduledDate: string;
 scheduledTimeSlot: string;
 priceAmount: number;
 priestPayout: number;
 platformCommission: number;
 currency: string;
 devoteeNames: Array<{ name: string; gotra?: string; nakshatra?: string }>;
 sankalpDetails: string | null;
 specialInstructions: string | null;
 videoProofUrl: string | null;
 videoUploadedAt: string | null;
 rating: number | null;
 reviewText: string | null;
 createdAt: string;
 temple: { id: string; name: string; city: string; state: string };
 pujaType: { id: string; name: string; durationMinutes: number; description: string };
 user: { fullName: string; phone: string };
}

// PF-10: `formatCurrency(undefined)` yields the literal string "₹NaN", which is
// exactly what the Platform Commission line rendered when the API did not send
// the column. The value is now selected server-side, and a missing/unparseable
// amount degrades to an em dash instead of printing a broken number on the one
// screen where a pandit checks the platform's cut.
function formatCurrency(amount: number | string | null | undefined): string {
 const n = typeof amount === 'string' ? Number(amount) : amount;
 if (n === null || n === undefined || !Number.isFinite(n)) return '—';
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// PF-09: was `new Date(dateStr + 'T00:00:00')` against an ISO instant, which
// parsed to Invalid Date. See the note in ../page.tsx — the puja's own zone is
// pinned so a UTC-midnight DATE never renders as the previous day.
function formatDate(dateStr: string): string {
 const d = new Date(dateStr);
 if (Number.isNaN(d.getTime())) return dateStr;
 return d.toLocaleDateString('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
 });
}

function formatTime(time: string): string {
 const parts = time.split(':').map(Number);
 const h = parts[0] ?? 0;
 const m = parts[1] ?? 0;
 return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function getStatusConfig(status: string) {
 const map: Record<string, { label: string; cls: string; description: string }> = {
 confirmed: { label: 'Pending Accept', cls: 'bg-amber-100 text-amber-700', description: 'Waiting for you to accept this booking.' },
 priest_assigned: { label: 'Accepted', cls: 'bg-blue-100 text-blue-700', description: 'You have accepted. Start the puja at the scheduled time.' },
 in_progress: { label: 'In Progress', cls: 'bg-saffron-100 text-saffron-700', description: 'Puja is underway. Mark as complete when done.' },
 completed: { label: 'Completed', cls: 'bg-tulsi-green-light/30 text-tulsi-green', description: 'Puja is complete. Please upload video proof.' },
 video_uploaded: { label: 'Video Uploaded', cls: 'bg-purple-100 text-purple-700', description: 'Video proof has been submitted. Awaiting delivery confirmation.' },
 delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700', description: 'Booking fully completed and delivered to the devotee.' },
 };
 return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600', description: '' };
}

function PriestBookingDetailInner() {
 const sp = useSearchParams();
 const router = useRouter();
 const { session } = useAuth();
 const bookingId = sp.get('id') ?? '';

 const [booking, setBooking] = useState<BookingDetail | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [actionLoading, setActionLoading] = useState(false);
 const [actionError, setActionError] = useState<string | null>(null);
 const [replacingProof, setReplacingProof] = useState(false);

 // PF-08: this used to GET the whole `/priest/bookings` list (server default:
 // 20 rows) and `.find()` the id inside it, so any booking from row 21 down
 // could only ever throw "Booking not found" — and this page holds the only
 // video-proof control, so those bookings could never be completed. It also
 // downloaded the entire list on every detail view.
 async function fetchBooking() {
 setError(null);
 try {
 const res = await fetch(`${API_BASE_URL}/priest/bookings/${bookingId}`, {
 headers: { Authorization: `Bearer ${session?.accessToken ?? ''}` },
 });
 if (!res.ok) {
 const body = await res.text().catch(() => '');
 // RES-09: this rendered "API 500: {\"error\":\"Internal Server Error\"}"
 // into the pandit's booking detail page. Server sentence or friendly copy.
 throw new UserFacingError(
  serverErrorText(body, 'We could not load this booking. Please try again.'),
 );
 }
 const data = await res.json();
 if (!data?.booking) {
 throw new UserFacingError('We could not find this booking.');
 }
 setBooking(data.booking);
 } catch (e) {
 const msg = userFacingMessage(e, 'We could not load this booking. Please try again.');
 setError(msg);
 setBooking(null);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 if (session?.accessToken && bookingId) {
 fetchBooking();
 } else {
 setLoading(false);
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [session, bookingId]);

 async function handleAction(action: string) {
 if (!booking) return;
 setActionLoading(true);
 setActionError(null);
 try {
 const endpoint = `${API_BASE_URL}/priest/bookings/${booking.id}/${action}`;
 // NO Content-Type header: these actions send NO body. Declaring
 // application/json on a bodyless request makes Fastify reject it before the
 // handler ever runs — FST_ERR_CTP_EMPTY_JSON_BODY, "Body cannot be empty when
 // content-type is application/json". Every button on this page (Accept /
 // Start Puja / Mark Complete) returned 400 for that reason alone, so no
 // pandit could progress a single booking: every paid puja stalled at
 // Accepted, no devotee got their video, and nobody got paid.
 const res = await fetch(endpoint, {
 method: 'PATCH',
 headers: {
 Authorization: `Bearer ${session?.accessToken ?? ''}`,
 },
 });
 if (!res.ok) {
 const body = await res.text().catch(() => '');
 // RES-09: this rendered "API 500: {\"error\":\"Internal Server Error\"}"
 // into the pandit's booking detail page. Server sentence or friendly copy.
 throw new UserFacingError(
  serverErrorText(body, 'We could not load this booking. Please try again.'),
 );
 }
 await fetchBooking();
 } catch (e) {
 const msg = userFacingMessage(e, 'That action did not go through. Please try again.');
 setActionError(msg);
 } finally {
 setActionLoading(false);
 }
 }

 /**
  * PF-03: this used to be `await fetch(...); setVideoSubmitted(true);` — no
  * `res.ok` check, no catch. A rejected upload (the booking left `completed`
  * since the page loaded; proof filed from the phone; admin refunded) still
  * painted a green "Video Proof Uploaded". The pandit walked away believing the
  * proof was filed, the devotee never got the video they paid for, the payout
  * never fired, and the dispute surfaced days later with no evidence.
  *
  * It throws on failure so the uploader keeps its input open for a retry
  * instead of collapsing into its own success state.
  */
 async function submitProof(url: string) {
 if (!booking) return;
 const trimmed = url.trim();
 setActionError(null);
 try {
 // Same shape the API now enforces — fail here rather than storing a
 // value that permanently blocks delivery.
 new URL(trimmed);
 } catch {
 const msg = 'That does not look like a valid link. Paste the full https:// URL of the recording.';
 setActionError(msg);
 throw new Error(msg);
 }
 const res = await fetch(`${API_BASE_URL}/priest/bookings/${booking.id}/video`, {
 method: 'POST',
 headers: {
 Authorization: `Bearer ${session?.accessToken ?? ''}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ videoUrl: trimmed }),
 });
 if (!res.ok) {
 const body = await res.text().catch(() => '');
 // RES-09: "API 413: <html>…" was the video-proof rejection a pandit saw.
 const msg = serverErrorText(body, 'We could not save that recording link. Please try again.');
 setActionError(msg);
 throw new UserFacingError(msg);
 }
 await fetchBooking();
 }

 /** PF-04 — the only in-product path from `video_uploaded` to `delivered`. */
 async function markDelivered() {
 if (!booking) return;
 setActionLoading(true);
 setActionError(null);
 try {
 const res = await fetch(`${API_BASE_URL}/bookings/${booking.id}`, {
 method: 'PATCH',
 headers: {
 Authorization: `Bearer ${session?.accessToken ?? ''}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ status: 'delivered' }),
 });
 if (!res.ok) {
 const body = await res.text().catch(() => '');
 throw new UserFacingError(
  serverErrorText(body, 'We could not mark this booking delivered. Please try again.'),
 );
 }
 await fetchBooking();
 } catch (e) {
 setActionError(userFacingMessage(e, 'That action did not go through. Please try again.'));
 } finally {
 setActionLoading(false);
 }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
 </div>
 );
 }

 if (!booking) {
 return (
 <div className="space-y-4 max-w-4xl">
 <Link
 href="/priest/bookings"
 className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-saffron-600 transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 Back to Bookings
 </Link>
 {error ? (
 <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
 Could not load booking: {error}
 </div>
 ) : (
 <div className="text-center py-20">
 <p className="text-surface-500">Booking not found</p>
 </div>
 )}
 </div>
 );
 }

 const statusCfg = getStatusConfig(booking.status);

 return (
 <div className="space-y-6 max-w-4xl">
 <Link
 href="/priest/bookings"
 className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-saffron-600 transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 Back to Bookings
 </Link>

 {actionError && (
 <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
 Action failed: {actionError}
 </div>
 )}

 <div className="bg-white rounded-xl border border-surface-100 p-6">
 <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
 <div className="w-14 h-14 bg-saffron-50 rounded-xl flex items-center justify-center">
 <Flame className="w-7 h-7 text-saffron-500" />
 </div>
 <div className="flex-1">
 <h1 className={H1.portal}>{booking.pujaType.name}</h1>
 <p className="text-sm text-surface-500 font-mono">{booking.bookingNumber}</p>
 </div>
 <span className={`self-start text-sm font-semibold px-3 py-1 rounded-full ${statusCfg.cls}`}>
 {statusCfg.label}
 </span>
 </div>

 {statusCfg.description && (
 <div className="bg-surface-50 rounded-lg p-3 text-sm text-surface-600">
 {statusCfg.description}
 </div>
 )}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-6">
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h2 className="font-semibold text-surface-800 mb-4">Schedule & Location</h2>
 <div className="space-y-3">
 <div className="flex items-start gap-3">
 <MapPin className="w-4 h-4 text-surface-400 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-surface-800">{booking.temple.name}</p>
 <p className="text-xs text-surface-500">{booking.temple.city}, {booking.temple.state}</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <Calendar className="w-4 h-4 text-surface-400 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-surface-800">{formatDate(booking.scheduledDate)}</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <Clock className="w-4 h-4 text-surface-400 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-surface-800">{formatTime(booking.scheduledTimeSlot)}</p>
 <p className="text-xs text-surface-500">Duration: {booking.pujaType.durationMinutes} minutes</p>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h2 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <Users className="w-4 h-4 text-surface-400" />
 Devotees ({booking.devoteeNames.length})
 </h2>
 <div className="space-y-3">
 {booking.devoteeNames.map((devotee, idx) => (
 <div key={idx} className="bg-surface-50 rounded-lg p-3">
 <p className="text-sm font-medium text-surface-800">{devotee.name}</p>
 <div className="flex gap-4 mt-1 text-xs text-surface-500">
 {devotee.gotra && <span>Gotra: {devotee.gotra}</span>}
 {devotee.nakshatra && <span>Nakshatra: {devotee.nakshatra}</span>}
 </div>
 </div>
 ))}
 </div>

 {booking.sankalpDetails && (
 <div className="mt-4 pt-4 border-t border-surface-100">
 <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Sankalp</h3>
 <p className="text-sm text-surface-600">{booking.sankalpDetails}</p>
 </div>
 )}

 {booking.specialInstructions && (
 <div className="mt-4 pt-4 border-t border-surface-100">
 <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Special Instructions</h3>
 <p className="text-sm text-surface-600">{booking.specialInstructions}</p>
 </div>
 )}
 </div>
 </div>

 <div className="space-y-6">
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h2 className="font-semibold text-surface-800 mb-4">Actions</h2>

 {booking.status === 'confirmed' && (
 <button
 onClick={() => handleAction('accept')}
 disabled={actionLoading}
 className="w-full flex items-center justify-center gap-2 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50"
 >
 {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
 Accept Booking
 </button>
 )}

 {booking.status === 'priest_assigned' && (
 <button
 onClick={() => handleAction('start')}
 disabled={actionLoading}
 className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
 >
 {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
 Start Puja
 </button>
 )}

 {booking.status === 'in_progress' && (
 <button
 onClick={() => handleAction('complete')}
 disabled={actionLoading}
 className="w-full flex items-center justify-center gap-2 py-3 bg-tulsi-green-dark text-white font-semibold rounded-xl hover:opacity-90 transition-colors disabled:opacity-50"
 >
 {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
 Mark Puja Complete
 </button>
 )}

 {booking.status === 'completed' && (
 <div className="space-y-3">
 <p className="text-sm text-surface-600">
 Upload video proof of the completed puja. This is mandatory before payout is processed.
 </p>
 <VideoProofUpload
 bookingId={booking.id}
 existingUrl={booking.videoProofUrl}
 onUploaded={submitProof}
 />
 </div>
 )}

 {(booking.status === 'video_uploaded' || booking.status === 'delivered') && (
 <div className="space-y-3">
 <div className="flex items-center gap-2 text-tulsi-green">
 <CheckCircle2 className="w-5 h-5" />
 <span className="font-semibold text-sm">Video Proof Uploaded</span>
 </div>
 {booking.videoProofUrl && (
 <a
 href={booking.videoProofUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-2 text-sm text-saffron-600 hover:text-saffron-700"
 >
 <ExternalLink className="w-4 h-4" />
 View uploaded video
 </a>
 )}
 <div className="bg-surface-100 rounded-xl aspect-video flex items-center justify-center">
 <div className="text-center">
 <Video className="w-10 h-10 text-surface-300 mx-auto mb-2" />
 <p className="text-xs text-surface-400">Video preview</p>
 </div>
 </div>

 {booking.status === 'video_uploaded' && (
 <>
 {/* PF-06: a wrong link used to brick the booking — re-upload 400'd
     and the delivery gate refused a blank proof, so nothing could
     move without support running curl. */}
 {replacingProof ? (
 <VideoProofUpload
 bookingId={booking.id}
 onUploaded={async (url) => {
 await submitProof(url);
 setReplacingProof(false);
 }}
 />
 ) : (
 <button
 type="button"
 onClick={() => setReplacingProof(true)}
 className="text-sm font-medium text-saffron-600 hover:text-saffron-700"
 >
 Wrong link? Replace video proof
 </button>
 )}

 {/* PF-04: no client anywhere could move a booking to `delivered`,
     so fulfilment stopped one step short of done and every booking
     piled up here forever. */}
 <button
 type="button"
 onClick={markDelivered}
 disabled={actionLoading}
 className="w-full flex items-center justify-center gap-2 py-3 bg-tulsi-green-dark text-white font-semibold rounded-xl hover:opacity-90 transition-colors disabled:opacity-50"
 >
 {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
 Mark delivered
 </button>
 <p className="text-xs text-surface-400 text-center">
 Confirms the devotee has received the recording and closes the booking.
 </p>
 </>
 )}
 </div>
 )}

 {booking.rating && (
 <div className="mt-4 pt-4 border-t border-surface-100">
 <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Devotee Review</h3>
 <div className="flex items-center gap-1 mb-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <Star
 key={s}
 className={`w-4 h-4 ${s <= (booking.rating ?? 0) ? 'text-temple-gold fill-temple-gold' : 'text-surface-200'}`}
 />
 ))}
 <span className="text-sm font-medium text-surface-800 ml-1">{booking.rating}/5</span>
 </div>
 {booking.reviewText && (
 <p className="text-sm text-surface-600 italic">"{booking.reviewText}"</p>
 )}
 </div>
 )}
 </div>

 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h2 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <IndianRupee className="w-4 h-4 text-surface-400" />
 Price Breakdown
 </h2>
 <div className="space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-surface-500">Booking Amount</span>
 <span className="text-surface-800">{formatCurrency(booking.priceAmount)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-surface-500">Platform Commission</span>
 <span className="text-red-500">-{formatCurrency(booking.platformCommission)}</span>
 </div>
 <div className="border-t border-surface-100 pt-2 flex justify-between">
 <span className="font-semibold text-surface-800">Your Payout</span>
 <span className="font-bold text-lg text-tulsi-green">{formatCurrency(booking.priestPayout)}</span>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h2 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <MessageSquare className="w-4 h-4 text-surface-400" />
 Communication
 </h2>
 <div className="bg-surface-50 rounded-lg p-4 text-center">
 <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
 <p className="text-sm text-surface-500">
 In-app messaging with devotees coming soon.
 </p>
 <p className="text-xs text-surface-400 mt-1">
 Devotee: {booking.user.fullName}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

export default function PriestBookingDetailPage() {
 return (
 <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-saffron-500" /></div>}>
 <PriestBookingDetailInner />
 </Suspense>
 );
}
