import type { Metadata } from 'next';

export const revalidate = 3600;

import Link from 'next/link';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';
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
 Heart,
 Share2,
 Sparkles,
 BadgeCheck,
 ArrowRight,
 Package,
 Undo2,
} from 'lucide-react';
import { getDeityImage, getPujaImage } from '../../../lib/images';
import { canPublishTrustScore, formatTrustScoreOutOf } from '../../../lib/trust-score';
// CM-03 (prod sweep 2026-08-12): this page advertises the bare puja price in
// three places while checkout charges it plus a ₹51 platform fee. The fee is
// real (apps/api booking.service folds it into the amount Razorpay is asked
// for), so every advertised price here now carries it.
import { PLATFORM_FEE_INR, formatInr, pujaTotalInr } from '../../../lib/puja-pricing';
// CM-05 (prod sweep 2026-08-12): this page asserted trust ("verified", "video
// proof") repeatedly and demonstrated it zero times, while completed bookings
// sat unused in Postgres. This is the one honest, database-derived proof point.
// DB-06: shared with the booking wizard's payment step so the two surfaces
// state the same, real cancellation guarantee.
import {
 CANCELLATION_BADGE_LABEL,
 CANCELLATION_BADGE_DESC,
} from '../../../lib/cancellation-policy';
import { pujaOffersJsonLd } from '../../../lib/jsonld';
import { getPujaCompletionCounts } from '../../../lib/social-proof';
import PujaShareButton from '../../../components/puja/PujaShareButton';
import { pujaCardBlurb, HERO_BLURB_MAX } from '../../../lib/puja-blurb';
import { pujaCategoryLabel } from '../../../lib/puja-labels';
import PujaSocialProof from '../../../components/PujaSocialProof';

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
 /** INR, not USD (business rule 2: 9-10x domestic). Not rendered — see the
  * note in the hero block. Kept on the type because the API still returns it. */
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
 const title = `${puja.name} — Book Online`;
 // CM-10 + TC-08: `slice(0, 140)` cut mid-word ("...performed as prescr"),
 // and "verified temples" claimed a vetting step the product does not run —
 // the temple list is filtered on `isActive`, not on any verification column.
 const description = `Book ${puja.name} online, with video proof of the ceremony. ${pujaCardBlurb(puja.description)}`;

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

 // CM-05: real count of completed/delivered/video-uploaded bookings for THIS
 // puja, computed server-side from puja_bookings. 0 (or an API failure) means
 // PujaSocialProof renders nothing at all — see lib/social-proof.ts.
 const completedCount = (await getPujaCompletionCounts())[puja.slug] ?? 0;

 const jsonLd = {
 '@context': 'https://schema.org',
 '@type': 'Product',
 name: puja.name,
 // CM-10: this was the full ~1,144-char description. A Product description
 // in structured data is what a search engine quotes back, so it gets the
 // same derived blurb the page shows rather than a scripture citation.
 description: pujaCardBlurb(puja.description, HERO_BLURB_MAX),
 category: pujaCategoryLabel(puja.category) || puja.category,
 image:
   Array.isArray(puja.images) && puja.images.length > 0
     ? puja.images.map((i) => (typeof i === 'string' ? i : (i as { url?: string })?.url)).filter(Boolean)
     : undefined,
 brand: {
 '@type': 'Organization',
 name: 'Darshya',
 },
 // SEO-05: bounds derived from the enumerated offers, never from basePrice * 5.
 // See lib/jsonld.ts for why every rule in there is load-bearing.
 offers: pujaOffersJsonLd(puja),
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
 <Link href="/" className="tap-safe hover:text-saffron-700">
 Home
 </Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <Link href="/pujas" className="tap-safe hover:text-saffron-700">
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
 {/* CM-10: the raw column value ("special_occasion") used to render here. */}
 {pujaCategoryLabel(puja.category) && (
 <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
 <Flame className="h-3 w-3" />
 {pujaCategoryLabel(puja.category)}
 </span>
 )}
 <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
 {puja.deity}
 </span>
 {/* Renders only for a puja that really has completed bookings. */}
 <PujaSocialProof count={completedCount} pujaName={puja.name} variant="hero" />
 </div>
 <h1 className={`${H1.detail} mb-1`}>
 {puja.name}
 </h1>
 {puja.nameLocal && (
 <p className="mb-4 text-lg text-white/80">{puja.nameLocal}</p>
 )}
 {/* CM-10: these average 1,144 chars of scripture citation and push the
   price and the Book button ~900px down a 390px phone. `line-clamp-3` only
   hid that from a sighted reader — every character still shipped, and a
   screen reader still read the lot before reaching the price. The hero now
   carries whole leading sentences up to 220 chars; the full text is
   rendered in the About section below, where a reader who wants the Shiva
   Purana references will find it. */}
 <p className="mb-6 max-w-xl text-base leading-relaxed text-white/90">
 {pujaCardBlurb(puja.description, HERO_BLURB_MAX)}
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
 {/* CM-03: the fee travels with the price, so the number never changes
   between here and the Pay button. */}
 <p className="mt-1 text-xs text-white/70">
 + ₹{formatInr(PLATFORM_FEE_INR)} platform fee · ₹
 {formatInr(pujaTotalInr(Number(puja.basePrice), false))} total
 </p>
 {/* NRI PRICE REMOVED 2026-08-12 (P0).
     This rendered `puja.nriPrice` — an INR column, per business rule 2's
     "NRI pricing 9-10x domestic" — behind a `$` and a dollar icon. On
     /pujas/ram-charit-manas-path that read "$31,999" (about Rs 27.5 lakh) for a
     puja the platform actually charges Rs 3,501 for. The highest-ARPU cohort in
     the category was being quoted a number that reads as fraud.
     Deleting rather than re-glyphing to Rs: /bookings/from-offering charges
     basePrice to EVERYONE (the USD rail went with Stripe), so an "NRI Price
     Rs 13,999" line advertises a premium that is never collected — still a
     displayed-price != charged-price violation, just quieter.
     This returns when a server-QUOTED NRI amount exists, rendered from the same
     value the gateway is asked for. */}
 </div>

 <Link
 href={`/pujas/${puja.slug}/book`}
 className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3.5 text-base font-medium text-saffron-600 shadow-lg transition-all hover:bg-saffron-50 hover:shadow-xl"
 >
 <Flame className="h-5 w-5" />
 Book This Puja
 </Link>

 {/* CM-18: "Save" is gone rather than faked — there is no wishlist endpoint
   in apps/api and no wishlist table, so a Saved state would be a lie told
   to a signed-in user. Share is now real (Web Share + clipboard). */}
 <div className="flex items-center justify-center gap-3">
 <PujaShareButton pujaName={puja.name} slug={puja.slug} />
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
 // TC-08: this badge read "Verified Pandits" / "Aadhaar-verified
 // priests". `Priest.isVerified`, `.verificationStatus` and
 // `.aadhaarVerified` have no writer outside apps/api/prisma/seed.ts, and
 // `.aadhaarVerified` is read in exactly one place — payment.service.ts —
 // where it gates the PAYOUT. So the truthful badge is the payout gate:
 // nothing about the pandit is checked before the booking, but nothing is
 // paid out to them until Aadhaar KYC is on file.
 { icon: Shield, label: 'Aadhaar KYC before payout', desc: 'A payout gate, not a credential check' },
 { icon: Video, label: 'Live Video Proof', desc: 'Watch your puja live' },
 { icon: Gift, label: 'Prasad Delivery', desc: 'Sacred prasad to your door' },
 // DB-06 (2026-08-12): this badge promised "100% refund if not satisfied".
 // No dissatisfaction refund exists in the API — the shipped guarantee is
 // the cancellation ladder, so the badge now states that instead.
 { icon: Undo2, label: CANCELLATION_BADGE_LABEL, desc: CANCELLATION_BADGE_DESC },
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
 <div className="h-1.5 w-1.5 rounded-full bg-saffron-600" />
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
 className="tap-safe text-sm font-semibold text-saffron-700 hover:underline whitespace-nowrap"
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
 {/* TC-07: this pill rendered a filled amber star beside "4.9/5" on every
   temple in the offering list, which a devotee reads as a customer
   rating. `Temple.trustScore` has no writer anywhere in the codebase —
   every value is one of twenty literals typed into apps/api/prisma/seed.ts
   before the platform took a booking. Gated, not deleted, so the honest
   presentation comes back on the day the writer lands: flip
   TRUST_SCORE_IS_COMPUTED in lib/trust-score.ts and this renders again,
   on the one scale, through the one formatter. Guarded by
   __tests__/puja-temples-copy-honesty.tc08.test.tsx. */}
 {canPublishTrustScore(temple.trustScore) && (
 <span className="flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5">
 <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
 {formatTrustScoreOutOf(temple.trustScore)}
 </span>
 )}
 <span className="rounded-full bg-surface-100 px-2 py-0.5">
 {temple.availableSlots.length} time slots
 </span>
 </div>
 </div>
 <div className="flex items-center gap-3 sm:flex-col sm:items-end">
 <div className="sm:text-right">
 <div className="text-xl font-bold text-saffron-600">
 ₹{Number(price).toLocaleString('en-IN')}
 </div>
 {/* CM-03 */}
 <div className="text-xs text-surface-400">
 + ₹{formatInr(PLATFORM_FEE_INR)} fee · ₹
 {formatInr(pujaTotalInr(Number(price), false))} total
 </div>
 </div>
 <Link
 href={`/pujas/${puja.slug}/book?temple=${temple.templeSlug}`}
 className={buttonClass('primary', 'md')}
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
 value={`₹${Number(puja.basePrice).toLocaleString('en-IN')} onwards + ₹${formatInr(
 PLATFORM_FEE_INR,
 )} platform fee`}
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
 className={buttonClass('primary', 'md', 'w-full')}
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
 // TC-08 (re-measured live on 10 of 10 puja slugs, 2026-09-08): this read
 // "Verified priest performs the ritual". It was the last unbacked pandit
 // credential on this page — the trust badge above had already been
 // corrected, but the earlier sweeps scanned for "verified pandit" and
 // "verified temple" and this one says "priest", singular.
 //
 // Nothing promotes a pandit to verified. Every writer of a Priest row was
 // read on 2026-09-08: routes/priest.ts:347 creates with
 // verificationStatus 'pending' / status 'inactive'; priest.ts:500 writes
 // isOnDuty; admin.ts:549 writes commissionRate; dispatch.service.ts:480
 // writes acceptanceRate; onboarding.service.ts:375 and
 // priest.service.ts:814 write profile fields. POST/PATCH /admin/priests
 // both answer 501. `isVerified: true` exists only in prisma/seed.ts:1024
 // and scripts/seed-demo-users.ts:117 — apps/api/src/routes/b2b.ts:245
 // calls it "a column no route writes".
 //
 // What IS enforced is the video-proof gate: checkVideoProofGate
 // (apps/api/src/routes/bookings.ts:287) answers 409 on video_uploaded and
 // delivered unless a videoProofUrl is present, and those two statuses are
 // where the pandit's payout is minted. So the step names that, in the same
 // words lib/faqs.ts and lib/jsonld.ts already ship. A softer adjective
 // ("experienced", "trusted") would be the same claim in quieter words.
 { step: '2', title: 'Pandit Performs Puja', desc: 'The assigned pandit performs the ritual — video proof is mandatory' },
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
