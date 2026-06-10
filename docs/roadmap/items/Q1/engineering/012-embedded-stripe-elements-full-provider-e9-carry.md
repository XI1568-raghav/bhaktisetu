---
id: R-Q1-E-012
title: Embedded Stripe Elements full Provider (E9 carry)
category: engineering
owner_role: cto
quarter: Q1
month_target: 2
priority: P2
status: planned
agent_assignable: true
founder_blocker: 'U2'
depends_on: []
blocks: []

kpi:
  metric: stripe_elements_embedded
  current: 0
  target: 1
  unit: count
  source: manual
  query: "manual-kpi-1-if-StripeClientSecretCheckout-wrapped-in-Elements-provider-with-PaymentElement-and-1-test-card-succeeded-on-checkout-offering-id-page"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 6
est_cost_inr: 0

success_criteria:
  - "@stripe/stripe-js + @stripe/react-stripe-js packages added to apps/web"
  - "StripeClientSecretCheckout wrapped in Elements provider with PaymentElement"
  - "1 successful test card 4242-4242 payment on /checkout/offering/[offeringId]"
  - "mailto fallback retained for Stripe.js load failure"

agent_brief:
  context_files:
    - apps/web/components/StripeClientSecretCheckout.tsx
    - apps/web/app/checkout/offering/[offeringId]/page.tsx
    - apps/api/src/routes/checkout.ts
  prompt_skeleton: |
    Founder owns U2 Stripe NRI KYC. After live mode active:
    Sub-agent installs @stripe/stripe-js + @stripe/react-stripe-js.
    Wraps StripeClientSecretCheckout in Elements provider w/ clientSecret + appearance.
    Renders PaymentElement instead of mailto fallback when stripe loaded.
    Preserves mailto fallback when stripe load fails (graceful degradation).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["payments","stripe","nri"]
created_at: 2026-06-09T21:28:52.338Z
updated_at: 2026-06-09T21:28:52.338Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
