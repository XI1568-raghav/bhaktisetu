# Priest Contract Template — Bhaktisetu Foundation × Pandit Agreement (v1)

> **Roadmap item**: R-Q1-L-003 (P2) · **Authored**: 2026-06-14 · **Status**: Q1 v1 template — pending counsel review (R-Q1-L-002 lawyer engagement bundle)
> **Engineering source-of-truth**. Founder distributes via DocuSign/NotaryLive after counsel sign-off. Bundled review w/ R-Q1-L-002 refund policy v2.
> **DPDP basis**: §8(3) lawful purpose (service delivery) + §8(10) grievance officer disclosure. Cite actual sections — never §5(8).
> **Companion spec**: `docs/legal/priest-contract-template-q1-spec.md` (Q1 spec) · `docs/legal/priest-contract-template-100-pandits.md` (Q2 100-pandit expansion).

---

## Header tokens (founder fills before send)

| Token | Source | Example |
|---|---|---|
| `{{CIN}}` | Bhaktisetu Foundation Section 8 CIN | `U85300KA2026NPL000000` (TBD per registrar) |
| `{{FOUNDATION_ADDRESS}}` | Registered office | `Bengaluru, Karnataka, India` |
| `{{GRIEVANCE_OFFICER_NAME}}` | DPDP §8(10) GO | `[VERIFY-FOUNDER]` |
| `{{GRIEVANCE_OFFICER_EMAIL}}` | DPDP §8(10) GO contact | `grievance@bhaktisetu.org` |
| `{{COUNSEL_FIRM}}` | Reviewing law firm | `[VERIFY-FOUNDER]` post R-Q1-L-002 |
| `{{EFFECTIVE_DATE}}` | Per-pandit signing date | filled at DocuSign |
| `{{PANDIT_NAME}}` | Per-pandit | filled at DocuSign |
| `{{PANDIT_PAN}}` | Per-pandit | filled at DocuSign |
| `{{PANDIT_AADHAAR_LAST4}}` | Per-pandit (masked, last 4 only) | filled at DocuSign <!-- LAST 4 DIGITS ONLY. NEVER paste full 12-digit Aadhaar here. --> |
| `{{PANDIT_BANK_ACCOUNT}}` | Per-pandit | filled at DocuSign |
| `{{PANDIT_ADDRESS}}` | Per-pandit | filled at DocuSign |
| `{{PANDIT_PARENT_NAME}}` | Per-pandit | filled at DocuSign |

---

## TEMPLATE BODY (verbatim — sign as-is)

