import Link from 'next/link';
import type { Metadata } from 'next';
import {
 Heart,
 Shield,
 Star,
 MapPin,
 CheckCircle2,
 Users,
 Phone,
 ArrowRight,
 Stethoscope,
 Languages,
 Sparkles,
 Clock,
 BadgeCheck,
 Navigation,
 ChevronRight,
} from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';
import { companions, formatINR } from '../../../lib/yatra-data';

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/yatra/companion' },
 title: 'Travel Companions — Verified helpers for elderly yatris',
 description: 'Book verified travel companions for elderly devotees undertaking sacred pilgrimages. Aadhaar verified, background checked, first-aid certified.',
};

export default function CompanionListingPage() {
 return (
 <ScrollReveal>
 <div style={{ background: 'var(--color-bg)' }}>
 {/* ═══ HERO ═════════════════════════════════════════════ */}
 <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-art-2) 0%, var(--color-bg) 70%)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
 <div className="max-w-2xl">
 <div
 data-reveal="spring"
 className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-5"
 style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}
 >
 <Heart className="w-3.5 h-3.5" />
 Travel Companion Service
 </div>

 <h1 data-reveal="cinematic" className="heading-display text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1]" style={{ color: 'var(--color-text)' }}>
 A verified companion for every step of your{' '}
 <span className="text-highlight" style={{ color: 'var(--color-primary)' }}>sacred journey</span>
 </h1>

 <p data-reveal="up" data-delay="2" className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 Our trained companions assist elderly devotees with mobility, medication reminders, logistics, photos, and real-time family updates. Aadhaar verified, background checked, first-aid certified.
 </p>

 <div data-reveal="fade" data-delay="3" className="mt-6 flex flex-wrap items-center gap-5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> 100% Aadhaar verified</span>
 <span className="flex items-center gap-1.5"><Stethoscope className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> First-aid certified</span>
 <span className="flex items-center gap-1.5"><Navigation className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> Real-time GPS tracking</span>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ HOW IT WORKS ═════════════════════════════════════ */}
 <section className="py-10 md:py-14" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>How it works</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Three simple steps
 </h2>

 <div data-reveal="up" className="grid md:grid-cols-3 gap-5">
 {[
 { n: '01', icon: Users, title: 'Book with your yatra', desc: 'Add a companion when booking any yatra or browse our companion pool and select by language, specialization and availability.' },
 { n: '02', icon: MapPin, title: 'Meet at departure', desc: 'Your companion arrives at your pickup city a day before departure for briefing and to meet the family.' },
 { n: '03', icon: Heart, title: 'They handle everything', desc: 'Mobility assistance, medicine reminders, photos, darshan queue management, family video calls — so you focus on devotion.' },
 ].map((s) => (
 <div key={s.n} className="rounded-xl p-5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <div className="flex items-center gap-3 mb-3">
 <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-highlight)' }}>
 <s.icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 </div>
 <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>Step {s.n}</span>
 </div>
 <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>{s.title}</h3>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{s.desc}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ COMPANION CARDS ═════════════════════════════════ */}
 <section className="py-10 md:py-14">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-end justify-between mb-6">
 <div>
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>Meet our companions</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 8 verified travel companions
 </h2>
 </div>
 <p className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>All verified · Background checked · First-aid certified</p>
 </div>

 <div data-reveal="up" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {companions.map((c) => (
 <div
 key={c.id}
 className="rounded-xl p-4 card-hover flex flex-col"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 {/* Avatar + availability */}
 <div className="flex items-start justify-between mb-3">
 <div
 className="w-14 h-14 rounded-full flex items-center justify-center text-base font-semibold text-white shrink-0"
 style={{ background: c.avatarColor }}
 >
 {c.initials}
 </div>
 <span
 className="text-xs font-medium px-2 py-0.5 rounded-full"
 style={{
 background: c.availability === 'available' ? 'color-mix(in oklch, #16a34a 15%, transparent)' : c.availability === 'limited' ? 'color-mix(in oklch, #b87333 15%, transparent)' : 'color-mix(in oklch, #a12c7b 15%, transparent)',
 color: c.availability === 'available' ? '#16a34a' : c.availability === 'limited' ? 'var(--color-primary)' : '#a12c7b',
 }}
 >
 {c.availability === 'available' ? 'Available' : c.availability === 'limited' ? 'Limited' : 'Busy'}
 </span>
 </div>

 <div>
 <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.name}</h3>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.age} yrs · {c.gender === 'male' ? 'Male' : 'Female'} · {c.city}</p>
 </div>

 {/* Rating */}
 <div className="mt-2 flex items-center gap-1.5">
 <div className="flex items-center gap-0.5">
 {Array.from({ length: 5 }).map((_, s) => (
 <Star key={s} className="w-3 h-3" fill={s < Math.round(c.rating) ? 'var(--color-primary)' : 'transparent'} style={{ color: 'var(--color-primary)' }} />
 ))}
 </div>
 <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{c.rating.toFixed(1)}</span>
 <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>({c.reviewCount})</span>
 </div>

 <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <Sparkles className="w-3 h-3" style={{ color: 'var(--color-primary)' }} /> {c.yatrasCompleted} yatras completed
 </div>

 {/* Languages */}
 <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <Languages className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
 <span className="truncate">{c.languages.join(', ')}</span>
 </div>

 {/* Specializations */}
 <div className="mt-3 flex flex-wrap gap-1">
 {c.specializations.slice(0, 2).map((s) => (
 <span key={s} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>
 {s}
 </span>
 ))}
 </div>

 {/* Verified badges */}
 <div className="mt-3 flex items-center gap-1 flex-wrap">
 {c.verified.aadhaar && <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in oklch, #16a34a 10%, transparent)', color: '#16a34a' }}><CheckCircle2 className="w-2.5 h-2.5" /> Aadhaar</span>}
 {c.verified.background && <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in oklch, #16a34a 10%, transparent)', color: '#16a34a' }}><Shield className="w-2.5 h-2.5" /> BG check</span>}
 {c.verified.medical && <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in oklch, #16a34a 10%, transparent)', color: '#16a34a' }}><Stethoscope className="w-2.5 h-2.5" /> Medical</span>}
 </div>

 <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-divider)' }}>
 <div>
 <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Price</p>
 <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{formatINR(c.pricePerDay)} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/ day</span></p>
 </div>
 </div>

 <Link
 href={`/yatra/companion/${c.id}`}
 className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Book Companion <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ TRUST SECTION ═══════════════════════════════════ */}
 <section className="py-12 md:py-14" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Why trust us</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Family peace-of-mind guaranteed
 </h2>

 <div data-reveal="up" className="grid md:grid-cols-4 gap-4">
 {[
 { icon: Shield, title: 'Background verified', desc: 'Aadhaar, police verification and reference checks done for every companion.' },
 { icon: Stethoscope, title: 'First-aid certified', desc: 'Basic nursing, BP monitoring, oximeter handling, CPR — all companions trained.' },
 { icon: Phone, title: 'Family emergency contact', desc: 'Companion shares daily video calls. Emergency hotline runs 24/7.' },
 { icon: Navigation, title: 'Real-time GPS tracking', desc: 'Live location shared with up to 3 family members throughout the yatra.' },
 ].map((t) => (
 <div key={t.title} className="rounded-xl p-5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--color-primary-highlight)' }}>
 <t.icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 </div>
 <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{t.title}</h3>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{t.desc}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ ADVANCE PAYMENT ═════════════════════════════════ */}
 <section className="py-10 md:py-14" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
 <div data-reveal="glow" className="rounded-xl p-6" style={{ background: 'linear-gradient(135deg, var(--color-primary-highlight), var(--color-surface))', border: '1px solid var(--color-primary)' }}>
 <div className="flex items-center gap-2 mb-3">
 <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>How payment works</p>
 </div>
 <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Companion is paid upfront by Darshya
 </h3>
 <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text-muted)' }}>
 Unlike freelance gigs, our companions are paid in full at the time of your booking. This ensures:
 </p>
 <ul className="space-y-1.5 text-sm" style={{ color: 'var(--color-text)' }}>
 <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} /> Full commitment to your yatra dates</li>
 <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} /> No last-minute cancellation for better offers</li>
 <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} /> Family of the companion is financially secure during travel</li>
 <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} /> You only deal with Darshya for any issue — single point of accountability</li>
 </ul>
 </div>
 </div>
 </section>

 {/* ═══ FAQ ═══════════════════════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>FAQ</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Questions we hear often
 </h2>
 <div data-reveal="up" className="space-y-3">
 {[
 { q: 'Can I choose a specific companion?', a: 'Yes. Browse profiles, pick one who matches your language, regional familiarity and specialization. We confirm availability within 2 hours.' },
 { q: 'Does the companion need separate hotel booking?', a: 'No. Companion stay is covered in their daily rate. They share accommodation arrangements made by Darshya or stay in adjacent rooms.' },
 { q: 'Can the companion administer medicines?', a: 'They can remind and assist with self-administration of prescribed oral medicines. For injections/IV, a nurse can be booked separately.' },
 { q: 'What if the companion gets sick?', a: 'We provide a backup companion within 12 hours. You never bear the cost of replacement.' },
 { q: 'Is the companion with us 24/7?', a: 'Yes. The companion shares accommodation with the group or in an adjacent room, and is on call throughout.' },
 { q: 'Can I extend the companion after the yatra?', a: 'Yes, subject to availability. We offer pre-yatra (1-2 day acclimatization in your city) and post-yatra (return help) extensions.' },
 ].map((f, i) => (
 <details key={i} className="group rounded-xl p-4 cursor-pointer" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <summary className="flex items-center justify-between list-none">
 <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{f.q}</span>
 <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" style={{ color: 'var(--color-primary)' }} />
 </summary>
 <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{f.a}</p>
 </details>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ FINAL CTA ═════════════════════════════════════════ */}
 <section className="py-12 md:py-16" style={{ background: 'linear-gradient(135deg, var(--color-primary-highlight), var(--color-surface))' }}>
 <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <Heart className="w-6 h-6 mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
 <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Send your parents on yatra with peace of mind
 </h2>
 <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
 Companion cost starts at {formatINR(2800)}/day. Book along with any yatra or standalone.
 </p>
 <div className="flex items-center justify-center gap-3 flex-wrap">
 <Link href="/yatra" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press" style={{ background: 'var(--color-primary)' }}>
 Browse Yatras <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 <Link href="tel:+919255109400" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
 <Phone className="w-3.5 h-3.5" /> Talk to advisor
 </Link>
 </div>
 </div>
 </section>
 </div>
 </ScrollReveal>
 );
}
