# Privacy Policy v2 — Multi-Geo (DPDP + GDPR + CCPA + UK/CA/AU)

> **Roadmap item**: R-Q4-L-001 (P0) · **Authored**: 2026-06-13 · **Extends**: docs/legal/dpdp-compliance-audit-2026-06.md

## Goal

Bhaktisetu serves devotees across IN + EU + US + UK + CA + AU. Each geo has distinct privacy regime. Privacy Policy v2 satisfies ALL.

## Geo regulation matrix

| Geo | Primary law | Key obligations | Bhaktisetu compliance status |
|---|---|---|---|
| India | DPDP Act 2023 | Notice + Consent + DSAR + DPO + retention | DPDP audit shipped (L-001-Q2); endpoints in dev (L-001-Q3) |
| EU + EEA | GDPR + ePrivacy | Same as DPDP + DPO + DPIA + CMP for cookies | Pending v2 |
| UK | UK GDPR (post-Brexit) | Aligned w/ EU GDPR, separate enforcement | Pending v2 |
| US (federal) | sectoral + state | CCPA (California), VCDPA (Virginia), etc. | Pending v2 |
| Canada | PIPEDA + provincial | Aligned EU GDPR-style | Pending v2 |
| Australia | Privacy Act 1988 + Australian Privacy Principles | Aligned EU GDPR-style | Pending v2 |

## Privacy Policy v2 structure

```
# Bhaktisetu Privacy Policy v2.0
> Effective: 2026-XX-XX. Last updated: 2026-XX-XX. Bhaktisetu Foundation (Section 8 India) is the Data Controller.

## 1. Geo applicability
Auto-detect by user IP / browser locale → show right policy variant. Default = DPDP-strictest.

## 2. What we collect
- Account data: phone, email, name, gotra, location
- Booking data: puja type, scheduled date, sankalp, payment
- Device data: IP (anonymized after 30d), user-agent
- Analytics: PostHog events (opt-in for EU users)

## 3. Purpose + legal basis (per regime)
[geo-aware variants]

## 4. Cookies + tracking
[CMP for EU users — Cookiebot or similar free tier]

## 5. Cross-border data transfer
- India servers (Mumbai)
- US-based processors (Stripe, Resend, Anthropic) — under SCC equivalent

## 6. Your rights (geo-specific)
- DPDP (IN): info / correction / erasure / withdraw / grievance
- GDPR (EU/UK): same + objection + portability
- CCPA (CA, US): right-to-know + delete + opt-out-of-sale + non-discrimination
- PIPEDA (CA): same + privacy challenge
- Privacy Act (AU): same + APP12 access

## 7. DPO + grievance contact
dpo@darshya.online + India DPO grievance officer name

## 8. Data retention per type
[table per DPDP audit + GDPR-aligned where stricter]

## 9. Children
No <18 by policy. If detected, account erased + parent notified.

## 10. Changes to policy
Notification via email + WhatsApp + in-app banner 30 days advance.

## 11. Effective date + version history
```

## Geo-aware CMP (Consent Management Platform)

For EU users: explicit cookie banner via Cookiebot (free tier ~1K MAU OR Klaro open-source self-host).

For non-EU: default acceptance acceptable but offer same opt-out for parity.

## Implementation tickets

- R-Q4-L-001a: write v2 Policy text (counsel-reviewed)
- R-Q4-L-001b: implement geo-detection + variant routing
- R-Q4-L-001c: integrate CMP (Klaro recommended self-host)
- R-Q4-L-001d: GDPR DPIA for AI Pandit feature (special-category data)
- R-Q4-L-001e: CCPA do-not-sell flag (toggle in user settings)

## Founder action

- [ ] Counsel engagement: India counsel + EU counsel (or India counsel w/ EU expertise) for v2 review
- [ ] Approve geo-detection logic
- [ ] DPIA for AI Pandit (sensitive data)
- [ ] Schedule annual policy review

## Closes

R-Q4-L-001 — spec shipped.
