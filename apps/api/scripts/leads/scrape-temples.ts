/**
 * Temple lead scraper.
 *
 * Strategy:
 *   1. If GOOGLE_PLACES_API_KEY is set, query Google Places Text Search for
 *      "Hindu temple in <city>" across the top 30 Indian temple cities, then
 *      hit Place Details for each result to retrieve phone + website.
 *   2. Otherwise, fall back to a static seed of ~200 famous temples.
 *
 * Run:
 *   pnpm tsx apps/api/scripts/leads/scrape-temples.ts
 */
import { politeFetch, runScrape, TOP_INDIAN_TEMPLE_CITIES, type RawLead } from './_shared.js';
import { TEMPLE_SEED } from './_temple-seed.js';

const PLACES_TEXT_SEARCH =
  'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PLACES_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

interface PlacesTextResult {
  results?: Array<{ place_id: string; name: string; formatted_address?: string }>;
  next_page_token?: string;
}

interface PlacesDetailsResult {
  result?: {
    name?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    formatted_address?: string;
  };
}

async function scrapeViaGooglePlaces(
  apiKey: string,
  upsert: (raw: RawLead) => Promise<unknown>,
): Promise<void> {
  for (const { city, state } of TOP_INDIAN_TEMPLE_CITIES) {
    const q = encodeURIComponent(`Hindu temple in ${city}`);
    const url = `${PLACES_TEXT_SEARCH}?query=${q}&key=${apiKey}`;
    const res = await politeFetch(url);
    if (!res.ok) {
      console.warn(`[temples] places search failed for ${city}: ${res.status}`);
      continue;
    }
    const json = (await res.json()) as PlacesTextResult;
    for (const r of json.results ?? []) {
      const detailUrl = `${PLACES_DETAILS}?place_id=${r.place_id}&fields=name,formatted_phone_number,international_phone_number,website,formatted_address&key=${apiKey}`;
      const dres = await politeFetch(detailUrl);
      if (!dres.ok) continue;
      const dj = (await dres.json()) as PlacesDetailsResult;
      const d = dj.result;
      if (!d) continue;
      const phone = d.international_phone_number ?? d.formatted_phone_number;
      if (!phone && !d.website) continue;
      await upsert({
        name: d.name ?? r.name,
        city,
        state,
        country: 'India',
        phone: phone ?? null,
        email: null,
        source: 'google_places',
        sourceUrl: d.website ?? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
        metadata: {
          placeId: r.place_id,
          formattedAddress: d.formatted_address ?? r.formatted_address,
          website: d.website,
        },
      });
    }
  }
}

async function scrapeViaSeed(
  upsert: (raw: RawLead) => Promise<unknown>,
): Promise<void> {
  for (const t of TEMPLE_SEED) {
    await upsert({
      name: t.name,
      city: t.city,
      state: t.state,
      country: 'India',
      phone: t.phone ?? null,
      email: t.email ?? null,
      source: 'static_seed',
      sourceUrl: t.websiteUrl ?? null,
      metadata: { seedRecord: true },
    });
  }
}

async function main(): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  await runScrape('TEMPLE', 'temples', async ({ upsert }) => {
    if (apiKey) {
      console.log('[temples] using Google Places API');
      await scrapeViaGooglePlaces(apiKey, upsert);
    } else {
      console.log('[temples] GOOGLE_PLACES_API_KEY missing — using static seed');
      await scrapeViaSeed(upsert);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scrape-temples.ts')) {
  main().catch((err) => {
    console.error('[temples] fatal:', err);
    process.exit(1);
  });
}

export { scrapeViaGooglePlaces, scrapeViaSeed };
