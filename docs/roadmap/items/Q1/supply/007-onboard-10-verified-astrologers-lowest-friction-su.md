---
id: R-Q1-S-007
title: "Onboard 10 verified astrologers (lowest-friction supply)"
category: supply
owner_role: sales
quarter: Q1
month_target: 1
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_astrologers_count"
  current: 0
  target: 10
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM astrologers WHERE verified = true AND active = true"

revenue_impact:
  amount_inr: 40000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "10 verified astrologers active in astrologers table by Jan 31"
  - "Each has KYC + sample reading + price per minute set"
  - "Aadhaar-gate enforced on payout per business rule #4"

agent_brief:
  context_files:
    - apps/api/src/routes/astrology.ts
    - apps/web/app/astrology/page.tsx
    - prisma/schema.prisma
  prompt_skeleton: |
    Astrology is lowest-friction supply (no physical temple visit, remote-first).
    Sub-agent scrapes top 50 verified astrologers from AstroSage + AstroVed public profiles.
    Drafts WhatsApp cold-pitch in Hindi + English. Founder sends + does intake calls.
    On signup: insert astrologer row with verified=false; flip to true post-KYC + sample reading.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["supply","astrology","p2"]
created_at: 2026-06-09T21:47:01.131Z
updated_at: 2026-06-09T21:47:01.131Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
