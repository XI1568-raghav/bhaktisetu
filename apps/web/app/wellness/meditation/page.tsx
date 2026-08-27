import type { Metadata } from 'next';
import Link from 'next/link';
import {
 ArrowRight,
 Star,
 Calendar,
 Clock,
 Play,
 Pause,
 Wind,
 Sparkles,
 Heart,
 Volume2,
 Target,
 CheckCircle,
} from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/wellness/meditation' },
 title: 'Meditation — Guided Sessions & Daily Practice',
 description:
 'Explore guided meditation, Transcendental, Mindfulness, Chakra healing, and Sound bath sessions with experienced teachers.',
};

const meditationTypes = [
 {
 name: 'Guided Meditation',
 description: 'A teacher leads you through visualization and breath awareness. Perfect for beginners who need a gentle entry point into meditation practice.',
 icon: Volume2,
 color: 'var(--color-art-1)',
 },
 {
 name: 'Transcendental Meditation',
 description: 'Uses a personal mantra repeated silently. Practiced 20 minutes twice daily, it settles the mind into a state of restful alertness.',
 icon: Sparkles,
 color: 'var(--color-art-2)',
 },
 {
 name: 'Mindfulness (MBSR)',
 description: 'Non-judgmental awareness of the present moment. Clinically proven to reduce stress, anxiety, and chronic pain through systematic attention training.',
 icon: Target,
 color: 'var(--color-art-3)',
 },
 {
 name: 'Chakra Meditation',
 description: 'Focuses on the seven energy centers of the body. Uses visualization, color, and sound to balance and align each chakra for holistic well-being.',
 icon: Heart,
 color: 'var(--color-art-1)',
 },
 {
 name: 'Sound Bath',
 description: 'Immersive experience using singing bowls, gongs, and tuning forks. Sound vibrations induce deep relaxation and theta brainwave states.',
 icon: Wind,
 color: 'var(--color-art-2)',
 },
];

const instructors = [
 { id: 'inst-003', name: 'Swami Dhyanananda', specialty: 'Guided & Transcendental Meditation', experience: 20, rating: 4.9, reviewCount: 512, price: 799 },
 { id: 'inst-004', name: 'Anita Desai', specialty: 'Mindfulness & Chakra Meditation', experience: 10, rating: 4.7, reviewCount: 189, price: 449 },
 { id: 'inst-008', name: 'Kavya Menon', specialty: 'Meditation & Vipassana Preparation', experience: 6, rating: 4.5, reviewCount: 98, price: 299 },
 { id: 'inst-005', name: 'Rajesh Kulkarni', specialty: 'Sound Bath & Kundalini', experience: 15, rating: 4.8, reviewCount: 276, price: 699 },
];

const challengeDays = [
 { day: 1, title: 'Breath Awareness', duration: '10 min' },
 { day: 2, title: 'Body Scan', duration: '12 min' },
 { day: 3, title: 'Loving Kindness', duration: '10 min' },
 { day: 7, title: 'Chakra Opening', duration: '15 min' },
 { day: 14, title: 'Silent Sitting', duration: '20 min' },
 { day: 21, title: 'Integration & Reflection', duration: '25 min' },
];

const upcomingSessions = [
 { title: 'Guided Morning Meditation', instructor: 'Swami Dhyanananda', date: 'Apr 18', time: '5:30 AM', duration: '45 min', spots: 20, price: 199 },
 { title: 'Chakra Alignment Session', instructor: 'Anita Desai', date: 'Apr 19', time: '7:00 PM', duration: '60 min', spots: 12, price: 249 },
 { title: 'Sound Bath Healing', instructor: 'Rajesh Kulkarni', date: 'Apr 21', time: '7:00 PM', duration: '60 min', spots: 3, price: 499 },
 { title: 'Mindfulness for Beginners', instructor: 'Kavya Menon', date: 'Apr 21', time: '6:30 AM', duration: '30 min', spots: 25, price: 149 },
];

