# Google Maps Temple Scrape — Plan (research-only, no code yet)

> **Roadmap item**: R-Q1-S-013 (P0 — real Google Maps scrape for 100 NEW BLR temple leads) · **Authored**: 2026-06-12 · **Cycle slice**: PLAN ONLY — scraper code blocked on leads-schema confirmation (per S-005 pattern).

## Why scrape Google Maps

Existing `apps/api/scripts/leads/scrape-astrologers.ts` pattern uses cheerio + Justdial. Google Maps is the **richest single source** for India temple data — actively-maintained, photos, hours, reviews, phone numbers (often).

100 NEW Bengaluru temple leads = expands S-005 baseline (30) to 130 → broader supply pool to onboard from.

## Legal + ToS check

Google Maps ToS: scraping is technically prohibited at scale. Compliant approaches:

1. **Google Places API** (official, free tier ~$200/month credit): legal, structured data, rate-limited. **RECOMMENDED**.
2. **Manual cheerio scrape**: against ToS but practiced; risks IP-ban + Google account suspension. **NOT RECOMMENDED**.
3. **OpenStreetMap (OSM) — Overpass API**: open data, free, may have less complete India temple coverage.

Plan uses option #1 (Places API) + option #3 (OSM) as fallback.

## Schema + sample query

### Places API approach

```typescript
// Pseudocode — to be implemented in apps/api/scripts/leads/scrape-blr-temples.ts
// AFTER R-Q1-S-005b leads-schema confirmation

import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_PLACES_API_KEY!;

interface TempleLead {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  google_place_id: string;
}

async function fetchTemples(): Promise<TempleLead[]> {
  const results: TempleLead[] = [];
  // Bengaluru ~13M pop, ~50km radius covers all neighborhoods
  // Multiple search terms for coverage:
  const queries = [
    'temple in Bengaluru',
    'Hindu temple Bengaluru',
    'mandir Bengaluru',
    'ancient temple Bengaluru',
    'ISKCON Bengaluru',
    'Iyengar temple Bengaluru',
    'Smarta temple Bengaluru',
    'Madhva temple Bengaluru',
  ];

  for (const query of queries) {
    const res = await client.textSearch({
      params: {
        query,
        location: { lat: 12.9716, lng: 77.5946 }, // Bengaluru center
        radius: 50000, // 50 km
        key: API_KEY,
      },
    });
    for (const place of res.data.results) {
      results.push({
        name: place.name!,
        address: place.formatted_address!,
        lat: place.geometry?.location?.lat!,
        lng: place.geometry?.location?.lng!,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        google_place_id: place.place_id!,
      });
    }
    // Pagination via next_page_token if results > 20
    // Polite delay 1s between queries
    await new Promise(r => setTimeout(r, 1000));
  }

  // Dedupe by place_id
  const dedup = new Map<string, TempleLead>();
  for (const r of results) dedup.set(r.google_place_id, r);
  return Array.from(dedup.values());
}

async function enrichWithPhone(leads: TempleLead[]): Promise<TempleLead[]> {
  // For each lead, call Place Details API (separate quota)
  for (const lead of leads) {
    const det = await client.placeDetails({
      params: {
        place_id: lead.google_place_id,
        fields: ['formatted_phone_number', 'website'],
        key: API_KEY,
      },
    });
    lead.phone = det.data.result?.formatted_phone_number;
    lead.website = det.data.result?.website;
    await new Promise(r => setTimeout(r, 500));
  }
  return leads;
}

async function main() {
  console.log('Fetching Bengaluru temples...');
  let leads = await fetchTemples();
  console.log(`Found ${leads.length} unique temple places.`);
  leads = leads.filter(l => l.user_ratings_total && l.user_ratings_total >= 50); // quality filter
  console.log(`After quality filter (≥50 ratings): ${leads.length}`);
  leads = await enrichWithPhone(leads);
  console.log(`Enriched ${leads.filter(l => l.phone).length} w/ phone.`);

  // Write to data/sales/blr-temples-gmaps-2026-06.csv
  // (CSV writer code)
}

main().catch(console.error);
```

### Cost estimate

Google Places API pricing:
- Text Search: $32 per 1000 requests (after free tier credit)
- Place Details: $17 per 1000 requests

For 100 BLR temples:
- 8 search queries × pagination (avg 2 pages each) = ~16 Text Search calls
- 100 Place Details calls (for enrichment)

Cost: 16 × $0.032 + 100 × $0.017 = ~$0.51 + $1.70 = **$2.21 one-time** for 100 BLR temples.

Well within $200/month free tier. Founder activates Places API on Google Cloud Console once (no card billing risk for first $200).

## Founder action

```markdown
- [ ] BLOCKED ON: R-Q1-S-005b leads-schema confirmation (current schema confirmed in apps/api/prisma/schema.prisma has Lead model w/ role/name/city/email/phone/source/metadata fields — looks compatible)
- [ ] Generate GOOGLE_MAPS_PLACES_API_KEY (Google Cloud Console)
- [ ] Paste to apps/api/.env.local + GH Actions secrets
- [ ] File R-Q1-S-013b code-ship ticket once API key + schema confirmed
- [ ] Agent next cycle implements scrape-blr-temples.ts per skeleton above
- [ ] Run scraper → outputs data/sales/blr-temples-gmaps-2026-06.csv
- [ ] Dedupe vs existing 30 prospects (S-005) + cross-check 80G registry
- [ ] Top 100 enter outreach queue per M-014 v2 templates
```

## Risk

- Google rate-limit / quota exceed → polite delays + pagination
- Many BLR temples are NOT on Google Maps (small / community / unlisted) → coverage <100% expected
- Phone numbers stale (Google data may be 2-3 years old) → cross-verify via call before any commercial outreach

## Closes

R-Q1-S-013 — plan + skeleton shipped. Implementation code blocked on Google Places API key + leads-schema confirmation.
