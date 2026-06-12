# WhatsApp Founder Phone — Support Escalation Channel

> **Roadmap item**: R-Q1-CS-002 (P1) · **Authored**: 2026-06-13

## Goal

Setup founder WhatsApp +91-XXXXX-XXXXX as Tier-2 support escalation channel. Closes "users have no human" gap pre-CS-hire.

## Setup

- Dedicated WA number (founder personal OR new SIM)
- WA Business app (free) NOT WA Cloud API (that's R-Q1-M-010)
- Profile: "Bhaktisetu Support" + logo + business hours 09:00-21:00 IST
- Auto-reply: "Namaste! I'll respond within 4hr. For urgent P0: ops@bhaktisetu.com"
- Quick-reply templates: 5 macros from R-Q1-CS-001

## Trigger

T1 macros directing user to "for escalation, WhatsApp +91-XXXXX-XXXXX" when:
- User insists on human after macro reply
- Sev P1 (high-value NRI, refund >₹5K)
- DPDP request (auto-escalate per legal)
- ≥2hr without resolution

## SLA

- Ack within 4hr business hours
- Resolution within 24hr P1, 7d P2
- Founder daily review queue 21:00 IST

## Tracking

WhatsApp Business → export chats weekly → docs/cs/founder-wa-log-{date}.md
Counts:
- Conversations initiated
- P-level distribution
- Resolution time avg
- Customer satisfaction (1-5 ask)

## Engineering tickets

- R-Q1-CS-002a: WA Business app setup + auto-reply
- R-Q1-CS-002b: Quick-reply templates load
- R-Q1-CS-002c: Founder daily review SOP
- R-Q1-CS-002d: Weekly chat-log export script

## Closes

R-Q1-CS-002 — spec shipped.
