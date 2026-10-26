# CS Advisory — 2026-W44

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 16
- Planned: 0
- In progress: 3
- Shipped: 13
- Verified: 0
- Blocked: 0

## Top 5 ready-to-ship (revenue/hour desc)
_None ready (DAG blocked or all in progress)_

## Founder-blocked
- R-Q1-CS-002 blocked by U7: Setup WhatsApp founder phone as support escalation channel
- R-Q1-CS-006 blocked by U7: WA blast 21 founder-network contacts asking 5 referrals each (warm intros)

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
_Defer to founder — all CS items either in flight or blocked_
