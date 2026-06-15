# R-Q3-G-001 — UK launch (handoff)

> Status: UK landing page + GBP `formatPrice` path + sample-pricing preview shipped (scaffold). Stripe NRI activation for UK GBP rail (founder action U2), 15 UK pandits onboarding (R-Q3-S-006), GDPR cookie banner (R-Q3-L-002), and 1.5K paid GBP users = founder-action-required. Engineering surface ready to receive UK traffic; live KPI = 0 until founder unblocks Stripe GBP.

## KPI

- Metric: `uk_paid_users` (distinct paid GBP users)
- Target: 1500 by end-Q3 2026
- Current: 0
- Source: Supabase — `SELECT COUNT(DISTINCT user_id)::int FROM bookings WHERE payment_currency = 'GBP' AND payment_status = 'PAID' AND created_at >= '2026-07-01';`

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | Cannot agent-assign — founder action U2 (Stripe NRI activation w/ UK GBP) | ⏳ | Founder |
| 2 | Stripe GBP rail live + Stripe Elements UK card capture at `/pujas/[slug]/book?cc=GB` | ⏳ | Blocked on (1) |
| 3 | 1500 distinct paid GBP users in Supabase by Q3 close (London/Birmingham/Leicester top 3) | ⏳ | Demand activation post (1)+(2) |
| 4 | UK NRI 9-10x domestic pricing rule enforced (`formatPrice` GBP path in `apps/web/lib/pricing.ts`) | ✓ shipped | This batch |
| 5 | GDPR compliance + DPA + cookie banner shipped per R-Q3-L-002 | ⏳ | Tracked under R-Q3-L-002 |
| 6 | UK landing page (`/uk`) w/ 3-hub focus + GBP pricing preview + email-capture | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/app/uk/page.tsx` — NEW UK launch landing.
  - Hero w/ "London / Birmingham / Leicester" badge + GBP CTA (`/pujas?cc=GB`) + Watch live darshan CTA.
  - 6 benefit cards (GBP via Stripe / Indian temple bookings / GMT-aware aarti / video proof / 80G receipts / WhatsApp UK-tz support).
  - 3 UK hub cards (London / Birmingham & West Midlands / Leicester) w/ population context + anchor mandirs as community context (NOT confirmed partners — disclosure inline).
  - 5-row sample-pricing table showing domestic ₹ → UK NRI £ side-by-side using new `gbpFromInr()` helper (10x INR @ £1≈₹105 ref FX, round to nearest £5).
  - Compliance section: UK GDPR / DPA / Stripe SCA / 80G (no Gift Aid) / video proof.
  - Email capture (`source="uk-landing"`).
  - `Service` schema.org JSON-LD w/ `areaServed: United Kingdom`, `priceCurrency: GBP`, `availability: PreOrder`, multi-lang.
  - hreflang alternates → `en-GB` canonical, `en-IN` `/`, `hi-IN` `/hi`.
  - Edge runtime, revalidate 86400.
- `apps/web/lib/pricing.ts` — `formatPrice()` extended w/ `"GBP"` case (uses `en-GB` locale → `£` symbol). NEW `gbpFromInr(inrAmount, multiplier=10)` helper enforcing 9-10x NRI rule + £1≈₹105 ref FX, rounds to nearest £5 for clean checkout UX.
- `apps/web/app/sitemap.ts` — `/uk` priority 0.85 entry added.

## Sales / marketing tactics (per agent_brief + sibling Chennai handoff pattern)

1. **UK Hindu influencer collabs** — UK Gujarati / UK Tamil community YouTube + Instagram (founder warm contacts; outreach via R-Q3-M-009 channel).
2. **Geo-targeted Meta ads** — London Brent/Harrow/Wembley + Birmingham Handsworth/Smethwick + Leicester Belgrave Road. Budget allocation post Stripe GBP live (don't drive traffic to a checkout that 500s on GBP).
3. **UK temple community partnership outreach** — BAPS Neasden / Shri Venkateswara Balaji Tividale / Shree Sanatan Mandir Leicester (institutional outreach, founder-signed letter; cited as community context on `/uk`, NOT as confirmed partners).
4. **UK Tamil + Gujarati WhatsApp + Facebook groups** — Brent Hindu Society / Leicester Hindu Forum / UK Sanatan Mandir groups.
5. **Hindu Forum of Britain + National Council of Hindu Temples UK** — institutional umbrella outreach for cross-promotion.

## Founder action (BLOCKING — U2 + sibling deps)

1. **U2 Stripe NRI KYC for UK GBP** — submit Stripe business KYC including UK trading entity (LLP or Ltd) + UK bank account or India-incorporated entity routing GBP via Stripe India NRI rail. Until done, `/pujas?cc=GB` cannot complete a real GBP charge.
2. **R-Q3-S-006** — onboard 15 UK pandits or UK-aligned Indian pandits (KYC video + Aadhaar + UK-friendly time slots GMT/BST).
3. **R-Q3-L-002** — ship GDPR cookie banner + DPA template + `privacy@darshya.online` mailbox routing.
4. **Marketing activation post-Stripe-GBP-live**: UK influencer outreach + geo-targeted Meta ads (£800-1500 test budget, Brent + Belgrave Road + Handsworth pin codes).
5. **Quarterly FX review** — update `FX_INR_PER_GBP` const in `apps/web/lib/pricing.ts` (currently 105) each quarter or when spot drifts >5%.
6. Decision Agent KPI scrape `uk_paid_users` flips to live count after `bookings.payment_currency='GBP'` rows populate (post Stripe activation).

## Dependencies (HARD BLOCK)

- **R-Q2-G-006** — pre-req (per spec `depends_on`).
- **R-Q3-S-006** — 15 UK pandits onboarded.
- **U2** — Stripe NRI activation with UK GBP.

This item stays `in_progress` until U2 flips green AND R-Q3-S-006 ships AND R-Q3-L-002 ships. Engineering surface is ready to receive UK traffic; cannot complete a real GBP charge until U2.

## KPI query (Supabase)

```sql
SELECT COUNT(DISTINCT user_id)::int AS uk_paid_users
FROM bookings
WHERE payment_currency = 'GBP'
  AND payment_status = 'PAID'
  AND created_at >= '2026-07-01';
