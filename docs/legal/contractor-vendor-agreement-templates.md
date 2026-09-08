# Contractor + Vendor Agreement Templates — 5 Core Docs

> # ⚠ PENDING OWNER SIGN-OFF — DO NOT SIGN OR SEND (Doc 4 / DPA)
>
> **Added 2026-09-08 (`OPS-10`).** Doc 4 below contains a **Data Processing Addendum**.
> A data-residency line in an executed vendor agreement is a **warranty** — the clause a
> counterparty quotes back when something goes wrong. This template previously warranted
> *“Data residency: India primary, Singapore standby”*. Neither half has ever been true.
>
> An automated correction pass on 2026-09-02 replaced that line with a
> verify-before-signing gate. **Changing what this company warrants to a counterparty is
> not a documentation edit, and that change has not been reviewed or approved by the
> owner. Until it is, the surrounding text is provisional and nothing here may be signed
> or sent to a vendor.**
>
> **What the infrastructure actually is** (read out of the repository 2026-09-08; every
> line here is checkable):
>
> | Layer | Reality | Evidence |
> |---|---|---|
> | Web tier | Render Docker service `darshya-web`, region **`oregon`** (US West) | `render.yaml:52-60` |
> | API tier | Render service `bhaktisetu`, region **`oregon`** (US West) | `render.yaml:10-22` |
> | India-hosted server | **None.** There has never been a Render Mumbai region for this product | `render.yaml:15`, `:56` |
> | Standby / failover region | **None** in any geography | `docs/runbooks/disaster-recovery.md` |
> | Read replica | **None.** One Supabase Postgres instance | `docs/runbooks/disaster-recovery.md` |
> | Database region | **Not recorded anywhere in this repository** — `[verify]` in the Supabase dashboard | — |
> | Cloudflare | DNS + edge proxy only; not a hosting layer since 2026-07-08 | `cf-kill-zombie.yml` |
> | Payment processor | Razorpay only; the Stripe rail was removed 2026-08-11 | `apps/api/src/lib/env.ts:45-46` |
>
> **What the owner must decide before this document is used:**
>
> 1. Read the Supabase project region from the dashboard and write it in, replacing every
>    `[verify]`. Do not fill it in from memory — that is how “Mumbai” got here.
> 2. Decide whether to state the true residency (personal data is processed **outside
>    India**, on US-West infrastructure) or to move the infrastructure before the document
>    is used. Those are different commercial decisions and only the owner can take either.
> 3. Confirm the corrected text with counsel before any signature, publication or filing.


> Foundation for hiring + vendor management post pre-seed. Counsel-finalize before signing.

## Doc 1 — Contractor Services Agreement (CS-ops + Content + iOS engineer)

```
CONTRACTOR SERVICES AGREEMENT

PARTIES
- Bhaktisetu Foundation (CIN: [CIN])
- [Contractor name], PAN: [PAN]

ENGAGEMENT
- Role: [CS Lead / Content Ops / iOS Engineer / Full-stack]
- Hours: [20-40] hrs/week
- Duration: Initial 3-month + auto-renew unless 30-day notice
- Location: Remote (preferred Bengaluru/Mumbai for periodic in-person)

COMPENSATION
- Monthly retainer: ₹[40K-120K]
- Performance bonus: Up to 20% of retainer based on quarterly review
- ESOP: 0.1-0.5% subject to 1-year vesting
- Payment: Razorpay/UPI on 1st of each month
- TDS: 10% deducted per Section 194J

DELIVERABLES (specific per role)
- CS Lead: T1+T2 support, SLA compliance per R-Q2-CS-004
- Content: Daily content cadence per R-Q1-M-009
- iOS Engineer: TestFlight + App Store submission per R-Q3-E-002

CONFIDENTIALITY
- All customer data, financial info, strategy considered confidential
- 5-year post-engagement confidentiality
- No sharing with competitors, no public disclosure
- Breach triggers immediate termination + damages

INTELLECTUAL PROPERTY
- All work-product belongs to Bhaktisetu Foundation
- Pre-existing contractor IP excluded from this assignment
- Open-source contributions require pre-approval

TERMINATION
- Either party: 30-day written notice
- For cause (negligence/breach): immediate termination
- Outstanding payment due within 30 days post-termination

EQUIPMENT
- Contractor uses own laptop + phone (BYOD)
- Bhaktisetu provides software licences, cloud access, design tools

NON-COMPETE
- Cannot work for direct competitor (Sri Mandir, Utsav, VAMA, AstroSage) during engagement
- 6-month post-engagement non-compete (limited geographic scope per Indian law)

DISPUTE RESOLUTION
- Internal mediation first (founder-led)
- Bengaluru jurisdiction
- Indian law governs

SIGNED:
Contractor: ___________
Bhaktisetu: ___________
Date: ___________
```

