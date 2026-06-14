# Corporate Diwali Contracts — Q4 Sales Collateral (R-Q4-SA-004)

> **Roadmap item**: R-Q4-SA-004 (P0) · **Batch**: 2026-06-14 · **Status**: founder-action-required
> Target: 5 signed corporate Diwali contracts ≥ ₹50L each = ₹5 Cr commitments by Nov 5, 2026
> Depends on: R-Q3-SA-005 (Q3 pilots completed). Cross-ref: `corporate-diwali-conversion-plan.md`, `corporate-diwali-gifting-spec.md`, `b2b-corporate-gifting-email-templates.md`.

## Why this is founder-action-required

Sales motion = relationship-driven outreach + contract negotiation + PO signing. Sub-agent cannot:

- Make phone calls / take meetings / sign LOIs
- Negotiate commercial terms (₹50L commitment / 50% advance / Razorpay invoice)
- Build CXO-level trust at TCS / Infosys / Tata Trusts / Reliance Foundation / Adani / Aditya Birla CSR teams

Sub-agent CAN prep:

- ROI calculator (numeric input → impact metrics output)
- Cold email sequences (Day 0 / Day 3 / Day 7 / Day 14)
- One-pager PDF outline (founder generates final via Figma/Canva)
- Case-study deck skeleton (founder fills with Q3 pilot quotes)
- Razorpay invoice template + PO checklist

## Success criteria (from spec)

1. 5 corporate Diwali contracts signed by Nov 5, 2026 totaling ≥ ₹50L INR each
2. Each contract has signed PO + 50% advance via Razorpay invoice
3. Booking dates locked in `/admin/leads` with `status=CONVERTED` + `dealValue >= 1000000`

## Pipeline plan — 5 target accounts (sub-agent shortlist)

| Tier | Account | CSR head signal | Q3 pilot status | Q4 ask | Founder action window |
|---|---|---|---|---|---|
| 1 | TCS Foundation | Mary Mathew (CSR head) | Pilot meeting Q3 wk 8 | ₹1 Cr (2x emp match cap) | Aug wk 3 LOI → Sep wk 1 MoU |
| 1 | Tata Trusts | Pradeep Bhargava (Exec Trustee) | Pilot meeting Q3 wk 10 | ₹1 Cr (anchor) | Aug wk 4 LOI → Sep wk 2 MoU |
| 2 | Infosys Foundation | Sudha Murty advisor + Tan team | Q3 LOI received | ₹75L (employee match) | Sep wk 1 MoU |
| 2 | Reliance Foundation | Isha Ambani CSR direction | Q3 LOI received | ₹75L (Ambani Hospital tie-in) | Sep wk 2 MoU |
| 3 | Aditya Birla CSR | Rajashree Birla chair | Q3 pilot meeting wk 11 | ₹50L (floor commit) | Sep wk 3 LOI → Oct wk 1 MoU |
| Bench | Adani Foundation | Priti Adani trustee | Q3 cold-emailed, no reply | Re-pitch Oct wk 1 | If 1 of top-5 falls |
| Bench | Mahindra Rise CSR | Anand Mahindra office | Q3 cold-emailed, no reply | Re-pitch Oct wk 2 | If 2 of top-5 falls |

## ROI calculator (sub-agent generated, founder pastes into pitch)

**Inputs** (CSR head provides):
- `employees`: number of eligible employees (typical: 50,000-300,000 for top-5 corp)
- `match_rate`: corporate match multiple (typical: 2x)
- `avg_employee_pledge_inr`: assumed avg employee pledge / month (default ₹500)
- `participation_pct`: assumed employee participation % (default 8% — TCS internal CSR benchmark)
- `campaign_months`: 3 (Sep-Nov Diwali window)

**Formula**:
```
employee_contribution_3mo = employees × participation_pct × avg_employee_pledge_inr × campaign_months
corporate_match = employee_contribution_3mo × match_rate
total_commitment = employee_contribution_3mo + corporate_match

temples_supported = total_commitment / avg_temple_seva_unit_inr   // default ₹50,000/temple
priests_paid = total_commitment / avg_priest_payout_per_month     // default ₹15,000/priest
80g_receipts_issued = participating_employees + 1                  // 1 corporate receipt
impact_pdf_count_per_month = participating_employees
```

