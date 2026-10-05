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
 Heart,
 ArrowRight,
 Phone,
 Sparkles,
 CheckCircle2,
} from 'lucide-react';
import ScrollReveal from '../../../../components/ScrollReveal';
import { formatINR } from '../../../../lib/yatra-data';
// TC-06: this route used to pre-render a bookable profile — availability
// calendar, day rate, "Book This Companion" — for each of the eight invented
// people in lib/yatra-data.ts. It now reads the published roster, so a URL
// resolves only for a companion Darshya has actually recruited and vetted, and
// every other id 404s instead of offering a stranger to escort someone's
// elderly parent across the country.
import { publishedCompanions, getPublishedCompanionById } from '../../../../lib/companion-roster';

import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';
export function generateStaticParams() {
 return publishedCompanions.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
 const { id } = await params;
 const c = getPublishedCompanionById(id);
 if (!c) return { title: 'Companion not found' };
 return {
 title: `${c.name} — Travel Companion`,
 alternates: { canonical: `https://darshya.online/yatra/companion/${id}` },
 description: `${c.experience} experience. ${c.yatrasCompleted} yatras. Languages: ${c.languages.join(', ')}.`,
 };
}

export default async function CompanionDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const c = getPublishedCompanionById(id);
 if (!c) return notFound();

 // TC-06: a "30-day availability" grid was generated here — thirty squares
 // coloured green or pink straight from the loop index (i % 7 > 4,
 // i % 3 !== 0) — and a three-tier ladder invented a 5% / 10% discount and
 // printed the discounted day rate as a price. Both are deleted. Yatra has no
 // Prisma model, so there is no booking row that could say a date is free and
 // no pricing source that agreed to a discount; drawing either out of
 // arithmetic is the same fabrication as the roster this page used to carry.
 // The aside now states how dates and the final quote are actually settled.

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
 {/* TC-06: an unconditional green "Verified" pill sat beside the name on
  every profile that resolved. It read nothing — not c.verified, not any
  other field — it was typed into the JSX, so it stayed green whatever
  the data said. The three pills further down name the individual checks
  that were actually recorded, which is the only form of this claim that
  something computed, so the unqualified badge is removed, not reworded. */}
 <h1 className={H1.portal}>
 {c.name}
 </h1>
 </div>
 <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
 {c.age} years · {c.gender === 'male' ? 'Male' : 'Female'} · {c.city}
 </p>

 <div className="flex flex-wrap items-center gap-4 text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
 {c.reviewCount > 0 && (
 <span className="flex items-center gap-1.5">
 <div className="flex items-center gap-0.5">
 {Array.from({ length: 5 }).map((_, s) => (
 <Star key={s} className="w-3 h-3" fill={s < Math.round(c.rating) ? 'var(--color-primary)' : 'transparent'} style={{ color: 'var(--color-primary)' }} />
 ))}
 </div>
 <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{c.rating.toFixed(1)}</span>
 <span>({c.reviewCount} reviews)</span>
 </span>
 )}
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
 className={buttonClass('primary', 'md', 'w-full btn-press')}
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

 {/* Dates + cost. TC-06: was a generated 30-day availability grid. */}
 <aside>
 <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Dates and cost</h3>
 <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div>
 <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-faint)' }}>Day rate</p>
 <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{formatINR(c.pricePerDay)}<span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}> / day</span></p>
 </div>
 <div className="pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 We do not publish a live availability calendar. Tell us your dates and an
 advisor confirms with {c.name.split(' ')[0]} directly, then sends you the
 final quote for the length of your yatra before anything is committed.
 </p>
 </div>
 <Link href="tel:+919255109400" className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>
 <Phone className="w-3 h-3" /> Check dates with an advisor
 </Link>
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
 {c.reviews.length === 0 && (
 <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
 No reviews yet. Reviews appear here once a yatri who travelled with {c.name.split(' ')[0]} has rated the journey.
 </p>
 )}
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
 Select your yatra first — we&apos;ll attach {c.name.split(' ')[0]} to your booking and confirm with you.
 </p>
 <Link href="/yatra" className={buttonClass('primary', 'md', 'btn-press')}>
 Choose Your Yatra <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </section>
 </div>
 </ScrollReveal>
 );
}
