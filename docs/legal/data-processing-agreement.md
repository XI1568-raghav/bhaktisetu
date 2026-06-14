# Data Processing Agreement (DPA) — Standard Template

> **Roadmap item**: R-Q3-L-002 · **Authored**: 2026-06-14 · **Owner**: legal
> **Status**: standard template — fill bracketed fields per vendor

## Parties

- **Controller**: Bhaktisetu Technologies Pvt Ltd (Darshya), CIN [PENDING], registered office [PENDING], India.
- **Processor**: [Vendor legal name], [registered office].

## 1. Subject matter

Processor processes Personal Data on behalf of Controller solely to provide the services
described in the master service agreement (the "Services") and as instructed by Controller.

## 2. Duration

Coterminous with the master service agreement. Survives for any retention period required
by law and ends with documented deletion or return of all Personal Data.

## 3. Nature and purpose of processing

| Service | Purpose |
|---|---|
| Resend | Transactional email (booking confirmations, OTP, video proof links) |
| Razorpay | Payment processing for domestic INR bookings |
| Stripe | Payment processing for NRI USD/GBP/EUR/AUD/CAD bookings |
| Cloudflare | CDN, edge caching, DDoS protection, web analytics |
| Render | Application hosting (apps/api) |
| Supabase | Managed Postgres database |
| PostHog | Product analytics (consented users only) |
| Twilio / WhatsApp | OTP and order updates |

## 4. Categories of data subjects

Devotees, pandits, temple managers, astrologers, gaushala managers, staff, NRI gift senders
and recipients, prospective customers (waitlist).

## 5. Categories of Personal Data

Identifiers (name, email, phone), authentication data, location (city), financial data
(invoice address, last4 of card via processor), devotional preferences (deity, puja history),
KYC data for pandits (Aadhaar last4, PAN), photographs (for video proof).

No special category data is intentionally collected. Religious affiliation is inferred from
service use and is treated under Art. 9(2)(d) GDPR as data manifestly made public by the
data subject through their choice to use a devotional service.

## 6. Processor obligations

1. Process Personal Data only on documented instructions from Controller.
2. Ensure personnel are bound by confidentiality.
3. Implement technical and organisational measures (TOMs) per Annex II.
4. Engage sub-processors only with Controller's prior general authorisation and a 30-day
   change notice.
5. Assist Controller in fulfilling data subject rights requests (access, rectification,
   erasure, portability, restriction, objection) within 7 calendar days.
6. Notify Controller of any Personal Data breach without undue delay and in any event
   within 24 hours of becoming aware.
7. Delete or return all Personal Data at end of services within 90 days.
8. Make available all information necessary to demonstrate compliance and allow for audits
   once per year on 30 days' written notice.

## 7. International transfers

Where Processor transfers Personal Data outside the UK / EEA / India, the transfer is made
under: (a) UK International Data Transfer Agreement (IDTA) or UK Addendum to EU SCCs;
(b) EU Standard Contractual Clauses (2021/914) modules 1 or 2 as applicable; and/or
(c) adequacy regulations.

## 8. Liability

Per master service agreement. Aggregate liability for breach of this DPA capped at fees
paid in the preceding 12 months, except for breaches of confidentiality, data security,
or wilful misconduct.

## 9. Governing law

This DPA is governed by the laws of India for Controller's primary jurisdiction. For UK
data subjects, the UK GDPR and DPA 2018 apply. Disputes resolved per master agreement.

---

## Annex I — Processing details

- **Purposes**: see Section 3.
- **Data subjects**: see Section 4.
- **Personal Data categories**: see Section 5.
- **Retention**: as defined in `docs/legal/records-of-processing-activities.md`.

## Annex II — Technical and organisational measures (TOMs)

1. **Encryption**: TLS 1.2+ in transit, AES-256 at rest for databases and backups.
2. **Access control**: role-based access, principle of least privilege, MFA for admins.
3. **Logging**: audit log of admin actions retained 12 months.
4. **Backup**: daily automated backups, 30-day retention, geo-redundant.
5. **Incident response**: 24/7 on-call, runbook at `docs/runbook/incident-response.md`.
6. **Vulnerability management**: weekly dependency scans, monthly patching cadence.
7. **Sub-processor management**: register at `docs/legal/sub-processors.md` (TBD).

## Annex III — Approved sub-processors

Per-vendor — Processor lists its sub-processors in this Annex. Controller may object
to new sub-processors within 14 days of notice.

## Signatures

| Party | Name | Title | Date | Signature |
|---|---|---|---|---|
| Controller | [TBD] | Director | [DATE] | __________ |
| Processor | [TBD] | [TBD] | [DATE] | __________ |
