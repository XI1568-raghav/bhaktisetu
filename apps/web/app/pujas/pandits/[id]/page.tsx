export const runtime = 'edge';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
 Heart,
 Shield,
 Star,
 CheckCircle,
 MapPin,
 Clock,
 Users,
 ChevronRight,
 ArrowRight,
 BadgeCheck,
 Calendar,
 Award,
 Languages,
 Sparkles,
} from 'lucide-react';
import { homePandits, weddingPandits } from '../../../../lib/home-pujas';

type Props = { params: Promise<{ id: string }> };

const allPandits = [...homePandits, ...weddingPandits];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { id } = await params;
 const p = allPandits.find((x) => x.id === id);
 if (!p) return { title: 'Pandit Profile' };
 return {
 title: `${p.name} — ${p.title}`,
 description: p.bio,
 };
}

export async function generateStaticParams() {
 return allPandits.map((p) => ({ id: p.id }));
}

const slotTimeMap: Record<string, string> = {
 Morning: '7:00 AM – 11:00 AM',
 Afternoon: '12:00 PM – 3:00 PM',
 Evening: '5:00 PM – 8:00 PM',
 Consultation: 'By phone, 30 min',
 Booked: 'Not available',
 'Muhurat check': 'Muhurat consultation',
};

function formatDate(iso: string) {
 const d = new Date(iso);
 return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default async function PanditDetail({ params }: Props) {
 const { id } = await params;
 const p = allPandits.find((x) => x.id === id);
 if (!p) notFound();

 const isWedding = weddingPandits.some((x) => x.id === id);

 return (
 <div className="min-h-screen bg-surface-50">
 {/* ── Breadcrumb ───────────────────────────────────────────── */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
 <nav className="text-sm text-surface-500 flex items-center gap-1.5">
 <Link href="/" className="hover:text-saffron-600">Home</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <Link href="/pujas" className="hover:text-saffron-600">Pujas</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <Link
 href={isWedding ? '/pujas/marriage' : '/pujas/home-puja'}
 className="hover:text-saffron-600"
 >
 {isWedding ? 'Marriage' : 'Home Puja'}
 </Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <span className="text-surface-700 font-medium">{p.name}</span>
 </nav>
 </div>

 {/* ── Hero ────────────────────────────────────────────── */}
 <section className="py-10 md:py-14">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.5fr_1fr] gap-10">
 <div>
 <div className="flex flex-col md:flex-row gap-6">
 {/* Large avatar */}
 <div
 className="w-40 h-40 md:w-48 md:h-48 rounded-2xl flex items-center justify-center text-white font-bold text-6xl flex-shrink-0 shadow-warm-md"
 style={{ background: p.avatarBg }}
 >
 {p.initials}
 </div>

 <div className="flex-1 min-w-0">
 <h1 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight leading-tight">
 {p.name}
 </h1>
 <div className="mt-1.5 text-base text-surface-500">{p.title}</div>

 <div className="mt-3 flex flex-wrap gap-2">
 {p.credentials.map((c) => (
 <div
 key={c}
 className="inline-flex items-center gap-1.5 bg-saffron-100 text-saffron-700 text-xs font-medium px-2.5 py-1 rounded-md border border-saffron-200/50"
 >
 <Award className="w-3 h-3" />
 {c}
 </div>
 ))}
 </div>

 <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
 <div className="flex items-center gap-1.5">
 <Star className="w-4 h-4 text-temple-gold fill-temple-gold" />
 <span className="font-bold text-surface-800">{p.rating}</span>
 <span className="text-surface-500">({p.reviewCount} reviews)</span>
 </div>
 <span className="text-surface-300">·</span>
 <div className="flex items-center gap-1.5 text-surface-600">
 <Sparkles className="w-4 h-4 text-saffron-600" />
 {p.experience} years experience
 </div>
 </div>

 {/* Counter cards */}
 <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
 <div className="bg-white border border-[var(--color-border)] rounded-lg p-3">
 <div className="text-2xl font-bold text-surface-800">
 {p.pujasPerformed.toLocaleString('en-IN')}+
 </div>
 <div className="text-xs text-surface-500">Pujas performed</div>
 </div>
 {p.weddingsPerformed ? (
 <div className="bg-white border border-[var(--color-border)] rounded-lg p-3">
 <div className="text-2xl font-bold text-surface-800">
 {p.weddingsPerformed}+
 </div>
 <div className="text-xs text-surface-500">Weddings officiated</div>
 </div>
 ) : null}
 <div className="bg-white border border-[var(--color-border)] rounded-lg p-3">
 <div className="text-2xl font-bold text-surface-800">{p.experience}</div>
 <div className="text-xs text-surface-500">Years in Vedic service</div>
 </div>
 </div>
 </div>
 </div>

 {/* Bio */}
 <div className="mt-8 bg-white border border-[var(--color-border)] rounded-xl p-6">
 <h3 className="font-bold text-surface-800 mb-3">About</h3>
 <p className="text-surface-600 leading-relaxed">{p.bio}</p>
 </div>

 {/* Specialties */}
 <div className="mt-5 bg-white border border-[var(--color-border)] rounded-xl p-6">
 <h3 className="font-bold text-surface-800 mb-3">Specialties</h3>
 <div className="flex flex-wrap gap-2">
 {p.specialty.map((s) => (
 <span
 key={s}
 className="inline-flex items-center gap-1.5 bg-saffron-50 text-saffron-700 text-sm font-medium px-3 py-1.5 rounded-full border border-saffron-200/50"
 >
 {s}
 </span>
 ))}
 </div>
 </div>

 {/* Languages */}
 <div className="mt-5 bg-white border border-[var(--color-border)] rounded-xl p-6">
 <h3 className="font-bold text-surface-800 mb-3 flex items-center gap-2">
 <Languages className="w-4 h-4 text-saffron-600" />
 Languages
 </h3>
 <div className="flex flex-wrap gap-2">
 {p.languages.map((l) => (
 <span
 key={l}
 className="bg-surface-100 border border-[var(--color-border)] text-sm text-surface-700 px-3 py-1.5 rounded-full"
 >
 {l}
 </span>
 ))}
 </div>
 </div>

 {/* Service area */}
 <div className="mt-5 bg-white border border-[var(--color-border)] rounded-xl p-6">
 <h3 className="font-bold text-surface-800 mb-3 flex items-center gap-2">
 <MapPin className="w-4 h-4 text-saffron-600" />
 Service area
 </h3>
 <div className="text-sm text-surface-500 mb-2">Based in {p.city}</div>
 <div className="flex flex-wrap gap-2">
 {p.serviceArea.map((city) => (
 <span
 key={city}
 className="bg-surface-100 border border-[var(--color-border)] text-sm text-surface-700 px-3 py-1.5 rounded-full"
 >
 {city}
 </span>
 ))}
 </div>
 </div>
 </div>

 {/* ── Right column: booking + verification ─────────── */}
 <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
 {/* Verification */}
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
 <h3 className="font-bold text-surface-800 mb-3 flex items-center gap-2">
 <Shield className="w-4 h-4 text-tulsi-green" />
 Verification
 </h3>
 <ul className="space-y-2.5">
 {[
 { ok: p.verified.aadhaar, label: 'Aadhaar Verified' },
 { ok: p.verified.background, label: 'Background Checked' },
 { ok: p.verified.vedicCert, label: 'Vedic Certified' },
 ].map((v) => (
 <li key={v.label} className="flex items-center gap-2.5 text-sm">
 <div
 className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
 v.ok ? 'bg-tulsi-green' : 'bg-surface-200'
 }`}
 >
 <CheckCircle className="w-3 h-3 text-white" />
 </div>
 <span className="text-surface-700">{v.label}</span>
 {v.ok && (
 <BadgeCheck className="w-4 h-4 text-tulsi-green ml-auto" />
 )}
 </li>
 ))}
 </ul>
 </div>

 {/* Pricing grid */}
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
 <h3 className="font-bold text-surface-800 mb-4">Pricing</h3>
 <div className="space-y-4">
 <div>
 <div className="text-sm font-semibold text-surface-700 mb-2">Home Puja</div>
 <div className="grid grid-cols-3 gap-2">
 {(['basic', 'standard', 'premium'] as const).map((tier) => (
 <div
 key={tier}
 className="bg-surface-100 border border-[var(--color-border)] rounded-lg p-2.5 text-center"
 >
 <div className="text-[10px] uppercase tracking-wide text-surface-500 font-semibold">
 {tier}
 </div>
 <div className="text-sm font-bold text-surface-800 mt-0.5">
 ₹{p.pricing.homePuja[tier].toLocaleString('en-IN')}
 </div>
 </div>
 ))}
 </div>
 </div>

 {p.pricing.grihaPravesh && (() => {
 const gp = p.pricing.grihaPravesh;
 return (
 <div>
 <div className="text-sm font-semibold text-surface-700 mb-2">Griha Pravesh</div>
 <div className="grid grid-cols-3 gap-2">
 {(['basic', 'standard', 'premium'] as const).map((tier) => (
 <div
 key={tier}
 className="bg-surface-100 border border-[var(--color-border)] rounded-lg p-2.5 text-center"
 >
 <div className="text-[10px] uppercase tracking-wide text-surface-500 font-semibold">
 {tier}
 </div>
 <div className="text-sm font-bold text-surface-800 mt-0.5">
 ₹{gp[tier].toLocaleString('en-IN')}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 })()}

 {p.pricing.marriage && (() => {
 const mp = p.pricing.marriage;
 return (
 <div>
 <div className="text-sm font-semibold text-surface-700 mb-2 flex items-center gap-1">
 <Heart className="w-3.5 h-3.5 text-vermillion-500" />
 Wedding
 </div>
 <div className="grid grid-cols-3 gap-2">
 {(['basic', 'standard', 'premium'] as const).map((tier) => (
 <div
 key={tier}
 className="bg-surface-100 border border-[var(--color-border)] rounded-lg p-2.5 text-center"
 >
 <div className="text-[10px] uppercase tracking-wide text-surface-500 font-semibold">
 {tier}
 </div>
 <div className="text-sm font-bold text-surface-800 mt-0.5">
 ₹{mp[tier].toLocaleString('en-IN')}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 })()}
 </div>

 <Link
 href={isWedding ? `/pujas/marriage/book?pandit=${p.id}` : `/pujas/home-puja/satyanarayan-katha/book?pandit=${p.id}`}
 className="block mt-5 text-center py-3 rounded-lg font-semibold text-white transition-colors"
 style={{ background: 'var(--color-primary)' }}
 >
 Book {p.name.split(' ').slice(-1)[0]}
 </Link>
 </div>
 </aside>
 </div>
 </section>

 {/* ── Availability calendar ───────────────────────────────── */}
 <section className="py-12 bg-white border-y border-[var(--color-border)]">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight mb-2 flex items-center gap-3">
 <Calendar className="w-6 h-6 text-saffron-600" />
 Next 7 days
 </h2>
 <p className="text-surface-500 mb-8">Tap an available slot to begin booking.</p>

 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
 {p.availability.map((day) => {
 const isBooked = day.slots.length === 1 && day.slots[0] === 'Booked';
 return (
 <div
 key={day.date}
 className={`rounded-xl border p-4 ${
 isBooked
 ? 'bg-surface-100 border-[var(--color-border)] opacity-60'
 : 'bg-surface-100 border-[var(--color-border)]'
 }`}
 >
 <div className="text-xs font-semibold text-surface-700 mb-3">
 {formatDate(day.date)}
 </div>
 <div className="space-y-1.5">
 {day.slots.map((slot, i) => {
 const label = slotTimeMap[slot] ?? slot;
 const available = slot !== 'Booked';
 return (
 <div
 key={i}
 className={`text-xs px-2.5 py-1.5 rounded-md text-center ${
 available
 ? 'bg-saffron-50 text-saffron-700 border border-saffron-200/50'
 : 'bg-surface-200 text-surface-400'
 }`}
 >
 {available ? (
 <>
 <div className="font-semibold">{slot}</div>
 <div className="text-[10px] opacity-75">{label}</div>
 </>
 ) : (
 'Booked'
 )}
 </div>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* ── Reviews ────────────────────────────────────────── */}
 <section className="py-12 md:py-16">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-end justify-between mb-8">
 <h2 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight">
 Reviews from devotees
 </h2>
 <div className="flex items-center gap-1.5">
 <Star className="w-5 h-5 text-temple-gold fill-temple-gold" />
 <span className="text-xl font-bold text-surface-800">{p.rating}</span>
 <span className="text-sm text-surface-500">({p.reviewCount})</span>
 </div>
 </div>

 <div className="grid md:grid-cols-2 gap-5">
 {p.reviews.map((r, i) => (
 <div
 key={i}
 className="bg-white border border-[var(--color-border)] rounded-xl p-5"
 >
 <div className="flex items-start justify-between mb-3">
 <div>
 <div className="font-semibold text-surface-800">{r.author}</div>
 <div className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
 <MapPin className="w-3 h-3" />
 {r.city}
 </div>
 </div>
 <div className="flex gap-0.5">
 {Array.from({ length: Math.floor(r.rating) }).map((_, j) => (
 <Star key={j} className="w-3.5 h-3.5 text-temple-gold fill-temple-gold" />
 ))}
 </div>
 </div>
 <p className="text-sm text-surface-600 leading-relaxed">{r.text}</p>
 <div className="mt-3 text-xs text-surface-400">
 {new Date(r.date).toLocaleDateString('en-IN', {
 month: 'long',
 year: 'numeric',
 })}
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ── Sticky CTA ────────────────────────────────────── */}
 <section className="py-12 bg-[#ede9e3]">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <h3 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight">
 Ready to book {p.name.split(' ').slice(-1)[0]}?
 </h3>
 <p className="mt-2 text-surface-500">
 Check availability and lock a slot in under 2 minutes.
 </p>
 <Link
 href={isWedding ? `/pujas/marriage/book?pandit=${p.id}` : `/pujas/home-puja/satyanarayan-katha/book?pandit=${p.id}`}
 className="inline-flex items-center gap-2 mt-6 px-8 py-3.5 rounded-lg font-semibold text-white transition-colors"
 style={{ background: 'var(--color-primary)' }}
 >
 Book {p.name}
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </section>
 </div>
 );
}
