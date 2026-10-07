// P0 #202 (cont.): `dynamicParams = false` meant ONLY the slugs returned by
// generateStaticParams (rich-detail short slugs) ever rendered — every
// api-seeded `<name>-<city>` slug (tirumala-tirupati, iskcon-bangalore, etc.)
// 404'd at the routing layer BEFORE the page's api-fallback logic could run.
// Allow dynamic params so api-seeded slugs resolve on-demand (SSR + revalidate).
export const dynamicParams = true;
export const revalidate = 3600;

// ──────────────────────────────────────────────────────────────
// SEO-11 (prod sweep 2026-09-08) — WHY AN UNKNOWN SLUG STILL RETURNS HTTP 200.
//
// `notFound()` below is called and Next DOES render app/not-found.tsx, but the
// status stays 200. The cause is NOT this file, NOT `revalidate`/ISR, and NOT
// the sibling error.tsx. It is `app/temples/loading.tsx`.
//
// A parent segment's loading.tsx makes the App Router wrap that segment's whole
// child subtree in a real <Suspense> (next/dist/client/components/layout-router.js
// :353 and :483 — the nesting is ErrorBoundary → LoadingBoundary(Suspense) →
// HTTPAccessFallbackBoundary → page). React therefore flushes the shell — head
// included — with the loading skeleton as the fallback BEFORE this page's render
// resolves. The notFound() then throws inside that boundary and is swallowed by
// HTTPAccessFallbackBoundary (http-access-fallback/error-boundary.js:30-37),
// which streams in app/not-found.tsx plus its own <meta robots="noindex">.
// `renderToHTMLOrFlightImpl`'s catch — app-render.js:1402, the ONLY place a
// notFound() sets res.statusCode/metadata.statusCode to 404 — never runs.
//
// Measured on prod 2026-09-08, paced, status asserted before reading any body:
//   /blog/<bogus>            no parent loading.tsx   -> 404   (MISS)
//   /puja/<bogus>/<bogus>    no parent loading.tsx   -> 404   (MISS)
//   /temples/<bogus>         app/temples/loading.tsx -> 200   (MISS)
//   /pujas/<bogus>           app/pujas/loading.tsx   -> 200
//   /pujas/<bogus>/temples   app/pujas/loading.tsx   -> 200
// and the 200 bodies contain the skeleton's own "Loading temples" / "Loading
// pujas" string, i.e. the Suspense fallback really was flushed into the shell.
// loading.tsx is the only structural difference between the two groups.
//
// THE FIX IS NOT IN THIS FILE. It is to stop `app/temples/loading.tsx` from
// covering [slug] — either delete it, or move the directory page into a route
// group (app/temples/(index)/page.tsx + (index)/loading.tsx) so the skeleton
// keeps covering /temples without covering /temples/<slug>. Guarded by
// __tests__/seo/soft-404-status.test.ts.
// ──────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
// DU-03: the one primary-CTA recipe. Layout-only extras in the third slot —
// never h-*, px-*, py-* or rounded-*, which is the invariant every call site holds.
import { buttonClass } from '../../../components/ui/button-recipe';
import Link from 'next/link';
import { H1 } from '../../../components/ui/heading-recipe';
import { notFound, permanentRedirect } from 'next/navigation';
import {
 MapPin,
 Star,
 Video,
 Clock,
 Heart,
 ChevronRight,
 Flame,
 Info,
 Shield,
 CheckCircle2,
 ExternalLink,
 Calendar,
 Shirt,
 Camera,
 Plane,
 Train,
 Car,
 Building2,
 Home,
 Ticket,
 BookOpen,
 ArrowUpRight,
} from 'lucide-react';
import { getTempleBySlug, getTemples, type TempleDetail } from '../../../lib/api';
import { scriptLang } from '../../../lib/script-lang';
import { getTempleHero, getTempleGallery, getDeityImage, remoteSrcSet, IMG_W } from '../../../lib/images';
import {
 getTempleDetail,
 getSimilarTemples,
 type TempleDetailRich,
} from '../../../lib/temple-details';
import { canonicalTempleSlug } from '../../../lib/temple-slug';
import { resolveApiTemple } from '../../../lib/temple-resolve';
import { matchTempleOffering, templeBookHref } from '../../../lib/temple-booking';
import TempleBookPujaCta from '../../../components/temple/TempleBookPujaCta';
import TempleDevoteeReviews from '../../../components/temple/TempleDevoteeReviews';
import { getTempleDevoteeReviews, type TempleReviews } from '../../../lib/reviews';
import { canPublishTrustScore, formatTrustScoreOutOf } from '../../../lib/trust-score';
import TempleHeartShareButtons from '../../../components/TempleHeartShareButtons';
import AnalyticsEvent from '../../../components/AnalyticsEvent';
import { TEMPLE_DETAILS } from '../../../lib/temple-details';

export function generateStaticParams() {
  const fallback = [
    'kashi-vishwanath', 'tirupati-balaji', 'siddhivinayak', 'somnath',
    'jagannath-puri', 'golden-temple', 'meenakshi-temple', 'kedarnath',
    'badrinath', 'akshardham', 'mahakaleshwar', 'dwarkadhish',
    'rameshwaram', 'vaishno-devi', 'baidyanath-dham',
  ];
  const known = Object.keys(TEMPLE_DETAILS);
  const all = Array.from(new Set([...known, ...fallback]));
  return all.map((slug) => ({ slug }));
}

// ──────────────────────────────────────────────────────────────
// TC-07: a dead `apiFallback: TempleDetail` literal used to sit here — an
// invented temple that declared `isVerified: true` and `trustScore: 90`.
//
// Both values are fabricated and one is not even on the right scale:
// TRUST_SCORE_MAX is 5 (lib/trust-score.ts), so 90 is eighteen times the
// maximum a real row can hold. Nothing read the const — the page 404s when
// neither the rich map nor the API knows the temple, so there was never a
// path that substituted it — which is precisely why it was dangerous: a
// ready-made "verified, trust 90" temple sitting one `??` away from being
// wired into a render. Deleted rather than corrected; a fallback that
// manufactures a verification badge has no honest value to fall back to.
// ──────────────────────────────────────────────────────────────

