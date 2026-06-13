# UTM Plan — NRI FB Ads (3 creatives × 2 audiences = 6 URLs)

## UTM convention

| Param | Value |
|---|---|
| `utm_source` | `facebook` |
| `utm_medium` | `cpc` |
| `utm_campaign` | `nri-q1-feb-2026` |
| `utm_content` | one of `gift-puja-nri` / `live-darshan-nri` / `80g-receipt-nri` |
| `utm_term` | one of `us-hindu-25-45` / `uk-hindu-25-45` |

## 6 URL variants

### Creative 01 — Gift Puja (lands `/gift`)

- US: `https://apps.bhaktisetu.com/gift?utm_source=facebook&utm_medium=cpc&utm_campaign=nri-q1-feb-2026&utm_content=gift-puja-nri&utm_term=us-hindu-25-45`
- UK: `https://apps.bhaktisetu.com/gift?utm_source=facebook&utm_medium=cpc&utm_campaign=nri-q1-feb-2026&utm_content=gift-puja-nri&utm_term=uk-hindu-25-45`

### Creative 02 — Live Darshan (lands `/nri`)

- US: `https://apps.bhaktisetu.com/nri?utm_source=facebook&utm_medium=cpc&utm_campaign=nri-q1-feb-2026&utm_content=live-darshan-nri&utm_term=us-hindu-25-45`
- UK: `https://apps.bhaktisetu.com/nri?utm_source=facebook&utm_medium=cpc&utm_campaign=nri-q1-feb-2026&utm_content=live-darshan-nri&utm_term=uk-hindu-25-45`

### Creative 03 — 80G Receipt (lands `/nri`)

- US: `https://apps.bhaktisetu.com/nri?utm_source=facebook&utm_medium=cpc&utm_campaign=nri-q1-feb-2026&utm_content=80g-receipt-nri&utm_term=us-hindu-25-45`
- UK: `https://apps.bhaktisetu.com/nri?utm_source=facebook&utm_medium=cpc&utm_campaign=nri-q1-feb-2026&utm_content=80g-receipt-nri&utm_term=uk-hindu-25-45`

## Verify UTMs land in checkout order metadata

1. Hit any URL above as a fresh visitor.
2. Browser console: `document.cookie` should show a session/anonymous id; localStorage may carry the UTM cluster (depends on `apps/web/lib/analytics.ts` setup).
3. Initiate any checkout (gift puja or donation). Confirm in `apps/api/src/routes/checkout/` (or PostHog `$set_once` person properties) that `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` are attached to the resulting order or PostHog identify call.
4. If UTMs are lost between landing and checkout: founder action — wire query-string → person property in `apps/web/lib/analytics.ts` before launch.
