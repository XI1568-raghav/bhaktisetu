# Knowledge Hub — Implementation Plan

> Status: SHIPPED · Spec: `../specs/2026-05-21-knowledge-hub-design.md`

## Phases (all completed)

1. **DB** — migration `20260521000000_lessons_streaks_badges`: `lessons_progress`, `learning_streaks`, `learning_badges`. Prisma model + relation on `User`.
2. **API** — `apps/api/src/routes/knowledge.ts` (file-system MDX reader, env-or-noop), `apps/api/src/routes/lessons.ts` (progress/streak/badge). Registered in `server.ts`.
3. **Content** — 95 MDX articles seeded across `apps/web/content/{sanskrit,ved,sanatan}/`. 3 starter Sanskrit lessons baked into mobile catalog.
4. **Web** — per-category index pages, `[slug]` reader, `/search` (edge wrapper + client component reading prebuilt JSON), `/learn-sanskrit` + `/learn-sanskrit/lesson/[id]`. Prebuild script in `package.json`.
5. **Mobile** — knowledge hub + category + article + learn-sanskrit + lesson screens registered in `(devotee)/_layout.tsx` with `href: null`.

## Deploy steps

1. Apply migration via `prisma db execute --file ... --schema=prisma/schema.prisma` against poojly Supabase (DIRECT_URL, not pooled).
2. Verify with `apps/api/scripts/check-prod-tables.mjs`.
3. CF Pages env: set `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true`.
4. Render env: set `KNOWLEDGE_CONTENT_DIR` only if API container ships content (else leave default).
5. Trigger CF Pages rebuild — `prebuild` regenerates `/search-index.json` automatically.

## Rollback

- Feature flag flip to `false` removes hub from nav.
- Tables are additive; safe to leave migrated even if disabled.
