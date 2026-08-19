import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
 Calendar,
 MapPin,
 Mountain,
 Compass,
 Users,
 Shield,
 Plane,
 Car,
 Check,
 X,
 Star,
 ArrowRight,
 Heart,
 Sparkles,
 Flame,
 Gift,
 Video,
 ChevronRight,
 Clock,
} from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';
import { getYatraBySlug, yatras, formatINR } from '../../../lib/yatra-data';

export function generateStaticParams() {
 return yatras.map((y) => ({ slug: y.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const { slug } = await params;
 const yatra = getYatraBySlug(slug);
 if (!yatra) return { title: 'Yatra not found' };
 return {
 title: `${yatra.title} — ${yatra.durationDays} days`,
 alternates: { canonical: `https://darshya.online/yatra/${slug}` },
 description: yatra.description,
 };
}

export default async function YatraDetailPage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 const yatra = getYatraBySlug(slug);
 if (!yatra) return notFound();

 const lowestPackage = yatra.packages.reduce(
 (min, p) => (p.price < min ? p.price : min),
 yatra.packages[0]?.price ?? yatra.startingPrice,
 );
 const highestPackage = yatra.packages.reduce(
 (max, p) => (p.price > max ? p.price : max),
 yatra.packages[0]?.price ?? yatra.startingPrice,
 );

 const jsonLd = {
 '@context': 'https://schema.org',
 '@type': 'TouristTrip',
 name: yatra.title,
 description: yatra.description,
 image: [yatra.heroImage, ...yatra.gallery].slice(0, 6),
 url: `https://darshya.online/yatra/${yatra.slug}`,
 touristType: 'Pilgrims',
 itinerary: yatra.places.map((place, i) => ({
 '@type': 'Place',
 name: place,
 position: i + 1,
 })),
 subjectOf: {
 '@type': 'CreativeWork',
 name: `${yatra.title} — ${yatra.durationDays} day itinerary`,
 },
 provider: {
 '@type': 'Organization',
 name: 'Darshya',
 url: 'https://darshya.online',
 },
 offers: {
 '@type': 'AggregateOffer',
 priceCurrency: 'INR',
 lowPrice: lowestPackage,
 highPrice: highestPackage,
 offerCount: yatra.packages.length,
 availability: 'https://schema.org/InStock',
 url: `https://darshya.online/yatra/${yatra.slug}/book`,
 offers: yatra.packages.map((pkg) => ({
 '@type': 'Offer',
 name: `${yatra.title} — ${pkg.name}`,
 description: pkg.tagline,
 price: pkg.price,
 priceCurrency: 'INR',
 availability: 'https://schema.org/InStock',
 url: `https://darshya.online/yatra/${yatra.slug}/book?tier=${pkg.tier}`,
 })),
 },
 };

 const diffColor = {
 easy: '#16a34a',
 moderate: '#b87333',
 challenging: '#943B19',
 extreme: '#a12c7b',
 }[yatra.difficulty];

 return (
 <ScrollReveal>
 <div style={{ background: 'var(--color-bg)' }}>
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 />
 {/* ═══ HERO ═════════════════════════════════════════════ */}
 <section className="relative">
 <div className="absolute inset-0">
 <img width={1600} height={900} src={yatra.heroImage} alt={yatra.title} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
 </div>

 <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
 <div className="flex items-center gap-2 text-xs text-white/70 mb-4">
 <Link href="/yatra" className="hover:text-white">Yatra</Link>
 <ChevronRight className="w-3 h-3" />
 <span>{yatra.title}</span>
 </div>

 <div
 data-reveal="spring"
 className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-white/10 backdrop-blur-sm text-white"
 >
 <Mountain className="w-3 h-3" />
 {yatra.region === 'himalayas' ? 'Himalayan Pilgrimage' : `${yatra.region} India pilgrimage`}
 </div>

 <h1 data-reveal="cinematic" className="heading-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-tight max-w-2xl">
 {yatra.title}
 </h1>
 <p data-reveal="up" data-delay="1" className="mt-3 text-sm text-white/80 max-w-2xl leading-relaxed">
 {yatra.subtitle}
 </p>

 <div data-reveal="fade" data-delay="2" className="mt-6 flex flex-wrap items-center gap-5 text-xs text-white/80">
 <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {yatra.durationDays} days</span>
 <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {yatra.distanceKm.toLocaleString('en-IN')} km</span>
 <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> {yatra.deity}</span>
 <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Best: {yatra.bestTime}</span>
 <span className="flex items-center gap-1.5">
 <span className="inline-block w-2 h-2 rounded-full" style={{ background: diffColor }} />
 {yatra.difficulty}
 </span>
 </div>

 <div data-reveal="spring" data-delay="3" className="mt-8 flex flex-wrap items-center gap-3">
 <Link
 href={`/yatra/${yatra.slug}/book`}
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Book This Yatra <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 <Link
 href="/yatra/plan"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
 >
 Customize It
 </Link>
 </div>
 </div>
 </section>

 {/* ═══ OVERVIEW + PLACES ═════════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8">
 <div className="md:col-span-2">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>About this yatra</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 {yatra.description}
 </h2>
 <p data-reveal="up" data-delay="1" className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
 {yatra.longDescription}
 </p>

 <div className="mt-6">
 <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text)' }}>Highlights</p>
 <div data-reveal="up" className="grid sm:grid-cols-2 gap-2">
 {yatra.highlights.map((h, i) => (
 <div key={i} className="flex items-start gap-2">
 <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
 <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{h}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Places / Map preview */}
 <aside className="rounded-xl p-5 h-fit sticky top-20" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div className="flex items-center gap-2 mb-4">
 <MapPin className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>Route — {yatra.places.length} stops</p>
 </div>
 <div className="space-y-2.5">
 {yatra.places.map((p, i) => (
 <div key={i} className="flex items-center gap-2.5">
 <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>
 {i + 1}
 </div>
 <span className="text-xs" style={{ color: 'var(--color-text)' }}>{p}</span>
 </div>
 ))}
 </div>
 {yatra.helicopterAvailable && (
 <div className="mt-5 p-3 rounded-lg" style={{ background: 'var(--color-primary-highlight)' }}>
 <div className="flex items-center gap-2 mb-1">
 <Plane className="w-3.5 h-3.5" style={{ color: 'var(--color-primary-active)' }} />
 <p className="text-xs font-semibold" style={{ color: 'var(--color-primary-active)' }}>Helicopter available</p>
 </div>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Skip the strenuous trek — add helicopter at checkout.</p>
 </div>
 )}
 </aside>
 </div>
 </section>

 {/* ═══ ITINERARY ═════════════════════════════════════════ */}
 <section className="py-10 md:py-12" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center gap-2 mb-2">
 <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>Day-by-day itinerary</p>
 </div>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Your {yatra.durationDays}-day journey
 </h2>

 <div data-reveal="up" className="relative">
 <div className="absolute left-5 top-2 bottom-2 w-px" style={{ background: 'var(--color-divider)' }} />
 <div className="space-y-3">
 {yatra.itinerary.map((d) => (
 <div key={d.day} className="relative pl-14">
 <div className="absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
 D{d.day}
 </div>
 <div className="rounded-xl p-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{d.title}</h3>
 <p className="text-xs leading-relaxed mb-2.5" style={{ color: 'var(--color-text-muted)' }}>{d.description}</p>
 <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1"><MapPin className="w-3 h-3" style={{ color: 'var(--color-primary)' }} /> {d.stay}</span>
 <span className="flex items-center gap-1"><Flame className="w-3 h-3" style={{ color: 'var(--color-primary)' }} /> {d.meals}</span>
 </div>
 {d.highlights.length > 0 && (
 <div className="mt-2.5 flex flex-wrap gap-1">
 {d.highlights.map((h) => (
 <span key={h} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>{h}</span>
 ))}
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ═══ GALLERY ═══════════════════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Photo gallery</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Glimpses from the sacred path
 </h2>
 <div data-reveal="up" className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {yatra.gallery.slice(0, 6).map((src, i) => (
 <div key={i} className="aspect-square rounded-xl overflow-hidden card-hover">
 <img width={400} height={400} src={src} alt={`${yatra.title} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ INCLUSIONS/EXCLUSIONS ═════════════════════════════ */}
 <section className="py-10 md:py-12" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-5">
 <div data-reveal="spring" className="rounded-xl p-5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <div className="flex items-center gap-2 mb-4">
 <Check className="w-4 h-4" style={{ color: 'var(--color-status-success)' }} />
 <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-status-success)' }}>What&apos;s included</p>
 </div>
 <ul className="space-y-2">
 {yatra.inclusions.map((item) => (
 <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text)' }}>
 <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-status-success)' }} />
 {item}
 </li>
 ))}
 </ul>
 </div>
 <div data-reveal="spring" data-delay="1" className="rounded-xl p-5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <div className="flex items-center gap-2 mb-4">
 <X className="w-4 h-4" style={{ color: 'var(--color-status-warning)' }} />
 <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-status-warning)' }}>Not included</p>
 </div>
 <ul className="space-y-2">
 {yatra.exclusions.map((item) => (
 <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <X className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-status-warning)' }} />
 {item}
 </li>
 ))}
 </ul>
 </div>
 </div>
 </section>

 {/* ═══ PACKAGES ═══════════════════════════════════════════ */}
 <section className="py-10 md:py-14">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2 text-center" style={{ color: 'var(--color-primary)' }}>Choose your package</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-6 text-center" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Three tiers, one sacred journey
 </h2>

 <div className="grid md:grid-cols-3 gap-4">
 {yatra.packages.map((pkg, i) => {
 const isPremium = pkg.tier === 'premium';
 const isStandard = pkg.tier === 'standard';
 return (
 <div
 key={pkg.tier}
 data-reveal="cascade"
 data-delay={String(i + 1)}
 className="relative rounded-xl p-5 card-hover flex flex-col"
 style={{
 background: isStandard ? 'linear-gradient(135deg, var(--color-primary-highlight), var(--color-surface))' : 'var(--color-surface)',
 border: isStandard ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
 }}
 >
 {isStandard && (
 <div className="absolute -top-3 left-5 px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: 'var(--color-primary)' }}>
 MOST POPULAR
 </div>
 )}
 <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>{pkg.tier}</p>
 <h3 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{pkg.name}</h3>
 <p className="text-xs mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>{pkg.tagline}</p>

 <div className="mb-4">
 <p className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
 {formatINR(pkg.price)} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/ person</span>
 </p>
 <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>Twin sharing • Taxes extra</p>
 </div>

 <div className="space-y-1.5 mb-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <div className="flex items-center gap-2"><Car className="w-3 h-3" style={{ color: 'var(--color-primary)' }} /> {pkg.transport}</div>
 <div className="flex items-center gap-2"><MapPin className="w-3 h-3" style={{ color: 'var(--color-primary)' }} /> {pkg.stay}</div>
 <div className="flex items-center gap-2"><Users className="w-3 h-3" style={{ color: 'var(--color-primary)' }} /> {pkg.guide}</div>
 </div>

 <ul className="space-y-1.5 mb-5 flex-1">
 {pkg.includes.map((inc) => (
 <li key={inc} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-text)' }}>
 <Check className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--color-status-success)' }} />
 {inc}
 </li>
 ))}
 </ul>

 <Link
 href={`/yatra/${yatra.slug}/book?tier=${pkg.tier}`}
 className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg btn-press transition-all"
 style={{
 background: isStandard || isPremium ? 'var(--color-primary)' : 'transparent',
 color: isStandard || isPremium ? '#fff' : 'var(--color-primary)',
 border: isStandard || isPremium ? 'none' : '1px solid var(--color-primary)',
 }}
 >
 Book {pkg.name} <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 );
 })}
 </div>

 {/* Helicopter highlight */}
 {yatra.helicopterAvailable && (
 <div data-reveal="glow" data-delay="3" className="mt-8 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4" style={{ background: 'linear-gradient(135deg, var(--color-art-1), var(--color-art-3))', border: '1px solid var(--color-border)' }}>
 <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary)' }}>
 <Plane className="w-5 h-5 text-white" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Helicopter service available</p>
 <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
 Skip strenuous treks and altitude challenges — we pre-book helicopter slots at IRCTC-authorized operators. Premium package includes return helicopter.
 </p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>From</p>
 <p className="text-base font-semibold" style={{ color: 'var(--color-primary)' }}>{formatINR(8000)}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>per person, one-way</p>
 </div>
 </div>
 )}

 {/* Add-ons */}
 <div className="mt-8">
 <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text)' }}>Popular add-ons</p>
 <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { icon: Flame, title: 'Special puja at temple', price: '₹2,100', desc: 'Sankalpa with your name' },
 { icon: Gift, title: 'Prasad delivery', price: '₹500', desc: 'Temple prasad to your home' },
 { icon: Video, title: 'Live darshan recording', price: '₹1,500', desc: '4K video for family' },
 { icon: Shield, title: 'Travel insurance', price: '₹500', desc: 'Medical + trip cover' },
 ].map((a) => (
 <div key={a.title} className="p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <a.icon className="w-4 h-4 mb-2" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{a.title}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{a.desc}</p>
 <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-primary)' }}>+{a.price}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ═══ REVIEWS ═══════════════════════════════════════════ */}
 <section className="py-10 md:py-12" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>Pilgrim reviews</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Stories from past devotees
 </h2>
 <div data-reveal="up" className="grid md:grid-cols-3 gap-4">
 {yatra.reviews.map((r, i) => (
 <div key={i} className="rounded-xl p-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <div className="flex items-center gap-1 mb-2">
 {Array.from({ length: 5 }).map((_, s) => (
 <Star key={s} className="w-3 h-3" fill={s < r.rating ? 'var(--color-primary)' : 'transparent'} style={{ color: 'var(--color-primary)' }} />
 ))}
 </div>
 <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text)' }}>&ldquo;{r.comment}&rdquo;</p>
 <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{r.name}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.location} • {r.date}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ FAQ ═══════════════════════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>FAQ</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Before you travel
 </h2>
 <div data-reveal="up" className="space-y-3">
 {yatra.faqs.map((f, i) => (
 <details key={i} className="group rounded-xl p-4 cursor-pointer" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <summary className="flex items-center justify-between list-none">
 <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{f.q}</span>
 <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" style={{ color: 'var(--color-primary)' }} />
 </summary>
 <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{f.a}</p>
 </details>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ FINAL CTA ═════════════════════════════════════════ */}
 <section className="py-12 md:py-16" style={{ background: 'linear-gradient(135deg, var(--color-primary-highlight), var(--color-surface))' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <Mountain className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
 <h2 data-reveal="cinematic" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Ready for {yatra.title}?
 </h2>
 <p data-reveal="up" data-delay="1" className="text-sm max-w-lg mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
 Secure your dates with a ₹5,000 booking advance. Balance payable 30 days before departure.
 </p>
 <div data-reveal="spring" data-delay="2" className="flex items-center justify-center gap-3 flex-wrap">
 <Link
 href={`/yatra/${yatra.slug}/book`}
 className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Book This Yatra <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 <Link
 href="/yatra/companion"
 className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all"
 style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
 >
 <Heart className="w-3.5 h-3.5" /> Add Companion
 </Link>
 </div>
 </div>
 </section>
 </div>
 </ScrollReveal>
 );
}
