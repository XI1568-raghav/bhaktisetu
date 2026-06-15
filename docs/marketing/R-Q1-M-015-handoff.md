# Google Ads Account Setup — Q1 Foundation (R-Q1-M-015)

> **Roadmap item**: R-Q1-M-015 (P2) · **Authored**: 2026-06-15 · **Status**: handoff stub (spec missing — populated from category context + R-Q1-M-006 NRI/R-Q2-M-006 NRI scale precedents)

## Why this item exists

Q1 needs a live Google Ads account (no spend yet) so when R-Q1-M-006 ($50/mo NRI US-only baseline) lights up paid acquisition in Q1 week 8-12, the account, billing, conversion tracking, and audiences are already provisioned. Provisioning is gated on founder KYC + payment instrument + Google Ads policy review — none of which an agent can complete. This file is the paste-ready checklist.

## Founder action required (cannot ship without)

[VERIFY-FOUNDER] All of the below require the founder personally.

1. **Create Google Ads account** — https://ads.google.com/home/ · sign in with founder's Google Workspace email (founder@darshya.online or personal). Skip Smart Mode → "Switch to Expert mode" on the first screen (Smart Mode locks campaign controls).
2. **Billing setup** — India billing profile: business name (TBD legal entity), GSTIN (TBD when filed), business PAN, India bank account, address. Currency INR (cannot change later — Q2 NRI campaigns will use the same INR billing with USD spend invoiced at conversion rate).
3. **Conversion tracking install** — Google Tag (`gtag.js`) site-wide via GTM container OR direct snippet. Conversion actions to create (founder + agent next sprint):
   - `puja_booking_complete` (value=INR amount, counting=one)
   - `nri_gift_puja_complete` (value=USD→INR converted, counting=one)
   - `email_capture_waitlist` (value=0, counting=one)
   - `live_darshan_signup` (value=0, counting=one)
4. **Link to GA4 + GSC** — Tools → Linked Accounts → Google Analytics 4 (darshya.online GA4 property) + Google Search Console (darshya.online verified property). Enables remarketing audiences + organic search query overlay.
5. **Policy review** — Google may flag "religious puja booking" as a regulated/sensitive vertical. Submit business verification (legal entity docs + identity verification) early to avoid delay when first ad runs.

## What an agent CAN ship (deferred to a future PR when account exists)

Once founder hands off the account email + customer ID, agent can populate:

- **Conversion tracking IDs** in `apps/web/lib/analytics.ts` (env var `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID` env-or-noop pattern, same as PostHog/GA4)
- **gtag conversion event firing** in 4 places: `/checkout/success/page.tsx` (puja_booking_complete), `/gift/success/page.tsx` (nri_gift_puja_complete), `/waitlist` POST handler (email_capture_waitlist), `/darshan/signup` (live_darshan_signup)
- **Remarketing audiences** seeded via the GA4 link (not direct upload): NRI visitors, puja-page abandoners, 7-day-active devotees
- **Campaign templates** (paused state) for the 3 Q1/Q2 paid plays already specced:
  - R-Q1-M-006 NRI US-only $50/mo (specced in `nri-facebook-ads-q1-spec.md` — Google Ads sister campaign)
  - R-Q2-M-006 NRI scale $200/mo US+UK+CA+AU (specced in `nri-google-ads-scale-q2-spec.md`)
  - Q1 retargeting display $20/mo (display remarketing to puja-page abandoners)

## Spec source caveat

The roadmap item file `docs/roadmap/items/Q1/marketing/015-set-up-google-ads-account-for-future-paid-campaign.md` was missing at ship time (only items 001-014 existed). This handoff stub was derived from:

1. The R-Q2-M-006 NRI google ads scale spec (target geos, conversion actions, budget split logic)
2. The existing `apps/web/lib/posthog.ts` env-or-noop pattern for the agent-shippable portion
3. Standard Google Ads new-account checklist (billing, conversion tracking, account linking, policy review)

When the founder completes the 5 founder-action items above, ping the next sprint agent with the customer ID + account email and the agent will ship the gtag wiring + paused campaign templates in a follow-up PR.

## Status (this PR)

**in_progress** — founder must complete the 5 Google Ads UI actions before this item can move to `shipped`. KPI ("Google Ads account live with billing + conversion tracking + 3 paused campaign templates") cannot be verified by an agent because the agent does not have founder Google Workspace credentials.

Once founder pastes the customer ID + confirms billing + conversion tracking active, raise a follow-up roadmap item `R-Q1-M-015-followup` for the agent-shippable gtag + campaign template work.
