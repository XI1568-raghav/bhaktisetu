# Corporate CSR Donation Match Program

Corporate accounts double-match individual devotee donations to verified gaushalas. Drives donor engagement (impact 2×), corporate gets 80G receipt + brand visibility.

## How it works

1. Corporate enrolls via `POST /api/v1/csr-match/enroll` (or web form `/csr/enroll`).
2. Admin approves account → `is_active = true`.
3. Each subsequent devotee donation triggers `maybeMatchDonation()` → checks active sponsors with remaining monthly cap → creates `csr_match_records` row → bumps sponsor's `monthly_used_inr`.
4. Daily cron settles pending matches → corporate invoiced for cumulative match amount → 80G receipt issued.

## Match parameters

- `match_ratio`: default 1.0 (1:1 match). Range 0.5-5.0.
- `monthly_cap_inr`: default ₹100,000. Resets first of each month.
- `gaushala_filter`: optional list of `gaushala_id`s. Empty = all gaushalas.

## Endpoints

### Public

`POST /api/v1/csr-match/enroll` — corporate signup form (no auth).

### Authenticated

`GET /api/v1/csr-match/me` — current corporate's dashboard (matches by `contact_email == currentUser.email`).

### Admin

`GET /api/v1/csr-match/admin/list` — list all corporate accounts.
`POST /api/v1/csr-match/admin/:id/active` — activate/deactivate.

## Schema (raw SQL — no Prisma migration)

```
csr_corporate_accounts
  id, name, contact_email, gstin, pan, match_ratio, monthly_cap_inr,
  monthly_used_inr, reset_date, gaushala_filter (JSON list), is_active, created_at

csr_match_records
  id, corporate_id, donation_id, donor_user_id, gaushala_id,
  original_amount_inr, match_amount_inr, status (pending|paid|skipped_capped),
  created_at, paid_at
```

## Pilot pricing

Match capability free for first 5 sponsors. Beyond that, ₹5,000/mo platform fee per active sponsor + 2% transaction fee on matched amount.

## Compliance

- Each match generates separate 80G receipt for corporate (PAN required).
- GSTIN required for invoicing.
- Annual statement to sponsors via existing donations CSV export (Layer ANP).
