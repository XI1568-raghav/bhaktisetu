# Records of Processing Activities (ROPA) — Article 30 GDPR

> **Roadmap item**: R-Q3-L-002 · **Authored**: 2026-06-14 · **Owner**: legal
> **Review cadence**: quarterly · **Last review**: 2026-06-14
>
> **OPS-10 correction (2026-09-02).** RPA-02 and RPA-03 recorded *Stripe (USA)*
> as a recipient and as the basis of an outside-UK/EEA transfer under SCCs. The
> Stripe rail was removed on 2026-08-11, so this Article 30 record disclosed a
> processor that receives no personal data, while omitting the transfer that
> does occur — the application and API run in Render `oregon` (US West),
> `render.yaml:15` and `:56`. Both rows are restated below. No executed SCCs
> are recorded anywhere in this repository; every transfer mechanism is marked
> **[verify]** and the owner must confirm it before this record is filed or
> relied on.

## Controller details

- **Name**: Bhaktisetu Technologies Pvt Ltd (Darshya)
- **Registered office**: [PENDING — Bangalore, India]
- **Representative in the UK**: [PENDING per UK GDPR Art 27 — required if no EU/UK establishment]
- **DPO / contact**: privacy@darshya.online

## Processing register

### RPA-01 — Account management

| Field | Detail |
|---|---|
| Purpose | Create and operate user accounts (devotee, pandit, temple manager, etc.) |
| Lawful basis | Contract (Art 6(1)(b)) |
| Data categories | Name, email, phone, hashed password, role assignments |
| Data subjects | All registered users |
| Recipients | Internal staff; Resend (transactional email); Supabase (DB) |
| Transfers outside UK/EEA | India (controller home), USA (Resend, Supabase) — SCCs |
| Retention | Account lifetime + 30 days post deletion request |
| Security | TLS, AES-256 at rest, bcrypt password hashing, MFA for admin |

### RPA-02 — Puja and darshan bookings

| Field | Detail |
|---|---|
| Purpose | Process puja bookings, store video proof, send confirmations |
| Lawful basis | Contract (Art 6(1)(b)) |
| Data categories | Booking number, puja type, scheduled date, devotee details, video proof URL |
| Data subjects | Devotees, NRI gift senders, gift recipients |
| Recipients | Pandits (assigned booking only); temples; Razorpay; Resend |
| Transfers outside UK/EEA | USA — application + API servers run in Render `oregon`, US West (`render.yaml:15`, `:56`), and Resend is a US processor. Transfer mechanism **[verify]** before filing: no executed SCCs are recorded in this repository. Stripe was removed 2026-08-11 and must not be listed. |
| Retention | 7 years (Indian tax law) for invoices; video proof 90 days then archived |
| Security | TLS, signed URLs for video, access-control on pandit portal |

### RPA-03 — Payments

| Field | Detail |
|---|---|
| Purpose | Take payment, issue receipts, handle refunds |
| Lawful basis | Contract (Art 6(1)(b)); legal obligation for invoicing (Art 6(1)(c)) |
| Data categories | Amount, currency, last4 of card, billing address, refund history |
| Data subjects | All paying customers |
| Recipients | Razorpay (India), our finance team, tax authorities |
| Transfers outside UK/EEA | USA — payment metadata is processed on the API in Render `oregon`, US West (`render.yaml:15`). Transfer mechanism **[verify]**. Stripe was removed 2026-08-11; it receives no personal data and must not be recorded as a recipient or a transfer destination. |
| Retention | 7 years (Indian Income Tax Act) |
| Security | PCI-DSS via processor; no full card data stored on our infra |

### RPA-04 — Marketing email and WhatsApp

| Field | Detail |
|---|---|
| Purpose | Festival reminders, new puja announcements, NRI offers |
| Lawful basis | Consent (Art 6(1)(a)); withdrawable any time |
| Data categories | Email, phone, devotional preferences, last-engagement timestamp |
| Data subjects | Users who opted in |
| Recipients | Resend, Twilio / WhatsApp Cloud API |
| Transfers outside UK/EEA | USA (Resend), Ireland (Meta WhatsApp) — SCCs / adequacy |
| Retention | Until consent withdrawn + 12 months suppression list (to honour opt-out) |
| Security | One-click unsubscribe in every email, opt-out keyword for WhatsApp |

### RPA-05 — Analytics and product telemetry

| Field | Detail |
|---|---|
| Purpose | Improve product, measure feature adoption, debug |
| Lawful basis | Consent via cookie banner (PECR / UK ICO) |
| Data categories | Pseudonymised user ID, page views, clicks, device type, country |
| Data subjects | Visitors who accepted analytics cookies |
| Recipients | PostHog (EU region), Cloudflare Web Analytics |
| Transfers outside UK/EEA | None for PostHog (EU); Cloudflare is global |
| Retention | 13 months |
| Security | IP truncation, no PII fields, opt-out honoured by cookie banner |

### RPA-06 — Pandit KYC

| Field | Detail |
|---|---|
| Purpose | Verify pandit identity for trust, safety, and payout |
| Lawful basis | Legitimate interest (Art 6(1)(f)); legal obligation for payouts (Art 6(1)(c)) |
| Data categories | Name, Aadhaar last4, PAN, bank IFSC + last4, address proof image |
| Data subjects | Pandits, astrologers, gaushala managers, store owners |
| Recipients | Internal verification team; Razorpay (for payouts) |
| Transfers outside UK/EEA | None |
| Retention | Pandit lifetime on platform + 8 years post-offboarding (DGFT/PMLA-aligned) |
| Security | Encrypted at rest, access restricted to verification team, full audit log |

### RPA-07 — Customer support

| Field | Detail |
|---|---|
| Purpose | Resolve queries, complaints, disputes |
| Lawful basis | Contract (Art 6(1)(b)); legitimate interest (Art 6(1)(f)) |
| Data categories | Email, ticket history, transcripts |
| Data subjects | Anyone who contacts support |
| Recipients | Support staff, escalation engineers |
| Transfers outside UK/EEA | None |
| Retention | 36 months from last contact |
| Security | Role-based access, redaction tool for sensitive replies |

## Data subject rights — operational SLA

| Right | SLA |
|---|---|
| Access (Art 15) | 30 days |
| Rectification (Art 16) | 14 days |
| Erasure (Art 17) | 30 days, subject to legal-hold exceptions |
| Restriction (Art 18) | 14 days |
| Portability (Art 20) | 30 days, JSON export |
| Objection (Art 21) | Immediate for marketing; 14 days for analytics |

All requests via privacy@darshya.online or in-app account settings.

## Breach notification

- Internal detection: PagerDuty / on-call.
- Notify ICO within 72 hours where there is risk to rights and freedoms.
- Notify affected data subjects without undue delay where the risk is high.

## Review log

| Date | Reviewer | Change |
|---|---|---|
| 2026-06-14 | legal agent | Initial ROPA per R-Q3-L-002 |
