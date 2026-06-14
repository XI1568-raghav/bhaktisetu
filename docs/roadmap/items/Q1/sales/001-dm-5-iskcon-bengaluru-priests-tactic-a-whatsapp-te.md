---
id: R-Q1-SA-001
title: "DM 5 ISKCON Bengaluru priests Tactic A WhatsApp template"
category: sales
owner_role: sales
quarter: Q1
month_target: 2
priority: P1
status: shipped
agent_assignable: true
founder_blocker: founder_must_send_whatsapp_to_5_priests
depends_on: []
blocks: []

kpi:
  metric: "iskcon_intros_made"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "WhatsApp template + 5 priest target list + pace + pass criteria documented at docs/sales/iskcon-blr-dm-5-tactic-a.md (shipped bb22f35)"
  - "Founder sends 5 WA messages on Day 1 (requires real phone numbers from community referral + ISKCON directory)"
  - "Target: 1-2 priests onboarded as Bhaktisetu pandits within 30 days"

agent_brief:
  context_files:
    - "docs/sales/iskcon-blr-dm-5-tactic-a.md"
    - "docs/sales/iskcon-bengaluru-call-10-runbook.md"
    - "docs/sales/iskcon-outreach-kit-v1.md"
  prompt_skeleton: |
    Reference shipped doc docs/sales/iskcon-blr-dm-5-tactic-a.md for WhatsApp template Tactic A + pace + pass criteria.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13: DM-5 tactic A doc shipped via bb22f35 (template + 5-priest target slots + pace + pass criteria).
  2026-06-14: roadmap status flipped to shipped. Founder action: source real WA phone numbers from ISKCON BLR directory + community referrals, send 5 template messages Day 1, triage replies Day 3-7.

tags: ["b2b","iskcon","outreach","p1"]
created_at: 2026-06-09T21:47:15.182Z
updated_at: 2026-06-09T21:47:15.182Z
shipped_at: 2026-06-14T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Direct priest-DM is the fastest path to first 2-3 ISKCON Bengaluru pandits onboarded (5-14d cycle vs 30-60d temple-trustee path). Priest-direct conversions run 35-50% vs 20% for temple-trustee. Enables pilot validation before scaling to temple-level coverage.

# Reference material

- `docs/sales/iskcon-blr-dm-5-tactic-a.md` — WhatsApp template (Tactic A), 5-priest target slots, pace (Day 1-30), pass criteria
- `docs/sales/iskcon-bengaluru-call-10-runbook.md` — call script for positive responders
- `docs/sales/iskcon-outreach-kit-v1.md` — broader ISKCON outreach materials

# Founder action required

1. Source 5 real WA phone numbers from ISKCON BLR directory + community referrals (slots [VERIFY: ...] in tactic-a doc)
2. Send 5 WA template messages Day 1
3. Triage replies Day 3-7 → schedule calls with positive responders
4. Track pass criteria checkboxes in tactic-a doc
