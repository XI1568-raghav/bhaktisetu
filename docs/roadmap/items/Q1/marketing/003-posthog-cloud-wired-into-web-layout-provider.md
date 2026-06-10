---
id: R-Q1-M-003
title: "PostHog cloud wired into web layout (Provider)"
category: marketing
owner_role: cmo
quarter: Q1
month_target: 1
priority: P0
status: planned
agent_assignable: true
founder_blocker: 'U8'
depends_on: []
blocks: []

kpi:
  metric: "posthog_web_active"
  current: 0
  target: 1
  unit: "count"
  source: "gh_repo"
  query: "grep -rE 'posthog\\.init|PostHogProvider' apps/web/app/layout.tsx apps/web/components/Analytics.tsx | wc -l (target: ≥1)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 3
est_cost_inr: 0

success_criteria:
  - "CF Pages env NEXT_PUBLIC_POSTHOG_KEY + NEXT_PUBLIC_POSTHOG_HOST set (founder action)"
  - "apps/web/components/Analytics.tsx PostHogProvider mounted in layout.tsx"
  - "Live darshya.online page load fires posthog $pageview event (verify in PostHog Live dashboard)"
  - "identify() + reset() wired on login/logout flows (apps/web/app/auth/callback/page.tsx)"
  - "EU host alignment confirmed (no US/EU mismatch — already fixed prior commit per TASKS.md HANDOFF #20)"

agent_brief:
  context_files:
    - apps/web/lib/posthog.ts
    - apps/web/components/Analytics.tsx
    - apps/web/app/layout.tsx
    - docs/company/02-cmo.md
    - docs/env-vars.md
  prompt_skeleton: |
    CMO + CTO sub-agent. P0 analytics foundation — wraps R-Q1-E-008 (5 funnel events).
    Read apps/web/lib/posthog.ts (already exists per TASKS.md). Verify Analytics.tsx mounts PostHogProvider in layout.tsx.
    Founder action: paste NEXT_PUBLIC_POSTHOG_KEY + NEXT_PUBLIC_POSTHOG_HOST in CF Pages env (gate U8 per activation-gates.md).
    Verify: open darshya.online, check PostHog Live dashboard for $pageview event within 30s.
    Existing pillar Analytics identify/reset wiring shipped per HANDOFF #20 — confirm not regressed.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["analytics","week-1","p0"]
created_at: 2026-06-09T21:47:07.357Z
updated_at: 2026-06-09T21:47:07.357Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
