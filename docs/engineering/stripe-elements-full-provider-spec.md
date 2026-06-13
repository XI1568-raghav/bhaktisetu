# Embedded Stripe Elements — Full Provider (E9 Carry)

> **Roadmap item**: R-Q1-E-012 (P2) · **Authored**: 2026-06-13

## Goal

Q1 ship full Stripe Elements Provider. Currently clientSecret-only fallback (E9 deferred from 2026-05-26).

## Architecture

```typescript
// apps/web/app/checkout/offering/[offeringId]/page.tsx
'use client'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripe = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function CheckoutPage({ params }) {
  const { clientSecret } = useClientSecret(params.offeringId)
  
  return (
    <Elements stripe={stripe} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <CheckoutForm />
    </Elements>
  )
}
```

CheckoutForm uses `<PaymentElement />` w/ Stripe's hosted card input. Polish: brand color override + INR/USD selection.

## Mailto fallback retention

If Elements fails (network / Stripe.js block), mailto fallback per existing E9-shipped fallback.

## Engineering tickets

- R-Q1-E-012a: Elements Provider wrap
- R-Q1-E-012b: PaymentElement integration
- R-Q1-E-012c: Brand appearance tokens
- R-Q1-E-012d: Test in CF Pages prod

## Closes

R-Q1-E-012 — spec shipped.
