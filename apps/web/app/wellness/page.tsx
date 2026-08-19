import type { Metadata } from 'next';
import Link from 'next/link';
import {
 ArrowRight,
 Heart,
 Leaf,
 Sun,
 Wind,
 Eye,
 Sparkles,
} from 'lucide-react';
import ScrollReveal from '../../components/ScrollReveal';
import { ApprovedProvidersStrip } from '../../components/ApprovedProvidersStrip';
import UpcomingClassesSection from './UpcomingClassesSection';
import FeaturedInstructorsSection from './FeaturedInstructorsSection';

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/wellness' },
 title: 'Yoga, Meditation & Vipassana',
 description:
 'Discover inner peace through guided yoga, meditation, and Vipassana retreats with certified instructors on Darshya.',
};

const categories = [
 {
 title: 'Yoga',
 href: '/wellness/yoga',
 icon: Sun,
 color: 'var(--color-art-2)',
 description:
 'Hatha, Vinyasa, Ashtanga, Kundalini, and Yin yoga with certified instructors. Morning and evening live sessions.',
 sessions: 'Live weekly sessions',
 },
 {
 title: 'Meditation',
 href: '/wellness/meditation',
 icon: Wind,
 color: 'var(--color-art-1)',
 description:
 'Guided meditation, Transcendental, Mindfulness, Chakra healing, and Sound bath experiences.',
 sessions: 'Multiple weekly sessions',
 },
 {
 title: 'Vipassana',
 href: '/wellness/vipassana',
 icon: Eye,
 color: 'var(--color-art-3)',
 description:
 '10-day residential retreats, preparatory courses, and introductory sessions in the S.N. Goenka tradition.',
 sessions: 'Monthly retreats',
 },
];

// COM-14 (prod sweep 2026-08-12, P2): six invented instructors used to sit
// here — name, 4.9 rating, years of experience and a per-session price for
// people who teach nothing on this platform, each card linking to a fixture
// profile. The section is now <FeaturedInstructorsSection />, derived from
// the same live wellness_sessions rows the class catalog reads.

// AW-07 (2026-08-12, P1): the six invented "upcoming sessions" that used to
// live here — 'Morning Hatha Flow · Aarav Sharma · Apr 18 · 8 spots left' and
// friends — were fixtures. None of them existed in `wellness_sessions`, none
// was bookable (each card linked to a static category page), and the real class
// an instructor had just published was nowhere on this page. The section is now
// <UpcomingClassesSection />, which renders live rows and links to
// /wellness/classes/<id> where a devotee can actually enrol and pay.

const benefits = [
 { title: 'Reduce Stress & Anxiety', description: 'Regular practice lowers cortisol levels and activates the parasympathetic nervous system for deep calm.' },
 { title: 'Improve Flexibility & Strength', description: 'Yoga postures build functional strength while increasing range of motion in joints and muscles.' },
 { title: 'Sharpen Focus & Clarity', description: 'Meditation trains the mind to sustain attention, improving productivity and decision-making.' },
 { title: 'Better Sleep Quality', description: 'Evening practices like Yin Yoga and Yoga Nidra promote deep, restorative sleep cycles.' },
 { title: 'Emotional Resilience', description: 'Vipassana and mindfulness develop equanimity — the ability to remain balanced through life\'s ups and downs.' },
 { title: 'Community & Connection', description: 'Join a sangha of practitioners who support each other on the path to inner peace.' },
];

