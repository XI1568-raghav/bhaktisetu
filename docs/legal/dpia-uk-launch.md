# Data Protection Impact Assessment (DPIA) — UK NRI Launch

> # ⚠ PENDING OWNER SIGN-OFF — DO NOT FILE OR DISCLOSE
>
> **Added 2026-09-08 (`OPS-10`).** This is a **regulator-facing UK DPIA**. Its data-flow
> map is the artefact an ICO reviewer reads first, and every transfer conclusion and
> SCC/IDTA argument in it rests on that map. The previous version was wrong in five of
> seven hops, including warranting a **Mumbai primary + Singapore standby** topology and
> naming processors that receive no personal data — in a DPIA that is a **false
> disclosure to a regulator**, not a stale doc.
>
> An automated correction pass on 2026-09-02 rewrote §3. **That rewrite has not been
> reviewed or approved by the owner or by counsel. Until it is, the surrounding text is
> provisional and this DPIA must not be filed, disclosed, or relied on.**
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

> **OPS-10 correction (2026-09-02). The previous diagram was wrong in five of
> its seven hops and must not be shown to a regulator or a data subject.** A
> DPIA's data-flow map is the artefact an ICO reviewer reads first; every
> transfer conclusion in §4 risk 6 and every SCC/IDTA argument rests on it.
> What it asserted, and what the repository actually proves:
>
> | Removed hop | Reality |
> |---|---|
> | `Cloudflare Pages (edge)` serves the web tier | Pages has not been a hosting layer since 2026-07-08 (`cf-kill-zombie.yml`). Cloudflare is DNS + edge proxy only. |
> | `Render API (Mumbai)` | Render `oregon` region, US West — `render.yaml:15` (API), `:56` (web). Not India. |
> | `Supabase Postgres (Mumbai)` | Region is **not recorded anywhere in this repository**. Unknown, not Mumbai. |
> | `Stripe (USA) for payment` | The Stripe rail was removed on 2026-08-11 (`apps/api/src/lib/env.ts:45-46`; `createStripeOrder` and `handleStripeWebhook` deleted, `payment.service.ts:2506-2517`). Razorpay is the only payment processor. Naming Stripe disclosed a processor that receives no personal data. |
> | `Twilio (USA) for WhatsApp` | WhatsApp is **Meta's** WhatsApp Business Cloud API (`apps/api/src/lib/whatsapp.ts`). Twilio appears only as the SMS-OTP carrier Supabase would forward to, and that provider is not configured (phone OTP returns "Unsupported phone provider"). |
>
> The two hops that survived — Resend for email, PostHog for analytics — are
> unchanged, except that PostHog is **Hungary + US**, not EU-only.

The flow below is corrected. Do not restore a region, a host or a processor to
this diagram that is not verifiable in `render.yaml` or in `apps/api/src`.

```
User (UK) -> Cloudflare (DNS + edge proxy only) -> Render web + API, region `oregon` (US West)
                                                          |
                                                          +-> Supabase Postgres (region [verify] — not recorded in this repo)
                                                          +-> Razorpay (India) for payment  [Stripe removed 2026-08-11]
                                                          +-> Resend (USA) for email
                                                          +-> WhatsApp Business Cloud API, Meta (USA) for WhatsApp
                                                          +-> PostHog (Hungary + US) for analytics (consented)
```

**Transfer consequence that §4 risk 6 must be read against**: the application
tier is US-hosted, so UK personal data leaves the UK on the *first* hop, not
only at the processor edges. Any "data stays in India" or "EU-only analytics"
representation is false. The Supabase region must be read from the dashboard
and recorded here before this DPIA is signed off or filed.

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
