# B2B Temple Chain Onboarding Runbook

> **Item:** R-Q4-S-006 — Anchor chain 5 temples live + custom branding by Nov 30 2026
> **Target KPI:** `b2b_chain_temples_live = 5` (queried via `SELECT COUNT(*) FROM temples WHERE chain_id IS NOT NULL AND whitelabel_status = 'live' AND went_live_at >= '2026-10-01'`)
> **Owner split:** Founder owns relationship + KYC sign-off; Engineering owns subdomain + sub-merchant + branding deploy.

---

## 0. Scope

This runbook covers the **5-temple anchor chain** rollout under Q4. It is intentionally lean — one chain HQ + 5 satellite temples — to validate the white-label flow before expanding to a 20-temple SLA.

Per-temple deliverables:

1. Dedicated subdomain `<temple-slug>.darshya.online` w/ valid SSL.
2. Custom logo + brand color theme (saffron variant per chain palette).
3. Razorpay sub-merchant account for direct payouts (skips 7-day platform escrow).
4. Temple-portal seat for chain HQ admin + each temple manager.
5. KYC docs collected + verified before go-live.

---

## 1. Pre-onboarding checklist (Founder)

For each chain prospect, founder must collect **before** kicking eng:

- [ ] Chain HQ legal entity name + GSTIN + PAN
- [ ] 5 temple shortlist w/ slug suggestions (`<chain>-<city>` format e.g. `iskcon-bengaluru`)
- [ ] Per-temple bank account details (account #, IFSC, beneficiary name) for Razorpay sub-merchant KYC
- [ ] Per-temple authorised signatory contact (name, phone, email)
- [ ] Brand assets: logo (SVG preferred, min 512×512 PNG fallback), primary color hex, optional secondary
- [ ] Signed MSA + commission schedule (default 20% platform commission, negotiable down to 15% for 5+ temple commit)
- [ ] Founder-led intro call w/ chain regional head (links to R-Q4-SA-001 anchor partnership)

---

## 2. Engineering provisioning sequence (per temple, ~45 min)

### 2.1 Database seed

```sql
-- Create chain_id if first temple in chain
INSERT INTO temple_chains (id, name, hq_contact_email, commission_pct)
VALUES (gen_random_uuid(), 'ISKCON Bengaluru Region', 'admin@iskconblr.org', 18.0)
RETURNING id;

-- Attach temple to chain + mark whitelabel pending
UPDATE temples
   SET chain_id = $1,
       whitelabel_status = 'pending_branding',
       brand_primary_color = '#E16318',
       brand_logo_url = NULL  -- filled in 2.3
 WHERE slug = 'iskcon-bengaluru-mahalakshmi';
```

> **Schema dependency:** Requires `chain_id`, `whitelabel_status`, `went_live_at`, `brand_primary_color`, `brand_logo_url` columns on `temples` + a `temple_chains` table. Migration tracked under R-Q4-S-006-schema (founder must approve before run; ensure-schema.ts replay block exists for Render self-heal).

### 2.2 Subdomain provisioning (Cloudflare API)

```bash
# Requires CF_API_TOKEN w/ Zone:Edit on darshya.online
SLUG="iskcon-bengaluru-mahalakshmi"
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"CNAME\",
    \"name\": \"${SLUG}\",
    \"content\": \"darshya.online\",
    \"proxied\": true,
    \"comment\": \"R-Q4-S-006 chain temple subdomain\"
  }"
```

SSL: CF Universal SSL covers `*.darshya.online` automatically — verify w/ `curl -sI https://${SLUG}.darshya.online | grep -i strict-transport`. If 525/526 error, check CF Pages custom domain binding for the apex.

Verify subdomain routes to white-label home (uses `apps/web/middleware.ts` host-based rewrite to `/temple/${slug}` — confirm middleware ships before adding first chain temple).

### 2.3 Razorpay sub-merchant KYC flow

> **Founder-blocker:** KYC documents must be uploaded by chain HQ in Razorpay partner dashboard. Engineering only wires the account ID after KYC verified.

1. Founder shares chain HQ partner login (Razorpay Partner Account → Sub-merchants → Add new).
2. Chain admin uploads: PAN, GSTIN, cancelled cheque, address proof, MOA/AOA, signatory KYC.
3. Razorpay verification 1–3 business days. Webhook to `/api/v1/webhooks/razorpay/sub-merchant-kyc` updates `temples.razorpay_sub_merchant_id` + flips `whitelabel_status` from `pending_kyc` to `kyc_verified`.
4. Engineering smoke test: `pnpm tsx scripts/sales/test-sub-merchant-payout.ts <temple-slug>` — issues a ₹1 test booking + checks payout settles directly to sub-merchant within 60 sec (vs T+7 platform escrow).

### 2.4 Brand asset deploy

1. Upload logo to Supabase Storage bucket `temple-branding/` w/ filename `<slug>-logo.svg`.
2. Update `temples.brand_logo_url` to public URL.
3. Verify on subdomain — `<slug>.darshya.online` header should show custom logo instead of Darshya wordmark.
4. CF Pages purge cache for the subdomain: `curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" -H "Authorization: Bearer ${CF_API_TOKEN}" -d '{"hosts":["<slug>.darshya.online"]}'`

### 2.5 Temple-portal seat provisioning

Use existing `POST /api/v1/admin-temples/:templeId/grant-portal-seat` endpoint w/ chain HQ admin email + each temple manager email. Sends invite via Resend; recipient sets password + 2FA on first login.

---

## 3. Go-live gate (Founder sign-off)

Before flipping `whitelabel_status` to `live` + stamping `went_live_at`:

- [ ] Subdomain loads w/ valid SSL (curl 200, HSTS header present)
- [ ] Custom logo visible in header + favicon
- [ ] First test booking placed by chain HQ → Razorpay sub-merchant payout received within 60 sec
- [ ] Temple manager can log into temple-portal + see only own temple data (RLS verified)
- [ ] Video proof upload flow tested end-to-end (mandatory per business rule #1)
- [ ] Founder verbal sign-off w/ chain regional head on call (recorded)

Flip live:

```sql
UPDATE temples
   SET whitelabel_status = 'live',
       went_live_at = NOW()
 WHERE slug = $1
   AND whitelabel_status = 'kyc_verified';
```

KPI auto-increments: `b2b_chain_temples_live` in next manual KPI sync.

---

## 4. Rollback / kill-switch

If a chain temple needs to be taken offline (KYC revoked, payment dispute, chain HQ pulls out):

```sql
UPDATE temples
   SET whitelabel_status = 'paused',
       paused_at = NOW(),
       pause_reason = $reason
 WHERE slug = $1;
```

Subdomain auto-redirects to `darshya.online/temple/${slug}` w/ "Temporarily unavailable" banner via middleware check on `whitelabel_status`. Existing bookings honoured; new bookings blocked. Re-enable by flipping back to `live`.

---

## 5. Free-tier cost impact

Per chain temple add:

| Resource | Add per temple | Q4 budget remaining headroom |
|---|---|---|
| CF DNS records | 1 CNAME | unlimited free tier |
| CF Pages requests | +~10k/mo per temple | 100k/day plan covers 5 chains |
| Supabase rows | +~500/mo per temple | <1% impact |
| Razorpay sub-merchant | 0 (no fee, payout split) | n/a |
| Resend invites | 2 per temple (HQ + manager) | within 100/day |

**5 temples total expected impact:** negligible across all free tiers.

---

## 6. Founder action checklist (recap)

The founder is on the critical path for the **per-temple intro + KYC + sign-off** loop. Engineering cannot autonomously close this item.

Per temple (5×):

1. Intro call w/ chain regional head (R-Q4-SA-001 dep)
2. Collect KYC docs + brand assets + bank details
3. Approve Razorpay sub-merchant KYC submission in partner dashboard
4. Verify go-live gate checklist (Section 3)
5. Stamp `whitelabel_status = 'live'` via admin UI or SQL

Expected wall-clock per temple: ~3-5 business days (KYC turnaround drives critical path).

---

## 7. Status tracking

Live status visible at:

- `/admin/b2b-onboarding` (admin UI — built under this item)
- `SELECT slug, whitelabel_status, chain_id, went_live_at FROM temples WHERE chain_id IS NOT NULL ORDER BY went_live_at DESC NULLS LAST;`
- Weekly digest agent surfaces chain rollout progress under R-Q4-S-006 section.

---

## 8. References

- `docs/cto/R-Q3-E-007-handoff.md` — B2B Temple SaaS API (read-only feeds for chain HQ dashboards)
- `apps/web/middleware.ts` — host-based subdomain rewrite (must support chain whitelabel hosts)
- `apps/api/src/routes/admin-temples.ts` — temple CRUD + portal seat grant
- `scripts/issue-b2b-key.ts` — bootstrap B2B API key for chain HQ programmatic access
- `R-Q4-SA-001` — Anchor chain partnership (founder-led; supplies regional head intros)
