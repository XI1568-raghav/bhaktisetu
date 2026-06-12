---
id: R-Q1-S-007
title: "Onboard 10 verified astrologers (lowest-friction supply)"
category: supply
owner_role: sales
quarter: Q1
month_target: 1
priority: P2
status: in_progress
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
  2026-06-12: Research + outreach kit shipped. docs/sales/astrologer-prospects-2026-06.md w/ 30 prospects:
    - Tier A: 15 Vedic Parashari (AstroSage/Clickastro/GaneshaSpeaks panels + LinkedIn + YouTube creators)
    - Tier B: 8 KP (Krishnamurti Paddhati) — Chennai/Bangalore/Hyderabad/Madurai
    - Tier C: 4 Lal Kitab + Naadi (Punjab/Vaitheeswaran Koil/Hoshiarpur)
    - Tier D: 3 independent established (Instagram 10K+, self-managed website, NRI-focused)
  Target onboarding mix: 7 Vedic + 2 KP + 1 Lal Kitab = 10 spanning 80% of demand.
  190-word cold email template + 4 recipient-type customisations (marketplace / YouTube creator / Tier-D independent / KP-Lal-Naadi paradigm).
  Cross-sell economics modelled: 10 astrologers × 5 puja recommendations/mo × 40% conversion × ₹1K avg × 20-40% platform share = ₹4K-8K MRR cross-sell + ₹3.6K-5.4K MRR direct consultation = ₹7-13K MRR potential.
  Risk notes: marketplace cannibalisation framing, quality control via 2-trial-consultation onboarding, NRI time-zone commitment, sastra-refund-policy explicitly documented.
  FOUNDER ACTION: ≤6h spread over 14 days for verification + personalisation + 3/day × 10-day send + trial-consultation scheduling.
  Closes (partial): Q-C-20260612T1153-R-Q1-S-007. Status stays in_progress until 10 onboarded + 30 first-month consultations completed.

tags: ["supply","astrology","p2"]
created_at: 2026-06-09T21:47:01.131Z
updated_at: 2026-06-12T08:45:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