export default function WellnessPage() {
 return (
 <ScrollReveal>
 <div style={{ background: 'var(--color-bg)' }}>

 {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
 <section className="py-16 md:py-24 relative overflow-hidden">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="max-w-3xl">
 <div
 data-reveal="blur"
 className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
 style={{ background: 'var(--color-art-1)', color: 'var(--color-text)' }}
 >
 <Leaf className="w-3.5 h-3.5" />
 Mind, Body & Spirit
 </div>

 <h1
 data-reveal="up-far"
 className="heading-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1]"
 style={{ color: 'var(--color-text)' }}
 >
 Yoga, Meditation{' '}
 <span style={{ color: 'var(--color-primary)' }}>&amp; Vipassana</span>
 </h1>

 <p
 data-reveal="up"
 data-delay="1"
 className="mt-6 text-base leading-relaxed max-w-xl"
 style={{ color: 'var(--color-text-muted)' }}
 >
 Begin your inner journey with certified instructors. Live sessions every morning and evening, guided retreats, and a growing library of recorded practices.
 </p>

 <div data-reveal="up" data-delay="2" className="mt-8 flex items-center gap-3 flex-wrap">
 <Link
 href="/wellness/classes"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Browse live classes <ArrowRight className="w-4 h-4" />
 </Link>
 <Link
 href="/wellness/yoga"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 Explore Yoga
 </Link>
 <Link
 href="/wellness/meditation"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 Try Meditation
 </Link>
 </div>

 <div data-reveal="fade" data-delay="3" className="mt-10 flex items-center gap-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
 <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Certified</span> Instructors</div>
 <div className="w-px h-5" style={{ background: 'var(--color-divider)' }} />
 <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Live</span> Group sessions</div>
 <div className="w-px h-5" style={{ background: 'var(--color-divider)' }} />
 <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>1:1</span> Private bookings</div>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ CATEGORIES ═════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Explore Practices
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Three paths to inner peace
 </h2>

 <div className="grid sm:grid-cols-3 gap-5">
 {categories.map((cat, i) => {
 const Icon = cat.icon;
 return (
 <Link
 key={cat.title}
 href={cat.href}
 data-reveal="up"
 data-delay={String(i + 1)}
 className="group p-6 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <div
 className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
 style={{ background: cat.color }}
 >
 <Icon className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
 </div>
 <h3 className="text-base font-medium mb-2 group-hover:underline" style={{ color: 'var(--color-text)' }}>
 {cat.title}
 </h3>
 <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-muted)' }}>
 {cat.description}
 </p>
 <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
 {cat.sessions} <ArrowRight className="w-3 h-3" />
 </span>
 </Link>
 );
 })}
 </div>
 </div>
 </section>

 {/* ═══ FEATURED INSTRUCTORS (live rows — COM-14) ══════════════════════ */}
 <FeaturedInstructorsSection />

 {/* ═══ UPCOMING SESSIONS (live rows — see UpcomingClassesSection) ═════ */}
 <UpcomingClassesSection />

 {/* ═══ BENEFITS ═══════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="text-center mb-12">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Why Practice
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Benefits that go beyond the mat
 </h2>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {benefits.map((benefit, i) => (
 <div
 key={benefit.title}
 data-reveal="rotate"
 data-delay={String((i % 3) + 1)}
 className="p-5 rounded-xl"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <div
 className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
 style={{ background: 'var(--color-primary-highlight)' }}
 >
 <Heart className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 </div>
 <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
 {benefit.title}
 </h3>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 {benefit.description}
 </p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ CTA ════════════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Start your practice today
 </h2>
 <p data-reveal="up" data-delay="1" className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--color-text-muted)' }}>
 Join thousands of practitioners on Darshya. Your first guided meditation session is free.
 </p>
 <div data-reveal="blur" data-delay="2" className="flex items-center justify-center gap-3 flex-wrap">
 <Link
 href="/wellness/meditation"
 className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Free Guided Session <ArrowRight className="w-4 h-4" />
 </Link>
 <Link
 href="/wellness/vipassana"
 className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 View Retreats
 </Link>
 </div>
 </div>
 </section>

 <ApprovedProvidersStrip
 type="wellness"
 heading="Verified instructors on Darshya"
 subheading="Approved yoga, meditation and pranayama instructors. Each profile is reviewed before going live."
 limit={8}
 />

 </div>
 </ScrollReveal>
 );
}
