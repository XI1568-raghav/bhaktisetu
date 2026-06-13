# Astrologer Slug ↔ UUID Design + Migration

> **Roadmap item**: R-Q1-E-010 (P2) · **Authored**: 2026-06-13

## Goal

Q1 fix astrologer slug-vs-UUID dual-identification problem. Migrate to canonical slug primary + UUID internal.

## Current pain

- Routes use slug `/astrology/{astro_002}`
- DB uses UUID `astrologer_xyz-abc-...`
- Mapping table absent → 404 incidents (HANDOFF #16 chain)

## Migration

```prisma
model Astrologer {
  id          String   @id @default(cuid())
  slug        String   @unique
  // ...existing fields
  @@index([slug])
}
```

Migration script:
1. Backfill `slug` for all existing astrologers (kebab-case of name)
2. Verify uniqueness (resolve dupes manually)
3. Update routes to query by slug primary, UUID fallback
4. /admin migration health check

## Owner action

Founder confirms astrologer KYC fields w/ UUID-stable identifier (Aadhaar last-4 or PAN hash).

## Engineering tickets

- R-Q1-E-010a: Slug field + migration
- R-Q1-E-010b: Route refactor slug→UUID lookup
- R-Q1-E-010c: 301 redirects for legacy URLs
- R-Q1-E-010d: Admin migration verify

## Closes

R-Q1-E-010 — spec shipped.
