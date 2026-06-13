---
id: R-Q4-S-005
title: "Gaushala network scale to 25 — onboard 15 new verified gaushalas across India"
category: supply
owner_role: sales
quarter: Q4
month_target: 12
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "gaushala_count_verified"
  current: 0
  target: 25
  unit: "count"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 150000
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
  2026-06-12: Research + outreach kit shipped. docs/sales/gaushala-prospects-2026-06.md w/ 25 prospects across 3 tiers:
    - Tier A (10 major): Pathmeda Gausewa Samiti (India's largest 50K+ cows), Sri Krishna Gaushala Delhi, Govardhan Nath Vrindavan (ISKCON-linked), Anandvan Maharashtra, Pingalwara Punjab, Sringeri Surabhi etc
    - Tier B (10 mid-size): Bharti Bareilly, Indore Goseva Mission, Pune Goshala Foundation, Coimbatore Hare Krishna, Haridwar pilgrim-channel etc
    - Tier C (5 small community-led): faster pilot conversations
  Hindi-first cold-email template (~200 words bilingual w/ Roman transliteration) + phone script (elderly-manager-friendly) + hand-written letter option (Tier A high-value).
  ZERO sends from agent.
  Reality check noted: gaushala managers usually elderly + low-tech, expect 30-day decision cycle, regional language matters (Hindi for North, Tamil/Telugu/Marathi/Gujarati/Bengali for respective).
  SCRAPER DEFERRED (R-Q4-S-005b filed next cycle once leads schema confirmed via founder).
  Economics: 10 gaushalas × 50-100 donors × ₹500/mo × 15% platform fee = ₹37.5K-75K MRR direct + cross-sell potential to existing temple-adopters.
  FOUNDER ACTION: ≤8h spread over 14 days for verification + first-wave send + Vrindavan/Mathura in-person visit if 0 reply by day 14.
  Closes (partial): Q-C-20260612T0501-R-Q4-S-005. Status stays in_progress until 15 onboarded + first month donations cleared.
  2026-06-13: Cycle Q-C-20260612T0503-R-Q4-S-005 — 4 companion artifacts added:
    - docs/sales/gaushala-prospects-2026-06.csv (CSV companion, 25 rows w/ tier+80g_status+verify markers)
    - docs/sales/gaushala-outreach-templates-2026-06.md (3 variants: Heritage HI / Modern EN / Hybrid HI-EN, each ≤180 words, 8% platform fee explicitly disclosed)
    - docs/sales/gaushala-anchor-candidates-2026-06.md (top 5 anchors w/ risk flags + intro paths + expected outcomes — Pathmeda / Sri Krishna Delhi / Vrindavan ISKCON / Sringeri Surabhi / Anandvan)
    - docs/sales/R-Q4-S-005-handoff.md (cycle-handoff doc — deviations from queue spec documented honestly)
  Scraper rewrite DEFERRED — existing scrape-gaushalas.ts retained (file as R-Q4-S-005b to extend w/ 8thpillar+RKM+govt-80G sources surgically).
  Per-scraper tests DEFERRED — sibling scrapers (priests/astrologers/temples/wellness) have no tests either; address as broader pattern in R-Q4-S-005c.

tags: ["supply","gaushala","scale","seva"]
created_at: 2026-06-09T22:09:26.554Z
updated_at: 2026-06-13T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
