---
id: R-Q2-G-001
title: "Bengaluru scaled to 80% target — 55 pandits + 10 temples + 2K MAU"
category: geo
owner_role: sales
quarter: Q2
month_target: 4
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-G-001"]
blocks: []

kpi:
  metric: "bengaluru_mau"
  current: 0
  target: 2000
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT u.id) FROM \"User\" u JOIN \"UserSession\" s ON s.user_id=u.id WHERE u.city ILIKE '%bengaluru%' OR u.city ILIKE '%bangalore%' AND s.created_at >= NOW() - INTERVAL '30 days'"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "55 verified pandits onboarded in Bengaluru (cumulative from R-Q1-S-002 30 + Q2 25)"
  - "10 verified temples onboarded in Bengaluru (cumulative from Q1 5 + Q2 5)"
  - "2000 Bengaluru MAU (SQL count distinct UserSession in 30d where User.city=Bengaluru)"
  - "Bengaluru-specific landing /city/bengaluru live w/ temples + pujas + pandits real data"
  - "Sales pipeline: 5+ leads/week from /city/bengaluru PostHog cohort"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - apps/web/app/city/[slug]/page.tsx
    - apps/web/lib/cities.ts
    - scripts/agents/cold-temple-outreach.mjs
  prompt_skeleton: |
    Sales sub-agent. P0 Bengaluru scale milestone — depends on R-Q1-G-001 base.
    Verify /city/bengaluru live w/ 10 temples + 55 pandits + pujas data via API.
    Run cold-temple-outreach.mjs Bengaluru segment weekly for temple acquisition.
    Coordinate w/ pandit-onboarding agent — must hit 55 cumulative pandits.
    Track MAU via PostHog city cohort + supabase SQL on User+UserSession join.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: Engineering scaffold shipped (docs/geo/R-Q2-G-001-bengaluru-scale.md). Page /city/bengaluru already rich (7 temples, 12 pujas). Scale milestone gated on sales execution: 25 new pandits (KYC + Aadhaar), 5 new temples (MoU), 2K MAU activation. PR labeled founder-action-required.

tags: ["geo","bengaluru","scale"]
created_at: 2026-06-09T21:55:18.035Z
updated_at: 2026-06-09T21:55:18.035Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Bengaluru is the highest-ROI Indian metro for Darshya — largest NRI-origin remitter population, deep IT/Brahmin worker base, and ISKCON Bangalore Janmashtami draws 5 lakh devotees. Hitting 80% target (55 pandits + 10 temples + 2K MAU) proves the city-1 unit economics before replicating to Mumbai/Hyderabad/Delhi.

R-Q1-G-001 established the base (5 pandits + 5 temples + /city/bengaluru live). Q2 scales the supply 6× and demand from zero to 2K MAU — gating live revenue from Bengaluru bookings.

# Reference material

- Handoff: `docs/geo/R-Q2-G-001-bengaluru-scale.md` (sales playbook + KPI scrape + founder action items)
- Page: `apps/web/lib/cities.ts` Bengaluru entry (7 temples, 12 pujas, 5 deities)
- Q1 base: `docs/geo/R-Q1-G-001-bengaluru-launch.md`
- Onboarding agent: `scripts/agents/cold-temple-outreach.mjs` (Bengaluru segment weekly)
- Decision Agent KPI: `kpi.query` in this frontmatter (Supabase nightly scrape)
