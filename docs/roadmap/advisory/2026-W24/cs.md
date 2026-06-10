# CS Advisory — 2026-W24

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 11
- Planned: 11
- In progress: 0
- Shipped: 0
- Verified: 0
- Blocked: 0

## Top 5 ready-to-ship (revenue/hour desc)
- **R-Q1-CS-001** Document 10 support macros (payment failed + booking delay + refund + ...) — ₹0 / 4h (P1)
- **R-Q1-CS-003** First 5 user phone interviews (NPS + churn signals) — ₹0 / 5h (P2)
- **R-Q1-CS-004** Multilingual macros — Hindi + Tamil + Telugu translations of top 5 — ₹0 / 3h (P2)
- **R-Q3-CS-001** P50 first-response SLA <2h across email/WA/chat (24x7 coverage) — ₹0 / 16h (P0)
- **R-Q3-CS-004** NPS survey — quarterly score >50 + qualitative themes summary — ₹0 / 12h (P2)

## Founder-blocked
- R-Q1-CS-002 blocked by U7: Setup WhatsApp founder phone as support escalation channel

## Live KPIs (this role)
_No matching KPIs cached yet — run orchestrator first cycle_

## Dept doctrine (top 30 lines of 07-cs.md)
```
# Customer Success — Darshya

Owner: Head of CS (founder, until first hire)
Principle: a devotee complaint is not a UX bug — it is a disrupted spiritual experience. We respond to the emotion first, the ticket second.

---

## 1. Top 5 complaint types (frequency × severity)

### 1. "Priest never showed / late by 30+ min" (HIGH × HIGH)
- **Likely root cause**: no priest-side reminder, no booking-day check-in. `apps/api/src/routes/conversations.ts` shows chat is gated on `puja_booking` status not in `pending_payment`/`cancelled`/`refunded` (lines 89–98), but there is no scheduled "T-60min priest ping" job. Priest tap to confirm "I'm preparing" is missing.
- **Apology (Hi-En)**: "Pranam {name} ji, aapne is puja ke liye intezaar kiya — yeh humari taraf se galti hai. Pandit ji se baat ki gayi hai, aur aapko aaj hi dobara schedule kiya jaa raha hai (no extra charge). Iske saath ek 10% credit aapke wallet mein daal diya hai."
- **Refund rule**: 100% refund OR free reschedule + 10% wallet credit (matches `refunds/page.tsx` row 87 "puja not performed"). Devotee picks.

### 2. "Video proof never arrived" (HIGH × HIGH)
- **Likely root cause**: priest forgot to upload; no enforcement gate before payout claim. CLAUDE.md line "Video proof MANDATORY for puja bookings — priest uploads before payout" is the *policy*, but only as strong as the cron that nags the priest. Render free tier has no cron — this gap is real.
- **Apology**: "Aapki puja zaroor hui — humare paas pandit ji ki confirmation hai. Lekin video humein 48 ghante mein nahi mila, jo aapka haq tha. Hum aaj raat tak video bhejenge, ya full refund — aap batayein."
- **Refund rule**: per refunds/page.tsx row 88 — "Full refund or reschedule option." If video lands within 96h, offer 25% credit instead of refund (preserves priest payout).

### 3. "Payment deducted, booking not confirmed" (MEDIUM × HIGH)
- **Likely root cause**: Razorpay webhook race or Render cold-start dropping the callback. Standard PSP-integration failure.
- **Apology**: "Aapka paisa kat gaya lekin booking confirm nahi hui — hum samajh sakte hain yeh kitna pareshan karne wala hai. Within 2 hours, ya toh booking confirm hogi ya 100% refund — koi documentation nahi maangenge."
- **Refund rule**: auto-refund within 2h if no booking row exists matching the Razorpay order_id. No questions asked.

### 4. "Live darshan stream froze / pixelated during aarti" (MEDIUM × HIGH)
- **Likely root cause**: AWS IVS is web-only (CLAUDE.md), mobile users on poor 4G hit transcoding fallbacks. Aarti timing peaks load.
- **Apology**: "Aarti ke samay stream ruk gaya — yeh sabse zaroori moment tha aur hum nahi de paaye. Recording link bhej rahe hain, aur agle 7 din free Premium darshan."
- **Refund rule**: free service today (refunds/page.tsx §6), so issue 7-day premium credit + send recording.

### 5. "Prasad never delivered / arrived spoiled" (MEDIUM × MEDIUM)
```

## Recommended next-cycle prompts for Decision Agent
1. Spawn cs-agent on R-Q1-CS-001 (Document 10 support macros (payment failed + booking delay + refund + ...)) — cs_macros_documented 0/10 count
1. Spawn cs-agent on R-Q1-CS-003 (First 5 user phone interviews (NPS + churn signals)) — user_interviews_completed 0/5 count
1. Spawn cs-agent on R-Q1-CS-004 (Multilingual macros — Hindi + Tamil + Telugu translations of top 5) — multilingual_macros_shipped 0/5 count
