# R-Q4-E-006 — Edge perf hardening (Cloudflare Workers KV cache + cold-start <100ms global)

> Status: handoff stub. Spec was bulk-imported as TBD placeholder 2026-06-09. This doc unblocks the
> first execution cycle by enumerating the concrete work, KPI query, and founder-action prerequisites.

## Goal

Drive `edge_p75_ttfb_ms` from current 0 (unmeasured) to ≤ 150 ms p75 globally, with cold-start
under 100 ms. (**Corrected 2026-09-02, `OPS-10`:** this named a *Cloudflare Pages free-tier worker serving `darshya.online`* as the baseline. Pages has not been a hosting layer since 2026-07-08 — `cf-kill-zombie.yml` — and `darshya.online` is served by the Render Docker service `darshya-web` in region `oregon`, `render.yaml:56`, behind Cloudflare DNS + edge proxy. Any baseline must be measured against that origin.)

## KPI definition

- **Metric**: `edge_p75_ttfb_ms`
- **Source**: Cloudflare GraphQL Analytics API (`httpRequestsAdaptiveGroups`)
- **Query** (populated in item frontmatter):
  ```graphql
  query EdgeP75TTFB($zone: String!, $since: Time!, $until: Time!) {
    viewer {
      zones(filter: { zoneTag: $zone }) {
        httpRequestsAdaptiveGroups(
          limit: 1
          filter: { datetime_geq: $since, datetime_leq: $until }
        ) {
          quantiles { edgeTimeToFirstByteMsP75 }
        }
      }
    }
  }
  ```
- **Variables**: bound at scrape time by `_kpi-cf.mjs` (zone tag from `CF_ZONE_TAG`, last-24h window).
- **Stale fallback**: scraper sets `stale: true` when `CF_ANALYTICS_TOKEN` or `CF_ZONE_TAG` missing.

## Execution slices (each its own ship cycle)

### Slice 1 — Measurement infra (≤ 4h, no founder action)
1. Add `CF_ZONE_TAG` env wiring to `_kpi-cf.mjs` (variable binding for the query above).
2. Populate `kpi.query` in this item's frontmatter with the GraphQL string verbatim.
3. Land 3 vitest cases: token-missing → stale, zone-missing → stale, happy path → numeric.
4. Manual dry-run via `node scripts/agents/roadmap/_kpi-cf.mjs` once founder pastes both env vars.

### Slice 2 — Workers KV cache layer (≤ 12h)
1. Inventory top-20 routes by request volume (use existing `cf-analytics` agent report).
2. For each cacheable GET route on `apps/web` and `apps/api`, decide:
   - **Static (panchang, /pujas, /temples)** → KV with 6h TTL, stale-while-revalidate 24h.
   - **Per-user** → bypass (Authorization header gate).
3. Add KV namespace binding `EDGE_CACHE` to `wrangler.toml` (founder must create namespace via dashboard).
4. Ship cache middleware in `apps/web/middleware.ts` reading `EDGE_CACHE` for whitelisted paths.
5. Wire purge hooks: any admin write to puja/temple invalidates the matching cache key via API call.

### Slice 3 — Cold-start audit (≤ 8h)
1. Move heavy synchronous imports in `apps/web/app/layout.tsx` behind `dynamic(... { ssr: false })`.
2. Inline-defer Razorpay, Stripe, PostHog, GTM SDK loads using `<Script strategy="afterInteractive">`.
3. Verify `runtime='edge'` set on every dynamic route (preflight script already enforces).
4. Re-run `scripts/preflight-cf-pages.sh` and capture worker bundle size — must stay < 3 MiB.

### Slice 4 — Verification (≤ 4h)
1. Run `wrk` or `autocannon` from 5 global vantage points (use `globalping.io` free API).
2. Capture p50 / p75 / p95 TTFB pre-/post-deploy in `docs/engineering/R-Q4-E-006-bench.md`.
3. Confirm KPI scraper returns ≤ 150 ms p75 over a 24h window.
4. Flip item `status: shipped` + populate `kpi.current` with scraped value.

## Founder action required

1. **Cloudflare API token** — Create scoped token with `Analytics:Read` + `Workers KV Storage:Edit`
   on `darshya.online` zone only. Paste into Render env as `CF_ANALYTICS_TOKEN` (used by KPI scraper).
2. **Cloudflare zone tag** — Look up via `wrangler whoami` or dashboard sidebar. Paste as `CF_ZONE_TAG`.
3. **KV namespace** — Create namespace `darshya-edge-cache` via dashboard, copy the namespace ID
   into `wrangler.toml` under `[[kv_namespaces]]`. Free tier covers 100k reads/day + 1k writes/day.
4. **Bench vantage authorization** — Optional: API key for `globalping.io` if running > 50 probes/day.

Once 1-3 are pasted, Slice 1 can ship autonomously.

## Dependencies

- Blocks: `R-Q4-G-001` (per item frontmatter `blocks` field).
- Depends on: nothing (no `depends_on` listed).

## Tripwires

- Worker bundle > 3 MiB after Slice 3 → revert dynamic-import changes, profile JS chunks.
- KV writes > 800/day → tighten purge invalidation logic (likely cache stampede).
- p75 TTFB regression > 200 ms post-Slice 2 → cache key collision; bisect by route.

## References

- Existing CF KPI scraper: `scripts/agents/roadmap/_kpi-cf.mjs`
- Free-tier budgets: `docs/free-tier-budgets.md`
- Worker size limit: `docs/cf-worker-budget.md`
- Edge-runtime triggers: `CLAUDE.md` section "Edge-runtime triggers"
- Preflight gate: `scripts/preflight-cf-pages.sh`

## Cycle slice shipped

This handoff doc closes the spec-thinness blocker. Slices 1-4 require founder action items 1-3 above.
