# Knowledge Hub — Design

> Status: SHIPPED · Date: 2026-05-21

## Goal

Three-tier knowledge surface (Sanskrit, Vedas, Sanatan Dharma) on web + mobile, with a Sanskrit micro-learning track that drives daily-active retention. All content is MDX in `apps/web/content/{sanskrit,ved,sanatan}/`, sourced from canonical references and rendered through one component pipeline.

## Scope

In: MDX article corpus (95 articles), reading view, category index, site-wide search (pre-built JSON index), 3-lesson Sanskrit starter track with quiz + score + streak + badges, gurukul cross-links.

Out (deferred): authoring UI, audio/video, comments, multi-language, premium gating.

## Architecture

- **Content store**: MDX with YAML frontmatter (`title`, `slug`, `category`, `subTopic`, `summary`, `readingMinutes`, `sources[]`, `publishedAt`). Inline parser — no `gray-matter` dep.
- **Web**: SSG per-category index + `[slug]` reader at `/sanskrit`, `/ved`, `/sanatan`. Search at `/search` is edge runtime + client component fetching `/search-index.json` (prebuilt by `scripts/build-search-index.mjs` via `prebuild` npm hook).
- **API**: `/api/v1/knowledge/:category` + `/api/v1/knowledge/:category/:slug` read MDX from `apps/web/content/` (env override `KNOWLEDGE_CONTENT_DIR`). Returns empty arrays when content dir absent (prod-safe).
- **Mobile**: `(devotee)/knowledge.tsx` hub → `knowledge-category.tsx` → `knowledge-article.tsx` (inline RN markdown renderer for h1-h3, bullets, quotes, paragraphs).
- **Lessons**: Catalog statically defined in mobile (`lesson.tsx` CATALOG dict). Progress via `POST /api/v1/lessons/complete { lessonId, score }`. List + streak via `GET /api/v1/lessons`. Tables `lessons_progress`, `learning_streaks`, `learning_badges` (migration `20260521000000`).

## Data flow

```
MDX file → prebuild → public/search-index.json   (web search)
MDX file → fs.read at API → JSON                 (mobile + dynamic web)
Lesson complete (mobile) → API → Prisma upsert progress + streak + badge eval
```

## Error handling

- API: missing content dir → `[]`. Missing article → 404. Schema-invalid frontmatter → article hidden.
- Web/Mobile: fetch failure → "Failed to load" with retry on remount.
- Lesson complete fails → Alert "Save failed", state still local.

## Testing

- API: 36 test files / 493 tests green (post-fix on gurukul-applications schema).
- Web: TS clean (build emits 420 static + 30 dynamic routes).
- Mobile: `tsc --noEmit` clean.

## Activation

Feature flags on Cloudflare Pages + Render:
- `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true`
- `KNOWLEDGE_CONTENT_DIR` defaults to `apps/web/content`; override on Render if content shipped to API container.

DB migration: `20260521000000_lessons_streaks_badges` (3 tables, 8 columns, 4 FKs).
