'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
 Loader2,
 Inbox,
 ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import AuthGuard from '../../components/AuthGuard';

// ─── Types ──────────────────────────────────────────────────────

type BookingStatus =
 | 'booked'
 | 'priest_assigned'
 | 'in_progress'
 | 'completed'
 | 'video_uploaded'
 | 'delivered'
 | 'cancelled';

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

function getStatusConfig(status: BookingStatus) {
 const map: Record<BookingStatus, { label: string; color: string; bg: string }> = {
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

function formatDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
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

function isCompleted(booking: BookingListItem): boolean {
 return (
 booking.status === 'completed' ||
 booking.status === 'video_uploaded' ||
 booking.status === 'delivered'
 );
}

// ─── Component ──────────────────────────────────────────────────

function BookingsContent() {
 const { session } = useAuth();
 const [activeTab, setActiveTab] = useState<TabFilter>('all');

 // P1-17: replaced manual useEffect + useState(loading/error/bookings) with
 // useQuery — gives cached refetch, single loading/error state, and avoids
 // the old "setState after unmount" footgun. StaleTime 60s (QueryProvider
 // default) matches how often a devotee would realistically re-open the list.
 const { data: bookings = [], isPending: loading, error } = useQuery({
  queryKey: ['bookings', 'my', session?.accessToken],
  enabled: !!session?.accessToken,
  queryFn: async () => {
   const res = await fetch(`${API_BASE_URL}/bookings/my`, {
    headers: {
     Authorization: `Bearer ${session?.accessToken ?? ''}`,
    },
   });
   if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
   }
   const data = await res.json();
   const raw: ApiBooking[] = data.bookings ?? data.data ?? [];
   return raw.map(mapBooking);
  },
 });
 const errorText = error instanceof Error ? error.message : null;

 const filteredBookings = bookings.filter((b) => {
 switch (activeTab) {
 case 'upcoming':
 return isUpcoming(b);
 case 'completed':
 return isCompleted(b);
 case 'cancelled':
 return b.status === 'cancelled';
 default:
 return true;
 }
 });

 const tabs: { key: TabFilter; label: string; count: number }[] = [
 { key: 'all', label: 'All', count: bookings.length },
 { key: 'upcoming', label: 'Upcoming', count: bookings.filter(isUpcoming).length },
 { key: 'completed', label: 'Completed', count: bookings.filter(isCompleted).length },
 { key: 'cancelled', label: 'Cancelled', count: bookings.filter((b) => b.status === 'cancelled').length },
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
 {errorText && (
   <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
     Could not load your bookings: {errorText}
   </div>
 )}
 {/* Tabs */}
 <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-100">
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
 activeTab === tab.key
 ? 'bg-white/20 text-white'
 : 'bg-surface-100 text-surface-500'
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
 <Loader2 className="h-8 w-8 animate-spin text-saffron-500" />
 <span className="ml-3 text-surface-500">Loading your bookings...</span>
 </div>
 )}

 {/* Empty State */}
 {!loading && filteredBookings.length === 0 && (
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
 {!loading && filteredBookings.length > 0 && (
 <div className="space-y-4">
 {filteredBookings.map((booking) => {
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
 <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-surface-50 pt-4">
 <Link
 href={`/bookings/${booking.id}`}
 className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-50 px-3 py-2 text-xs font-semibold text-saffron-600 transition-colors hover:bg-saffron-100"
 >
 <Eye className="h-3.5 w-3.5" />
 View Details
 </Link>

 {booking.videoUrl && (
 <Link
 href={`/bookings/${booking.id}#video`}
 className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-100"
 >
 <Video className="h-3.5 w-3.5" />
 Watch Video
 </Link>
 )}

 {canCancel && (
 <button className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100">
 <XIcon className="h-3.5 w-3.5" />
 Cancel
 </button>
 )}
 </div>
 </div>
 );
 })}
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
