import type { Metadata } from 'next';

export const revalidate = 3600;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
 ChevronRight,
 Flame,
 Clock,
 Shield,
 Video,
 Gift,
 CheckCircle2,
 Star,
 MapPin,
 Users,
 IndianRupee,
 DollarSign,
 Heart,
 Share2,
 Sparkles,
 BadgeCheck,
 ArrowRight,
 Package,
 Undo2,
} from 'lucide-react';
import { getDeityImage, getPujaImage } from '../../../lib/images';

// ─── Types ─────────────────────────────────────────────────────────

interface PujaTempleOffering {
 id: string;
 templeName: string;
 templeSlug: string;
 templeCity: string;
 templeState: string;
 priceOverride: string | null;
 availableSlots: { time: string; label: string }[];
 isActive: boolean;
 trustScore: number;
 isVerified: boolean;
}

interface PujaDetail {
 id: string;
 name: string;
 nameLocal: string | null;
 slug: string;
 description: string;
 // P0 #202: the api does NOT return longDescription/benefits/samagriList (they
 // are null). Make them optional + add the api's actual samagriItems so the
 // render can guard instead of crashing on undefined.
 longDescription?: string;
 category: string;
 deity: string;
 durationMinutes: number;
 basePrice: string;
 nriPrice: string;
 samagriIncluded: boolean;
 samagriList?: string[];
 samagriItems?: string[];
 benefits?: string[];
 images: { url: string; alt: string }[];
 isActive: boolean;
 temples: PujaTempleOffering[];
}

// P0 #202 (cont.): same API_URL-vs-localhost bug as the /temples subroute —
// prod has no API_URL so this hit localhost and the page broke. Use the shared
// SSR base (falls back to the prod API). Add the /api/v1 suffix ONLY when the
// base doesn't already end with it (NEXT_PUBLIC_API_URL on prod is the bare
// origin, but local .env.local already includes /api/v1 — double suffix = 404).
const _pujaApiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
const API_BASE = _pujaApiBase.endsWith('/api/v1')
  ? _pujaApiBase
  : `${_pujaApiBase.replace(/\/$/, '')}/api/v1`;

// P0 #202 (cont.): the api returns `images` as a plain string[] of URLs, but the
 // page types it as `{ url, alt }[]` and renders `images[0].url` / `<Image>`.
 // Normalize the api payload at the boundary so downstream code always sees
 // the object shape — a string entry becomes `{ url: entry, alt: name }`.
 function normalizePuja(puja: PujaDetail): PujaDetail {
  if (!puja) return puja;
  const imgs = Array.isArray(puja.images) ? puja.images : [];
  const normalized = imgs
    .map((i) => {
      if (typeof i === 'string') return { url: i, alt: puja.name ?? 'puja' };
      if (i && typeof i === 'object' && 'url' in i) return i;
      return null;
    })
    .filter(Boolean) as { url: string; alt: string }[];
  // S2C-06 (2026-08-11): the fabricated fallback used to guarantee `temples`.
  // With it gone the api payload is the only source, so guard the array the
  // render reduces over instead of trusting it.
  const temples = Array.isArray(puja.temples) ? puja.temples : [];
  return { ...puja, images: normalized, temples };
 }

// S2C-06 (2026-08-11): this used to swallow EVERY failure — including the
// api's explicit 404 for an unknown slug — and return a manufactured puja
// (title-cased slug, invented ₹751 / $3,501 price, two fake isVerified
// temples). Inventing a price on a commerce page is not an acceptable
// degradation, and it also masked real api outages by silently repricing
// every genuine puja. Now the three outcomes are distinguished so the page
// can 404 an unknown slug and show an honest error when the api is down.
type PujaLookup =
 | { status: 'ok'; puja: PujaDetail }
 | { status: 'not-found' }
 | { status: 'unavailable' };

