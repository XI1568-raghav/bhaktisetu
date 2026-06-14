---
id: R-Q1-M-014
title: "Personalized outreach v2 — per-temple custom email body (not boilerplate)"
category: marketing
owner_role: cmo
quarter: Q1
month_target: 1
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-CS-007"]
blocks: []

kpi:
  metric: "email_v2_personalized_sent"
  current: 0
  target: 50
  unit: "count"
  source: "agent-report"
  query: "grep '^email_v2_personalized_sent:' docs/agent-reports/*-cold-temple-outreach-v2.md | awk '{s+=$2} END {print s}'"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Higher reply rate vs boilerplate v1 → faster temple supply unlock → bookings. KPI is sends; revenue lift measured downstream once 50+ v2 sends rolled out."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "Per-lead body varies by deity tradition, region, city tier, and festival hint — no two distinct temples receive the same body."
  - "Deterministic: same lead produces same body on repeat (no LLM, $0 spend, diff-able)."
  - "Drop-in replacement for v1 — same /cold-temples + /mark-contacted contract, same 25/day cap, same idempotent re-run safety."
  - "Vitest coverage on classifier + builder + end-to-end (36 cases green)."

agent_brief:
  context_files:
    - "scripts/agents/cold-temple-outreach.mjs"
    - "scripts/agents/cold-temple-outreach-v2.mjs"
    - "scripts/agents/cold-temple-outreach-v2-personalize.mjs"
    - "scripts/agents/__tests__/cold-temple-outreach-v2-personalize.test.mjs"
  prompt_skeleton: |
    Owner-facing: review docs/agent-reports/<date>-cold-temple-outreach-v2.md
    after first prod run. Confirm deity-class + region breakdown looks
    representative of the lead feed; if any class is over- or under-sampled
    relative to lead distribution, classifier regex in
    classify{Deity,Region,CityTier} may need a tweak.

    To wire into the daily fleet:
      - add `node scripts/agents/cold-temple-outreach-v2.mjs` to the
        `.github/workflows/agents-daily.yml` matrix (or replace the v1 entry).
      - free-tier impact: identical to v1 (25 Resend/day cap, ~$0 LLM spend).

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-14: shipped per-temple personalization engine (R-Q1-M-014) on branch
    marketing/R-Q1-M-014-batch-2026-06-14. v1 cold-temple-outreach.mjs preserved
    for rollback. v2 is a separate file + module to avoid blast radius on v1
    callers in the workflow matrix.

tags: ["personalization","outreach","p0"]
created_at: 2026-06-10T20:35:05.804Z
updated_at: 2026-06-14T00:00:00.000Z
shipped_at: 2026-06-14T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Cold outreach to verified Hindu temples is the supply-side unlock for Darshya's
marketplace. v1 (`scripts/agents/cold-temple-outreach.mjs`) shipped a single
boilerplate body with only the temple `name` and `city` injected. Reply rates
on boilerplate cold email plateau fast — temples can tell when it's a blast.

v2 produces a fully per-temple body shaped by:

- **Deity tradition** (Shiva / Vishnu / Devi / Ganesha / Hanuman / Ayyappa /
  generic) — opener references the seva NRI devotees of that tradition
  actually book.
- **Region** (north / south / west / east / central / unknown) — situates the
  temple geographically and surfaces the diaspora that maps to it.
- **City tier** (tier1 / pilgrim / tier2 / unknown) — adjusts the "what
  NRI demand looks like in your city" value-prop.
- **Closest relevant festival** (Maha Shivratri / Janmashtami / Navratri /
  Ganesh Chaturthi / Hanuman Jayanti / Mandala-Makara Vilakku) — gives the
  temple a concrete reason to list **now** rather than next quarter.

Personalization is deterministic — FNV-1a hash of (id, deity, region, tier)
picks the template from a bank. Two distinct temples never collide on body
text (proven by 10-temple fleet test). $0 LLM spend.

# Implementation

- `scripts/agents/cold-temple-outreach-v2-personalize.mjs` — pure module:
  `classifyDeity`, `classifyRegion`, `classifyCityTier`, `stableHash`,
  `pickTemplate`, `buildSubject`, `buildBodyHtml`, `buildPersonalizedEmail`.
- `scripts/agents/cold-temple-outreach-v2.mjs` — agent wrapper. Same data
  source + mark-contacted contract as v1. Writes
  `docs/agent-reports/<date>-cold-temple-outreach-v2.md` with deity + region
  breakdown and `email_v2_personalized_sent: <N>` KPI line.
- `scripts/agents/__tests__/cold-temple-outreach-v2-personalize.test.mjs` —
  36 vitest cases covering classifiers, hash determinism, template selection,
  subject + body builders, and end-to-end fleet uniqueness.

# Rollout

v1 stays in the workflow matrix; v2 is additive. Once owner reviews the first
v2 report and confirms classifier accuracy on the live lead feed, flip
`agents-daily.yml` to call v2 instead of v1. Until then they can co-exist
safely — both call the same `/mark-contacted` endpoint so a lead won't be
double-contacted (v1's mark-contacted will prevent v2 from picking the same id
and vice versa).

# Reference

- v1 source: `scripts/agents/cold-temple-outreach.mjs`
- Lead feed API: `apps/api/src/routes/admin-ops.ts` → `GET /cold-temples`
- Idempotency contract: `POST /mark-contacted` with `{ leadIds: string[] }`
- Free-tier budget: `docs/free-tier-budgets.md` (Resend 100/day, 3000/mo)
