import type { Metadata } from 'next';
import Link from 'next/link';
import {
 ArrowRight,
 MapPin,
 Calendar,
 Users,
 Clock,
 ChevronDown,
 CheckCircle,
 Eye,
 AlertCircle,
} from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';

export const metadata: Metadata = {
 title: 'Vipassana — 10-Day Retreats & Courses',
 description:
 'Discover Vipassana meditation. Register for upcoming 10-day retreats at centers across India. Preparation guides and FAQs included.',
};

const retreats = [
 {
 id: 'ret-001',
 center: 'Dhamma Pattana',
 location: 'Gorai, Mumbai, Maharashtra',
 dates: 'May 1 - 12, 2026',
 startDate: '2026-05-01',
 capacity: 80,
 registered: 62,
 teacher: 'Acharya Goenkaji',
 type: '10-Day Residential',
 facilities: ['Dormitory', 'Vegetarian Meals', 'Meditation Hall', 'Walking Area'],
 notes: 'This center overlooks the Arabian Sea. Silent practice with separate accommodations for men and women.',
 },
 {
 id: 'ret-002',
 center: 'Dhamma Giri',
 location: 'Igatpuri, Nashik, Maharashtra',
 dates: 'May 15 - 26, 2026',
 startDate: '2026-05-15',
 capacity: 120,
 registered: 95,
 teacher: 'Senior AT',
 type: '10-Day Residential',
 facilities: ['Individual Cells', 'Vegetarian Meals', 'Pagoda', 'Gardens'],
 notes: 'The global headquarters of Vipassana meditation. One of the largest centers in the world, nestled in the Sahyadri hills.',
 },
 {
 id: 'ret-003',
 center: 'Dhamma Bodhi',
 location: 'Bodh Gaya, Bihar',
 dates: 'Jun 1 - 12, 2026',
 startDate: '2026-06-01',
 capacity: 60,
 registered: 28,
 teacher: 'Senior AT',
 type: '10-Day Residential',
 facilities: ['Shared Rooms', 'Vegetarian Meals', 'Meditation Hall', 'Library'],
 notes: 'Located near the Mahabodhi Temple where the Buddha attained enlightenment. A profoundly significant location for meditation practice.',
 },
 {
 id: 'ret-004',
 center: 'Dhamma Sota',
 location: 'Dehradun, Uttarakhand',
 dates: 'Jun 15 - 26, 2026',
 startDate: '2026-06-15',
 capacity: 50,
 registered: 12,
 teacher: 'Senior AT',
 type: '10-Day Residential',
 facilities: ['Dormitory', 'Vegetarian Meals', 'Mountain Views', 'Walking Trails'],
 notes: 'A serene center in the foothills of the Himalayas. Cool climate and natural surroundings support deep practice.',
 },
];

const preparationGuide = [
 {
 title: 'Physical Preparation',
 items: [
 'Start waking up early (4:30 AM) at least 2 weeks before',
 'Practice sitting on the floor for 30+ minutes without moving',
 'Switch to simple vegetarian meals a week before',
 'Get a medical check-up if you have any health concerns',
 ],
 },
 {
 title: 'Mental Preparation',
 items: [
 'Reduce screen time and social media usage gradually',
 'Begin a simple breath awareness practice (10 min daily)',
 'Read about the technique from dhamma.org (avoid other sources)',
 'Set realistic expectations — it is work, not a vacation',
 ],
 },
 {
 title: 'Logistics',
 items: [
 'Register well in advance — popular centers fill up months ahead',
 'Arrange 12 days off from work (travel + course)',
 'Pack simple, loose, comfortable clothing (white or neutral colors)',
 'Leave all phones, books, and writing materials at reception',
 ],
 },
];

