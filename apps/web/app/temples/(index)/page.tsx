import { Suspense } from 'react';
import type { Metadata } from 'next';
import { H1 } from '../../../components/ui/heading-recipe';
import { getTemples, type TempleListItem } from '../../../lib/api';
import { TEMPLE_DETAILS, type TempleDetailRich } from '../../../lib/temple-details';
import { TemplesBrowser, type TempleCardData } from '../../../components/temples/TemplesBrowser';
import { canonicalTempleSlug } from '../../../lib/temple-slug';
import { dedupeTempleCards } from '../../../lib/temple-grid';
// TC-07: TRUST_SCORE_MARQUEE is no longer imported here. This page used it to
// decide whether a temple is a Jyotirlinga — see apiToCard below for why that
// was both a category error and dead code.

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/temples' },
 title: 'Sacred Temples of India',
 // TC-08: this description advertised "verified priests". Nothing writes
 // Priest.isVerified, Priest.verificationStatus or Priest.aadhaarVerified
 // outside prisma/seed.ts — there is no credential check, reference call,
 // probation or per-pandit trust score behind the word, and aadhaarVerified is
 // read in exactly one place (payment.service.ts) as a payout gate.
 description:
 'Explore sacred temples across India. Find temples by state, deity or tradition. Watch live darshan, book pujas with video proof, and plan your pilgrimage.',
};

// Derive card data from the rich detail map (always available, no API dependency)
function richToCard(t: TempleDetailRich): TempleCardData {
 return {
 slug: t.slug,
 name: t.name,
 city: t.location,
 state: t.state,
 tradition: t.deityType === 'Sikh' ? 'Sikh' : t.deityType === 'Shakti' ? 'Shakta' : t.deityType === 'Vishnu' ? 'Vaishnava' : 'Shaiva',
 deityPrimary: t.deity,
 deityType: t.deityType,
 description: t.significance,
 // TC-07: these two used to read `isVerified: true, trustScore: 97`. 97 is a
 // hand-typed literal on a scale whose maximum is 5 (lib/trust-score.ts), and
 // the true flag awarded the green Verified shield in TemplesBrowser to all 25
 // curated temples with nothing behind it. The curated map knows a temple's
 // name, deity and classification; it cannot know whether Darshya verified
 // that temple's account. Only the API row can say so, and TemplesData below
 // copies it across when the two are matched.
 isVerified: false,
 trustScore: 0,
 liveDarshanEnabled: true,
 viewers: 0,
 isJyotirlinga: !!t.isJyotirlinga,
 isShaktiPeetha: !!t.isShaktiPeetha,
 isDivyaDesam: !!t.isDivyaDesam,
 popularity: t.isJyotirlinga ? 100 : t.isDivyaDesam ? 90 : t.isShaktiPeetha ? 85 : 70,
 hasRichDetail: true,
 imageUrl: null,
 };
}

// API images come back as either string[] or {url}[] depending on transform layer.
function firstImageUrl(images: unknown): string | null {
 if (!Array.isArray(images) || images.length === 0) return null;
 const first = images[0];
 if (typeof first === 'string') return first;
 if (first && typeof first === 'object' && 'url' in first && typeof (first as {url: unknown}).url === 'string') {
  return (first as {url: string}).url;
 }
 return null;
}

function apiToCard(t: TempleListItem): TempleCardData {
 const viewers = Array.isArray(t.darshanStream)
 ? t.darshanStream.reduce((sum, s) => sum + (s.viewerCount || 0), 0)
 : 0;
 const deity = t.deityPrimary?.toLowerCase() ?? '';
 const deityType: TempleCardData['deityType'] = deity.includes('shiva')
 ? 'Shiva'
 : deity.includes('vishnu') || deity.includes('krishna') || deity.includes('rama') || deity.includes('jagannath') || deity.includes('venkateswara') || deity.includes('balaji')
 ? 'Vishnu'
 : deity.includes('durga') || deity.includes('devi') || deity.includes('kali') || deity.includes('lakshmi') || deity.includes('saraswati')
 ? 'Shakti'
 : deity.includes('ganesha') || deity.includes('vinayak')
 ? 'Ganesha'
 : 'Other';

 // TC-07: three defects here shared one root — treating trustScore as a
 // public, meaningful, present number.
 //
 //   1. trustScore IS NOT SERVED. GET /temples whitelists its select and
 //      deliberately omits it (temple.service.ts, P0 #PUB-02), so
 //      `t.trustScore` is undefined at runtime despite being typed number.
 //   2. Jyotirlinga status was `deityType === 'Shiva' && t.trustScore >= 4.85`,
 //      i.e. `undefined >= 4.85` — always false, so that badge could never
 //      render. It is also a category error: being one of the twelve
 //      Jyotirlingas is a fact about the temple, not a function of an
 //      operations score. It now comes from the curated fact table.
 //   3. `popularity: t.trustScore` fed `b.popularity - a.popularity` in
 //      TemplesBrowser, which is NaN for every API temple — "Most Popular"
 //      ordered them arbitrarily. Real booking counts order them now.
 //
 // The value is fabricated underneath all of that: Temple.trustScore has no
 // writer anywhere in the codebase, only 20 hand-typed literals in
 // prisma/seed.ts, so nothing may present it as a computed trust metric.
 const rich = TEMPLE_DETAILS[canonicalTempleSlug(t.slug)];
 return {
 slug: t.slug,
 name: t.name,
 city: t.city,
 state: t.state ?? '',
 tradition: t.tradition,
 deityPrimary: t.deityPrimary,
 deityType,
 description: t.description,
 isVerified: t.isVerified,
 trustScore: 0,
 liveDarshanEnabled: t.liveDarshanEnabled,
 viewers,
 isJyotirlinga: !!rich?.isJyotirlinga,
 isShaktiPeetha: !!rich?.isShaktiPeetha,
 isDivyaDesam: !!rich?.isDivyaDesam,
 popularity: t._count?.bookings ?? 0,
 hasRichDetail: rich !== undefined,
 imageUrl: firstImageUrl(t.images),
 };
}

