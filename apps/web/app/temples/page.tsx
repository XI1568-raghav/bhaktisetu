import { Suspense } from 'react';
import type { Metadata } from 'next';
import { H1 } from '../../components/ui/heading-recipe';
import { getTemples, type TempleListItem } from '../../lib/api';
import { TEMPLE_DETAILS, type TempleDetailRich } from '../../lib/temple-details';
import { TemplesBrowser, type TempleCardData } from '../../components/temples/TemplesBrowser';
import { canonicalTempleSlug } from '../../lib/temple-slug';
import { dedupeTempleCards } from '../../lib/temple-grid';
import { TRUST_SCORE_MARQUEE } from '../../lib/trust-score';

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/temples' },
 title: 'Sacred Temples of India',
 description:
 'Explore sacred temples across India. Find temples by state, deity or tradition. Watch live darshan, book pujas with verified priests, and plan your pilgrimage.',
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
 isVerified: true,
 trustScore: 97,
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
 trustScore: t.trustScore,
 liveDarshanEnabled: t.liveDarshanEnabled,
 viewers,
 isJyotirlinga: deityType === 'Shiva' && t.trustScore >= TRUST_SCORE_MARQUEE,
 isShaktiPeetha: false,
 isDivyaDesam: false,
 popularity: t.trustScore,
 hasRichDetail: TEMPLE_DETAILS[t.slug] !== undefined,
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
     <p className="max-w-2xl text-lg text-surface-500">Loading temples…</p>
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
 const mergedRich = richCards.map((card) => {
  const apiMatch = apiBySlug.get(card.slug);
  if (!apiMatch) return card;
  return { ...card, imageUrl: card.imageUrl ?? firstImageUrl(apiMatch.images) };
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
