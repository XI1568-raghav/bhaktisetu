# CS 24h Global Coverage Spec — UK + US + AU + IN timezone w/ 24h SLA

> **Roadmap item**: R-Q4-CS-001 (P0) · **Authored**: 2026-06-13 · **Extends**: R-Q3-CS-001 P50 <2h SLA

## Goal

By Q4 (Jan 2027): 24h response guaranteed globally across UK/US/AU/IN timezones. Hard SLA 24h, P50 <4h.

## Coverage matrix (IST hours)

| Coverage hours (IST) | Region active | Lead role |
|---|---|---|
| 06:00 - 14:00 | UK morning + IN business | IN CS lead (8h shift) |
| 14:00 - 22:00 | IN evening + US morning | IN CS hire #2 (8h shift) |
| 22:00 - 06:00 | US daytime + AU morning | overnight contractor (8h shift) |

3 shifts × 1 person each = 3-person CS team minimum for true 24h. Founder backup for escalations only.

## Hiring plan

- IN CS Lead: ₹40K/mo
- IN CS hire #2: ₹35K/mo
- Overnight contractor (Philippines or India NRI-friendly hours): ₹50K/mo

Total monthly CS cost: ~₹1.25L/mo. Justified at ₹5L+ MRR (per F-003 MRR tracking — Q4 target ₹12.5L MRR easily covers).

## Tools

- Crisp Chat paid plan (₹2K/mo)
- WhatsApp Business API (gates on U7)
- PagerDuty for escalation routing (free tier)
- Knowledge base per R-Q3-CS-002 multilingual help center

## SLA dashboard

`/admin/cs/dashboard` shows:
- Live ticket count per channel
- Per-tier first-response (P50 + P95)
- Per-region first-response
- Backlog count
- Escalation route logs

## Closes

R-Q4-CS-001 — spec shipped.
