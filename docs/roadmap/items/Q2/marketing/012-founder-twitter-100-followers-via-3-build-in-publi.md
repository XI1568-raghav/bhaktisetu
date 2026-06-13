---
id: R-Q2-M-012
title: "Founder Twitter — 100 followers via 3 build-in-public threads weekly"
category: marketing
owner_role: cmo
quarter: Q2
month_target: 5
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "twitter_followers"
  current: 0
  target: 1000
  unit: "count"
  source: "manual"
  query: "manual-weekly-log-via-metrics-tracker.md"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "12 build-in-public threads drafted and committed to docs/agent-reports/cmo/2026-05-founder-twitter-pack/"
  - "Cadence doc defines 3 posts/week × 4 weeks for Month 5 with explicit IST + PT timing"
  - "Engagement playbook defines <2h reply SLA during first 4h + DM funnel to bhaktisetu.com + quote-vs-reply + blocklist criteria"
  - "Founder posts ≥10 of 12 threads in Month 5 and updates metrics-tracker.md weekly; Month 5 milestone is +250 followers (25% of 1000 cumulative Q2 target)"

agent_brief:
  context_files:
    - "docs/agent-reports/cmo/2026-05-founder-twitter-pack/README.md"
    - "docs/agent-reports/cmo/2026-05-founder-twitter-pack/success-criteria-update.md"
    - "docs/agent-reports/cmo/2026-05-founder-twitter-pack/cadence.md"
    - "docs/agent-reports/cmo/2026-05-founder-twitter-pack/engagement-playbook.md"
    - "docs/agent-reports/cmo/2026-05-founder-twitter-pack/metrics-tracker.md"
  prompt_skeleton: |
    Use the thread pack at docs/agent-reports/cmo/2026-05-founder-twitter-pack/
    as the starting scaffold. Edit each thread in founder voice before posting.
    Update metrics-tracker.md every Sunday with X analytics + bhaktisetu.com
    referrer numbers.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13: NEEDS-FOUNDER-REVIEW. Thread pack + cadence + engagement playbook
  + metrics tracker ready under docs/agent-reports/cmo/2026-05-founder-twitter-pack/.
  Founder posts from own account (agent has no Twitter creds). Manual KPI
  tracking via metrics-tracker.md. Recommend ratcheting target to 250/month
  sustained if Month 5 closes below +100 followers (see success-criteria-update.md
  for full decision rules).

tags: ["social","twitter","founder"]
created_at: 2026-06-09T21:55:19.892Z
updated_at: 2026-06-13T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Build-in-public credibility is a cheap moat for solo-founder devotional commerce. Sri Mandir + Utsav both have it; Bhaktisetu does not yet. A 12-thread Month 5 pack lets the founder ship consistently for 4 weeks without weekly content-writing tax.

# Reference material
- `docs/agent-reports/cmo/2026-05-founder-twitter-pack/` — full pack (12 threads + 4 supporting docs)
- `docs/agent-reports/cmo/2026-05-founder-twitter-pack/success-criteria-update.md` — KPI ratchet recommendation
