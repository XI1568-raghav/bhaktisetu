# R-Q2-L-001 — DPDP Act 2023 Compliance Audit Handoff

> Status: founder-action-required. Spec was placeholder; this doc consolidates existing artifacts + open gaps.

## Scope

DPDP Act 2023 (Digital Personal Data Protection Act, India, in force 2024) compliance audit for darshya.online covering:

1. Privacy policy text + multi-geo coverage
2. Consent flows (signup, payment, marketing, sensitive data e.g. birth chart for kundli)
3. DPO (Data Protection Officer) appointment + contact disclosure
4. DSAR (Data Subject Access Request) flow + 30-day SLA
5. Grievance officer + redressal mechanism
6. Children's consent (Section 9) `[LAWYER-CONFIRM]` — verifiable parental consent for users <18 (Darshya enforces 18+ signup gate but birth-chart kundli inputs may surface child DOBs; counsel must confirm interaction between 18+ product gate and DPDP child<18 definition, esp. for gift-puja flows naming minor recipients)
7. Cross-border data transfer notice — Render (region `oregon`, US West, `render.yaml:15` API / `:56` web) and Supabase (region **not recorded anywhere in this repository** — `[verify]` in the dashboard; do not assume Mumbai) are both outside India. *Corrected 2026-09-02 (`OPS-10`): this line used to read "(Render/Supabase/CF Pages all outside India)". Cloudflare Pages has not served the web tier since the 2026-07-08 cutover and is not a hosting processor for it; Cloudflare is DNS + edge proxy only. The authoritative processor and transfer inventory is `docs/legal/records-of-processing-activities.md`.*
8. Breach notification 72hr SLA (Section 8(6), operationalized by Rule 7 of DPDP Rules 2025)
9. Data retention + purpose limitation per category

## Existing artifacts (reference)

| Doc | Status |
|---|---|
| `docs/legal/dpdp-compliance-audit-2026-06.md` (179 lines) | Audit checklist + gap analysis — IS the audit output |
| `docs/legal/dpdp-user-rights-api-q2-spec.md` (38 lines) | DSAR/erasure/portability API spec |
| `docs/legal/dpdp-grievance-handling-detailed-spec.md` (237 lines) | Grievance officer SLA + escalation tree |
| `docs/legal/privacy-policy-v2-multi-geo.md` (90 lines) | Privacy policy v2 covering India + UK + US + Canada |
| `docs/legal/dpdp-user-rights-dsar-audit.md` | DSAR rights audit |
| `docs/legal/gdpr-uk-compliance-spec.md` | UK/GDPR parallel coverage |

## Founder-required actions (cannot be agent-completed)

1. **Appoint DPO** — name, email, registered India address. Email format `dpo@darshya.online`. Must respond DSAR within 30d.
2. **Appoint Grievance Officer** (Section 8(10) — effective grievance redressal mechanism) — name, email `grievance@darshya.online`, registered address. Publish on every page footer.
3. **Sign-off privacy policy v2** — `docs/legal/privacy-policy-v2-multi-geo.md`. Lawyer review before publishing to `/legal/privacy`.
4. **Breach notification runbook** — confirm 72hr SLA to DPB + affected users. Tabletop exercise scheduled.
5. **Cross-border transfer notice** — explicit consent text on signup for data residency outside India (Render USA + Supabase US-East + CF global edge).
6. **Children policy stance** — confirm 18+ gate on signup; reject kundli inputs where DOB <18yr ago.

## Engineering-implementable items (carry to next sprint)

- [ ] `/legal/privacy` route serving privacy-policy-v2-multi-geo content
- [ ] `/legal/grievance` route with officer details + redressal form (waitlist'd until founder appointment)
- [ ] DSAR API endpoints per dpdp-user-rights-api-q2-spec.md (GET /api/v1/me/export, DELETE /api/v1/me/erase, GET /api/v1/me/data)
- [ ] Consent ledger schema (timestamp, IP, version-of-policy-accepted, purpose-scope) per Section 6
- [ ] 18+ gate hard-enforce on signup DOB input
- [ ] Footer DPO + Grievance Officer disclosure (populate post-appointment)

## KPI tracking

`dpdp_audit_completed = 1` flips once:

1. DPO + Grievance Officer appointed + emails live
2. Privacy policy v2 published at /legal/privacy
3. DSAR endpoints live + 30d SLA tested
4. Consent ledger writing on signup
5. Breach runbook signed-off

## References

- DPDP Act 2023 full text: https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf
- DPB (Data Protection Board) rules: pending notification by MeitY
- Sri Mandir's privacy policy as benchmark: https://srimandir.com/privacy

## Handoff date

2026-06-14