const faqs = [
 {
 question: 'What is Vipassana meditation?',
 answer: 'Vipassana means "to see things as they really are." It is one of India\'s oldest meditation techniques, rediscovered by Gotama Buddha 2,500 years ago. The practice involves systematic self-observation — observing body sensations to understand the deep interconnection between mind and body.',
 },
 {
 question: 'Is there a fee for the 10-day course?',
 answer: 'No. The courses are run entirely on a donation basis. All expenses — food, accommodation, teaching — are covered by donations from previous students who wish to share the benefits. You may donate at the end of the course if you wish, but there is no obligation.',
 },
 {
 question: 'Who can attend a Vipassana retreat?',
 answer: 'Anyone who is genuinely willing to follow the discipline and make an honest effort. There are no restrictions based on religion, caste, or nationality. However, those with serious mental health conditions should consult their doctor first. Minimum age is 18 for adult courses (special courses exist for teens).',
 },
 {
 question: 'What does the daily schedule look like?',
 answer: 'The day begins at 4:00 AM and ends at 9:30 PM. There are approximately 10 hours of meditation interspersed with breaks for meals and rest. Noble Silence is observed throughout — no talking, gesturing, or eye contact with other students. Group sittings happen three times daily.',
 },
 {
 question: 'Can I leave the course early if it gets too difficult?',
 answer: 'Students are strongly encouraged to complete the full 10 days, as the technique unfolds progressively. The first 3-4 days are often the most challenging. By day 5 (when the actual Vipassana technique is taught), most students begin to experience significant shifts. Leaving early means missing the most beneficial portion of the course.',
 },
 {
 question: 'Do I need prior meditation experience?',
 answer: 'No prior experience is necessary. The course is designed for both beginners and experienced meditators. Complete instructions are given each day. However, preparing your body for long sitting and early mornings beforehand will help enormously.',
 },
];

