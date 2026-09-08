# Privacy Policy v2 — Multi-Geo (DPDP + GDPR + CCPA + UK/CA/AU)

> # ⚠ PENDING OWNER SIGN-OFF — DO NOT PUBLISH THIS POLICY
>
> **Added 2026-09-08 (`OPS-10`).** This is a **Privacy Policy destined for publication**
> under five regimes (DPDP, GDPR, UK GDPR, CCPA, PIPEDA/Privacy Act). A data-residency
> sentence in it is a **representation to every reader and every regulator**, not a
> documentation detail. This document previously warranted *“India servers (Mumbai)”* and
> named **Stripe** as a US processor. Both were false.
>
> An automated correction pass on 2026-09-02 restated §5 to match the repository.
> **That restatement has not been reviewed or approved by the owner, and until it is,
> every word of the surrounding text is provisional — including the corrected §5.**
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

> **OPS-10 correction (2026-09-02).** §5 of the draft below asserted *"India
> servers (Mumbai)"* and named *Stripe* as a US processor. Both are false: the
> application and API run on Render `oregon`, US West (`render.yaml:15`, `:56`)
> — there is no India server and no Mumbai region — and the Stripe rail was
> removed on 2026-08-11 (`apps/api/src/lib/env.ts:45-46`), so listing it
> disclosed a processor that receives no personal data. This is a Privacy
> Policy destined for publication under five regimes; a residency sentence in
> it is a representation to every reader. §5 is restated below as what the
> repository proves. Do not substitute a region that has not been verified —
> the Supabase region is genuinely unknown and is marked `[verify]`.
> Ground truth: `render.yaml`, `docs/runbooks/disaster-recovery.md`.

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
- Application + API servers: Render `oregon` region, US West (render.yaml:15, :56).
  There is NO India-hosted server and NO Mumbai region. Personal data is
  processed outside India today — say so; do not claim the opposite.
- Database: Supabase Postgres, region [verify] — not recorded in the repository.
  Read it from the Supabase dashboard before this policy is published.
- Standby / replica: NONE in any geography.
- US-based processors (Resend, Anthropic) — under SCC equivalent
  [Stripe removed 2026-08-11 with the Stripe rail; Razorpay (India) is the only
  payment processor. WhatsApp is Meta's Cloud API (US). PostHog is Hungary + US.]

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