## Doc 2 — Pandit Network Agreement (per R-Q2-L-002 enhanced)

```
PANDIT-BHAKTISETU SERVICES AGREEMENT

PARTIES
- Bhaktisetu Foundation
- [Pandit name], PAN, Aadhaar last-4

ENGAGEMENT
- Pandit listed in verified Bhaktisetu pandit network
- Performs pujas as accepted from platform
- No exclusivity — can serve outside Bhaktisetu

REVENUE SHARE
- Devotee payment 100% (less Razorpay fees ~2%)
- Pandit gets 70-80% of net (per puja type, listed in Schedule A)
- Bhaktisetu retains 20-30%
- Weekly Razorpay batch payout (₹100 min threshold)

KYC + VERIFICATION
- Aadhaar verification (submitted at onboarding)
- PAN + bank account proof
- 2 reference video proofs of past pujas
- Minimum 5 years documented experience
- Sanskrit/Hindi proficiency certified

VIDEO PROOF (CRITICAL)
- Mandatory upload within 24 hours of puja completion
- Failure to upload: no payout for that puja + warning
- 3 missed video uploads in 30 days: suspension review

PANDIT CONDUCT
- Conduct pujas with proper Vedic ritual + respect
- Maintain devotee confidentiality
- No harassment of devotees
- Report any operational issues to Bhaktisetu within 24 hours

DEVOTEE DISPUTES
- Bhaktisetu mediates within 48 hours
- If pandit at fault: refund + warning
- Repeated issues: suspension review

TERMINATION
- Either party: 30-day written notice
- Bhaktisetu can terminate immediately for major breach
- Outstanding payouts settled within 30 days

JURISDICTION
- Bengaluru, Karnataka, India

SIGNED:
Pandit: ___________
Bhaktisetu: ___________
Date: ___________
```

## Doc 3 — Temple Master Agreement (per R-Q4-L-002 + R-Q4-SA-001)

```
TEMPLE-BHAKTISETU MASTER AGREEMENT

PARTIES
- Bhaktisetu Foundation (Section 8)
- [Temple name + Trust], CIN/Society reg: [#]

ENGAGEMENT
- Temple lists in Bhaktisetu pandit/puja network
- Onboard 5+ verified pandits and 5+ pujas
- 2-year initial term, 12-month auto-renew
- 90-day termination clause

REVENUE SHARE
- Temple: 65-70% of devotee payment
- Pandit (conducting puja): 20-25%
- Bhaktisetu: 10-15%
- Weekly settlement to temple bank account

TECH PROVIDED BY BHAKTISETU
- IVS streaming setup (camera + WiFi if needed)
- Booking platform integration
- Customer support
- Payment processing
- Reporting + analytics

TEMPLE COMMITMENTS
- 1 designated pandit liaison (POC for Bhaktisetu)
- 5+ pujas per month minimum
- Allow video recording during ceremonies (consent-based)
- Marketing co-mention optional

DATA + PRIVACY
- Bhaktisetu data owner (per DPDP)
- Temple gets aggregate analytics (not PII)
- DPDP-compliant data handling

NON-EXCLUSIVITY
- Temple can list with other platforms
- Bhaktisetu can list other temples in same city

DISPUTE RESOLUTION
- Internal mediation 60-day
- Then Indian arbitration (Bengaluru)
- Indian law governs

SIGNED:
Temple: ___________
Bhaktisetu: ___________
Date: ___________
```

## Doc 4 — Vendor Services Agreement (Razorpay/Resend/Render/Supabase)

