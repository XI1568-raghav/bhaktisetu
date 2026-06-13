# GDPR Compliance — UK NRI Launch

> **Roadmap item**: R-Q3-L-002 (P0) · **Authored**: 2026-06-13 · **Depends on**: R-Q3-G-001 UK launch

## Goal

Q3 ship GDPR + UK DPA compliance for UK NRI launch. Cookie banner + DPIA + DSR endpoints + lawful basis docs.

## Required artifacts

| Artifact | File | Purpose |
|---|---|---|
| Cookie banner | apps/web/components/CookieBanner.tsx | EU/UK consent CMP |
| DPIA | docs/legal/dpia-uk-launch.md | Data Protection Impact Assessment |
| DPA | docs/legal/data-processing-agreement.md | Vendor agreements (Resend, Razorpay, Stripe) |
| ROPA | docs/legal/records-of-processing-activities.md | Per GDPR Art 30 |
| Privacy policy UK | apps/web/app/legal/privacy-uk/page.tsx | UK-specific addendum |
| DSR endpoints | per R-Q2-L-003 DSAR spec | export/delete/correct |

## Cookie banner UX

- Categories: Essential (always on), Analytics (PostHog), Marketing (Google Ads pixel)
- Reject-all CTA same size as Accept-all (UK ICO requires)
- Granular toggle per category
- Re-prompt every 12 months OR after material policy change

## Lawful basis matrix

| Processing | Basis | Justification |
|---|---|---|
| Account signup | Consent (opt-in) | User initiated |
| Puja booking | Contract | Service delivery |
| Email transactional | Contract | Order confirmation |
| Email marketing | Consent | User opt-in toggle |
| Analytics | Consent | Cookie banner |
| Pandit KYC | Legitimate interest | Trust + safety |

## Engineering tickets

- R-Q3-L-002a: Cookie banner component + storage
- R-Q3-L-002b: 4 legal doc drafts
- R-Q3-L-002c: UK-specific privacy policy page
- R-Q3-L-002d: ICO registration (£40-£60/yr)

## Closes

R-Q3-L-002 — spec shipped.
