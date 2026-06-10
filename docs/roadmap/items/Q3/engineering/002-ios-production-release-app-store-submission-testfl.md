---
id: R-Q3-E-002
title: "iOS production release — App Store submission + TestFlight 500 users"
category: engineering
owner_role: cto
quarter: Q3
month_target: 7
priority: P0
status: planned
agent_assignable: true
founder_blocker: 'U1'
depends_on: []
blocks: ["R-Q3-M-005"]

kpi:
  metric: "ios_app_store_live"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "docs/roadmap/_manual-kpis.yml key=ios_app_store_live (founder updates when Darshya iOS app is approved + listed in App Store India region; target 1)"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Cannot agent-assign — founder action U3 (Apple Developer $99/yr enrollment + EAS build + App Store submission) required before iOS prod release"
  - "iOS app listed in App Store India region w/ Darshya branding + screenshots (5 langs en/hi/ta/te/bn)"
  - "TestFlight 500 internal/external testers onboarded before public submission"
  - "App Review approval in < 2 attempts (avoid prior rejection patterns: missing privacy nutrition labels, religious-content policy compliance)"

agent_brief:
  context_files: []
  prompt_skeleton: |
    Cannot agent-assign — founder action U3 (Apple Developer Program $99/yr enrollment) required before iOS prod release.
    Engineering sub-agent CAN assist post-enrollment: prepare EAS build config (apps/mobile/eas.json), App Store Connect metadata (5 lang screenshots + privacy nutrition labels), TestFlight invite flow.
    Reference: docs/mobile-plan.md, apps/mobile/eas.json, apps/mobile/app.json — Expo 50 build path already proven on Phase 1-5 mobile parity.
    Blocks R-Q3-M-005 app store launch campaign (cannot ASO + paid installs without live listing).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["ios","app-store","mobile","release"]
created_at: 2026-06-09T22:02:48.000Z
updated_at: 2026-06-09T22:02:48.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