/**
 * TD-01: shown while the temple list is in flight. Structure only — no temple
 * names, no imagery — so nothing here can be mistaken for real content if the
 * fetch is slow or fails.
 */
function TemplesSkeleton() {
 return (
  <div
   role="status"
   aria-busy="true"
   aria-live="polite"
   className="min-h-[100dvh] bg-[color:var(--color-bg,#fbf7f1)]"
  >
   <section className="bg-[#ede9e3] py-12 md:py-16">
    <div className="container-wide">
     <h1 className={`${H1.catalogue} mb-3`}>
      Sacred Temples of India
     </h1>
     <p className="prose-body max-w-2xl text-surface-500">Loading temples…</p>
     <div className="mt-8 h-[54px] max-w-2xl animate-pulse rounded-lg bg-white/70" />
    </div>
   </section>
   <div className="container-wide py-8">
    <div className="mb-6 flex flex-wrap gap-2">
     {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-white/70" />
     ))}
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
     {Array.from({ length: 6 }).map((_, i) => (
      <div
       key={i}
       className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
       <div className="aspect-[16/10] animate-pulse bg-surface-100" />
       <div className="space-y-2 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-surface-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-100" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-100" />
       </div>
      </div>
     ))}
    </div>
   </div>
  </div>
 );
}

/**
 * TD-01: the API round trip lives here, inside the Suspense boundary, instead
 * of in the page body. Both Render services are free tier and spin down, so a
 * cold API used to hold the ENTIRE document — head, header, hero — hostage for
 * up to serverFetch's 4s abort budget with nothing painted on screen.
 */
async function TemplesData() {
 // TD-03: the curated map holds Ramanathaswamy twice (rameswaram +
 // rameshwaram), so even before the API is consulted the grid must be reduced
 // to one card per temple.
 const richCards = dedupeTempleCards(Object.values(TEMPLE_DETAILS).map(richToCard));

 // Try to merge in additional API temples
 let merged = richCards;

 try {
 const result = await getTemples({ limit: 50 });
 // P2 #217 (2026-08-03): the API seeds temples with `<name>-<city>` slugs while
 // the rich-detail map uses short slugs, so matching by exact slug appended
 // every API temple as a duplicate → "Showing 41 of 22 temples".
 // TD-03 (2026-08-12): the suffix-stripping normaliser this page carried could
 // only bridge slugs that share a prefix, so the pairs that differ by NAME
 // (tirumala-tirupati/tirupati-balaji, meenakshi-madurai/meenakshi-temple,
 // ramanathaswamy-rameshwaram/rameshwaram) still doubled up — 33 cards for 29
 // temples. lib/temple-slug.ts already resolves those for the detail route and
 // the sitemap; the grid now reads the same table instead of a private copy.
 const apiBySlug = new Map(result.data.map((t) => [canonicalTempleSlug(t.slug), t]));
 // Merge API image into rich-detail cards; otherwise rich card keeps imageUrl: null and falls to deity.
 // TC-07: verification is a fact only the API row carries, so a curated card
 // adopts the API's isVerified when the two are matched and otherwise stays
 // unverified rather than awarding itself a shield.
 const mergedRich = richCards.map((card) => {
  const apiMatch = apiBySlug.get(card.slug);
  if (!apiMatch) return card;
  return {
   ...card,
   imageUrl: card.imageUrl ?? firstImageUrl(apiMatch.images),
   isVerified: apiMatch.isVerified === true,
  };
 });
 const existingSlugs = new Set(richCards.map((t) => t.slug));
 const extraApi = result.data
 .filter((t) => !existingSlugs.has(canonicalTempleSlug(t.slug)))
 .map(apiToCard);
 merged = dedupeTempleCards([...mergedRich, ...extraApi]);
 } catch {
 // API unavailable — proceed with rich-detail only
 }

 // The denominator of "Showing X of Y temples" is the list the browser holds,
 // NOT `result.pagination.total`. Those two are different numbers: pagination
 // counts the API's own rows, while `merged` also carries every rich-detail
 // temple the API has never heard of, so on prod the page claimed "Showing 33
 // of 22 temples" with no filter applied. There is no pagination UI here —
 // every card is already on screen — so `merged.length` is the only total the
 // user can verify by counting.
 return <TemplesBrowser temples={merged} total={merged.length} />;
}

export default function TemplesPage() {
 return (
  <Suspense fallback={<TemplesSkeleton />}>
   <TemplesData />
  </Suspense>
 );
}
