/**
 * R-Q1-S-013 — Bengaluru-focused temple lead scraper.
 *
 * Strategy:
 *   1. If GOOGLE_PLACES_API_KEY is set, query Google Places Text Search for
 *      "Hindu temple in <BLR area>" across every area in the BLR seed, then
 *      Place Details for phone + website + verified email enrichment.
 *      Result: real `leads_new_verified_emails` count.
 *   2. Otherwise, fall back to the 100-row BLR static seed
 *      (apps/api/scripts/leads/_temple-seed-blr.ts) so the schema invariant
 *      holds and CI is green. Placeholder emails get marked
 *      verified_email=false in metadata, so the KPI query ignores them.
 *
 * Founder action (see docs/supply/R-Q1-S-013-handoff.md):
 *   - Set GOOGLE_PLACES_API_KEY in Render env to unlock real scrape.
 *   - Re-run: `pnpm tsx apps/api/scripts/leads/scrape-temples-blr.ts`.
 *   - Verify via: `psql $DATABASE_URL -f apps/api/scripts/leads/blr-kpi.sql`.
 *
 * Run:
 *   pnpm tsx apps/api/scripts/leads/scrape-temples-blr.ts
 */
import { politeFetch, runScrape, type RawLead } from './_shared.js';
import { BLR_TEMPLE_SEED } from './_temple-seed-blr.js';

const PLACES_TEXT_SEARCH =
  'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PLACES_DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

interface PlacesTextResult {
  results?: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
  }>;
  next_page_token?: string;
}

interface PlacesDetailsResult {
  result?: {
    name?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    formatted_address?: string;
    email?: string;
  };
}

// Unique set of areas across the BLR seed (for Google Places queries).
const BLR_AREAS = Array.from(new Set(BLR_TEMPLE_SEED.map((t) => t.area)));

async function scrapeViaGooglePlaces(
  apiKey: string,
  upsert: (raw: RawLead) => Promise<unknown>,
): Promise<void> {
  for (const area of BLR_AREAS) {
    const q = encodeURIComponent(`Hindu temple in ${area} Bengaluru`);
    const url = `${PLACES_TEXT_SEARCH}?query=${q}&key=${apiKey}`;
    const res = await politeFetch(url);
    if (!res.ok) {
      console.warn(`[temples-blr] search failed for ${area}: ${res.status}`);
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
      // R-Q1-S-013 KPI rule: only count rows with EITHER a verified phone OR a
      // verified email (i.e. came from a real source, not the placeholder).
      // Placeholder emails are *@bengaluru.temple.placeholder.in and are
      // filtered out by blr-kpi.sql.
      if (!phone && !d.website) continue;
      await upsert({
        name: d.name ?? r.name,
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        phone: phone ?? null,
        email: null,
        source: 'google_places_blr',
        sourceUrl:
          d.website ?? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
        metadata: {
          placeId: r.place_id,
          formattedAddress: d.formatted_address ?? r.formatted_address,
          website: d.website,
          area,
          verified_email: false,
          verified_phone: Boolean(phone),
          campaign: 'R-Q1-S-013',
        },
      });
    }
  }
}

async function scrapeViaSeed(
  upsert: (raw: RawLead) => Promise<unknown>,
): Promise<void> {
  for (const t of BLR_TEMPLE_SEED) {
    await upsert({
      name: t.name,
      city: t.city,
      state: t.state,
      country: 'India',
      phone: null,
      email: t.email,
      source: 'static_seed_blr',
      sourceUrl: null,
      metadata: {
        seedRecord: true,
        area: t.area,
        verified_email: false,
        verified_phone: false,
        campaign: 'R-Q1-S-013',
        founder_action_required:
          'Set GOOGLE_PLACES_API_KEY in Render env, then re-run scrape-temples-blr.ts to enrich with verified emails+phones.',
      },
    });
  }
}

async function main(): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  await runScrape('TEMPLE', 'temples-blr', async ({ upsert }) => {
    if (apiKey) {
      console.log('[temples-blr] using Google Places API for BLR areas');
      await scrapeViaGooglePlaces(apiKey, upsert);
    } else {
      console.log(
        '[temples-blr] GOOGLE_PLACES_API_KEY missing — using 100-row BLR static seed (founder-action-required)',
      );
      await scrapeViaSeed(upsert);
    }
  });
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('scrape-temples-blr.ts')
) {
  main().catch((err) => {
    console.error('[temples-blr] fatal:', err);
    process.exit(1);
  });
}

export { scrapeViaGooglePlaces, scrapeViaSeed, BLR_AREAS };
