# Astrologer schema gap — R-Q1-S-007

> **Status**: FOUNDER ACTION REQUIRED · **Date**: 2026-06-12 · **Item**: R-Q1-S-007 (Onboard 10 verified astrologers)

The sales queue item requires onboarding flow + Aadhaar payout gate. Repo schema does not expose the columns the flow assumes. Sales queue scope is **research + content only** — schema migration MUST be a separate engineering item.

## Required columns vs current `astrologer_profiles`

| Spec column | DB column today | Gap | Suggested type |
|---|---|---|---|
| `verified` | `approved Boolean` | NAME ONLY — `approved` already exists. Either rename or accept `approved` as canonical and update spec. | n/a |
| `active` | (none — implied via `approved=true` + presence) | Consider adding `active Boolean @default(true)` so we can soft-deactivate without unapproving. | `Boolean` |
| `kyc_status` | MISSING | Required to track DigiLocker pull state. | `enum KycStatus { NONE PENDING VERIFIED REJECTED }` |
| `sample_reading_url` | MISSING | Pre-approval gate — must be unlisted YouTube / Drive link. | `String?` |
| `price_per_minute_inr` | `pricePerMinute Decimal(10,2)` | NAME ONLY — column exists, default ₹10 today. | n/a |
| `aadhaar_verified` | MISSING | **Launch blocker** — business rule #4 (Aadhaar gate before payout). | `Boolean @default(false)` |
| `payout_blocked` | MISSING | Manual ops override (fraud/dispute). | `Boolean @default(false)` |

## Recommended migration sketch (NOT shipped here)

```prisma
model AstrologerProfile {
  // ...existing...
  active             Boolean      @default(true)
  kycStatus          KycStatus    @default(NONE) @map("kyc_status")
  sampleReadingUrl   String?      @map("sample_reading_url")
  aadhaarVerified    Boolean      @default(false) @map("aadhaar_verified")
  payoutBlocked      Boolean      @default(false) @map("payout_blocked")
}

enum KycStatus {
  NONE
  PENDING
  VERIFIED
  REJECTED
}
```

Plus an `astrologer_kyc_events` audit table mirroring the existing `priest_payouts` pattern (see business rule #4 enforcement in `apps/api/src/services/priest-payouts.ts`).

## Downstream code that needs to know

1. `apps/api/src/routes/astrology.ts` — onboarding endpoints (`/kyc-init`, `/sample-reading`, status read)
2. `apps/api/src/services/*payout*` — add `aadhaarVerified` AND `!payoutBlocked` gate equivalent to priest payouts
3. `apps/web/app/astrology/page.tsx` — listing must filter `approved && active && !payoutBlocked`
4. `apps/web/app/admin/*` — admin tool to flip `approved=true` after manual review (see Founder action #2 in the queue spec)

## Verify command

```bash
pnpm tsx apps/api/scripts/verify/astrologer-schema-check.ts
```

Exits 1 if any column missing; exits 0 once migration ships.

## Founder action items (verbatim from queue spec)

1. Approve / counter the migration sketch above + ship as separate engineering roadmap item.
2. Verify the admin tool exists to flip `approved=true` per astrologer. If not, gap-ticket needed (likely R-Q1-IT-* slot).
3. **Aadhaar payout gate is a LAUNCH BLOCKER** — must be wired before first astrologer payout cycle.
4. Approve outreach templates in `scripts/sales/outreach/astrologer-v1.md` before any send.
5. Set `ADMIN_OPS_TOKEN` + `RESEND_API_KEY` (already set per ROADMAP if email-broadcast agent runs).
