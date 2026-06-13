# Data Protection Impact Assessment (DPIA) — UK NRI Launch

> Per UK GDPR Article 35 — mandatory before launching service to UK data subjects. Foundation for ICO compliance.

## Why this DPIA

Bhaktisetu Foundation launching UK NRI service Q3 2026 (per R-Q3-G-001). Processing UK customer data requires:
- UK GDPR (formerly EU GDPR) compliance
- UK DPA 2018 compliance
- DPIA documented before launch
- ICO registration (£40-60/year)

## Section 1 — Processing Description

### Nature of processing

Bhaktisetu collects + processes UK NRI Hindu customer data for:
- Account creation (email, name, phone)
- Puja booking (puja preference, temple, scheduled date)
- Payment processing via Stripe GBP (PAN/card details tokenised)
- Communication (WhatsApp, email transactional)
- Optional cultural-content engagement (newsletter, daily aarti notifications)

### Scope

- Geographic: UK England, Scotland, Wales, Northern Ireland
- Data subjects: NRI Hindu adults seeking devotional services for India temple bookings
- Volume estimate: 1,500-3,000 UK NRI signups annually (Q3 2026 target)
- Special categories: Religious data (Hindu identity) — sensitive per UK GDPR

### Lawful basis (per UK GDPR Art 6)

| Processing | Lawful basis | Justification |
|---|---|---|
| Account signup | Consent | Explicit at signup w/ checkbox |
| Puja booking | Contract | Service delivery requirement |
| Payment processing | Contract | Service delivery requirement |
| Marketing emails | Consent | Opt-in checkbox, opt-out always available |
| Analytics (cookies) | Consent | Granular banner per Article 6(1)(a) |
| Pandit KYC | Legitimate interest | Trust + service quality |
| Cross-border transfer | Contract + Article 49 | Service delivery + standard contractual clauses |

### Special category basis (per Art 9)

- Religious affiliation (Hindu) — explicit consent at signup
- Pandit/temple preference — necessary for service delivery
- No other special category data collected

## Section 2 — Necessity + Proportionality

### Purpose-specific data minimization

- Customer name + email: minimum for account
- Phone: required for WhatsApp + critical comms
- PAN/payment: tokenised via Stripe — never stored
- Religious preference (deity, festival, tradition): minimum for relevant puja matching
- Geographic: minimum for time-zone + temple-region matching

### Data retention

- Account data: until deletion request
- Transaction history: 7 years (UK accounting + tax compliance)
- Marketing data: until opt-out
- Behavioural data: 12 months then aggregated
- KYC docs (Pandits): retained 5 years post-pandit termination

### Data subject rights (per UK GDPR Art 15-22)

- Right to access: `/me/privacy/export` endpoint
- Right to rectification: `/me/privacy/correct` 
- Right to erasure: `/me/privacy/erase` (30-day cooldown)
- Right to data portability: JSON export available
- Right to restrict processing: granular consent toggles
- Right to object: opt-out from automated decision-making
- Right not to be subject to automated decision-making: not applicable (no AI denying service)

## Section 3 — Necessity Assessment

### Are there less invasive alternatives?

| Alternative | Why insufficient |
|---|---|
| Phone-only booking (no app) | Pandit verification + video proof requires digital infrastructure |
| Email-only booking | Same — proof + confirmation requires digital |
| Booking via existing competitor | Competitors don't provide UK GBP pricing + verified KYC |
| In-person UK temple-only | Different service category; doesn't address NRI India temple need |

### Proportionate scope

- Only collect what's needed (no excessive personal info)
- Anonymize analytics where possible (PostHog mask all inputs)
- Encrypt at rest + in transit
- Multi-factor auth for high-risk accounts

## Section 4 — Risks Identified

### High risks

1. **Unauthorized access to NRI customer + booking data**
   - Mitigation: SOC 2 vendor stack + encryption + IAM least-privilege
