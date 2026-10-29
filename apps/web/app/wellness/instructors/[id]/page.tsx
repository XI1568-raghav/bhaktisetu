import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
 Star,
 Calendar,
 Clock,
 Award,
 Globe,
 CheckCircle,
 MessageSquare,
} from 'lucide-react';
import ScrollReveal from '../../../../components/ScrollReveal';
import WellnessEnrolButton from './WellnessEnrolButton';
// CI-05: this profile's only exits were /wellness and the category listing;
// the section's bookable unit is /wellness/classes/<id> and nothing here
// reached it. InstructorClasses resolves this instructor's real upcoming
// classes from the live feed and falls back to the catalogue, never to a
// bare /wellness.
import InstructorClasses from './InstructorClasses';
import RealInstructorProfile from './RealInstructorProfile';
import { H1 } from '../../../../components/ui/heading-recipe';
import { HAS_VERIFIED_INSTRUCTORS, SAMPLE_INSTRUCTOR_NOTE } from '../../../../lib/launch-gates';

// ─── Static instructor data (mirrors API) ──────────────────────────────────

const instructors: Record<string, {
 id: string;
 name: string;
 specialty: string[];
 category: string;
 experience: number;
 rating: number;
 reviewCount: number;
 pricePerSession: number;
 bio: string;
 certifications: string[];
 languages: string[];
 availableSlots: Array<{ day: string; time: string }>;
 reviews: Array<{ author: string; rating: number; text: string; date: string }>;
}> = {
 'inst-001': {
 id: 'inst-001', name: 'Aarav Sharma', specialty: ['Hatha Yoga', 'Pranayama'], category: 'yoga', experience: 12, rating: 4.9, reviewCount: 342, pricePerSession: 599,
 bio: 'Trained at the Bihar School of Yoga, Aarav has spent 12 years teaching Hatha and Pranayama across India and Southeast Asia. His classes emphasize breath-body alignment and are suitable for all levels. He has trained over 5,000 students and conducted 200+ workshops.',
 certifications: ['E-RYT 500', 'Bihar School of Yoga Diploma', 'Yoga Alliance India'],
 languages: ['Hindi', 'English'],
 availableSlots: [
 { day: 'Mon', time: '06:00 AM' }, { day: 'Mon', time: '06:00 PM' },
 { day: 'Wed', time: '06:00 AM' }, { day: 'Wed', time: '06:00 PM' },
 { day: 'Fri', time: '06:00 AM' }, { day: 'Sat', time: '07:00 AM' },
 ],
 reviews: [
 { author: 'Priya M.', rating: 5, text: 'Aarav sir transformed my morning routine. His pranayama guidance is exceptional.', date: '2026-03-12' },
 { author: 'Rohit K.', rating: 5, text: 'Best Hatha yoga teacher I have found online. Very patient and attentive.', date: '2026-02-28' },
 { author: 'Sneha D.', rating: 4, text: 'Good sessions, wish they were longer. Very knowledgeable instructor.', date: '2026-01-15' },
 ],
 },
 'inst-002': {
 id: 'inst-002', name: 'Meera Iyer', specialty: ['Vinyasa Flow', 'Ashtanga'], category: 'yoga', experience: 8, rating: 4.8, reviewCount: 218, pricePerSession: 499,
 bio: 'Meera discovered yoga during her college years in Mysore and went on to train under Sharath Jois. She specializes in dynamic Vinyasa flows and traditional Ashtanga sequences that build strength and flexibility. Her teaching is precise, energetic, and deeply rooted in the Mysore tradition.',
 certifications: ['RYT 500', 'Ashtanga Yoga Mysore Certification', 'KPJAYI Authorized'],
 languages: ['English', 'Tamil', 'Hindi'],
 availableSlots: [
 { day: 'Tue', time: '07:00 AM' }, { day: 'Tue', time: '05:30 PM' },
 { day: 'Thu', time: '07:00 AM' }, { day: 'Thu', time: '05:30 PM' },
 { day: 'Sat', time: '08:00 AM' },
 ],
 reviews: [
 { author: 'Ananya S.', rating: 5, text: 'Her Vinyasa flow classes are incredibly well-sequenced. I feel energized after every session.', date: '2026-03-20' },
 { author: 'Dev P.', rating: 5, text: 'Meera makes Ashtanga accessible even for beginners.', date: '2026-02-10' },
 ],
 },
 'inst-003': {
 id: 'inst-003', name: 'Swami Dhyanananda', specialty: ['Guided Meditation', 'Transcendental Meditation'], category: 'meditation', experience: 20, rating: 4.9, reviewCount: 512, pricePerSession: 799,
 bio: 'Swami Dhyanananda spent 8 years in silent retreat at Rishikesh ashrams before beginning to teach. His meditation sessions draw from Vedantic traditions and are known for their profound depth and transformative effect. He has guided over 10,000 students into deeper states of consciousness.',
 certifications: ['Sivananda Yoga Vedanta', 'Transcendental Meditation Teacher', 'Vedanta Academy Graduate'],
 languages: ['Hindi', 'English', 'Sanskrit'],
 availableSlots: [
 { day: 'Mon', time: '05:30 AM' }, { day: 'Wed', time: '05:30 AM' },
 { day: 'Fri', time: '05:30 AM' }, { day: 'Sun', time: '06:00 AM' },
 ],
 reviews: [
 { author: 'Kavita R.', rating: 5, text: 'Swamiji\'s guided meditations have completely changed my relationship with stillness.', date: '2026-04-01' },
 { author: 'Arjun N.', rating: 5, text: 'The most peaceful meditation sessions I have experienced. His voice alone calms the mind.', date: '2026-03-15' },
 { author: 'Lakshmi V.', rating: 5, text: 'After 21 days with Swamiji, my anxiety reduced significantly. Truly grateful.', date: '2026-02-20' },
 ],
 },
 'inst-004': {
 id: 'inst-004', name: 'Anita Desai', specialty: ['Mindfulness', 'Chakra Meditation'], category: 'meditation', experience: 10, rating: 4.7, reviewCount: 189, pricePerSession: 449,
 bio: 'Anita combines modern mindfulness techniques with traditional chakra work. Having trained at Spirit Rock and in India, she bridges Eastern wisdom with Western psychology to make meditation accessible to everyone. Her approach is practical, warm, and grounded in clinical evidence.',
 certifications: ['MBSR Certified', 'Spirit Rock Teacher Training', 'Chakra Healing Diploma'],
 languages: ['Hindi', 'English', 'Marathi'],
 availableSlots: [
 { day: 'Mon', time: '07:00 AM' }, { day: 'Mon', time: '07:00 PM' },
 { day: 'Tue', time: '07:00 PM' }, { day: 'Thu', time: '07:00 AM' },
 { day: 'Sat', time: '09:00 AM' },
 ],
 reviews: [
 { author: 'Neha G.', rating: 5, text: 'Anita explains chakras in a way that actually makes sense. No woo-woo, just clarity.', date: '2026-03-18' },
 { author: 'Vikram T.', rating: 4, text: 'Good mindfulness sessions, helped me focus better at work.', date: '2026-02-05' },
 ],
 },
 'inst-005': {
 id: 'inst-005', name: 'Rajesh Kulkarni', specialty: ['Kundalini Yoga', 'Sound Bath'], category: 'yoga', experience: 15, rating: 4.8, reviewCount: 276, pricePerSession: 699,
 bio: 'Rajesh trained at the Kundalini Research Institute and has been teaching for 15 years. His sessions weave together breathwork, mantra, and movement to awaken dormant energy. He also conducts powerful sound bath healing sessions using Tibetan singing bowls, crystal bowls, and gongs.',
 certifications: ['KRI Level 2', 'Sound Healing Practitioner', 'Yoga Alliance E-RYT 200'],
 languages: ['Hindi', 'English', 'Kannada'],
 availableSlots: [
 { day: 'Tue', time: '06:00 AM' }, { day: 'Thu', time: '06:00 AM' },
 { day: 'Sat', time: '06:00 AM' }, { day: 'Sun', time: '07:00 AM' },
 ],
 reviews: [
 { author: 'Pooja M.', rating: 5, text: 'The sound bath was unlike anything I have experienced. Deeply healing.', date: '2026-03-25' },
 { author: 'Amit S.', rating: 5, text: 'Rajesh sir\'s Kundalini classes are intense but transformative. Highly recommend.', date: '2026-02-14' },
 ],
 },
 'inst-006': {
 id: 'inst-006', name: 'Nandini Raghavan', specialty: ['Yin Yoga', 'Yoga Nidra'], category: 'yoga', experience: 7, rating: 4.6, reviewCount: 154, pricePerSession: 399,
 bio: 'Nandini specializes in slower, restorative practices. Her Yin Yoga sessions target deep connective tissue while Yoga Nidra classes guide students into conscious sleep states for deep restoration and healing. She brings a gentle, nurturing energy to every session.',
 certifications: ['RYT 200', 'Yin Yoga Teacher Training (Paul Grilley lineage)', 'iRest Yoga Nidra Level 1'],
 languages: ['English', 'Tamil'],
 availableSlots: [
 { day: 'Mon', time: '08:00 PM' }, { day: 'Wed', time: '08:00 PM' },
 { day: 'Fri', time: '08:00 PM' }, { day: 'Sun', time: '09:00 AM' },
 ],
 reviews: [
 { author: 'Ritika J.', rating: 5, text: 'Her Yoga Nidra sessions are the best sleep medicine. I wake up feeling completely renewed.', date: '2026-04-02' },
 { author: 'Sanjay L.', rating: 4, text: 'Very calming Yin sessions. Exactly what I needed after long work days.', date: '2026-03-01' },
 ],
 },
 'inst-007': {
 id: 'inst-007', name: 'Acharya Goenkaji', specialty: ['Vipassana', 'Insight Meditation'], category: 'vipassana', experience: 25, rating: 4.9, reviewCount: 687, pricePerSession: 999,
 bio: 'Acharya Goenkaji has been a Vipassana teacher for over 25 years, having trained in the tradition of S.N. Goenka. He leads 10-day residential retreats and preparatory courses, helping thousands of students discover the art of living through self-observation. His teaching is marked by precision, patience, and deep compassion.',
 certifications: ['Vipassana Assistant Teacher (Goenka tradition)', 'Dhamma Seva Leader'],
 languages: ['Hindi', 'English', 'Gujarati'],
 availableSlots: [
 { day: 'Sat', time: '05:00 AM' }, { day: 'Sun', time: '05:00 AM' },
 ],
 reviews: [
 { author: 'Manoj K.', rating: 5, text: 'The 10-day retreat with Acharyaji was the most profound experience of my life.', date: '2026-03-30' },
 { author: 'Deepa B.', rating: 5, text: 'His preparatory sessions set me up perfectly for my first Vipassana retreat.', date: '2026-02-22' },
 { author: 'Suresh P.', rating: 5, text: 'Clear, patient, deeply wise. Acharyaji embodies everything he teaches.', date: '2026-01-10' },
 ],
 },
 'inst-008': {
 id: 'inst-008', name: 'Kavya Menon', specialty: ['Meditation', 'Vipassana Preparation'], category: 'meditation', experience: 6, rating: 4.5, reviewCount: 98, pricePerSession: 299,
 bio: 'Kavya is one of the youngest meditation teachers on the platform. After completing her first Vipassana at age 18, she went on to study contemplative psychology. She now guides beginners through their first meditation experiences with warmth, patience, and clarity.',
 certifications: ['Vipassana Meditator (30+ retreats)', 'MBCT Practitioner', 'Contemplative Psychology Certificate'],
 languages: ['Hindi', 'English', 'Malayalam'],
 availableSlots: [
 { day: 'Mon', time: '06:30 AM' }, { day: 'Tue', time: '06:30 AM' },
 { day: 'Wed', time: '06:30 AM' }, { day: 'Thu', time: '06:30 AM' },
 { day: 'Fri', time: '06:30 AM' }, { day: 'Sat', time: '08:00 AM' },
 ],
 reviews: [
 { author: 'Ishaan R.', rating: 5, text: 'Kavya makes meditation feel approachable. Perfect for someone like me who overthinks everything.', date: '2026-04-05' },
 { author: 'Megha T.', rating: 4, text: 'Good introductory sessions. She is patient and explains things clearly.', date: '2026-03-08' },
 ],
 },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateStaticParams() {
 return Object.keys(instructors).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
 const { id } = await params;
 const inst = instructors[id];
 if (!inst && UUID_RE.test(id)) {
 // A real listed instructor (see RealInstructorProfile). The record is fetched client-side, so the
 // title is section-level rather than the instructor's name.
 return {
 title: 'Wellness Instructor',
 alternates: { canonical: `https://darshya.online/wellness/instructors/${id}` },
 description: 'A yoga, meditation or pranayama instructor listed on Darshya: what they teach and their upcoming live classes.',
 };
 }
 if (!inst) return { title: 'Instructor Not Found' };
 return {
 title: `${inst.name} — ${inst.specialty.join(', ')}`,
 alternates: { canonical: `https://darshya.online/wellness/instructors/${id}` },
 description: HAS_VERIFIED_INSTRUCTORS
 ? inst.bio.slice(0, 160)
 : `Sample ${inst.category} instructor profile: ${inst.specialty.join(', ')}.`,
 };
}

export default async function InstructorDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const inst = instructors[id];

 if (!inst && UUID_RE.test(id)) return <RealInstructorProfile id={id} />;
 // Not a fixture and not a profile id: a real 404, not a 200 page that says "not found".
 if (!inst) notFound();

 const categoryLink = inst.category === 'vipassana' ? '/wellness/vipassana' : inst.category === 'meditation' ? '/wellness/meditation' : '/wellness/yoga';
 const categoryLabel = inst.category === 'vipassana' ? 'Vipassana' : inst.category === 'meditation' ? 'meditation' : 'yoga';

 return (
 <ScrollReveal>
 <div style={{ background: 'var(--color-bg)' }}>

 {/* ═══ HEADER ═════════════════════════════════════════════════════════ */}
 <section className="py-16 md:py-20">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <nav data-reveal="fade" className="flex items-center gap-1.5 text-xs mb-8" style={{ color: 'var(--color-text-muted)' }}>
 <Link href="/wellness" className="hover:underline" style={{ color: 'var(--color-primary)' }}>Wellness</Link>
 <span>/</span>
 <Link href={categoryLink} className="hover:underline capitalize" style={{ color: 'var(--color-primary)' }}>{inst.category}</Link>
 <span>/</span>
 <span>{inst.name}</span>
 </nav>

 <div data-reveal="up" className="flex flex-col sm:flex-row items-start gap-6">
 {/* Avatar */}
 <div
 className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 text-2xl font-semibold"
 style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}
 >
 {inst.name.split(' ').map((n) => n[0]).join('')}
 </div>

 <div className="flex-1">
 <h1 className={H1.portal}>
 {inst.name}
 </h1>
 <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
 {inst.specialty.join(' &bull; ')}
 </p>

 <div className="flex flex-wrap items-center gap-4 mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 {HAS_VERIFIED_INSTRUCTORS && (
 <span className="flex items-center gap-1">
 <Star className="w-3.5 h-3.5 fill-current" style={{ color: '#D4A438' }} />
 <strong style={{ color: 'var(--color-text)' }}>{inst.rating}</strong> ({inst.reviewCount} reviews)
 </span>
 )}
 {HAS_VERIFIED_INSTRUCTORS && (
 <span className="flex items-center gap-1">
 <Award className="w-3.5 h-3.5" /> {inst.experience} years experience
 </span>
 )}
 <span className="flex items-center gap-1">
 <Globe className="w-3.5 h-3.5" /> {inst.languages.join(', ')}
 </span>
 </div>

 {!HAS_VERIFIED_INSTRUCTORS && (
 <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{SAMPLE_INSTRUCTOR_NOTE}</p>
 )}

 <div className="flex items-center gap-3 mt-5">
 <span className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>
 &#8377;{inst.pricePerSession}
 </span>
 <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>per session</span>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ BIO ════════════════════════════════════════════════════════════ */}
 <section className="py-10" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: 'var(--color-primary)' }}>
 About
 </h2>
 <p data-reveal="up" className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 {HAS_VERIFIED_INSTRUCTORS
 ? inst.bio
 : `Sample listing for a ${categoryLabel} instructor teaching ${inst.specialty.join(' and ')}. A real profile shows the teacher's own description once verified.`}
 </p>

 {/* Certifications */}
 {HAS_VERIFIED_INSTRUCTORS && (
 <div className="mt-6">
 <h3 data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Certifications
 </h3>
 <div className="flex flex-wrap gap-2">
 {inst.certifications.map((cert) => (
 <span
 key={cert}
 data-reveal="fade"
 className="text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
 style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}
 >
 <Award className="w-3 h-3" /> {cert}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 </section>

 {/* ═══ AVAILABLE SLOTS ════════════════════════════════════════════════ */}
 <section className="py-14 md:py-16">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary)' }}>
 Available Time Slots
 </h2>
 <p data-reveal="up" className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
 Select a slot to book your session with {inst.name.split(' ')[0]}.
 </p>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {inst.availableSlots.map((slot, i) => (
 <button
 key={`${slot.day}-${slot.time}`}
 data-reveal="scale-up"
 data-delay={String(Math.min(i + 1, 6))}
 className="p-4 rounded-xl text-left card-hover transition-all"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{slot.day}</p>
 <p className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--color-text-muted)' }}>
 <Clock className="w-3 h-3" /> {slot.time}
 </p>
 </button>
 ))}
 </div>

 <div data-reveal="up" className="mt-8">
 <WellnessEnrolButton
   instructorId={inst.id}
   instructorName={inst.name}
   plan="consultation"
   variant="primary"
   label="Book Consultation"
 />
 </div>
 </div>
 </section>

 {HAS_VERIFIED_INSTRUCTORS && (
 <>
 {/* ═══ REVIEWS ════════════════════════════════════════════════════════ */}
 <section className="py-14 md:py-16" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h2 data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>
 Reviews
 </h2>
 <p data-reveal="up" className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
 What students say about {inst.name.split(' ')[0]}
 </p>
 </div>
 <div data-reveal="fade" className="flex items-center gap-1 text-sm">
 <Star className="w-4 h-4 fill-current" style={{ color: '#D4A438' }} />
 <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{inst.rating}</span>
 <span style={{ color: 'var(--color-text-faint)' }}>/ 5</span>
 </div>
 </div>

 <div className="space-y-4">
 {inst.reviews.map((review, i) => (
 <div
 key={`${review.author}-${i}`}
 data-reveal="up"
 data-delay={String(Math.min(i + 1, 3))}
 className="p-5 rounded-xl"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
 >
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <div
 className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
 style={{ background: 'var(--color-art-2)', color: 'var(--color-primary-active)' }}
 >
 {review.author[0]}
 </div>
 <div>
 <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{review.author}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{review.date}</p>
 </div>
 </div>
 <div className="flex items-center gap-0.5">
 {Array.from({ length: review.rating }, (_, j) => (
 <Star key={j} className="w-3 h-3 fill-current" style={{ color: '#D4A438' }} />
 ))}
 </div>
 </div>
 <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 {review.text}
 </p>
 </div>
 ))}
 </div>
 </div>
 </section>
 </>
 )}

 {/* ═══ SESSION PRICING ════════════════════════════════════════════════ */}
 <section className="py-14 md:py-16">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: 'var(--color-primary)' }}>
 Session Pricing
 </h2>

 <div className="grid sm:grid-cols-3 gap-4">
 {([
 { slug: 'single' as const, label: 'Single Session', price: inst.pricePerSession, desc: 'One-on-one 60 min session', highlight: false },
 { slug: 'pack5' as const, label: '5 Session Pack', price: Math.round(inst.pricePerSession * 4.5), desc: 'Save 10% — valid for 30 days', highlight: true },
 { slug: 'pack10' as const, label: '10 Session Pack', price: Math.round(inst.pricePerSession * 8), desc: 'Save 20% — valid for 60 days', highlight: false },
 ]).map((plan) => (
 <div
 key={plan.label}
 data-reveal="scale-up"
 className="p-5 rounded-xl text-center"
 style={{
 background: plan.highlight ? 'var(--color-primary)' : 'var(--color-surface)',
 border: plan.highlight ? 'none' : '1px solid var(--color-border)',
 color: plan.highlight ? '#fff' : 'var(--color-text)',
 }}
 >
 {plan.highlight && (
 <span className="text-xs font-medium px-2 py-0.5 rounded-full mb-2 inline-block" style={{ background: 'rgba(255,255,255,0.2)' }}>
 Most Popular
 </span>
 )}
 <p className="text-xs font-medium mb-1" style={{ opacity: plan.highlight ? 0.9 : undefined, color: plan.highlight ? undefined : 'var(--color-text-muted)' }}>
 {plan.label}
 </p>
 <p className="text-2xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
 &#8377;{plan.price.toLocaleString('en-IN')}
 </p>
 <p className="text-xs mb-4" style={{ opacity: plan.highlight ? 0.8 : undefined, color: plan.highlight ? undefined : 'var(--color-text-faint)' }}>
 {plan.desc}
 </p>
 <WellnessEnrolButton
   instructorId={inst.id}
   instructorName={inst.name}
   plan={plan.slug}
   price={plan.price}
   variant={plan.highlight ? 'tierHighlight' : 'tier'}
   label="Book Now"
 />
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ BOOKING EXIT ═══════════════════════════════════════════════════ */}
 <InstructorClasses
   instructorName={inst.name}
   categoryHref={categoryLink}
   categoryLabel={categoryLabel}
 />

 </div>
 </ScrollReveal>
 );
}
