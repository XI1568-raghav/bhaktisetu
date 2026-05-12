'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';
import KycStatusBadge from '../../components/provider/KycStatusBadge';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import Link from 'next/link';
import { Beef, Heart, IndianRupee, HandHeart, Plus, Settings, Users } from 'lucide-react';

type DashboardStats = {
 totalCows: number;
 totalDonors: number;
 totalDonationsInr: number;
 monthDonationsInr: number;
};

type DashboardDonation = {
 id: string;
 donor: string;
 amountInr: number;
 paidAt: string | null;
};

function formatInr(n: number): string {
 if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
 if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
 return `₹${n.toLocaleString('en-IN')}`;
}

function relativeTime(iso: string | null): string {
 if (!iso) return '';
 const ms = Date.now() - new Date(iso).getTime();
 const h = Math.floor(ms / 3_600_000);
 if (h < 1) return 'just now';
 if (h < 24) return `${h}h ago`;
 const d = Math.floor(h / 24);
 return `${d}d ago`;
}

const cowHighlights = [
 { id: 'GS-001', name: 'Kamdhenu', breed: 'Gir', status: 'Healthy', age: '4y' },
 { id: 'GS-002', name: 'Nandini', breed: 'Sahiwal', status: 'Treatment', age: '6y' },
 { id: 'GS-003', name: 'Surabhi', breed: 'Tharparkar', status: 'Healthy', age: '3y' },
 { id: 'GS-004', name: 'Ganga', breed: 'Gir', status: 'Pregnant', age: '5y' },
];

const statusColor: Record<string, string> = {
 Healthy: 'bg-green-100 text-green-700',
 Treatment: 'bg-red-100 text-red-700',
 Pregnant: 'bg-purple-100 text-purple-700',
};

export default function GaushalaDashboard() {
 const { user, session } = useAuth();
 const [kycState, setKycState] = useState<'verified' | 'pending' | 'unsubmitted' | 'rejected'>('unsubmitted');
 const [kycReason, setKycReason] = useState<string | null>(null);
 const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
 const [recentDonations, setRecentDonations] = useState<DashboardDonation[]>([]);

 useEffect(() => {
 if (!session?.accessToken || session.accessToken.startsWith('demo-')) return;
 (async () => {
 try {
 const r = await fetch(`${API_BASE_URL}/gaushala-portal/dashboard`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 });
 if (!r.ok) return;
 const j = await r.json();
 if (j.stats) setDashStats(j.stats);
 if (Array.isArray(j.recentDonations)) setRecentDonations(j.recentDonations);
 } catch {
 // graceful — leave defaults
 }
 })();
 }, [session]);

 const stats = [
 { label: 'Total Cows', value: String(dashStats?.totalCows ?? 0), change: '', Icon: Beef, iconClass: 'text-amber-600' },
 { label: 'Active Donors', value: (dashStats?.totalDonors ?? 0).toLocaleString('en-IN'), change: '', Icon: Heart, iconClass: 'text-rose-600' },
 { label: 'Monthly Donations', value: formatInr(dashStats?.monthDonationsInr ?? 0), change: '', Icon: IndianRupee, iconClass: 'text-green-600' },
 { label: 'Total Donations', value: formatInr(dashStats?.totalDonationsInr ?? 0), change: '', Icon: HandHeart, iconClass: 'text-blue-600' },
 ];

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

 return (
 <div className="p-6 lg:p-8 space-y-8">
 {/* Header */}
 <div>
 <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>Jai Gau Mata</h1>
 <div className="mt-1 flex items-center gap-3 flex-wrap">
 <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
 Welcome back, {user?.fullName}. Here&apos;s your gaushala overview.
 </p>
 <KycStatusBadge state={kycState} reason={kycReason} />
 </div>
 </div>

 <MyProviderProfileCard role="GAUSHALA_MANAGER" onboardingSlug="gaushala_manager" publicListingType="gaushala" />

 {/* Stats */}
 <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
 {stats.map((s) => (
 <div key={s.label} className="rounded-xl p-5 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
 <div className="flex items-start justify-between mb-3">
 <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.iconClass}`} style={{ background: 'var(--color-primary-highlight)' }}>
 <s.Icon className="w-4.5 h-4.5" />
 </div>
 <span className="text-xs px-2 py-1 rounded-full" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-offset)' }}>
 {s.change}
 </span>
 </div>
 <p className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{s.value}</p>
 <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
 </div>
 ))}
 </div>

 {/* Two-column */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Recent Donations */}
 <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
 <div className="px-6 py-4 border-b border-amber-50 flex items-center justify-between">
 <h2 className="font-semibold text-amber-900">Recent Donations</h2>
 <Link href="/gaushala-portal/donations" className="text-xs text-amber-600 hover:underline">
 View all →
 </Link>
 </div>
 <div className="divide-y divide-amber-50">
 {recentDonations.length === 0 ? (
 <p className="px-6 py-6 text-xs text-gray-400">No donations yet.</p>
 ) : recentDonations.map((d) => (
 <div key={d.id} className="px-6 py-3 flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-800">{d.donor}</p>
 <p className="text-xs text-gray-400">Gau Seva · {relativeTime(d.paidAt)}</p>
 </div>
 <span className="text-sm font-semibold text-amber-700">{formatInr(d.amountInr)}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Cow Registry Preview */}
 <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
 <div className="px-6 py-4 border-b border-amber-50 flex items-center justify-between">
 <h2 className="font-semibold text-amber-900">Cow Registry</h2>
 <Link href="/gaushala-portal/cows" className="text-xs text-amber-600 hover:underline">
 View all →
 </Link>
 </div>
 <div className="divide-y divide-amber-50">
 {cowHighlights.map((c) => (
 <div key={c.id} className="px-6 py-3 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="text-xl"></span>
 <div>
 <p className="text-sm font-medium text-gray-800">{c.name}</p>
 <p className="text-xs text-gray-400">{c.breed} · {c.age} · #{c.id}</p>
 </div>
 </div>
 <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
 {c.status}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="rounded-xl p-6 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
 <h2 className="font-semibold mb-4 text-sm" style={{ color: 'var(--color-text)' }}>Quick Actions</h2>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {[
 { label: 'Record Donation', href: '/gaushala-portal/donations', Icon: IndianRupee },
 { label: 'Add New Cow', href: '/gaushala-portal/cows', Icon: Plus },
 { label: 'Manage Volunteers', href: '/gaushala-portal/volunteers', Icon: Users },
 { label: 'Update Profile', href: '/gaushala-portal/profile', Icon: Settings },
 ].map((a) => (
 <Link
 key={a.label}
 href={a.href}
 className="flex flex-col items-center gap-2 p-4 rounded-lg text-center transition-colors border"
 style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
 >
 <a.Icon className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
 <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{a.label}</span>
 </Link>
 ))}
 </div>
 </div>
 </div>
 );
}
