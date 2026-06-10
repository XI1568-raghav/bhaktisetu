---
id: R-Q1-M-009
title: "Daily deity-of-day cluster articles (7 weekly)"
category: marketing
owner_role: cmo
quarter: Q1
month_target: 2
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "cluster_articles_shipped"
  current: 0
  target: 28
  unit: "count"
  source: "gh_repo"
  query: "gh-count-md-files-in-docs-agent-reports-blog-drafts-where-tag-includes-deity-of-day-cluster-and-created-after-2026-01-01"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "28 articles shipped to docs/agent-reports/blog-drafts (7/wk x 4 wks Feb)"
  - "Each clusters around vaar devata (Mon-Sun deity map): Shiva, Mangal, Ganesh, Vishnu, Lakshmi, Santoshi Maa, Hanuman"
  - "Each links to /deity/[slug] + /pujas/[slug] + /aarti/[slug] for internal SEO"

agent_brief:
  context_files:
    - scripts/agents/content-publisher.mjs
    - apps/web/lib/deity-of-day.ts
    - apps/web/app/today/page.tsx
  prompt_skeleton: |
    Extend scripts/agents/content-publisher.mjs to seed deity-of-day cluster pattern.
    7-day rotation: Mon Shiva, Tue Mangal/Hanuman, Wed Ganesh, Thu Vishnu, Fri Lakshmi, Sat Santoshi/Shani, Sun Surya.
    Each article 800-1200 words. Cross-link 3 internal pages min: deity slug + matching puja + aarti.
    Output to docs/agent-reports/blog-drafts/YYYY-MM-DD-{slug}.md. Auto-pick up by /blog reader.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["seo","cluster","content","p2"]
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
