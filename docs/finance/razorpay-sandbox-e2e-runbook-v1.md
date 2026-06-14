# Razorpay Sandbox ₹1 E2E Test Runbook v1

> **Roadmap item**: R-Q1-F-005 (P0, founder action — pre-prod KYC validation) · **Authored**: 2026-06-12 · **Time required**: ~30 min · **Owner**: founder
>
> **Goal**: validate the END-TO-END Razorpay sandbox flow (order creation → checkout → payment capture → webhook → refund) BEFORE submitting live KYC (U1). Catches integration bugs while still in test mode.

## Prerequisites (5 min)

```markdown
- [ ] Razorpay sandbox account active (https://dashboard.razorpay.com — switch to "Test Mode" in top-right toggle)
- [ ] Test API keys generated: Settings → API Keys → Generate Test Key
- [ ] Test KEY_ID format: rzp_test_xxxxxxxxxxxxxxxx (16-char suffix after rzp_test_)
- [ ] Local .env files have RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET set to test values
- [ ] Local API server running: pnpm --filter @poojly/api dev (port 3001)
- [ ] Local web running: pnpm --filter @poojly/web dev (port 3000)
- [ ] Postgres + Prisma migrated: pnpm --filter @poojly/api exec prisma migrate dev
- [ ] At least 1 seed PujaBooking row exists (or create via dev-flow first)
```

## Step 1 — Verify env loaded (1 min)

```bash
# Confirm Razorpay test key is loaded server-side
curl -s http://localhost:3001/health | head
# Expected: { "ok": true, ... }
```

Then in Node REPL or via grep:

```bash
grep -E "RAZORPAY_KEY_ID|RAZORPAY_KEY_SECRET" apps/api/.env.local
# Expected output:
#   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
#   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

**If missing**: paste test keys, restart API server.

## Step 2 — Create a test booking (5 min)

Open `http://localhost:3000` → go to any temple page → click "Book Puja" → fill devotee details → reach checkout page.

OR via cURL:

```bash
# Get auth token (use demo-devotee for sandbox)
TOKEN="demo-devotee"
BASE="http://localhost:3001/api/v1"

# List available offerings
curl -s "$BASE/temples" | head -50

# Create booking (replace temple_id + offering_id from output above)
curl -s -X POST "$BASE/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templeId": "TEMPLE_UUID_HERE",
    "templePujaOfferingId": "OFFERING_UUID_HERE",
    "scheduledDate": "2026-08-15",
    "scheduledTimeSlot": "10:00",
    "devoteeNames": [{"name":"Test Devotee","gotra":"Test"}]
  }'

# Save returned bookingId
BOOKING_ID="<paste from response>"
```

## Step 3 — Trigger Razorpay order creation (3 min)

```bash
# Hit the create-order endpoint
curl -s -X POST "$BASE/payments/create-order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"$BOOKING_ID\",\"amountInr\":1}"

# Expected response:
# { "orderId": "order_xxx", "amount": 100, "currency": "INR", "key": "rzp_test_xxx" }
#
# Note: amount is in PAISE (100 paise = ₹1)
```

**Verify in Razorpay dashboard**: Dashboard → Test Mode → Orders → should see new order w/ amount ₹1 + status `created`.

**Verify in DB**:

```bash
psql $DATABASE_URL -c "
SELECT id, gateway_order_id, amount, status, booking_id, created_at
FROM payments
WHERE booking_id = '$BOOKING_ID'
ORDER BY created_at DESC LIMIT 1;
"
# Expected: 1 row, gateway_order_id starts w/ 'order_', status='created'
```

## Step 4 — Simulate user payment via Razorpay test cards (5 min)

Open `http://localhost:3000` checkout page for the booking. Razorpay Checkout modal opens.

