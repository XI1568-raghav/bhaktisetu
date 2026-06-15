# R-Q3-G-002 — Canada launch (handoff)

> Status: SEO surface shipped (`/nri/ca` landing page + sitemap entry). Stripe CAD checkout rail + 1K paid users = founder-action-required. Engineering scaffold complete; KPI (`canada_paid_users` from `bookings.payment_currency = 'CAD'`) stays at 0 until activation gate U2 (Stripe CAD) flips and supply gate R-Q3-S-007 (10 Canada-based verified pandits) ships.

## KPI

- Metric: `canada_paid_users`
- Target: 1000 distinct paid CAD users by Q3 close
- Current: 0
- Source: Supabase
- Query:
  ```sql
  SELECT COUNT(DISTINCT user_id)::int AS value
  FROM bookings
  WHERE payment_currency = 'CAD'
    AND payment_status = 'PAID'
    AND created_at >= '2026-08-01';
  -- target 1000 distinct paid CAD users
  ```

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | Cannot agent-assign — founder action U2 (Stripe NRI activation w/ CAD) required before any Canada paid path lights up | ⏳ | Founder (Stripe Canada KYC + dashboard activation) |
| 2 | Stripe CAD rail live + Stripe Elements CA card capture on `/pujas/[slug]/book?cc=CA` | ⏳ | Engineering follow-up post-U2 (see "Engineering still owed" below) |
| 3 | 1000 distinct paid CAD users by Q3 close (Toronto/Vancouver/Brampton top 3 metros) | ⏳ | Marketing activation post supply + payments live |
| 4 | Canada NRI 9-10x domestic pricing rule enforced (`formatPrice` CAD path) | ⏳ | Engineering follow-up (currency type extension) |
| 5 | Depends on R-Q3-S-007 (10 Canada-based verified pandits onboarded) | ⏳ | Founder (supply funnel) |
| 6 | `/nri/ca` landing page indexed + 5xx-clean | ✓ shipped (this batch) | This batch |

## What shipped this batch

- `apps/web/app/nri/ca/page.tsx` — NEW Canada NRI landing page.
  - Hero copy targets Indo-Canadian devotees in Toronto, Vancouver, Brampton, Mississauga, Calgary, Edmonton, Montreal, Ottawa.
  - 6-card metro grid w/ Statistics Canada 2021 community-size figures (labeled as planning targets, not booking counts — per CLAUDE.md "no fabricated stats" rule).
  - 6 benefits cards (puja booking, live darshan, 80G receipts, IST/EST/PST scheduling, video proof, AI Pandit).
  - 6 founder-FAQ accordions covering "why Canada", "CAD checkout status", "are temples real", "Canadian tax (no CRA receipt)", "languages", "go-live gating".
  - Service schema.org JSON-LD (areaServed: Canada, availableLanguage: en + hi, provider: Darshya Organization).
  - Edge runtime, revalidate 86400.
  - hreflang alternates: en-CA self + x-default → `/nri` parent.
- `apps/web/app/sitemap.ts` — `/nri/ca` priority 0.85 entry added.

## Engineering still owed (BLOCKED on U2 founder action)

These changes are deliberately NOT in this batch to avoid breaking the USD path. Ship in a fresh PR once Stripe CAD dashboard activation completes.

1. **`apps/api/src/services/payment.service.ts` `createStripeOrder` — accept currency param.**
   Current signature hardcodes `currency: 'USD'` (L1015, L1073, L1096, L1114). Extend to `currency: 'USD' | 'CAD'` and gate CAD branch on `STRIPE_CAD_ENABLED=true` env-or-noop. Stripe PaymentIntent `currency: 'cad'` lowercase string per Stripe docs.
2. **`apps/api/src/services/booking.service.ts` L236 — currency selection.**
   Currently `currency: user.isNri ? 'USD' : 'INR'`. Extend to detect `user.countryCode === 'CA'` → CAD. Default-fallback USD for other NRI markets unchanged.
3. **`apps/web/lib/pricing.ts` `formatPrice` — extend currency union.**
   `currency?: 'INR' | 'USD'` → add `'CAD'`. `Intl.NumberFormat` locale → `'en-CA'` for CAD. CA $ symbol disambiguation via `showCode: true` recommended for CAD lines so users see `CA$ 49 CAD` not `$ 49`.
4. **Pricing rule — CAD 9-10x domestic.**
   Per business rule "NRI 9-10x domestic" and CLAUDE.md (`apps/web/lib/pricing.ts`). At current FX ≈ 60 INR/CAD, a ₹500 domestic puja → ~CA$75 (9x = CA$75) or CA$83 (10x = CA$83). Lock 9x as default; surface CAD `nriPriceCad` column on `PujaType` if INR→CAD divergence from USD ratio matters. Until then, derive `nriPriceCad = nriPriceUsd * 1.35` (USD→CAD FX) as a build-time constant in `formatPrice` rather than running live FX (no live FX dependency wanted).
5. **Booking flow — `cc=CA` query param.**
   `apps/web/app/pujas/[slug]/book/page.tsx` already supports `nri` toggle; add `?cc=CA` to default currency=CAD when present. Defer Stripe Elements CAD-specific UX (e.g. Interac eTransfer as alt rail) to a v2 — initial launch ships Stripe card-only.
