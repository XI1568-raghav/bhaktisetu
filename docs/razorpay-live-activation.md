# Razorpay Live Activation Playbook

Step-by-step to flip Darshya from demo payments to live INR collection.
Sequence matters — Layer L (legal pages) **must land first**, Razorpay
KYC will reject without working Privacy / Terms / Refund / Shipping URLs.

Owner: Sunil (Darshya proprietor). Estimated time end-to-end: 2 days +
1-3 day Razorpay KYC review.

---

## 1. Prerequisites — collect before opening Razorpay dashboard

Keep scans/photos ready (PDF or JPG, < 5 MB each):

- **PAN card** (proprietor's PAN, since Darshya is a proprietorship)
- **Aadhaar card** (front + back, name must match PAN)
- **Bank account proof** — cancelled cheque or first page of passbook
  showing IFSC + account holder name (must match PAN name)
- **Business proof** — utility bill / shop license / GST cert /
  partnership deed. For proprietorship, current account opening letter
  with PAN works.
- **GSTIN** — only required if your annual turnover crosses 20 L. If
  you don't have one yet, choose "Not registered" during signup and
  add it later when revenue justifies registration.
- **Business website**: https://darshya.online (must be live and
  reachable when Razorpay reviewer opens it)

## 2. Legal pages on the website (Layer L deliverables — verify before
applying)

Razorpay's reviewer will manually open each URL. All four MUST resolve
with non-placeholder content **before** you submit KYC, or they'll
reject and add 1-3 days to the timeline.

| Page | URL | Must contain |
|---|---|---|
| Privacy Policy | https://darshya.online/legal/privacy | Data collected, retention, third-party shares (Razorpay, Resend, Supabase, Cloudflare), user rights, contact email |
| Terms of Service | https://darshya.online/legal/terms | Service description, pricing, user obligations, dispute resolution, governing law (India) |
| Refund / Cancellation | https://darshya.online/legal/refund | 24-hour cancellation window, refund timeline (5-7 business days), no-refund cases (puja already performed) |
| Shipping / Delivery | https://darshya.online/legal/shipping | Digital delivery (video proof) timeline, prasad shipping window, courier partners |
| Contact Us | https://darshya.online/contact | Physical address, email, phone (Razorpay sometimes opens this too) |

**Block live activation until Layer L is shipped.** Do not proceed.

## 3. Razorpay account creation

1. Go to https://dashboard.razorpay.com/signup
2. Sign up with the email you'll use for ops (suggest:
   payments@darshya.online once domain email is set, otherwise the
   founder's primary email).
3. Choose **Proprietorship** as business type.
4. Business category → **Religious / Spiritual Services** (closest
   match) or **Online Services** if reviewer pushes back.
5. Fill the website URL: `https://darshya.online`.
6. Upload all KYC documents from §1.

## 4. Activation — submit for review

After KYC is uploaded, click **Activate Account**. Razorpay's review
window is officially 1-3 business days, in practice 4-24 hours when
documents are clean. Until then you can still create test-mode keys.

**Do not** wait for activation to integrate — use test keys first
(§5), and swap to live keys (§6) the moment activation lands.

## 5. Test-mode integration (do this NOW)

Razorpay gives you `rzp_test_*` keys immediately on signup. Use these
to validate end-to-end before live keys arrive.

In Razorpay Dashboard → **Account & Settings → API Keys → Test Mode**:
1. Click **Generate Test Key**.
2. Copy the Key ID (`rzp_test_xxx`) and Key Secret.
3. Set on Render (apps/api service) → Environment:
   - `RAZORPAY_KEY_ID = rzp_test_xxx`
   - `RAZORPAY_KEY_SECRET = <secret>`
4. Restart the API.
5. Run the test checklist (§9) using cards from
   https://razorpay.com/docs/payments/payments/test-card-details/

## 6. Live keys — switch over after activation

Once Razorpay emails "Account activated":

