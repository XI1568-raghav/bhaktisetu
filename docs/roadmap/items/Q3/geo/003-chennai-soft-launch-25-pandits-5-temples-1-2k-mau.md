---
id: R-Q3-G-003
title: "Chennai soft launch — 25 pandits + 5 temples + 1.2K MAU"
category: geo
owner_role: sales
quarter: Q3
month_target: 7
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-S-001","R-Q3-S-009"]
blocks: []

kpi:
  metric: "chennai_mau"
  current: 0
  target: 1200
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT user_id) FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE u.location_city = 'Chennai' AND s.last_active_at >= NOW() - INTERVAL '30 days'; target 1200"

revenue_impact:
  amount_inr: 120000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Chennai MAU ≥ 1200 by end-Q3 (30-day rolling, sessions table city='Chennai')"
  - "Pre-req R-Q3-S-001 25 Chennai pandits onboarded + R-Q3-S-009 5 Chennai temples verified live"
  - "5-temple coverage spans Kapaleeshwarar (Mylapore) + Parthasarathy (Triplicane) + Vadapalani Murugan + Marundeeshwarar (Thiruvanmiyur) + 1 ISKCON Chennai"
  - "Tamil-language UI surface (i18n /ta) shipped — apps/web/app/ta/page.tsx already exists; needs Chennai-local CTAs + temples + pandit roster"

agent_brief:
  context_files:
    - apps/web/app/ta/page.tsx
    - apps/web/lib/i18n/ta.json
    - scripts/agents/cold-temple-outreach.mjs
    - apps/api/src/routes/admin-leads.ts
    - docs/company/07-geo.md
  prompt_skeleton: |
    Geo sub-agent. P0 Chennai soft launch — 1.2K MAU + 25 pandits + 5 temples by end-Q3.
    Pre-req R-Q3-S-001 (25 Chennai pandits) + R-Q3-S-009 (5 verified Chennai temples) MUST ship first — block this item until those are done.
    Anchor temples target list: Kapaleeshwarar (Mylapore) + Parthasarathy (Triplicane) + Vadapalani Murugan + Marundeeshwarar (Thiruvanmiyur) + ISKCON Chennai (Injambakkam).
    Tamil-language UX gate: apps/web/app/ta/page.tsx already shipped; needs Chennai-specific CTAs + local temple cards + local pandit roster.
    Local marketing: Tamil influencer collabs (Spirit of Madras, Madras Inherited, Tamil Bhakti channels) + Cantonal saturation Meta ads geo-targeted Chennai metro.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["geo","chennai","south","new-city"]
created_at: 2026-06-09T22:02:50.119Z
updated_at: 2026-06-09T22:02:50.119Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
