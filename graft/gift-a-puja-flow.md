---
name: Gift-a-Puja Flow
slug: gift-a-puja-flow
type: system
sources:
  - path: apps\web\app\gift\GiftPujaForm.tsx
    hash: ef02b21b4d0d17168375b1a58f128504162e4f9bb10b7dd299d4ed681744b1de
  - path: apps\web\app\gift\page.tsx
    hash: 146bd8d93e4913905ccfda4d731ec82bc3a45276ca5833aacafb7dff90bdce49
  - path: apps\web\app\gift\success\page.tsx
    hash: 5eb9cec6ffb5bc2f57f6254d7893deb0f72a627d70b9837edaf219006621b853
sources_digest: 9cab5c1012eed194c76e0fa46762e14ac978144bd0ac249f559941a0a4a17ff4
links:
  - to: client-side-auth-api-base-url-resolution
    relation: uses
    description: All backend calls go through API_BASE_URL from lib/api-config
  - to: feature-flagged-payment-with-backend-verification
    relation: implements
    description: >-
      Config flags select Stripe vs inquiry vs mailto path; success page
      verifies via backend verify-payment rather than Stripe client
generator:
  version: 1
covers:
  - symbol: Status
    kind: type
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L8-L8'
  - symbol: GiftConfig
    kind: type
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L10-L14'
  - symbol: CreateOrderResponse
    kind: type
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L16-L26'
  - symbol: GiftPujaForm
    kind: function
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L59-L343'
  - symbol: handleSubmit
    kind: function
    at: 'apps\web\app\gift\GiftPujaForm.tsx:L85-L166'
  - symbol: GiftPujaPage
    kind: function
    at: 'apps\web\app\gift\page.tsx:L60-L155'
  - symbol: Verify
    kind: type
    at: 'apps\web\app\gift\success\page.tsx:L10-L15'
  - symbol: VerifyContent
    kind: function
    at: 'apps\web\app\gift\success\page.tsx:L17-L145'
  - symbol: GiftSuccessPage
    kind: function
    at: 'apps\web\app\gift\success\page.tsx:L147-L157'
---
<!-- context:generated:start -->
## Summary

NRI-facing 'gift a puja' funnel: a static ISR landing page embeds GiftPujaForm as the only interactive island, and /gift/success is the Stripe redirect target. The form fetches /gift-puja/config feature flags to choose between Stripe Elements (create-order → clientSecret) and an honest inquiry POST, with a mailto: to gift@darshya.online as last resort; a failed config fetch defaults all flags to false, and the submit button stays disabled until config loads. The success page never talks to Stripe directly — it POSTs orderId+paymentIntentId to /gift-puja/verify-payment and trusts the backend, surfacing WhatsApp delivery status with an amber 'manual notification within 4 hours' fallback when not 'sent'.

## Related

- uses [[client-side-auth-api-base-url-resolution]] — All backend calls go through API_BASE_URL from lib/api-config
- implements [[feature-flagged-payment-with-backend-verification]] — Config flags select Stripe vs inquiry vs mailto path; success page verifies via backend verify-payment rather than Stripe client
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
