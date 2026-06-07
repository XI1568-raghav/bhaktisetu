'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';
import EarningsCard from '../../components/provider/EarningsCard';
import KycStatusBadge from '../../components/provider/KycStatusBadge';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
 Star,
 Clock,
 Users,
 MessageSquare,
 ArrowRight,
 Calendar,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';

// ─── Zero-state defaults ────────────────────────────────────────

const ZERO_STATS = {
 consultationsToday: 0,
 totalConsultations: 0,
 earningsToday: 0,
 earningsThisMonth: 0,
 totalEarnings: 0,
 activeClients: 0,
};

// ─── Component ──────────────────────────────────────────────────

type ApiAstroDashboard = {
 profile: { fullName?: string | null; rating?: number | null; ratingCount?: number | null } | null;
 stats: {
  totalConsultations: number;
  rating: number;
  pricePerMinute: number;
  approved: boolean;
  consultationsToday: number;
  earningsTodayInr: number;
  earningsMonthInr: number;
  totalEarningsInr: number;
  activeClients: number;
 };
 upcomingSessions: unknown[];
};

export default function AstrologerDashboard() {
 const { session, user } = useAuth();
 const displayName = user?.fullName || 'Astrologer';
 const [kycState, setKycState] = useState<'verified' | 'pending' | 'unsubmitted' | 'rejected'>('unsubmitted');
 const [kycReason, setKycReason] = useState<string | null>(null);
 const [api, setApi] = useState<ApiAstroDashboard | null>(null);

 useEffect(() => {
  if (!session?.accessToken || session.accessToken.startsWith('demo-')) return;
  (async () => {
   try {
    const r = await fetch(`${API_BASE_URL}/astrologer-portal/dashboard`, {
     headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!r.ok) return;
    const j = (await r.json()) as ApiAstroDashboard;
    setApi(j);
   } catch {
    // graceful — keep mock
   }
  })();
 }, [session]);

 useEffect(() => {
 if (!session?.accessToken || session.accessToken.startsWith('demo-')) return;
 (async () => {
 try {
 const r = await fetch(`${API_BASE_URL}/provider-kyc`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 });
 if (!r.ok) return;
 const j = await r.json();
 if (!j.kyc) setKycState('unsubmitted');
 else if (j.kyc.verified) setKycState('verified');
 else if (j.kyc.rejectionReason) {
 setKycState('rejected');
 setKycReason(j.kyc.rejectionReason);
 } else setKycState('pending');
 } catch {
 // graceful fallback
 }
 })();
 }, [session]);

 const liveStats = api?.stats;
 const quickStats = liveStats
  ? [
   { label: 'Today\'s Sessions', value: liveStats.consultationsToday, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
   { label: 'Total Consultations', value: liveStats.totalConsultations, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
   { label: 'Active Clients', value: liveStats.activeClients, icon: Users, color: 'text-saffron-600', bg: 'bg-saffron-50' },
   { label: 'Rating', value: liveStats.rating ? liveStats.rating.toFixed(1) : '—', icon: Star, color: 'text-temple-gold', bg: 'bg-amber-50' },
  ]
  : [
   { label: 'Today\'s Sessions', value: ZERO_STATS.consultationsToday, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
   { label: 'Total Consultations', value: ZERO_STATS.totalConsultations, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
   { label: 'Active Clients', value: ZERO_STATS.activeClients, icon: Users, color: 'text-saffron-600', bg: 'bg-saffron-50' },
   { label: 'Rating', value: '—', icon: Star, color: 'text-temple-gold', bg: 'bg-amber-50' },
  ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-surface-800">
 Namaste, {displayName.split(' ')[0]}!
 </h1>
 <div className="mt-1 flex items-center gap-3 flex-wrap">
 <p className="text-surface-500">Your astrology practice at a glance.</p>
 <KycStatusBadge state={kycState} reason={kycReason} />
 </div>
 </div>

 <MyProviderProfileCard role="ASTROLOGER" onboardingSlug="astrologer" publicListingType="astrologer" />

 <EarningsCard
 totalPaid={liveStats?.totalEarningsInr ?? ZERO_STATS.totalEarnings}
 thisMonth={liveStats?.earningsMonthInr ?? ZERO_STATS.earningsThisMonth}
 pending={null}
 />

 {/* Quick Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {quickStats.map((card) => {
 const Icon = card.icon;
 return (
 <div key={card.label} className="bg-white rounded-xl border border-surface-100 p-4 text-center">
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 <p className="text-xl font-bold text-surface-800">{card.value}</p>
 <p className="text-xs text-surface-500 mt-0.5">{card.label}</p>
 </div>
 );
 })}
 </div>

 {/* Upcoming Sessions */}
 <div className="bg-white rounded-xl border border-surface-100">
 <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
 <h2 className="font-semibold text-surface-800">Upcoming Sessions</h2>
 <Link
 href="/astrologer-portal/consultations"
 className="text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
 >
 View All <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 <div className="px-5 py-8 text-center">
 <Calendar className="w-10 h-10 text-surface-300 mx-auto mb-3" />
 <p className="text-sm text-surface-500">No upcoming sessions</p>
 <p className="text-xs text-surface-400 mt-1">Bookings will appear here once devotees consult you.</p>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Link
 href="/astrologer-portal/availability"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
 <Clock className="w-6 h-6 text-purple-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Set Availability</h3>
 <p className="text-sm text-surface-500">Update your available time slots</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>

 <Link
 href="/astrologer-portal/profile"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center group-hover:bg-saffron-100 transition-colors">
 <Users className="w-6 h-6 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Edit Profile</h3>
 <p className="text-sm text-surface-500">Update your specialties and pricing</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>
 </div>
 </div>
 );
}
