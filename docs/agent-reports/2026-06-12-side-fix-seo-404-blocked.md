# SIDE-FIX SEO-404 — blocked, founder input required

> **Status**: cycle queue emission (`SIDE-FIX-SEO-404-side-fix-seo-404.md`) cites `docs/findings/2026-06-10-broken-link.md` as authoritative input. **That file does NOT exist** in the repo as of 2026-06-12. Cannot proceed without it.
>
> **Authored**: 2026-06-12 · **Blocked-on**: founder. ETA to unblock: ≤30 min of founder time.

## What the SIDE-FIX intends to do (per queue spec)

Backfill 24 internal-404 slugs across `/darshan/*` and `/content/*` paths:

| Section | Slugs cited in queue spec |
|---|---|
| `/darshan/*` | rameshwaram, govind-dev-ji-jaipur, iskcon-bangalore, baidyanath-dham, dwarkadhish (5 explicit; spec implies more in findings doc) |
| `/content/*` | om-jai-jagdish-hare-aarti, aarti-kunj-bihari-ki, jai-ganesh-deva-aarti, shiv-chalisa, ganesh-chalisa, durga-chalisa (6 explicit) |

Total cited in spec: 11. Total claimed in spec: 24. **13 slug names are unaccounted for** — those live in the missing findings doc.

## Why this matters (per spec)

- 1,401 sitemap URLs, 0 ranked keywords
- 24 internal 404s eat Google crawl budget
- Long-tail slugs (rameshwaram darshan, ganesh chalisa, om jai jagdish hare aarti) ARE the ranking targets — they get search volume
- Fix: generate real pages from existing temple-details + aartis + chalisas data libraries (NOT remove links)

## What founder must produce to unblock (≤30 min)

Create `docs/findings/2026-06-10-broken-link.md` with:

```markdown
# Broken Internal Links — 2026-06-10 audit

Source: (which crawl tool, e.g. Screaming Frog / GSC coverage report / curl-and-grep)
Audit date: YYYY-MM-DD

## /darshan/* 404s
- /darshan/rameshwaram
- /darshan/govind-dev-ji-jaipur
- /darshan/iskcon-bangalore
- /darshan/baidyanath-dham
- /darshan/dwarkadhish
- (additional slugs, founder fills from crawl tool output)

## /content/* 404s
- /content/om-jai-jagdish-hare-aarti
- /content/aarti-kunj-bihari-ki
- /content/jai-ganesh-deva-aarti
- /content/shiv-chalisa
- /content/ganesh-chalisa
- /content/durga-chalisa
- (additional slugs)

## Other 404s (if any)
- (e.g. /aartis/*, /puja-types/*, /yatra/*)

## Source data availability per slug
For each slug, agent will need to confirm:
- Temple slugs → matching entry in apps/web/lib/temple-details.ts? If no, source from temples Prisma table + render dynamic page.
- Aarti/Chalisa slugs → matching entry in apps/web/lib/aartis.ts / apps/web/lib/chalisas.ts? If no, founder must paste source text (lyrics / shloka / meaning) — agent cannot fabricate religious content.
```

## How to source the 24 broken URLs

Three options for founder:

### Option A — Search Console (preferred)
1. Open Google Search Console → Coverage / Pages report
2. Filter by error type "Not found (404)"
3. Export CSV of failing URLs
4. Save raw export at `docs/findings/raw-gsc-404-2026-06-12.csv`
5. Build the markdown doc above from filtered list (only `/darshan/*` and `/content/*` paths)

### Option B — Sitemap diff
1. Pull current sitemap: `curl https://darshya.online/sitemap.xml > /tmp/sitemap.xml`
2. Pull all unique URLs: `grep -oE '<loc>[^<]+</loc>' /tmp/sitemap.xml | sed 's/<[^>]*>//g' > /tmp/urls.txt`
3. Curl each, log 404s: `while IFS= read -r url; do status=$(curl -s -o /dev/null -w '%{http_code}' "$url"); echo "$status $url" >> /tmp/audit.txt; done < /tmp/urls.txt`
4. Filter to 404s and curate `/darshan/*` + `/content/*` paths.

### Option C — Screaming Frog (if licensed)
1. Crawl darshya.online
2. Filter response code = 404
3. Export
4. Curate

## Why agent cannot self-source

- Without crawl-tool access, agent would need to enumerate ALL possible slug paths and curl each — that hits production rate limits + violates `docs/free-tier-budgets.md` (1,401 URLs × outbound = ~1,401 CF Pages worker invocations).
- Religious content (aarti / chalisa lyrics) has cultural/copyright sensitivity — agent must NOT fabricate Sanskrit text or paraphrase shlokas. Founder or trusted source MUST supply.

## What agent CAN do once unblocked

Per the queue spec's TDD plan:
1. Write failing test `apps/web/__tests__/seo/no-internal-404.test.ts` with all 24 slugs.
2. Add missing temple entries to `apps/web/lib/temple-details.ts` for darshan slugs.
3. Build new content-registry helper if doesn't exist.
4. Wire `/darshan/[slug]/page.tsx` + `/content/[slug]/page.tsx` to render from registry.
5. Update `apps/web/app/sitemap.ts` to enumerate new slugs.
6. Run tests → GREEN → commit + push.

ETA after unblock: ~3-4h focused work, single commit, single push.

## EDGE-RUNTIME ALERT

Both `/darshan/[slug]/page.tsx` and `/content/[slug]/page.tsx` are dynamic routes. If they currently use SSR (server-side `generateStaticParams` returns static set) → no edge-runtime sweep needed. If they use `searchParams` or `headers()` → CLAUDE.md trigger #2/#3 fires + 250-route sweep blocker.

**Founder check before agent proceeds**:
```bash
grep -n "runtime\|generateStaticParams\|searchParams\|headers()" apps/web/app/darshan/\[slug\]/page.tsx apps/web/app/content/\[slug\]/page.tsx 2>/dev/null
```

If `runtime='edge'` already declared → safe.
If neither edge-runtime nor static-only → flag before fix.

## Next action

Founder creates `docs/findings/2026-06-10-broken-link.md` with full 24-slug list + source attribution. Once committed to main, next cycle picks it up + agent proceeds.

## Closes

Q-C-20260612T0001-SIDE-FIX-SEO-404 — gap surfaced. Status: blocked-on-founder. Not closed; not in_progress because no execution possible until founder produces input.
