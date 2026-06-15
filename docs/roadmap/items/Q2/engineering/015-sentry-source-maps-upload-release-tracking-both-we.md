---
id: R-Q2-E-015
title: "Sentry source maps upload + release tracking — both web + api"
category: engineering
owner_role: cto
quarter: Q2
month_target: 4
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: 'U6'
depends_on: ["R-Q1-E-014"]
blocks: []

kpi:
  metric: "sentry_release_tracking"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "Count tagged Sentry releases with web+api source maps uploaded. Verify via sentry.io → Releases → look for darshya@<sha> entries with artifacts > 0 for both darshya-web and darshya-api projects."

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "apps/web/next.config.ts has productionBrowserSourceMaps: true"
  - ".github/workflows/sentry-release.yml uploads both web .next maps + api dist maps"
  - "NEXT_PUBLIC_SENTRY_RELEASE wired through web build and surfaced via apps/web/lib/release.ts"
  - "Founder pastes SENTRY_AUTH_TOKEN GH secret and cuts one git tag v* push"
  - "sentry.io shows release darshya@<sha> with artifacts on both darshya-web + darshya-api"

agent_brief:
  context_files:
    - ".github/workflows/sentry-release.yml"
    - "apps/web/next.config.ts"
    - "apps/api/src/lib/sentry.ts"
    - "docs/engineering/R-Q2-E-015-sentry-sourcemaps-handoff.md"
  prompt_skeleton: |
    Scaffolded 2026-06-15 (R4). Code changes complete. Awaiting founder paste of SENTRY_AUTH_TOKEN GH secret + git tag v* push to flip KPI 0 → 1.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15: code scaffold shipped — productionBrowserSourceMaps enabled, release.ts helper + test added, founder handoff doc at docs/engineering/R-Q2-E-015-sentry-sourcemaps-handoff.md. Status stays in_progress until founder completes 2-step paste + tag (KPI requires live tagged release with uploaded artifacts).

tags: ["observability","sentry"]
created_at: 2026-06-09T21:55:16.790Z
updated_at: 2026-06-09T21:55:16.790Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
