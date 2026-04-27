# Darshya — Legal Lead Brief

> This is not legal advice. Consult a qualified Indian lawyer before acting on any item.
> I am an assistant playing "Legal Lead" for the founder, not a lawyer. Anything below is
> a starting point for a conversation with a real practitioner — especially the rupee figures,
> which I could not verify via WebSearch this session (the search tool errored out) and which
> shift year to year. Treat costs as order-of-magnitude only.

Author role: Legal Lead (assistant). Audience: Darshya founder (Sunil/Darshya solo, pre-incorp).
Live status: product is shipping, charging payments, accepting NRI traffic, not yet incorporated
(`apps/web/lib/company.ts:36` — `IS_INCORPORATED_VERIFIED: false`).

---

## 1. Pre-launch incorporation question

**Recommendation: incorporate now, before NRI revenue scales past trivial volumes.**
The question is not "Pvt Ltd vs sole-prop forever" — it is "how many months of personal liability
am I willing to carry while I get to PMF." Honest tradeoff:

- **Sole proprietorship today**: zero registration cost, file ITR-3 / ITR-4 against your PAN,
  GST registration if turnover crosses the services threshold (commonly cited at INR 20 lakh,
  verify current). Razorpay onboards a sole-prop. Cheap and fast — but **you personally are the
  contracting party** for every devotee, every priest, every refund dispute. A single class-action-
  flavoured grievance over a "fake" puja, a chargeback wave from NRI cards, or a tax notice lands
  on your personal balance sheet with no veil.
- **Private Limited (Pvt Ltd) via SPICe+**: typical all-in cost commonly cited in the
  INR 7,000–15,000 range for government fees + DSC + DIN + name reservation, plus
  CA/CS professional fees of roughly INR 5,000–15,000 (verify with a current CA).
  Annual ROC compliance (AOC-4, MGT-7, DIR-3 KYC, statutory audit if applicable, board
  minutes) realistically costs INR 25,000–60,000/year in professional fees even with zero
  revenue. **Trade**: a few weeks of paperwork and roughly INR 30k–60k in year-one
  professional spend, in exchange for (a) a real liability shield, (b) the ability to sign
  partnership MoUs as an entity (temples will eventually demand this), (c) a clean cap table
  if you ever raise, (d) credibility for 80G(5) and FCRA paths later, and (e) FEMA-clean
  mechanism for receiving Stripe USD inflows.
- **OPC (One Person Company)** is a middle path — single-member Pvt Ltd, lighter than full
  Pvt Ltd but still gives the corporate veil. Worth asking the CA about if the founder is
  uncomfortable with nominee shareholders.

**My take**: every week you operate live with NRI USD inflows under your personal PAN is
a week of uncapped personal exposure. Start incorporation paperwork this week; it does not
block product work.

---

## 2. The 5 highest-risk legal exposures right now

**(a) Charging payments without a registered entity. Severity: HIGH.** Razorpay's onboarding
treats sole-prop legitimately, so this is not a payments-licence issue per se. The risk is
contractual: every booking page calls itself "Darshya," but Darshya is not yet a legal person.
If a devotee sues over a botched puja, the named defendant is *you personally*. The 7-year
record retention claim in the Privacy Policy (`apps/web/app/privacy/page.tsx:198`) is also
a personal obligation right now. *Mitigation*: file SPICe+ this week; until the CIN arrives,
keep the `operatedByLine()` language in `lib/company.ts:101` honest (it currently is) and
do not let any page claim "Darshya Technologies Pvt Ltd" — note `refunds/page.tsx:226` already
violates this with a hard-coded "Darshya Technologies Pvt. Ltd., HSR Layout, Bengaluru."

**(b) Priest payouts as contractor income. Severity: HIGH.** Once you incorporate (or even as
a sole-prop crossing TDS thresholds), Section 194C of the Income Tax Act requires TDS on
contractor payments — commonly cited threshold of INR 30,000 per single payment or INR
1,00,000 aggregate per year (verify current rates and thresholds with a CA). Priests are
contractors, not employees. *Mitigation*: collect each priest's PAN at onboarding (the
caveat doc already implies a verification flow), deduct TDS at the applicable rate on every
payout above threshold, file Form 26Q quarterly, issue Form 16A. Without this, the
recipient deduction-disallowance penalty alone can dwarf platform commission.

