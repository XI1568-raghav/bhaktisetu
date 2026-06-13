---
id: R-Q3-E-003
title: "Android Play Store production release — public listing + 1K installs"
category: engineering
owner_role: cto
quarter: Q3
month_target: 8
priority: P0
status: shipped
agent_assignable: true
founder_blocker: 'U1'
depends_on: []
blocks: ["R-Q3-M-005"]

kpi:
  metric: "android_installs"
  current: 0
  target: 1000
  unit: "count"
  source: "gplay"
  query: "Google Play Console API installsAll(packageName='online.darshya.app') daily roll-up India region; target 1000 by Aug 31"

revenue_impact:
  amount_inr: 150000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Cannot agent-assign — founder action U4 (Google Play Console $25 one-time + EAS build + Play Store submission) required before Android prod release"
  - "Android app live in Play Store India region w/ Darshya branding + 5-lang store listing (en/hi/ta/te/bn)"
  - "1000 organic + paid installs in 30 days post-listing (Play Console installsAll metric)"
  - "Internal testing track shipped first (50-100 testers), closed testing 200, then prod open"

agent_brief:
  context_files: []
  prompt_skeleton: |
    Cannot agent-assign — founder action U4 (Google Play Console $25 one-time enrollment) required before Android prod release.
    Engineering sub-agent CAN assist post-enrollment: prepare EAS Android build config (apps/mobile/eas.json android profile), Play Console store listing metadata (5 lang screenshots + content rating + data safety form), internal/closed/open testing track ramp.
    Reference: docs/mobile-plan.md, apps/mobile/eas.json, apps/mobile/app.json — Expo 50 Android build path proven.
    Blocks R-Q3-M-005 app store launch campaign (cannot run paid UAC without prod listing).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["android","playstore","mobile","release"]
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
