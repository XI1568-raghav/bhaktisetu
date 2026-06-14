---
id: R-Q3-G-004
title: "Kolkata soft launch — 25 pandits + 5 temples + 1K MAU"
category: geo
owner_role: sales
quarter: Q3
month_target: 7
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-S-002","R-Q3-S-009"]
blocks: []

kpi:
  metric: "kolkata_mau"
  current: 0
  target: 1000
  unit: "users"
  source: "supabase"
  query: "SELECT COUNT(DISTINCT user_id) FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE u.location_city = 'Kolkata' AND s.last_active_at >= NOW() - INTERVAL '30 days'; target 1000"

revenue_impact:
  amount_inr: 100000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Kolkata MAU ≥ 1000 by end-Q3 (30-day rolling, sessions table city='Kolkata')"
  - "Pre-req R-Q3-S-002 25 Kolkata pandits onboarded + R-Q3-S-009 5 Kolkata temples verified live"
  - "5-temple coverage spans Kalighat + Dakshineswar Kali + Belur Math + Birla Mandir + Pareshnath Jain (Burrabazar) — Shakta-heavy bias matches Bengal devotional culture"
  - "Bengali-language UI surface (i18n /bn) shipped — apps/web/app/bn/page.tsx already exists; needs Kolkata-local CTAs + Durga Puja seasonal feature (Q3 overlaps Durga Puja Sep-Oct)"

agent_brief:
  context_files:
    - apps/web/app/bn/page.tsx
    - apps/web/lib/i18n/bn.json
    - scripts/agents/cold-temple-outreach.mjs
    - apps/api/src/routes/admin-leads.ts
    - docs/company/07-geo.md
  prompt_skeleton: |
    Geo sub-agent. P0 Kolkata soft launch — 1K MAU + 25 pandits + 5 temples by end-Q3.
    Pre-req R-Q3-S-002 (25 Kolkata pandits) + R-Q3-S-009 (5 verified Kolkata temples) MUST ship first.
    Anchor temples Shakta-bias: Kalighat (Shakti Peeth) + Dakshineswar Kali (Ramakrishna anchor) + Belur Math (Vivekananda math) + Birla Mandir + Pareshnath Jain (Burrabazar).
    Bengali UX gate: apps/web/app/bn/page.tsx already shipped; needs Kolkata-specific CTAs + Durga Puja seasonal hub (Sep-Oct overlap is highest-traffic Bengali devotional window of year).
    Marketing: Bengali influencer collabs (Sourav Das, Anupam Roy, Bengali Bhakti YouTubers) + Durga Puja pandal-sponsorship co-marketing (low-cost barter for branding visibility).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15: shipped engineering scaffold + handoff doc at docs/geo/R-Q3-G-004-kolkata-soft-launch.md.
    Covers Shakta-bias anchor temple set (Kalighat / Dakshineswar / Belur Math / Birla Mandir / Pareshnath Jain),
    Durga Puja seasonal hub scope (deferred to mid-Aug post supply >=50%), Bengali influencer + pandal sponsorship
    playbook, KPI scrape SQL, founder action items. Status stays in_progress — founder must onboard 25 pandits
    + 5 temples + drive 1K MAU. Pre-reqs R-Q3-S-002 + R-Q3-S-009 still BLOCKING.

tags: ["geo","kolkata","east","new-city"]
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