```
BHAKTISETU FOUNDATION × PANDIT AGREEMENT
Standard Template v1 — Q1 2026

PARTIES:
  Bhaktisetu Foundation, a Section 8 non-profit company incorporated under
  the Companies Act 2013, having CIN {{CIN}} and registered office at
  {{FOUNDATION_ADDRESS}} ("Bhaktisetu" / "Platform" / "Foundation").

  AND

  {{PANDIT_NAME}}, son/daughter of {{PANDIT_PARENT_NAME}},
  holding PAN {{PANDIT_PAN}} and Aadhaar ending {{PANDIT_AADHAAR_LAST4}},
  residing at {{PANDIT_ADDRESS}} ("Pandit").

EFFECTIVE DATE: {{EFFECTIVE_DATE}}

RECITALS:
  A. Bhaktisetu operates a devotional super-app (darshya.online) enabling
     devotees to book pujas, receive video proof of completion, and obtain
     80G receipts where applicable.
  B. Pandit is a qualified Hindu priest willing to perform pujas booked
     through the Platform.
  C. Parties wish to record terms on which Pandit performs pujas and
     receives payment.

NOW THEREFORE, the parties agree as follows:

═══════════════════════════════════════════════════════════════════
1. ENGAGEMENT (Independent Contractor)
═══════════════════════════════════════════════════════════════════

1.1  Pandit is engaged as an independent contractor and not as an
     employee, agent, partner, or joint-venturer of Bhaktisetu. Nothing
     in this Agreement creates an employment, agency, partnership, or
     fiduciary relationship.

1.2  Pandit will be listed on the Platform as a "Verified Pandit" upon
     completion of KYC (Section 4) and onboarding video proof submission.

1.3  Platform schedules bookings; Pandit performs pujas at the time, date,
     and per the ritual specifications set out at booking.

1.4  NO EXCLUSIVITY. Pandit is free to provide priestly services outside
     Bhaktisetu, including via competing platforms, temples, or directly
     to devotees, provided such services do not breach Sections 5
     (Confidentiality), 6 (Non-Solicitation), or 9 (IP).

═══════════════════════════════════════════════════════════════════
2. REVENUE SHARE + PAYOUT TERMS
═══════════════════════════════════════════════════════════════════

2.1  Devotee pays Bhaktisetu directly through the Platform. Bhaktisetu
     collects, holds, and remits Pandit's share per this Section 2.

2.2  Platform commission: 20% to 40% of devotee payment per puja,
     determined per puja type and listed in Schedule A.
     Pandit retains 60% to 80% of devotee payment per puja, before
     payment-processor and statutory deductions.

2.3  Deductions from Pandit share before payout:
     (a) Payment processor fees (Razorpay — actuals)
     (b) TDS under Section 194C/194J of Income Tax Act 1961 as applicable
     (c) GST setoffs where applicable
     (d) Any refund issued under Section 7 (Cancellation) below

2.4  PAYOUT GATING (AADHAAR + VIDEO PROOF — MANDATORY):
     Pandit payout for any puja is ELIGIBLE only when ALL of the
     following are satisfied:
       (a) Aadhaar verification status = VERIFIED in Platform records
           (verified via UIDAI offline-XML or DigiLocker — Section 4.2);
       (b) Video proof of puja performance has been uploaded by Pandit
           within seventy-two (72) hours of scheduled completion
           (Section 3); AND
       (c) Booking status = COMPLETED (no active dispute, no devotee
           refund in progress).
     ANY of (a), (b), (c) failing = payout WITHHELD until cured. If not
     cured within thirty (30) days of original scheduled date, payout is
     FORFEITED and refunded to devotee per the refund policy in force.

2.5  Payout schedule: Weekly batch via Razorpay payouts, on Mondays,
     covering all eligible payouts accrued by the preceding Sunday 23:59
     IST. Minimum batch threshold: ₹100. Sub-threshold amounts roll
     forward to the next batch.

2.6  Annual TDS Form 16A issued by Bhaktisetu to Pandit by 30 June each
     financial year covering preceding FY April-March.

2.7  Pandit is solely responsible for income tax, GST registration (if
     turnover exceeds threshold under CGST Act 2017), and all other
     statutory filings on the income received under this Agreement.

═══════════════════════════════════════════════════════════════════
3. VIDEO PROOF (BUSINESS RULE #1 — MANDATORY)
═══════════════════════════════════════════════════════════════════

3.1  For every puja booked through the Platform, Pandit MUST upload
     video proof of puja performance within seventy-two (72) hours of
     scheduled completion. This is a mandatory contractual obligation.

3.2  Video specifications (minimum):
     (a) Duration: at least three (3) continuous minutes covering
         principal sankalpa, deity invocation, and aarti/aaranthi;
     (b) Resolution: at least 720p;
     (c) Audio: clear, ambient sound capturing mantra recitation;
     (d) Format: MP4 (H.264) — Platform will reject other formats;
     (e) Watermark/timestamp: as auto-applied by Platform upload module.

3.3  Failure modes:
     (a) Video not uploaded within 72h → payout for that puja
         WITHHELD until uploaded. After thirty (30) days no upload
         → payout FORFEITED (Section 2.4(b)) and Pandit warned.
     (b) Three (3) or more missing/late videos in any rolling 30-day
         window → suspension review per Section 8.

3.4  Devotee may view video proof for the booking under their account.
     Pandit retains no rights in the video; copyright assigned to
     Bhaktisetu per Section 9 (IP).

═══════════════════════════════════════════════════════════════════
4. KYC + AADHAAR GATE (BUSINESS RULE #4 — MANDATORY)
═══════════════════════════════════════════════════════════════════

4.1  Pandit must submit the following before being eligible for ANY
     payout (Section 2.4(a)):
     (a) Aadhaar — VERIFIED via UIDAI offline e-KYC XML or DigiLocker
         pull. PHYSICAL Aadhaar copies WILL NOT BE ACCEPTED. Only the
         last 4 digits are stored on Platform per UIDAI mandate.
     (b) PAN card — for TDS Form 16A and 194C/194J compliance.
     (c) Bank account proof — cancelled cheque OR bank statement with
         account number and IFSC visible.
     (d) Two reference video proofs of prior puja performance (used
         for ritual-quality baseline review by Platform).

4.2  Aadhaar verification flow:
     (a) Pandit initiates DigiLocker pull from Platform onboarding flow;
     (b) Platform receives signed Aadhaar XML directly from UIDAI;
     (c) Platform stores only last 4 digits + verification hash. Full
         Aadhaar number NEVER persisted to Platform database;
     (d) Verification status = VERIFIED only upon UIDAI signature
         validation success.

4.3  Re-verification: Pandit will be required to re-verify Aadhaar on
     change of name, address, or every twenty-four (24) months,
     whichever earlier.

4.4  Aadhaar masking: All Platform-facing surfaces (admin panel,
     payout reports, devotee receipts) display Aadhaar last 4 digits
     only, prefixed by `XXXX-XXXX-`.

═══════════════════════════════════════════════════════════════════
5. CONFIDENTIALITY + DATA HANDLING (DPDP COMPLIANT)
═══════════════════════════════════════════════════════════════════

5.1  Pandit will receive limited devotee personal data strictly necessary
     for puja performance, specifically: devotee name, gotra, sankalpa
     details, deity, and puja date/time. Devotee phone, email, address,
     payment details, and booking history are NOT shared with Pandit.

5.2  Pandit shall:
     (a) Use such devotee data SOLELY for performing the booked puja;
     (b) NOT contact the devotee outside the Platform;
     (c) NOT share, sell, or publish devotee data to any third party;
     (d) Delete or destroy local notes containing devotee data within
         seven (7) days of puja completion;
     (e) Promptly report any data breach to Bhaktisetu Grievance Officer
         at {{GRIEVANCE_OFFICER_EMAIL}} per DPDP Act §8(6) requirements.

5.3  Grievance Officer designation under DPDP Act §8(10): the
     Foundation's Grievance Officer is {{GRIEVANCE_OFFICER_NAME}},
     contactable at {{GRIEVANCE_OFFICER_EMAIL}}. Pandit may raise
     personal data grievances here within statutory timelines.

5.4  This Section 5 survives termination of this Agreement.

═══════════════════════════════════════════════════════════════════
6. NON-SOLICITATION
═══════════════════════════════════════════════════════════════════

6.1  During the term and for twelve (12) months after termination,
     Pandit shall NOT directly or indirectly solicit any Platform
     devotee whose contact details were obtained through the Platform,
     for any priestly services to be performed outside the Platform.

6.2  This Section 6 does NOT restrict Pandit from serving devotees who
     independently contact Pandit through channels unrelated to the
     Platform.

> **LAWYER REVIEW NEEDED** (per triage 2026-06-15): §6 non-solicit
> 12-month window may be unenforceable under Indian Contract Act for
> independent contractors — Indian courts often strike non-solicit
> clauses >6 months on post-termination contractor agreements.
> Counsel to reduce window to 6 months OR reframe as a confidentiality
> + consultancy clause carved out from the post-term restraint.

═══════════════════════════════════════════════════════════════════
7. CANCELLATION + NO-SHOW (BUSINESS RULE #5 — 24h WINDOW)
═══════════════════════════════════════════════════════════════════

7.1  Devotee may cancel any confirmed puja booking up to twenty-four
     (24) hours before scheduled puja start time and receive full
     refund per the Bhaktisetu refund policy in force.

7.2  Pandit obligations:
     (a) Pandit MUST perform the puja at the scheduled date/time
         when booking remains active (i.e., not cancelled by devotee
         per Section 7.1);
     (b) If Pandit cannot perform a booked puja, Pandit MUST notify
         Platform at least seventy-two (72) hours before scheduled
         time so Platform can reassign or refund;
     (c) No-show without 24h advance notice = devotee full refund +
         Pandit deduction of 100% of puja value from next scheduled
         payout (Section 2.3(d)) + warning logged.
     (d) Two (2) or more no-shows in any rolling 60-day window =
         suspension review per Section 8.

7.3  Force majeure: Pandit no-show due to documented illness, family
     bereavement, government order, natural calamity, or other event
     beyond Pandit's reasonable control will not attract Section
     7.2(c) deduction provided Pandit notifies Platform within
     twenty-four (24) hours of the event and provides reasonable
     proof on request.

═══════════════════════════════════════════════════════════════════
8. SUSPENSION + TERMINATION
═══════════════════════════════════════════════════════════════════

8.1  Either party may terminate this Agreement by thirty (30) days'
     written notice (email to registered IDs sufficient).

8.2  Bhaktisetu may terminate IMMEDIATELY for cause, without notice,
     for any of:
     (a) Fabricated video proof (e.g., reused footage, stock video);
     (b) Three (3) or more no-shows under Section 7.2(d);
     (c) Three (3) or more missing/late videos under Section 3.3(b);
     (d) Devotee data leak, off-Platform solicitation (Section 6), or
         confidentiality breach (Section 5);
     (e) Aadhaar de-verification by UIDAI;
     (f) Conviction of any offence involving moral turpitude;
     (g) Use of Platform for fraud, money laundering, or any unlawful
         purpose.

8.3  Suspension (interim): Bhaktisetu may suspend Pandit's listing for
     up to thirty (30) days pending investigation of any Section 8.2
     ground. Suspension freezes new bookings; in-flight bookings either
     completed or refunded at Bhaktisetu discretion.

8.4  On termination (any cause):
     (a) Outstanding eligible payouts settled within thirty (30) days
         per Section 2 mechanics;
     (b) Forfeited payouts (Section 2.4) refunded to devotees;
     (c) Pandit removed from Platform listing immediately;
     (d) Sections 5 (Confidentiality), 6 (Non-Solicitation), 9 (IP),
         10 (Disputes) survive.

═══════════════════════════════════════════════════════════════════
9. INTELLECTUAL PROPERTY
═══════════════════════════════════════════════════════════════════

9.1  Pandit hereby assigns to Bhaktisetu all copyright and related
     rights in: (a) video proofs uploaded under Section 3;
     (b) any photographs, audio recordings, and likeness captured
     during puja performance for Platform use; (c) any written ritual
     summaries provided to devotees through the Platform.

9.2  Pandit retains all rights in: (a) Pandit's own personal name and
     reputation; (b) traditional Sanskrit mantras and ritual procedures
     which are public-domain religious heritage.

9.3  Bhaktisetu grants Pandit a non-exclusive licence to use Pandit's
     own video proofs for portfolio/reference purposes outside the
     Platform, provided devotee-identifying portions are masked.

═══════════════════════════════════════════════════════════════════
10. DISPUTE RESOLUTION + GOVERNING LAW
═══════════════════════════════════════════════════════════════════

10.1 Disputes arising out of or in connection with this Agreement
     shall first be attempted to be resolved through good-faith
     discussion within forty-eight (48) hours of notice, mediated by
     Bhaktisetu founder or designate.

10.2 If unresolved within seven (7) days, disputes shall be referred
     to a sole arbitrator appointed mutually under the Arbitration and
     Conciliation Act 1996. Seat and venue: Bengaluru, Karnataka.
     Language: English. Award binding.

10.3 Notwithstanding 10.2, either party may seek urgent injunctive
     relief from courts at Bengaluru for breach of Sections 5, 6, or 9.

10.4 Governing law: Laws of India.

10.5 Exclusive jurisdiction (subject to 10.2): Courts at Bengaluru,
     Karnataka.

═══════════════════════════════════════════════════════════════════
11. NDA (MUTUAL)
═══════════════════════════════════════════════════════════════════

11.1 Each party shall keep confidential all non-public business
     information of the other (including, in Bhaktisetu's case,
     commission rates, platform analytics, devotee data; in Pandit's
     case, KYC details) and use such information solely for
     performance under this Agreement.

11.2 Permitted disclosures: (a) to professional advisers under their
     own confidentiality duty; (b) as required by applicable law,
     court order, or regulator; (c) with the other party's prior
     written consent.

11.3 This Section 11 survives termination for three (3) years.

═══════════════════════════════════════════════════════════════════
12. GENERAL
═══════════════════════════════════════════════════════════════════

12.1 Entire agreement: This Agreement (incl. Schedule A) constitutes
     the entire agreement between the parties and supersedes all prior
     understandings.

12.2 Amendment: Only in writing signed by both parties.

12.3 Severability: If any clause is unenforceable, remainder stands.

12.4 No assignment by Pandit without Bhaktisetu's written consent.

12.5 Notices: by email to addresses on file. Effective on send.

12.6 Counterparts + electronic signature: DocuSign / Aadhaar e-sign
     / NotaryLive all valid execution methods per IT Act 2000 §3A
     and §10A.

═══════════════════════════════════════════════════════════════════

SCHEDULE A — PUJA-TYPE COMMISSION GRID (illustrative; founder updates)

  Puja type                          Devotee price  Pandit share  Platform share
  ---------------------------------- -------------- ------------- --------------
  Satyanarayan Katha (Standard)      ₹1,500         ₹1,200 (80%)  ₹300 (20%)
  Rudrabhishek (Standard)            ₹2,500         ₹1,875 (75%)  ₹625 (25%)
  Lakshmi Puja (Diwali)              ₹3,000         ₹2,100 (70%)  ₹900 (30%)
  Griha Pravesh (full)               ₹5,000         ₹3,250 (65%)  ₹1,750 (35%)
  Shraadh / Pitra Paksh (full)       ₹3,500         ₹2,275 (65%)  ₹1,225 (35%)
  NRI premium tier (any puja)        9-10x domestic 60% of NRI    40% of NRI

  Note: NRI 40% share covers higher international processor fees
  ([verify] — corrected 2026-09-02 under `OPS-10`; verified in `apps/api/src/lib/env.ts:45-46` and `payment.service.ts:2506-2517`;
  the Stripe rail was removed 2026-08-11 and no replacement processor is
  recorded, so this differential is unsubstantiated as written), USD-INR FX
  spread, dual-currency 80G receipt issuance, and overseas-grievance
  handling overhead.

═══════════════════════════════════════════════════════════════════

SIGNED:

  For Bhaktisetu Foundation:
    Name:  __________________________
    Title: __________________________
    Date:  __________________________

  Pandit:
    Name:  {{PANDIT_NAME}}
    Date:  __________________________
    Aadhaar last 4: XXXX-XXXX-{{PANDIT_AADHAAR_LAST4}}
```

