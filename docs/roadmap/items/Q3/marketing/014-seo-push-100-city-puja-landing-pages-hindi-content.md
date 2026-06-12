---
id: R-Q3-M-014
title: "SEO push — 100 city+puja landing pages + Hindi content + backlinks"
category: marketing
owner_role: cmo
quarter: Q3
month_target: 9
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "seo_organic_sessions_monthly"
  current: 0
  target: 80000
  unit: "sessions"
  source: "gsc"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 60000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: AUDIT slice shipped. docs/seo/seo-audit-2026-06-12.md (research-only, no code):
    - Title tag analysis structure (per-page fixes pending GSC export)
    - 10 city+puja landing pages proposed (Satyanarayan-Mumbai, Griha-Pravesh-Bangalore, Mundan-Delhi, Upanayanam-Chennai, Durga-Saptashati-Kolkata, Vinayaka-Chavithi-Hyderabad, Karwa-Chauth-Jaipur, Lakshmi-Puja-Pune, Shraddha-Gaya, Rudrabhishek-Haridwar) w/ per-page content structure spec
    - Hreflang implementation pattern (en-IN/hi-IN/en-US/en-GB/en-AU/en-CA + x-default)
    - IndexNow integration pattern (Bing+Yandex+Naver instant index)
    - Quick wins enumerated (robots.txt, sitemap priorities, alt text, structured data, Core Web Vitals)
    - 7 engineering tickets to file next cycle (R-Q3-E-XXX through DDD)
  EDGE-RUNTIME ALERT: 10 city+puja landing pages BLOCKED on edge-runtime ~250-route sweep planning. Must ship `docs/engineering/edge-runtime-sweep-plan.md` before any new /puja/[slug] route created.
  FOUNDER ACTION: GSC Pages+Coverage export + INDEXNOW_KEY generation + top-3 priority landing page approval (recommend seasonal Q3-Q4: Karwa Chauth + Durga Saptashati + Vinayaka Chavithi).
  Closes (partial): Q-C-20260612T0001-R-Q3-M-014. Status stays in_progress until 5+ engineering tickets ship.

tags: ["seo","content","landing-pages","organic"]
created_at: 2026-06-09T22:02:53.908Z
updated_at: 2026-06-12T09:15:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
