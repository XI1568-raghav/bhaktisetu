import type { Metadata } from 'next';
import { getTemples, type TempleListItem } from '../../lib/api';
import { TEMPLE_DETAILS, type TempleDetailRich } from '../../lib/temple-details';
import { TemplesBrowser, type TempleCardData } from '../../components/temples/TemplesBrowser';

export const metadata: Metadata = {
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
 isJyotirlinga: deityType === 'Shiva' && t.trustScore >= 97,
 isShaktiPeetha: false,
 isDivyaDesam: false,
 popularity: t.trustScore,
 hasRichDetail: TEMPLE_DETAILS[t.slug] !== undefined,
 imageUrl: firstImageUrl(t.images),
 };
}

export default async function TemplesPage() {
 // Start with all rich-detail temples
 const richCards = Object.values(TEMPLE_DETAILS).map(richToCard);

 // Try to merge in additional API temples
 let merged = richCards;
 let totalFromApi = richCards.length;

 try {
 const result = await getTemples({ limit: 50 });
 totalFromApi = Math.max(result.pagination.total, richCards.length);
 const apiBySlug = new Map(result.data.map((t) => [t.slug, t]));
 // Merge API image into rich-detail cards; otherwise rich card keeps imageUrl: null and falls to deity.
 const mergedRich = richCards.map((card) => {
  const apiMatch = apiBySlug.get(card.slug);
  if (!apiMatch) return card;
  return { ...card, imageUrl: card.imageUrl ?? firstImageUrl(apiMatch.images) };
 });
 const existingSlugs = new Set(richCards.map((t) => t.slug));
 const extraApi = result.data
 .filter((t) => !existingSlugs.has(t.slug))
 .map(apiToCard);
 merged = [...mergedRich, ...extraApi];
 } catch {
 // API unavailable — proceed with rich-detail only
 }

 return <TemplesBrowser temples={merged} total={totalFromApi} />;
}