// `canonicalTempleSlug` now lives in lib/temple-slug.ts. It used to be defined
// here AND re-implemented independently in app/sitemap.ts (as
// `toCanonicalTempleSlug`, keyed off a hardcoded slug array rather than
// TEMPLE_DETAILS) — two normalisers that could and did disagree, which is how
// the sitemap came to advertise one URL while the DB and every internal link
// pointed at another (SEO-06).

// DF-04: the resolver now lives in lib/temple-api.ts so this page and its
// /pujas child route agree on which temples exist (they used to disagree).
const getApiTemple = resolveApiTemple;

// ──────────────────────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────────────────────

export async function generateMetadata({
 params,
}: {
 params: Promise<{ slug: string }>;
}): Promise<Metadata> {
 const { slug: rawSlug } = await params;
 // SEO-06: resolve the alias BEFORE building the canonical. This used to
 // interpolate the raw incoming slug, so /temples/kashi-vishwanath-varanasi
 // declared itself canonical while the PlaceOfWorship JSON-LD on the very same
 // page declared .../kashi-vishwanath. One helper, one URL, no contradiction.
 const slug = canonicalTempleSlug(rawSlug);
 const rich = getTempleDetail(slug);
 const fallback = (await getApiTemple(slug)) ?? (await getApiTemple(rawSlug));

 // SEO-11 (prod sweep 2026-09-08): this is the SAME predicate the page body
 // 404s on (`if (!rich && !apiTemple) notFound()` below). Until now only the
 // body knew that, so an unknown slug still got the success-shaped head:
 //
 //   <title>Temple — ,  | Darshya</title>        both interpolations empty
 //   <link rel="canonical" href=".../temples/definitely-not-a-temple-xyz">
 //   <meta name="robots" content="index, follow">   inherited from app/layout
 //
 // — while Next, having caught the notFound() inside the tree, ALSO emitted
 // <meta name="robots" content="noindex">. Two directives that contradict each
 // other on a URL that self-canonicalises and carries an empty title. Google
 // takes the most restrictive, so noindex wins and nothing was indexed; the
 // cost was crawl budget over an unbounded slug space plus a broken title on
 // anything that renders the <head> (link previews, Slack/WhatsApp unfurls).
 //
 // No canonical (the root layout deliberately declares none — see SEO-01 in
 // app/layout.tsx — so omitting `alternates` here emits none at all), no
 // openGraph/twitter card, and one robots directive that agrees with Next's.
 //
 // This does NOT fix the 200 status; nothing inside this file can. See the
 // note above `export const revalidate` at the top of the file.
 if (!rich && !fallback) {
   return {
     title: 'Temple not found',
     description: 'This temple page has moved or no longer exists.',
     robots: { index: false, follow: false },
   };
 }

 const name = rich?.name ?? fallback?.name ?? 'Temple';
 const location = rich ? `${rich.location}, ${rich.state}` : `${fallback?.city ?? ''}, ${fallback?.state ?? ''}`;
 const deity = rich?.deity ?? fallback?.deityPrimary ?? 'Devotees';
 const description =
   rich?.significance?.slice(0, 200) ??
   fallback?.description?.slice(0, 200) ??
   `Plan your darshan of ${name}. Book pujas, view timings, travel info, dress code, gallery, festivals and more. Deity: ${deity}.`;

 const apiImages = fallback?.images;
 const firstApiImage = Array.isArray(apiImages)
   ? typeof apiImages[0] === 'string'
     ? (apiImages[0] as string)
     : (apiImages[0] as { url?: string } | undefined)?.url
   : undefined;
 // Dynamic branded card — reflects live name + deity + location.
 const dynamicOg = `https://darshya.online/og/temple/${slug}`;
 const ogImage =
   firstApiImage ||
   (rich ? getTempleHero(slug) : undefined) ||
   getDeityImage((deity || 'lord-shiva').toLowerCase().replace(/\s+/g, '-')) ||
   dynamicOg;

 const url = `https://darshya.online/temples/${slug}`;
 const title = `${name} — ${location}`;

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
         alt: name,
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

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default async function TempleDetailPage({
 params,
}: {
 params: Promise<{ slug: string }>;
}) {
 const { slug: rawSlug } = await params;
 // P0 #202: resolve a long `<name>-<city>` API slug to its rich short slug so
 // sitemap URLs render the curated detail instead of an empty shell.
 const slug = canonicalTempleSlug(rawSlug);

 // SEO-06 (prod sweep 2026-08-12): resolving the alias was only half the job —
 // the page then RENDERED it, so /temples/kashi-vishwanath and
 // /temples/kashi-vishwanath-varanasi both returned 200 and each declared
 // ITSELF canonical, splitting the link equity of the highest-intent page on
 // the site while the JSON-LD on the long-slug page pointed at the short one.
 // The API seeds the long slug, so internal links and any URL built from API
 // data land on the twin the sitemap does not advertise. 308 to the one URL
 // this route actually owns. Guarded by
 // __tests__/seo/structured-data-honesty.test.ts.
 if (slug !== rawSlug) permanentRedirect(`/temples/${slug}`);

 const rich = getTempleDetail(slug);
 const apiTemple = (await getApiTemple(slug)) ?? (await getApiTemple(rawSlug));

 // P0 #202 (cont.): only 404 when NEITHER the rich map NOR the API has the
 // temple. If the API has it but there's no rich entry, fall through to the
 // simple layout below (200, real content) rather than 404ing a working page.
 if (!rich && !apiTemple) notFound();

 // TC-05: the real devotee reviews — rated PujaBooking rows at this temple.
 // Keyed on the API row's own slug (the long `<name>-<city>` form the route
 // looks up), and skipped entirely when the API has no row, so a curated-only
 // page makes no request. `getTempleDevoteeReviews` never throws: a reviews
 // outage renders the honest empty state, it does not 500 the temple page.
 const reviews: TempleReviews = await getTempleDevoteeReviews(apiTemple?.slug ?? null);

 // JSON-LD LocalBusiness/PlaceOfWorship schema for Google rich snippets.
 // PlaceOfWorship is Schema.org's canonical type for temples/mosques/churches;
 // Google surfaces it with map cards, hours, ratings.
 const ldName = rich?.name ?? apiTemple?.name ?? '';
 const ldDesc = rich?.significance ?? apiTemple?.description ?? '';
 const apiImages = apiTemple?.images;
 const firstApiImage = Array.isArray(apiImages)
  ? (typeof apiImages[0] === 'string'
     ? (apiImages[0] as string)
     : (apiImages[0] as { url?: string } | undefined)?.url)
  : undefined;
 const ldImage = firstApiImage || (rich ? getTempleHero(slug) : undefined);
 const ldCity = rich?.location ?? apiTemple?.city ?? '';
 const ldState = rich?.state ?? apiTemple?.state ?? '';
 const ldStreet = apiTemple?.addressLine ?? '';
 const ldPostal = apiTemple?.pincode ?? '';
 const ldCountryRaw = apiTemple?.country ?? 'IN';
 const ldCountry = ldCountryRaw === 'India' ? 'IN' : ldCountryRaw;
 const ldPhone = apiTemple?.phone ?? null;
 // TC-07: `ldTrustScore` used to feed an aggregateRating (removed under
 // SEO-05, see below). It is left out entirely now: GET /temples/:slug
 // whitelists its select and does not return trustScore at all
 // (temple.service.ts, P0 #PUB-02/PUB-08), and the underlying column is a
 // hand-typed seed literal with no writer anywhere in the codebase — so there
 // is no honest number to publish here even if the field were served.
 const ld: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'PlaceOfWorship',
  name: ldName,
  description: ldDesc.slice(0, 500),
  url: `https://darshya.online/temples/${slug}`,
  ...(ldImage ? { image: ldImage } : {}),
  address: {
   '@type': 'PostalAddress',
   ...(ldStreet ? { streetAddress: ldStreet } : {}),
   addressLocality: ldCity,
   addressRegion: ldState,
   ...(ldPostal ? { postalCode: ldPostal } : {}),
   addressCountry: ldCountry,
  },
  ...(typeof apiTemple?.lat === 'number' &&
  typeof apiTemple?.lng === 'number' &&
  apiTemple.lat !== 0 &&
  apiTemple.lng !== 0
   ? { geo: { '@type': 'GeoCoordinates', latitude: apiTemple.lat, longitude: apiTemple.lng } }
   : {}),
  ...(ldPhone ? { telephone: ldPhone } : {}),
  // SEO-05 (prod sweep 2026-08-12): NO aggregateRating here. This used to emit
  //   ratingValue: Math.min(5, ldTrustScore / 20), bestRating: 5, ratingCount: 1
  // — an internal operations metric published to Google, and to a devotee
  // deciding where to send money, as if it were the average of real user
  // reviews. There is no review behind it and ratingCount: 1 names a reviewer
  // who does not exist. That is a misrepresentation first and a spammy-markup
  // manual-action risk second.
  //
  // TC-07: the last line of this comment used to read "The trust score itself
  // is fine and is still rendered on the page — as a trust score, labelled as
  // one." Neither clause survives. It is NOT fine — `Temple.trustScore` has no
  // writer anywhere in the codebase, so every value is a seed literal — and it
  // is NOT rendered here any more, by this page or its /pujas child. Left
  // corrected rather than deleted because a stale comment asserting the
  // opposite is how the next agent re-adds the tag.
  //
  // Re-add an aggregateRating ONLY when it is computed from the rated
  // PujaBooking rows that `lib/reviews.ts` already reads, with the true
  // ratingCount from that route's `total` — not from trustScore.
 };
 const ldScript = (
  <script
   type="application/ld+json"
   dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
  />
 );

 const analyticsName = rich?.name ?? apiTemple?.name ?? slug;
 const analyticsCity = rich?.location ?? apiTemple?.city ?? '';
 const analyticsState = rich?.state ?? apiTemple?.state ?? '';
 const analyticsTag = (
  <AnalyticsEvent
   event="temple_viewed"
   dedupeKey={`temple_viewed:${slug}`}
   properties={{ slug, name: analyticsName, city: analyticsCity, state: analyticsState }}
  />
 );

 if (rich) {
 return (
  <>
   {ldScript}
   {analyticsTag}
   <RichTemplePage slug={slug} rich={rich} apiTemple={apiTemple} reviews={reviews} />
  </>
 );
 }

 // Fallback: simpler layout with basic API data
 return (
  <>
   {ldScript}
   {analyticsTag}
   <SimpleTemplePage slug={slug} temple={apiTemple!} reviews={reviews} />
  </>
 );
}

