# Astrologer onboarding checklist — R-Q1-S-007

> **Audience**: founder + sales rep (the human running outreach). · **Date**: 2026-06-12 · **Goal**: 10 verified+active astrologers in DB by Jan 31, each with KYC + sample reading + price/min set + Aadhaar payout gate active.

## Pre-step (per cycle, founder)

- [ ] Approve outreach template in `scripts/sales/outreach/astrologer-v1.md`
- [ ] Verify `ADMIN_OPS_TOKEN` is set in Render env (for admin tool flip — see Step 4 gap below)
- [ ] Verify `RESEND_API_KEY` is set (for confirmation emails — env-or-noop)
- [ ] Verify schema gaps from `docs/sales/astrologer-schema-gap-2026-06-12.md` are either resolved OR have a noop fallback wired (queue item does NOT ship migration)

## Per-astrologer pipeline

### Step 1 — First contact (sales rep)

- [ ] Pick next prospect from `data/sales/leads-astrologers-2026-06-12.csv` where `outreach_status = NEW`
- [ ] Verify `public_profile_url` returns 200 (not parked / dead)
- [ ] Skim public material for medical / legal / financial claims → if found, mark `outreach_status = DECLINED` and skip
- [ ] Personalise WhatsApp template (or email fallback) per `scripts/sales/outreach/astrologer-v1.md`
- [ ] Send. Flip CSV `outreach_status` → `SENT_DAY_0`
- [ ] Calendar reminder: follow-up at +3d (WhatsApp) or +7d (email) if no reply
- [ ] On reply → schedule 15-min call

### Step 2 — Sample reading submission (astrologer)

- [ ] Astrologer records 5-min sample reading (any topic — career / relationship / health-NON-medical / spiritual)
- [ ] Uploads to YouTube as **unlisted** OR Google Drive share-link
- [ ] Sends URL to sales rep via WhatsApp / email
- [ ] Sales rep reviews:
  - [ ] Audio + video clear, language matches CSV `languages`
  - [ ] No medical / legal / financial diagnosis given
  - [ ] No defamation of other astrologers / traditions
  - [ ] Tone matches devotional + respectful brand
- [ ] If REJECTED → polite decline + reason. Flip CSV → `DECLINED`
- [ ] If APPROVED → proceed Step 3

### Step 3 — KYC (astrologer)

- [ ] Astrologer hits existing provider KYC flow: **POST `/api/v1/provider-kyc/`** (authenticated as astrologer role)
  - Note: There is **no dedicated `/astrology/kyc-init` endpoint** today — the existing `provider-kyc` flow handles all provider roles (pandit / astrologer / wellness / etc). If a dedicated astrologer-friendly entry surface is needed, that is a separate eng item.
- [ ] DigiLocker pull executes (no document upload from astrologer side)
- [ ] On success: backend should flip `aadhaar_verified = true` once schema gap closed (see schema-gap doc). Until then, manual ops flip required.
- [ ] Astrologer sets `price_per_minute` via existing astrologer portal page

### Step 4 — Admin approval (founder)

- [ ] Founder reviews the astrologer profile end-to-end:
  - [ ] Sample reading URL stored against the profile
  - [ ] KYC verified
  - [ ] Price set within ₹50–₹150 typical range
  - [ ] Languages + specialization match CSV
- [ ] Founder flips `approved = true` via admin tool
  - **GAP**: Verify the admin UI for this exists in `apps/web/app/admin/*`. If missing, founder uses direct SQL via Supabase Studio:
    ```sql
    UPDATE astrologer_profiles SET approved = true WHERE id = 'UUID';
    ```
  - File a Q-IT slot item if a proper admin tool is needed before scale (>5 onboards/week).
- [ ] Astrologer appears in public `/astrology` listing on next ISR refresh

### Step 5 — First payout gate (founder + finance)

- [ ] Before first payout cycle for this astrologer:
  - [ ] Confirm `aadhaar_verified = true` (Aadhaar payout gate per business rule #4 enforced)
  - [ ] Confirm `payout_blocked = false` (no ops hold)
  - [ ] Confirm bank-detail / UPI ID captured (existing payout flow)
- [ ] If `aadhaar_verified = false` → astrologer blocked from receiving payout until they complete KYC. Inform via WhatsApp.
- [ ] Flip CSV `outreach_status` → `CONVERTED` (this is the success terminal state)

## KPI tracking

| Metric | Cycle target | How to read |
|---|---|---|
| Prospects sent | 25 | `data/sales/leads-astrologers-2026-06-12.csv` rows where `outreach_status != NEW` |
| Replies | 10 | rows where `outreach_status IN (CONVERTED, DECLINED, REPLIED_*)` |
| Onboarded (sample reading reviewed) | 7 | rows where status reached Step 3 |
| Verified active in DB | 10 | `SELECT COUNT(*) FROM astrologer_profiles WHERE approved = true` (once active column exists, `AND active = true`) |

## Tracking file

The CSV at `data/sales/leads-astrologers-2026-06-12.csv` is the live tracker. Update `outreach_status` per prospect. Lifecycle states:

```
NEW → SENT_DAY_0
SENT_DAY_0 → REPLIED | NO_REPLY_FOLLOWUP_1 | DECLINED | DEAD
NO_REPLY_FOLLOWUP_1 → REPLIED | NO_REPLY_FOLLOWUP_2 | DEAD
REPLIED → IN_CONVERSATION → SAMPLE_RECEIVED → KYC_PENDING → KYC_DONE → CONVERTED | DECLINED
```

## Out of scope for this queue item (founder action required)

1. **Pune temples roadmap item** — briefing/repo mismatch. R-Q1-S-007 in repo = astrologers. Suggest a new ID (R-Q1-S-008 or next free slot) for the Pune temple work.
2. **Admin tool to flip `approved=true`** — verify or file separate IT roadmap item.
3. **Aadhaar payout gate wiring** — schema gap blocks this until migration ships.
4. **Outreach template approval** before any send.
5. **`ADMIN_OPS_TOKEN` + `RESEND_API_KEY`** set in Render (likely already done — verify per ROADMAP).