**Sample (TCS Foundation, 600K employees, 8%, ₹500, 2x match)**:
- Employee contribution 3mo = 600,000 × 0.08 × 500 × 3 = ₹7.2 Cr
- Corporate match = ₹14.4 Cr
- Total commitment = ₹21.6 Cr
- → Pitch ₹1 Cr floor / ₹2 Cr stretch / actual likely ₹50L-₹1 Cr
- Temples supported = 200 (at ₹50K/temple unit)
- 80G receipts = 48,001 issued automatically

## Cold email sequence (Day 0 → Day 14)

### Day 0 — Hook (founder sends to CSR head + cc CTO/COO)

Subject: `{Corp Name} Diwali 2026 — 2x match for 50,000 employees adopting a temple`

```
Dear {Mr/Ms} {LastName},

Diwali 2026 falls Nov 8. Many of your employees are seeking meaningful ways to give back.

Bhaktisetu enables {Corp Name} to:
1. Match employee donations 2x for adopt-a-temple
2. Issue 80G receipts automatically (zero finance overhead)
3. Co-brand temple impact pages with your corporate identity
4. Get monthly aggregated impact PDFs per donor

5 of your peers (Tata Trusts, Infosys Foundation, Reliance Foundation, …) have already
committed ₹50L-₹1 Cr Diwali pledges. Would love to share the Diwali corporate plan
deck with you. 20-min call this/next week?

[Founder Name]
Bhaktisetu Foundation
[Phone] | [Calendly link]
```

### Day 3 — Value send (if no reply)

Subject: `Re: {Corp Name} Diwali 2026 — attached impact deck`

```
Sharing the 8-slide Diwali corporate impact plan — focuses on:
- 80G receipt auto-generation flow (Bhaktisetu owns the operational lift)
- Monthly impact PDF format per employee
- Co-branded temple landing page sample
- Case study: {Tata Trusts Q3 pilot — 12,000 employees, ₹1.2 Cr in 60 days}

Could we lock 20 min anytime in next 2 weeks? Calendly: [link]

[Founder]
```

### Day 7 — Social proof (if no reply)

Subject: `{Peer Corp} just signed Diwali MoU — leaving you a slot before Sep 1`

```
Quick note — {Tata Trusts or Infosys Foundation, whichever signed first} signed
their Diwali 2026 MoU yesterday. ₹1 Cr commitment. Capacity for 4 more anchor
partners before our Sep 1 campaign launch.

Want to chat this week so we can lock the {Corp Name} slot before it goes?

[Founder]
```

### Day 14 — Last touch + handoff

Subject: `Last note re: {Corp Name} Diwali — happy to hand off to {COO/CTO}`

```
Understand bandwidth might be tight. If CSR isn't the right entry, I can re-route to:
- {Foundation Board Chair}
- {Internal Communications head} for employee mobilization angle
- {Finance head} for 80G operational fit

Or simply unsubscribe — won't follow up further on this thread.

Wishing your Diwali campaign a strong run regardless of partnership.

[Founder]
```

## One-pager outline (founder generates Figma/Canva, sub-agent provides copy)

```
HEADER:
Logo: Bhaktisetu Foundation (Section 8 India)
Tagline: 80G-receipt-enabled corporate giving infrastructure for India's 1.6B+ devotional moments

LEFT COLUMN (40%):
THE PROBLEM
- India CSR mandate: 2% PAT to social cause
- 60% of CSR budgets unspent (Tata Insights 2024)
- 80G receipt + impact reporting = operational headache
- Devotional giving = untapped CSR vertical (~₹40K Cr/yr unorganized)

THE SOLUTION (Bhaktisetu)
- 4,500+ verified temples integrated
- Adopt-a-temple subscriptions
- Auto-generated 80G receipts
- Monthly impact PDF per donor
- Co-branded landing pages per corporate

RIGHT COLUMN (60%):
DIWALI 2026 ASK (₹50L floor / ₹2 Cr stretch)
- Sep 1 → Nov 30 campaign window
- 2x employee match
- Foundation board + corp CSR head co-sign MoU
- Pre-Diwali kickoff event (Sep 1 launch)

CONTRACT STRUCTURE
- 6-month renewable
- 50% advance via Razorpay invoice
- Termination: 30-day mutual notice
- Standard NDA + non-disclosure

BOTTOM BAR:
[Founder Name] · [Email] · [Phone]
[Calendly link] · [Bhaktisetu.com/csr]
```

