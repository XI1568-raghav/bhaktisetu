# DPDP Act 2023 Compliance Audit — Bhaktisetu

> **Roadmap item**: R-Q2-L-001 (P0) · **Authored**: 2026-06-12 · **Reviewer**: founder + counsel · **Status**: audit doc shipped; implementation follow-up via separate tickets.

## Scope

DPDP Act 2023 (Digital Personal Data Protection Act) enforcement starts staggered 2024-2026. Bhaktisetu collects PII at multiple touchpoints — must comply or face penalties up to ₹250 Cr.

## 8 obligations under DPDPA

### 1. Notice + Consent

**Rule**: Section 5 — notice to Data Principal before processing, w/ explicit purpose, retention, contact details. Section 6 — consent must be free, specific, informed, unconditional, unambiguous, capable of withdrawal.

**Bhaktisetu touchpoints**:
- Booking flow (devotee phone/email/PAN)
- Donation flow (donor name/PAN/address for 80G)
- Pandit/Temple onboarding (KYC + Aadhaar)
- Adopt-a-temple subscription (recurring billing details)
- NRI signup (passport / address abroad)

**Current state**: ad-hoc consent text on various forms. NO unified privacy policy presented at signup.

**To ship**:
- [ ] Unified privacy notice on /signup + /booking/* + /donate/* + /onboard-pandit + /onboard-temple
- [ ] Granular consent toggles (marketing-comms / analytics / shareable-data) — separate from terms-of-service acceptance
- [ ] Consent log: store {user_id, consent_type, granted_at, granted_text_version, ip_hash} per consent action
- [ ] Withdrawal flow: 1-click in user dashboard

### 2. Purpose limitation

**Rule**: Section 8(3) — process only for specified, explicit purpose.

**Current**: collected fields (booking → pandit assignment) clear purpose. AI Pandit feature (R-Q2-E-001) MAY use booking history for personalization — new purpose, NEW consent needed.

**To ship**:
- [ ] Document data flows per feature → `docs/legal/data-flows.md`
- [ ] Audit fields collected but never used → DROP (e.g. PAN collected during devotee signup but only needed for donation 80G receipt)

### 3. Data minimization

**Rule**: Section 8(4) — collect only necessary data.

**Current state issues**:
- Devotee signup may collect more than necessary (e.g. full address vs city for puja routing)
- KYC for pandit/temple over-collects (Aadhaar masked vs full)

**To ship**:
- [ ] Field-by-field audit in PII collection forms
- [ ] Drop fields not used in last 90 days for given workflow
- [ ] Use Aadhaar masked-format (XXXX XXXX 1234) where verification suffices

### 4. Accuracy

**Rule**: Section 8(5) — ensure data accuracy + completeness.

**To ship**:
- [ ] User dashboard → "Update my profile" includes ALL PII fields (devotee can correct)
- [ ] Periodic email/WA "Is your address still correct?" prompt — annual at minimum

### 5. Storage limitation + erasure

**Rule**: Section 8(7) — store only until purpose served + retain only as required by law.

**Bhaktisetu retention table**:

| Data type | Retain period | Reason |
|---|---|---|
| Booking + payment record | 8 years | GST + audit |
| 80G donor PAN + amount | 8 years | Tax record |
| Devotee profile (active) | Lifetime of account | Service delivery |
| Devotee profile (inactive 2+ years) | Erasure unless explicit retain | Storage minimization |
| KYC documents (pandit/temple) | 8 years post-termination | Audit + legal |
| Antyeshti (deceased data) | 90 days post-service, then anonymize | Sensitive per `docs/product/specs/antim-sanskar-v1.md` §Open Q10 |
| Marketing consent logs | 5 years post-withdrawal | Proof of consent timing |
| Server logs (IP, user-agent) | 30 days | Operational debugging |

**To ship**:
- [ ] Erasure cron — runs monthly, identifies + erases per retention table
- [ ] User-initiated erasure: 30-day countdown w/ withdrawal-of-withdrawal option

### 6. Data Principal rights

**Rule**: Sections 11-13 — user rights:
1. Information (what data we have)
2. Correction
3. Erasure
4. Grievance redressal

**To ship**:
- [ ] `/me/privacy/export` → JSON dump of all user PII (right to information)
- [ ] `/me/privacy/correct` → editable form
- [ ] `/me/privacy/erase` → erasure request w/ 30-day cooldown
- [ ] `/me/grievance` → contact DPO + ticket-track

### 7. Data Protection Officer (DPO)

**Rule**: Section 17 — Significant Data Fiduciary must appoint DPO. Threshold: not yet defined but likely >10K active users OR special-category data (deceased data is special).

**Bhaktisetu**: under threshold currently (pre-launch). When > 10K MAU → mandatory DPO. Antyeshti booking = special data NOW.

**To ship**:
- [ ] Designate founder as interim DPO (document at `docs/legal/dpo-designation.md`)
- [ ] Set up DPO contact channel: `dpo@darshya.online` alias
- [ ] When >10K MAU → counsel-led DPO process (external counsel as contracted DPO is acceptable)

### 8. Cross-border data transfer

**Rule**: Section 16 — GoI may restrict transfer to certain countries. NRI users in US/UK/AU/CA — data flows TO Bhaktisetu India (acceptable). Some processors are US-based (Stripe, Resend) — outbound flows.

**To ship**:
- [ ] Data flow diagram: India ↔ US (Stripe, Resend, Anthropic API, etc.) ↔ Other geos
- [ ] Verify each outbound processor has Standard Contractual Clauses (SCC) equivalent
- [ ] Privacy policy explicit on cross-border: which countries, which processors, what data

## Privacy Policy v2 outline

New `docs/legal/privacy-policy-v2.md` (separate ticket R-Q2-L-001b):

1. Identity of Data Fiduciary (Bhaktisetu Foundation)
2. What data we collect + categorized purpose
3. Legal basis (consent + contract performance)
4. Retention periods per data category
5. Cross-border processors named + purposes
6. Data Principal rights + how to exercise
7. DPO contact + grievance officer
8. Children's data (special — NO devotee <18 by policy v1)
9. Cookies + tracking technologies
10. Policy change notification process

## Consent flow design

User flow at signup:

```
Step 1: Phone + OTP verify
Step 2: Show NOTICE (1 sentence summary + link to Privacy Policy)
        + 3 separate consent checkboxes:
          [ ] Required: data processing for service delivery
          [ ] Optional: marketing communications (WhatsApp + email)
          [ ] Optional: usage analytics (PostHog)
        + "I have read the Privacy Policy" checkbox (gate)
Step 3: Complete profile fields

EACH checkbox click → log consent {user_id, consent_type, action, ts, ip_hash, policy_version}
```

## Founder action

```markdown
- [ ] Designate founder as interim DPO + create dpo@darshya.online alias
- [ ] File R-Q2-L-001b ticket: privacy-policy-v2 draft
- [ ] File R-Q2-L-001c ticket: implement consent flow at signup
- [ ] File R-Q2-L-001d ticket: implement erasure cron + dashboard rights endpoints
- [ ] Consult counsel for: DPO appointment timing, SCC verification for processors, threshold-trigger plan
- [ ] Antyeshti special-category handling: explicit consent + 90-day retention per spec
- [ ] Quarterly review: re-audit per checklist above
```

## Penalty exposure mitigations

Cap penalty under DPDPA: ₹250 Cr per violation. Concrete risks:
- Failing to provide notice: ₹50 Cr
- Not facilitating user rights: ₹150 Cr
- Cross-border transfer breach: ₹250 Cr

Even at 1% probability × ₹50 Cr exposure = ₹50 lakh expected loss. Compliance investment ~₹5L over 6 months = 10x ROI on risk mitigation.

## Out of scope

- Full Privacy Policy v2 text (separate ticket R-Q2-L-001b)
- Implementation code (separate tickets R-Q2-L-001c, d)
- Counsel-led DPO appointment (founder action)
- DPIA (Data Protection Impact Assessment) for AI Pandit feature — defer until R-Q2-E-001 ships
- Children's data (out of scope: <18 not target audience)

## Closes

R-Q2-L-001 — audit shipped. Status flips to shipped after 3 follow-up implementation tickets land + counsel review complete.
