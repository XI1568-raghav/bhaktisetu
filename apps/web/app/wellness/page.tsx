import type { Metadata } from 'next';
import Link from 'next/link';
import {
 ArrowRight,
 Star,
 Calendar,
 Clock,
 Users,
 Heart,
 Leaf,
 Sun,
 Wind,
 Eye,
 Sparkles,
} from 'lucide-react';
import ScrollReveal from '../../components/ScrollReveal';

export const metadata: Metadata = {
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
 sessions: '40+ weekly sessions',
 },
 {
 title: 'Meditation',
 href: '/wellness/meditation',
 icon: Wind,
 color: 'var(--color-art-1)',
 description:
 'Guided meditation, Transcendental, Mindfulness, Chakra healing, and Sound bath experiences.',
 sessions: '25+ weekly sessions',
 },
 {
 title: 'Vipassana',
 href: '/wellness/vipassana',
 icon: Eye,
 color: 'var(--color-art-3)',
 description:
 '10-day residential retreats, preparatory courses, and introductory sessions in the S.N. Goenka tradition.',
 sessions: '4 retreats/month',
 },
];

const featuredInstructors = [
 { id: 'inst-001', name: 'Aarav Sharma', specialty: 'Hatha Yoga & Pranayama', rating: 4.9, experience: 12, price: 599, category: 'yoga' },
 { id: 'inst-003', name: 'Swami Dhyanananda', specialty: 'Guided & Transcendental Meditation', rating: 4.9, experience: 20, price: 799, category: 'meditation' },
 { id: 'inst-005', name: 'Rajesh Kulkarni', specialty: 'Kundalini Yoga & Sound Bath', rating: 4.8, experience: 15, price: 699, category: 'yoga' },
 { id: 'inst-007', name: 'Acharya Goenkaji', specialty: 'Vipassana & Insight Meditation', rating: 4.9, experience: 25, price: 999, category: 'vipassana' },
 { id: 'inst-002', name: 'Meera Iyer', specialty: 'Vinyasa Flow & Ashtanga', rating: 4.8, experience: 8, price: 499, category: 'yoga' },
 { id: 'inst-004', name: 'Anita Desai', specialty: 'Mindfulness & Chakra Meditation', rating: 4.7, experience: 10, price: 449, category: 'meditation' },
];

const upcomingSessions = [
 { id: 'ses-001', title: 'Morning Hatha Flow', instructor: 'Aarav Sharma', date: 'Apr 18', time: '6:00 AM', duration: '60 min', spotsLeft: 8, category: 'yoga' },
 { id: 'ses-003', title: 'Guided Morning Meditation', instructor: 'Swami Dhyanananda', date: 'Apr 18', time: '5:30 AM', duration: '45 min', spotsLeft: 20, category: 'meditation' },
 { id: 'ses-005', title: 'Kundalini Awakening', instructor: 'Rajesh Kulkarni', date: 'Apr 19', time: '6:00 AM', duration: '90 min', spotsLeft: 6, category: 'yoga' },
 { id: 'ses-007', title: 'Vipassana Introduction', instructor: 'Acharya Goenkaji', date: 'Apr 20', time: '5:00 AM', duration: '120 min', spotsLeft: 10, category: 'vipassana' },
 { id: 'ses-009', title: 'Sound Bath Healing', instructor: 'Rajesh Kulkarni', date: 'Apr 21', time: '7:00 PM', duration: '60 min', spotsLeft: 3, category: 'meditation' },
 { id: 'ses-004', title: 'Chakra Alignment', instructor: 'Anita Desai', date: 'Apr 19', time: '7:00 PM', duration: '60 min', spotsLeft: 12, category: 'meditation' },
];

