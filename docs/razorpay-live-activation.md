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

Web side: the public `NEXT_PUBLIC_RAZORPAY_KEY_ID` on the **Render** web
service (`darshya-web`) must mirror the live `rzp_live_*` Key ID — secret
stays server-only. (The web app was cut over from Cloudflare Pages to
Render; Cloudflare is DNS/edge only. Setting this on Cloudflare has no
effect and leaves checkout on the demo key.)

## 7. Webhooks — required for async reconciliation

Razorpay Dashboard → **Account & Settings → Webhooks → + Add New**:

| Webhook URL | Events |
|---|---|
| `https://api.darshya.online/api/v1/payments/webhook` | `payment.captured`, `payment.failed`, `refund.created`, `refund.processed` |
| `https://api.darshya.online/api/v1/subscriptions/webhook` | `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.paused`, `subscription.resumed`, `subscription.cancelled`, `subscription.completed`, `subscription.expired` |

**Tick every event in both rows.** The two lists are not "nice to have" —
each maps to a branch that does real work, and an unsubscribed event is
indistinguishable from a broken feature:

- `refund.created` **and** `refund.processed` (PAY-05). Razorpay accounts
  differ in which of the two they emit for a refund raised from the
  dashboard, and that is the ONLY signal we get for one. The handler is
  written to accept either, so subscribe both and the choice stops
  mattering. If neither is ticked, a refund you issue by hand in the
  Razorpay dashboard never reverses the pandit's earning or the temple's
  share in our ledger — the provider stays able to withdraw money that has
  already gone back to the devotee.
- The full `subscription.*` set (PAY-04). Ticking only
  activated/charged/cancelled leaves a mandate stuck showing its last
  known state: `halted` (the RBI dunning window after a failed debit) and
  `paused` never reach us, so a dead mandate keeps rendering as a live one
  to the devotee and to the gaushala/temple counting on the income.
  `subscription.authenticated` is the one that fires when the devotee
  finishes authorising the UPI Autopay mandate on Razorpay's page.

Both endpoints now drive **both** subscription stores (the marketplace role
plans and the recurring UPI Autopay mandates), so pointing `subscription.*`
at the wrong url is no longer silently destructive. Razorpay stamps one
`x-razorpay-event-id` per event and both endpoints share one dedupe
namespace, so subscribing an event to both urls cannot double-process it.
Prefer the split above anyway — it keeps the Razorpay dashboard readable.

For each webhook:
1. Generate a **Webhook Secret** (long random string — Razorpay can
   auto-generate or you can paste your own, e.g. `openssl rand -hex 32`).
2. Set on Render: `RAZORPAY_WEBHOOK_SECRET = <secret>`.
   - Simplest: use the **same** secret for both endpoints and set this
     one var.
   - If you give the subscriptions endpoint a **different** secret, set
     `RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET` to it as well. The
     subscriptions handler prefers that var and falls back to
     `RAZORPAY_WEBHOOK_SECRET`; leaving it unset while the dashboard uses
     a second secret rejects every subscription event with 400, which
     looks exactly like "recurring is broken".
3. Razorpay will POST a test event when you click **Send Test
   Webhook** — confirm 200 OK in Render logs.

## 7b. Recurring UPI Autopay — the two owner-side prerequisites

Webhooks alone do not make a mandate. Two things must exist in the
Razorpay dashboard before `POST /api/v1/recurring/subscribe` can return a
mandate link a devotee can open:

1. **Subscriptions must be enabled on the account.** Dashboard →
   **Subscriptions**. If the product is not enabled the create call 404s
   and the intent row stays `pending` with no `mandateUrl` — the devotee
   sees a dead button, not an error.
2. **One Razorpay Plan per catalog plan.** Dashboard → **Subscriptions →
   Plans → Create Plan**, then copy each `plan_xxx` id into Render:

   | Catalog plan | Amount | Billing | Render env var |
   |---|---|---|---|
   | Gau Seva — Daily Feeding | ₹51 | daily | `RAZORPAY_PLAN_RECURRING_GAU_FEED_DAILY` |
   | Gau Palan — Monthly Care | ₹3,000 | monthly | `RAZORPAY_PLAN_RECURRING_GAU_PALAN_MONTHLY` |
   | Wellness Batch — Monthly | ₹299 | monthly | `RAZORPAY_PLAN_RECURRING_WELLNESS_BATCH_MONTHLY` |
   | Monthly Seva | ₹501 | monthly | `RAZORPAY_PLAN_RECURRING_TEMPLE_SEVA_MONTHLY` |

   Every amount is under the ₹15,000 UPI Autopay no-PIN cap on purpose —
   donations and wellness do not qualify for the enhanced ₹1 L tier, so a
   plan priced above ₹15,000 would force the devotee to re-enter their UPI
   PIN on every debit and kill the retention the recurring rail exists for.

   With the env var unset the code falls back to the raw REST endpoint with
   an inline plan. That works, but it mints a NEW Razorpay plan per
   subscriber, so the dashboard becomes unreadable and per-plan reporting
   is impossible. Set the four vars.

## 8. Render env vars — final checklist

On Render → apps/api → Environment, set:

```
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=<live secret>
RAZORPAY_WEBHOOK_SECRET=<webhook secret>

# Only if the subscriptions webhook uses a DIFFERENT secret (see §7).
RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET=<subscription webhook secret>

# Recurring UPI Autopay plan ids (see §7b). Without these every
# subscriber mints their own throwaway Razorpay plan.
RAZORPAY_PLAN_RECURRING_GAU_FEED_DAILY=plan_xxx
RAZORPAY_PLAN_RECURRING_GAU_PALAN_MONTHLY=plan_xxx
RAZORPAY_PLAN_RECURRING_WELLNESS_BATCH_MONTHLY=plan_xxx
RAZORPAY_PLAN_RECURRING_TEMPLE_SEVA_MONTHLY=plan_xxx
```

On Render → `darshya-web` → Environment (NOT Cloudflare — the web app
runs on Render; Cloudflare only fronts DNS):

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
