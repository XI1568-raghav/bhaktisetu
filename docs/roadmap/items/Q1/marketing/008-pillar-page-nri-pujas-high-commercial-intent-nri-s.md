---
id: R-Q1-M-008
title: "Pillar page /nri-pujas (high commercial intent NRI-specific guide)"
category: marketing
owner_role: cmo
quarter: Q1
month_target: 2
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "pillar_pages_shipped"
  current: 1
  target: 2
  unit: "count"
  source: "gh_repo"
  query: "ls apps/web/app/nri-pujas/page.tsx apps/web/app/<second-pillar>/page.tsx | wc -l"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 10
est_cost_inr: 0

success_criteria:
  - "/nri-pujas pillar page shipped — hero + 6-step HowTo + 6 popular pujas + 6 temple cities + 10-FAQ + Gift CTA"
  - "FAQPage + HowTo + BreadcrumbList JSON-LD on the page (rich snippet eligible)"
  - "Sitemap entry priority 0.95"
  - "Second pillar page TBD next cycle to flip status=shipped"

agent_brief:
  context_files:
    - "apps/web/app/nri/page.tsx"
    - "apps/web/app/gift/page.tsx"
  prompt_skeleton: |
    Build second pillar page covering a complementary high-commercial-intent NRI cluster
    (e.g. /usa-india-puja-booking or /gift-puja-from-abroad). Mirror the /nri-pujas structure:
    hero, trust-signal grid, HowTo, popular-puja grid, FAQ, final CTA. Reuse JSON-LD pattern.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 R-Q1-M-008 round-4: shipped /nri-pujas pillar page (1 of 2 target).
    Status stays in_progress until second pillar lands. Status flip + shipped_at gated
    on founder verification that page is live + indexed (KPI source=gh_repo only confirms
    file exists, not that Google has indexed it).

tags: ["seo","pillar","nri","content","p1"]
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
