# Lawyer Brief — Bhaktisetu Refund Policy v2 Review

> One-page handoff for Bengaluru consumer-law counsel. Reading time: 5 min. Scope: review v2 draft, flag deal-breakers, return redlines within 7 days. Engagement fee: ₹3,000–10,000 (target 1hr consult + 1hr async redline).

## Context

Bhaktisetu Foundation (Section 8, 80G-certified, [PLACEHOLDER reg #]) operates darshya.online — devotional super-app (puja booking, adopt-a-temple subscriptions, store, astrology, gaushala). Founder = solo, India-based. Current Refund Policy v1 (live at `apps/web/app/refunds/page.tsx`) drafted in-house, never lawyer-reviewed.

We've drafted v2 to close 12 stress-tested failure scenarios. We need you to gate-keep before publish.

## What we need from you (deliverable)

1. **Review attached draft** (`refund-policy-v2-english.md`) — return tracked-changes / inline redlines
2. **Confirm or revise**:
   - Arbitration clause (Clause 14): SAMA Fast Track in Bengaluru — is this enforceable for consumer disputes given Consumer Protection Act 2019 carve-out?
   - Jurisdiction (Clause 15): Bengaluru exclusive — any issue with NRI users paying in foreign currency? (Processor `[verify]` — Stripe was removed 2026-08-11 and no replacement international rail has been chosen; `OPS-10`, 2026-09-02.)
   - Liability cap (Clause 5): ₹1L per claim on consumable defects — valid under CPA 2019?
   - Grievance Officer (Clause 13): we need to name a real Indian resident — do we need them to be a Foundation director, or just an employee?
   - Hindi translation (`refund-policy-v2-hindi.md`): notarization required per CPA 2019 regional-language rule, or self-attestation sufficient?
3. **Flag any deal-breakers** specific to:
   - 80G donation reversal language (Clause 7)
   - Chargeback retention fee (Clause 11) — does retaining ₹500 from credit balance constitute set-off under Indian law?
   - Force Majeure umbrella (Clause 2) — overbroad?
4. **Sign-off statement** (1 paragraph) we can cite internally if challenged

## What v2 adds vs v1 (read this for context)

| Area | v1 | v2 |
|---|---|---|
| Video-proof quality dispute | absent | 5-day investigation + 100% refund + credit if upheld (Clause 3) |
| Platform-initiated cancellation | absent | 100% refund + 7-day investigation outcome (Clause 3) |
| Subscriptions (CSR + adopt-a-temple) | absent | new Clause 4 — monthly/annual cancel mechanics |
| Product-liability cap | absent | ₹1L per claim (Clause 5) |
| Chargeback handling | absent | new Clause 11 — pre-contact requirement + retention fee + repeat-offender suspension |
| Bereavement | absent | new Clause 12 — next-of-kin process w/ death cert |
| Named Grievance Officer | "grievance@" only | new Clause 13 — name + phone + address per DPDPA + CP Rules 2020 |
| Arbitration | absent | new Clause 14 — SAMA Fast Track Bengaluru |
| Jurisdiction clause | absent | new Clause 15 — Bengaluru exclusive |
| Bilingual | English only | English + Hindi (separate file) |
| FX risk on USD refunds | absent | Clause 10 — devotee bears FX fluctuation |
| GST refund handling | absent | Clause 10 — net-of-GST refunds, Bhaktisetu absorbs irrecoverable |
| Force Majeure | absent | Clause 2 — explicit |
| Discretion clause | absent | Clause 3 — for edge cases where temple prep not commenced |

## Engagement logistics

- **Format**: 1hr Zoom + 1hr async redline = 2hr engagement
- **Files to share** (we'll send via email or DocSend, not over LinkedIn DM):
  - `refund-policy-v2-english.md` (draft, 17 clauses)
  - `refund-policy-v2-hindi.md` (Hindi mirror)
  - `refund-policy-gap-analysis.md` (12 scenario stress-test that informed v2)
  - `apps/web/app/refunds/page.tsx` (current v1 live)
  - This brief
- **Timeline**: 7 calendar days from engagement start
- **Payment**: bank transfer or UPI on delivery of redlines
- **Confidentiality**: standard NDA optional; happy to sign if you have a template

## Specific questions we need direct answers to

1. **Is "platform credit" valid consideration under Indian contract law?** If devotee gets "100% refund + 10% credit" but credit expires unused, is that an enforceable forfeit?
2. **Can we contractually require pre-contact before chargeback** (Clause 11) under RBI dispute-resolution norms?
3. **Are pro-rata refunds on annual subscriptions** (Clause 4) sufficient to defeat unfair-terms challenge?
4. **DPDPA Grievance Officer**: must be named individual, but can the same person be Foundation director + Grievance Officer + spokesperson?
5. **CPA 2019 Section 100**: any blanket arbitration clause might be struck down for consumer transactions. Is our "consumer may elect consumer-forum in lieu of arbitration" caveat (Clause 14) sufficient saving language?

## What we will NOT do regardless of advice

- Publish v2 without your sign-off
- Auto-arbitrate consumer disputes against devotee's will
- Forfeit donor 80G claims through reversal
- Operate without named Grievance Officer

## How to engage

Email: founder@darshya.online
Subject: "Bhaktisetu refund policy v2 review — quote requested"
Include: hourly rate, earliest start date, 2-3 references for consumer-tech work

We will respond within 24 hours.

## Closes
Q-R-Q1-L-002-cycle (lawyer brief)