6. **Database — `payment_currency` enum extension.**
   Prisma `Payment.currency` field currently String. Verify Supabase column is text not enum; if enum, add `'CAD'` value via migration. KPI query (see above) already filters `payment_currency = 'CAD'`.
7. **Vitest — new currency path tests.**
   `apps/api/src/services/payment.service.test.ts` add CAD case w/ STRIPE_CAD_ENABLED=true. `apps/web/lib/pricing.test.ts` add `formatPrice(75, { currency: 'CAD' })` expects `CA$75` formatted.

## Marketing / sales tactics (per agent_brief)

These are scaffold notes for sub-agent CMO to expand; founder owns execution timing.

1. **Indo-Canadian community partnerships** — Brampton Hindu Sabha, ISKCON Toronto, BAPS Swaminarayan temples (Toronto + Vancouver), Vishnu Mandir Richmond Hill. Warm intros via founder network.
2. **Geo-targeted Meta ads** — Toronto GTA (M-postcodes), Brampton (L6P/L6R/L6S/L6T/L6V/L6W/L6X/L6Y/L6Z), Mississauga (L4Z-L5W), Vancouver Lower Mainland (V-postcodes). Activate post supply + Stripe CAD live (don't drive traffic to broken checkout).
3. **South-Asian Canadian creator partnerships** — Punjabi YouTube channels, Tamil-Canadian podcasts, Gujarati Toronto FM. Free-trial promo codes once available.
4. **Google Maps + Statscan census tract scrape** — top-50 Hindu temples in Canada, prioritize Toronto + Vancouver + Brampton for initial outreach (these temples are PARTNERS not customers — direct devotees to Darshya for India temple bookings).
5. **NRI Premium upsell** — Canada users get `$60 USD / yr` (existing /nri page) until /upgrade page exposes CAD `~CA$80/yr` SKU. Defer Canadian-tax-friendly billing language until founder confirms.

## Founder action (BLOCKING)

1. **Activate Stripe Canada** in Stripe dashboard. Canada business KYC docs (incorporation cert, void cheque, beneficial-owner ID per Canadian PCMLTFA rules). Cannot accept CAD until this completes.
2. **Verify Canada tax position** — confirm GST/HST collection rules with accountant. Stripe Canada handles tax collection at checkout automatically once configured. SaaS service ≠ donation; donations are not CRA-receiptable from offshore charity.
3. **R-Q3-S-007 dependency** — onboard 10 Canada-time-friendly verified pandits (some India-based pandits with willingness to take evening EST calls; some optional Canada-resident pandits for in-person rituals). Aadhaar verification + 1:1 KYC video per business rule #4.
4. **Decision on Punjabi (Gurmukhi) UI** — Brampton + Surrey diaspora is heavily Punjabi. Add ਪੰਜਾਬੀ landing variant or defer to v2?
5. **Confirm Canada-resident referral channels** — Indo-Canadian newsletters, gurdwara bulletin boards (cross-Hindu interest), Hindu Federation of Canada partnerships.
6. **Set ROADMAP-ID `R-Q3-G-002` status to `shipped` only after** Stripe CAD live + ≥1 real CAD payment recorded in Supabase. Until then it stays `in_progress` — per CLAUDE.md PITFALLS R2 rule.

## Dependencies (HARD BLOCK)

- **U2** — Stripe NRI activation including CAD currency rail (founder; activation-gate doc).
- **R-Q3-S-007** — 10 Canada-based verified pandits onboarded.

This item stays `in_progress` until both pre-reqs flip `shipped` AND Stripe CAD payment flow is verified end-to-end with at least one real test transaction.

## Verify (post-deploy)

1. `curl -s -o /dev/null -w "%{http_code}" https://darshya.online/nri/ca` — expect 200
2. `curl -s https://darshya.online/nri/ca | grep -c "Toronto"` — expect ≥1
3. `curl -s https://darshya.online/nri/ca | grep -c "Brampton"` — expect ≥1
4. `curl -s https://darshya.online/nri/ca | grep -c "Stripe CAD"` — expect ≥1 (FAQ transparency on activation gating)
5. `curl -s https://darshya.online/sitemap.xml | grep -c "/nri/ca"` — expect ≥1

## Legal + compliance notes

- **No fabricated social proof** on the page (per CLAUDE.md PITFALLS). Community-size figures are clearly labeled as 2021 Statistics Canada / public estimates.
- **No invented "X signed yesterday"** scarcity claims (per CLAUDE.md PITFALLS).
- **No App Store TechCrunch / YourStory featured badges** (Apple Guideline 2.3.7 risk).
- **CRA tax language** is honest — 80G is India-only; Canadian donations are NOT CRA-receiptable through this rail. Subscription is a service subject to GST/HST.
- **No KYC of users before payment** required for Canadian customers per Stripe Canada terms; standard card-network rules apply.
- **DPDP §8(10) grievance officer** notice already published org-wide per prior batch; CA-specific privacy contact is the same India-based DPDP officer email.
