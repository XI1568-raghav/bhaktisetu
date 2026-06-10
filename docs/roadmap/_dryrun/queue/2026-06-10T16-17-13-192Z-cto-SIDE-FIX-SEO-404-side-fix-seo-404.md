---
queueId: Q-20260610T1617-SIDEFIX-SEO-404
itemId: SIDE-FIX-SEO-404
cycle: C-20260610T1617
role: cto
agent: claude-code
priority: P0-urgent
emittedAt: 2026-06-10T16:17:00.000Z
estTokens: 18000
estMinutes: 120
founderActionRequired: false
title: 'fix(seo): backfill missing /darshan + /content slugs from 404 audit'
---

# SIDE-FIX: Backfill 24 broken /darshan/* + /content/* slugs

## Why
1401 sitemap URLs, 0 ranked keywords, 24 internal 404s eat crawl budget. Long-tail slugs (rameshwaram darshan, ganesh chalisa, om jai jagdish hare aarti) ARE the ranking targets. Fix by generating real pages from existing data, not by removing links.

## Cited inputs (read these first)
- `docs/findings/2026-06-10-broken-link.md` — authoritative list of 24 404s
- `apps/web/app/darshan/[slug]/page.tsx` — existing dynamic darshan route (verify exists, else find equivalent)
- `apps/web/app/content/[slug]/page.tsx` — existing dynamic content route (verify exists)
- `apps/web/lib/temple-details.ts` — temple data source
- `apps/web/lib/aartis.ts` / `apps/web/lib/chalisas.ts` — content data sources (grep to confirm names)
- `apps/web/app/sitemap.ts` — sitemap generator (must enumerate new slugs)

## TDD order (superpowers doctrine: test FIRST)

### Step 1 — Write failing test
Create `apps/web/__tests__/seo/no-internal-404.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const BROKEN_SLUGS = {
  darshan: ['rameshwaram','govind-dev-ji-jaipur','iskcon-bangalore','baidyanath-dham','dwarkadhish'],
  content: ['om-jai-jagdish-hare-aarti','aarti-kunj-bihari-ki','jai-ganesh-deva-aarti','shiv-chalisa','ganesh-chalisa','durga-chalisa'],
}

describe('SEO: previously-404 slugs must resolve', () => {
  for (const [section, slugs] of Object.entries(BROKEN_SLUGS)) {
    for (const slug of slugs) {
      it(`${section}/${slug} has data entry`, async () => {
        // import the data registry, assert slug present
        if (section === 'darshan') {
          const { templeDetails } = await import('@/lib/temple-details')
          expect(templeDetails[slug]).toBeDefined()
        } else {
          const mod = await import('@/lib/content-registry')
          expect(mod.contentRegistry[slug]).toBeDefined()
        }
      })
    }
  }
})
```
Run: `pnpm --filter web test no-internal-404` → MUST FAIL.

### Step 2 — Extract full 404 list from findings doc
```bash
cat docs/findings/2026-06-10-broken-link.md | grep -oE '/(darshan|content)/[a-z0-9-]+' | sort -u
```
Verify the 11 above + remaining 13 = 24. Update test constants to cover all 24.

### Step 3 — Backfill data (Option A preferred)
For each /darshan/[slug] 404:
- Add entry to `apps/web/lib/temple-details.ts` with `{ name, location, deity, history (200+ words), darshanTimings, image, faqs[] }`
- Source content from existing temple-content seeds if present; else write fresh (caveman SEO copy, 300-500 words per page)

For each /content/[slug] 404 (aartis/chalisas):
- Locate or create `apps/web/lib/content-registry.ts` aggregating aarti + chalisa data
- Add entries with `{ title, deity, lyricsHindi, lyricsEnglish, meaning, audioUrl? }`
- For chalisas: full 40-verse text. Public domain — use traditional Gita Press text.

### Step 4 — Verify dynamic route generates static params
In `apps/web/app/darshan/[slug]/page.tsx` and `apps/web/app/content/[slug]/page.tsx`:
```ts
export async function generateStaticParams() {
  return Object.keys(templeDetails).map(slug => ({ slug }))
}
```
Confirm `generateMetadata` emits unique `<title>` + meta description per slug.

### Step 5 — Update sitemap
`apps/web/app/sitemap.ts` — enumerate from same data registries. No hardcoded URLs.

### Step 6 — Fallback for any slug we CAN'T backfill in 2h
If a slug has zero credible source content, remove the outbound link from the seed page that emits it. Grep:
```bash
rg -l "darshan/SLUG_HERE" apps/web/
```
Edit source page to drop the `<Link>`. Document removed slugs in commit message.

## Verify commands
```bash
# unit
pnpm --filter web test no-internal-404

# build must succeed with static generation
pnpm --filter web build 2>&1 | grep -E "(darshan|content)" | head -40

# crawl check post-deploy (run after merge)
for slug in rameshwaram govind-dev-ji-jaipur iskcon-bangalore baidyanath-dham dwarkadhish; do
  curl -sI "https://darshya.in/darshan/$slug" | head -1
done
# all must return 200

# sitemap inclusion
curl -s https://darshya.in/sitemap.xml | grep -c "/darshan/" 
# should increase by 5+
```

## Success criteria
- All 24 slugs from 2026-06-10-broken-link.md resolve 200 OR their inbound links removed
- `pnpm --filter web test no-internal-404` green
- `pnpm --filter web build` static-generates new pages (visible in build output)
- sitemap.xml includes new slugs
- Commit: `fix(seo): backfill missing darshan + chalisa slugs`

## Cost
- Tokens: ~18k (data writing dominates)
- Minutes: 120 (Option A heavy on content authoring)
- GH CI: <8min target (vitest + next build)

## Guardrails
- NO new infra. Static data files only.
- Public domain chalisa text only (Gita Press / Wikisource attribution in code comment).
- If audio URLs unknown, omit field — don't 404 audio assets.