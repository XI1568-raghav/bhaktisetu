# CS First-Response SLA Spec — P50 <2h across email/WA/chat (24x7)

> **Roadmap item**: R-Q3-CS-001 (P0) · **Authored**: 2026-06-12 · **Target effective date**: Q3 (Oct 2026) — after first CS hire lands (per R-Q1-H-001 trigger metric).

## Goal

P50 first-response time across email + WhatsApp + on-site chat = **<2 hours** measured 24x7 — even at 3 AM IST when devotees in US are awake.

## Tier structure (response-time per channel × time-of-day)

| Channel | P50 weekday IST 9-9 | P50 weeknight | P50 weekend |
|---|---|---|---|
| email | 1 hour | 3 hours | 4 hours |
| WhatsApp | 30 min | 2 hours | 3 hours |
| on-site chat (Intercom/Crisp) | 5 min (live during 9-9) | 1 hour (auto-bot + queue) | 2 hour |

Aggregate P50 across all: <2h, 24x7.

## Staffing model

### Pre-launch (now): founder-only

- Founder responds 7 AM - 10 PM IST manually
- Auto-acknowledge bot off-hours: "We saw your message, founder will reply by 8 AM IST"
- Acceptable for <50 active customers

### Post first-CS-hire (Q3, per R-Q1-H-001 trigger)

- CS associate covers 9 AM - 6 PM IST weekdays
- Founder covers 6 PM - 11 PM IST + weekends as backup
- Auto-bot covers 11 PM - 9 AM IST (queue + acknowledge)

### Post-scale (Q4+, MRR > ₹10L)

- 3 CS associates rotation covering 24x7 IST coverage
- One always on for NRI 9 PM - 6 AM IST (US daytime)
- Founder out of CS chain — strategic only

## Auto-acknowledge templates per channel

### Email auto-reply

```
Subject: Re: {original subject} — we received your message

Pranam,

Thank you for reaching Bhaktisetu support. We've received your message
and will reply within {SLA target}.

Booking-related: faster via /me/bookings/{id}/support
General queries: founder@darshya.online
Urgent (refund / payment failure): mention "URGENT" in subject

— Bhaktisetu CS
```

### WhatsApp auto-reply

```
Pranam 🙏

Bhaktisetu CS team has received your message. We'll reply within
{30 min OR 2 hr OR 3 hr based on day/time}.

For booking issue: share your booking ID (BS-XXXXX) for faster
resolution.
```

### Chat auto-reply (off-hours)

```
You've reached Bhaktisetu support outside our live hours.

Live: 9 AM - 6 PM IST weekdays. Off-hours queue: responses within 1-2h
typically.

If urgent (refund / no-pandit-show / payment issue) — WhatsApp founder
direct: {founder WA}
```

## Routing logic

Inbound to support@darshya.online OR WA Business OR on-site chat → unified inbox (Crisp / Intercom / Front).

Per ticket: auto-assign by topic:
- "refund" / "didn't show" / "payment failed" → URGENT lane (founder + CS lead notified)
- "booking" / "reschedule" / "video proof" → STANDARD lane (CS hire handles)
- "general" / "feature request" / "feedback" → FYI lane (CS reads, founder reviews weekly)

## KPIs to track

| KPI | Target | How measured |
|---|---|---|
| P50 first-response | <2h aggregate | timestamp diff: ticket created vs first human reply |
| P95 first-response | <8h | same |
| CSAT (post-resolution) | >4.5 / 5 | follow-up survey 24h post-close |
| First-Contact-Resolution | >70% | tickets closed w/o additional back-and-forth |
| Ticket backlog | <20 open at any time | snapshot |
| WA response within 30 min (live hr) | 95% | live tracking |

## Tools

- **Crisp Chat** (free tier: 2 agents, 50 conversations/mo) — on-site widget + email integration
- **WhatsApp Business app** (free) — founder-direct channel
- **Email**: support@darshya.online → forward to Crisp queue

Total tooling cost v1: ₹0. Defer paid Crisp upgrade (₹2K/mo) until >50 tickets/week.

## Founder action

```markdown
- [ ] Set up Crisp account + embed widget on darshya.online
- [ ] Configure auto-reply templates above
- [ ] Set up support@ alias forwarding to Crisp
- [ ] WhatsApp Business app on founder phone
- [ ] First-CS hire trigger: at 100 paid bookings/month per R-Q1-H-001 — file CS-associate JD
- [ ] Set weekly review reminder for KPI dashboard (per docs/finance/mrr-tracking-cadence-v1.md cadence)
```

## Out of scope

- Voice call support (defer to Q4 if AI-Pandit voice MVP needs human escalation)
- Multi-language support tier (covered by macros-v1-{hi,ta,te}.md)
- Knowledge base self-serve (covered by R-Q3-CS-002 next ticket)
- AI chatbot (defer until volume justifies — typically >500 tickets/mo)

## Closes

R-Q3-CS-001 — SLA spec shipped. Status flips to shipped post-CS-hire + first month KPI dashboard data.
