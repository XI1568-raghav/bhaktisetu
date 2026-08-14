import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
 ChevronRight,
 Sparkles,
 ArrowRight,
 BadgeCheck,
 Package,
 Languages,
 Award,
} from 'lucide-react';
import { homePujaCategories } from '../../../../lib/home-pujas';
import { getPublicPriests, type PriestSummary } from '../../../../lib/pandit-api';

function panditInitials(name: string): string {
 const parts = name.trim().split(/\s+/);
 const first = parts[0]?.charAt(0) ?? '';
 const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? '' : '';
 return (first + last).toUpperCase() || 'P';
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { slug } = await params;
 const cat = homePujaCategories.find((c) => c.slug === slug);
 if (!cat) return { title: 'Home Puja' };
 return {
 title: `${cat.name} at Home — Book a Verified Pandit`,
 alternates: { canonical: `https://darshya.online/pujas/home-puja/${slug}` },
 description: cat.description,
 };
}

export async function generateStaticParams() {
 return homePujaCategories.map((c) => ({ slug: c.slug }));
}

const iconMap = { Home, Heart, Flame, Calendar, Shield, Star, CheckCircle, MapPin, Clock, Users } as const;

export default async function HomePujaDetail({ params }: Props) {
 const { slug } = await params;
 const cat = homePujaCategories.find((c) => c.slug === slug);
 if (!cat) notFound();

 const allPriests = await getPublicPriests();
 const slugTokens = cat.slug.toLowerCase().split('-').filter((t) => t.length > 2);
 const catNameLower = cat.name.toLowerCase();
 const matchesCategory = (p: PriestSummary): boolean => {
  const haystack = [...p.specializations, p.bio ?? ''].join(' ').toLowerCase();
  if (haystack.includes(catNameLower)) return true;
  return slugTokens.some((t) => haystack.includes(t));
 };
 const filtered = allPriests.filter(matchesCategory);
 const pandits: PriestSummary[] = (filtered.length > 0 ? filtered : allPriests).slice(0, 6);
 const usingFallback = filtered.length === 0 && allPriests.length > 0;
 const Icon = iconMap[cat.icon as keyof typeof iconMap] ?? Flame;

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* ── Breadcrumb ─────────────────────────────────────────────── */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
 <nav className="text-sm text-surface-500 flex items-center gap-1.5">
 <Link href="/" className="hover:text-saffron-600">Home</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <Link href="/pujas" className="hover:text-saffron-600">Pujas</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <Link href="/pujas/home-puja" className="hover:text-saffron-600">Home Puja</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <span className="text-surface-700 font-medium">{cat.name}</span>
 </nav>
 </div>

 {/* ── Hero ───────────────────────────────────────────────────── */}
 <section className="py-10 md:py-14">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.4fr_1fr] gap-10">
 <div>
 <div
 className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
 style={{ background: cat.accent + '15', color: cat.accent }}
 >
 <Icon className="w-3.5 h-3.5" />
 Home Puja
 </div>
 <div className="text-sm text-surface-500 mb-2">{cat.nameLocal}</div>
 <h1 className="text-3xl md:text-5xl font-bold text-surface-800 tracking-tight leading-tight">
 {cat.name} at Home
 </h1>
 <p className="mt-4 text-lg text-surface-500 max-w-2xl leading-relaxed">{cat.description}</p>

 <div className="mt-6 flex flex-wrap gap-3">
 <div className="inline-flex items-center gap-2 bg-white border border-[var(--color-border)] px-3 py-2 rounded-lg text-sm text-surface-700">
 <Clock className="w-4 h-4 text-saffron-600" />
 {cat.duration}
 </div>
 <div className="inline-flex items-center gap-2 bg-white border border-[var(--color-border)] px-3 py-2 rounded-lg text-sm text-surface-700">
 <Shield className="w-4 h-4 text-tulsi-green" />
 Verified Pandits
 </div>
 <div className="inline-flex items-center gap-2 bg-white border border-[var(--color-border)] px-3 py-2 rounded-lg text-sm text-surface-700">
 <Package className="w-4 h-4 text-temple-gold" />
 Samagri included
 </div>
 </div>
 </div>

 {/* ── Book card ───────────────────────────────────────── */}
 <aside className="sticky top-24 h-fit bg-white border border-[var(--color-border)] rounded-2xl shadow-warm-md p-6">
 <div className="text-sm text-surface-500 mb-1">Starting at</div>
 <div className="flex items-baseline gap-2 mb-1">
 <span className="text-3xl font-bold text-surface-800">
 ₹{cat.startingPrice.toLocaleString('en-IN')}
 </span>
 <span className="text-sm text-surface-500">onwards</span>
 </div>
 <div className="text-xs text-surface-400 mb-5">All samagri + prasadam included</div>

 <div className="space-y-2 mb-5">
 {[
 { k: 'Duration', v: cat.duration },
 { k: 'Muhurat', v: cat.muhurat.split('.')[0] },
 { k: 'Pandits available', v: `${pandits.length} verified` },
 ].map((r) => (
 <div key={r.k} className="flex items-start justify-between gap-3 text-sm">
 <span className="text-surface-500">{r.k}</span>
 <span className="text-surface-800 font-medium text-right">{r.v}</span>
 </div>
 ))}
 </div>

 <Link
 href={`/pujas/home-puja/${cat.slug}/book`}
 className="block w-full text-center py-3.5 rounded-lg font-semibold text-white transition-colors"
 style={{ background: 'var(--color-primary)' }}
 >
 Book Now
 </Link>
 <div className="mt-3 text-center text-xs text-surface-500">
 Free cancellation up to 24 hours before
 </div>
 </aside>
 </div>
 </section>

 {/* ── Significance ───────────────────────────────────────────── */}
 <section className="py-12 bg-white border-y border-[var(--color-border)]">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight mb-6">
 Spiritual significance
 </h2>
 <div className="space-y-4">
 {cat.significance.map((para, i) => (
 <p key={i} className="text-surface-600 leading-relaxed">
 {para}
 </p>
 ))}
 </div>
 </div>
 </section>

 {/* ── What's included + prepare ──────────────────────────────── */}
 <section className="py-12 md:py-16">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-8">
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 md:p-8">
 <h3 className="text-xl font-bold text-surface-800 mb-5 flex items-center gap-2">
 <Package className="w-5 h-5 text-saffron-600" />
 What&rsquo;s included
 </h3>
 <ul className="space-y-3">
 {cat.included.map((item, i) => (
 <li key={i} className="flex gap-3 text-surface-600">
 <CheckCircle className="w-4.5 h-4.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 <span className="text-sm">{item}</span>
 </li>
 ))}
 </ul>
 </div>

 <div className="bg-sandal-cream border border-temple-gold/30 rounded-xl p-6 md:p-8">
 <h3 className="text-xl font-bold text-surface-800 mb-3 flex items-center gap-2">
 <Home className="w-5 h-5 text-temple-gold-dark" />
 What to prepare at home
 </h3>
 <p className="text-surface-600 text-sm leading-relaxed">{cat.prepareAtHome}</p>

 <div className="mt-6 pt-5 border-t border-temple-gold/30">
 <h4 className="text-sm font-bold text-surface-800 flex items-center gap-2 mb-2">
 <Calendar className="w-4 h-4 text-temple-gold-dark" />
 Recommended muhurat
 </h4>
 <p className="text-surface-600 text-sm leading-relaxed">{cat.muhurat}</p>
 </div>
 </div>
 </div>
 </section>

 {/* ── Pricing tiers ──────────────────────────────────────────── */}
 <section className="py-12 md:py-16 bg-[#ede9e3]">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="text-center mb-10">
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight">
 Pricing tiers
 </h2>
 <p className="mt-2 text-surface-500">Transparent pricing based on samagri quality and duration.</p>
 </div>

 <div className="grid md:grid-cols-3 gap-5">
 {(['basic', 'standard', 'premium'] as const).map((tier) => {
 const isFeatured = tier === 'standard';
 return (
 <div
 key={tier}
 className={`relative rounded-xl p-7 transition-all ${
 isFeatured
 ? 'bg-white border-2 border-saffron-500 shadow-warm-md md:-translate-y-2'
 : 'bg-white border border-[var(--color-border)]'
 }`}
 >
 {isFeatured && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-saffron-600 text-white text-xs font-bold px-3 py-1 rounded-full">
 Most Popular
 </div>
 )}
 <div className="text-sm font-semibold uppercase tracking-wide text-surface-500 mb-1">
 {tier}
 </div>
 <div className="flex items-baseline gap-1 mb-5">
 <span className="text-4xl font-bold text-surface-800">
 ₹{cat.pricing[tier].toLocaleString('en-IN')}
 </span>
 </div>
 <ul className="space-y-3 mb-7">
 {cat.pricingDetails[tier].map((d, i) => (
 <li key={i} className="flex gap-2.5 text-sm text-surface-600">
 <CheckCircle className="w-4 h-4 text-tulsi-green flex-shrink-0 mt-0.5" />
 <span>{d}</span>
 </li>
 ))}
 </ul>
 <Link
 href={`/pujas/home-puja/${cat.slug}/book?tier=${tier}`}
 className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
 isFeatured
 ? 'bg-saffron-600 text-white hover:bg-saffron-700'
 : 'bg-surface-100 text-surface-800 hover:bg-surface-200 border border-[var(--color-border)]'
 }`}
 >
 Choose {tier}
 </Link>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* ── Available pandits ──────────────────────────────────────── */}
 <section className="py-12 md:py-16">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-end justify-between mb-8">
 <div>
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight">
 {usingFallback ? 'Featured pandits' : 'Available pandits'}
 </h2>
 <p className="mt-2 text-surface-500">
 {usingFallback
 ? `Top verified pandits on Darshya. Any can perform ${cat.name} at your home.`
 : `Verified specialists ready to perform ${cat.name} at your home.`}
 </p>
 </div>
 </div>

 {pandits.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-surface-200 p-12 text-center bg-white">
 <Users className="w-12 h-12 text-saffron-300 mx-auto mb-3" />
 <h3 className="text-lg font-semibold text-surface-800 mb-2">
 Verified pandits coming soon
 </h3>
 <p className="text-sm text-surface-500 max-w-md mx-auto">
 We are onboarding verified pandits for {cat.name}. New profiles will appear here shortly.
 </p>
 </div>
 ) : (
 <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
 {pandits.map((p) => (
 <Link
 key={p.id}
 href={`/pandits/${p.id}`}
 className="group bg-white border border-[var(--color-border)] rounded-xl p-5 hover:shadow-warm-md hover:-translate-y-0.5 transition-all flex gap-4"
 >
 {p.avatarUrl ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={p.avatarUrl}
 alt={p.displayName}
 className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
 />
 ) : (
 <div className="w-20 h-20 rounded-xl bg-saffron-100 flex items-center justify-center text-saffron-700 font-bold text-xl flex-shrink-0">
 {panditInitials(p.displayName)}
 </div>
 )}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <div className="font-bold text-surface-800 group-hover:text-saffron-600 transition-colors truncate">
 {p.displayName}
 </div>
 {p.specializations.length > 0 && (
 <div className="text-xs text-surface-500 truncate">
 {p.specializations.slice(0, 2).join(' · ')}
 </div>
 )}
 </div>
 {p.isVerified && (
 <BadgeCheck className="w-5 h-5 text-tulsi-green flex-shrink-0" />
 )}
 </div>
 <div className="flex items-center gap-2 mt-2 text-xs">
 {p.ratingCount > 0 ? (
 <>
 <Star className="w-3.5 h-3.5 text-temple-gold fill-temple-gold" />
 <span className="font-semibold text-surface-700">{p.ratingAvg.toFixed(1)}</span>
 <span className="text-surface-400">({p.ratingCount})</span>
 </>
 ) : (
 <span className="text-surface-400">New</span>
 )}
 {p.experienceYears > 0 && (
 <>
 <span className="text-surface-300">·</span>
 <span className="text-surface-500 inline-flex items-center gap-1">
 <Award className="w-3 h-3" />
 {p.experienceYears}+ yrs
 </span>
 </>
 )}
 </div>
 {p.languages.length > 0 && (
 <div className="flex items-center gap-1 mt-1.5 text-xs text-surface-500">
 <Languages className="w-3 h-3" />
 {p.languages.slice(0, 3).join(', ')}
 </div>
 )}
 <div className="mt-3 pt-3 border-t border-[var(--color-divider)] flex items-center justify-between">
 <span className="inline-flex items-center gap-1 text-xs text-surface-500">
 <Flame className="w-3 h-3 text-saffron-500" />
 {p.offeringCount} puja service{p.offeringCount === 1 ? '' : 's'}
 </span>
 <span className="text-xs font-semibold text-saffron-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
 View profile <ArrowRight className="w-3.5 h-3.5" />
 </span>
 </div>
 </div>
 </Link>
 ))}
 </div>
 )}
 </div>
 </section>

 {/* ── FAQ ──────────────────────────────────────────────────── */}
 <section className="py-12 md:py-16 bg-white border-t border-[var(--color-border)]">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <h2 className="text-3xl md:text-4xl font-bold text-surface-800 tracking-tight text-center mb-10">
 Frequently asked questions
 </h2>
 <div className="space-y-3">
 {cat.faq.map((f, i) => (
 <details
 key={i}
 className="group bg-surface-100 border border-[var(--color-border)] rounded-xl overflow-hidden"
 >
 <summary className="cursor-pointer px-5 py-4 font-semibold text-surface-800 flex items-center justify-between gap-4 hover:bg-surface-200 transition-colors">
 {f.q}
 <ChevronRight className="w-5 h-5 text-surface-400 group-open:rotate-90 transition-transform flex-shrink-0" />
 </summary>
 <div className="px-5 pb-5 text-surface-600 leading-relaxed">{f.a}</div>
 </details>
 ))}
 </div>
 </div>
 </section>

 {/* ── CTA ───────────────────────────────────────────────────── */}
 <section className="py-16 bg-[#ede9e3]">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <Sparkles className="w-10 h-10 text-saffron-500 mx-auto mb-3" />
 <h2 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight">
 Ready to book your {cat.name}?
 </h2>
 <p className="mt-3 text-surface-500">
 Choose a muhurat and pandit. We&rsquo;ll handle the rest.
 </p>
 <div className="mt-6">
 <Link
 href={`/pujas/home-puja/${cat.slug}/book`}
 className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-white transition-colors"
 style={{ background: 'var(--color-primary)' }}
 >
 Book Now
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </div>
 </section>
 </div>
 );
}