---

## Counsel review checklist (R-Q1-L-002 bundle)

- [ ] Section 8 company structure compatible w/ for-profit pandit payouts (TBD per CA opinion)
- [ ] TDS 194C vs 194J classification per puja type
- [ ] DPDP Act §8(3) lawful purpose adequately stated in Section 5
- [ ] DPDP Act §8(10) Grievance Officer disclosure compliant
- [ ] Arbitration seat Bengaluru — confirm vs founder preference
- [ ] IT Act 2000 §3A + §10A e-signature validity confirmed for DocuSign + Aadhaar e-sign
- [ ] Non-solicit 12-month duration enforceable per Karnataka jurisprudence
- [ ] IP assignment under Section 9 not over-broad re traditional mantras
- [ ] Schedule A commission ranges within Foundation governance constraints
- [ ] Independent contractor framing robust against PF/ESI re-characterisation risk

## Founder distribution plan (post-counsel-sign-off)

| Step | Owner | Target |
|---|---|---|
| Counsel review + redline | Founder + {{COUNSEL_FIRM}} | Q1 by week 10 |
| DocuSign template upload + variable mapping | Founder | Q1 week 11 |
| Distribute to 50+ existing pandits | Founder | Q1 week 12 |
| 14-day signing window | Pandits | Q1 week 13 |
| 80%+ signed-back rate target → Q2 ramp (R-Q2-L-002) | Founder | Q2 week 1 |

