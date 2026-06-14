#!/usr/bin/env node
/**
 * Razorpay webhook signature simulator + verifier.
 *
 * Used during R-Q1-F-005 sandbox E2E test (Step 6 of
 * docs/finance/razorpay-sandbox-e2e-runbook-v1.md).
 *
 * Two modes:
 *
 *   1) sign   — given a JSON payload + secret, print the HMAC-SHA256
 *               signature Razorpay would attach (X-Razorpay-Signature
 *               header). Use this to POST a simulated webhook to your
 *               local /webhooks/razorpay endpoint without waiting for
 *               an actual sandbox event.
 *
 *   2) verify — given a JSON payload + secret + signature, return
 *               PASS/FAIL using the same timing-safe comparison the
 *               server uses (apps/api/src/services/payment.service.ts).
 *
 * Usage:
 *
 *   # sign mode (default reads stdin payload)
 *   echo '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_TEST"}}}}' \
 *     | RAZORPAY_WEBHOOK_SECRET=whsec_test_xxx \
 *     node apps/api/scripts/verify/razorpay-webhook-sim.mjs sign
 *
 *   # verify mode
 *   echo '<payload-json>' | \
 *     RAZORPAY_WEBHOOK_SECRET=whsec_test_xxx \
 *     node apps/api/scripts/verify/razorpay-webhook-sim.mjs verify <signature>
 *
 *   # quick local POST chain (Step 6 simulation):
 *   PAYLOAD='{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test_123","order_id":"order_test_456","amount":100,"status":"captured"}}}}'
 *   SIG=$(echo -n "$PAYLOAD" | RAZORPAY_WEBHOOK_SECRET=$WS node apps/api/scripts/verify/razorpay-webhook-sim.mjs sign --raw)
 *   curl -X POST http://localhost:3001/webhooks/razorpay \
 *     -H "Content-Type: application/json" \
 *     -H "X-Razorpay-Signature: $SIG" \
 *     --data "$PAYLOAD"
 *
 * Env:
 *   RAZORPAY_WEBHOOK_SECRET (required) — same secret configured on the
 *     Razorpay dashboard webhook endpoint AND in your API .env.
 *
 * Exit codes:
 *   0 — sign success / verify PASS
 *   1 — verify FAIL (mismatch)
 *   2 — usage / env / input error
 */

import crypto from 'node:crypto';

const MODE = process.argv[2];
const RAW = process.argv.includes('--raw');

function die(msg, code = 2) {
  process.stderr.write(`razorpay-webhook-sim: ${msg}\n`);
  process.exit(code);
}

async function readStdin() {
  if (process.stdin.isTTY) {
    die('payload must be piped on stdin (echo \'{...}\' | ...)');
  }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trim();
}

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!secret) die('RAZORPAY_WEBHOOK_SECRET env var required');

if (MODE !== 'sign' && MODE !== 'verify') {
  die('usage: razorpay-webhook-sim.mjs sign | verify <signature>');
}

const payload = await readStdin();
if (!payload) die('empty payload on stdin');

// Razorpay HMAC-SHA256 over the raw JSON payload body.
const expected = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (MODE === 'sign') {
  if (RAW) {
    process.stdout.write(expected);
  } else {
    process.stdout.write(
      `signature: ${expected}\nheader:    X-Razorpay-Signature: ${expected}\n`
    );
  }
  process.exit(0);
}

// verify mode
const provided = process.argv[3];
if (!provided) die('verify mode requires <signature> arg');

const expBuf = Buffer.from(expected, 'utf8');
const sigBuf = Buffer.from(provided, 'utf8');

if (expBuf.length !== sigBuf.length) {
  process.stdout.write(
    `FAIL — length mismatch (expected ${expBuf.length}, got ${sigBuf.length})\n`
  );
  process.exit(1);
}

const ok = crypto.timingSafeEqual(expBuf, sigBuf);
if (ok) {
  process.stdout.write('PASS — signature matches\n');
  process.exit(0);
}

process.stdout.write(
  `FAIL — signature mismatch\n  expected: ${expected}\n  provided: ${provided}\n`
);
process.exit(1);
