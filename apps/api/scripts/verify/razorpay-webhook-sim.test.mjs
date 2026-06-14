/**
 * Smoke test for razorpay-webhook-sim.mjs.
 *
 * Verifies the sign/verify roundtrip + tamper detection match the
 * server's timing-safe HMAC compare. Pure Node, no vitest dep — runs
 * via `node apps/api/scripts/verify/razorpay-webhook-sim.test.mjs`.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'razorpay-webhook-sim.mjs');

const SECRET = 'whsec_test_roundtrip_abc';
const PAYLOAD = JSON.stringify({
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_test_ROUNDTRIP',
        order_id: 'order_test_ROUNDTRIP',
        amount: 100,
        status: 'captured',
      },
    },
  },
});

function run(args, payload) {
  return spawnSync('node', [SCRIPT, ...args], {
    input: payload,
    encoding: 'utf8',
    env: { ...process.env, RAZORPAY_WEBHOOK_SECRET: SECRET },
  });
}

let failed = 0;
function assert(cond, label) {
  if (cond) {
    process.stdout.write(`  ok    ${label}\n`);
  } else {
    failed += 1;
    process.stdout.write(`  FAIL  ${label}\n`);
  }
}

process.stdout.write('razorpay-webhook-sim roundtrip\n');

// 1. sign --raw produces a 64-char hex string.
const signed = run(['sign', '--raw'], PAYLOAD);
assert(signed.status === 0, 'sign --raw exit 0');
assert(/^[0-9a-f]{64}$/.test(signed.stdout), 'sign --raw output is 64-char hex');

// 2. verify with the matching signature passes.
const verifyOk = run(['verify', signed.stdout], PAYLOAD);
assert(verifyOk.status === 0, 'verify matching signature exit 0');
assert(verifyOk.stdout.includes('PASS'), 'verify matching signature prints PASS');

// 3. verify with a tampered signature fails (timing-safe compare).
const tampered = signed.stdout.slice(0, -1) + (signed.stdout.endsWith('a') ? 'b' : 'a');
const verifyTamper = run(['verify', tampered], PAYLOAD);
assert(verifyTamper.status === 1, 'verify tampered signature exit 1');
assert(verifyTamper.stdout.includes('FAIL'), 'verify tampered signature prints FAIL');

// 4. verify with a length-mismatched signature fails fast.
const verifyShort = run(['verify', 'abc123'], PAYLOAD);
assert(verifyShort.status === 1, 'verify short signature exit 1');
assert(verifyShort.stdout.includes('length mismatch'), 'verify short signature reports length mismatch');

// 5. missing env var dies with code 2.
const noEnv = spawnSync('node', [SCRIPT, 'sign'], {
  input: PAYLOAD,
  encoding: 'utf8',
  env: { ...process.env, RAZORPAY_WEBHOOK_SECRET: '' },
});
assert(noEnv.status === 2, 'missing secret exit 2');

if (failed > 0) {
  process.stdout.write(`\n${failed} test(s) failed\n`);
  process.exit(1);
}
process.stdout.write('\nall razorpay-webhook-sim checks passed\n');