async function getPujaBySlug(slug: string): Promise<PujaLookup> {
 try {
 const res = await fetch(`${API_BASE}/pujas/types/${slug}`, {
 next: { revalidate: 300, tags: [`puja-${slug}`] },
 });
 if (res.status === 404) return { status: 'not-found' };
 if (!res.ok) throw new Error(`API error ${res.status}`);
 return { status: 'ok', puja: normalizePuja(await res.json()) };
 } catch {
 return { status: 'unavailable' };
 }
}

export async function generateMetadata({
 params,
}: {
 params: Promise<{ slug: string }>;
}): Promise<Metadata> {
 const { slug } = await params;
 const lookup = await getPujaBySlug(slug);

 // S2C-06 (2026-08-11): never emit an indexable, self-canonical Product page
 // for a slug we could not resolve — that is what turned every typo URL into
 // a soft-404 carrying fabricated price schema.
 if (lookup.status !== 'ok') {
   return {
     title: lookup.status === 'not-found' ? 'Puja not found | Darshya' : 'Puja unavailable | Darshya',
     robots: { index: false, follow: false },
   };
 }
 const puja = lookup.puja;

 const url = `https://darshya.online/pujas/${slug}`;
 const title = `${puja.name} — Book Online | Darshya`;
 const description = `Book ${puja.name} online at verified temples. ${puja.description.slice(0, 140)}`;

 // P0 #202 (cont.): the api returns `images` as a string[] of URLs, but the
 // page previously read `images[0].url` (object shape) → undefined → Next
 // <Image src={undefined}> crashed the page to a 500. Handle both shapes.
 const img0 = Array.isArray(puja.images) && puja.images.length > 0 ? puja.images[0] : undefined;
 const firstPujaImage =
   typeof img0 === 'string'
     ? img0
     : (img0 as { url?: string } | undefined)?.url;
 const pujaCatalogImage = getPujaImage(slug);
 const deitySlug = (puja.deity || 'lord-shiva').toLowerCase().replace(/\s+/g, '-');
 // Dynamic branded card — always available, reflects live title + price.
 const dynamicOg = `https://darshya.online/og/puja/${slug}`;
 const ogImage = firstPujaImage || pujaCatalogImage || getDeityImage(deitySlug) || dynamicOg;

 return {
   title,
   description,
   alternates: { canonical: url },
   openGraph: {
     title,
     description,
     type: 'website',
     url,
     siteName: 'Darshya',
     images: [
       {
         url: ogImage,
         width: 1200,
         height: 630,
         alt: puja.name,
       },
     ],
   },
   twitter: {
     card: 'summary_large_image',
     title,
     description,
     images: [ogImage],
   },
 };
}