// ══════════════════════════════════════════════════════════════
// RICH PAGE — for temples with full detail in temple-details.ts
// ══════════════════════════════════════════════════════════════

function RichTemplePage({
 slug,
 rich,
 apiTemple,
 reviews,
}: {
 slug: string;
 rich: TempleDetailRich;
 apiTemple: TempleDetail | null;
 reviews: TempleReviews;
}) {
 const heroImg = getTempleHero(slug);
 const gallery = getTempleGallery(slug, IMG_W.CARD);
 const similar = getSimilarTemples(slug, 3);
 const liveDarshanEnabled = apiTemple?.liveDarshanEnabled ?? true;

 // DF-04 (prod sweep 2026-08-12): every CTA below used to be
 // `/pujas?temple=<slug>`, a param nothing reads — the devotee lost both the
 // puja and the temple at the moment of highest commitment. Booking targets are
 // now built from what the API says this temple actually offers.
 const apiTempleSlug = apiTemple?.slug ?? null;
 const apiOfferings = (apiTemple?.pujaOfferings ?? []).filter((o) => o.isActive !== false);

 return (
 <div className="min-h-[100dvh] bg-[color:var(--color-bg,#fbf7f1)]">
 {/* Breadcrumb */}
 <div className="border-b border-[var(--color-border)] bg-white">
 <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
 <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
 <Link href="/" className="hover:text-saffron-600">Home</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <Link href="/temples" className="hover:text-saffron-600">Temples</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <span className="font-medium text-surface-700">{rich.name}</span>
 </nav>
 </div>
 </div>

 {/* 1. HERO */}
 <section className="relative" data-reveal>
 <div className="relative h-[480px] w-full overflow-hidden md:h-[560px]">
 <img
 src={heroImg}
 srcSet={remoteSrcSet(heroImg, [IMG_W.CARD, IMG_W.WIDE, IMG_W.HERO])}
 sizes="(max-width: 768px) 280px, 100vw"
 width={1280}
 height={560}
 loading="eager"
 fetchPriority="high"
 decoding="async"
 alt={rich.name}
 className="absolute inset-0 h-full w-full object-cover"
 />
 {/* Saffron gradient overlay for text contrast */}
 <div className="absolute inset-0 bg-gradient-to-t from-[#2a1206]/80 via-[#3a1d08]/40 to-transparent" />
 <div className="absolute inset-0 bg-gradient-to-r from-[#c65a1a]/30 via-transparent to-transparent" />

 <div className="absolute inset-x-0 bottom-0">
 <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
 <div className="flex flex-wrap items-center gap-2 mb-3">
 {rich.isJyotirlinga && <HeroBadge icon={Star} text="Jyotirlinga" tone="amber" />}
 {rich.isShaktiPeetha && <HeroBadge icon={Heart} text="Shakti Peetha" tone="rose" />}
 {rich.isDivyaDesam && <HeroBadge icon={Star} text="Divya Desam" tone="amber" />}
 {/* TC-07: this shield was unconditional — every curated temple page printed
  a green "Verified" badge whether or not any temple account had ever been
  verified, and whether or not the API even knew the temple. Verification is
  a column on the temple row; if there is no row, there is no claim to make. */}
 {apiTemple?.isVerified === true && <HeroBadge icon={Shield} text="Verified" tone="green" />}
 {/* TC-07: the trust score, GATED rather than deleted.
  `canPublishTrustScore` is false while `TRUST_SCORE_IS_COMPUTED` is false
  (lib/trust-score.ts) — nothing anywhere writes `Temple.trustScore`, every
  value in the database is one of twenty literals typed into
  apps/api/prisma/seed.ts before the platform had taken a booking, so there
  is no measurement to publish. Nothing renders here today, and the second
  gate is belt-and-braces: GET /temples/:slug whitelists its select and
  omits trustScore, so the field is `undefined` at runtime regardless.

  Kept as a gate and not as a deletion for two reasons. The honest
  presentation should come back on the same day the writer lands — flip the
  one flag and this renders, on the one scale, through the one formatter —
  and a deletion leaves nothing for a reader to find, which is how
  `ratingValue: trustScore / 20` got written twice. */}
 {canPublishTrustScore(apiTemple?.trustScore) && (
  <HeroBadge
   icon={Shield}
   text={`Trust ${formatTrustScoreOutOf(apiTemple?.trustScore)}`}
   tone="green"
  />
 )}
 </div>
 <h1 className={`${H1.detail} max-w-3xl`}>
 {rich.name}
 </h1>
 <p className="mt-3 flex items-center gap-2 text-lg text-white/90">
 <Flame className="h-5 w-5 text-amber-300" />
 {rich.deity}
 <span className="mx-2 text-white/40">•</span>
 <MapPin className="h-4 w-4 text-amber-200" />
 {rich.location}, {rich.state}
 </p>

 {rich.officialWebsite && (
 <a
 href={rich.officialWebsite}
 target="_blank"
 rel="noopener noreferrer"
 className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
 >
 <ExternalLink className="h-4 w-4" />
 Official Temple Website
 <ArrowUpRight className="h-4 w-4" />
 </a>
 )}
 </div>
 </div>

 {/* Top-right actions */}
 <TempleHeartShareButtons slug={rich.slug} templeName={rich.name} />
 </div>
 </section>

 <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
 {/* 2. QUICK INFO BAR */}
 <section data-reveal className="grid grid-cols-2 gap-3 md:grid-cols-4">
 <QuickInfoCard
 icon={Clock}
 label="Timings"
 value="Opens 4–5 AM"
 sub="See full schedule below"
 />
 <QuickInfoCard
 icon={Calendar}
 label="Main Festivals"
 value={`${rich.mainFestivals.length} major`}
 sub={rich.mainFestivals[0]?.name}
 />
 <QuickInfoCard
 icon={Shirt}
 label="Dress Code"
 value="Traditional"
 sub="Details below"
 />
 <QuickInfoCard
 icon={Ticket}
 label="Entry"
 value="Free"
 sub="Pujas are paid"
 />
 </section>

 {/* 3. CTAs — Book Darshan / Puja / Live */}
 <section data-reveal className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
 {/* COM-12: this used to be an unconditional booking promise. 15 of the 20
 seeded temples have no active offering, so three quarters of temple pages
 promised priests and prasad delivery and then handed the devotee
 an empty list. The card is now rendered from what the API actually
 offers. */}
 <TempleBookPujaCta
 templeSlug={slug}
 apiTempleSlug={apiTempleSlug}
 offerings={apiTemple?.pujaOfferings}
 />

 {rich.officialBookingUrl ? (
 <a
 href={rich.officialBookingUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:-translate-y-0.5 hover:border-saffron-300 hover:shadow-warm-md"
 >
 <ExternalLink className="mb-3 h-7 w-7 text-saffron-600" />
 <div className="text-lg font-semibold text-surface-800">
 Official Temple Booking
 </div>
 <p className="mt-1 text-sm text-surface-500">
 Direct booking on the temple's official site
 </p>
 <p className="mt-2 text-xs italic text-surface-400">
 Opens the temple's official website in a new tab
 </p>
 <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-surface-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
 </a>
 ) : (
 <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 opacity-60">
 <ExternalLink className="mb-3 h-7 w-7 text-surface-400" />
 <div className="text-lg font-semibold text-surface-700">
 Official Booking
 </div>
 <p className="mt-1 text-sm text-surface-500">
 Direct bookings coming soon for this temple
 </p>
 </div>
 )}

 <Link
 href={`/darshan/${rich.slug}`}
 className="group relative overflow-hidden rounded-xl border-2 border-red-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-warm-md"
 >
 <div className="mb-3 flex items-center gap-2">
 <Video className="h-7 w-7 text-red-600" />
 {liveDarshanEnabled && (
 <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
 <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
 </span>
 )}
 </div>
 <div className="text-lg font-semibold text-surface-800">Watch Live Darshan</div>
 <p className="mt-1 text-sm text-surface-500">
 Real-time video stream from the sanctum
 </p>
 <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-surface-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
 </Link>
 </section>

 {/* Main 2-column content */}
 <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-3">
 <div className="space-y-10 lg:col-span-2">
 {/* 4. ABOUT */}
 <section data-reveal className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
 <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <Info className="h-5 w-5 text-saffron-600" />
 About {rich.name}
 </h2>

 <div className="space-y-5 text-base leading-relaxed text-surface-600">
 <div>
 <h3 className="mb-2 font-semibold text-surface-800">History</h3>
 <p className="whitespace-pre-line">{rich.history}</p>
 </div>

 <div>
 <h3 className="mb-2 font-semibold text-surface-800">Significance</h3>
 <p>{rich.significance}</p>
 </div>

 <div>
 <h3 className="mb-2 font-semibold text-surface-800">About the Deity</h3>
 <p>{rich.deityDescription}</p>
 </div>
 </div>
 </section>

 {/* 5. PUJAS OFFERED */}
 <section data-reveal>
 <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <Flame className="h-5 w-5 text-saffron-600" />
 Pujas Offered ({rich.pujasOffered.length})
 </h2>

 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {rich.pujasOffered.map((puja, i) => {
 // DF-04: a curated card only gets a Book control when the API confirms
 // this temple offers that puja. Otherwise it is descriptive content, not
 // a purchase — a "Book Now" that lands on an unfiltered catalogue costs
 // more than an honest "not bookable here yet".
 const offering = matchTempleOffering(puja.name, apiOfferings);
 const bookHref = templeBookHref(slug, apiTempleSlug, offering);
 return (
 <article
 key={`${puja.name}-${i}`}
 className="group flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-saffron-300 hover:shadow-warm-md"
 >
 <div className="mb-3 flex items-start justify-between gap-2">
 <h3 className="text-base font-semibold leading-tight text-surface-800">
 {puja.name}
 </h3>
 {puja.bookExternal && (
 <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
 Official
 </span>
 )}
 </div>

 <p className="mb-3 line-clamp-3 text-sm text-surface-600">
 {puja.description}
 </p>

 <div className="mb-3 flex items-center gap-3 text-xs text-surface-500">
 <span className="flex items-center gap-1">
 <Clock className="h-3.5 w-3.5" /> {puja.duration}
 </span>
 {!puja.bookExternal && (
 <span className="flex items-center gap-1">
 <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Video proof
 </span>
 )}
 </div>

 <div className="mb-4 rounded-lg bg-amber-50 p-2.5 text-xs italic text-amber-900">
 {puja.spiritualBenefit}
 </div>

 <div className="mt-auto flex items-center justify-between gap-2">
 <div className="text-xl font-bold text-saffron-700">
 {puja.price === 0 ? 'Free' : `₹${puja.price.toLocaleString('en-IN')}`}
 </div>
 {puja.bookExternal && rich.officialBookingUrl ? (
 <a
 href={rich.officialBookingUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 rounded-lg border border-saffron-300 bg-white px-3 py-1.5 text-xs font-medium text-saffron-700 transition-colors hover:bg-saffron-50"
 >
 Book Official <ExternalLink className="h-3 w-3" />
 </a>
 ) : offering ? (
 <Link
 href={bookHref}
 className={buttonClass('primary', 'sm')}
 >
 Book Now
 </Link>
 ) : (
 <Link
 href={bookHref}
 className="text-xs font-medium text-saffron-700 hover:underline"
 >
 See pujas you can book here
 </Link>
 )}
 </div>
 </article>
 );
 })}
 </div>
 </section>

 {/* 6. FESTIVALS */}
 <section data-reveal className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
 <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <Calendar className="h-5 w-5 text-saffron-600" />
 Festivals & Events
 </h2>
 <ul className="divide-y divide-[var(--color-border)]">
 {rich.mainFestivals.map((f) => (
 <li key={f.name} className="flex items-center justify-between py-3">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-50">
 <Flame className="h-5 w-5 text-saffron-600" />
 </div>
 <div>
 <div className="font-medium text-surface-800">{f.name}</div>
 </div>
 </div>
 <div className="text-sm font-medium text-surface-500">{f.when}</div>
 </li>
 ))}
 </ul>
 </section>

 {/* 7. PLAN YOUR VISIT */}
 <section data-reveal>
 <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <MapPin className="h-5 w-5 text-saffron-600" />
 Plan Your Visit
 </h2>

 <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
 {/* How to Reach */}
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
 <h3 className="mb-4 font-semibold text-surface-800">How to Reach</h3>
 <div className="space-y-4 text-sm">
 <ReachItem
 icon={Plane}
 label="Nearest Airport"
 value={rich.howToReach.nearestAirport}
 />
 <ReachItem
 icon={Train}
 label="Nearest Railway"
 value={rich.howToReach.nearestRailway}
 />
 <ReachItem
 icon={Car}
 label="By Road"
 value={rich.howToReach.roadDirections}
 />
 </div>
 </div>

 {/* Accommodation */}
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
 <h3 className="mb-4 flex items-center gap-2 font-semibold text-surface-800">
 <Building2 className="h-4 w-4 text-saffron-600" />
 Where to Stay
 </h3>
 <ul className="space-y-2 text-sm text-surface-600">
 {rich.accommodation.map((a) => (
 <li key={a} className="flex items-start gap-2">
 <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-saffron-600" />
 <span>{a}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* Nearby Attractions */}
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
 <h3 className="mb-4 flex items-center gap-2 font-semibold text-surface-800">
 <Home className="h-4 w-4 text-saffron-600" />
 Nearby Attractions
 </h3>
 <ul className="space-y-2 text-sm text-surface-600">
 {rich.nearbyAttractions.map((a) => (
 <li key={a} className="flex items-start gap-2">
 <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-saffron-600" />
 <span>{a}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>

 {/* Opening Hours */}
 <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
 <h3 className="mb-3 flex items-center gap-2 font-semibold text-surface-800">
 <Clock className="h-4 w-4 text-saffron-600" />
 Opening Hours
 </h3>
 <div className="grid grid-cols-1 gap-3 text-sm text-surface-600 sm:grid-cols-3">
 <div>
 <div className="text-xs font-medium uppercase tracking-wider text-surface-400">Morning</div>
 <div className="mt-1">{rich.openingHours.morning}</div>
 </div>
 <div>
 <div className="text-xs font-medium uppercase tracking-wider text-surface-400">Afternoon</div>
 <div className="mt-1">{rich.openingHours.afternoon}</div>
 </div>
 <div>
 <div className="text-xs font-medium uppercase tracking-wider text-surface-400">Evening</div>
 <div className="mt-1">{rich.openingHours.evening}</div>
 </div>
 </div>
 </div>
 </section>

 {/* 8. DRESS CODE & RULES */}
 <section data-reveal className="grid grid-cols-1 gap-5 md:grid-cols-2">
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
 <h3 className="mb-3 flex items-center gap-2 font-semibold text-surface-800">
 <Shirt className="h-5 w-5 text-saffron-600" />
 Dress Code
 </h3>
 <p className="text-sm leading-relaxed text-surface-600">{rich.dressCode}</p>
 </div>

 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
 <h3 className="mb-3 flex items-center gap-2 font-semibold text-surface-800">
 <Info className="h-5 w-5 text-saffron-600" />
 Rules & Guidelines
 </h3>
 <ul className="space-y-2 text-sm text-surface-600">
 {rich.rules.map((r) => (
 <li key={r} className="flex items-start gap-2">
 <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
 <span>{r}</span>
 </li>
 ))}
 </ul>
 </div>
 </section>

 {/* Special Note */}
 {rich.specialNote && (
 <section
 data-reveal
 className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-5"
 >
 <div className="flex items-start gap-3">
 <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
 <div>
 <div className="mb-1 text-sm font-semibold text-amber-900">Pilgrim&apos;s Note</div>
 <p className="text-sm leading-relaxed text-amber-900/90">{rich.specialNote}</p>
 </div>
 </div>
 </section>
 )}

 {/* 9. PHOTO GALLERY */}
 <section data-reveal>
 <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <Camera className="h-5 w-5 text-saffron-600" />
 Photo Gallery
 </h2>
 <PhotoGallery slug={slug} count={rich.photoCount} heroImg={heroImg} gallery={gallery} templeName={rich.name} />
 </section>

 {/* 10. DEVOTEE REVIEWS (TC-05).
  This slot used to render `rich.testimonials` from lib/temple-details.ts: 51
  hand-written testimonials across 17 temples, 46 of them five-star, each with
  an invented full name, an invented home city, initials rendered into an
  avatar circle and a star row. Several asserted a transaction that never
  happened — "Booked Mangala Aarti through Darshya and reached Gate 4 at
  2:30 AM", "Booked the Light & Sound VIP seating plus next-morning VIP
  darshan", "Prasad delivery reached home in 4 days". Invented customer
  testimonials on a page that then asks for money are a consumer-protection
  problem, not decoration, and the same class as the fabricated astrologer
  reviews removed under AW-02.

  The fixture rows are still in lib/temple-details.ts (that module is shared —
  hero copy, timings, FAQs, similar-temple links — and `testimonials` is
  optional, so nothing depends on them being present). Deleting the structure
  is the trap that broke the astrologer overlay; what matters is that no
  surface PUBLISHES them, which __tests__/temple-testimonials-fabricated
  .tc05.test.tsx pins.

  What renders now is the real thing: rated PujaBooking rows served by
  GET /temples/:slug/reviews. Where there are none, the section says so.
  See lib/reviews.ts for why it does not route through lib/api.ts, and for
  the correction to the "getTempleReviews is mistyped" note (it is not —
  serverFetch's normalizePaginated rewrites that payload). */}
 <TempleDevoteeReviews templeName={rich.name} reviews={reviews} reveal />

 {/* 11. FAQ */}
 {rich.faqs && rich.faqs.length > 0 && (
 <section data-reveal>
 <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <BookOpen className="h-5 w-5 text-saffron-600" />
 Frequently Asked Questions
 </h2>
 <div className="space-y-3">
 {rich.faqs.map((f, i) => (
 <details
 key={i}
 className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
 >
 <summary className="flex cursor-pointer items-center justify-between gap-3 font-medium text-surface-800">
 <span>{f.q}</span>
 <ChevronRight className="h-4 w-4 shrink-0 text-surface-400 transition-transform group-open:rotate-90" />
 </summary>
 <p className="mt-3 text-sm leading-relaxed text-surface-600">{f.a}</p>
 </details>
 ))}
 </div>
 </section>
 )}

 {/* 12. SIMILAR TEMPLES */}
 {similar.length > 0 && (
 <section data-reveal>
 <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold tracking-tight text-surface-800">
 <Flame className="h-5 w-5 text-saffron-600" />
 Similar Temples
 </h2>
 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 {similar.map((t) => (
 <Link
 key={t.slug}
 href={`/temples/${t.slug}`}
 className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-0.5 hover:shadow-warm-md"
 >
 <div className="relative aspect-[16/10] overflow-hidden bg-orange-100">
 <img
 src={getTempleHero(t.slug, IMG_W.CARD)}
 sizes="(max-width: 768px) 100vw, 380px"
 width={500}
 height={313}
 decoding="async"
 alt={t.name}
 loading="lazy"
 className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
 {t.isJyotirlinga && (
 <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-700 px-2 py-0.5 text-xs font-bold text-white">
 <Star className="h-3 w-3" /> Jyotirlinga
 </span>
 )}
 </div>
 <div className="p-4">
 <div className="text-sm font-semibold text-surface-800 group-hover:text-saffron-700">
 {t.name}
 </div>
 <div className="mt-1 flex items-center gap-1 text-xs text-surface-500">
 <MapPin className="h-3 w-3" />
 {t.location}, {t.state}
 </div>
 </div>
 </Link>
 ))}
 </div>
 </section>
 )}
 </div>

 {/* ─────────────── Sidebar ─────────────── */}
 <aside className="space-y-5">
 <div className="sticky top-24 space-y-5">
 {/* Booking Card */}
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-warm-sm">
 <h3 className="mb-3 font-semibold text-surface-800">Quick Actions</h3>
 <div className="space-y-2.5">
 {/* COM-12: the sidebar action carries the same guard as the hero card —
 no Book button for a temple with nothing bookable. */}
 <TempleBookPujaCta
 variant="button"
 templeSlug={slug}
 apiTempleSlug={apiTempleSlug}
 offerings={apiTemple?.pujaOfferings}
 />
 <Link
 href={`/darshan/${rich.slug}`}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 transition-colors hover:border-saffron-300 hover:bg-saffron-50 hover:text-saffron-700"
 >
 <Video className="h-4 w-4" /> Live Darshan
 </Link>
 {/* causeId MUST be the temple UUID: the API's temple donation branch
     validates `templeId: z.string().uuid()`, so the slug this used to send
     (e.g. "siddhivinayak") is rejected outright. When there is no API record
     behind a curated page there is no UUID to send, so link to the generic
     donations page rather than a request that cannot succeed. */}
 <Link
 href={
 apiTemple?.id
 ? `/donations?causeId=${encodeURIComponent(apiTemple.id)}&causeKind=temple&causeName=${encodeURIComponent(rich.name)}`
 : '/donations'
 }
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
 >
 <Heart className="h-4 w-4" /> Donate to this Temple
 </Link>
 {rich.officialDarshanBookingUrl && (
 <a
 href={rich.officialDarshanBookingUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 transition-colors hover:border-saffron-300"
 >
 <ExternalLink className="h-4 w-4" /> Official Darshan
 </a>
 )}
 </div>

 {rich.officialWebsite && (
 <p className="mt-3 text-xs italic text-surface-400">
 External links open the temple&apos;s official website.
 </p>
 )}
 </div>

 {/* At-a-glance */}
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
 <h3 className="mb-4 font-semibold text-surface-800">At a Glance</h3>
 <dl className="space-y-3 text-sm">
 <Row label="Deity" value={rich.deity} />
 <Row label="Location" value={`${rich.location}, ${rich.state}`} />
 {rich.isJyotirlinga && <Row label="Type" value="Jyotirlinga" />}
 {rich.isShaktiPeetha && <Row label="Also" value="Shakti Peetha" />}
 <Row label="Pujas" value={`${rich.pujasOffered.length} offered`} />
 <Row label="Festivals" value={`${rich.mainFestivals.length} major`} />
 </dl>
 </div>
 </div>
 </aside>
 </div>
 </div>
 </div>
 );
}

// ══════════════════════════════════════════════════════════════
// SIMPLE PAGE — fallback when no rich detail exists
// ══════════════════════════════════════════════════════════════

function SimpleTemplePage({
 slug,
 temple,
 reviews,
}: {
 slug: string;
 temple: TempleDetail;
 reviews: TempleReviews;
}) {
 const heroImg = getTempleHero(slug);
 const gallery = getTempleGallery(slug, IMG_W.CARD);

 return (
 <div className="min-h-[100dvh] bg-[color:var(--color-bg,#fbf7f1)]">
 <div className="border-b border-[var(--color-border)] bg-white">
 <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
 <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
 <Link href="/" className="hover:text-saffron-600">Home</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <Link href="/temples" className="hover:text-saffron-600">Temples</Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <span className="font-medium text-surface-700">{temple.name}</span>
 </nav>
 </div>
 </div>

 <section className="relative h-80 overflow-hidden md:h-96">
 <img src={heroImg} srcSet={remoteSrcSet(heroImg, [IMG_W.CARD, IMG_W.WIDE, IMG_W.HERO])} sizes="100vw" width={1280} height={384} alt={temple.name} className="absolute inset-0 h-full w-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
 <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
 <h1 className={H1.detail}>{temple.name}</h1>
 {/*
   I-07: the API has shipped correct-script names for all 20 temples since the
   nameLocal column landed (schema.prisma Temple.nameLocal, selected by
   temple.service.ts for both list and detail, typed here as TempleDetail
   .nameLocal) — and no temple surface ever rendered one. The puja pages
   already do exactly this, so the treatment is theirs, not a new invention.
   lang is set per-name because the page itself is lang="en": without it a
   screen reader pronounces Devanagari with an English voice.
 */}
 {temple.nameLocal && (
 <p lang={scriptLang(temple.nameLocal)} className="mt-1 text-lg font-serif text-white/80">{temple.nameLocal}</p>
 )}
 <p className="mt-2 flex items-center gap-2 text-white/90">
 <MapPin className="h-4 w-4" /> {temple.city}, {temple.state}
 </p>
 </div>
 </section>

 <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
 <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
 <div className="space-y-6 lg:col-span-2">
 <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
 <h2 className="mb-3 text-xl font-semibold text-surface-800">About</h2>
 <p className="leading-relaxed text-surface-600">{temple.description}</p>
 </section>

 {temple.pujaOfferings.length > 0 && (
 <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
 <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-surface-800">
 <Flame className="h-5 w-5 text-saffron-600" /> Available Pujas
 </h2>
 <div className="space-y-3">
 {temple.pujaOfferings.map((o) => (
 <div
 key={o.id}
 className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] p-4 sm:flex-row sm:items-center"
 >
 <div className="flex-1">
 <h3 className="font-semibold text-surface-800">{o.pujaType.name}</h3>
 <p className="text-sm text-surface-500">{o.pujaType.description}</p>
 </div>
 <div className="flex items-center gap-3">
 <span className="font-bold text-saffron-700">
 ₹{Number(o.priceOverride || o.pujaType.basePrice).toLocaleString('en-IN')}
 </span>
 <Link
 href={`/pujas/${o.pujaType.slug}`}
 className={buttonClass('primary', 'sm')}
 >
 Book
 </Link>
 </div>
 </div>
 ))}
 </div>
 </section>
 )}

 {gallery.length > 0 && (
 <section>
 <h2 className="mb-4 text-xl font-semibold text-surface-800">Photos</h2>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
 {gallery.slice(0, 6).map((img, i) => (
 <div key={i} className="aspect-[4/3] overflow-hidden rounded-lg">
 <img src={img} srcSet={remoteSrcSet(img, [IMG_W.CARD, IMG_W.WIDE])} sizes="(max-width: 768px) 50vw, 260px" width={500} height={375} alt={`${temple.name} photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
 </div>
 ))}
 </div>
 </section>
 )}

 {/* TC-05: the api-only layout gets the same real-reviews section as the
 rich one. These are the temples the API actually seeded, so they are the
 ones most likely to have a rated booking behind them. */}
 <TempleDevoteeReviews templeName={temple.name} reviews={reviews} />
 </div>

 <aside className="space-y-4">
 <div className="sticky top-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
 <h3 className="mb-3 font-semibold text-surface-800">Actions</h3>
 <div className="space-y-2">
 {/* COM-12: same guard as the rich page — a temple with no active
 offering does not get a Book Puja button. */}
 <TempleBookPujaCta
 variant="button"
 templeSlug={slug}
 apiTempleSlug={temple.slug ?? null}
 offerings={temple.pujaOfferings}
 />
 <Link
 href={`/darshan/${slug}`}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 hover:border-saffron-300"
 >
 <Video className="h-4 w-4" /> Live Darshan
 </Link>
 <Link
 href={`/donations?causeId=${encodeURIComponent(temple.id)}&causeKind=temple&causeName=${encodeURIComponent(temple.name)}`}
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 hover:border-emerald-300 hover:text-emerald-700"
 >
 <Heart className="h-4 w-4" /> Donate to this Temple
 </Link>
 {temple.websiteUrl && (
 <a
 href={temple.websiteUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2.5 text-sm font-medium text-surface-700 hover:border-saffron-300"
 >
 <ExternalLink className="h-4 w-4" /> Official Website
 </a>
 )}
 </div>
 <p className="mt-3 text-xs italic text-surface-400">
 Full details for this temple coming soon.
 </p>
 </div>
 </aside>
 </div>
 </div>
 </div>
 );
}

// ══════════════════════════════════════════════════════════════
// Small presentational helpers
// ══════════════════════════════════════════════════════════════

function HeroBadge({
 icon: Icon,
 text,
 tone,
}: {
 icon: React.ComponentType<{ className?: string }>;
 text: string;
 tone: 'amber' | 'rose' | 'green';
}) {
 const tones = {
 amber: 'bg-amber-500/90 text-white',
 rose: 'bg-rose-500/90 text-white',
 green: 'bg-green-600/90 text-white',
 };
 return (
 <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${tones[tone]}`}>
 <Icon className="h-3.5 w-3.5" />
 {text}
 </span>
 );
}

function QuickInfoCard({
 icon: Icon,
 label,
 value,
 sub,
}: {
 icon: React.ComponentType<{ className?: string }>;
 label: string;
 value: string;
 sub?: string;
}) {
 return (
 <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-warm-sm">
 <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-saffron-50">
 <Icon className="h-4 w-4 text-saffron-600" />
 </div>
 <div className="text-xs font-medium uppercase tracking-wider text-surface-400">{label}</div>
 <div className="mt-0.5 font-semibold text-surface-800">{value}</div>
 {sub && <div className="mt-0.5 text-xs text-surface-500">{sub}</div>}
 </div>
 );
}

function ReachItem({
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
 <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-saffron-50">
 <Icon className="h-4 w-4 text-saffron-600" />
 </div>
 <div>
 <div className="text-xs font-medium uppercase tracking-wider text-surface-400">{label}</div>
 <div className="text-surface-700">{value}</div>
 </div>
 </div>
 );
}

function Row({ label, value }: { label: string; value: string }) {
 return (
 <div className="flex items-start justify-between gap-3">
 <dt className="text-surface-500">{label}</dt>
 <dd className="text-right font-medium text-surface-800">{value}</dd>
 </div>
 );
}

function PhotoGallery({
 slug,
 count,
 heroImg,
 gallery,
 templeName,
}: {
 slug: string;
 count: number;
 heroImg: string;
 gallery: readonly string[];
 templeName: string;
}) {
 // Combine hero + gallery up to `count` total
 const pool = [heroImg, ...gallery];
 const images = Array.from({ length: Math.max(count, 4) }).map((_, i) => pool[i % pool.length]);

 return (
 <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
 {images.map((img, i) => (
 <div
 key={`${slug}-${i}`}
 className={`group relative overflow-hidden rounded-xl ${
 i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-[4/3]' : 'aspect-square'
 }`}
 >
 <img
 src={img}
 srcSet={remoteSrcSet(img, [IMG_W.CARD, IMG_W.WIDE])}
 sizes="(max-width: 768px) 50vw, 300px"
 width={500}
 height={500}
 decoding="async"
 alt={`${templeName} photo ${i + 1}`}
 loading="lazy"
 className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
 />
 <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
 </div>
 ))}
 </div>
 );
}
