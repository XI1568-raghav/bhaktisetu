# Analytics Wiring — GA4 + Meta Pixel

> Audit-fix Group E. Runbook to activate Google Analytics 4 and Meta (Facebook)
> Pixel on darshya.online. PostHog + Cloudflare Web Analytics remain wired
> alongside.
> Created: 2026-05-13.

## What was shipped

- `apps/web/lib/ga4.ts` — `<GA4Script />` + `trackEvent(name, params?)`.
- `apps/web/lib/meta-pixel.ts` — `<MetaPixelScript />` + `trackPixel(event, params?)`.
- `apps/web/types/global.d.ts` — ambient `window.dataLayer`, `window.gtag`,
  `window.fbq` declarations for TS strict mode.
- `apps/web/app/layout.tsx` — both components mounted in `<body>` after
  `<Analytics />` (PostHog). Self-gate on env vars, so safe to ship inactive.

Both modules follow the project env-or-noop pattern (`docs/env-vars.md`):
when the env var is absent, the script tags do not render and the
`trackEvent` / `trackPixel` helpers are no-ops. No production behavior
changes until the env vars are set.

## Step 1 — Get the IDs

### GA4 measurement ID

1. https://analytics.google.com -> Admin (gear, bottom-left).
2. In the **Property** column pick the Darshya property (or create one for
   `darshya.online` if missing — Account: Darshya, Property: darshya.online,
   reporting time zone Asia/Kolkata, currency INR).
3. **Data Streams** -> click the Web stream for `https://darshya.online`
   (or "Add stream" -> Web -> URL `https://darshya.online`, stream name
   "Darshya Web").
4. Copy **Measurement ID** — format `G-XXXXXXXXXX`.

### Meta Pixel ID

1. https://business.facebook.com -> **Events Manager** (left rail).
2. **Connect Data Sources** -> Web -> Meta Pixel -> **Connect**.
3. Name: "Darshya Web Pixel". URL: `https://darshya.online`.
4. Skip the install method (we install via code).
5. Copy the **Pixel ID** — 15-16 digit number shown at the top of the
   pixel's Overview tab.

## Step 2 — Paste env vars to Cloudflare Pages

Cloudflare dashboard -> Workers & Pages -> `bhaktisetu-web`
(or whatever the project is named) -> Settings -> Environment variables ->
Production.

Add:

| Variable | Value | Type |
|---|---|---|
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` (from step 1) | Plaintext |
| `NEXT_PUBLIC_FB_PIXEL_ID` | `1234567890123456` (from step 1) | Plaintext |

Both are `NEXT_PUBLIC_*` — they ship to the client bundle. That is intended
for analytics IDs (they are not secrets; they appear in the loaded script
URLs anyway).

Click **Save**, then **Deployments** -> latest production -> **Retry
deployment** (or push a no-op commit) so the new env vars bake into the
build.

If you also want analytics in preview branches, repeat under the **Preview**
environment.

## Step 3 — Verify in production

After the redeploy completes:

1. Open https://darshya.online in an Incognito window with DevTools open
   (Ctrl+Shift+I -> Network tab -> filter "JS").
2. Look for these network requests:
   - `gtag/js?id=G-XXXXXXXXXX` — GA4 loader. Status 200.
   - `https://www.googletagmanager.com/g/collect?...` — first pageview hit.
   - `fbevents.js` — Meta Pixel loader. Status 200.
   - `facebook.com/tr/?id=...&ev=PageView` — first pageview ping.
3. Cross-check in the GA4 dashboard: **Reports -> Realtime** should show
   1 active user within ~30s.
4. Cross-check in Events Manager: **Test Events** tab -> enter
   `darshya.online` -> reload the site -> `PageView` event should appear.

If the loader request never fires:
- env var typo (must be `NEXT_PUBLIC_GA_ID` exactly, not `GA_ID`).
- env var saved to Preview but not Production.
- Cloudflare Pages cached the old build — force a rebuild.
- Browser ad-blocker (uBlock, Brave Shields) — test in Chrome Incognito
  with no extensions.

## Step 4 — Fire custom events from app code (optional, follow-up)

Both libraries export simple helpers:

```ts
import { trackEvent } from '@/lib/ga4';
import { trackPixel } from '@/lib/meta-pixel';

// GA4 custom event
trackEvent('puja_booking_started', { puja_id: 'rudra-abhishek', amount_inr: 1100 });

// Meta Pixel standard event (use Meta's standard names where possible:
// Purchase, Lead, CompleteRegistration, AddToCart, InitiateCheckout)
trackPixel('InitiateCheckout', { value: 1100, currency: 'INR' });
```

High-leverage events to wire next (not done in this PR):
- `puja_booking_completed` -> GA4 + Meta `Purchase` with value/currency.
- `nri_subscribe_clicked` -> GA4 + Meta `Lead`.
- `astrology_session_purchased` -> GA4 + Meta `Purchase`.
- `magic_link_sent` -> GA4 + Meta `CompleteRegistration` (after click-thru).
- `add_to_cart` (Medusa store) -> GA4 + Meta `AddToCart`.

## GDPR / consent — FOLLOW-UP

This project does not ship a consent banner today. GA4 and Meta Pixel both
fire on first pageview without prior consent.

For darshya.online's traffic (mostly India + NRI from US/UK/CA/AU) this is:
- **Legal in India** under DPDP Act 2023 (no granular consent gate required
  for analytics; privacy notice in `/privacy` covers it).
- **Borderline in EU/UK** under GDPR + ePrivacy. The site does not target
  EU users, but NRI traffic from the EU does reach it.
- **Out of scope for current US/CA traffic.**

Action items, not blocking GA4/Pixel activation:

1. Add a consent banner component (cookie banner) that defaults to **no**
   for EU/UK IPs, **yes** elsewhere. Use Cloudflare's geo header
   (`cf-ipcountry`) for region detection.
2. Wrap `trackEvent` / `trackPixel` in a consent check. Until consent
   resolves, queue events client-side and replay on accept.
3. Update `/privacy` to enumerate GA4 + Meta Pixel as third-party trackers
   with their respective data-handling links.

Owner: TBD. Tracked separately — does NOT block this analytics wiring.

## Files touched in this change

- `apps/web/lib/ga4.ts` (new)
- `apps/web/lib/meta-pixel.ts` (new)
- `apps/web/types/global.d.ts` (new)
- `apps/web/app/layout.tsx` (added 2 imports + 2 component mounts)
- `docs/analytics-wiring-2026-05-13.md` (this file)
