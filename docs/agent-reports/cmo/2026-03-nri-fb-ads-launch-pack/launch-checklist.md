# Launch Checklist — Founder Action in Meta Ads Manager

## Pre-flight (do this once before opening Ads Manager)

1. **Meta Pixel installed** on `/nri`, `/gift`, `/checkout/success`. Verify via Meta Pixel Helper Chrome extension — each page should fire `PageView`; `/checkout/success` should also fire `Purchase` with currency = USD and value.
2. **Verify domain** (`apps.bhaktisetu.com`) in Meta Business Manager → Brand Safety → Domains. Required for iOS 14.5+ conversions API attribution.
3. **Aggregated Event Measurement**: configure 8-event priority list — `Purchase` (highest), `InitiateCheckout`, `AddToCart`, `Lead`, `ViewContent`, `PageView`, etc.
4. **80G / 501c3 legal check** for Creative 03 — confirm or strip claim (see `creative-03-80g-receipt-nri.md`).
5. **Confirm UTM persistence** from landing → checkout (see `utm-plan.md` step 3-4).

## Campaign setup

| Setting | Value |
|---|---|
| Campaign objective | **Sales** (Conversions) |
| Campaign budget | **$50 lifetime** |
| Flight | 7 days |
| Conversion location | Website |
| Conversion event | `Purchase` (or `InitiateCheckout` if Purchase data sparse) |
| Bid strategy | Highest volume |
| Special ad categories | None (devotional content not regulated) |

## Ad set structure (A/B all combos)

Create **2 ad sets** (one per audience):

1. `US-Hindu-25-45` — budget $25 / 7 days — audience per `audience-us-hindu-25-45.json`
2. `UK-Hindu-25-45` — budget $25 / 7 days — audience per `audience-uk-hindu-25-45.json`

Each ad set carries **3 ads** (one per creative). FB will auto-rotate and surface the winner.

## Per-ad upload (6 ads total)

For each of the 6 cells (creative × audience):

1. Upload 1080×1080 image + 1080×1920 reel/story variant.
2. Headline, primary text, description, CTA: copy/paste from the relevant `creative-0N-*.md` frontmatter.
3. Website URL: paste the matching variant from `utm-plan.md`.
4. Display link: `apps.bhaktisetu.com`.

## Go live

1. Submit campaign for review (Meta usually approves within 1-4 hours for non-regulated content).
2. Once `Active`, paste campaign ID into the roadmap item `R-Q1-M-011` handoff_notes.
3. Set kill thresholds per `kill-criteria.md`.

## Day-1 watch list

- Pixel firing in real time (Events Manager → Test Events).
- Cost-per-click landing under $0.80 (else creative weak).
- Landing-page bounce < 70% (else landing copy mismatched to ad promise).
