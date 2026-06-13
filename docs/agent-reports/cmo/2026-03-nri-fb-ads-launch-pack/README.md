# NRI Facebook Ads Launch Pack — Feb 2026

Roadmap item: `R-Q1-M-011` · Owner role: cmo · Status: needs-founder-review

## Goal

Drive NRI Hindu diaspora (US + UK, 25-45) to `apps.bhaktisetu.com/gift` and `/nri` to book gift-puja, schedule live-darshan, and explore 80G/501c3-eligible donation receipts.

Agent ships creatives + targeting + UTM/PostHog plan. Founder launches in FB Ads Manager (credentials + payment + pixel verification).

## Budget

- **Total**: $50 USD lifetime
- **Split**: $25 US audience / $25 UK audience
- **Flight**: 7-day flight (7 days lifetime)
- **Daily pace**: ~$7.14/day (lifetime budget auto-paces)

## Deliverables in this pack

| File | Purpose |
|---|---|
| `creative-01-gift-puja-nri.md` | Son-to-parent gift-puja angle, lands `/gift` |
| `creative-02-live-darshan-nri.md` | IST live-aarti homesick angle, lands `/nri` |
| `creative-03-80g-receipt-nri.md` | Tax-receipt angle (80G/501c3 — verify legal), lands `/nri` |
| `audience-us-hindu-25-45.json` | US Hindu diaspora 25-45 targeting spec |
| `audience-uk-hindu-25-45.json` | UK Hindu diaspora 25-45 targeting spec |
| `utm-plan.md` | All 6 URL variants (3 creatives × 2 audiences) |
| `posthog-events.md` | Conversion funnel + dashboard SQL |
| `launch-checklist.md` | Step-by-step for FB Ads Manager |
| `kill-criteria.md` | Pause thresholds (CPA / CTR by day) |

## Founder actions

1. Verify Meta Pixel installed on `/nri`, `/gift`, `/checkout/success` (see `launch-checklist.md` step 1).
2. Confirm 80G/501c3 legal claim for US audience before launch (see warning in `creative-03-80g-receipt-nri.md`).
3. Create FB campaign per `launch-checklist.md` (Conversions / Purchase / $50 lifetime / 7 days).
4. Upload 6 URL variants per `utm-plan.md`.
5. Reply in roadmap item with campaign ID → flip status to `shipped`.

## Security

Do NOT commit FB Ads API tokens or pixel IDs to git. Founder credentials live in Meta Business Manager only.