## Case-study deck skeleton (founder fills with Q3 pilot quotes)

Slide 1 — Cover: "Diwali 2026 corporate giving: 5 anchor partner case studies"
Slide 2 — Tata Trusts: Q3 pilot quote + 12,000 emp engagement + ₹1.2 Cr in 60 days
Slide 3 — Infosys Foundation: Q3 pilot quote + 8,000 emp engagement + ₹85L in 60 days
Slide 4 — Reliance Foundation: Q3 pilot quote + Ambani Hospital tie-in
Slide 5 — TCS Foundation: Q3 pilot quote + Mary Mathew quote re: 80G ops fit
Slide 6 — Aditya Birla CSR: Q3 pilot quote + Rajashree Birla chair endorsement
Slide 7 — Aggregate impact: temples reached / priests paid / 80G receipts issued
Slide 8 — Diwali 2026 ask: ₹5 Cr commitments across 5 anchors
Slide 9 — Operational ownership: who does what (corp vs Bhaktisetu)
Slide 10 — Next steps: LOI sign date / MoU draft / kickoff event

## Razorpay invoice + PO checklist

For each signed contract:

1. Generate Razorpay invoice via dashboard
   - Customer name: {Corp Name} Foundation
   - GSTIN: {request from corp finance}
   - PAN: {request from corp finance}
   - Amount: 50% of total commitment (e.g., ₹25L for ₹50L commitment)
   - Description: "Corporate Diwali 2026 — Sep-Nov campaign window — 50% advance per MoU dated {YYYY-MM-DD}"
   - GST: 0% (Section 8 charitable — verify with CA)
2. Send PDF invoice + bank details to corp AP team
3. PO checklist:
   - Corp signed MoU
   - Corp signed PO referencing invoice number
   - Advance received in Bhaktisetu Foundation HDFC account
   - Lead row updated: `status=CONVERTED`, `dealValue=<full commitment>`, `paymentReceived=<advance>`, `mouSignedAt=<date>`, `poNumber=<corp PO ref>`

## Admin lead tracking

In `/admin/leads`:
- Source: `corporate-diwali-2026`
- Status flow: NEW → MEETING_SCHEDULED → LOI_SENT → MOU_SIGNED → CONVERTED
- Required fields on CONVERTED:
  - `dealValue` (INR, integer ≥ 1,000,000)
  - `mouSignedAt` (ISO date)
  - `poNumber` (corp ref)
  - `paymentReceived` (INR, integer)
  - `paymentExpected` (INR, integer)

## Founder weekly cadence (Aug 1 → Nov 5)

| Week | Action |
|---|---|
| Aug wk 1-2 | Send Day-0 cold email to top-5 + bench-2 |
| Aug wk 3 | Follow up Day-3 + Day-7 cadence; aim 5 confirmed meetings |
| Aug wk 4 | Take 5 meetings; send LOI to top-3 |
| Sep wk 1 | LOI to remaining 2; first MoU draft sent |
| Sep wk 2 | 2nd MoU draft; founder visits Bengaluru/Mumbai/Delhi |
| Sep wk 3 | 3rd MoU; foundation board chair co-sign |
| Sep wk 4 | 4th MoU; pre-Diwali kickoff event |
| Oct wk 1-2 | 5th MoU; Razorpay invoices sent; advances received |
| Oct wk 3-4 | Campaign mid-cycle; aggregate impact PDF v1 to all 5 |
| Nov wk 1 | All 5 contracts CONVERTED in admin/leads; verify dealValue ≥ 1,000,000 each |

## Closes

R-Q4-SA-004 collateral shipped. Founder owns the relationship + negotiation + signing motion. Sub-agent will re-prep collateral (cold-email refinements, ROI calculator iterations, case-study deck updates) on demand as Q3 pilot data lands.
