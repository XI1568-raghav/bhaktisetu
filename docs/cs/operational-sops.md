<!-- TC-08 (P1, trust audit): the "verified pandit" adjective was removed from the
copy below. Nothing in the codebase promotes a Priest to verified: the only
production writer of Priest.verificationStatus is apps/api/src/routes/priest.ts,
which writes 'pending'; isVerified: true appears only in apps/api/prisma/seed.ts
and apps/api/scripts/seed-demo-users.ts. There is no credential upload, no
reference workflow, no probation review and no per-pandit trust score column, and
Priest.aadhaarVerified is read as a PAYOUT gate (apps/api/src/routes/providers.ts),
not as a published credential. This is markdown a human copies into a real
message, so there is nothing to gate it on: restore the wording by hand the day
apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING is true. -->

# Operational SOPs — Pandit / Video / Refund / Payout Issues

> Tier-2 ops runbook. Founder + CS contractor reference.

## SOP 1 — Pandit No-Show

**Trigger:** Booking time + 30 minutes, no pandit check-in. Booking marked as no-show.

### Step-by-step

1. **Immediate (within 30 min of scheduled time)**
   - System auto-notifies CS contractor + founder via Slack + SMS
   - Auto-call to pandit phone (3 attempts, 5 min apart)
   - If pandit unreachable → confirm no-show status

2. **Within 1 hour**
   - Apologetic call/WhatsApp to devotee from CS contractor
   - Script: "We're deeply sorry. [Pandit name] could not perform the puja today due to [reason]. We'd like to do one of:"
     - Option A: Re-book with another pandit within 24 hours (no extra charge)
     - Option B: Full refund within 5 business days (₹200 added as goodwill)
     - Option C: Reschedule to next available date with original pandit (if applicable)
   - Get devotee's choice in writing/WA

3. **Within 24 hours**
   - Execute chosen option
   - Pandit suspension review: 3+ no-shows in 30 days = automatic suspension
   - Document incident in pandit-incidents log
   - Update devotee in writing on resolution

4. **Post-incident**
   - Founder personally reviews if booking was high-value (>₹10K)
   - Wallet credit ₹500 issued as additional goodwill
   - 30-day follow-up call to ensure devotee returns to platform

### Founder responsibility

- Review weekly pandit-no-show report
- If pandit pattern: 2 no-shows in 60 days → temporary suspension + retraining
- 3 no-shows = permanent removal from network
- Public-facing pandit network has 99%+ reliability target

## SOP 2 — Video Proof Delayed (Beyond 48 Hours)

**Trigger:** Booking complete, 48 hours elapsed, no video uploaded.

### Step-by-step

1. **At 24-hour mark**
   - Auto-WhatsApp to pandit: "Reminder — video proof for booking BS-{ID} due in 24 hours"
   - Auto-email to devotee: "Your video is in production. Available within 24 hours."

2. **At 48-hour mark**
   - Auto-notify CS contractor + founder
   - Direct WhatsApp to pandit: "Critical — video for BS-{ID} 48hr overdue. Reply ASAP."
   - Apologetic email to devotee: "Video is taking longer than expected. We're following up with the pandit and will have it to you within 24 more hours."

3. **At 72-hour mark**
   - Founder personal call to pandit (escalation)
   - If video still not available: offer devotee partial refund (50%) or wallet credit ₹500
   - Document delay reason in pandit log

4. **Post-incident**
   - Pandit weighted reliability score penalized
   - If 3+ delays in 90 days: pandit removal from priority queue
   - Recurring delay pattern: founder review + retraining

### Common delay causes + handling

- **Video too large** → Provide pandit with compression guidance + cloud upload link
- **Pandit phone died** → One-time excuse, follow-up training
- **Family bereavement / health** → Compassionate exception, no penalty
- **Pandit forgot** → Performance review, warning
- **Tech difficulty** → Bhaktisetu sends recording device for next ceremonies

## SOP 3 — Refund Request

> **Correction 2026-09-02 (`OPS-10`).** Three lines in this SOP used to name **Stripe**
> as a live refund rail: the matrix row *"NRI chargeback (Stripe) | Force-refund per
> Stripe rules"*, step 3's *"process within 24 hours via Razorpay/Stripe original
> payment method"*, and the metric *"means our process matched Stripe/Razorpay would
> do"*. **Stripe was removed from the codebase on 2026-08-11** — every remaining
> mention in `apps/api/src` is a removal note (`lib/env.ts:45-46`,
> `services/payment.service.ts:2506-2517`, `routes/payments.ts:304`). Razorpay is the
> only live rail and it settles INR only, and no replacement international processor
> has been chosen. These were not cosmetic: an SOP is executed literally, and step 3
> instructed a CS contractor to open a dashboard that no longer receives our traffic —
> a refund routed at a dead rail is a refund that never reaches the devotee while the
> clock on the 24-hour target keeps running. The Stripe-specific chargeback procedure
> ("force-refund per Stripe rules") has no equivalent to substitute, so it is marked
> `[verify]` and escalated rather than replaced with a guessed process.