export default function MeditationPage() {
 return (
 <ScrollReveal>
 <div style={{ background: 'var(--color-bg)' }}>

 {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
 <section className="py-16 md:py-24">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="max-w-3xl">
 <nav data-reveal="fade" className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
 <Link href="/wellness" className="hover:underline" style={{ color: 'var(--color-primary)' }}>Wellness</Link>
 <span>/</span>
 <span>Meditation</span>
 </nav>

 <h1
 data-reveal="up-far"
 className={H1.catalogue}
 >
 Find stillness with{' '}
 <span style={{ color: 'var(--color-primary)' }}>Guided Meditation</span>
 </h1>

 <p data-reveal="up" data-delay="1" className="mt-5 prose-body leading-relaxed max-w-xl" style={{ color: 'var(--color-text-muted)' }}>
 From breath awareness for beginners to advanced Transcendental practices, find the meditation style that quiets your mind and opens your heart.
 </p>

 <div data-reveal="up" data-delay="2" className="mt-8 flex items-center gap-3 flex-wrap">
 <a
 href="#player"
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 Try Free Session <Play className="w-4 h-4" />
 </a>
 <a
 href="#challenge"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 21-Day Challenge
 </a>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ MEDITATION TYPES ═══════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Meditation Styles
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Five doorways to inner silence
 </h2>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {meditationTypes.map((type, i) => {
 const Icon = type.icon;
 return (
 <div
 key={type.name}
 data-reveal="up"
 data-delay={String((i % 3) + 1)}
 className="p-5 rounded-xl"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: type.color }}>
 <Icon className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
 </div>
 <h3 className="text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
 {type.name}
 </h3>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 {type.description}
 </p>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* ═══ INSTRUCTORS ════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Teachers
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Experienced meditation guides
 </h2>

 <div className="grid sm:grid-cols-2 gap-5">
 {instructors.map((inst, i) => (
 <Link
 key={inst.id}
 href={`/wellness/instructors/${inst.id}`}
 data-reveal="scale-up"
 data-delay={String((i % 2) + 1)}
 className="group flex items-start gap-4 p-5 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <div
 className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-lg font-semibold"
 style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}
 >
 {inst.name.split(' ').map((n) => n[0]).join('')}
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-medium group-hover:underline" style={{ color: 'var(--color-text)' }}>
 {inst.name}
 </h3>
 <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--color-text-muted)' }}>
 {inst.specialty}
 </p>
 <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-0.5">
 <Star className="w-3 h-3 fill-current" style={{ color: '#D4A438' }} /> {inst.rating}
 </span>
 <span>{inst.reviewCount} reviews</span>
 <span>{inst.experience} yrs</span>
 <span className="font-medium" style={{ color: 'var(--color-primary)' }}>&#8377;{inst.price}/session</span>
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ AUDIO PLAYER MOCKUP ═══════════════════════════════════════════ */}
 <section id="player" className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Daily Guided Meditation
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Today&#39;s session: Morning Stillness
 </h2>

 <div
 data-reveal="blur"
 data-delay="1"
 className="rounded-xl p-6 sm:p-8"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
 >
 <div className="flex items-center gap-4 mb-6">
 <div
 className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
 style={{ background: 'var(--color-art-1)' }}
 >
 <Wind className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
 </div>
 <div>
 <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>Morning Stillness</h3>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
 Swami Dhyanananda &middot; 15 min &middot; Guided Meditation
 </p>
 </div>
 </div>

 {/* Player controls */}
 <div className="space-y-4">
 {/* Progress bar */}
 <div>
 <div className="progress-track">
 <div className="progress-fill" style={{ width: '35%' }} />
 </div>
 <div className="flex items-center justify-between mt-1.5 text-xs" style={{ color: 'var(--color-text-faint)' }}>
 <span>5:14</span>
 <span>15:00</span>
 </div>
 </div>

 {/* Controls */}
 <div className="flex items-center justify-center gap-6">
 <button className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
 -15s
 </button>
 <button
 className="w-14 h-14 rounded-full flex items-center justify-center btn-press"
 style={{ background: 'var(--color-primary)', color: '#fff' }}
 aria-label="Play / Pause"
 >
 <Play className="w-6 h-6 ml-0.5" />
 </button>
 <button className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
 +15s
 </button>
 </div>
 </div>

 <p className="mt-6 text-xs text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 &ldquo;Close your eyes. Bring your attention to your breath. Let each exhale carry away tension, each inhale bring in peace.&rdquo;
 </p>
 </div>
 </div>
 </section>

 {/* ═══ 21-DAY CHALLENGE ══════════════════════════════════════════════ */}
 <section id="challenge" className="py-14 md:py-20">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="grid md:grid-cols-2 gap-10 items-center">
 <div>
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Featured Program
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 21-Day Meditation Challenge
 </h2>
 <p data-reveal="up" data-delay="1" className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-muted)' }}>
 Build a lasting meditation habit in just 21 days. Each day brings a new guided session that progressively deepens your practice. Start with 10 minutes and work up to 25.
 </p>

 <div className="space-y-3 mb-6">
 {[
 'Guided audio session every day',
 'Progress tracking and streaks',
 'Weekly check-in with Kavya Menon',
 'Certificate of completion',
 ].map((item, i) => (
 <div key={i} data-reveal="left" data-delay={String(i + 1)} className="flex items-center gap-2">
 <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
 <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{item}</span>
 </div>
 ))}
 </div>

 <div data-reveal="up" data-delay="5">
 <button
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 Join Free Challenge <ArrowRight className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* Challenge timeline */}
 <div data-reveal="scale-up" data-delay="2" className="p-6 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text)' }}>Challenge Roadmap</h3>
 <div className="space-y-3">
 {challengeDays.map((d) => (
 <div key={d.day} className="flex items-center gap-3">
 <div
 className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold"
 style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}
 >
 {d.day}
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{d.title}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{d.duration}</p>
 </div>
 {d.day <= 3 && (
 <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#ecfdf5', color: '#166534' }}>
 Free
 </span>
 )}
 </div>
 ))}
 <p className="text-xs text-center pt-2" style={{ color: 'var(--color-text-faint)' }}>
 + 15 more days of guided practice
 </p>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ UPCOMING SESSIONS ══════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Book a Session
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Upcoming live meditation sessions
 </h2>

 <div className="grid sm:grid-cols-2 gap-4">
 {upcomingSessions.map((session, i) => (
 <div
 key={session.title}
 data-reveal="up"
 data-delay={String((i % 2) + 1)}
 className="p-5 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
 {session.title}
 </h3>
 <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
 {session.instructor}
 </p>
 <div className="flex items-center gap-3 text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3" /> {session.date}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3" /> {session.time}
 </span>
 <span>{session.duration}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs" style={{ color: session.spots <= 5 ? '#b91c1c' : 'var(--color-text-faint)' }}>
 {session.spots} spots left
 </span>
 <div className="flex items-center gap-2">
 <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
 {session.price === 0 ? 'Free' : `\u20B9${session.price}`}
 </span>
 <button className={buttonClass('primary', 'md')}>
 Book
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ CTA ════════════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 The journey inward begins with a single breath
 </h2>
 <p data-reveal="up" data-delay="1" className="prose-body max-w-md mx-auto mb-8" style={{ color: 'var(--color-text-muted)' }}>
 Start your meditation practice today. No experience needed — our guided sessions meet you exactly where you are.
 </p>
 <div data-reveal="blur" data-delay="2" className="flex items-center justify-center gap-3 flex-wrap">
 <Link
 href="/wellness/yoga"
 className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 Explore Yoga
 </Link>
 <Link
 href="/wellness/vipassana"
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 Vipassana Retreats <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </div>
 </section>

 </div>
 </ScrollReveal>
 );
}