const benefits = [
 { title: 'Reduce Stress & Anxiety', description: 'Regular practice lowers cortisol levels and activates the parasympathetic nervous system for deep calm.' },
 { title: 'Improve Flexibility & Strength', description: 'Yoga postures build functional strength while increasing range of motion in joints and muscles.' },
 { title: 'Sharpen Focus & Clarity', description: 'Meditation trains the mind to sustain attention, improving productivity and decision-making.' },
 { title: 'Better Sleep Quality', description: 'Evening practices like Yin Yoga and Yoga Nidra promote deep, restorative sleep cycles.' },
 { title: 'Emotional Resilience', description: 'Vipassana and mindfulness develop equanimity — the ability to remain balanced through life\'s ups and downs.' },
 { title: 'Community & Connection', description: 'Join a sangha of practitioners who support each other on the path to inner peace.' },
];

function getCategoryBadgeColor(category: string) {
 switch (category) {
 case 'yoga': return { bg: 'var(--color-art-2)', text: 'var(--color-primary-active)' };
 case 'meditation': return { bg: 'var(--color-art-1)', text: '#1a5c4a' };
 case 'vipassana': return { bg: 'var(--color-art-3)', text: 'var(--color-text)' };
 default: return { bg: 'var(--color-surface-offset)', text: 'var(--color-text-muted)' };
 }
}

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
 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1]"
 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
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
 href="/wellness/yoga"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Explore Yoga <ArrowRight className="w-4 h-4" />
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
 <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>8</span> Instructors</div>
 <div className="w-px h-5" style={{ background: 'var(--color-divider)' }} />
 <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>65+</span> Weekly sessions</div>
 <div className="w-px h-5" style={{ background: 'var(--color-divider)' }} />
 <div><span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>4.8</span> Avg rating</div>
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

 {/* ═══ FEATURED INSTRUCTORS ═══════════════════════════════════════════ */}
 <section className="py-14 md:py-20">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Our Instructors
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Learn from experienced practitioners
 </h2>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {featuredInstructors.map((inst, i) => {
 const badge = getCategoryBadgeColor(inst.category);
 return (
 <Link
 key={inst.id}
 href={`/wellness/instructors/${inst.id}`}
 data-reveal="scale-up"
 data-delay={String((i % 3) + 1)}
 className="group p-5 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <div className="flex items-start gap-4">
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
 <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
 {inst.specialty}
 </p>
 <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-0.5">
 <Star className="w-3 h-3 fill-current" style={{ color: '#D4A438' }} />
 {inst.rating}
 </span>
 <span>{inst.experience} yrs</span>
 <span style={{ color: 'var(--color-primary)' }}>
 &#8377;{inst.price}/session
 </span>
 </div>
 </div>
 </div>
 <div className="mt-3">
 <span
 className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
 style={{ background: badge.bg, color: badge.text }}
 >
 {inst.category}
 </span>
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 </section>

 {/* ═══ UPCOMING SESSIONS ══════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-end justify-between mb-10">
 <div>
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Live Sessions
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Upcoming this week
 </h2>
 </div>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {upcomingSessions.map((session, i) => {
 const badge = getCategoryBadgeColor(session.category);
 return (
 <Link
 key={session.id}
 href={`/wellness/${session.category}`}
 data-reveal="up"
 data-delay={String((i % 3) + 1)}
 className="block p-4 rounded-xl card-hover transition-all"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <div className="flex items-center justify-between mb-3">
 <span
 className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
 style={{ background: badge.bg, color: badge.text }}
 >
 {session.category}
 </span>
 <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: session.spotsLeft <= 5 ? '#fef2f2' : 'var(--color-surface-offset)', color: session.spotsLeft <= 5 ? '#b91c1c' : 'var(--color-text-muted)' }}>
 {session.spotsLeft} spots left
 </span>
 </div>
 <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
 {session.title}
 </h3>
 <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
 {session.instructor}
 </p>
 <div className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <div className="flex items-center gap-3">
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3" /> {session.date}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3" /> {session.time}
 </span>
 </div>
 <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
 Book →
 </span>
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 </section>

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

 </div>
 </ScrollReveal>
 );
}
