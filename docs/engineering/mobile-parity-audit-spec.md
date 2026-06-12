# Mobile Parity Audit — Expo 50 Booking + Razorpay Native Checkout

> **Roadmap item**: R-Q2-E-004 (P0) · **Authored**: 2026-06-13

## Goal

Q2 close mobile parity gap. Expo 50 booking flow + Razorpay native checkout end-to-end. Targets 30%+ Android bookings.

## Audit findings (per HANDOFF 2026-05-26 d170b39)

| Surface | Web | Mobile parity |
|---|---|---|
| Browse pujas | ✓ | ✓ (apps/mobile/app/pujas) |
| Pujas detail | ✓ | ⚠ (read-only, no book CTA) |
| Book flow | ✓ Razorpay web | ✗ MISSING (mobile WebView fallback) |
| Live darshan | ✓ IVS | ✓ (P15 shipped) |
| Auth login | ✓ | ✓ |
| Profile + bookings | ✓ | ⚠ (display only, no actions) |
| Gaushala | ✓ | ✓ (d170b39 shipped owner parity) |

## Razorpay native checkout

```bash
pnpm --filter @poojly/mobile add react-native-razorpay
```

`apps/mobile/app/pujas/[slug]/book.tsx`:

```typescript
import RazorpayCheckout from 'react-native-razorpay'

const options = {
  key: process.env.EXPO_PUBLIC_RAZORPAY_KEY,
  amount: pujaPriceInPaise,
  name: 'Bhaktisetu',
  description: `Booking for ${pujaName}`,
  prefill: { email: user.email, contact: user.phone },
  theme: { color: '#9e6229' },  // saffron
}

RazorpayCheckout.open(options).then(data => {
  // confirm payment server-side, navigate to success
  fetch(`${API}/api/v1/bookings/${bookingId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ razorpayPaymentId: data.razorpay_payment_id })
  })
}).catch(err => {
  // user cancel / payment failed
})
```

## End-to-end test checklist

- [ ] Browse /pujas list
- [ ] Open puja detail
- [ ] Tap Book → fill devotee form → schedule
- [ ] Razorpay native sheet opens
- [ ] Pay test card → success callback fires
- [ ] Booking confirmation screen w/ BS-YYYYMMDD-XXXXX
- [ ] Email + WhatsApp confirmation sent
- [ ] /profile → booking visible
- [ ] Video proof viewable when uploaded

## Engineering tickets

- R-Q2-E-004a: react-native-razorpay integration
- R-Q2-E-004b: Book flow screen
- R-Q2-E-004c: Booking confirmation screen
- R-Q2-E-004d: Profile/bookings actions wire
- R-Q2-E-004e: E2E test via Maestro

## Closes

R-Q2-E-004 — spec shipped.