2. **Cross-border data transfer to India**
   - Mitigation: Standard Contractual Clauses (SCC) + UK Adequacy assessment
3. **Sensitive religious data exposure**
   - Mitigation: Special category data minimisation + explicit consent

### Medium risks

4. **Vendor data breach (Razorpay/Stripe/Resend/PostHog)**
   - Mitigation: DPA with each vendor + breach notification SLA
5. **Pandit access to customer info**
   - Mitigation: Pandits only see booking-relevant fields (name + temple + time)
6. **Marketing email + WhatsApp consent revocation**
   - Mitigation: One-click unsubscribe + DSAR API

### Low risks

7. **Cookie tracking + analytics**
   - Mitigation: Granular consent banner + opt-in only

## Section 5 — Mitigation Measures

### Technical safeguards

- Encryption at rest (Supabase Postgres + S3)
- Encryption in transit (TLS 1.3 minimum)
- Multi-factor authentication for admin access
- Rate-limiting per R-Q2-E-013
- Sentry monitoring for anomalies
- Quarterly penetration testing

### Organisational safeguards

- Bhaktisetu Foundation Grievance Officer designated (per R-Q1-IT-003 + DPDP)
- Staff training on UK GDPR (founder + contractors mandatory)
- Annual DPIA review
- Vendor DPA agreements signed
- Cross-border transfer protocols documented

### Procedural safeguards

- 72-hour breach notification commitment
- DSAR response within 30 days (UK GDPR requirement)
- Cookie banner with granular consent
- Opt-out one-click any time
- Annual policy review + UK customer notification

## Section 6 — Residual Risks

After mitigation:

| Risk | Likelihood | Impact | Residual Risk |
|---|---|---|---|
| Data breach affecting >100 UK customers | Low | High | Medium |
| Single customer DSR processing delay | Medium | Low | Low |
| Vendor sub-breach affecting UK data | Medium | High | Medium |
| Marketing opt-out non-compliance | Low | Medium | Low |

### Acceptable residual risk?

Yes — implementing all mitigation measures + ICO registration + cyber liability insurance (₹50K/yr) reduces residual to acceptable level.

## Section 7 — Consultation

- **Internal**: Founder + advisory board review (done)
- **Counsel**: Tier-2 India IP/DPDP firm review (Q3 W2)
- **External DPO**: Not required (UK GDPR exempts small operators)
- **ICO**: Pre-launch courtesy notification (not mandatory but recommended)

## Section 8 — Outcomes

### Sign-off

- Founder: Sunil Kumar (date)
- Advisory Board: 2 advisors sign-off (date)
- Counsel: Tier-2 firm legal opinion (date)

### Review schedule

- Annual review every Jan 1
- Trigger reviews:
  - New product category launched
  - Vendor change (e.g., new payment processor)
  - Regulatory change (UK GDPR amendment)
  - Material data breach

## Section 9 — ICO Registration

### When required

- Annually if processing personal data of UK residents
- Annual fee: £40-£60 depending on annual turnover

### Registration process

- Apply: ico.org.uk/for-organisations/data-protection-fee
- Bhaktisetu fee tier: Tier 1 (likely £40 — small org, < £631K annual turnover)
- Renewal: annual
- Public listing: published in ICO register

## Section 10 — Founder Action

- Q3 W1: Counsel engagement on DPIA finalisation
- Q3 W2: ICO registration submitted
- Q3 W3: Cookie banner CMP implementation
- Q3 W4: UK customer DSAR endpoints live (extension of R-Q2-L-003)
- Q3 W5: Q3 W12 — bi-monthly review of UK customer feedback + DPIA validation
- Annual Jan 1: DPIA review + ICO renewal

## Reference documents

- UK GDPR full text: gov.uk/data-protection/the-data-protection-act
- ICO DPIA template: ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-impact-assessments
- DPDP Act 2023 cross-references: meity.gov.in/data-protection