export default async function PujaDetailPage({
 params,
}: {
 params: Promise<{ slug: string }>;
}) {
 const { slug } = await params;
 const lookup = await getPujaBySlug(slug);

 if (lookup.status !== 'ok') {
   // S2C-06 (2026-08-11): unknown slug → a real 404, not an invented product.
   if (lookup.status === 'not-found') notFound();
   // API unreachable → hand off to error.tsx ("Couldn't load this puja" +
   // retry) rather than quoting a price we cannot stand behind.
   throw new Error(`Puja catalogue unavailable for slug "${slug}"`);
 }
 const puja = lookup.puja;

 const lowestPrice = puja.temples.reduce((min, t) => {
 const p = Number(t.priceOverride || puja.basePrice);
 return p < min ? p : min;
 }, Number(puja.basePrice));

 const jsonLd = {
 '@context': 'https://schema.org',
 '@type': 'Product',
 name: puja.name,
 description: puja.description,
 category: puja.category,
 image:
   Array.isArray(puja.images) && puja.images.length > 0
     ? puja.images.map((i) => (typeof i === 'string' ? i : (i as { url?: string })?.url)).filter(Boolean)
     : undefined,
 brand: {
 '@type': 'Organization',
 name: 'Darshya',
 },
 offers: {
 '@type': 'AggregateOffer',
 priceCurrency: 'INR',
 lowPrice: lowestPrice,
 highPrice: Number(puja.basePrice) * 5,
 offerCount: puja.temples.length,
 availability: 'https://schema.org/InStock',
 url: `https://darshya.online/pujas/${puja.slug}`,
 offers: puja.temples.map((temple) => ({
 '@type': 'Offer',
 name: `${puja.name} at ${temple.templeName}`,
 price: Number(temple.priceOverride || puja.basePrice),
 priceCurrency: 'INR',
 availability: temple.isActive
 ? 'https://schema.org/InStock'
 : 'https://schema.org/OutOfStock',
 url: `https://darshya.online/pujas/${puja.slug}/book?temple=${temple.templeSlug}`,
 areaServed: {
 '@type': 'Place',
 name: `${temple.templeCity}, ${temple.templeState}`,
 },
 })),
 },
 };

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 />
 {/* Breadcrumb */}
 <div className="border-b border-surface-100 bg-white">
 <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
 <nav className="flex items-center gap-2 text-sm text-surface-500">
 <Link href="/" className="hover:text-orange-600">
 Home
 </Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <Link href="/pujas" className="hover:text-orange-600">
 Pujas
 </Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <span className="font-medium text-surface-700">{puja.name}</span>
 </nav>
 </div>
 </div>

 {/* Hero Section */}
 <section className="bg-gradient-to-br from-saffron-600 via-saffron-500 to-temple-gold">
 <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
 <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
 {/* Left: Puja Info */}
 <div className="lg:col-span-3">
 <div className="mb-3 flex flex-wrap items-center gap-2">
 <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
 <Flame className="h-3 w-3" />
 {puja.category}
 </span>
 <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
 {puja.deity}
 </span>
 </div>
 <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
 {puja.name}
 </h1>
 {puja.nameLocal && (
 <p className="mb-4 text-lg text-white/80">{puja.nameLocal}</p>
 )}
 <p className="mb-6 max-w-xl text-base leading-relaxed text-white/90">
 {puja.description}
 </p>

 <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
 <span className="flex items-center gap-1.5">
 <Clock className="h-4 w-4" />
 {puja.durationMinutes} minutes
 </span>
 <span className="text-white/40">|</span>
 <span className="flex items-center gap-1.5">
 <MapPin className="h-4 w-4" />
 {puja.temples.length} temple{puja.temples.length !== 1 ? 's' : ''}
 </span>
 {puja.samagriIncluded && (
 <>
 <span className="text-white/40">|</span>
 <span className="flex items-center gap-1.5">
 <Package className="h-4 w-4" />
 Samagri Included
 </span>
 </>
 )}
 </div>
 </div>

 {/* Right: Price Card */}
 <div className="lg:col-span-2">
 <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
 <div className="mb-4">
 <p className="mb-1 text-sm font-medium text-white/70">Starting from</p>
 <div className="flex items-baseline gap-3">
 <div className="flex items-center gap-1">
 <IndianRupee className="h-6 w-6 text-white" />
 <span className="text-xl font-semibold text-white">
 {Number(puja.basePrice).toLocaleString('en-IN')}
 </span>
 </div>
 </div>
 <div className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
 <DollarSign className="h-3.5 w-3.5" />
 <span>NRI Price: ${Number(puja.nriPrice).toLocaleString('en-US')}</span>
 </div>
 </div>

 <Link
 href={`/pujas/${puja.slug}/book`}
 className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3.5 text-base font-medium text-saffron-600 shadow-lg transition-all hover:bg-saffron-50 hover:shadow-xl"
 >
 <Flame className="h-5 w-5" />
 Book This Puja
 </Link>

 <div className="flex items-center justify-center gap-3">
 <button className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
 <Heart className="h-4 w-4" />
 Save
 </button>
 <span className="text-white/30">|</span>
 <button className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
 <Share2 className="h-4 w-4" />
 Share
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* Trust Badges */}
 <div className="border-b border-surface-100 bg-white">
 <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 {[
 { icon: Shield, label: 'Verified Pandits', desc: 'Aadhaar-verified priests' },
 { icon: Video, label: 'Live Video Proof', desc: 'Watch your puja live' },
 { icon: Gift, label: 'Prasad Delivery', desc: 'Sacred prasad to your door' },
 { icon: Undo2, label: 'Money-Back Guarantee', desc: '100% refund if not satisfied' },
 ].map((badge) => (
 <div
 key={badge.label}
 className="flex items-center gap-3 rounded-xl border border-surface-100 bg-saffron-50/50 p-3"
 >
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-saffron-100">
 <badge.icon className="h-5 w-5 text-saffron-600" />
 </div>
 <div>
 <p className="text-sm font-semibold text-surface-700">{badge.label}</p>
 <p className="text-xs text-surface-500">{badge.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
 <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
 {/* Left Column */}
 <div className="space-y-8 lg:col-span-2">
 {/* About the Puja */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <Sparkles className="h-5 w-5 text-saffron-500" />
 About This Puja
 </h2>
 <div className="prose prose-stone max-w-none">
 {(puja.longDescription || puja.description || '').split('\n\n').map((para, i) => (
 <p key={i} className="mb-4 leading-relaxed text-surface-600">
 {para}
 </p>
 ))}
 </div>
 </div>

 {/* Benefits */}
 {(puja.benefits?.length ?? 0) > 0 && (
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <CheckCircle2 className="h-5 w-5 text-tulsi-green" />
 Benefits
 </h2>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 {(puja.benefits ?? []).map((benefit, i) => (
 <div
 key={i}
 className="flex items-start gap-2.5 rounded-lg bg-green-50/50 p-3"
 >
 <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tulsi-green" />
 <span className="text-sm text-surface-600">{benefit}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Samagri List */}
 {puja.samagriIncluded && (puja.samagriList ?? puja.samagriItems ?? []).length > 0 && (
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <Package className="h-5 w-5 text-saffron-500" />
 Samagri (Materials Included)
 </h2>
 <p className="mb-4 text-sm text-surface-500">
 All puja materials are arranged by the temple. No need to send anything separately.
 </p>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
 {(puja.samagriList ?? puja.samagriItems ?? []).map((item, i) => (
 <div
 key={i}
 className="flex items-center gap-2 rounded-lg border border-surface-100 bg-amber-50/40 px-3 py-2"
 >
 <div className="h-1.5 w-1.5 rounded-full bg-saffron-500" />
 <span className="text-sm text-surface-600">{item}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Temples Offering This Puja */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <div className="mb-6 flex items-center justify-between gap-3">
 <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <MapPin className="h-5 w-5 text-saffron-500" />
 Available at {puja.temples.length} Temple{puja.temples.length !== 1 ? 's' : ''}
 </h2>
 <Link
 href={`/pujas/${puja.slug}/temples`}
 className="text-sm font-semibold text-saffron-700 hover:underline whitespace-nowrap"
 >
 Compare all →
 </Link>
 </div>
 <div className="space-y-4">
 {puja.temples.map((temple) => {
 const price = temple.priceOverride || puja.basePrice;
 return (
 <div
 key={temple.id}
 className="flex flex-col gap-4 rounded-xl border border-surface-100 p-4 transition-all hover:border-saffron-200 hover:bg-saffron-50/30 sm:flex-row sm:items-center"
 >
 <div className="min-w-0 flex-1">
 <div className="mb-1 flex items-center gap-2">
 <h3 className="font-semibold text-surface-800">{temple.templeName}</h3>
 {temple.isVerified && (
 <BadgeCheck className="h-4 w-4 text-tulsi-green" />
 )}
 </div>
 <p className="mb-2 flex items-center gap-1 text-sm text-surface-500">
 <MapPin className="h-3.5 w-3.5" />
 {temple.templeCity}, {temple.templeState}
 </p>
 <div className="flex flex-wrap items-center gap-2 text-xs text-surface-400">
 <span className="flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5">
 <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
 {(temple.trustScore / 20).toFixed(1)}
 </span>
 <span className="rounded-full bg-surface-100 px-2 py-0.5">
 {temple.availableSlots.length} time slots
 </span>
 </div>
 </div>
 <div className="flex items-center gap-3 sm:flex-col sm:items-end">
 <div className="text-xl font-bold text-saffron-600">
 ₹{Number(price).toLocaleString('en-IN')}
 </div>
 <Link
 href={`/pujas/${puja.slug}/book?temple=${temple.templeSlug}`}
 className="inline-flex items-center gap-1 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-saffron-700"
 >
 Book Now
 <ArrowRight className="h-3.5 w-3.5" />
 </Link>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Right Sidebar */}
 <div className="space-y-6">
 {/* Sticky CTA Card */}
 <div className="sticky top-24 space-y-6">
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h3 className="mb-3 font-semibold text-surface-800">Puja Details</h3>
 <div className="space-y-4">
 <SidebarRow icon={Flame} label="Deity" value={puja.deity} />
 <SidebarRow icon={Clock} label="Duration" value={`${puja.durationMinutes} minutes`} />
 <SidebarRow
 icon={IndianRupee}
 label="Price (INR)"
 value={`₹${Number(puja.basePrice).toLocaleString('en-IN')} onwards`}
 />
 <SidebarRow
 icon={DollarSign}
 label="Price (USD/NRI)"
 value={`$${Number(puja.nriPrice).toLocaleString('en-US')}`}
 />
 <SidebarRow
 icon={MapPin}
 label="Temples"
 value={`${puja.temples.length} temple${puja.temples.length !== 1 ? 's' : ''}`}
 />
 <SidebarRow
 icon={Package}
 label="Samagri"
 value={puja.samagriIncluded ? 'Included' : 'Not included'}
 />
 </div>

 <div className="mt-6 space-y-3">
 <Link
 href={`/pujas/${puja.slug}/book`}
 className="flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
 >
 <Flame className="h-4 w-4" />
 Book This Puja
 </Link>
 <Link
 href="/pujas"
 className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-saffron-200 bg-white py-3 font-medium text-saffron-600 transition-colors hover:bg-saffron-50"
 >
 Explore More Pujas
 </Link>
 </div>
 </div>

 {/* FAQ-style info */}
 <div className="rounded-xl border border-surface-100 bg-white p-6">
 <h3 className="mb-3 font-semibold text-surface-800">How It Works</h3>
 <div className="space-y-3">
 {[
 { step: '1', title: 'Book Online', desc: 'Select temple, date, and time slot' },
 { step: '2', title: 'Pandit Performs Puja', desc: 'Verified priest performs the ritual' },
 { step: '3', title: 'Watch Live', desc: 'Stream the puja on your device' },
 { step: '4', title: 'Receive Prasad', desc: 'Sacred prasad delivered to your home' },
 ].map((item) => (
 <div key={item.step} className="flex items-start gap-3">
 <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-xs font-bold text-saffron-600">
 {item.step}
 </div>
 <div>
 <p className="text-sm font-semibold text-surface-700">{item.title}</p>
 <p className="text-xs text-surface-500">{item.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

function SidebarRow({
 icon: Icon,
 label,
 value,
}: {
 icon: React.ComponentType<{ className?: string }>;
 label: string;
 value: string;
}) {
 return (
 <div className="flex items-start gap-3">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-50">
 <Icon className="h-4 w-4 text-saffron-500" />
 </div>
 <div>
 <div className="text-sm font-medium text-surface-700">{label}</div>
 <div className="text-sm text-surface-500">{value}</div>
 </div>
 </div>
 );
}
