# Search v2 — Semantic via pgvector + Hindi/Sanskrit Embeddings

> **Roadmap item**: R-Q3-E-011 (P1) · **Authored**: 2026-06-13

## Goal

Q3 ship semantic search. pgvector + multilingual embeddings (Hindi + Sanskrit + Tamil + Telugu + Bengali + Marathi). Replaces current keyword-only search.

## Architecture

```
User query → embedding via OpenAI text-embedding-3-small
  → pgvector cosine-similarity search across:
     - puja_chunks (puja descriptions)
     - temple_chunks (temple profiles)
     - scripture_chunks (R-Q2-E-001 AI Pandit KB)
     - article_chunks (blog + pillar pages)
  → return top-10 ranked results
  → re-rank by recency + popularity
  → SSR /search results page
```

## Index ingestion

`scripts/agents/seed-search-index.mjs`:
- Walks apps/web/lib/{pujas,temples,deities,etc}.ts files
- Embeds title + description + tags per row
- Stores in `search_index` table w/ source + entity_type + entity_id + embedding

## Multilingual

text-embedding-3-small supports 100+ languages incl. Indic. No separate Hindi/Sanskrit model needed.

## Engineering tickets

- R-Q3-E-011a: pgvector setup + search_index table
- R-Q3-E-011b: Seed script (~10K chunks)
- R-Q3-E-011c: Search endpoint w/ re-rank
- R-Q3-E-011d: /search SSR page

## Q3 success

- 50ms p95 search latency
- 70%+ click-through rate on top-3 results
- 30%+ search-attributed bookings

## Closes

R-Q3-E-011 — spec shipped.
