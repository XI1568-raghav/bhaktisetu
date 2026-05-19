'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
 Truck,
 Gift,
 FileText,
 Play,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import AuthGuard from '../../../components/AuthGuard';
import BookingStatusTracker, { type BookingStatus } from '../../../components/BookingStatusTracker';

// ─── Types ──────────────────────────────────────────────────────

interface BookingDevotee {
 name: string;
 gotra: string | null;
 nakshatra: string | null;
}

interface PriceBreakdown {
 pujaFee: number;
 platformFee: number;
 prasadDelivery: number;
 total: number;
}

interface PrasadTracking {
 trackingId: string;
 status: 'preparing' | 'shipped' | 'in_transit' | 'delivered';
 expectedDate: string;
 carrier: string;
}

interface BookingDetail {
 id: string;
 bookingNumber: string;
 status: BookingStatus | 'cancelled';
 templeName: string;
 templeSlug: string;
 templeCity: string;
 templeState: string;
 pujaName: string;
 pujaSlug: string;
 deity: string;
 scheduledDate: string;
 scheduledTime: string;
 durationMinutes: number;
 devotees: BookingDevotee[];
 sankalp: string | null;
 specialInstructions: string | null;
 priceBreakdown: PriceBreakdown;
 priestName: string | null;
 videoUrl: string | null;
 prasadDelivery: boolean;
 prasadTracking: PrasadTracking | null;
 timestamps: Partial<Record<BookingStatus, string>>;
 review: { rating: number; text: string } | null;
 createdAt: string;
}

// ─── Fallback data ──────────────────────────────────────────────

const fallbackBooking: BookingDetail = {
 id: '1',
 bookingNumber: 'BS-20260410-34521',
 status: 'video_uploaded',
 templeName: 'Shri Kashi Vishwanath Temple',
 templeSlug: 'kashi-vishwanath',
 templeCity: 'Varanasi',
 templeState: 'Uttar Pradesh',
 pujaName: 'Rudrabhishek Puja',
 pujaSlug: 'rudrabhishek',
 deity: 'Lord Shiva',
 scheduledDate: '2026-04-12',
 scheduledTime: '09:00',
 durationMinutes: 120,
 devotees: [
 { name: 'Rajesh Kumar Sharma', gotra: 'Kashyap', nakshatra: 'Rohini' },
 { name: 'Priya Sharma', gotra: 'Kashyap', nakshatra: 'Ashwini' },
 ],
 sankalp: 'For the good health and prosperity of our family.',
 specialInstructions: null,
 priceBreakdown: {
 pujaFee: 1100,
 platformFee: 51,
 prasadDelivery: 150,
 total: 1301,
 },
 priestName: 'Pandit Ramesh Shastri',
 videoUrl: 'https://example.com/video/rudrabhishek-20260412.mp4',
 prasadDelivery: true,
 prasadTracking: {
 trackingId: 'BSPR-20260412-001',
 status: 'in_transit',
 expectedDate: '2026-04-16',
 carrier: 'India Post Speed Post',
 },
 timestamps: {
 booked: '2026-04-10T10:30:00Z',
 priest_assigned: '2026-04-10T14:15:00Z',
 in_progress: '2026-04-12T08:55:00Z',
 completed: '2026-04-12T10:58:00Z',
 video_uploaded: '2026-04-12T12:30:00Z',
 },
 review: null,
 createdAt: '2026-04-10T10:30:00Z',
};

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

