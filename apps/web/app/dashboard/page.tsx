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
  Heart,
  MessageSquare,
  ShoppingBag,
  Eye,
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import PujaRecommendationWidget from '../../components/PujaRecommendationWidget';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/supabase';

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
  const { user, session, signOut } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      const headers = { Authorization: `Bearer ${session.accessToken}` };

      const [bookingsRes, subscriptionRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/me/bookings?limit=5`, { headers }),
        fetch(`${API_BASE_URL}/users/me/subscription`, { headers }),
      ]);

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);
        setBookingsCount(bookingsData.pagination?.total || 0);
      }

      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        setSubscription(subData.subscription || null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
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
    <div className="min-h-screen bg-surface-50">
      {/* Top header bar */}
      <div className="bg-[#ede9e3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-500 text-sm mb-1">{greeting}</p>
              <h1 className="text-lg font-semibold text-surface-800">
                {displayName === '' ? 'Welcome to Poojly' : displayName}
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
              <button
                onClick={signOut}
                className="p-2.5 bg-surface-800/10 hover:bg-surface-800/20 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5 text-surface-600" />
              </button>
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
                  {isLoadingData ? '...' : bookingsCount}
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
                <a
                  href="/dashboard/bookings"
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white font-semibold rounded-lg text-sm hover:bg-saffron-700 transition-colors"
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
                    href="/subscriptions"
                    className="inline-flex items-center gap-2 bg-white text-saffron-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-saffron-50 transition-colors"
                  >
                    View Plans <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Devotee Activity Sections ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Darshan History */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-surface-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-red-500" />
                Darshan History
              </h2>
              <a href="/darshan" className="text-sm text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
                Watch Live <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-5 space-y-3">
              {[
                { temple: 'Kashi Vishwanath', city: 'Varanasi', date: 'Today, 6:15 AM', duration: '12 min' },
                { temple: 'Somnath Temple', city: 'Gujarat', date: 'Yesterday, 7:00 AM', duration: '8 min' },
                { temple: 'Tirupati Balaji', city: 'Tirumala', date: 'Apr 13, 5:30 AM', duration: '15 min' },
              ].map((item) => (
                <div key={item.temple + item.date} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{item.temple}</p>
                    <p className="text-xs text-surface-500">{item.city} &middot; {item.date}</p>
                  </div>
                  <span className="text-xs text-surface-400 shrink-0">{item.duration}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Temples */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-surface-800 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                Saved Temples
              </h2>
              <a href="/temples" className="text-sm text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
                Explore <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-5 space-y-3">
              {[
                { name: 'Shri Kashi Vishwanath', city: 'Varanasi, UP', live: true },
                { name: 'Somnath Jyotirlinga', city: 'Veraval, Gujarat', live: true },
                { name: 'Meenakshi Amman', city: 'Madurai, TN', live: false },
                { name: 'Jagannath Temple', city: 'Puri, Odisha', live: false },
              ].map((temple) => (
                <div key={temple.name} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-saffron-50 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-saffron-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{temple.name}</p>
                    <p className="text-xs text-surface-500">{temple.city}</p>
                  </div>
                  {temple.live && (
                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium shrink-0">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat History */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-surface-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-saffron-500" />
                Chat History
              </h2>
              <a href="/ask-pandit" className="text-sm text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
                Ask Pandit <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-5 space-y-3">
              {[
                { topic: 'Best muhurat for griha pravesh?', date: 'Today', preview: 'Based on your nakshatra, the best dates are...' },
                { topic: 'Which puja for job promotion?', date: 'Apr 14', preview: 'I recommend Baglamukhi puja or...' },
                { topic: 'Significance of Akshaya Tritiya', date: 'Apr 10', preview: 'Akshaya Tritiya is considered one of the most...' },
              ].map((chat) => (
                <div key={chat.topic} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-saffron-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-saffron-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-surface-800 truncate">{chat.topic}</p>
                      <span className="text-xs text-surface-400 shrink-0">{chat.date}</span>
                    </div>
                    <p className="text-xs text-surface-500 truncate mt-0.5">{chat.preview}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order History (Store) */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-surface-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-500" />
                Store Orders
              </h2>
              <a href="/store" className="text-sm text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
                Shop <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-5 space-y-3">
              {[
                { item: 'Brass Diya Set + Agarbatti', status: 'Delivered', date: 'Apr 12', amount: 'Rs. 850' },
                { item: 'Rudraksha Mala (5 mukhi)', status: 'In Transit', date: 'Apr 14', amount: 'Rs. 1,200' },
                { item: 'Puja Thali Complete Set', status: 'Delivered', date: 'Mar 28', amount: 'Rs. 2,500' },
              ].map((order) => (
                <div key={order.item + order.date} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{order.item}</p>
                    <p className="text-xs text-surface-500">{order.date} &middot; {order.amount}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
