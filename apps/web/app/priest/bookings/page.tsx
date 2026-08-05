'use client';

import { useState, useEffect, Suspense } from 'react';
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

// ─── Fallback Data ──────────────────────────────────────────────

// Fallback removed - show empty state instead of fakes.
const fallbackBookings: BookingItem[] = [];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(time: string): string {
 const parts = time.split(':').map(Number);
 const h = parts[0] ?? 0;
 const m = parts[1] ?? 0;
 return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
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
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
 const [actionLoading, setActionLoading] = useState<string | null>(null);

 useEffect(() => {
  const qs = activeTab === 'all' ? '' : `?status=${activeTab}`;
  router.replace(`${pathname}${qs}`, { scroll: false });
 }, [activeTab, pathname, router]);

 useEffect(() => {
 async function fetchBookings() {
 try {
 const res = await fetch(`${API_BASE_URL}/priest/bookings`, {
 headers: { Authorization: `Bearer ${session?.accessToken}` },
 });
 if (res.ok) {
 const data = await res.json();
 setBookings(data.bookings || []);
 } else {
 throw new Error('API unavailable');
 }
 } catch {
 setBookings(fallbackBookings);
 } finally {
 setLoading(false);
 }
 }
 fetchBookings();
 }, [session]);

 const filteredBookings = bookings.filter((b) => {
 if (activeTab === 'all') return true;
 if (activeTab === 'completed') return ['completed', 'video_uploaded', 'delivered'].includes(b.status);
 return b.status === activeTab;
 });

 const tabs: { key: TabKey; label: string; count: number }[] = [
 { key: 'all', label: 'All', count: bookings.length },
 { key: 'confirmed', label: 'Pending', count: bookings.filter((b) => b.status === 'confirmed').length },
 { key: 'priest_assigned', label: 'Accepted', count: bookings.filter((b) => b.status === 'priest_assigned').length },
 { key: 'in_progress', label: 'In Progress', count: bookings.filter((b) => b.status === 'in_progress').length },
 { key: 'completed', label: 'Completed', count: bookings.filter((b) => ['completed', 'video_uploaded', 'delivered'].includes(b.status)).length },
 ];

 async function handleAction(bookingId: string, action: string) {
 setActionLoading(`${bookingId}-${action}`);
 try {
 const endpoint = action === 'video'
 ? `${API_BASE_URL}/priest/bookings/${bookingId}/video`
 : `${API_BASE_URL}/priest/bookings/${bookingId}/${action}`;

 const method = action === 'video' ? 'POST' : 'PATCH';

 // P0 #pp-07 (2026-07-09): prompt for the real recording URL instead of
 // posting a hardcoded placeholder. The API persists whatever is sent, so
 // the placeholder became the stored "video proof" for every booking.
 let videoUrl: string | null = null;
 if (action === 'video') {
 videoUrl = window.prompt('Paste the video recording URL for this booking:')?.trim() ?? null;
 if (!videoUrl) {
 setActionLoading(null);
 return;
 }
 // Basic URL sanity check — the API only requires a non-empty string, but a
 // missing scheme produces a useless proof link.
 try { new URL(videoUrl); } catch {
 alert('That doesn\'t look like a valid URL. Please paste a full https:// link.');
 setActionLoading(null);
 return;
 }
 }

 const res = await fetch(endpoint, {
 method,
 headers: {
 Authorization: `Bearer ${session?.accessToken}`,
 'Content-Type': 'application/json',
 },
 ...(action === 'video' ? { body: JSON.stringify({ videoUrl }) } : {}),
 });

 if (res.ok) {
 // Optimistically update the status
 const statusMap: Record<string, string> = {
 accept: 'priest_assigned',
 start: 'in_progress',
 complete: 'completed',
 video: 'video_uploaded',
 reject: 'confirmed',
 };
 setBookings((prev) =>
 prev.map((b) =>
 b.id === bookingId ? { ...b, status: statusMap[action] ?? b.status } : b
 )
 );
 }
 } catch {
 // Silent fail for MVP
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
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-saffron-600 text-white text-xs font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50"
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
 return (
 <button
 onClick={(e) => { e.preventDefault(); handleAction(booking.id, 'complete'); }}
 disabled={!!actionLoading}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-tulsi-green text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
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
 default:
 return null;
 }
 }

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold text-surface-800">My Bookings</h1>
 <p className="text-surface-500 mt-1">Manage your assigned puja bookings</p>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-100">
 {tabs.map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
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
 {tab.count}
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

 {/* Empty */}
 {!loading && filteredBookings.length === 0 && (
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
 {!loading && filteredBookings.length > 0 && (
 <div className="space-y-4">
 {filteredBookings.map((booking) => {
 const statusCfg = getStatusConfig(booking.status);
 return (
 <Link
 key={booking.id}
 href={`/priest/bookings/view?id=${booking.id}`}
 className="block bg-white rounded-xl border border-surface-100 p-5 hover:border-saffron-200 card-hover transition-all"
 >
 <div className="flex flex-col sm:flex-row sm:items-start gap-4">
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

 {/* Right side */}
 <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
 <div className="text-right">
 <p className="text-lg font-bold text-surface-800">{formatCurrency(booking.priestPayout)}</p>
 <p className="text-xs text-surface-400">Your payout</p>
 </div>
 {getActionButton(booking)}
 </div>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </div>
 );
}
