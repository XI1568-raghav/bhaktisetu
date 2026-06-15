# Astrologer Slug ↔ UUID Design + Migration

> **Roadmap item**: R-Q1-E-010 (P2) · **Authored**: 2026-06-13 · **Revised**: 2026-06-15 (R4)

## Goal

Q1 fix astrologer slug-vs-UUID dual-identification problem. Provide a stable
identifier strategy that works while astrologers live as an in-memory seed
(`apps/api/src/services/astrology.service.ts`) **and** after they migrate to a
DB-backed model.

## Current state (verified 2026-06-15)

| Layer | Identifier in use |
|---|---|
| Web route `/astrology/[id]/page.tsx` | string slug, e.g. `astro_002` |
| API route `GET /astrologers/:id` | string slug |
| In-memory seed `ASTROLOGERS[]` | slug-PK `astro_001..astro_010` |
| DB model `AstrologerProfile` | `id String @id @default(uuid())` already UUID-PK |
| DB FK consumers | `AstrologerProfile.userId` (UUID, links to `User`) |

**Important**: the schema already has `AstrologerProfile` with UUID PK. There
is **no slug-PK `Astrologer` table to migrate** — the slug only lives in the
in-memory seed used by `astrology.service.ts`. The original spec was
imported as a placeholder and over-stated the schema work.

## What R4 shipped

1. **`getAstrologerByIdOrSlug(idOrSlug)`** helper in `astrology.service.ts`.
   Accepts a UUID (regex-checked) **or** a slug, returns the same shape as
   `getAstrologerById`. Future DB-backed lookup hooks into the UUID branch
   without changing call sites.
2. **`GET /astrologers/:id`** route now uses the dual-lookup helper. Web
   pages can pass either format; legacy slugs keep working.
3. **Migration design** documented below — ready for founder to apply when
   DB-backed astrologers replace the seed.

## Future migration plan (when seed → DB)

```prisma
model Astrologer {
  id              String              @id @default(uuid()) @db.Uuid
  slug            String              @unique
  displayName     String              @map("display_name")
  // ...existing AstrologerProfile fields merged in
  consultations   AstrologerConsultation[]
  availability    AstrologerAvailability[]
  @@index([slug])
  @@map("astrologers")
}

model AstrologerConsultation {
  id            String      @id @default(uuid()) @db.Uuid
  astrologerId  String      @map("astrologer_id") @db.Uuid
  astrologer    Astrologer  @relation(fields: [astrologerId], references: [id])
  // ...
  @@index([astrologerId])
}

model AstrologerAvailability {
  id            String      @id @default(uuid()) @db.Uuid
  astrologerId  String      @map("astrologer_id") @db.Uuid
  astrologer    Astrologer  @relation(fields: [astrologerId], references: [id])
  // ...
  @@index([astrologerId])
}
```

### Backfill steps (founder-applied)

1. Generate UUIDs for each of the 10 in-memory `astro_NNN` entries.
2. Persist mapping `{ slug: 'astro_002', uuid: '<new-uuid>' }` on the new
   `Astrologer` table (inline `slug` column, unique index).
3. Run `prisma db execute --file <backfill.sql>` against Supabase prod via
   `DIRECT_URL` (not pooled — see `reference_prisma_db_execute_prod_migrations`).
4. Verify with `apps/api/scripts/check-prod-tables.mjs` — 1 table, 1 unique
   index, N rows.

### Route refactor

- `GET /astrologers/:id` already dual-lookup (R4).
- `POST /api/v1/consultation/book` — accepts `astrologerId` body field. Once
  DB-backed, normalize via `getAstrologerByIdOrSlug` before INSERT.
- Web `/astrology/[id]/page.tsx` + `/astrology/[id]/book/page.tsx` — no
  change required; either slug or UUID is accepted.
- 301 redirects from `/astrology/{slug}` → `/astrology/{uuid}` only required
  if SEO inbound traffic is significant; otherwise leave both live.

### Admin verification

Add `/admin/astrologers/migration-health` endpoint returning:

```json
{ "totalSeed": 10, "totalDb": 10, "slugMappedCount": 10, "missing": [] }
```

Renders green when seed matches DB row-for-row. Founder watches it for 24h
post-cutover, then deletes the in-memory `ASTROLOGERS` array.

## Owner action (founder-blocked)

This item stays `in_progress` until:

1. Founder confirms astrologer KYC fields w/ UUID-stable identifier (Aadhaar
   last-4 hash or PAN hash).
2. Founder approves the DB-backed cutover window (low-traffic hour, 30-min
   blast radius if rollback needed).
3. Founder applies the backfill SQL via `prisma db execute`.

## Engineering tickets (sub-tasks under R-Q1-E-010)

| Sub | Status | Notes |
|---|---|---|
| R-Q1-E-010a | scaffold shipped (R4) | dual-lookup helper + route wiring |
| R-Q1-E-010b | spec only | Astrologer + Consultation + Availability Prisma models |
| R-Q1-E-010c | spec only | backfill SQL generator |
| R-Q1-E-010d | spec only | `/admin/astrologers/migration-health` |

## Closes (this PR)

Partial — design pass + dual-lookup helper + route wiring shipped. KPI stays
`in_progress` until founder runs the backfill (owner-blocked per spec).
