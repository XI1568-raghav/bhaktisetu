# Additional Legal Docs Pack — 5 Operational Templates

> Foundation for partnership scaling. Counsel-reviewed before signing.

---

## Doc 1 — Privacy Policy v2 (Expanded post-NRI launch)

```
PRIVACY POLICY v2 — EFFECTIVE QQ-2026

This v2 supersedes v1 (effective Q1 2026) to add:
- UK GDPR specific clauses for UK launch (R-Q3-G-001)
- Canadian PIPEDA cross-references
- US CCPA / CPRA acknowledgment
- New product disclosures: AI Pandit, Adopt-a-Temple, Antim Sanskar

[Full v1 sections retained]

NEW SECTIONS:

A. AI Pandit Service Data
- User questions submitted to AI Pandit are processed via Groq LLM API
- Questions + answers retained 90 days for quality improvement (anonymised)
- Users may opt-out of question retention via /me/privacy/ai-pandit-toggle
- AI Pandit data not used for advertising; not shared with 3rd parties

B. Antim Sanskar Service Data
- Sensitive context (deceased family members) handled with extra care
- Photos + names of deceased displayed only with explicit family consent
- 7-year retention for legal compliance, then anonymisation
- Family right to perpetual deletion regardless of legal retention

C. Cross-border data flow

> **OPS-10 correction (2026-08-28).** The four claims previously stated here —
> Render Mumbai, Supabase Mumbai, a Singapore standby, and multi-region
> Supabase — describe infrastructure this product has never had. They are
> restated below as what the repository actually proves. Do NOT re-assert a
> data-residency fact in a signed instrument that is not on this list; a
> residency representation is a warranty, and every one of the removed lines
> was false at the time it was written. Ground truth:
> `docs/runbooks/disaster-recovery.md`.

- Application + API servers: **Render `oregon` region (US West)**, not India.
  Verified in `render.yaml:15` (API) and `render.yaml:56` (web).
- Database: Supabase Postgres. **The region is not recorded anywhere in this
  repository — [verify] in the Supabase dashboard and fill it in here before
  signing any instrument that states a residency.**
- **No standby region, no read replica, no warm spare exists** in any
  geography. There is no disaster-recovery failover site.
- Backups: daily `pg_dump` into Supabase Storage — i.e. **the same Supabase
  project the database lives in**, so backup residency equals database
  residency and a single account suspension takes both.
- **There is no backup today.** The workflow's three secrets have never been
  set; every run produced zero bytes (`OPS-02`). Do not represent a backup
  regime, an RPO or an RTO to any counterparty until
  `docs/runbooks/db-restore.md` → *DR drill history* has a row in it. Those
  numbers are targets, and no restore has ever been performed.
- **Forward-looking, and it changes this section the day it happens:** the code
  now supports a second, offsite backup destination (`OPS-03`). If the owner
  configures it with Cloudflare R2 — the recommended option — then **Cloudflare
  becomes a processor of a full copy of the production database**, not merely a
  DNS and CDN provider, and the R2 bucket's jurisdiction becomes part of the
  backup residency answer. Update the sub-processor entry and the residency
  statement below **before** signing anything, not after.
- UK + EU NRI access processed under the DPDP framework
- US NRI data processed with CCPA-compliant safeguards

D. Sub-processor list (transparency)
- Razorpay (payments — India)
- Resend (email — Israel + US)
- WhatsApp Cloud API (Meta — US)
- PostHog (analytics — Hungary + US)
- FCM (push notifications — Google US)
- Sentry (error tracking — US)
- Cloudflare (DNS + CDN — Global; Pages is **not** a hosting layer). **If R2 is
  configured as the offsite backup destination (`OPS-03`), Cloudflare's role
  changes to a processor of database backups and this entry must be rewritten.**
- Render (web + API hosting — US, `oregon` region)
- Supabase (database + backup storage — region [verify])

> Stripe was listed here as "NRI payments — US" and has been removed: the
> 2026-08-11 audit records the Stripe rail as removed and its webhook as
> 404, so disclosing it named a processor that receives no personal data.
> Razorpay is the only payment processor.

E. AI processing disclosure
- Customer support: AI-assisted classification of inquiries
- Booking matching: ML algorithms for pandit-puja matching
- Pricing optimisation: A/B testing per cohort
- All AI processing documented + opt-out available

Effective Date: [DATE]
```

