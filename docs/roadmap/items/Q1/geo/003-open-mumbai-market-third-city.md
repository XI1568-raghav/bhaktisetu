---
id: R-Q1-G-003
title: "Open Mumbai market (third city)"
category: geo
owner_role: sales
quarter: Q1
month_target: 2
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-S-003","R-Q1-S-006"]
blocks: []

kpi:
  metric: "city_active_mumbai"
  current: 0
  target: 1
  unit: "count"
  source: "supabase"
  query: 'SELECT CASE WHEN (SELECT COUNT(*) FROM "Priest" WHERE city=''Mumbai'' AND aadhaar_verified=true) >= 25 AND (SELECT COUNT(*) FROM "Temple" WHERE city=''Mumbai'' AND verified=true) >= 5 THEN 1 ELSE 0 END'

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "Supabase: ≥25 verified pandits in Mumbai (Priest table)"
  - "Supabase: ≥5 verified temples in Mumbai (Temple table — Siddhivinayak + ISKCON Juhu + 3 others)"
  - "≥5 paid bookings completed via Mumbai pandits in last 30d"
  - "Mumbai NRI gift-puja conversion (USD payment) lights up"

agent_brief:
  context_files:
    - docs/company/05-sales.md
    - apps/web/app/city/page.tsx
  prompt_skeleton: |
    Sales sub-agent. City-3 launch — Mumbai (highest disposable income + NRI gift-from-relatives anchor).
    Blocked on R-Q1-S-003 (25 Mumbai pandits) + R-Q1-S-006 (5 Mumbai temples) — coordinate.
    Tactics: (1) Siddhivinayak + ISKCON Juhu priest outreach, (2) Gujarati pandit network (high commission willingness), (3) Marathi local-news PR.
    Highest LTV city — Gujarati/Marathi diaspora US/UK gift-puja anchor.
    Founder action: 3-day Mumbai trip Q1 month 2.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: Engineering scaffold shipped — /city/mumbai page expanded (7 temples + 12 pujas + NRI anchor copy). Supply onboarding gated on founder 3-day Mumbai trip + KYC video calls + temple MoU. Full handoff: docs/geo/R-Q1-G-003-mumbai-launch.md

tags: ["geo","mumbai","city-3","p0"]
created_at: 2026-06-09T21:50:55.201Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: 2026-06-14T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why Mumbai (city-3)

Mumbai is the **highest LTV city** for the Darshya devotional super-app:

- **Disposable income** — financial capital, 20M metro, highest per-capita spend on devotional services in India.
- **NRI gift-puja anchor** — Gujarati + Marathi diaspora in US/UK/Canada are the single largest "send puja to relatives in India" lane. Mumbai is the canonical source city for this flow.
- **Siddhivinayak halo** — globally recognized; drives organic SEO + word-of-mouth pull.
- **ISKCON Juhu density** — Krishna-bhakt audience already mobilized; warm intro pathway via R-Q1-S-006.

# What shipped (2026-06-14)

- `apps/web/lib/cities.ts` — Mumbai entry expanded (4→7 temples, 3→12 pujas, 3→5 deities, NRI anchor copy)
- `/city/mumbai` page auto-rerenders via SSG (revalidate=3600)
- Handoff doc: `docs/geo/R-Q1-G-003-mumbai-launch.md`

# Reference material

- `docs/geo/R-Q1-G-003-mumbai-launch.md` — full launch handoff
- `docs/sales/mumbai-pandit-prospects-2026-06.md` — 25 pandit pipeline
- `docs/sales/mumbai-pandit-q2-expansion.md` — Q2 supply expansion
- `docs/sales/mumbai-temples-5-prospects.md` — 5 temple targets (Siddhivinayak + ISKCON Juhu + 3 others)
- `docs/company/05-sales.md` — sales playbook
- `apps/web/app/city/page.tsx` — city index
- `apps/web/lib/cities.ts` — Mumbai entry

# Founder blocker

3-day Mumbai trip Q1 month 2 + 25 KYC video calls + 5 temple MoU. After both: KPI `city_active_mumbai` flips to 1.