> **OPS-10 correction (2026-09-02).** The DPA block below carried *"Data
> residency: India primary, Singapore standby"*. Neither half has ever been
> true, and a residency line in a signed vendor agreement is a **warranty** —
> the one clause a counterparty will quote back. It is replaced with an
> explicit verify-before-signing gate rather than a different region, because
> no verified region exists to substitute. Ground truth: `render.yaml:15`/`:56`
> and `docs/runbooks/disaster-recovery.md`.

```
VENDOR SERVICES AGREEMENT — STANDARD TERMS

PARTIES
- Bhaktisetu Foundation
- [Vendor: Razorpay / Resend / Render / Supabase / etc.]

SCOPE
- Specific services per vendor (payment processing / email / hosting / DB)
- Subject to vendor's standard ToS + Privacy Policy
- Indian compliance jurisdiction acknowledged

DATA PROCESSING ADDENDUM (DPA)
- Per DPDP + GDPR/CCPA applicable
- Vendor processes data only per Bhaktisetu instructions
- Data residency — primary: [VERIFY BEFORE SIGNING — do not copy a region in
  from memory. Application + API run on Render `oregon` (US West) per
  render.yaml:15 and :56. The Supabase database region is not recorded in this
  repository; read it from the Supabase dashboard and state it here.]
- Data residency — standby: NONE. There is no standby region, read replica or
  warm spare. Do not represent one. (The earlier "Singapore standby" line was
  false — see docs/runbooks/disaster-recovery.md.)
- Cross-border transfer: personal data IS processed outside India today,
  because the application tier is US-hosted. Reconcile the "Indian compliance
  jurisdiction acknowledged" line above with that fact before signing.
- Sub-processors disclosed + approved

SECURITY REQUIREMENTS
- SOC 2 Type II or equivalent
- Annual penetration testing
- Encryption in transit + at rest
- Incident notification within 72 hours

UPTIME SLA
- 99.9% uptime target
- Service credits for breach
- 7-day notice for planned maintenance

PAYMENT
- Per vendor pricing
- INR or USD invoicing
- 30-day payment terms

TERMINATION
- Either party: 60-day written notice
- Data export period: 90 days post-termination
- Data deletion certified

DISPUTE RESOLUTION
- Indian arbitration (Bengaluru)
- Indian law governs

SIGNED:
Vendor representative: ___________
Bhaktisetu: ___________
Date: ___________
```

## Doc 5 — Advisor Agreement (for technical/business advisors)

```
ADVISOR AGREEMENT

PARTIES
- Bhaktisetu Foundation
- [Advisor name], Background: [brief]

ENGAGEMENT
- Advisor provides strategic + technical + commercial guidance
- Duration: 12-month, renewable annually
- Time commitment: 2-4 hours/month average (meetings + emails)
- Format: Monthly Zoom + email/Slack access

COMPENSATION
- ESOP: 0.25% subject to 1-year vesting (½ at month 6, full at month 12)
- No cash compensation
- Reasonable expenses reimbursed (travel for in-person, etc.)

CONFIDENTIALITY
- All shared information confidential
- 5-year post-engagement
- No competing engagements with direct competitors

INTELLECTUAL PROPERTY
- Advice provided becomes Bhaktisetu IP
- Advisor's existing IP, code, work-product unaffected

TERMINATION
- Either party: 30-day written notice
- ESOP vesting continues pro-rata if mutually agreed exit
- Forfeit if terminated for cause

CONFLICT OF INTEREST
- Advisor discloses competing investments
- Cannot use Bhaktisetu information for personal gain
- Required to recuse from decisions where conflict exists

JURISDICTION
- Bengaluru, Karnataka, India

SIGNED:
Advisor: ___________
Bhaktisetu: ___________
Date: ___________
```

## Counsel-finalisation checklist

- [ ] Tier-2 Bengaluru firm engaged (₹50K-₹3L Q4)
- [ ] All 5 templates reviewed for Indian employment + commercial law
- [ ] State-specific clauses added (Karnataka jurisdiction)
- [ ] GST + TDS provisions confirmed
- [ ] DPDP + GDPR + CCPA cross-references confirmed
- [ ] Insurance + indemnification clauses tailored
- [ ] Sign-off from Founder + Independent Director (when board exists post-pre-seed)
