# Search Indexing — Algolia Free Tier for Puja + Temple + Pandit Unified Search

> **Roadmap item**: R-Q2-E-007 (P1) · **Authored**: 2026-06-13

## Goal

Unified search across pujas + temples + pandits. Sub-100ms response. Algolia free tier (10K records, 10K searches/mo) covers Bhaktisetu Q2 scale.

## Indexed entities

| Entity | Records | Attributes searchable |
|---|---|---|
| temples | 100 | name, city, sampradaya, deity, languages |
| puja_types | 30 | name, sampradaya_fit, occasion |
| pandits | 200 | name, city, sampradaya, languages, specialty |
| festivals | 12 | name, date, region |
| **TOTAL** | ~342 | well under 10K cap |

## Index sync

- Daily cron: full re-index (handles new temple/pandit additions)
- Real-time webhook: on entity create/update → Algolia update

## Search UX

`/search` page:
- Single search box → results across all entities
- Filter sidebar: entity type, city, sampradaya, price range
- Result cards: type badge + key meta
- Click → entity detail page

## InstantSearch widget

```typescript
import { InstantSearch, SearchBox, Hits } from 'react-instantsearch';
import algoliasearch from 'algoliasearch/lite';

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

<InstantSearch searchClient={searchClient} indexName="bhaktisetu_unified">
  <SearchBox />
  <Hits hitComponent={HitCard} />
</InstantSearch>
```

## Cost

- Free tier: 10K records + 10K searches/mo (covers MAU <50K)
- Paid: ₹4K/mo for next tier
- Stay free through Q2; upgrade trigger at 8K searches/mo (80% of cap)

## Engineering tickets

- R-Q2-E-007a: Algolia account + indices setup
- R-Q2-E-007b: daily re-index cron
- R-Q2-E-007c: real-time webhook on entity changes
- R-Q2-E-007d: /search page UI
- R-Q2-E-007e: site-wide search bar in header

## Closes

R-Q2-E-007 — spec shipped.
