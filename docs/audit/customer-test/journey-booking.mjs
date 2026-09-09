#!/usr/bin/env node
/**
 * End-to-end money journey against prod, as a real devotee then a real pandit.
 *
 *   devotee: book -> create-order -> verify-payment
 *   pandit : see the booking
 *   devotee: cancel-quote -> cancel / request-refund
 *
 * SAFETY: refuses to run unless /payments/config reports a rzp_test_* key.
 * With the live key this would create real Razorpay orders, so the guard is the
 * point of the script, not a nicety.
 *
 * Razorpay TEST mode still will not hand us a real payment signature without a
 * browser checkout, so /verify-payment is exercised with a deliberately WRONG
 * signature: the assertion is that it REFUSES. A 200 there would mean money can
 * be confirmed without a valid signature, which is the single worst bug this
 * surface can have.
 *
 *   node journey-booking.mjs --creds <ct-accounts.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.darshya.online/api/v1';
const argv = process.argv.slice(2);
const CREDS = argv[argv.indexOf('--creds') + 1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tokens = JSON.parse(readFileSync(resolve(HERE, '.token-cache.json'), 'utf-8'));
const tok = (email) => tokens[email]?.token;

const findings = [];
const steps = [];
function record(step, ok, detail) {
  steps.push({ step, ok, detail });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${step}${detail ? ` — ${detail}` : ''}`);
}
function finding(severity, kind, detail) {
  findings.push({ severity, kind, detail });
  console.log(`  ${severity} ${kind}: ${detail}`);
}

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text: text.slice(0, 300) };
}

// ── Guard: never run against a live key ──────────────────────────────────────
const cfg = await call('/payments/config');
const keyId = cfg.json?.keyId || '';
console.log(`razorpay key in prod: ${keyId || '<unset>'}`);
if (!keyId.startsWith('rzp_test_')) {
  console.error(`\nREFUSING TO RUN: prod is on "${keyId}". This script would create REAL orders.`);
  console.error('Run the razorpay-test-mode workflow (mode=test) first.');
  process.exit(2);
}

const devotee = tok('ct+devotee@darshya.online');
const pandit = tok('ct+pandit@darshya.online');
if (!devotee) { console.error('no devotee token — run role-matrix.mjs first'); process.exit(1); }

// A real, active offering resolved from the DB (see FINDINGS.md).
const OFFERING = {
  templeId: '4bfc7e51-9c70-4918-98fb-1b7f81798a0e',
  pujaTypeId: 'f4a2d2c1-7a46-4e44-9e70-9b17dc3ec4bd',
  templePujaOfferingId: '00fb9890-f704-4429-be62-eb9ee3e4bfda',
};
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

console.log('\n1. unhappy paths first (these must all be REFUSED)');

const pastDate = await call('/bookings/book', {
  method: 'POST', token: devotee,
  body: { ...OFFERING, scheduledDate: yesterday, scheduledTimeSlot: '07:00', devoteeNames: [{ name: 'CT Devotee' }] },
});
if (pastDate.status < 400) finding('P1', 'PAST_DATE_ACCEPTED', `booking a past date returned ${pastDate.status}`);
else record('past date refused', true, `${pastDate.status}`);

const badSlot = await call('/bookings/book', {
  method: 'POST', token: devotee,
  body: { ...OFFERING, scheduledDate: tomorrow, scheduledTimeSlot: '99:99', devoteeNames: [{ name: 'CT Devotee' }] },
});
if (badSlot.status < 400) finding('P2', 'INVALID_SLOT_ACCEPTED', `slot 99:99 returned ${badSlot.status}`);
else record('invalid slot refused', true, `${badSlot.status}`);

const anon = await call('/bookings/book', {
  method: 'POST',
  body: { ...OFFERING, scheduledDate: tomorrow, scheduledTimeSlot: '07:00', devoteeNames: [{ name: 'x' }] },
});
if (anon.status < 400) finding('P0', 'ANON_BOOKING', `unauthenticated booking returned ${anon.status}`);
else record('anonymous booking refused', true, `${anon.status}`);

console.log('\n2. happy path: create a booking');
const booking = await call('/bookings/book', {
  method: 'POST', token: devotee,
  body: { ...OFFERING, scheduledDate: tomorrow, scheduledTimeSlot: '07:00', devoteeNames: [{ name: 'CT Devotee', gotra: 'Kashyap' }] },
});
const bookingId = booking.json?.booking?.id || booking.json?.id || booking.json?.data?.id;
const bookingNumber = booking.json?.booking?.bookingNumber || booking.json?.bookingNumber;
record('create booking', !!bookingId, `${booking.status} id=${bookingId || 'none'} no=${bookingNumber || '?'} ${bookingId ? '' : booking.text}`);
if (!bookingId) { writeFindings(); process.exit(0); }

console.log('\n3. payment order + signature verification');
// create-order does NOT take a bookingId: it resolves puja + offering server-side
// and mints its own booking, so the client can never name a temple/puja pair the
// offering does not actually bind (bookings.ts:2006-2010).
const order = await call('/bookings/create-order', {
  method: 'POST', token: devotee,
  body: {
    pujaSlug: 'sunderkand-path',
    templeOfferingId: OFFERING.templePujaOfferingId,
    scheduledDate: tomorrow,
    scheduledTime: '07:00',
    devotees: [{ name: 'CT Devotee', gotra: 'Kashyap' }],
  },
});
const orderId = order.json?.order?.id || order.json?.razorpayOrderId || order.json?.orderId;
record('create razorpay order', !!orderId, `${order.status} order=${orderId || 'none'} ${orderId ? '' : order.text}`);
if (orderId && !String(orderId).startsWith('order_')) {
  finding('P1', 'SUSPECT_ORDER_ID', `order id "${orderId}" is not a Razorpay order_* id`);
}

if (orderId) {
  const forged = await call('/bookings/verify-payment', {
    method: 'POST', token: devotee,
    body: { bookingId, razorpay_order_id: orderId, razorpay_payment_id: 'pay_ctForged000000', razorpay_signature: 'deadbeef'.repeat(8) },
  });
  if (forged.status < 400) {
    finding('P0', 'FORGED_SIGNATURE_ACCEPTED', `verify-payment accepted an invalid signature (${forged.status})`);
  } else {
    record('forged signature refused', true, `${forged.status}`);
  }
}

console.log('\n4. the booking is visible to its owner, and only to them');
const mine = await call('/bookings/my', { token: devotee });
const listed = JSON.stringify(mine.json || '').includes(bookingId);
record('devotee sees own booking', listed, `${mine.status}`);

const otherRole = tok('ct+store@darshya.online');
if (otherRole) {
  const peek = await call(`/bookings/${bookingId}`, { token: otherRole });
  if (peek.status === 200) finding('P0', 'BOOKING_LEAK', `store_owner read another user's booking ${bookingId}`);
  else record('other role cannot read the booking', true, `${peek.status}`);
}

console.log('\n5. cancellation');
const quote = await call(`/bookings/${bookingId}/cancel-quote`, { token: devotee });
record('cancel quote', quote.status === 200, `${quote.status} ${quote.status === 200 ? JSON.stringify(quote.json).slice(0, 120) : quote.text}`);

const cancel = await call(`/bookings/${bookingId}/cancel`, { method: 'POST', token: devotee, body: { reason: 'customer-test cleanup' } });
record('cancel booking', cancel.status < 400, `${cancel.status} ${cancel.status >= 400 ? cancel.text : ''}`);

const doubleCancel = await call(`/bookings/${bookingId}/cancel`, { method: 'POST', token: devotee, body: { reason: 'again' } });
if (doubleCancel.status < 400) finding('P2', 'DOUBLE_CANCEL', `cancelling an already-cancelled booking returned ${doubleCancel.status}`);
else record('double cancel refused', true, `${doubleCancel.status}`);

function writeFindings() {
  writeFileSync(resolve(HERE, 'LEDGER-journey.json'), JSON.stringify({ generatedAt: new Date().toISOString(), keyId, bookingId, bookingNumber, steps, findings }, null, 2));
  console.log(`\nsteps: ${steps.filter((s) => s.ok).length}/${steps.length} ok · findings: ${findings.length}`);
  findings.forEach((f) => console.log(`  ${f.severity} ${f.kind}: ${f.detail}`));
}
writeFindings();
