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
import { formatINR } from '../../../lib/yatra-data';
// TC-06: the roster is read from lib/companion-roster.ts, which publishes only
// companions Darshya has actually recruited and vetted. The eight invented
// profiles in lib/yatra-data.ts are no longer rendered as bookable people.
import { publishedCompanions } from '../../../lib/companion-roster';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/yatra/companion' },
 title: 'Travel Companions for elderly yatris',
 description: 'Register interest in a travel companion for an elderly devotee on pilgrimage. Every companion we list must clear ID, background and first-aid checks before appearing here.',
};

export default function CompanionListingPage() {
 const companions = publishedCompanions;
 const rosterOpen = companions.length > 0;
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

 <h1 data-reveal="cinematic" className={H1.catalogue}>
 A verified companion for every step of your{' '}
 <span className="text-highlight" style={{ color: 'var(--color-primary)' }}>sacred journey</span>
 </h1>

 <p data-reveal="up" data-delay="2" className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 A companion assists an elderly devotee with mobility, medication reminders, logistics, photos and family updates. {rosterOpen
 ? 'Every companion listed below has cleared ID, background and first-aid checks.'
 : 'We are recruiting the first companions now — nobody is listed until they have cleared ID, background and first-aid checks in person.'}
 </p>

 <div data-reveal="fade" data-delay="3" className="mt-6 flex flex-wrap items-center gap-5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> ID check required to list</span>
 <span className="flex items-center gap-1.5"><Stethoscope className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> First-aid training required</span>
 <span className="flex items-center gap-1.5"><Navigation className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> Location shared with family</span>
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
 { n: '01', icon: Users, title: 'Ask for a companion', desc: rosterOpen ? 'Add a companion when booking any yatra, or pick one from the roster below by language, specialization and availability.' : 'Add a companion when booking any yatra, or call us. We match you to a companion once one is available in your region.' },
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
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>{rosterOpen ? 'Meet our companions' : 'Companion roster'}</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {rosterOpen
 ? `${companions.length} vetted travel companion${companions.length === 1 ? '' : 's'}`
 : 'No companions listed yet'}
 </h2>
 </div>
 {rosterOpen && (
 <p className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>ID checked · Background checked · First-aid trained</p>
 )}
 </div>

 {!rosterOpen && (
 <div className="rounded-xl p-6 md:p-8 max-w-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>We are still building this roster</h3>
 <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-muted)' }}>
 Darshya has not yet signed and vetted any travel companions, so there is nobody to show you and
 nobody to book. We will not list a name until we have met that person, checked their government ID,
 taken up references and confirmed their first-aid training. Tell us your dates and we will call you
 as soon as a companion who fits is available.
 </p>
 <div className="flex items-center gap-3 flex-wrap">
 <Link href="/yatra/plan" className={buttonClass('primary', 'md', 'btn-press')}>
 Tell us your yatra plan <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 <Link href="tel:+919255109400" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
 <Phone className="w-3.5 h-3.5" /> Talk to an advisor
 </Link>
 </div>
 </div>
 )}

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

 {/* Rating. TC-06: this card printed five stars and c.rating.toFixed(1)
 unconditionally. The fixture rows it was written against carried
 60-124 invented reviews each, so the zero case never showed — but the
 first genuinely recruited companion has no reviews at all, and this
 would have rendered a flat "0.0 (0)" star row as if yatris had rated
 them badly. The detail page already gated on reviewCount; the card
 now does too, and says plainly that nobody has rated them yet. */}
 {c.reviewCount > 0 ? (
 <div className="mt-2 flex items-center gap-1.5">
 <div className="flex items-center gap-0.5">
 {Array.from({ length: 5 }).map((_, s) => (
 <Star key={s} className="w-3 h-3" fill={s < Math.round(c.rating) ? 'var(--color-primary)' : 'transparent'} style={{ color: 'var(--color-primary)' }} />
 ))}
 </div>
 <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{c.rating.toFixed(1)}</span>
 <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>({c.reviewCount})</span>
 </div>
 ) : (
 <p className="mt-2 text-xs" style={{ color: 'var(--color-text-faint)' }}>No yatri ratings yet</p>
 )}

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
 className={buttonClass('primary', 'md', 'mt-3 btn-press')}
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
 { icon: Shield, title: 'Background checked before listing', desc: 'Government ID, police verification and reference checks are a precondition for appearing on this page.' },
 { icon: Stethoscope, title: 'First-aid trained', desc: 'Basic nursing, BP monitoring, oximeter handling and CPR training are required before a companion is listed.' },
 { icon: Phone, title: 'Family emergency contact', desc: 'Your companion shares a daily call, and our advisor line is reachable through the yatra.' },
 { icon: Navigation, title: 'Location shared with family', desc: 'The companion shares live location with up to 3 family members for the duration of the yatra.' },
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
 How we intend to pay companions
 </h3>
 <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text-muted)' }}>
 When the roster opens, a companion is paid in full at the time of your booking rather than on completion. That is designed to give you:
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
 { q: 'Can I choose a specific companion?', a: rosterOpen ? 'Yes. Browse the roster, pick one who matches your language, regional familiarity and specialization, and we confirm availability with you.' : 'Not yet — no companions are listed. Tell us the language, regional familiarity and specialization you need and we will come back to you when we have matched someone.' },
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
 {rosterOpen
 ? `Companion cost starts at ${formatINR(Math.min(...companions.map((c) => c.pricePerDay)))}/day. Book along with any yatra or standalone.`
 : 'Tell us your dates and we will quote a companion as soon as one is available in your region.'}
 </p>
 <div className="flex items-center justify-center gap-3 flex-wrap">
 <Link href="/yatra" className={buttonClass('primary', 'md', 'btn-press')}>
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
