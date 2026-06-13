# SIDE-FIX-SEO-404 — handoff

**Status**: technical 404 closed; content backfill remains a founder/editorial task.

## What shipped (2026-06-13)

1. `apps/web/app/content/[slug]/page.tsx` — flipped `dynamicParams = false` → `true`.
   - Unknown content slugs now ISR through the graceful loading fallback panel
     instead of hard-404'ing into the global not-found page.
   - The static-params allow-list grew from 12 → 21 entries, explicitly
     listing the most-frequently-broken slugs surfaced by Google Search Console
     and crawl audits.
2. `apps/web/__tests__/seo/no-internal-404.test.ts` — regression guard.
   - Asserts both `/content/[slug]` and `/darshan/[id]` allow dynamic params.
   - Asserts the 6 highest-impact previously-broken content slugs are in the
     static-params allow-list.

## What did NOT ship (founder-action-required)

The original spec at
`docs/roadmap/_dryrun/queue/2026-06-10T16-17-13-192Z-cto-SIDE-FIX-SEO-404-side-fix-seo-404.md`
asked for **authoritative content backfill**: 200–400 word histories per
temple/deity, full 40-verse chalisa text in Devanagari + transliteration +
English meaning per chalisa, darshan timings + FAQs per temple.

That work is content authoring, not engineering — ~6–12 hours per chalisa
done correctly, sourced from Gita Press / Wikisource public-domain editions.
Doing it inside a 20-minute autonomous ship slot would have produced thin
filler content that hurts SEO worse than a graceful "coming soon" panel.

Founder/editorial team to backfill:

- 5 `/darshan/[id]` slugs: `rameshwaram`, `govind-dev-ji-jaipur`,
  `iskcon-bangalore`, `baidyanath-dham`, `dwarkadhish`. Source: temple
  official sites + verified Wikipedia. Add YouTube channel IDs to the
  `CHANNEL_BY_SLUG` map in `apps/web/app/darshan/[id]/page.tsx` if a
  legit live channel exists, else leave on the "Coming soon" panel.
- 6 `/content/[slug]` slugs: `om-jai-jagdish-hare-aarti`,
  `aarti-kunj-bihari-ki`, `jai-ganesh-deva-aarti`, `shiv-chalisa`,
  `ganesh-chalisa`, `durga-chalisa`. Source: Gita Press chalisa books
  (public domain). Add as `Content` rows in Supabase via
  `apps/api/src/routes/content.ts` POST or seed script — the
  `getContentBySlugApi` helper picks them up automatically.

## Why the graceful fallback is good enough for now

Both routes return HTTP 200 with full layout (breadcrumb, related links,
"check back in a moment" message) and `noindex` is NOT set on the fallback.
Google still crawls; the page reports thin-content rather than 404 — both
states are SEO-suboptimal but the 200 state recovers immediately the moment
the backfill lands without needing a redeploy. The 404 state required a
manual deploy to fix.

Crawl budget is no longer being eaten by hard 404s.

## Verify post-deploy

```bash
for slug in om-jai-jagdish-hare-aarti aarti-kunj-bihari-ki shiv-chalisa ganesh-chalisa durga-chalisa; do
  curl -s -o /dev/null -w "%{http_code}  /content/$slug\n" "https://darshya.online/content/$slug"
done
# Expect all 200 (was 404 before).
```

## Test

```bash
cd apps/web && pnpm vitest run __tests__/seo/no-internal-404.test.ts
# 8/8 green.
```
