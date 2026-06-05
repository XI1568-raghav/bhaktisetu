import type { Metadata } from 'next';
import Link from 'next/link';
import {
 Home,
 Heart,
 Flame,
 Calendar,
 Shield,
 Star,
 CheckCircle,
 MapPin,
 Clock,
 Users,
 ArrowRight,
 ChevronRight,
 Sparkles,
} from 'lucide-react';
import { homePujaCategories } from '../../../lib/home-pujas';

export const metadata: Metadata = {
 title: 'Home Puja — Book a Pandit at Your Residence',
 description:
 'Book verified, Aadhaar-authenticated pandits to perform pujas at your home. Griha Pravesh, Satyanarayan Katha, Navratri, Rudrabhishek, and more. Starting ₹1,100.',
};

const iconMap = {
 Home,
 Heart,
 Flame,
 Calendar,
 Shield,
 Star,
 CheckCircle,
 MapPin,
 Clock,
 Users,
} as const;

export default function HomePujaHubPage() {
 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
 <nav className="text-sm text-surface-500 flex items-center gap-1.5">
 <Link href="/" className="hover:text-saffron-600">Home</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <Link href="/pujas" className="hover:text-saffron-600">Pujas</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <span className="text-surface-700 font-medium">Home Puja</span>
 </nav>
 </div>

 {/* ── Hero ──────────────────────────────────────────────────────── */}
 <section className="bg-[#ede9e3] py-14 md:py-20 mt-4">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-[1.3fr_1fr] gap-10 items-center">
 <div>
 <div className="inline-flex items-center gap-2 bg-saffron-100 text-saffron-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-saffron-200 mb-4">
 <Home className="w-3.5 h-3.5" />
 At-home pandit service
 </div>
 <h1 className="text-4xl md:text-5xl font-bold text-surface-800 leading-tight tracking-tight">
 Book a Pandit at Your Home
 </h1>
 <p className="mt-5 text-lg text-surface-500 max-w-xl leading-relaxed">
 Verified pandits, Aadhaar-authenticated, who conduct pujas at your
 residence for any occasion — Griha Pravesh, Satyanarayan, Navratri,
 weddings, and life events. They arrive with all samagri, prasadam,
 and centuries of tradition.
 </p>
 <div className="mt-7 flex flex-wrap gap-3">
 <a
 href="#categories"
 className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
 style={{ background: 'var(--color-primary)' }}
 >
 Browse All Home Pujas
 <ArrowRight className="w-4 h-4" />
 </a>
 <Link
 href="/pujas/marriage"
 className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-white border border-saffron-300 text-saffron-700 hover:bg-saffron-50 transition-colors"
 >
 Book for Marriage
 </Link>
 </div>
 </div>

 {/* ── Trust callout card ───────────────────────────────────── */}
 <div className="relative bg-white rounded-2xl border border-[var(--color-border)] shadow-warm-sm p-6 md:p-8">
 <div className="absolute -top-3 -right-3 bg-saffron-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
 Verified pandits & video proof
 </div>
 <h3 className="text-xl font-bold text-surface-800 mb-5">Why Darshya Home Puja</h3>
 <ul className="space-y-4">
 <li className="flex gap-3">
 <div className="w-9 h-9 rounded-lg bg-tulsi-green/10 flex items-center justify-center flex-shrink-0">
 <Shield className="w-4.5 h-4.5 text-tulsi-green" />
 </div>
 <div>
 <div className="font-semibold text-surface-800 text-sm">Aadhaar Verified</div>
 <div className="text-xs text-surface-500">Every pandit identity-checked and background-verified</div>
 </div>
 </li>
 <li className="flex gap-3">
 <div className="w-9 h-9 rounded-lg bg-saffron-100 flex items-center justify-center flex-shrink-0">
 <Star className="w-4.5 h-4.5 text-saffron-600" />
 </div>
 <div>
 <div className="font-semibold text-surface-800 text-sm">500+ pujas completed</div>
 <div className="text-xs text-surface-500">Experienced pandits from Vedic gurukuls</div>
 </div>
 </li>
 <li className="flex gap-3">
 <div className="w-9 h-9 rounded-lg bg-temple-gold/10 flex items-center justify-center flex-shrink-0">
 <Sparkles className="w-4.5 h-4.5 text-temple-gold" />
 </div>
 <div>
 <div className="font-semibold text-surface-800 text-sm">Starting ₹1,100</div>
 <div className="text-xs text-surface-500">Transparent pricing. No surprises.</div>
 </div>
 </li>
 <li className="flex gap-3">
 <div className="w-9 h-9 rounded-lg bg-lotus-pink/10 flex items-center justify-center flex-shrink-0">
 <Heart className="w-4.5 h-4.5 text-lotus-pink" />
 </div>
 <div>
 <div className="font-semibold text-surface-800 text-sm">Prasadam included</div>
 <div className="text-xs text-surface-500">Fresh, traditional prasad for your family</div>
 </div>
 </li>
 </ul>
 </div>
 </div>
 </section>

 {/* ── Categories ─────────────────────────────────────────────────── */}
 <section id="categories" className="py-16 md:py-20">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-end justify-between mb-10">
 <div>
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight">
 Pick your ceremony
 </h2>
 <p className="mt-2 text-surface-500">
 Eight most-requested home pujas. Tap any card for full details, pandits, and pricing.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
 {homePujaCategories.map((cat) => {
 const Icon = iconMap[cat.icon as keyof typeof iconMap] ?? Flame;
 return (
 <Link
 key={cat.slug}
 href={`/pujas/home-puja/${cat.slug}`}
 className="group relative bg-white border border-[var(--color-border)] rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-warm-md"
 >
 <div
 className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
 style={{ background: cat.accent + '15' }}
 >
 <Icon className="w-6 h-6" style={{ color: cat.accent }} />
 </div>
 <div className="text-xs text-surface-400 font-medium mb-1">
 {cat.nameLocal}
 </div>
 <h3 className="text-lg font-bold text-surface-800 group-hover:text-saffron-600 transition-colors">
 {cat.name}
 </h3>
 <p className="text-sm text-surface-500 mt-1.5 leading-relaxed">
 {cat.tagline}
 </p>
 <div className="mt-5 pt-4 border-t border-[var(--color-divider)] flex items-center justify-between">
 <div>
 <div className="text-xs text-surface-400">Starting at</div>
 <div className="text-base font-bold text-surface-800">
 ₹{cat.startingPrice.toLocaleString('en-IN')}
 </div>
 </div>
 <div className="flex items-center gap-1 text-xs text-surface-500">
 <Clock className="w-3.5 h-3.5" />
 {cat.duration}
 </div>
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 </section>

 {/* ── How it works ────────────────────────────────────────────── */}
 <section className="bg-white py-16 md:py-20 border-y border-[var(--color-border)]">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="text-center mb-12">
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight">
 How it works
 </h2>
 <p className="mt-2 text-surface-500">Three steps. Pandit arrives. Puja is done.</p>
 </div>

 <div className="grid md:grid-cols-3 gap-6">
 {[
 {
 n: '01',
 title: 'Choose ceremony',
 desc: 'Pick the puja that fits your occasion — from ₹1,100 Ganesh Puja to ₹21,000 Griha Pravesh.',
 icon: Flame,
 color: 'var(--color-saffron-500)',
 },
 {
 n: '02',
 title: 'Select date & pandit',
 desc: 'Pick an auspicious muhurat and browse verified pandits. See ratings, languages, and pricing.',
 icon: Calendar,
 color: 'var(--color-vermillion-500)',
 },
 {
 n: '03',
 title: 'Pandit arrives with all samagri',
 desc: 'No shopping needed. Pandit brings the havan kund, ghee, grains, flowers — everything.',
 icon: CheckCircle,
 color: 'var(--color-tulsi-green)',
 },
 ].map((step) => {
 const Icon = step.icon;
 return (
 <div
 key={step.n}
 className="relative rounded-xl border border-[var(--color-border)] bg-surface-100 p-6"
 >
 <div
 className="absolute -top-4 left-6 text-5xl font-bold opacity-15"
 style={{ color: step.color }}
 >
 {step.n}
 </div>
 <div
 className="w-11 h-11 rounded-lg flex items-center justify-center mb-4 mt-4"
 style={{ background: step.color + '18' }}
 >
 <Icon className="w-5 h-5" style={{ color: step.color }} />
 </div>
 <h3 className="text-lg font-bold text-surface-800">{step.title}</h3>
 <p className="mt-2 text-sm text-surface-500 leading-relaxed">{step.desc}</p>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* ── Marriage tease ───────────────────────────────────────────── */}
 <section className="py-16 md:py-20 bg-[#ede9e3]">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-600 to-vermillion-600 p-10 md:p-14">
 <div className="relative grid md:grid-cols-[1.5fr_1fr] gap-8 items-center">
 <div>
 <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm mb-4">
 <Heart className="w-3.5 h-3.5" />
 Marriage ceremonies
 </div>
 <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
 Planning a wedding?
 </h2>
 <p className="mt-3 text-white/90 max-w-xl">
 Traditional Hindu Vivah, Arya Samaj, South Indian Kalyanam, and blended Sikh-Hindu ceremonies. Starting ₹11,000.
 </p>
 <div className="mt-6">
 <Link
 href="/pujas/marriage"
 className="inline-flex items-center gap-2 bg-white text-saffron-700 px-6 py-3 rounded-lg font-semibold hover:bg-surface-100 transition-colors"
 >
 Explore Wedding Pandits
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </div>
 <div className="hidden md:flex justify-end">
 <div className="w-48 h-48 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
 <Heart className="w-24 h-24 text-white" strokeWidth={1.5} />
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>
 </div>
 );
}