## Doc 2 — DPDP Grievance Officer Designation

```
GRIEVANCE OFFICER NOTICE (per DPDP Section 4(b))

Bhaktisetu Foundation (CIN: [CIN])
Section 8 Non-Profit Company, Bengaluru

GRIEVANCE OFFICER:
Name: Sunil Kumar
Designation: Founder & CEO
Email: grievance@bhaktisetu.com
Phone: +91-XXXXX-XXXXX
Postal Address: [Bhaktisetu Foundation Registered Address]
Office Hours: Monday-Friday 09:00-18:00 IST (excluding public holidays)

SCOPE OF GRIEVANCE OFFICER:
- Handles all DPDP Act 2023 grievances within 30 days (legal requirement)
- Escalates unresolved grievances to Data Protection Board of India
- Maintains grievance log for compliance audit
- Quarterly grievance report published on Bhaktisetu /press page

HOW TO RAISE GRIEVANCE:
1. Email grievance@bhaktisetu.com with subject "DPDP Grievance — [Issue]"
2. WhatsApp +91-XXXXX-XXXXX
3. Postal letter to Bhaktisetu Foundation registered address
4. Online form at bhaktisetu.com/grievance

GRIEVANCE TIMELINE:
- Acknowledgment: within 7 days
- Investigation: within 21 days
- Resolution: within 30 days (legal deadline)
- Appeal to Data Protection Board: post-30-day non-resolution

LANGUAGE SUPPORT:
- English (primary)
- Hindi (Devanagari)
- Tamil, Telugu, Bengali, Marathi (regional)

Effective Date: [DATE]
Last Updated: [DATE]
```

## Doc 3 — Corporate Social Responsibility Policy

```
CORPORATE SOCIAL RESPONSIBILITY POLICY

Bhaktisetu Foundation (Section 8)
Pursuant to Companies Act 2013 + CSR Rules 2014

MISSION CONTEXT:
Bhaktisetu operates as a Section 8 non-profit. CSR is operationally embedded in our mission of serving Hindu families globally with verified, dignified devotional services.

CSR PRIORITY AREAS:
1. Temple infrastructure maintenance (per R-Q4-E-012 Adopt-a-Temple)
2. Vedic education preservation (per R-Q3-P-004 Gurukul scholarships)
3. Pandit family welfare (medical insurance, education for pandit children)
4. Cultural heritage digital preservation (per Tata Trusts partnership scoping)
5. Disaster relief during festivals (e.g., Kedarnath floods 2013 precedent)

CSR ALLOCATION:
- 2% of net profit (Section 8 surplus) reinvested per CSR Act
- Quarterly allocation review by founder + advisory board
- Annual CSR report published at bhaktisetu.com/csr-report
- Independent CSR audit by tier-2 firm

CSR PROCESSES:
- Transparency: per-grant impact reports
- Compliance: Form CSR-1 + CSR-2 filings
- Audit: annual CSR statutory audit
- Reporting: BRSR (Business Responsibility + Sustainability Report) framework

EFFECTIVE DATE: [DATE]
APPROVED BY: Founder + Advisory Board

[Founder Signature]
```

## Doc 4 — Whistleblower Policy