## KPI signal

Manual KPI flips to 1 when:
- `docs/legal/priest-contract-template.md` exists (this file) ✓
- Contains Aadhaar gate clause (Section 4 — verified above) ✓
- Contains payout terms section (Section 2 — verified above) ✓
- Contains 24h cancellation clause (Section 7.1 — verified above) ✓
- Video proof mandatory clause (Section 3 — verified above) ✓

## Closes

R-Q1-L-003 — Q1 v1 priest contract template shipped. Bundles with R-Q1-L-002 lawyer engagement for counsel review. Q2 expands per R-Q2-L-002 100-pandit signing pipeline.

---

**Founder action required**:
1. Bundle this template w/ R-Q1-L-002 refund policy v2 for single counsel review pass (~₹30-50K Q1 budget).
2. Fill `{{CIN}}` + `{{FOUNDATION_ADDRESS}}` + `{{GRIEVANCE_OFFICER_NAME}}` + `{{COUNSEL_FIRM}}` header tokens once Section 8 registration + counsel engagement complete.
3. Upload to DocuSign as reusable template w/ per-pandit variable fields mapped.
4. Cannot mark roadmap item `shipped` until counsel sign-off (KPI success criteria #3 — lawyer review).

Status stays **in_progress** at roadmap level until lawyer-reviewed signed-off version replaces v1.
