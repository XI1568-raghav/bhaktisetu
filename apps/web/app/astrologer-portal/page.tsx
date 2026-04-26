'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
 IndianRupee,
 TrendingUp,
 Star,
 Clock,
 Users,
 MessageSquare,
 ArrowRight,
 Phone,
 Video,
 Calendar,
} from 'lucide-react';

// ─── Mock Data ──────────────────────────────────────────────────

const dashboardData = {
 astrologer: {
 name: 'Acharya Vikram Shastri',
 rating: 4.9,
 ratingCount: 342,
 },
 stats: {
 consultationsToday: 6,
 totalConsultations: 1248,
 earningsToday: 4800,
 earningsThisMonth: 68500,
 totalEarnings: 524000,
 activeClients: 89,
 },
 upcomingSessions: [
 {
 id: '1',
 clientName: 'Rohit Sharma',
 type: 'Kundli Reading',
 mode: 'video',
 scheduledAt: '2026-04-16T14:00:00',
 duration: 30,
 rate: 800,
 },
 {
 id: '2',
 clientName: 'Neha Gupta',
 type: 'Marriage Compatibility',
 mode: 'call',
 scheduledAt: '2026-04-16T15:30:00',
 duration: 45,
 rate: 1200,
 },
 {
 id: '3',
 clientName: 'Suresh Pandey',
 type: 'Career Consultation',
 mode: 'chat',
 scheduledAt: '2026-04-16T17:00:00',
 duration: 20,
 rate: 500,
 },
 {
 id: '4',
 clientName: 'Anjali Mishra',
 type: 'Gemstone Recommendation',
 mode: 'video',
 scheduledAt: '2026-04-17T10:00:00',
 duration: 30,
 rate: 800,
 },
 ],
};

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

function formatTime(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getModeIcon(mode: string) {
 switch (mode) {
 case 'video': return Video;
 case 'call': return Phone;
 default: return MessageSquare;
 }
}

// ─── Component ──────────────────────────────────────────────────

export default function AstrologerDashboard() {
 const data = dashboardData;

 const earningCards = [
 {
 label: 'Today\'s Earnings',
 value: formatCurrency(data.stats.earningsToday),
 icon: IndianRupee,
 color: 'text-purple-600',
 bg: 'bg-purple-50',
 },
 {
 label: 'This Month',
 value: formatCurrency(data.stats.earningsThisMonth),
 icon: TrendingUp,
 color: 'text-saffron-600',
 bg: 'bg-saffron-50',
 },
 {
 label: 'Total Earned',
 value: formatCurrency(data.stats.totalEarnings),
 icon: IndianRupee,
 color: 'text-tulsi-green',
 bg: 'bg-tulsi-green-light/20',
 },
 ];

 const quickStats = [
 { label: 'Today\'s Sessions', value: data.stats.consultationsToday, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
 { label: 'Total Consultations', value: data.stats.totalConsultations, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
 { label: 'Active Clients', value: data.stats.activeClients, icon: Users, color: 'text-saffron-600', bg: 'bg-saffron-50' },
 { label: 'Rating', value: `${data.astrologer.rating} (${data.astrologer.ratingCount})`, icon: Star, color: 'text-temple-gold', bg: 'bg-amber-50' },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-surface-800">
 Namaste, {data.astrologer.name.split(' ')[0]}!
 </h1>
 <p className="text-surface-500 mt-1">Your astrology practice at a glance.</p>
 </div>

 {/* Earnings */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {earningCards.map((card) => {
 const Icon = card.icon;
 return (
 <div key={card.label} className="bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3 mb-3">
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 <span className="text-sm text-surface-500">{card.label}</span>
 </div>
 <p className="text-lg font-semibold text-surface-800">{card.value}</p>
 </div>
 );
 })}
 </div>

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

 <div className="divide-y divide-surface-50">
 {data.upcomingSessions.map((session) => {
 const ModeIcon = getModeIcon(session.mode);
 return (
 <div key={session.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors">
 <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
 <ModeIcon className="w-5 h-5 text-purple-500" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <h3 className="text-sm font-semibold text-surface-800 truncate">{session.clientName}</h3>
 <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize">
 {session.mode}
 </span>
 </div>
 <p className="text-xs text-surface-500">{session.type}</p>
 <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 {formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {session.duration} min
 </span>
 </div>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-bold text-surface-800">{formatCurrency(session.rate)}</p>
 <p className="text-xs text-surface-400">Rate</p>
 </div>
 </div>
 );
 })}
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