export default function VipassanaPage() {
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
 <span>Vipassana</span>
 </nav>

 <h1
 data-reveal="up-far"
 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1]"
 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
 >
 Vipassana:{' '}
 <span style={{ color: 'var(--color-primary)' }}>The Art of Living</span>
 </h1>

 <p data-reveal="up" data-delay="1" className="mt-5 text-sm leading-relaxed max-w-xl" style={{ color: 'var(--color-text-muted)' }}>
 A 2,500-year-old technique of self-observation that leads to the total purification of the mind. Rediscover the deepest levels of your consciousness through 10 days of noble silence.
 </p>

 <div data-reveal="up" data-delay="2" className="mt-8 flex items-center gap-3 flex-wrap">
 <a
 href="#retreats"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 View Retreats <Calendar className="w-4 h-4" />
 </a>
 <a
 href="#what-is"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 Learn More
 </a>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ WHAT IS VIPASSANA ══════════════════════════════════════════════ */}
 <section id="what-is" className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Understanding Vipassana
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Seeing things as they really are
 </h2>

 <div className="space-y-4">
 <p data-reveal="up" data-delay="1" className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 Vipassana is one of the most ancient meditation techniques in India. It was taught by Gotama the Buddha more than 2,500 years ago as a universal remedy for universal ills — an Art of Living. The technique was preserved in its original form in Myanmar (Burma) and re-introduced to India by S.N. Goenka in 1969.
 </p>
 <p data-reveal="up" data-delay="2" className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 The practice involves three steps: <strong style={{ color: 'var(--color-text)' }}>Sila</strong> (moral conduct), <strong style={{ color: 'var(--color-text)' }}>Samadhi</strong> (concentration of mind), and <strong style={{ color: 'var(--color-text)' }}>Panna</strong> (wisdom or insight). Students begin by observing the natural breath to sharpen the mind, then proceed to observe the subtle sensations throughout the body with equanimity.
 </p>
 <p data-reveal="up" data-delay="3" className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 The technique is non-sectarian and universal. It is not a religious practice — it is a method of mental purification that allows one to face life&#39;s tensions and problems in a calm, balanced way. Over the 10-day course, the practice progressively deepens, leading to profound insights about the nature of mind and matter.
 </p>
 </div>

 <div data-reveal="scale-up" data-delay="3" className="mt-8 grid grid-cols-3 gap-4">
 {[
 { label: 'Day 1-3', desc: 'Anapana: Breath observation to sharpen attention' },
 { label: 'Day 4-9', desc: 'Vipassana: Body scanning with equanimity' },
 { label: 'Day 10', desc: 'Metta: Loving-kindness meditation & integration' },
 ].map((phase) => (
 <div key={phase.label} className="p-4 rounded-xl text-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>{phase.label}</p>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{phase.desc}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ UPCOMING RETREATS ══════════════════════════════════════════════ */}
 <section id="retreats" className="py-14 md:py-20">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Retreat Calendar
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Upcoming 10-day retreats
 </h2>

 <div className="space-y-5">
 {retreats.map((retreat, i) => {
 const spotsLeft = retreat.capacity - retreat.registered;
 const fillPercent = Math.round((retreat.registered / retreat.capacity) * 100);
 return (
 <div
 key={retreat.id}
 data-reveal="up"
 data-delay={String(Math.min(i + 1, 4))}
 className="p-5 sm:p-6 rounded-xl"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>
 {retreat.center}
 </h3>
 <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}>
 {retreat.type}
 </span>
 </div>
 <div className="flex flex-wrap items-center gap-4 text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1">
 <MapPin className="w-3 h-3" /> {retreat.location}
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3" /> {retreat.dates}
 </span>
 <span className="flex items-center gap-1">
 <Users className="w-3 h-3" /> {spotsLeft} spots remaining
 </span>
 </div>
 <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-muted)' }}>
 {retreat.notes}
 </p>
 <div className="flex flex-wrap gap-1.5">
 {retreat.facilities.map((f) => (
 <span key={f} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>
 {f}
 </span>
 ))}
 </div>
 </div>

 <div className="sm:text-right shrink-0 space-y-3">
 <div>
 <div className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>
 {fillPercent}% full
 </div>
 <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-offset)' }}>
 <div
 className="h-full rounded-full"
 style={{ width: `${fillPercent}%`, background: fillPercent > 80 ? '#b91c1c' : 'var(--color-primary)' }}
 />
 </div>
 </div>
 <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
 Donation-based
 </div>
 <button
 className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Register <ArrowRight className="w-3 h-3" />
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* ═══ PREPARATION GUIDE ══════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Before You Go
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 How to prepare for your first retreat
 </h2>

 <div className="grid sm:grid-cols-3 gap-5">
 {preparationGuide.map((section, i) => (
 <div
 key={section.title}
 data-reveal="up"
 data-delay={String(i + 1)}
 className="p-5 rounded-xl"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text)' }}>
 {section.title}
 </h3>
 <div className="space-y-2.5">
 {section.items.map((item, j) => (
 <div key={j} className="flex items-start gap-2">
 <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
 <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{item}</span>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ FAQ ════════════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Common Questions
 </p>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Frequently asked questions
 </h2>

 <div className="space-y-4">
 {faqs.map((faq, i) => (
 <details
 key={faq.question}
 data-reveal="up"
 data-delay={String(Math.min(i + 1, 4))}
 className="group rounded-xl overflow-hidden"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <summary
 className="flex items-center justify-between p-5 cursor-pointer text-sm font-medium list-none"
 style={{ color: 'var(--color-text)' }}
 >
 {faq.question}
 <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" style={{ color: 'var(--color-text-faint)' }} />
 </summary>
 <div className="px-5 pb-5">
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 {faq.answer}
 </p>
 </div>
 </details>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ CTA ════════════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-20" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <div data-reveal="fade" className="flex items-center justify-center gap-2 mb-4">
 <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
 Registration fills up months in advance
 </span>
 </div>
 <h2 data-reveal="up" className="text-2xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Ready to take the 10-day journey?
 </h2>
 <p data-reveal="up" data-delay="1" className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--color-text-muted)' }}>
 Register for an upcoming retreat, or start with our online introduction session to learn the basics before committing.
 </p>
 <div data-reveal="blur" data-delay="2" className="flex items-center justify-center gap-3 flex-wrap">
 <a
 href="#retreats"
 className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Register Now <ArrowRight className="w-4 h-4" />
 </a>
 <Link
 href="/wellness/meditation"
 className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 Start with Meditation
 </Link>
 </div>
 </div>
 </section>

 </div>
 </ScrollReveal>
 );
}
