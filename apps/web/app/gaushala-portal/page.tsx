'use client';
import MyProviderProfileCard from '../../components/MyProviderProfileCard';
import KycStatusBadge from '../../components/provider/KycStatusBadge';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
 API_BASE_URL,
 DATA_FETCH_TIMEOUT_MS,
 fetchWithTimeout,
 loadErrorMessage,
} from '../../lib/api-config';
import Link from 'next/link';
import { Beef, Heart, IndianRupee, HandHeart, Plus, Settings, Users } from 'lucide-react';
import { H1 } from '../../components/ui/heading-recipe';

import { buttonClass } from '../../components/ui/button-recipe';
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

type DashboardCow = {
 id: string;
 name: string;
 breed: string | null;
 ageYears: number | null;
 healthStatus: string;
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

const statusColor: Record<string, string> = {
 healthy: 'bg-[#e7f0e0] text-[#3f6b1f]',
 treatment: 'bg-[#fef2e8] text-[#943b19]',
 pregnant: 'bg-[var(--color-primary-highlight)] text-[var(--color-primary-active)]',
 recovering: 'bg-[var(--color-primary-highlight)] text-[var(--color-primary-active)]',
};

export default function GaushalaDashboard() {
 const { user, session } = useAuth();
 // RES-06: 'unknown' until a KYC read SUCCEEDS. Defaulting to 'unsubmitted'
 // meant any 500 told a verified manager their KYC was missing.
 const [kycState, setKycState] = useState<'verified' | 'pending' | 'unsubmitted' | 'rejected' | 'unknown'>('unknown');
 const [kycReason, setKycReason] = useState<string | null>(null);
 const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
 const [recentDonations, setRecentDonations] = useState<DashboardDonation[]>([]);
 const [recentCows, setRecentCows] = useState<DashboardCow[]>([]);
 // S-08: the API returns `profile: null` for a manager who has never set their
 // gaushala up. The dashboard used to render four zero-filled stat tiles and
 // "No donations yet" for that case — every screen a row of zeros with no hint
 // of why or what to do next. Track it so we can say so.
 const [profileMissing, setProfileMissing] = useState(false);
 // RES-02: `if (!r.ok) return;` rendered "0 Total Cows / 0 Active Donors /
 // Rs 0 Monthly Donations / No donations yet" on an HTTP 500 with no error at
 // all — a gaushala manager mid-incident was shown a dead gaushala.
 const [loadError, setLoadError] = useState<string | null>(null);

 const load = useCallback(async () => {
 // P0 #AP-07 (2026-07-10): fetch for demo sessions too (see KYC block below).
 if (!session?.accessToken) return;
 setLoadError(null);
 try {
 // RES-01: bare fetch has no timeout; a stalled socket froze this loader.
 const r = await fetchWithTimeout(`${API_BASE_URL}/gaushala-portal/dashboard`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 }, DATA_FETCH_TIMEOUT_MS);
 if (!r.ok) {
 setLoadError(loadErrorMessage(r));
 return;
 }
 const j = await r.json();
 if (j.stats) setDashStats(j.stats);
 if (Array.isArray(j.recentDonations)) setRecentDonations(j.recentDonations);
 if (Array.isArray(j.recentCows)) setRecentCows(j.recentCows);
 setProfileMissing(j.profile === null || j.profile === undefined);
 } catch (err) {
 setLoadError(loadErrorMessage(err));
 }
 }, [session?.accessToken]);

 useEffect(() => { void load(); }, [load]);

 // A figure the server never sent is an em dash, never a zero.
 const unread = !!loadError && !dashStats;
 const stats = [
 { label: 'Total Cows', value: unread ? '—' : String(dashStats?.totalCows ?? 0), change: '', Icon: Beef, iconClass: 'text-amber-600' },
 { label: 'Active Donors', value: unread ? '—' : (dashStats?.totalDonors ?? 0).toLocaleString('en-IN'), change: '', Icon: Heart, iconClass: 'text-rose-600' },
 { label: 'Monthly Donations', value: unread ? '—' : formatInr(dashStats?.monthDonationsInr ?? 0), change: '', Icon: IndianRupee, iconClass: 'text-green-600' },
 { label: 'Total Donations', value: unread ? '—' : formatInr(dashStats?.totalDonationsInr ?? 0), change: '', Icon: HandHeart, iconClass: 'text-blue-600' },
 ];

 useEffect(() => {
 // P0 #AP-07 (2026-07-10): fetch for demo sessions too. The old
 // startsWith('demo-') skip left a demo gaushala manager on hardcoded
 // zero stats + KYC 'unsubmitted', masking backend bugs during demo.
 // The API accepts demo tokens in non-prod; a non-OK / catch keeps the
 // existing fallback.
 if (!session?.accessToken) return;
 (async () => {
 try {
 const r = await fetchWithTimeout(`${API_BASE_URL}/provider-kyc`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 }, DATA_FETCH_TIMEOUT_MS);
 // RES-06: leave the badge on 'unknown' rather than accusing a verified
 // manager of missing KYC because one request failed.
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
 <h1 className={H1.portal}>Jai Gau Mata</h1>
 <div className="mt-1 flex items-center gap-3 flex-wrap">
 <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
 Welcome back, {user?.fullName}. Here&apos;s your gaushala overview.
 </p>
 <KycStatusBadge state={kycState} reason={kycReason} />
 </div>
 </div>

 {loadError && (
 <div role="alert" className="flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
 <span className="flex-1 min-w-[12rem]">{loadError}</span>
 <button type="button" onClick={() => { void load(); }} className="font-semibold underline underline-offset-2 hover:text-amber-900">
 Retry
 </button>
 </div>
 )}

 <MyProviderProfileCard role="GAUSHALA_MANAGER" onboardingSlug="gaushala_manager" publicListingType="gaushala" />

 {/* S-08: explain the zeros. Without a gaushala profile there is nothing for
     donations, cows or volunteers to attach to, so every number below is
     structurally zero rather than "no activity yet". */}
 {profileMissing && !loadError && (
 <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-border)', background: 'var(--color-primary-highlight)' }}>
 <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Finish setting up your gaushala
 </h2>
 <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
 Your gaushala profile has not been created yet, so there is nothing for cows,
 donations or volunteers to be recorded against — that is why every figure below
 reads zero. Add your gaushala details to start receiving donations.
 </p>
 <Link
 href="/gaushala-portal/profile"
 className={buttonClass('primary', 'md', 'mt-4')}
 >
 <Settings className="w-4 h-4" />
 Set up my gaushala
 </Link>
 </div>
 )}

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
 <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
 <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
 <h2 className="font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>Recent Donations</h2>
 <Link href="/gaushala-portal/donations" className="text-xs text-[var(--color-primary)] hover:underline">
 View all →
 </Link>
 </div>
 <div className="divide-y divide-[var(--color-border)]">
 {recentDonations.length === 0 ? (
 <p className="px-6 py-6 text-xs text-[var(--color-text-faint)]">{loadError ? 'Donations unavailable — retry above.' : 'No donations yet.'}</p>
 ) : recentDonations.map((d) => (
 <div key={d.id} className="px-6 py-3 flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-[var(--color-text)]">{d.donor}</p>
 <p className="text-xs text-[var(--color-text-faint)]">Gau Seva · {relativeTime(d.paidAt)}</p>
 </div>
 <span className="text-sm font-semibold text-[var(--color-primary)]">{formatInr(d.amountInr)}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Cow Registry Preview */}
 <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
 <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
 <h2 className="font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>Cow Registry</h2>
 <Link href="/gaushala-portal/cows" className="text-xs text-[var(--color-primary)] hover:underline">
 View all →
 </Link>
 </div>
 <div className="divide-y divide-[var(--color-border)]">
 {recentCows.length === 0 ? (
 <div className="px-6 py-8 text-center">
 <Beef className="w-10 h-10 text-[var(--color-text-faint)] mx-auto mb-3" />
 <p className="text-sm text-[var(--color-text-muted)]">{loadError ? 'Cows unavailable — retry above' : 'No cows registered'}</p>
 <Link href="/gaushala-portal/cows" className="text-xs text-[var(--color-primary)] hover:underline mt-1 inline-block">
 + Register your first cow
 </Link>
 </div>
 ) : recentCows.map((c) => (
 <div key={c.id} className="px-6 py-3 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Beef className="w-5 h-5 text-[var(--color-primary)]" />
 <div>
 <p className="text-sm font-medium text-[var(--color-text)]">{c.name}</p>
 <p className="text-xs text-[var(--color-text-faint)]">
 {c.breed || 'Mixed'}{c.ageYears ? ` · ${c.ageYears}y` : ''}
 </p>
 </div>
 </div>
 <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColor[c.healthStatus] ?? 'bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]'}`}>
 {c.healthStatus}
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
 { label: 'View Donations', href: '/gaushala-portal/donations', Icon: IndianRupee },
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
