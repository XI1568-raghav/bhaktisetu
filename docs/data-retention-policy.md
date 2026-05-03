# Data Retention Policy (TD9)

> **Last refreshed**: 2026-05-02
> **Owner**: Sunil (Packer Speed proprietorship), proprietor as data controller under Indian DPDP Act 2023.
> **Companion doc**: `docs/backup-restore-runbook.md` (operational), `docs/auth-model.md` (PII surfaces).

This document defines what gets backed up, how long each data type is retained in production, and when it's purged. The retention windows below override default "keep forever" behaviour and are enforced via scheduled cleanup jobs (TD-future) plus this policy as the source of truth for legal/audit response.

## Principles

1. **Tax + legal first**: Anything that produces a financial obligation, an 80G receipt, or a KYC trace is retained for the **statutory minimum** (7 years for tax under Income Tax Act §44AA + Companies Act §128).
2. **Operational second**: Marketing/CRM data is retained for the **shortest window that supports the use case**.
3. **PII minimisation**: When a retention window expires, we **delete the row**, not anonymise — anonymisation under DPDP is contested. Hard delete is the safe path.
4. **User right to erasure**: A verified DPDP "right to erasure" request supersedes operational retention but **not** tax retention. We retain only the minimum legal record (booking number + amount + GSTIN match) and erase contact PII.

## Retention table

Windows are measured from the **last meaningful event** for that record (e.g. booking completion, lead last-touched).

| Data type | Prisma model(s) | Retention | Justification | Backup coverage |
|---|---|---|---|---|
| **Bookings + payment ledger** | `Booking`, `Payment`, `Refund` | **7 years** | Income Tax Act §44AA, GST Act §36 (records min 6y) — round up to 7y. | Full (R2 weekly + Supabase daily) |
| **80G receipts** | `Donation`, `Receipt80G` | **7 years** | Income Tax Act §80G(5) audit trail. | Full |
| **User accounts** | `User` (auth) | **Lifetime + 6mo grace** after explicit deletion request | Account history needed for refund disputes (1y RBI window) + booking trail. | Full |
| **KYC / Aadhaar verification artefacts** | `PriestProfile.aadhaarLast4`, verification timestamps | **7 years** post account closure | KYC retention under PMLA + UIDAI guidance. **Never store full Aadhaar** — only last 4 + verification status. | Full |
| **Bank account details (priest payouts)** | `PriestProfile.bankAccount*` | **7 years** post last payout | Same as above. Encrypted at rest. | Full |
| **Conversations / chat** | `Conversation`, `Message` | **1 year** post last message | Operational quality + dispute window. Beyond 1y, value drops to ~0. | Full while live; **purged by cleanup job** post-1y |
| **Live darshan recordings** | `IvsRecording` (R2 metadata) | **30 days** | Bandwidth + R2 cost. Highlights curated by editorial → permanent. | R2 only (not in pg dump) |
| **Video proof (puja completion)** | R2 keys via `Booking.videoProofUrl` | **3 years** | Booking dispute window + customer testimonial value. | R2 lifecycle separate from DB |
| **Outreach leads (CRM)** | `Lead`, `OutreachLog` | **2 years** post last touch | DPDP — no consented purpose beyond 2y for cold leads. | Full while live; purged post-2y |
| **Waitlist signups** | `Waitlist` | **1 year** post conversion or 6mo post abandon | Same as leads, shorter because lower-intent. | Full |
| **Analytics events (PostHog)** | External (PostHog) | **1 year** | PostHog free tier default. We don't replicate to our DB. | Out of scope |
| **Sentry errors** | External (Sentry) | **30 days (free tier)** | Sentry default. | Out of scope |
| **Email logs (Resend)** | External (Resend) | **30 days (free tier)** | Resend default. | Out of scope |
| **Server access logs (Render)** | External (Render) | **7 days (free tier)** | Render default. **Insufficient** for incident forensics — rotate to a longer-retained sink once on paid tier. | Out of scope |
| **Astrology cached results** | `HoroscopeCache`, panchang cache | **24 hours** | Daily-refreshed; older rows are useless. | Full while live |
| **Search index / pgvector embeddings** | `*.embedding` columns | **Lifetime of parent row** | Recomputed on row insert; deleted on row delete. | Full |
| **Soft-deleted rows** (`deletedAt IS NOT NULL`) | All tables with `deletedAt` | **30 days** then hard-delete | Allows accidental-delete recovery. After 30d, cleanup job removes. | Full |
| **Webhook payloads (Razorpay/Stripe raw)** | `WebhookEvent` | **90 days** | Reconciliation window + chargeback evidence. | Full while live; purged post-90d |
| **Notification logs (FCM, Resend)** | `NotificationLog` | **180 days** | Delivery dispute window. | Full while live; purged post-180d |

## What gets backed up

The weekly R2 dump (`apps/api/scripts/backup.mjs`) captures the **entire `public` Postgres schema**. That includes every model in the table above except those marked "External" or "R2 only".

### Explicitly NOT backed up by the weekly dump

- `auth.*` — Supabase managed; relies on Supabase's own daily backup.
- `storage.objects` — Supabase storage; relies on Supabase's own daily backup. R2 objects are independently durable (11 nines).
- IVS recordings, video proofs — live in R2 with their own lifecycle rules.
- PostHog / Sentry / Resend / Render logs — external SaaS, retained per their tier.

### How to restore in scope vs out of scope

| Need to recover | Source |
|---|---|
| Bookings, users, leads, content | R2 weekly dump or Supabase daily backup |
| User passwords / OAuth links | Supabase daily backup only |
| Uploaded video proofs | R2 directly (not the dump) |
| Live darshan recordings | R2 directly (lifecycle: 30d) |
| Customer support emails | Resend dashboard (30d) — escalate to user-side mailbox if older |

## Purge enforcement (current state)

As of 2026-05-02, the only **automated** retention cleanup live in production is:

- Astrology + panchang cache: 24h TTL via Redis EX.

All other windows are **policy-only** until a cleanup job is built. Open follow-ups:

- TD-future: cleanup-cron job for `Conversation`/`Message` >1y, `Lead`/`OutreachLog` >2y, `Waitlist` >1y, `WebhookEvent` >90d, `NotificationLog` >180d, soft-delete >30d.

Until that ships: in a DPDP "right to erasure" request, we **manually** delete the requesting user's PII via a one-shot Prisma script and document in `docs/erasure-log.md` (gitignored — sensitive).

## Subject access requests (DPDP §11)

A user may request a copy of their data. Procedure:

1. Verify identity via the email of record + OTP.
2. Run `apps/api/scripts/dsar-export.ts` (TD-future) → produces a JSON bundle of all rows where `userId = $X`.
3. Email the bundle from `support@darshya.online`. Log the request in `docs/dsar-log.md` (gitignored).
4. Respond within **30 days** (DPDP §11(1)).

## Right to erasure (DPDP §12)

1. Verify identity (same as above).
2. Determine which retention windows are tax-locked (bookings, 80G, payouts).
3. Hard-delete all NON-tax-locked rows.
4. For tax-locked rows: replace `email`, `phone`, `name`, `address` fields with `redacted-{userId}` placeholders, retain `bookingNumber + amount + paymentId + GSTIN` only.
5. Confirm completion via email.
6. Respond within **30 days**.

## Breach notification (DPDP §8(6))

If backup integrity is compromised (e.g. unauthorised R2 token use, Supabase project breach), notify:

1. **DPB India** within 72h via the Data Protection Board portal.
2. **Affected users** as soon as practicable.

See `docs/security-pass-2026-04-27.md` for the broader incident-response runbook.