**(c) 80G receipts without a 80G(5) certificate. Severity: HIGH for trust / MEDIUM for legal.**
Section 80G of the Income Tax Act allows donors to deduct donations *only* to entities
holding a valid 80G(5) registration with the Income Tax Department. The code already gates
this correctly: `donationLegal.HAS_80G_VERIFIED: false` in `lib/company.ts:88`. Risk surfaces
the moment any UI, email, or receipt template uses the phrase "80G receipt" or "tax-deductible"
before that flag flips. *Mitigation*: grep the codebase for "80G" and "tax-deduct" — wherever
the gate is missing, replace copy with "donation receipt (not tax-deductible until 80G
registration is obtained)." Engage a CA to apply for 80G(5); it requires a registered 12A
trust/Section 8 company, so this is downstream of incorporation choice (Section 8 if you
want a charitable arm, Pvt Ltd for the commercial platform — most likely a two-entity
structure).

**(d) NRI customer data and DPDP Act 2023 territoriality. Severity: MEDIUM-HIGH.** The DPDP
Act applies to processing of personal data within India, *and* to processing outside India
that relates to offering goods or services to data principals in India. NRIs receiving
service in India (the puja happens in India, prasad ships from India) are squarely in
scope; NRIs *consuming* darshan content abroad are a greyer area. EU residents using the
NRI flow potentially trigger GDPR. *Mitigation*: appoint a Data Protection Officer (or
"Privacy Lead" — the founder, named in `privacy@`), publish a clear consent flow at
signup (currently absent — see §3 checklist), implement a verifiable user-deletion path
(privacy page promises it at `privacy/page.tsx:199` but the actual deletion endpoint must
exist and be tested), and add an explicit cross-border transfer notice for NRIs.

**(e) Intermediary safe harbour for priest-generated content. Severity: MEDIUM.** Section 79
of the IT Act 2000 plus the IT (Intermediary Guidelines and Digital Media Ethics Code)
Rules 2021 grant safe harbour to intermediaries that: publish T&C / privacy / grievance
policy, name a Grievance Officer, follow takedown timelines (commonly 36 hours / 72 hours
depending on category — verify), and "do not initiate / select / modify" the user content.
Priest profiles, sankalp blurbs, and any UGC fall under this. *Mitigation*: publish the
Grievance Officer's name, designation, and contact (`refunds/page.tsx:213` mentions
`grievance@darshya.online` but no named officer or address — this is non-compliant under
Rule 3(2)). Add a clear takedown / complaint process. Keep editorial selection light;
heavy curation can void safe harbour.

---

## 3. DPDP Act 2023 readiness checklist

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Notice at point of collection (purpose, withdrawal, grievance) | ⚠️ partial | `privacy/page.tsx:60-111` lists categories but no per-form just-in-time notice at signup. |
| 2 | Verifiable consent (granular, opt-in, withdrawable) | ⚠️ partial | Marketing opt-in mentioned at `privacy/page.tsx:142`, but no checkbox UI evidence and no consent audit log. |
| 3 | Children: parental consent for under-18 | ❌ not done | `privacy/page.tsx:233-241` and `terms/page.tsx:57-64` say minors "may use with parental consent" but there is no verification mechanism. DPDP requires verifiable parental consent for under-18s. |
| 4 | Data principal rights (access, correction, erasure, portability, grievance) | ⚠️ partial | Listed at `privacy/page.tsx:217-230`. Email-only mechanism is acceptable but unaudited; no SLA, no proof of execution. |
| 5 | Grievance Officer named with contact | ❌ not done | Email-only at `refunds/page.tsx:213`. DPDP + IT Rules want a named officer, designation, postal address. |
| 6 | Reasonable security safeguards | ⚠️ partial | `privacy/page.tsx:179-191` lists TLS, RLS, PCI processors. Acceptable as a claim; no documented security policy / pen-test cadence. |
| 7 | Breach notification readiness (Board + affected principals, "without delay") | ❌ not done | No mention anywhere. Need a runbook (template draft, Board-of-DPDP form, comms script). |
| 8 | Cross-border transfer disclosure (esp. for NRI Stripe flow, R2 storage region, Resend US, PostHog) | ❌ not done | `privacy/page.tsx:148-176` lists processors but does not name jurisdictions or invoke the Section 16 transfer regime. |

---

