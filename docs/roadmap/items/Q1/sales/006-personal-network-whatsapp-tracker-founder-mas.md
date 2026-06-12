---
id: R-Q1-SA-006
title: Personal-network WhatsApp tracker — founder masthead-list (NO cold-call automation per founder)
category: sales
owner_role: sales
quarter: Q1
month_target: 1
priority: P1
status: shipped
agent_assignable: false
founder_blocker: true
depends_on: []
blocks: []

kpi:
  metric: warm_outreach_replies_per_week
  current: 0
  target: 10
  unit: count
  source: manual
  query: "manual:docs/sales/_warm-network-tracker.md (founder updates weekly)"

revenue_impact:
  amount_inr: 100000
  confidence: high
  basis: "Founder's personal Hindu network = highest-converting demand source. 21 warm contacts × 30% reply × 50% convert × ₹3k avg first order = ~₹100k. Recurring potential 3-5x via repeat puja."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "docs/sales/_warm-network-tracker.md created with 21+ contact rows (Name | Relationship | City | Phone | Last contacted | Outcome | Notes)"
  - "Tracker is MANUAL — founder owns sending, NO automation, NO mass-blast"
  - "Per founder explicit ask 2026-06-10: 'no manual phone calls, personal-network WA will be handled by user manually'"
  - "Agent-side limited to: tracker doc + weekly reminder ping to founder + reply-tagged status update template"
  - "WhatsApp outreach copy templates drafted (3 variants: catch-up + soft-puja-mention + direct-ask)"
  - "Weekly review cadence shipped: every Sunday 8pm IST founder runs through tracker, marks status, drafts next-week sends"

agent_brief:
  context_files:
    - docs/sales/_warm-network-tracker.md
    - docs/company/05-sales.md
  prompt_skeleton: |
    Sales sub-agent. NO automation per founder. Build:
    1. tracker doc with 21+ contact rows (founder pre-populates names; agent stages schema)
    2. 3 WA-copy templates (catch-up / soft-puja-mention / direct-ask)
    3. weekly Sunday-8pm reminder script (existing GH workflow pattern)
    4. reply-status-tag schema (replied / no_reply / not_interested / booked)
    Do NOT build send-automation. Do NOT integrate WhatsApp Business API for this.

handoff_notes: |
  2026-06-12: created per founder direct ask 2026-06-10 verbatim:
  "personal-network WA will be handled by user manually" + "NO manual phone calls".
  Agent assignment: false. Founder-blocker: true. Agent-side scope strictly limited.

tags: [sales, founder-network, warm-outreach, p1, no-automation]
created_at: 2026-06-12T02:00:00Z
updated_at: 2026-06-12T02:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Founder's warm Hindu network is the single highest-converting demand pool for the first 100 paying users. Cold acquisition CAC is ₹40-200 per booking unverified. Warm network CAC is ₹0 + 30-min of founder time per contact.

But founder is explicit (2026-06-10): no automated outreach to warm network. Personal voice + manual send only. Agents support the tracking + reminder cadence + copy templates, NOT the sending.

# What agents CAN do here

- Build tracker doc + schema
- Draft copy templates (founder edits before send)
- Send weekly Sunday reminder to founder phone ("21 warm contacts pending review")
- Tag replies into status enum
- Roll up weekly metrics

# What agents CANNOT do here

- Send WhatsApp messages to any contact in this list
- Auto-call any number
- Auto-add contacts beyond what founder pastes
- Suggest names not on founder's pre-approved list

# Founder action required

1. Populate `docs/sales/_warm-network-tracker.md` with 21+ contact names + phones (founder's first session)
2. Confirm 3 copy templates (or rewrite in founder voice)
3. Weekly 30-min Sunday review (locked into calendar)

# Cost

- Engineering: 4h (tracker doc + Sunday reminder agent + status-tag schema)
- Founder time: ~30min/week ongoing
- Anthropic tokens: 0
- WhatsApp messages: founder uses personal app, not platform API
