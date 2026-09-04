import type { Metadata } from 'next';
import Link from 'next/link';
import {
 ArrowRight,
 Star,
 Calendar,
 Clock,
 Users,
 Play,
 Sun,
 Flame,
 Wind,
 Zap,
 Moon,
} from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/wellness/yoga' },
 title: 'Yoga — Live Classes & Expert Instructors',
 description:
 'Join live Hatha, Vinyasa, Ashtanga, Kundalini, and Yin yoga sessions with certified instructors. Morning and evening slots available.',
};

const yogaTypes = [
 {
 name: 'Hatha Yoga',
 icon: Sun,
 description: 'Traditional postures held with steady breath. Builds foundation, alignment, and body awareness. Ideal for beginners and intermediate practitioners.',
 difficulty: 'Beginner-Friendly',
 color: 'var(--color-art-2)',
 },
 {
 name: 'Vinyasa Flow',
 icon: Wind,
 description: 'Dynamic breath-synchronized movement. Builds cardiovascular fitness and fluid body control. Each class is a unique creative sequence.',
 difficulty: 'Intermediate',
 color: 'var(--color-art-1)',
 },
 {
 name: 'Ashtanga',
 icon: Flame,
 description: 'Fixed sequence of postures in the Mysore tradition. Builds discipline, strength, and endurance through consistent practice of the Primary Series.',
 difficulty: 'Advanced',
 color: 'var(--color-art-3)',
 },
 {
 name: 'Kundalini',
 icon: Zap,
 description: 'Combines breathwork, mantra, and movement to activate energy centers. Known for its transformative mental and spiritual effects.',
 difficulty: 'All Levels',
 color: 'var(--color-art-2)',
 },
 {
 name: 'Yin Yoga',
 icon: Moon,
 description: 'Slow, passive postures held for 3-5 minutes targeting deep connective tissues. Deeply restorative, excellent for stress relief and flexibility.',
 difficulty: 'Beginner-Friendly',
 color: 'var(--color-art-1)',
 },
];

const instructors = [
 { id: 'inst-001', name: 'Aarav Sharma', specialty: 'Hatha Yoga & Pranayama', experience: 12, rating: 4.9, reviewCount: 342, price: 599 },
 { id: 'inst-002', name: 'Meera Iyer', specialty: 'Vinyasa Flow & Ashtanga', experience: 8, rating: 4.8, reviewCount: 218, price: 499 },
 { id: 'inst-005', name: 'Rajesh Kulkarni', specialty: 'Kundalini Yoga & Sound Bath', experience: 15, rating: 4.8, reviewCount: 276, price: 699 },
 { id: 'inst-006', name: 'Nandini Raghavan', specialty: 'Yin Yoga & Yoga Nidra', experience: 7, rating: 4.6, reviewCount: 154, price: 399 },
 { id: 'inst-003', name: 'Swami Dhyanananda', specialty: 'Guided Meditation & Pranayama', experience: 20, rating: 4.9, reviewCount: 512, price: 799 },
 { id: 'inst-008', name: 'Kavya Menon', specialty: 'Meditation & Beginners Yoga', experience: 6, rating: 4.5, reviewCount: 98, price: 299 },
];

const schedule = [
 { time: '5:30 AM', title: 'Sunrise Pranayama', instructor: 'Aarav Sharma', type: 'Pranayama', duration: '30 min', spots: 15, slot: 'morning' },
 { time: '6:00 AM', title: 'Morning Hatha Flow', instructor: 'Aarav Sharma', type: 'Hatha', duration: '60 min', spots: 8, slot: 'morning' },
 { time: '6:00 AM', title: 'Kundalini Awakening', instructor: 'Rajesh Kulkarni', type: 'Kundalini', duration: '90 min', spots: 6, slot: 'morning' },
 { time: '7:00 AM', title: 'Power Vinyasa', instructor: 'Meera Iyer', type: 'Vinyasa', duration: '75 min', spots: 5, slot: 'morning' },
 { time: '7:00 AM', title: 'Ashtanga Primary Series', instructor: 'Meera Iyer', type: 'Ashtanga', duration: '90 min', spots: 4, slot: 'morning' },
 { time: '5:30 PM', title: 'Evening Vinyasa Flow', instructor: 'Meera Iyer', type: 'Vinyasa', duration: '60 min', spots: 10, slot: 'evening' },
 { time: '6:00 PM', title: 'Hatha & Stretch', instructor: 'Aarav Sharma', type: 'Hatha', duration: '60 min', spots: 12, slot: 'evening' },
 { time: '8:00 PM', title: 'Yin & Restore', instructor: 'Nandini Raghavan', type: 'Yin', duration: '60 min', spots: 15, slot: 'evening' },
];

const videoLibrary = [
 { title: 'Hatha Basics: Sun Salutation A & B', instructor: 'Aarav Sharma', duration: '25 min', views: '12.4K', level: 'Beginner' },
 { title: 'Vinyasa Flow for Core Strength', instructor: 'Meera Iyer', duration: '40 min', views: '8.7K', level: 'Intermediate' },
 { title: 'Kundalini Kriya for Energy', instructor: 'Rajesh Kulkarni', duration: '35 min', views: '6.2K', level: 'All Levels' },
 { title: 'Yin Yoga: Hip Opening Sequence', instructor: 'Nandini Raghavan', duration: '50 min', views: '9.1K', level: 'Beginner' },
 { title: 'Ashtanga Standing Sequence', instructor: 'Meera Iyer', duration: '45 min', views: '5.8K', level: 'Advanced' },
 { title: 'Pranayama Masterclass: 5 Techniques', instructor: 'Aarav Sharma', duration: '30 min', views: '15.3K', level: 'All Levels' },
];