## 4. Refund-policy stress test — "priest no-showed"

The weakest clause is `refunds/page.tsx:82-84`: `"Puja not performed by temple → 100% refund + 10%
platform credit."` Three problems for a no-show complaint:

1. The trigger is "puja not performed" — but a priest could *claim* it was performed without
   video proof, leaving the devotee unable to invoke this row.
2. No SLA: how long does the devotee wait before the refund obligation kicks in? If the priest
   uploads proof on day 7, was it "performed"?
3. The 10% credit is denominated in platform credit, not cash — for an NRI who will never book
   again, that is functionally zero compensation. Consumer Protection Act 2019 unfair-trade-
   practice exposure.

**Tight rewrite**:

> *"If the temple does not perform the puja, or fails to submit video proof within 48 hours of
> the scheduled time (whichever is earlier), the booking is automatically deemed not performed
> and we will issue a 100% refund to the original payment method within 5–7 business days,
> plus, at your election, either (a) 10% of the booking amount as platform credit OR (b)
> 5% of the booking amount as additional cash refund. No further proof of non-performance is
> required from you; we will absorb any dispute with the temple. NRI customers default to
> option (b) unless platform credit is specifically requested."*

This shifts the burden of proof to the platform, gives a hard time gate, and gives NRIs a
non-illusory remedy.

---

## 5. Operating-without-incorporation runbook (this week)

1. **Open a separate current account in your name + a "Darshya" trade-name styling**
   (sole-prop bank account using a Udyam / GST registration certificate). Never co-mingle
   personal and Darshya rupees. This alone makes the eventual Pvt Ltd transition clean and
   reduces tax-notice mess.
2. **Sign a written priest agreement with every active priest** before their next payout —
   contractor terms, IP assignment of recorded ritual video, sankalp confidentiality, no-show
   penalty, indemnity from the priest if a sankalp is misperformed, and the priest's PAN +
   Aadhaar e-KYC on file. Templates from a CS cost a few thousand rupees and prevent the
   "we never agreed to that" defence.
3. **File for GST registration** if you have crossed or will plausibly cross the services
   threshold (commonly cited INR 20 lakh, verify) — and *voluntarily* even if you have not,
   because Razorpay reports gross transaction volume and a notice asking why you did not
   register is unpleasant.
4. **Stand up a real grievance process**: name yourself (or a designated person) as Grievance
   Officer in `refunds/page.tsx:213` and on a new `/grievance` page; commit to the IT Rules
   acknowledgment / resolution timelines; log every complaint with timestamp.
5. **Buy professional-indemnity + cyber-liability insurance** in your personal name. Premia
   for a starting platform are typically modest (verify with a broker). This is the single
   cheapest hedge against the period between today and CIN issuance.

---

## Items only a real lawyer can answer

- Whether to incorporate as Pvt Ltd, OPC, LLP, or a Pvt Ltd + Section 8 dual structure given
  Darshya's mix of commercial puja bookings, donations, and gaushala seva.
- Exact GST classification of "puja booking" (services? agency? exempt as religious service?)
  and the platform-commission GST treatment.
- Whether NRI USD inflows via Stripe need to be routed through an AD-Category-I bank under
  FEMA, what FIRC documentation is required, and whether Stripe's India entity covers it.
- Whether the platform qualifies for Section 79 intermediary safe harbour given the
  "video proof verification" step (does that constitute editorial selection?).
- Whether 80G(5) is even attainable for the donation flow, and the right entity to apply.
- DPDP rules-of-procedure (Significant Data Fiduciary status thresholds) when NRI count
  scales — only the notified Rules will tell us.
- The exact wording of the priest contract's IP, indemnity, and termination clauses.
- Drafting of the user-side arbitration clause in `terms/page.tsx:276` to ensure it is
  enforceable post-*TRF v. ICICI* / current Supreme Court arbitration jurisprudence.
- A pre-launch privacy-policy redline against the DPDP Rules (notified version) and the
  IT Rules 2021 once both are read together for a marketplace.

Sources: I attempted WebSearch for the regulatory items (80G, FEMA, DPDP, IT Act
intermediary rules, TDS) but the tool returned API errors this session, so the citations
above point to the underlying statutes by name and section rather than to current
secondary sources. Every rupee figure, threshold, and timeline in this brief should be
re-verified by a CA / CS / advocate before any decision is taken.
