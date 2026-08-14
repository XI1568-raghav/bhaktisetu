import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
 ChevronLeft,
 Star,
 MapPin,
 Calendar,
 Languages,
 Shield,
 Stethoscope,
 BadgeCheck,
 Heart,
 ArrowRight,
 Phone,
 Sparkles,
 CheckCircle2,
} from 'lucide-react';
import ScrollReveal from '../../../../components/ScrollReveal';
import { companions, getCompanionById, formatINR } from '../../../../lib/yatra-data';

export function generateStaticParams() {
 return companions.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
 const { id } = await params;
 const c = getCompanionById(id);
 if (!c) return { title: 'Companion not found' };
 return {
 title: `${c.name} — Travel Companion`,
 alternates: { canonical: `https://darshya.online/yatra/companion/${id}` },
 description: `${c.experience} experience. ${c.yatrasCompleted} yatras. Languages: ${c.languages.join(', ')}.`,
 };
}

export default async function CompanionDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const c = getCompanionById(id);
 if (!c) return notFound();

 // Generate a simple 30-day availability calendar
 const today = new Date();
 const days = Array.from({ length: 30 }).map((_, i) => {
 const d = new Date(today);
 d.setDate(today.getDate() + i);
 const dayOfWeek = d.getDay();
 // Availability pattern based on profile status
 let available = true;
 if (c.availability === 'busy') available = i % 7 > 4;
 else if (c.availability === 'limited') available = i % 3 !== 0;
 return { date: d, available, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
 });

 const tiers = [
 { label: 'Short yatra (1-5 days)', multiplier: 1, discount: 0 },
 { label: 'Medium yatra (6-10 days)', multiplier: 1, discount: 5 },
 { label: 'Long yatra (11+ days)', multiplier: 1, discount: 10 },
 ];

 return (
 <ScrollReveal>
 <div style={{ background: 'var(--color-bg)' }}>
 {/* Back nav */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
 <Link href="/yatra/companion" className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <ChevronLeft className="w-3.5 h-3.5" /> Back to all companions
 </Link>
 </div>

 {/* ═══ PROFILE HEADER ══════════════════════════════════ */}
 <section className="py-8 md:py-10">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="rounded-xl p-6 md:p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div className="flex flex-col md:flex-row items-start gap-5">
 <div
 data-reveal="spring"
 className="w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center text-2xl font-semibold text-white shrink-0"
 style={{ background: c.avatarColor }}
 >
 {c.initials}
 </div>

 <div className="flex-1">
 <div className="flex flex-wrap items-center gap-2 mb-1.5">
 <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {c.name}
 </h1>
 <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in oklch, #16a34a 12%, transparent)', color: '#16a34a' }}>
 <BadgeCheck className="w-2.5 h-2.5" /> Verified
 </span>
 </div>
 <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
 {c.age} years · {c.gender === 'male' ? 'Male' : 'Female'} · {c.city}
 </p>

 <div className="flex flex-wrap items-center gap-4 text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1.5">
 <div className="flex items-center gap-0.5">
 {Array.from({ length: 5 }).map((_, s) => (
 <Star key={s} className="w-3 h-3" fill={s < Math.round(c.rating) ? 'var(--color-primary)' : 'transparent'} style={{ color: 'var(--color-primary)' }} />
 ))}
 </div>
 <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{c.rating.toFixed(1)}</span>
 <span>({c.reviewCount} reviews)</span>
 </span>
 <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" style={{ color: 'var(--color-primary)' }} /> {c.yatrasCompleted} yatras</span>
 <span className="flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: 'var(--color-primary)' }} /> {c.experience}</span>
 </div>

 {/* Verified badges */}
 <div className="flex items-center gap-1.5 flex-wrap mb-4">
 {c.verified.aadhaar && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: 'color-mix(in oklch, #16a34a 10%, transparent)', color: '#16a34a' }}><CheckCircle2 className="w-3 h-3" /> Aadhaar verified</span>}
 {c.verified.background && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: 'color-mix(in oklch, #16a34a 10%, transparent)', color: '#16a34a' }}><Shield className="w-3 h-3" /> Background checked</span>}
 {c.verified.medical && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: 'color-mix(in oklch, #16a34a 10%, transparent)', color: '#16a34a' }}><Stethoscope className="w-3 h-3" /> Medical trained</span>}
 </div>
 </div>

 {/* Pricing + CTA */}
 <div className="w-full md:w-64 shrink-0">
 <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-faint)' }}>Starting from</p>
 <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{formatINR(c.pricePerDay)}</p>
 <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>per day · all inclusive</p>
 <Link
 href="/yatra"
 className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Book This Companion <ArrowRight className="w-3 h-3" />
 </Link>
 <Link href="tel:+919255109400" className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>
 <Phone className="w-3 h-3" /> Call advisor
 </Link>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ BIO + SPECIALIZATIONS ═══════════════════════════ */}
 <section className="py-6">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
 <div className="md:col-span-2">
 <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>About {c.name.split(' ')[0]}</h2>
 <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>{c.bio}</p>

 <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Languages</h3>
 <div className="flex items-center gap-2 mb-5">
 <Languages className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <div className="flex flex-wrap gap-1.5">
 {c.languages.map((l) => (
 <span key={l} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>{l}</span>
 ))}
 </div>
 </div>

 <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Specializations</h3>
 <div className="flex flex-wrap gap-1.5 mb-5">
 {c.specializations.map((s) => (
 <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>{s}</span>
 ))}
 </div>

 <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Yatras led</h3>
 <div className="grid grid-cols-2 gap-2">
 {c.pastYatras.map((y) => (
 <div key={y} className="rounded-lg p-2.5 text-xs" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
 <MapPin className="w-3 h-3 inline mr-1.5" style={{ color: 'var(--color-primary)' }} />
 {y}
 </div>
 ))}
 </div>
 </div>

 {/* Availability Calendar */}
 <aside>
 <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>30-day availability</h3>
 <div className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div className="grid grid-cols-7 gap-1">
 {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
 <div key={i} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--color-text-faint)' }}>{d}</div>
 ))}
 {days.map((d, i) => (
 <div
 key={i}
 className="aspect-square rounded text-center flex flex-col items-center justify-center text-xs"
 style={{
 background: d.available ? 'color-mix(in oklch, #16a34a 12%, transparent)' : 'color-mix(in oklch, #a12c7b 10%, transparent)',
 color: d.available ? '#16a34a' : '#a12c7b',
 opacity: d.isWeekend ? 1 : 0.9,
 }}
 >
 <span className="font-semibold">{d.date.getDate()}</span>
 </div>
 ))}
 </div>
 <div className="flex items-center justify-between mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'color-mix(in oklch, #16a34a 50%, transparent)' }} /> Available</span>
 <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'color-mix(in oklch, #a12c7b 50%, transparent)' }} /> Booked</span>
 </div>
 </div>

 <h3 className="text-sm font-semibold mt-5 mb-3" style={{ color: 'var(--color-text)' }}>Pricing</h3>
 <div className="space-y-2">
 {tiers.map((t) => {
 const price = Math.round(c.pricePerDay * t.multiplier * (1 - t.discount / 100));
 return (
 <div key={t.label} className="rounded-lg p-3 flex items-center justify-between text-xs" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div>
 <p className="font-medium" style={{ color: 'var(--color-text)' }}>{t.label}</p>
 {t.discount > 0 && <p className="text-xs" style={{ color: 'var(--color-status-success)' }}>{t.discount}% off</p>}
 </div>
 <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>{formatINR(price)}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/day</span></p>
 </div>
 );
 })}
 </div>
 </aside>
 </div>
 </section>

 {/* ═══ REVIEWS ═══════════════════════════════════════════ */}
 <section className="py-10 md:py-12" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Pilgrim reviews</p>
 <h2 className="text-xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 What past yatris say
 </h2>
 <div className="grid md:grid-cols-2 gap-4">
 {c.reviews.map((r, i) => (
 <div key={i} className="rounded-xl p-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <div className="flex items-center gap-1 mb-2">
 {Array.from({ length: 5 }).map((_, s) => (
 <Star key={s} className="w-3 h-3" fill={s < r.rating ? 'var(--color-primary)' : 'transparent'} style={{ color: 'var(--color-primary)' }} />
 ))}
 </div>
 <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text)' }}>&ldquo;{r.comment}&rdquo;</p>
 <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{r.author}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>After {r.yatra}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ FINAL CTA ═════════════════════════════════════════ */}
 <section className="py-10 md:py-14">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <Heart className="w-6 h-6 mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
 <h2 className="text-xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Book {c.name.split(' ')[0]} for your yatra
 </h2>
 <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
 Select your yatra first — we&apos;ll attach {c.name.split(' ')[0]} to your booking and confirm within 2 hours.
 </p>
 <Link href="/yatra" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
 Choose Your Yatra <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </section>
 </div>
 </ScrollReveal>
 );
}