-- target: 1500 by end-Q3 2026
```

## Verify (post-deploy)

1. `curl -s -o /dev/null -w "%{http_code}" https://darshya.online/uk` — expect 200
2. `curl -s https://darshya.online/uk | grep -c "London / Birmingham / Leicester"` — expect ≥1
3. `curl -s https://darshya.online/uk | grep -c "£"` — expect ≥5 (sample-pricing table)
4. `curl -s https://darshya.online/uk | grep -c "GDPR"` — expect ≥1 (compliance section)
5. `curl -s https://darshya.online/sitemap.xml | grep -c "/uk"` — expect ≥1
6. (Post-U2) `curl -X POST https://api.darshya.online/api/v1/payments/create-intent -H 'Content-Type: application/json' -d '{"amount":2500,"currency":"GBP","pujaId":"rudrabhishek"}'` — expect 200 + Stripe clientSecret (not 4xx unsupported-currency)

## Sample GBP pricing (current `gbpFromInr` output)

Reference FX: £1 ≈ ₹105 (spot, 2026-06-15). Multiplier: 10. Round: nearest £5.

| Puja | Domestic ₹ | UK NRI £ |
|---|---|---|
| Rudrabhishek (Kashi Vishwanath) | ₹2,500 | £240 |
| Satyanarayan Katha | ₹1,500 | £145 |
| Lakshmi Puja (Diwali) | ₹2,100 | £200 |
| Mahamrityunjaya Jaap 11,000 | ₹5,500 | £525 |
| Shraadh Pitru Paksh | ₹3,100 | £295 |

Founder reviews `FX_INR_PER_GBP` quarterly in `apps/web/lib/pricing.ts`.

## Deviations from spec

- KPI cannot flip to live until founder unblocks U2 — status stays `in_progress` per KNOWN PITFALL doctrine (no auto-claim shipped on founder-blocked items).
- Anchor mandirs listed on `/uk` are well-known UK Hindu temples used as **community context** to ground the hub cards. Disclosure inline: "listed as community context, not as confirmed Darshya partners. Partnership outreach in progress." No fabricated endorsement.
- Sample GBP pricing uses a single shared reference FX (£1≈₹105) and 10x multiplier — real checkout will use Stripe FX at moment-of-charge ±5% disclosed inline.
- Did NOT touch `apps/api/src/routes/payments.ts` Stripe path — adding GBP `currency` enum requires Stripe activation first (the API will accept GBP via Stripe SDK natively once U2 done; no engineering change needed pre-activation).
- Did NOT create `/pujas?cc=GB` route variant — existing `/pujas` page already accepts query params; checkout-side GBP rendering needs follow-up batch once Stripe GBP rail live.
