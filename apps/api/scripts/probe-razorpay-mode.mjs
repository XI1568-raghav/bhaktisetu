#!/usr/bin/env node
// R-Q1-F-003 — probe Razorpay key mode in current env (test | live | unset).
// Env-or-noop. Reads RAZORPAY_KEY_ID only. No network call. Safe in CI.
// Usage: node apps/api/scripts/probe-razorpay-mode.mjs

const id = process.env.RAZORPAY_KEY_ID || '';

if (!id) {
  console.log(JSON.stringify({ status: 'unset', mode: null, note: 'RAZORPAY_KEY_ID absent — demo-fallback path active' }));
  process.exit(0);
}

let mode = 'unknown';
if (id.startsWith('rzp_live_')) mode = 'live';
else if (id.startsWith('rzp_test_')) mode = 'test';

const ok = mode === 'live';

console.log(
  JSON.stringify({
    status: 'set',
    mode,
    ok,
    note:
      mode === 'live'
        ? 'Live mode active — confirm ALLOW_DEMO_PAYMENTS is unset and webhook signature secret rotated'
        : mode === 'test'
          ? 'Test mode — R-Q1-F-003 not yet closed'
          : 'Unknown prefix — manual verification required',
  }),
);

process.exit(ok ? 0 : 1);
