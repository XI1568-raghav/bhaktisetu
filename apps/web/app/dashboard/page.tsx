'use client';

import { useEffect, useState, useCallback } from 'react';
import {
 Flame,
 Calendar,
 BookOpen,
 Crown,
 Video,
 Star,
 ArrowRight,
 Clock,
 MapPin,
 Sun,
 Moon,
 Sunrise,
 ChevronRight,
 User,
 Settings,
 LogOut,
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import PujaRecommendationWidget from '../../components/PujaRecommendationWidget';
import DevoteeTodaySection from '../../components/dashboard/DevoteeTodaySection';
import { useAuth } from '../../lib/auth-context';
import { PendingBookingActions } from '../../components/bookings/PendingBookingActions';
import {
 API_BASE_URL,
 DATA_FETCH_TIMEOUT_MS,
 fetchWithTimeout,
 loadErrorMessage,
 // AUTH-06: true ONLY for 401. A 403 is a suspended account, and offering
 // sign-in there loops back to the same refusal.
 loadErrorIsReauth,
} from '../../lib/api-config';
import { H1 } from '../../components/ui/heading-recipe';
import { buttonClass } from '../../components/ui/button-recipe';
import ReauthPrompt from '../../components/ReauthPrompt';

interface Booking {
 id: string;
 bookingNumber: string;
 status: string;
 scheduledDate: string;
 scheduledTimeSlot: string;
 priceAmount: string;
 temple: { name: string; city: string; slug: string };
 pujaType: { name: string; category: string };
 priest: { displayName: string } | null;
}

interface SubscriptionInfo {
 plan: string;
 status: string;
 currentPeriodEnd: string;
}

const statusColors: Record<string, string> = {
 pending_payment: 'bg-yellow-100 text-yellow-800',
 confirmed: 'bg-blue-100 text-blue-800',
 priest_assigned: 'bg-indigo-100 text-indigo-800',
 in_progress: 'bg-saffron-100 text-saffron-800',
 completed: 'bg-green-100 text-green-800',
 video_uploaded: 'bg-teal-100 text-teal-800',
 delivered: 'bg-emerald-100 text-emerald-800',
 cancelled: 'bg-red-100 text-red-800',
 refunded: 'bg-surface-100 text-surface-600',
};

const statusLabels: Record<string, string> = {
 pending_payment: 'Pending Payment',
 confirmed: 'Confirmed',
 priest_assigned: 'Priest Assigned',
 in_progress: 'In Progress',
 completed: 'Completed',
 video_uploaded: 'Video Uploaded',
 delivered: 'Delivered',
 cancelled: 'Cancelled',
 refunded: 'Refunded',
};

function DashboardContent() {
 const { user, session } = useAuth();
 const [bookings, setBookings] = useState<Booking[]>([]);
 const [bookingsCount, setBookingsCount] = useState(0);
 const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
 const [isLoadingData, setIsLoadingData] = useState(true);
 // RES-02 (2026-08-12): with /users/me/bookings returning 500 this page showed
 // "Total Bookings 0" and "No Bookings Yet — begin your spiritual journey" to a
 // devotee who already had confirmed pujas, with no error anywhere. Telling
 // someone their bookings do not exist is worse than telling them we are down.
 const [loadError, setLoadError] = useState<string | null>(null);
 // AUTH-06: the decision `loadErrorMessage` makes internally and this page
 // threw away. A devotee whose session expired mid-session was told to sign in
 // again beside a Retry that could only 401 forever.
 const [loadReauth, setLoadReauth] = useState(false);

 const fetchDashboardData = useCallback(async () => {
 if (!session?.accessToken) return;

 setLoadError(null);
 try {
 const headers = { Authorization: `Bearer ${session.accessToken}` };

 // RES-01: bare fetch has no timeout — held open, /dashboard sat on
 // "Loading bookings..." at T+10s and at T+30s with no way to recover.
 const [bookingsRes, subscriptionRes] = await Promise.all([
 fetchWithTimeout(`${API_BASE_URL}/users/me/bookings?limit=5`, { headers }, DATA_FETCH_TIMEOUT_MS),
 fetchWithTimeout(`${API_BASE_URL}/users/me/subscription`, { headers }, DATA_FETCH_TIMEOUT_MS),
 ]);

 if (bookingsRes.ok) {
 const bookingsData = await bookingsRes.json();
 setBookings(bookingsData.bookings || []);
 setBookingsCount(bookingsData.pagination?.total || 0);
 } else {
 setLoadError(loadErrorMessage(bookingsRes));
 setLoadReauth(loadErrorIsReauth(bookingsRes));
 }

 if (subscriptionRes.ok) {
 const subData = await subscriptionRes.json();
 setSubscription(subData.subscription || null);
 }
 } catch (err) {
 setLoadError(loadErrorMessage(err));
 setLoadReauth(loadErrorIsReauth(err));
 } finally {
 setIsLoadingData(false);
 }
 }, [session?.accessToken]);

 useEffect(() => {
 fetchDashboardData();
 }, [fetchDashboardData]);

 const greeting = (() => {
 const hour = new Date().getHours();
 if (hour < 12) return 'Good Morning';
 if (hour < 17) return 'Good Afternoon';
 return 'Good Evening';
 })();

 const displayName = user?.fullName || 'Devotee';

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* Top header bar */}
 <div className="bg-[#ede9e3]">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-surface-500 text-sm mb-1">{greeting}</p>
 <h1 className={H1.portal}>
 {displayName === '' ? 'Welcome to Darshya' : displayName}
 </h1>
 {user?.fullName === '' && (
 <a
 href="/profile"
 className="inline-flex items-center gap-1 text-sm text-saffron-600 hover:text-saffron-700 mt-1 transition-colors"
 >
 Complete your profile <ArrowRight className="w-3.5 h-3.5" />
 </a>
 )}
 </div>

 <div className="flex items-center gap-2">
 <a
 href="/profile"
 className="p-2.5 bg-surface-800/10 hover:bg-surface-800/20 rounded-lg transition-colors"
 title="Edit Profile"
 >
 <Settings className="w-5 h-5 text-surface-600" />
 </a>
 {/* AUTH-09: this was `onClick={signOut}`, which sends the DEFAULT scope —
     global. POST /auth/logout burns every refresh_token_jtis row the account
     holds, so pressing this on a shared machine also ended the session on the
     user's phone, and nothing on this screen or the one it landed on said so.

     /auth/logout runs the identical global sign-out and puts "this signs you
     out on all your devices" on screen while it happens. Same fix already
     applied to components/NavAuthButton.tsx. A user who wants the narrow
     scope has the choice on /profile → Security. */}
 <a
 href="/auth/logout"
 className="p-2.5 bg-surface-800/10 hover:bg-surface-800/20 rounded-lg transition-colors"
 title="Sign Out"
 >
 <LogOut className="w-5 h-5 text-surface-600" />
 </a>
 </div>
 </div>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Quick Stats Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 -mt-12">
 {/* Bookings count */}
 <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-warm-sm">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-saffron-50 rounded-xl flex items-center justify-center">
 <BookOpen className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <p className="text-sm text-surface-500">Total Bookings</p>
 <p className="text-lg font-semibold text-surface-800">
 {isLoadingData ? '...' : loadError ? '—' : bookingsCount}
 </p>
 </div>
 </div>
 </div>

 {/* Subscription status */}
 <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-warm-sm">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-temple-gold/10 rounded-xl flex items-center justify-center">
 <Crown className="w-5 h-5 text-temple-gold" />
 </div>
 <div>
 <p className="text-sm text-surface-500">Subscription</p>
 <p className="text-lg font-semibold text-surface-800">
 {isLoadingData
 ? '...'
 : subscription
 ? subscription.plan.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
 : 'Free Tier'}
 </p>
 </div>
 </div>
 </div>

 {/* Quick action */}
 <a
 href="/pujas"
 className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-warm-sm hover:shadow-warm hover:border-saffron-200 transition-all group"
 >
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-sacred-red/10 rounded-xl flex items-center justify-center">
 <Flame className="w-5 h-5 text-sacred-red" />
 </div>
 <div className="flex-1">
 <p className="text-sm text-surface-500">Quick Action</p>
 <p className="text-lg font-semibold text-surface-800 group-hover:text-saffron-600 transition-colors">
 Book a Puja
 </p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 group-hover:text-saffron-500 transition-colors" />
 </div>
 </a>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* ─── Recent Bookings ─── */}
 <div className="lg:col-span-2">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-surface-800">Recent Bookings</h2>
 {bookingsCount > 5 && (
 // S2C-10 (2026-08-11): /dashboard/bookings has never existed (app/dashboard
 // holds only page.tsx), so this "View All" 404'd for exactly the repeat
 // devotees with more than 5 bookings. The real route is top-level /bookings.
 <a
 href="/bookings"
 className="text-sm text-saffron-600 font-semibold hover:text-saffron-700 flex items-center gap-1"
 >
 View All <ChevronRight className="w-4 h-4" />
 </a>
 )}
 </div>

 {isLoadingData ? (
 <div className="bg-[var(--color-surface)] rounded-xl p-8 border border-[var(--color-border)] text-center">
 <div className="w-8 h-8 border-3 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-3" />
 <p className="text-surface-400 text-sm">Loading bookings...</p>
 </div>
 ) : loadError ? (
 /* Never the "No Bookings Yet" empty state for a list we failed to read —
    that reads as "your bookings were cancelled". */
 <div role="alert" className="bg-amber-50 rounded-xl p-6 border border-amber-200 text-center">
 <p className="text-sm text-amber-800">{loadError}</p>
 {/*
   AUTH-06: the sign-in link REPLACES Retry — it does not join it. Leaving
   Retry beside it keeps the one control that cannot work (it re-fires with
   the same expired token) as the bigger, more familiar target.
 */}
 {loadReauth ? (
 <ReauthPrompt message="" className="mt-3 flex flex-col items-center gap-3" />
 ) : (
 <button
 type="button"
 onClick={() => { setIsLoadingData(true); void fetchDashboardData(); }}
 className={buttonClass('primary', 'md', 'mt-3')}
 >
 Retry
 </button>
 )}
 </div>
 ) : bookings.length === 0 ? (
 <div className="bg-[var(--color-surface)] rounded-xl p-8 border border-[var(--color-border)] text-center">
 <div className="w-14 h-14 bg-saffron-50 rounded-full flex items-center justify-center mx-auto mb-4">
 <Flame className="w-7 h-7 text-saffron-300" />
 </div>
 <h3 className="font-semibold text-surface-800 mb-1">No Bookings Yet</h3>
 <p className="text-sm text-surface-500 mb-4">
 Begin your spiritual journey by booking your first puja.
 </p>
 <a
 href="/pujas"
 className={buttonClass('primary', 'md')}
 >
 <Flame className="w-4 h-4" />
 Explore Pujas
 </a>
 </div>
 ) : (
 <div className="space-y-3">
 {bookings.map((booking) => (
 <div
 key={booking.id}
 className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] hover:shadow-warm transition-shadow"
 >
 <div className="flex items-start justify-between gap-3 mb-3">
 <div>
 <h3 className="font-semibold text-surface-800">{booking.pujaType.name}</h3>
 <p className="text-sm text-surface-500 flex items-center gap-1 mt-0.5">
 <MapPin className="w-3.5 h-3.5" />
 {booking.temple.name}, {booking.temple.city}
 </p>
 </div>
 <span
 className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status] || 'bg-surface-100 text-surface-600'}`}
 >
 {statusLabels[booking.status] || booking.status}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm text-surface-500">
 <span className="flex items-center gap-1">
 <Calendar className="w-3.5 h-3.5" />
 {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 })}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3.5 h-3.5" />
 {booking.scheduledTimeSlot}
 </span>
 <span className="font-semibold text-surface-700">
 Rs. {Number(booking.priceAmount).toLocaleString('en-IN')}
 </span>
 </div>
 {booking.priest && (
 <p className="text-xs text-surface-400 mt-2">
 Pandit: {booking.priest.displayName}
 </p>
 )}
 <p className="text-xs text-surface-400 mt-1">#{booking.bookingNumber}</p>
 <PendingBookingActions bookingId={booking.id} status={booking.status} />
 </div>
 ))}
 </div>
 )}
 </div>

 {/* ─── Right Sidebar ─── */}
 <div className="space-y-6">
 {/* AI Puja Recommendations */}
 <PujaRecommendationWidget />

 {/* Quick Links */}
 <div>
 <h2 className="text-lg font-semibold text-surface-800 mb-4">Quick Links</h2>
 <div className="grid grid-cols-2 gap-3">
 <a
 href="/darshan"
 className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] hover:shadow-warm hover:border-saffron-200 transition-all text-center group"
 >
 <Video className="w-6 h-6 text-red-500 mx-auto mb-2" />
 <span className="text-xs font-semibold text-surface-700 group-hover:text-saffron-600">
 Live Darshan
 </span>
 </a>
 <a
 href="/panchang"
 className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] hover:shadow-warm hover:border-saffron-200 transition-all text-center group"
 >
 <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
 <span className="text-xs font-semibold text-surface-700 group-hover:text-saffron-600">
 Panchang
 </span>
 </a>
 <a
 href="/content"
 className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] hover:shadow-warm hover:border-saffron-200 transition-all text-center group"
 >
 <BookOpen className="w-6 h-6 text-saffron-500 mx-auto mb-2" />
 <span className="text-xs font-semibold text-surface-700 group-hover:text-saffron-600">
 Content
 </span>
 </a>
 <a
 href="/store"
 className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] hover:shadow-warm hover:border-saffron-200 transition-all text-center group"
 >
 <Star className="w-6 h-6 text-temple-gold mx-auto mb-2" />
 <span className="text-xs font-semibold text-surface-700 group-hover:text-saffron-600">
 Store
 </span>
 </a>
 </div>
 </div>

 {/* Upgrade CTA (only for free tier) */}
 {!subscription && (
 <div className="bg-saffron-600 rounded-xl p-5 text-white relative overflow-hidden">
 <div className="absolute inset-0 bg-[url('/images/pattern-mandala.svg')] opacity-10 bg-center bg-cover" />
 <div className="relative">
 <Crown className="w-8 h-8 text-sandal-cream mb-3" />
 <h3 className="font-semibold text-lg mb-1">Upgrade to Bhakti Pass</h3>
 <p className="text-saffron-100 text-sm mb-4">
 Get ad-free darshan, premium content, and discounts on pujas.
 </p>
 <a
 href="/pricing"
 className="inline-flex items-center gap-2 bg-white text-saffron-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-saffron-50 transition-colors"
 >
 View Plans <ArrowRight className="w-4 h-4" />
 </a>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* ─── Devotee Activity Sections ───
     Revamp 2026-08-05: the four hardcoded mock widgets (Darshan History,
     Saved Temples, Chat History, Store Orders) are replaced by the live
     DevoteeTodaySection — Today's Panchang, rashi Horoscope, Continue Reading
     (real reading progress) and real Store Orders. No fake data. */}
 <DevoteeTodaySection />
 </div>
 </div>
 );
}

export default function DashboardPage() {
 return (
 <AuthGuard>
 <DashboardContent />
 </AuthGuard>
 );
}