Use Razorpay test cards (from https://razorpay.com/docs/payments/payments/test-card-upi-details/):

| Card | Number | Expected outcome |
|---|---|---|
| Visa success | `4111 1111 1111 1111` | Payment captured |
| Visa failure | `4000 0000 0000 0002` | Payment failed |
| 3DS challenge | `4000 0035 6000 0008` | OTP `1234` triggers 3DS flow |

For UPI test:
- Success: `success@razorpay`
- Failure: `failure@razorpay`

Use **Visa success card** (`4111 1111 1111 1111`) — CVV any 3 digits, expiry any future month, OTP `123456` if prompted.

## Step 5 — Verify payment captured (3 min)

After successful payment, you'll be redirected to a success page or callback URL.

**Verify in Razorpay dashboard**: Test Mode → Payments → newest payment row → status `captured`, amount ₹1.

**Verify in DB**:

```bash
psql $DATABASE_URL -c "
SELECT id, gateway_payment_id, gateway_order_id, amount, status, captured_at
FROM payments
WHERE booking_id = '$BOOKING_ID'
ORDER BY created_at DESC LIMIT 1;
"
# Expected: status='captured', gateway_payment_id starts w/ 'pay_'
```

**Verify booking flipped**:

```bash
psql $DATABASE_URL -c "
SELECT id, booking_number, status
FROM puja_bookings
WHERE id = '$BOOKING_ID';
"
# Expected: status='confirmed' (per payment.service.ts line ~373 — pending_payment → confirmed)
```

## Step 6 — Verify webhook delivered (3 min)

Razorpay sends `payment.captured` webhook to configured URL. In test mode, configure to `http://localhost:3001/api/v1/webhooks/razorpay` via ngrok (or skip — webhook is optional for sandbox verify).

For local dev WITHOUT ngrok, simulate webhook:

```bash
# Find webhook secret in .env
WEBHOOK_SECRET=$(grep RAZORPAY_WEBHOOK_SECRET apps/api/.env.local | cut -d'=' -f2)

# Create signed payload
PAYLOAD='{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test_xxx","amount":100,"status":"captured","order_id":"order_xxx"}}}}'
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

# Alternative — Node helper (cross-platform, no openssl required, matches server's timing-safe compare).
# See R-Q1-F-005 batch 2026-06-14 for the script + smoke tests.
#
#   SIG=$(echo -n "$PAYLOAD" | RAZORPAY_WEBHOOK_SECRET="$WEBHOOK_SECRET" \
#     node apps/api/scripts/verify/razorpay-webhook-sim.mjs sign --raw)
#
# To verify a signature you already have (e.g. one posted by Razorpay to a tunnel):
#   echo -n "$PAYLOAD" | RAZORPAY_WEBHOOK_SECRET="$WEBHOOK_SECRET" \
#     node apps/api/scripts/verify/razorpay-webhook-sim.mjs verify "$SIG"

curl -X POST http://localhost:3001/api/v1/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: $SIG" \
  -d "$PAYLOAD"

# Expected: { "ok": true } or similar
```

## Step 7 — Trigger refund (3 min)

Refund the ₹1 via Razorpay dashboard:

1. Test Mode → Payments → click captured payment → "Refund" button → Full Refund → Confirm.

OR via API:

```bash
# Initiate refund
curl -s -X POST "$BASE/payments/refund" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"paymentId\":\"PAYMENT_UUID_FROM_STEP_5\",\"reason\":\"sandbox_e2e_test\"}"

# Expected response: { "refundId": "rfnd_xxx", "amount": 100, "status": "processed" }
```

**Verify in Razorpay dashboard**: Test Mode → Refunds → newest row → status `processed`.

**Verify in DB**:

```bash
psql $DATABASE_URL -c "
SELECT id, gateway_payment_id, gateway_refund_id, refund_amount, status
FROM payments
WHERE booking_id = '$BOOKING_ID';
"
# Expected: gateway_refund_id starts w/ 'rfnd_', status='refunded'
```

**Verify booking flipped to refunded** (if your implementation does this):

```bash
psql $DATABASE_URL -c "
SELECT id, booking_number, status, cancellation_reason
FROM puja_bookings
WHERE id = '$BOOKING_ID';
"
# Expected: status='refunded', cancellation_reason populated
```

## Step 8 — Cleanup (1 min)

```bash
# Delete the test booking + payment + refund rows (sandbox only)
psql $DATABASE_URL -c "
DELETE FROM payments WHERE booking_id = '$BOOKING_ID';
DELETE FROM puja_bookings WHERE id = '$BOOKING_ID';
"
```

## Pass criteria

All 7 steps must complete without error:

- [ ] Step 1: env vars loaded
- [ ] Step 2: booking created
- [ ] Step 3: Razorpay order created + DB row exists w/ status='created'
- [ ] Step 4: payment success via test card
- [ ] Step 5: payment captured in DB + booking flipped to confirmed
- [ ] Step 6: webhook signature verified + processed
- [ ] Step 7: refund initiated + processed + DB updated
- [ ] Step 8: cleanup successful

If ALL pass → Razorpay sandbox integration is production-ready. Submit live KYC (U1).

## Failure modes + debugging

| Failure | Likely cause | Fix |
|---|---|---|
| Step 3 returns 401 | Auth token wrong / NODE_ENV not 'test' or 'development' (demo-token rejected) | Set NODE_ENV=development for sandbox testing |
| Step 3 returns 500 + "RAZORPAY_KEY_ID is missing" | Test key not in env | Paste rzp_test_* key to apps/api/.env.local + restart |
| Step 3 returns 500 + "amount must be at least 100" | Razorpay min is ₹1 = 100 paise. Smaller fails. | Ensure amount=1 (INR) → 100 paise (handled by service) |
| Step 4 Razorpay modal doesn't open | Wrong key passed to client side (mixed up test + prod) | Verify NEXT_PUBLIC_RAZORPAY_KEY_ID = rzp_test_* in web .env |
| Step 5 webhook not received | Webhook URL not reachable from Razorpay servers (localhost only) | Use ngrok for testing OR skip step 6 + manually verify via dashboard |
| Step 6 signature mismatch | Wrong webhook secret | Copy from Razorpay dashboard → Settings → Webhooks → Secret |
| Step 7 refund fails | Payment not captured (still 'created' or 'authorized') | Wait for capture OR manually capture first |

## What to do AFTER all 7 steps green

1. Document pass + date in this doc under "## Test runs" log section.
2. Run this same runbook against PROD KEY once U1 KYC approved (BUT amount=1 to limit risk).
3. Schedule monthly re-run as regression check (especially after Razorpay SDK upgrades).
4. Unblock R-Q1-F-005 status → shipped.

## Test runs log

| Run date | Tester | Pass/Fail | Notes |
|---|---|---|---|
| (founder fills first run here) | | | |

## Out of scope

- Stripe NRI sandbox testing (separate runbook — file as R-Q1-F-006 if Q2 priority)
- Multi-currency testing (Razorpay USD billing — only after U2 Stripe approved)
- Subscription billing testing (after R-Q4-P-002 adopt-temple ships)
- Payment reconciliation cron testing (separate ops runbook)

## Closes

R-Q1-F-005 — runbook shipped. Status flips to `shipped` after founder logs first successful run in §Test runs log.
