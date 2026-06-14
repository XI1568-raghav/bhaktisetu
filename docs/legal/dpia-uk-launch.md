# Data Protection Impact Assessment (DPIA) — UK NRI Launch

> **Roadmap item**: R-Q3-L-002 · **Authored**: 2026-06-14 · **Owner**: legal
> **Status**: living document — re-assess before major feature launches affecting personal data

## 1. Project description

Darshya is launching a UK-targeted NRI offering enabling UK residents to book pujas at
Indian temples, receive video proof of completion, and (where applicable) donate to
verified gaushalas. The UK launch processes UK residents' personal data and is therefore
within scope of UK GDPR and the Data Protection Act 2018.

## 2. Necessity and proportionality

- **Why personal data?** Account creation, payment, video proof delivery, support, and
  marketing (consent-based) all require identifiable data.
- **Lawful basis**: see ROPA. Primary bases — contract for booking, consent for
  marketing/analytics, legal obligation for invoices, legitimate interest for fraud and
  pandit KYC.
- **Data minimisation**: we collect name, email, phone, billing country only at booking;
  city is optional and used for festival recommendations.
- **Less intrusive alternatives considered**: anonymous donation flow is offered for
  gaushala seva and does not collect identity beyond payment-processor minimum.

## 3. Data flows (high-level)

```
User (UK) -> Cloudflare Pages (edge) -> Render API (Mumbai)
                                              |
                                              +-> Supabase Postgres (Mumbai)
                                              +-> Stripe (USA) for payment
                                              +-> Resend (USA) for email
                                              +-> Twilio (USA) for WhatsApp
                                              +-> PostHog (EU) for analytics (consented)
```

## 4. Identified risks

| # | Risk | Likelihood | Severity | Inherent | Mitigation | Residual |
|---|---|---|---|---|---|---|
| 1 | Unauthorised access to booking data | Low | High | Medium | TLS, RBAC, MFA, audit log | Low |
| 2 | Pandit KYC document leak | Low | High | Medium | Encrypted at rest, narrow access, 8-yr retention timer | Low |
| 3 | Cookie consent not honoured | Medium | Medium | Medium | Cookie banner with reject-all parity, automated test on every release | Low |
| 4 | Marketing email sent without consent | Low | Medium | Low | Double opt-in for UK; suppression list | Low |
| 5 | Video proof URL leaks via referrer | Medium | Medium | Medium | Signed URLs with 30-day expiry, Referrer-Policy header | Low |
| 6 | Cross-border transfer without safeguards | Medium | High | High | SCCs in all processor DPAs, UK IDTA addendum | Low |
| 7 | Data subject request missed deadline | Medium | Medium | Medium | DSAR queue with 30-day SLA, weekly review | Low |
| 8 | Pandit names + photos = inferred religion (special category) | High | Medium | Medium | Pandit-side consent at onboarding, Art 9(2)(d) reliance | Low |
| 9 | Breach notification > 72 hours | Low | High | Medium | Runbook + on-call rotation; tabletop drill quarterly | Low |
| 10 | Re-identification from analytics | Low | Medium | Low | PostHog IP truncation, pseudonymous IDs, 13-month retention | Low |

## 5. Consultation

- Internal: founder + lead engineer + legal counsel (external retainer).
- External: external UK-qualified data protection counsel review pre-launch (in scope).
- Data subjects: privacy notice, contact form on /privacy and /legal/privacy-uk for
  questions.

## 6. Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Project lead | [TBD] | [DATE] | __________ |
| DPO / privacy lead | [TBD] | [DATE] | __________ |
| Founder | [TBD] | [DATE] | __________ |

## 7. Review

- Triggers: new processor, new data category, new jurisdiction, material complaint, ICO
  guidance change.
- Default cadence: every 12 months.
