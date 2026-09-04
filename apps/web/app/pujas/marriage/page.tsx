import type { Metadata } from 'next';
import Link from 'next/link';
import {
 Heart,
 Calendar,
 Shield,
 Star,
 CheckCircle,
 MapPin,
 Clock,
 Users,
 ChevronRight,
 Sparkles,
 ArrowRight,
 Flame,
 Languages,
 Award,
} from 'lucide-react';
import {
 marriageTypes,
 marriagePricingTiers,
 marriageCoreRites,
 marriageAddOns,
} from '../../../lib/home-pujas';
import { getPublicPriests, type PriestSummary } from '../../../lib/pandit-api';
import { remoteImage, IMG_W } from '../../../lib/images';
import { PanditAvatar } from '../PanditAvatar';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
const MARRIAGE_KEYWORDS = ['marriage', 'wedding', 'vivah', 'kalyanam', 'anand karaj'];

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/pujas/marriage' },
 title: 'Book a Pandit for Your Wedding',
 description:
 'Sampoorna vivah sanskar with all 7 pheras, kanyadaan and saptapadi. Hindu Vivah, Arya Samaj, South Indian Kalyanam, Anand Karaj. Starting ₹11,000.',
};

export default async function MarriagePage() {
 const allPriests = await getPublicPriests();
 const filtered = allPriests.filter((p) => {
 const haystack = [...p.specializations, p.bio ?? ''].join(' ').toLowerCase();
 return MARRIAGE_KEYWORDS.some((k) => haystack.includes(k));
 });
 const weddingPriests: PriestSummary[] = (filtered.length > 0 ? filtered : allPriests).slice(0, 6);
 const usingFallback = filtered.length === 0 && allPriests.length > 0;
 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* ── Breadcrumb ─────────────────────────────────────────────── */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
 <nav className="text-sm text-surface-500 flex items-center gap-1.5">
 <Link href="/" className="hover:text-saffron-600">Home</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <Link href="/pujas" className="hover:text-saffron-600">Pujas</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <span className="text-surface-700 font-medium">Marriage Ceremony</span>
 </nav>
 </div>

 {/* ── Hero ─────────────────────────────────────────────────── */}
 <section className="relative py-16 md:py-24 overflow-hidden">
 <div className="absolute inset-0 bg-gradient-to-br from-saffron-50 via-sandal-cream/40 to-lotus-pink/5" />
 <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.3fr_1fr] gap-12 items-center">
 <div>
 <div className="inline-flex items-center gap-2 bg-vermillion-500/10 text-vermillion-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-vermillion-500/20 mb-5">
 <Heart className="w-3.5 h-3.5" />
 Vivah Sanskara
 </div>
 <h1 className={H1.marketing}>
 Book a Pandit for <span className="text-saffron-600">Your Wedding</span>
 </h1>
 <p className="prose-lead mt-6 text-surface-600 max-w-xl leading-relaxed">
 Sampoorna vivah sanskar with all 7 pheras, kanyadaan, and saptapadi. From simple court-marriage blessings to grand traditional ceremonies.
 </p>
 <div className="mt-8 flex flex-wrap gap-3">
 <Link
 href="/pujas/marriage/book"
 className={buttonClass('primary', 'md')}
 >
 Book Your Pandit
 <ArrowRight className="w-4 h-4" />
 </Link>
 <Link
 href="/pujas/marriage/book?custom=true"
 className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg font-semibold bg-white border border-[var(--color-border)] text-surface-800 hover:bg-surface-100 transition-colors"
 >
 Request Quote for Custom
 </Link>
 </div>

 <div className="mt-10 flex flex-wrap gap-5 text-sm text-surface-600">
 {[
 // TC-08: this read 'Vedic certified' — three static words, identical for
 // every visitor, over a page quoting ₹11,000+, naming a certification no
 // step in the product awards or checks. `Priest.isVerified`,
 // `.verificationStatus` and `.aadhaarVerified` have no writer outside
 // apps/api/prisma/seed.ts, and `.aadhaarVerified` is read in exactly one
 // place: payment.service.ts, as a PAYOUT gate. So the payout gate is what
 // the badge now says, because it is the only part that runs.
 { icon: Shield, label: 'Pandit paid only after Aadhaar KYC' },
 { icon: Star, label: 'Muhurat matched' },
 { icon: CheckCircle, label: 'Full samagri' },
 ].map((b) => {
 const I = b.icon;
 return (
 <div key={b.label} className="flex items-center gap-2">
 <I className="w-4 h-4 text-saffron-600" />
 {b.label}
 </div>
 );
 })}
 </div>
 </div>

 {/* ── Core rites card ────────────────────────────────── */}
 <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-warm-md p-8">
 <div className="text-xs font-semibold uppercase tracking-wide text-saffron-600 mb-2">
 Included in all tiers
 </div>
 <h3 className="text-xl font-bold text-surface-800 mb-5">Core sacred rites</h3>
 <ul className="grid grid-cols-2 gap-3">
 {marriageCoreRites.map((rite) => (
 <li key={rite} className="flex items-center gap-2 text-sm text-surface-700">
 <CheckCircle className="w-4 h-4 text-tulsi-green flex-shrink-0" />
 {rite}
 </li>
 ))}
 </ul>
 </div>
 </div>
 </section>

 {/* ── Wedding types ──────────────────────────────────────── */}
 <section className="py-16 bg-white border-y border-[var(--color-border)]">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight mb-2">
 Wedding traditions we officiate
 </h2>
 <p className="text-surface-500 mb-10">Every regional tradition, every blended family, authentically performed.</p>

 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
 {marriageTypes.map((t) => (
 <div
 key={t.slug}
 className="bg-surface-100 border border-[var(--color-border)] rounded-xl p-6 hover:shadow-warm-sm transition-all"
 >
 <h3 className="text-lg font-bold text-surface-800">{t.name}</h3>
 <p className="mt-2 text-sm text-surface-500 leading-relaxed min-h-[4.5rem]">{t.description}</p>
 <div className="mt-4 pt-4 border-t border-[var(--color-divider)] flex items-center justify-between text-sm">
 <div className="flex items-center gap-1.5 text-surface-500">
 <Clock className="w-3.5 h-3.5" />
 {t.duration}
 </div>
 <div>
 <span className="text-surface-400">from </span>
 <span className="font-semibold text-surface-800">
 ₹{t.startingPrice.toLocaleString('en-IN')}
 </span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ── Pricing tiers ───────────────────────────────────────── */}
 <section className="py-16 md:py-20">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="text-center mb-12">
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight">
 Wedding pricing tiers
 </h2>
 <p className="mt-2 text-surface-500">Transparent pricing. No hidden charges. Travel anywhere in India.</p>
 </div>

 <div className="grid md:grid-cols-3 gap-6">
 {marriagePricingTiers.map((tier) => {
 const isFeatured = tier.slug === 'traditional';
 return (
 <div
 key={tier.slug}
 className={`relative rounded-xl p-8 transition-all ${
 isFeatured
 ? 'bg-gradient-to-br from-saffron-50 to-white border-2 border-saffron-500 shadow-warm-lg md:-translate-y-3'
 : 'bg-white border border-[var(--color-border)]'
 }`}
 >
 {isFeatured && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-saffron-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
 Most Chosen
 </div>
 )}
 <div className="text-sm font-semibold uppercase tracking-wide text-surface-500 mb-1">
 {tier.name}
 </div>
 <div className="flex items-baseline gap-1 mb-2">
 <span className="text-4xl font-bold text-surface-800">
 ₹{tier.price.toLocaleString('en-IN')}
 </span>
 </div>
 <div className="flex items-center gap-3 text-xs text-surface-500 mb-6">
 <span className="flex items-center gap-1">
 <Users className="w-3.5 h-3.5" />
 {tier.pandits} pandit{tier.pandits > 1 ? 's' : ''}
 </span>
 <span className="text-surface-300">·</span>
 <span className="flex items-center gap-1">
 <Clock className="w-3.5 h-3.5" />
 {tier.duration}
 </span>
 </div>

 <ul className="space-y-3 mb-8">
 {tier.includes.map((inc) => (
 <li key={inc} className="flex gap-2.5 text-sm text-surface-600">
 <CheckCircle className="w-4 h-4 text-tulsi-green flex-shrink-0 mt-0.5" />
 <span>{inc}</span>
 </li>
 ))}
 </ul>

 <Link
 href={`/pujas/marriage/book?tier=${tier.slug}`}
 className={`block text-center py-3.5 rounded-lg font-semibold transition-colors ${
 isFeatured
 ? 'bg-saffron-600 text-white hover:bg-saffron-700'
 : 'bg-surface-100 text-surface-800 hover:bg-surface-200 border border-[var(--color-border)]'
 }`}
 >
 Choose {tier.name}
 </Link>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* ── Add-ons ──────────────────────────────────────────────── */}
 <section className="py-14 bg-[#ede9e3]">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="text-center mb-8">
 <h2 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight">
 Optional add-ons
 </h2>
 <p className="mt-2 text-surface-500">Personalize your ceremony. Add what matters to your family.</p>
 </div>
 <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
 {marriageAddOns.map((a) => (
 <div
 key={a}
 className="bg-white border border-[var(--color-border)] rounded-lg p-4 text-sm text-surface-700 flex items-start gap-2"
 >
 <Sparkles className="w-4 h-4 text-saffron-600 flex-shrink-0 mt-0.5" />
 {a}
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ── Featured wedding pandits ─────────────────────────────── */}
 <section className="py-16 md:py-20">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-end justify-between mb-10">
 <div>
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight">
 {usingFallback ? 'Featured pandits' : 'Featured wedding pandits'}
 </h2>
 <p className="mt-2 text-surface-500">
 {usingFallback
 ? 'Pandits listed on Darshya. Reach out about your wedding ceremony.'
 : 'Pandits listed on Darshya for wedding ceremonies.'}
 </p>
 </div>
 </div>

 {weddingPriests.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-surface-200 p-12 text-center bg-white">
 <Users className="w-12 h-12 text-saffron-300 mx-auto mb-3" />
 <h3 className="text-lg font-semibold text-surface-800 mb-2">
 No wedding pandits listed yet
 </h3>
 <p className="prose-meta text-surface-500 max-w-md mx-auto">
 We are onboarding wedding pandits. New profiles will appear here as they are published.
 </p>
 </div>
 ) : (
 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
 {weddingPriests.map((p) => (
 <Link
 key={p.id}
 href={`/pandits/${p.id}`}
 className="group bg-white border border-[var(--color-border)] rounded-xl p-6 hover:shadow-warm-md hover:-translate-y-0.5 transition-all"
 >
 <div className="flex items-start gap-4 mb-4">
 {/* PF-04: the old branch only reached the initials tile when avatarUrl
     was falsy, so the two seeded wedding pandits — whose rows point at a
     hostname with no DNS record — rendered a broken-image icon next to
     "Vedic certified". */}
 <PanditAvatar
 src={p.avatarUrl ? remoteImage(p.avatarUrl, IMG_W.THUMB) : null}
 name={p.displayName}
 className="w-16 h-16 rounded-xl text-lg"
 />
 <div className="flex-1 min-w-0">
 {/* TC-08: a BadgeCheck gated on `p.isVerified` used to sit here, and a
     "Verified pandit" / "Profile under review" ternary below. Both were
     constants dressed as per-pandit judgements: GET /priests filters
     `isVerified: true AND status: 'active'`
     (apps/api/src/routes/priests-public.ts), so every row this page can
     receive has isVerified true and the false branch was unreachable — on
     top of a column with no writer outside seed.ts. */}
 <div className="flex items-start gap-1.5">
 <div className="font-bold text-surface-800 group-hover:text-saffron-600 transition-colors truncate">
 {p.displayName}
 </div>
 </div>
 {p.specializations.length > 0 && (
 <div className="text-xs text-surface-500 truncate">
 {p.specializations.slice(0, 2).join(' · ')}
 </div>
 )}
 <div className="flex items-center gap-2 mt-1.5 text-xs">
 {p.ratingCount > 0 ? (
 <>
 <Star className="w-3.5 h-3.5 text-temple-gold fill-temple-gold" />
 <span className="font-semibold text-surface-700">{p.ratingAvg.toFixed(1)}</span>
 <span className="text-surface-400">({p.ratingCount})</span>
 </>
 ) : (
 <span className="text-surface-400">New</span>
 )}
 </div>
 </div>
 </div>

 <div className="space-y-1.5 text-xs text-surface-600 mb-4">
 {p.experienceYears > 0 && (
 <div className="flex items-center gap-1.5">
 <Award className="w-3.5 h-3.5 text-vermillion-500" />
 {p.experienceYears}+ years experience
 </div>
 )}
 {p.languages.length > 0 && (
 <div className="flex items-center gap-1.5">
 <Languages className="w-3.5 h-3.5 text-surface-400" />
 {p.languages.slice(0, 4).join(', ')}
 </div>
 )}
 <div className="flex items-center gap-1.5">
 <Flame className="w-3.5 h-3.5 text-saffron-500" />
 {p.offeringCount} puja service{p.offeringCount === 1 ? '' : 's'}
 </div>
 </div>

 <div className="pt-4 border-t border-[var(--color-divider)] flex items-center justify-end">
 <span className="text-xs font-semibold text-saffron-600 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
 View profile <ArrowRight className="w-3.5 h-3.5" />
 </span>
 </div>
 </Link>
 ))}
 </div>
 )}
 </div>
 </section>

 {/* TC-05 — TESTIMONIALS, deleted.
     `marriageTestimonials` was three invented five-star couples with invented
     officiating pandits, and the predecessor emptied the array. That left THIS
     section standing over it: an <h2> reading "Couples who said yes with
     Darshya" and the line "Real stories from recent weddings." above an empty
     grid. Both sentences are claims on their own — there have been no
     completed weddings — and a reader takes the empty grid for a loading
     state rather than for the absence it is.
     No wedding endpoint serves rated bookings, so there is nothing to render
     conditionally either; the section returns when a real source exists. */}

 {/* ── FAQ ────────────────────────────────────────────── */}
 <section className="py-16 md:py-20">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight text-center mb-10">
 Wedding booking FAQs
 </h2>
 <div className="space-y-3">
 {[
 {
 q: 'How far in advance should we book our wedding pandit?',
 a: 'We recommend 3–6 months for Traditional and Grand tiers, especially for peak wedding months (Nov–Feb, Apr–Jun). Simple tier bookings can often be accommodated with 3–4 weeks notice.',
 },
 {
 q: 'Are travel charges included?',
 a: 'For pandits in the same city, yes. For destination weddings or inter-city travel (over 100 km), actual travel, stay, and food costs are added — disclosed upfront in the quote.',
 },
 {
 q: 'What does the couple need to bring?',
 a: 'Mangalsutra, rings, and any heirloom items the family wishes used. The pandit brings all samagri, havan kund, mandap items, and ghee. Premium tier coordinates flower decoration and mandap setup separately.',
 },
 {
 q: 'Can the ceremony be explained in English for non-Hindi speaking guests?',
 a: 'Yes. Traditional and Grand tiers include English narration. The pandit will explain each ritual\u2019s meaning as he performs it, keeping Sanskrit sacred parts intact.',
 },
 {
 q: 'Do you handle Arya Samaj / court marriage registration?',
 a: 'Yes. Our Arya Samaj specialists handle complete paperwork including marriage certificate. Court marriage + Vedic tier coordinates the court date separately with a small ceremony.',
 },
 {
 q: 'What if we want inter-faith or blended ceremonies?',
 a: 'We have pandits experienced in Sikh-Hindu, Hindu-Jain, and Hindu-Christian blended ceremonies. Custom quote required — use the "Request Quote for Custom" option.',
 },
 ].map((f, i) => (
 <details
 key={i}
 className="group bg-white border border-[var(--color-border)] rounded-xl overflow-hidden"
 >
 <summary className="cursor-pointer px-5 py-4 font-semibold text-surface-800 flex items-center justify-between gap-4 hover:bg-surface-100 transition-colors">
 {f.q}
 <ChevronRight className="w-5 h-5 text-surface-400 group-open:rotate-90 transition-transform flex-shrink-0" />
 </summary>
 <div className="px-5 pb-5 text-surface-600 leading-relaxed">{f.a}</div>
 </details>
 ))}
 </div>
 </div>
 </section>

 {/* ── Final CTA ──────────────────────────────────────── */}
 <section className="py-16 bg-gradient-to-br from-saffron-600 to-vermillion-600">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <Heart className="w-12 h-12 text-white mx-auto mb-4" strokeWidth={1.5} />
 <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
 Begin your sampoorna vivaah journey
 </h2>
 <p className="mt-4 text-white/90 max-w-2xl mx-auto">
 Book now to lock in your muhurat. Our wedding coordinator will call within 2 hours to confirm rites, language, and samagri preferences.
 </p>
 <div className="mt-8 flex flex-wrap justify-center gap-3">
 <Link
 href="/pujas/marriage/book"
 className="inline-flex items-center gap-2 bg-white text-saffron-700 px-8 py-3.5 rounded-lg font-semibold hover:bg-surface-100 transition-colors"
 >
 Book Your Pandit
 <ArrowRight className="w-4 h-4" />
 </Link>
 <Link
 href="/pujas/marriage/book?custom=true"
 className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm"
 >
 Request Custom Quote
 </Link>
 </div>
 </div>
 </section>
 </div>
 );
}
