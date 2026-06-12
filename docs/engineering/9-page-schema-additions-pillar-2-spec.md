# 9 Page-Level Schema Additions — Pillar 2 Per Audit

> **Roadmap item**: R-Q1-E-007 (P1) · **Authored**: 2026-06-13 · **Extends**: HANDOFF 2026-06-08 #20 7adbd87 brandFaq home schema

## Goal

Add 9 page-level Schema.org JSON-LD structured data per audit Pillar 2 (Semantic Information Consensus). Targets richer Google Knowledge Graph + rich-snippet eligibility.

## Per-page schemas

| Page | Schema type | Required fields |
|---|---|---|
| /store/[handle] | Product | name, description, price, currency, image, brand, sku, availability |
| /yatra/[slug] | TouristTrip | name, description, image, itinerary, offers, provider |
| /gita | Book | name, author, numberOfPages, bookEdition, inLanguage |
| /gita/chapter-[N] | Chapter (book partOf) | name, position, partOf |
| /why-darshya | FAQPage | mainEntity (10+ Q&A pairs) |
| /astrology/[id] | Service | name, description, provider, offers, areaServed |
| /pujas/[slug] | Service | name, description, provider, offers (price), serviceType=ReligiousService |
| /temples/[slug] | TouristAttraction | name, address, geo, openingHoursSpecification |
| /aarti/[slug] | CreativeWork | name, author, inLanguage, datePublished |

## Implementation pattern

Use `apps/web/lib/jsonld.ts` helper (already shipped). Each page's `metadata` export adds `other: { 'application/ld+json': JSON.stringify(buildSchemaForPage()) }`.

## Engineering tickets

- R-Q1-E-007a: 9 schema helpers in jsonld.ts
- R-Q1-E-007b: Wire to per-page metadata exports
- R-Q1-E-007c: Validate via Google Rich Results Test

## Closes

R-Q1-E-007 — spec shipped.
