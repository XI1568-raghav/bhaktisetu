---
id: R-Q1-M-002
title: "GSC + Bing Webmaster verification + sitemap.xml submit"
category: marketing
owner_role: cmo
quarter: Q1
month_target: 1
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "gsc_verified"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "manual KPI _manual-kpis.yml field gsc_verified (1 when both GSC + Bing Webmaster show darshya.online as verified AND sitemap.xml submitted with > 0 URLs indexed)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "Google Search Console: darshya.online verified via DNS TXT or HTML meta tag (apps/web/app/layout.tsx)"
  - "Bing Webmaster Tools: same verification"
  - "https://darshya.online/sitemap.xml submitted to both — ≥ 500 URLs detected"
  - "GSC Coverage report shows ≥ 50 URLs indexed within 14d of submission"
  - "Existing scripts/agents/gsc-submitter.mjs pings on every run (Google sitemap ping + Bing IndexNow)"

agent_brief:
  context_files:
    - docs/company/02-cmo.md
    - apps/web/app/layout.tsx
    - apps/web/app/sitemap.ts
    - scripts/agents/gsc-submitter.mjs
  prompt_skeleton: |
    CMO sub-agent. P0 SEO — sitemap exists at apps/web/app/sitemap.ts (~500 URLs across pujas/temples/wisdom/cities/festivals) but never submitted to GSC/Bing.
    Founder action: (1) create GSC + Bing Webmaster accounts, (2) verify domain via DNS TXT (preferred) or HTML meta tag (already in layout.tsx if GSC_VERIFICATION env set), (3) submit https://darshya.online/sitemap.xml.
    Agent action: ensure scripts/agents/gsc-submitter.mjs runs daily (already wired). Confirm INDEXNOW_KEY served at darshya.online/<key>.txt.
    Cannot agent-assign GSC account creation — founder login + 2FA required.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["seo","week-1","p0"]
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
