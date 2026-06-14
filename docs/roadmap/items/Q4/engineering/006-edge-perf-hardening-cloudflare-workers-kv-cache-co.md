---
id: R-Q4-E-006
title: "Edge perf hardening — Cloudflare Workers KV cache + cold-start <100ms global"
category: engineering
owner_role: cto
quarter: Q4
month_target: 10
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-G-001"]

kpi:
  metric: "edge_p75_ttfb_ms"
  current: 0
  target: 150
  unit: "milliseconds"
  source: "cloudflare"
  query: |
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

revenue_impact:
  amount_inr: 30000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 28
est_cost_inr: 0

success_criteria:
  - "Cloudflare API token + zone tag pasted into Render env (founder action #1+#2)"
  - "KV namespace darshya-edge-cache created and bound in wrangler.toml (founder action #3)"
  - "edge_p75_ttfb_ms scraped via _kpi-cf.mjs returns ≤ 150 ms over 24h window"
  - "Worker bundle stays under 3 MiB after Slice 3 dynamic-import refactor"
  - "Bench report at docs/engineering/R-Q4-E-006-bench.md captures pre/post p50/p75/p95 TTFB"

agent_brief:
  context_files:
    - "docs/engineering/R-Q4-E-006-handoff.md"
    - "scripts/agents/roadmap/_kpi-cf.mjs"
    - "docs/cf-worker-budget.md"
    - "scripts/preflight-cf-pages.sh"
  prompt_skeleton: |
    Ship Slice N of R-Q4-E-006 per docs/engineering/R-Q4-E-006-handoff.md.
    Slice 1 (measurement): wire CF_ZONE_TAG into _kpi-cf.mjs, add 3 vitest cases, dry-run.
    Slice 2 (KV cache): add wrangler.toml KV binding, ship middleware cache for top-20 GET routes.
    Slice 3 (cold-start): dynamic-import heavy SDKs, verify preflight worker size < 3 MiB.
    Slice 4 (verify): bench via globalping.io, capture p50/p75/p95, flip status=shipped.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: Spec thinness blocker closed via handoff doc. KPI query populated.
    4 execution slices enumerated. Founder action items 1-3 (CF token + zone tag + KV namespace)
    block Slice 1. PR returned PARTIAL with label founder-action-required.

tags: ["edge","cloudflare","workers","perf"]
created_at: 2026-06-09T22:09:23.580Z
updated_at: 2026-06-09T22:09:23.580Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