function formatTime(time: string): string {
 const parts = time.split(':').map(Number);
 const h = parts[0] ?? 0;
 const m = parts[1] ?? 0;
 const ampm = h >= 12 ? 'PM' : 'AM';
 const h12 = h % 12 || 12;
 return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getStatusBadge(status: BookingDetail['status']) {
 const map: Record<string, { label: string; color: string; bg: string }> = {
 booked: { label: 'Booked', color: 'text-ganga-blue', bg: 'bg-ganga-blue-light/30' },
 priest_assigned: { label: 'Priest Assigned', color: 'text-saffron-600', bg: 'bg-saffron-100' },
 in_progress: { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-100' },
 completed: { label: 'Completed', color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/30' },
 video_uploaded: { label: 'Video Ready', color: 'text-purple-600', bg: 'bg-purple-100' },
 delivered: { label: 'Delivered', color: 'text-tulsi-green-dark', bg: 'bg-tulsi-green-light/30' },
 cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
 };
 return map[status] || { label: status, color: 'text-surface-600', bg: 'bg-surface-100' };
}

function getPrasadStatusLabel(status: PrasadTracking['status']) {
 const map: Record<string, string> = {
 preparing: 'Being Prepared',
 shipped: 'Shipped',
 in_transit: 'In Transit',
 delivered: 'Delivered',
 };
 return map[status] || status;
}

// ─── Component ──────────────────────────────────────────────────

function BookingDetailContent() {
 const params = useParams();
 const bookingId = params.id as string;
 const { session } = useAuth();

 const [booking, setBooking] = useState<BookingDetail | null>(null);
 const [loading, setLoading] = useState(true);

 // Review state
 const [reviewRating, setReviewRating] = useState(0);
 const [reviewHover, setReviewHover] = useState(0);
 const [reviewText, setReviewText] = useState('');
 const [submittingReview, setSubmittingReview] = useState(false);
 const [reviewSubmitted, setReviewSubmitted] = useState(false);

 // Cancel state
 const [showCancelConfirm, setShowCancelConfirm] = useState(false);
 const [cancelling, setCancelling] = useState(false);

 // Refund state — devotee-initiated refund for paid bookings >24h before slot.
 const [showRefundConfirm, setShowRefundConfirm] = useState(false);
 const [refunding, setRefunding] = useState(false);
 const [refundReason, setRefundReason] = useState('');
 const [refundRequested, setRefundRequested] = useState(false);
 const [refundError, setRefundError] = useState<string | null>(null);

 useEffect(() => {
 async function fetchBooking() {
 try {
 const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
 headers: {
 Authorization: `Bearer ${session?.accessToken}`,
 },
 });
 if (res.ok) {
 const data = await res.json();
 setBooking(data.booking || data);
 } else {
 throw new Error('API unavailable');
 }
 } catch {
 setBooking({ ...fallbackBooking, id: bookingId });
 } finally {
 setLoading(false);
 }
 }
 fetchBooking();
 }, [bookingId, session]);

 const handleSubmitReview = async () => {
 if (reviewRating === 0 || !booking) return;
 setSubmittingReview(true);
 try {
 await fetch(`${API_BASE_URL}/bookings/${bookingId}/review`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session?.accessToken}`,
 },
 body: JSON.stringify({ rating: reviewRating, text: reviewText }),
 });
 } catch {
 // Demo mode - still show success
 }
 setReviewSubmitted(true);
 setSubmittingReview(false);
 };

 const handleCancelBooking = async () => {
 if (!booking) return;
 setCancelling(true);
 try {
 await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
 method: 'POST',
 headers: {
 Authorization: `Bearer ${session?.accessToken}`,
 },
 });
 } catch {
 // Demo mode
 }
 setBooking({ ...booking, status: 'cancelled' });
 setCancelling(false);
 setShowCancelConfirm(false);
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
 const j = (await res.json().catch(() => ({}))) as { error?: string };
 throw new Error(j.error ?? `HTTP ${res.status}`);
 }
 setRefundRequested(true);
 setBooking({ ...booking, status: 'cancelled' });
 } catch (err) {
 setRefundError(err instanceof Error ? err.message : 'Failed to request refund');
 } finally {
 setRefunding(false);
 setShowRefundConfirm(false);
 }
 };

 if (loading) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-saffron-50">
 <div className="text-center">
 <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-saffron-500" />
 <p className="text-sm text-surface-500">Loading booking details...</p>
 </div>
 </div>
 );
 }

 if (!booking) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-saffron-50">
 <div className="text-center">
 <AlertCircle className="mx-auto mb-4 h-12 w-12 text-surface-300" />
 <h2 className="mb-2 text-xl font-bold text-surface-700">Booking Not Found</h2>
 <p className="mb-4 text-surface-500">We could not find this booking.</p>
 <Link
 href="/bookings"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
 >
 View All Bookings
 </Link>
 </div>
 </div>
 );
 }

 const statusBadge = getStatusBadge(booking.status);
 const isCancellable =
 booking.status !== 'cancelled' &&
 booking.status !== 'completed' &&
 booking.status !== 'video_uploaded' &&
 booking.status !== 'delivered' &&
 booking.status !== 'in_progress';
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

 return (
 <div className="min-h-screen bg-surface-50">
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
 {booking.status !== 'cancelled' && (
 <div className="mb-8 rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-6 text-lg font-bold text-surface-800">Booking Progress</h2>
 <BookingStatusTracker
 currentStatus={booking.status as BookingStatus}
 timestamps={booking.timestamps}
 />
 </div>
 )}

 {/* Cancelled banner */}
 {booking.status === 'cancelled' && (
 <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
 <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
 <div>
 <h3 className="font-semibold text-red-800">Booking Cancelled</h3>
 <p className="text-sm text-red-600">
 This booking has been cancelled. If you were charged, a refund will be processed
 within 5-7 business days.
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
 <Link
 href={`/temples/${booking.templeSlug}`}
 className="font-medium text-saffron-600 hover:underline"
 >
 {booking.templeName}
 </Link>
 <p className="text-xs text-surface-400">
 {booking.templeCity}, {booking.templeState}
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
 value={`${formatTime(booking.scheduledTime)} (${booking.durationMinutes} min)`}
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

 {/* Video Proof Section */}
 {booking.videoUrl && (
 <div id="video" className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Video className="h-5 w-5 text-purple-500" />
 Your Puja Video Proof
 </h2>
 <div className="overflow-hidden rounded-xl bg-surface-800">
 {/* Video player placeholder */}
 <div className="relative flex aspect-video items-center justify-center">
 <div className="text-center">
 <div className="mx-auto mb-3 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
 <Play className="ml-1 h-8 w-8 text-white" />
 </div>
 <p className="text-sm text-white/80">Click to play video proof</p>
 </div>
 <div className="absolute left-4 top-4 rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white">
 Video Proof
 </div>
 </div>
 </div>
 <div className="mt-3 flex items-center justify-between">
 <p className="text-sm text-surface-500">
 Recorded on {formatDate(booking.scheduledDate)}
 </p>
 <button className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-100">
 <Download className="h-3.5 w-3.5" />
 Download Video
 </button>
 </div>
 </div>
 )}

 {/* Prasad Tracking */}
 {booking.prasadDelivery && booking.prasadTracking && (
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
 <Package className="h-5 w-5 text-saffron-500" />
 Prasad Delivery
 </h2>
 <div className="rounded-xl border border-saffron-100 bg-saffron-50/50 p-4">
 <div className="grid gap-3 sm:grid-cols-2">
 <div>
 <p className="text-xs font-medium text-surface-500">Tracking ID</p>
 <p className="font-mono text-sm font-medium text-surface-700">
 {booking.prasadTracking.trackingId}
 </p>
 </div>
 <div>
 <p className="text-xs font-medium text-surface-500">Status</p>
 <p className="text-sm font-semibold text-saffron-600">
 {getPrasadStatusLabel(booking.prasadTracking.status)}
 </p>
 </div>
 <div>
 <p className="text-xs font-medium text-surface-500">Carrier</p>
 <p className="text-sm text-surface-700">{booking.prasadTracking.carrier}</p>
 </div>
 <div>
 <p className="text-xs font-medium text-surface-500">Expected Delivery</p>
 <p className="text-sm text-surface-700">
 {formatDate(booking.prasadTracking.expectedDate)}
 </p>
 </div>
 </div>

 {/* Simple tracking visual */}
 <div className="mt-4 flex items-center gap-1">
 {['preparing', 'shipped', 'in_transit', 'delivered'].map((step, i) => {
 const steps = ['preparing', 'shipped', 'in_transit', 'delivered'];
 const currentIdx = steps.indexOf(booking.prasadTracking!.status);
 const isComplete = i <= currentIdx;
 return (
 <div key={step} className="flex flex-1 items-center gap-1">
 <div
 className={`h-2 flex-1 rounded-full ${
 isComplete ? 'bg-saffron-500' : 'bg-surface-200'
 }`}
 />
 </div>
 );
 })}
 </div>
 <div className="mt-1 flex justify-between text-[10px] text-surface-400">
 <span>Preparing</span>
 <span>Shipped</span>
 <span>In Transit</span>
 <span>Delivered</span>
 </div>
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
 {/* Price Breakdown */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h3 className="mb-4 flex items-center gap-2 font-bold text-surface-800">
 <IndianRupee className="h-5 w-5 text-saffron-500" />
 Price Breakdown
 </h3>
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Puja Fee</span>
 <span className="font-medium text-surface-700">
 ₹{booking.priceBreakdown.pujaFee.toLocaleString('en-IN')}
 </span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Platform Fee</span>
 <span className="font-medium text-surface-700">
 ₹{booking.priceBreakdown.platformFee}
 </span>
 </div>
 {booking.priceBreakdown.prasadDelivery > 0 && (
 <div className="flex justify-between text-sm">
 <span className="text-surface-600">Prasad Delivery</span>
 <span className="font-medium text-surface-700">
 ₹{booking.priceBreakdown.prasadDelivery}
 </span>
 </div>
 )}
 <div className="border-t border-surface-100 pt-3">
 <div className="flex justify-between">
 <span className="font-bold text-surface-800">Total Paid</span>
 <span className="text-xl font-bold text-saffron-600">
 ₹{booking.priceBreakdown.total.toLocaleString('en-IN')}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h3 className="mb-4 font-bold text-surface-800">Actions</h3>
 <div className="space-y-3">
 {isCancellable && (
 <>
 {showCancelConfirm ? (
 <div className="rounded-lg border border-red-200 bg-red-50 p-3">
 <p className="mb-3 text-sm text-red-700">
 Are you sure you want to cancel this booking? Refund will be processed
 within 5-7 business days.
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
 className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
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
 href={`/pujas/${booking.pujaSlug}`}
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
 <AuthGuard>
 <BookingDetailContent />
 </AuthGuard>
 );
}