export default function YogaPage() {
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
 <span>Yoga</span>
 </nav>

 <h1
 data-reveal="up-far"
 className={H1.catalogue}
 >
 Live Yoga Classes with{' '}
 <span style={{ color: 'var(--color-primary)' }}>Expert Instructors</span>
 </h1>

 <p data-reveal="up" data-delay="1" className="mt-5 prose-body leading-relaxed max-w-xl" style={{ color: 'var(--color-text-muted)' }}>
 From gentle Hatha to powerful Ashtanga, find the style that resonates with you. Morning and evening sessions, private bookings, and a growing video library.
 </p>

 <div data-reveal="up" data-delay="2" className="mt-8 flex items-center gap-3 flex-wrap">
 <a
 href="#schedule"
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 View Schedule <Calendar className="w-4 h-4" />
 </a>
 <a
 href="#instructors"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 Meet Instructors
 </a>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ YOGA TYPES ═════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Styles We Offer
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Five paths, one destination
 </h2>

 <div className="space-y-4">
 {yogaTypes.map((type, i) => {
 const Icon = type.icon;
 return (
 <div
 key={type.name}
 data-reveal="left"
 data-delay={String(Math.min(i + 1, 5))}
 className="flex items-start gap-4 p-5 rounded-xl"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: type.color }}>
 <Icon className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{type.name}</h3>
 <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>
 {type.difficulty}
 </span>
 </div>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 {type.description}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* ═══ INSTRUCTORS ════════════════════════════════════════════════════ */}
 <section id="instructors" className="py-14 md:py-20">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Instructors
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Learn from the best
 </h2>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {instructors.map((inst, i) => (
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
 </div>
 </div>
 <div className="mt-4 flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <div className="flex items-center gap-3">
 <span className="flex items-center gap-0.5">
 <Star className="w-3 h-3 fill-current" style={{ color: '#D4A438' }} /> {inst.rating}
 </span>
 <span>{inst.reviewCount} reviews</span>
 <span>{inst.experience} yrs exp</span>
 </div>
 <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
 &#8377;{inst.price}
 </span>
 </div>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ SCHEDULE ═══════════════════════════════════════════════════════ */}
 <section id="schedule" className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Weekly Schedule
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Morning &amp; evening sessions
 </h2>

 {/* Morning */}
 <div className="mb-10">
 <h3 data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
 <Sun className="w-3.5 h-3.5" style={{ color: '#D4A438' }} /> Morning Sessions
 </h3>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {schedule.filter((s) => s.slot === 'morning').map((s, i) => (
 <div
 key={`m-${i}`}
 data-reveal="up"
 data-delay={String((i % 3) + 1)}
 className="p-4 rounded-xl"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
 <Clock className="w-3 h-3" /> {s.time}
 </span>
 <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>
 {s.type}
 </span>
 </div>
 <h4 className="text-sm font-medium mb-0.5" style={{ color: 'var(--color-text)' }}>{s.title}</h4>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.instructor} &middot; {s.duration}</p>
 <div className="mt-2 flex items-center justify-between">
 <span className="text-xs" style={{ color: s.spots <= 5 ? '#b91c1c' : 'var(--color-text-faint)' }}>
 {s.spots} spots left
 </span>
 <button className={buttonClass('primary', 'md')}>
 Book
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Evening */}
 <div>
 <h3 data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
 <Moon className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} /> Evening Sessions
 </h3>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {schedule.filter((s) => s.slot === 'evening').map((s, i) => (
 <div
 key={`e-${i}`}
 data-reveal="up"
 data-delay={String((i % 3) + 1)}
 className="p-4 rounded-xl"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
 <Clock className="w-3 h-3" /> {s.time}
 </span>
 <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>
 {s.type}
 </span>
 </div>
 <h4 className="text-sm font-medium mb-0.5" style={{ color: 'var(--color-text)' }}>{s.title}</h4>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.instructor} &middot; {s.duration}</p>
 <div className="mt-2 flex items-center justify-between">
 <span className="text-xs" style={{ color: s.spots <= 5 ? '#b91c1c' : 'var(--color-text-faint)' }}>
 {s.spots} spots left
 </span>
 <button className={buttonClass('primary', 'md')}>
 Book
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ═══ VIDEO LIBRARY ══════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Video Library
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Practice anytime with recorded sessions
 </h2>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {videoLibrary.map((vid, i) => (
 <div
 key={vid.title}
 data-reveal="rotate"
 data-delay={String((i % 3) + 1)}
 className="rounded-xl overflow-hidden card-hover"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 {/* Thumbnail placeholder */}
 <div className="relative aspect-video flex items-center justify-center" style={{ background: 'var(--color-surface-offset)' }}>
 <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)' }}>
 <Play className="w-5 h-5 ml-0.5" style={{ color: 'var(--color-text)' }} />
 </div>
 <span className="absolute bottom-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
 {vid.duration}
 </span>
 </div>
 <div className="p-4">
 <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{vid.title}</h3>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
 {vid.instructor} &middot; {vid.views} views
 </p>
 <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>
 {vid.level}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ CTA ════════════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Ready to step on the mat?
 </h2>
 <p data-reveal="up" data-delay="1" className="prose-body max-w-md mx-auto mb-8" style={{ color: 'var(--color-text-muted)' }}>
 Book a private session or join a group class. First-time students get 50% off their first session.
 </p>
 <div data-reveal="blur" data-delay="2">
 <Link
 href="/wellness"
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 Book a Session <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </div>
 </section>

 </div>
 </ScrollReveal>
 );
}
