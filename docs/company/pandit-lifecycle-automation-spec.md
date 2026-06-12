# Pandit Lifecycle Automation Spec — Onboarding + Training + KYC + Quality

> **Roadmap item**: R-Q3-S-008 (P0) · **Authored**: 2026-06-13

## Goal

Pandit lifecycle (onboarding → training → first booking → ongoing quality → payout) is currently manual founder-led. At scale (>50 pandits), needs automation.

## Lifecycle stages + automation per stage

### Stage 1 — Initial WA contact (manual; founder)

No automation. Personal touch required.

### Stage 2 — KYC submission (automated)

Pandit submits via `/onboarding/pandit/kyc`:
- Aadhaar (masked)
- PAN
- 2 video proofs (puja completion samples)
- Bank account for payout
- 1 community reference (phone)

Auto-validation:
- Aadhaar masked-format regex check
- PAN format validation + IT-dept verify API (optional Q2)
- Bank IFSC validation via Razorpay API
- Reference phone verified via SMS round-trip

### Stage 3 — Founder trial-puja review (manual)

2 trial bookings under founder direct observation. CHECKLIST:
- [ ] Pandit timely
- [ ] Sastra knowledge present
- [ ] Sanskrit pronunciation acceptable
- [ ] Devotee-side communication respectful
- [ ] Video proof delivered within 24h

Automated workflow:
- Test bookings created via admin panel
- Founder receives WA reminder T-30 min
- Post-puja survey auto-sent to founder
- KPI tracked in pandit profile

### Stage 4 — Live listing (automated)

Pandit profile goes live on platform. Auto-actions:
- Pandit profile page created
- Service catalog mapped (per sampradaya)
- Pandit added to puja-type matching algorithm
- Welcome WA + email auto-sent (3-touch series)
- 5-question quiz on platform expectations sent (60% pass to go live)

### Stage 5 — Onboarding training videos (automated delivery)

Series of 5 videos sent over 7 days:
- Day 1: Platform overview
- Day 2: How devotee booking works
- Day 3: Video proof requirements
- Day 4: Payout schedule + dispute resolution
- Day 5: Quality expectations + 5 dos/don'ts
- Day 6: First-week check-in
- Day 7: Founder-direct Q&A WA call

Tools: free Loom or YouTube unlisted.

### Stage 6 — Ongoing quality monitoring (automated)

Per pandit, tracked weekly:
- Devotee ratings (post-puja survey)
- Video proof on-time rate
- No-show count
- Cancellation count
- Dispute count

Yellow flag: 1 incident
Red flag: 3+ incidents in 30 days → founder review + potential suspension

### Stage 7 — Payout (automated)

Daily Razorpay batch payout. No manual approval needed for amounts ≤₹5K. Above that, founder approval gate.

### Stage 8 — Termination (manual + automated)

Manual founder decision; automated cascade:
- Pandit profile flipped to inactive
- Future bookings reassigned
- Bank payout final settlement
- KYC documents retained 8 years (audit)
- 30-day grace period for dispute resolution

## DB schema deltas

```prisma
model PanditLifecycleEvent {
  id           String   @id @default(uuid()) @db.Uuid
  panditId     String   @map("pandit_id") @db.Uuid
  eventType    String   // onboarded | trial_completed | listed | first_booking | quality_yellow | quality_red | suspended | terminated
  metadata     Json
  triggeredAt  DateTime @default(now()) @map("triggered_at")

  @@index([panditId, triggeredAt])
}
```

## Engineering tickets

- R-Q3-S-008a: onboarding flow + KYC validation
- R-Q3-S-008b: training video delivery (7-day automation)
- R-Q3-S-008c: quality monitoring + alert system
- R-Q3-S-008d: Razorpay batch payout cron
- R-Q3-S-008e: termination cascade workflow

## Closes

R-Q3-S-008 — spec shipped.
