# Stripe NRI USD Activation Playbook

Step-by-step to flip Darshya's NRI / diaspora flow from demo Stripe to
live USD collection. Companion to `razorpay-live-activation.md` — same
shape, different gateway. Sequence matters: Layer L (legal pages) must
already be live before Stripe verification, since their reviewer opens
the same Privacy / Terms / Refund / Shipping URLs.

Owner: Sunil (Darshya proprietor). Estimated time end-to-end: 1 day +
1-2 day Stripe verification. Stripe is generally faster than Razorpay's
KYC because they accept a larger set of business proofs.

Platform commission rules from `CLAUDE.md` apply unchanged: 20-40% per
temple, deducted from the Priest payout, gated on Aadhaar verification.

---

## 1. Prerequisites — collect before opening Stripe dashboard

Keep scans/photos ready (PDF or JPG, < 5 MB each):

- **PAN card** (proprietor's PAN)
- **Aadhaar card** (front + back, name must match PAN)
- **Bank account proof** — cancelled cheque or first page of passbook
  showing IFSC + account holder name (must match PAN). India-domiciled
  Stripe accounts settle in INR, but charge in USD; no NRI bank account
  is required from the proprietor side.
- **Business proof** — utility bill / shop license / GST certificate
- **GSTIN** — required by Stripe India for any account doing > 20 L
  revenue. If under threshold, declare "Not registered" and add later.
- **Business website**: https://darshya.online (must be live)
- **Statement descriptor**: "DARSHYA PUJA" (max 22 chars, all caps,
  no special chars). Shown on cardholder statements.

## 2. Legal pages on the website (re-use from Razorpay path)

Stripe's reviewer opens each URL the same way Razorpay does. All four
must resolve to non-placeholder content before submitting verification:

| Page | URL | Must contain |
|---|---|---|
| Privacy Policy | https://darshya.online/legal/privacy | Data collected, retention, third-party shares (Razorpay, **Stripe**, Resend, Supabase, Cloudflare), user rights, contact email |
| Terms of Service | https://darshya.online/legal/terms | Service description, USD + INR pricing, user obligations, dispute resolution, governing law (India) |
| Refund / Cancellation | https://darshya.online/legal/refund | 24-hour cancellation window, refund timeline (5-7 business days INR / 7-10 days USD), no-refund cases (puja already performed) |
| Shipping / Delivery | https://darshya.online/legal/shipping | Prasad delivery scope, timeline, no shipping for digital puja services |

## 3. Stripe account setup

1. Go to https://dashboard.stripe.com/register, sign up with the
   proprietor's email (use the same one used for Razorpay for audit
   continuity).
2. Country: India. Business type: Individual / Sole proprietor.
3. Activate account → fill in business details, upload PAN + Aadhaar +
   bank proof.
4. Set the **statement descriptor** to `DARSHYA PUJA`.
5. Under **Settings → Public details**, set support email to
   `support@darshya.online` and support URL to `https://darshya.online/help`.

## 4. Get API keys

Once verified, in **Developers → API keys** copy:

- `Publishable key` (starts `pk_live_...`) → goes to web env as
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- `Secret key` (starts `sk_live_...`) → goes to API env as
  `STRIPE_SECRET_KEY`. **Never** commit. Render dashboard secret only.

For the test phase before going live, use the matching `pk_test_...` /
`sk_test_...` pair so we can run real checkouts with Stripe's test
cards (e.g. `4242 4242 4242 4242`).

## 5. Configure webhook

In **Developers → Webhooks → Add endpoint**:

- **Endpoint URL**: `https://api.darshya.online/api/v1/payments/webhook/stripe`
- **API version**: latest (Stripe pins per endpoint)
- **Events to send**: select these three only:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`

After saving, click **Reveal signing secret** and copy the value
(starts `whsec_...`) into the API env as `STRIPE_WEBHOOK_SECRET`.

## 6. Environment variables

Add to Render's `@poojly/api` service:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...   # optional, mirrored to client
```

Add to Cloudflare Pages `@poojly/web` project:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Without these vars the API + web fall back to demo mode: synthetic
`pi_demo_*` ids, no real charge, success screen still renders for
manual testing.

## 7. Smoke test (test mode)

1. Set `STRIPE_SECRET_KEY=sk_test_...` and matching test publishable
   key. Deploy to staging.
2. Open a puja booking page from a non-IST timezone (browser DevTools
   → Sensors → Override timezone to `America/New_York`).
3. The "Currency" toggle should default to USD; the price should match
   `PujaType.nriPrice`.
4. Click **Pay $X with Stripe**. Use test card `4242 4242 4242 4242`,
   any future expiry, any CVC.
5. Verify the booking flips to `confirmed` in the DB and the webhook
   recorded `payment_intent.succeeded`.
6. Test failure: card `4000 0000 0000 0002` (declines). Booking stays
   in `pending_payment`, Payment row flips to `failed`.
7. Test refund: from Stripe dashboard, refund the test charge.
   Verify `Payment.status` flips to `refunded` (or `partially_refunded`
   if partial).

## 8. Go live

Replace test keys with live keys in Render + Cloudflare Pages. Trigger
a deploy. Run the same smoke test once with a real card for $1 of any
puja, then refund yourself via the dashboard.

## 9. Day-2 ops

- Stripe disputes / chargebacks land in **Payments → Disputes**.
  Reply with video proof URL + booking number; we win > 90% when
  video proof is attached.
- Settlement: Stripe India settles to your linked bank in INR every
  7 days (T+7) by default. Faster cycles available after 90 days of
  activity.
- Tax: Stripe issues GST invoice for processing fees; download monthly
  for accountant.

## 10. Schema gaps to track

- `User.isNri` is currently informational only — the booking page
  uses browser timezone as the default. Once we have onboarding /
  KYC flows that set `isNri` reliably, switch the default toggle to
  read `user.isNri` from session.
- Stripe payments store amount in `Payment.amount` as USD `Decimal`.
  Ledger reports that mix currencies must read `currency` first;
  add a `Payment.amountInr` snapshot column the day we add multi-
  currency dashboards.
