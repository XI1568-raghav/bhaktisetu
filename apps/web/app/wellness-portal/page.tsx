'use client';

import Link from 'next/link';
import {
 IndianRupee,
 TrendingUp,
 Users,
 CalendarDays,
 Clock,
 ArrowRight,
 Leaf,
 Star,
} from 'lucide-react';

// ─── Mock Data ──────────────────────────────────────────────────

const dashboardData = {
 instructor: {
 name: 'Guru Ananda Sharma',
 rating: 4.8,
 ratingCount: 218,
 },
 stats: {
 upcomingSessions: 4,
 totalSessions: 856,
 activeStudents: 67,
 totalStudents: 234,
 earningsThisMonth: 42500,
 totalEarnings: 384000,
 },
 upcomingSessions: [
 {
 id: '1',
 title: 'Morning Hatha Yoga',
 type: 'group',
 scheduledAt: '2026-04-17T06:00:00',
 duration: 60,
 enrolled: 12,
 maxCapacity: 20,
 price: 200,
 },
 {
 id: '2',
 title: 'Pranayama & Meditation',
 type: 'group',
 scheduledAt: '2026-04-17T08:00:00',
 duration: 45,
 enrolled: 8,
 maxCapacity: 15,
 price: 150,
 },
 {
 id: '3',
 title: 'Private Yoga Therapy',
 type: 'private',
 scheduledAt: '2026-04-17T10:30:00',
 duration: 90,
 enrolled: 1,
 maxCapacity: 1,
 price: 1500,
 },
 {
 id: '4',
 title: 'Evening Meditation Circle',
 type: 'group',
 scheduledAt: '2026-04-17T18:00:00',
 duration: 30,
 enrolled: 15,
 maxCapacity: 25,
 price: 100,
 },
 ],
};

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatTime(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Component ──────────────────────────────────────────────────

export default function WellnessDashboard() {
 const data = dashboardData;

 const statCards = [
 { label: 'Upcoming Sessions', value: data.stats.upcomingSessions, icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50' },
 { label: 'Active Students', value: data.stats.activeStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
 { label: 'This Month', value: formatCurrency(data.stats.earningsThisMonth), icon: TrendingUp, color: 'text-saffron-600', bg: 'bg-saffron-50' },
 { label: 'Total Earned', value: formatCurrency(data.stats.totalEarnings), icon: IndianRupee, color: 'text-tulsi-green', bg: 'bg-tulsi-green-light/20' },
 ];

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Welcome */}
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-surface-800">
 Namaste, {data.instructor.name.split(' ').pop()}!
 </h1>
 <p className="text-surface-500 mt-1">
 Your wellness practice overview.
 <span className="ml-2 inline-flex items-center gap-1 text-sm">
 <Star className="w-3.5 h-3.5 text-temple-gold fill-temple-gold" />
 {data.instructor.rating} ({data.instructor.ratingCount} reviews)
 </span>
 </p>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {statCards.map((card) => {
 const Icon = card.icon;
 return (
 <div key={card.label} className="bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3 mb-3">
 <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${card.color}`} />
 </div>
 </div>
 <p className="text-lg font-semibold text-surface-800">{card.value}</p>
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
 href="/wellness-portal/sessions"
 className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
 >
 View All <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 <div className="divide-y divide-surface-50">
 {data.upcomingSessions.map((session) => (
 <div key={session.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors">
 <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
 <Leaf className="w-5 h-5 text-emerald-500" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <h3 className="text-sm font-semibold text-surface-800 truncate">{session.title}</h3>
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
 session.type === 'private'
 ? 'bg-purple-100 text-purple-700'
 : 'bg-emerald-100 text-emerald-700'
 }`}>
 {session.type}
 </span>
 </div>
 <div className="flex items-center gap-3 text-xs text-surface-400">
 <span className="flex items-center gap-1">
 <CalendarDays className="w-3 h-3" />
 {formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {session.duration} min
 </span>
 <span className="flex items-center gap-1">
 <Users className="w-3 h-3" />
 {session.enrolled}/{session.maxCapacity}
 </span>
 </div>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-bold text-surface-800">{formatCurrency(session.price)}</p>
 <p className="text-xs text-surface-400">per person</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Link
 href="/wellness-portal/sessions"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
 <CalendarDays className="w-6 h-6 text-emerald-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">Manage Sessions</h3>
 <p className="text-sm text-surface-500">Add, edit, or schedule sessions</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>

 <Link
 href="/wellness-portal/students"
 className="flex items-center gap-4 bg-white rounded-xl border border-surface-100 p-5 hover:shadow-md transition-shadow group"
 >
 <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
 <Users className="w-6 h-6 text-blue-600" />
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">View Students</h3>
 <p className="text-sm text-surface-500">See enrolled students and attendance</p>
 </div>
 <ArrowRight className="w-5 h-5 text-surface-300 ml-auto" />
 </Link>
 </div>
 </div>
 );
}