1. Dashboard → **Account & Settings → API Keys → Live Mode** →
   Generate Live Key.
2. Copy Key ID (`rzp_live_xxx`) and Secret.
3. On Render → Environment:
   - `RAZORPAY_KEY_ID = rzp_live_xxx`
   - `RAZORPAY_KEY_SECRET = <live secret>`
4. **Do not** commit secrets to git. Render env vars only.
5. Trigger a manual deploy on Render to pick up new env vars.

Web side: the public `NEXT_PUBLIC_RAZORPAY_KEY_ID` on Cloudflare Pages
must mirror the live `rzp_live_*` Key ID — secret stays server-only.

## 7. Webhooks — required for async reconciliation

Razorpay Dashboard → **Account & Settings → Webhooks → + Add New**:

| Webhook URL | Events |
|---|---|
| `https://api.darshya.online/api/v1/payments/webhook` | `payment.captured`, `payment.failed`, `refund.processed` |
| `https://api.darshya.online/api/v1/subscriptions/webhook` | `subscription.activated`, `subscription.charged`, `subscription.cancelled` |

For each webhook:
1. Generate a **Webhook Secret** (long random string — Razorpay can
   auto-generate or you can paste your own, e.g. `openssl rand -hex 32`).
2. Set on Render: `RAZORPAY_WEBHOOK_SECRET = <secret>`.
   - If you use the same secret for both endpoints (recommended), one
     env var is enough. If different, the subscription webhook handler
     will need a second var (`RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET`).
3. Razorpay will POST a test event when you click **Send Test
   Webhook** — confirm 200 OK in Render logs.

## 8. Render env vars — final checklist

On Render → apps/api → Environment, set:

```
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=<live secret>
RAZORPAY_WEBHOOK_SECRET=<webhook secret>
```

On Cloudflare Pages → apps/web → Environment variables (production):

```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx
```

## 9. Test checklist (before announcing "we're live")

Run all four with the live keys, real money, your own card. Refund
yourself afterwards.

- [ ] **₹501 puja booking** (Rudrabhishek smallest temple offering):
      open `/pujas/rudrabhishek`, complete checkout with personal
      card. Confirm:
      - Booking shows `confirmed` in DB (not `pending_payment`)
      - Confirmation email arrives within 60 seconds
      - Booking appears under `/dashboard/bookings`
      - Razorpay dashboard shows the captured payment
- [ ] **Refund flow**: from admin panel cancel the booking →
      Razorpay dashboard shows refund initiated → bank account
      credited within 5-7 business days
- [ ] **Subscription start** (when subs go live): a recurring darshan
      pass — confirm `subscription.activated` webhook lands and DB
      row created
- [ ] **Failed payment**: use a Razorpay test card that declines —
      confirm booking stays in `pending_payment` and user can retry

## 10. Settlements

- **Default**: T+2 business days. Money settles to your bank account
  Mon → Wed, Tue → Thu, etc. Sat/Sun excluded.
- **Daily settlement** (T+1): apply via Dashboard → **Settlements →
  Schedule** once monthly volume crosses ₹50K. Available on the
  free Standard plan, no extra charge.
- **First settlement**: typically 7 days after first successful
  payment, while Razorpay reviews the txn pattern. Plan cashflow
  accordingly — the first ₹501 takes a week to land, subsequent ones
  follow T+2.
- **MDR** (charges per txn): 2% on domestic cards/UPI by default.
  Negotiable down to ~1.6% once monthly volume > ₹2 L — open a
  ticket from the Dashboard once volume justifies.

## 11. Rollback plan

If anything goes wrong post-go-live:

1. On Render, unset `RAZORPAY_KEY_ID` (or set to `rzp_test_demo`).
2. Restart the API.
3. Code falls back to demo-mode Proxy (synthetic `order_demo_*`
   ids) — bookings still create but no real money moves.
4. Investigate, fix, restore live keys.

This is the same fallback path the smoke tests exercise, so the
behaviour is well-understood.
