'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
 ChevronLeft,
 Calendar,
 MapPin,
 Users,
 Mountain,
 CheckCircle2,
 Clock,
 Heart,
 ArrowRight,
 XCircle,
} from 'lucide-react';
import { formatINR, getYatraBySlug } from '../../../lib/yatra-data';

interface StoredBooking {
 bookingNumber: string;
 yatraSlug: string;
 yatraTitle: string;
 startDate: string;
 travelers: number;
 packageTier: 'economy' | 'standard' | 'premium';
 total: number;
 status: 'confirmed' | 'completed' | 'cancelled';
 createdAt: string;
}

export default function YatraBookingsPage() {
 const [bookings, setBookings] = useState<StoredBooking[]>([]);
 const [loaded, setLoaded] = useState(false);

 useEffect(() => {
 try {
 const raw = localStorage.getItem('yatra-bookings');
 if (raw) {
 const parsed: StoredBooking[] = JSON.parse(raw);
 // Mark past bookings as completed
 const now = Date.now();
 const updated = parsed.map((b) => {
 if (b.status === 'confirmed' && new Date(b.startDate).getTime() + 15 * 86400000 < now) {
 return { ...b, status: 'completed' as const };
 }
 return b;
 });
 setBookings(updated);
 }
 } catch {}
 setLoaded(true);
 }, []);

 const upcoming = bookings.filter((b) => b.status === 'confirmed');
 const past = bookings.filter((b) => b.status !== 'confirmed');

 return (
 <div style={{ background: 'var(--color-bg)' }} className="min-h-[80vh]">
 {/* Header */}
 <div className="border-b" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <Link href="/profile" className="inline-flex items-center gap-1.5 text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
 <ChevronLeft className="w-3.5 h-3.5" /> Back to profile
 </Link>
 <div className="flex items-center gap-2 mb-1">
 <Mountain className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>My Yatra Bookings</p>
 </div>
 <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Your sacred journeys
 </h1>
 </div>
 </div>

 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
 {!loaded ? (
 <div className="text-center py-16">
 <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
 </div>
 ) : bookings.length === 0 ? (
 <div className="text-center py-16">
 <Mountain className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--color-text-faint)' }} />
 <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No yatra bookings yet</h2>
 <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>Start your first pilgrimage today.</p>
 <Link href="/yatra" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
 Browse Yatras <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 ) : (
 <>
 {/* Upcoming */}
 {upcoming.length > 0 && (
 <section>
 <div className="flex items-center gap-2 mb-4">
 <Clock className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text)' }}>Upcoming</h2>
 <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>{upcoming.length}</span>
 </div>
 <div className="space-y-3">
 {upcoming.map((b) => <BookingCard key={b.bookingNumber} b={b} />)}
 </div>
 </section>
 )}

 {/* Past */}
 {past.length > 0 && (
 <section>
 <div className="flex items-center gap-2 mb-4">
 <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
 <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Past</h2>
 <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>{past.length}</span>
 </div>
 <div className="space-y-3">
 {past.map((b) => <BookingCard key={b.bookingNumber} b={b} />)}
 </div>
 </section>
 )}

 <section>
 <div className="rounded-xl p-5 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Ready for another yatra?</p>
 <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Discover more sacred journeys across India.</p>
 <Link href="/yatra" className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
 Browse Yatras <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 </section>
 </>
 )}
 </div>
 </div>
 );
}

function BookingCard({ b }: { b: StoredBooking }) {
 const yatra = getYatraBySlug(b.yatraSlug);
 const statusStyle = {
 confirmed: { bg: 'color-mix(in oklch, #437a22 12%, transparent)', color: '#437a22', icon: CheckCircle2, label: 'Confirmed' },
 completed: { bg: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', icon: CheckCircle2, label: 'Completed' },
 cancelled: { bg: 'color-mix(in oklch, #a12c7b 12%, transparent)', color: '#a12c7b', icon: XCircle, label: 'Cancelled' },
 }[b.status];
 const StatusIcon = statusStyle.icon;

 return (
 <div className="rounded-xl p-4 flex flex-col md:flex-row gap-4 card-hover" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 {yatra && (
 <div className="md:w-40 h-28 rounded-lg overflow-hidden shrink-0">
 <img src={yatra.heroImage} alt={b.yatraTitle} className="w-full h-full object-cover" loading="lazy" decoding="async" />
 </div>
 )}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1.5">
 <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: statusStyle.bg, color: statusStyle.color }}>
 <StatusIcon className="w-3 h-3" /> {statusStyle.label}
 </span>
 <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-widest" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>{b.packageTier}</span>
 </div>
 <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{b.yatraTitle}</h3>
 <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Booking #{b.bookingNumber}</p>
 <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {b.startDate || 'Date TBD'}</span>
 <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.travelers} travelers</span>
 {yatra && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {yatra.places.length} stops</span>}
 </div>
 </div>
 <div className="md:text-right flex flex-col gap-2 shrink-0 md:w-40">
 <div>
 <p className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>Amount paid</p>
 <p className="text-base font-semibold" style={{ color: 'var(--color-primary)' }}>{formatINR(b.total)}</p>
 </div>
 <Link
 href={`/yatra/${b.yatraSlug}`}
 className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 View details <ArrowRight className="w-3 h-3" />
 </Link>
 {b.status === 'confirmed' && (
 <Link
 href="/yatra/companion"
 className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
 style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}
 >
 <Heart className="w-3 h-3" /> Add companion
 </Link>
 )}
 </div>
 </div>
 );
}