**Trigger:** Devotee requests refund (any reason, any timing).

### Refund matrix (per R-Q1-L-002 policy)

| Situation | Refund | Decision |
|---|---|---|
| Pandit no-show | 100% | Automatic |
| Video proof missing >7 days | 100% | Automatic |
| Tech failure (Bhaktisetu side) | 100% + ₹500 credit | Automatic |
| User cancels >24hr before puja | 100% | Automatic |
| User cancels 12-24hr before | 50% | Founder review |
| User cancels <12hr before | 0% | Founder discretion |
| User no-show on scheduled time | 0% | Founder discretion |
| User unhappy with puja quality | Mediated 50% | Founder personally calls |
| Booking date confusion (system bug) | 100% + free re-book | Automatic |
| NRI chargeback | [verify — Stripe was removed; the NRI rail is undecided] · escalate to founder | Bhaktisetu absorbs |

### Step-by-step

1. **Receive request** (email/WhatsApp/in-app)
2. **CS contractor classifies** per refund matrix
3. **If automatic refund**: process within 24 hours via Razorpay, back to the original payment method (Razorpay is the only live rail)
4. **If founder-review required**: escalate to founder within 4 hours, decision within 48 hours
5. **Communicate to devotee** in writing, with refund timeline (5-7 business days back to original card/bank)
6. **Document** in refunds log with reason classification

### Refund quality metric

- Target: <2% of bookings end in refund
- Target: 95% refunds processed within 5 business days
- Target: 0 chargeback-driven refunds (means our process matched what Razorpay would do)

## SOP 4 — Pandit Payout Dispute

**Trigger:** Pandit claims payout was incorrect (amount missing, late, wrong account).

### Step-by-step

1. **Pandit emails/WhatsApp dispute**
2. **CS contractor responds within 4 business hours**:
   - Pull payout report from Razorpay dashboard
   - Cross-reference with booking ledger
   - Identify discrepancy (if any)

3. **Diagnosis**:
   - **Wrong amount** → Audit calculation (commission split, deductions, tax). If error: re-pay correct amount within 48 hours
   - **Late payout** → Confirm Razorpay batch ran. If late: send manually via UPI same day + apology
   - **Wrong account** → Cross-reference bank details on file. If we used wrong account: refund pandit, debit incorrect recipient
   - **Missing payout** → Search by date range, booking ID, pandit ID. If not found: re-process within 24 hours

4. **Resolution communication**:
   - Clear written explanation of what happened
   - Confirmation of corrective action + timeline
   - Apology for any inconvenience
   - Optional: small goodwill bonus for major errors

5. **Documentation**:
   - Log dispute in payouts-incidents
   - If pattern emerges (same pandit recurring): pandit support + relationship rebuild

### Founder responsibility

- Weekly review of payout disputes
- If pattern across pandits: investigate Bhaktisetu side process error
- Target: <1% pandit-initiated payout disputes per month

## SOP 5 — Customer Escalation (any unresolved issue >24hr)

**Trigger:** Customer asks for "manager" / escalation / threatens platform criticism

### Step-by-step

1. **Acknowledge within 30 minutes**: "Your concern has been escalated to our founder Sunil. He will personally call you within 4 hours."
2. **Founder personal call within 4 hours**: listen first, empathize, then resolve
3. **Resolution within 48 hours**: refund, credit, re-booking, or apology + commitment
4. **Public recovery**: if customer publicly criticized (Twitter, Reddit, Google reviews), respond personally + privately ensure resolution
5. **Document**: classify reason, root cause, lesson for product/operations

### Founder-led escalation principle

Even at scale, founder personally responds to:
- Refund disputes >₹5K
- Public criticism on social media
- NRI customer issues (high-trust segment)
- Pandit complaints from temple admins
- Press inquiries

## SLA summary

| Metric | Target |
|---|---|
| Pandit no-show response | <1 hour |
| Video proof delay (48hr+) | Resolved within 72hr |
| Refund processing | 5-7 business days |
| Pandit payout dispute resolution | <48 hours |
| Founder escalation response | <4 hours |
| Public criticism response | <30 minutes |

## CS contractor training

All new CS contractors (per R-Q1-H-001 hire trigger) must:
- Read all 5 SOPs
- Shadow founder on 10 live customer interactions
- Pass written scenario test (10 scenarios) before solo response
- Founder personally approves first 100 cases solo-handled
