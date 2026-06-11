---
id: R-Q1-CS-009
title: Founder-inbox auto-reply agent — acknowledge + group by intent + 24h SLA escalate
category: cs
owner_role: cs
quarter: Q1
month_target: 2
priority: P1
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: founder_inbox_auto_ack_pct
  current: 0
  target: 95
  unit: percent
  source: manual
  query: "manual:track 1 week of founder@darshya.online incoming. count(autoreply_sent)/count(total)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Indirect retention — devotee writes to founder, no reply within 24h damages trust. Auto-ack + AI-triage frees founder bandwidth, prevents leakage."

est_hours: 12
est_cost_inr: 0

success_criteria:
  - "Every inbound to founder@darshya.online + grievance@ gets auto-ack within 2min ('We received your message. A human responds within 24h.')"
  - "Auto-ack classifies into 1 of 6 intents: refund / puja-issue / press / partnership / spam / other"
  - "Class 'spam' silently dropped (no human queue)"
  - "Classes 'refund' + 'puja-issue' assigned WhatsApp ping to founder phone (if SLA breach risk)"
  - "Classes 'press' + 'partnership' added to weekly digest"
  - "≥95% auto-ack rate measured over 7-day window"

agent_brief:
  context_files:
    - apps/api/src/routes/support.ts
    - apps/api/src/lib/resend.ts
    - docs/company/07-cs.md
  prompt_skeleton: |
    CS sub-agent. Build inbound-mail handler.
    Hook: Resend inbound webhook (or Gmail forwarding rule pointing at our webhook).
    Per email, classify via Opus 4.7 single-shot (low maxTokens 500) into 1 of 6 intents.
    Auto-ack uses sendEmail() template. Founder WhatsApp ping via /api/v1/whatsapp/send (existing).
    No new Prisma schema — write to `support_ticket_intents` JSON column on SupportTicket OR
    new table `founder_inbox_classifications`.
    Watch: don't fire on internal mail (from @darshya.online), don't loop on auto-ack itself.

handoff_notes: |
  2026-06-12: created per founder direct ask 2026-06-10 — "founder-inbox auto-reply via agents".
  Awaits Resend inbound webhook setup OR Gmail-side forwarding rule (founder action).

tags: [cs, automation, p1, founder-inbox]
created_at: 2026-06-12T02:00:00Z
updated_at: 2026-06-12T02:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

Founder is single bottleneck for grievance + press + partnership inquiries. Every email that sits unread > 24h leaks trust (devotee thinks platform abandoned them; press writer moves to competitor; partner forgets).

Auto-ack pattern (proven by every $1M+ ARR consumer brand): immediate machine acknowledgement, human follow-up within SLA. Devotee gets reassurance instantly even if founder asleep.

Class 'spam' silent-drop saves founder from inbox triage of cold-outreach + transactional noise.

# Pre-read

- `apps/api/src/routes/support.ts` — existing ticket schema
- `apps/api/src/lib/resend.ts` — sendEmail() env-or-noop pattern
- `docs/company/07-cs.md` — top complaint types, macros
- Resend Inbound docs: https://resend.com/docs/dashboard/webhooks/introduction

# Founder action required

1. **Resend Inbound setup OR Gmail forwarding** — decide pipeline (Resend = cleaner, requires DNS MX record on founder@; Gmail filter forwarding = simpler, no DNS change)
2. **Confirm 6 intent classes match founder mental model** — current list is illustrative
3. **WhatsApp ping format** — confirm phone, confirm template wording

# Cost

- Tokens per inbound email: ~500 (classification only)
- ~50 emails/day baseline = ~25k tokens/day = ~750k/mo (free via Blackbox)
- Resend free 100/day covers outbound auto-acks (alarm if breached)