```
WHISTLEBLOWER POLICY

Bhaktisetu Foundation

PURPOSE:
Provide safe channel for employees, contractors, vendors, and customers to report:
- Financial fraud or misappropriation
- Pandit network misconduct
- Data privacy violations
- ASCI/regulatory non-compliance
- Founder/leadership ethics violations
- Workplace harassment

WHISTLEBLOWING CHANNELS:
1. **Email**: whistleblower@bhaktisetu.com (encrypted)
2. **Anonymous form**: bhaktisetu.com/whistleblower (TLS-encrypted, IP-stripped)
3. **Physical mail**: Bhaktisetu Foundation, Bengaluru — confidential envelope
4. **Direct to Advisory Board**: bypass founder if implicated

WHISTLEBLOWER PROTECTIONS:
- No retaliation guaranteed (Section 1 of policy)
- Anonymous reporting accepted
- Identity protection via legal counsel intermediary
- Job protection (no termination for good-faith reporting)
- Legal aid covered for whistleblowers facing retaliation

INVESTIGATION PROCESS:
1. Acknowledgement within 7 days
2. Independent investigator assigned (founder excluded if implicated)
3. Investigation timeline: 30-60 days
4. Resolution communicated to whistleblower
5. Action against confirmed wrongdoing — termination, legal action, public disclosure

OUTCOMES PUBLISHED:
- Quarterly anonymized summary published on /transparency page
- Maintains accountability + signals zero-tolerance culture

EFFECTIVE DATE: [DATE]

[Founder Signature + Advisory Board Co-signatures]
```

## Doc 5 — Data Processing Agreement (DPA) Template

```
DATA PROCESSING AGREEMENT (DPA)

Per DPDP Act 2023 + GDPR Article 28 + CCPA where applicable

CONTROLLER: Bhaktisetu Foundation (CIN: [CIN])
PROCESSOR: [Vendor Name]

SCOPE:
[Vendor] processes personal data on behalf of Bhaktisetu Foundation strictly per Bhaktisetu instructions, for the specific purpose of [Service Description].

DATA CATEGORIES:
- Account data (email, phone, name)
- Transaction data (booking history, payment metadata)
- Behavioural data (page views, search queries)
- Identity data (PAN for 80G receipts, where applicable)

DATA RESIDENCY:
- Primary: [VERIFY BEFORE SIGNING — do not copy a region in from memory.
  Application + API run on Render `oregon` (US West) per render.yaml:15/:56.
  The Supabase database region is not recorded in the repository; read it
  from the Supabase dashboard and state it here.]
- Standby: NONE. There is no standby region, read replica or warm spare.
  Do not represent one. (The earlier "Standby: Singapore" line was false —
  see docs/runbooks/disaster-recovery.md.)
- Cross-border transfer: personal data IS processed outside India today,
  because the application tier is US-hosted. Any "no cross-border transfer"
  representation must be reconciled with that fact, not asserted over it.
- No cross-border transfer beyond [list of approved jurisdictions]

PROCESSOR OBLIGATIONS:
- Process data only per Controller instructions
- Maintain confidentiality of personal data
- Implement appropriate technical + organisational security measures
- Notify Controller of personal data breach within 72 hours
- Sub-processor disclosure + approval
- Audit cooperation
- Annual penetration test report shared with Controller

DATA SUBJECT RIGHTS:
- Processor cooperates with Controller in fulfilling data subject rights:
  - Right to access
  - Right to rectification
  - Right to erasure
  - Right to data portability
  - Right to restrict processing

LIABILITY:
- Controller liable to data subjects (primary)
- Processor indemnifies Controller for breach of this DPA
- Liability cap: ₹50L per incident (insurance backed)

TERMINATION:
- Either party: 60-day written notice
- Upon termination: data return or certified deletion within 30 days
- Audit log retention for compliance window

GOVERNING LAW:
Indian law (DPDP) + applicable foreign privacy laws by reference (GDPR for UK data, CCPA for California data)

JURISDICTION:
Bengaluru, Karnataka, India

SIGNED:
Controller (Bhaktisetu): ___________
Processor: ___________
Date: ___________
```

## Implementation timeline

- Q3: Counsel review of all 5 docs (₹50K-₹1L)
- Q3: Privacy Policy v2 published live at /legal/privacy
- Q3: DPDP Grievance Officer designation published
- Q4: CSR Policy + Whistleblower Policy approved by advisory board
- Q4: DPA templates signed w/ all sub-processors

## Annual review

- Privacy Policy v2 reviewed annually (every Jan 1)
- DPDP Grievance Officer designation reviewed (or upon founder change)
- CSR Policy reviewed per allocation cycles
- Whistleblower Policy reviewed (or upon advisory board change)
- DPA templates updated annually + per sub-processor change
