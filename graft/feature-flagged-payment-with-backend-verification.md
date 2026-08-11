---
name: Feature-flagged payment with backend verification
slug: feature-flagged-payment-with-backend-verification
type: concept
sources:
  - path: apps\web\app\gift\GiftPujaForm.tsx
    hash: ef02b21b4d0d17168375b1a58f128504162e4f9bb10b7dd299d4ed681744b1de
  - path: apps\web\app\gift\page.tsx
    hash: 146bd8d93e4913905ccfda4d731ec82bc3a45276ca5833aacafb7dff90bdce49
  - path: apps\web\app\gift\success\page.tsx
    hash: 5eb9cec6ffb5bc2f57f6254d7893deb0f72a627d70b9837edaf219006621b853
sources_digest: 9cab5c1012eed194c76e0fa46762e14ac978144bd0ac249f559941a0a4a17ff4
links: []
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

Payment UX is chosen at runtime by backend feature flags (/gift-puja/config): autoFlowReady selects Stripe Elements via a clientSecret, otherwise an honest inquiry form, otherwise a mailto: — the design prefers degrading to a manual channel over failing. Payment completion is always confirmed by the backend (verify-payment), never by trusting Stripe client state, and downstream delivery gaps (WhatsApp not 'sent') are surfaced with a promised manual follow-up window rather than hidden.
<!-- context:generated:end -->

## Notes

_Anything written below the generated block is preserved when the graph is regenerated._
