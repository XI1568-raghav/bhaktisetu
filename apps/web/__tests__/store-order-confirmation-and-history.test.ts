import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const web = (rel: string) => resolve(__dirname, '..', rel);
const read = (rel: string) => readFileSync(web(rel), 'utf8');

// S-11 (prod sweep 2026-08-12): the confirmation screen rendered
//   Order ID: {orderNumber ?? `ORD-${Date.now().toString().slice(-8)}`}
// so when the API returned no order number the customer was handed a reference
// invented from their own browser clock — a number support can never find.
//
// S-10: the same screen surfaced `Order failed (400) {"error":"Invalid request
// body","details":{"formErrors":[],"fieldErrors":{"shippingAddress":["Expected
// string, received` — the raw response body, truncated mid-word at 120 chars.
//
// COM-09: after paying, the buyer had nowhere to look the order up. The
// success CTA pointed at /bookings (which has no store orders), /store/orders
// fell into the /store/[handle] catch-all and rendered "The product you are
// looking for does not exist", and /profile/orders 404'd.

describe('store checkout confirmation (S-11)', () => {
  const src = read('app/store/checkout/page.tsx');

  it('never synthesises an order number from the browser clock', () => {
    expect(src).not.toMatch(/ORD-\$\{Date\.now\(\)/);
    expect(src).not.toMatch(/orderNumber \?\? `ORD-/);
  });

  it('says the confirmation is pending when the server gave no number', () => {
    expect(src).toMatch(/Your confirmation is on its way by email/);
  });
});

describe('store checkout errors (S-10)', () => {
  const src = read('app/store/checkout/page.tsx');

  it('does not render the raw response body to the customer', () => {
    expect(src).not.toMatch(/Order failed \(\$\{res\.status\}\) \$\{txt/);
    expect(src).not.toMatch(/txt\.slice\(0, 120\)/);
  });

  it('routes checkout failures through the friendly-error helper', () => {
    expect(src).toMatch(/friendlyApiError/);
  });

  it('handles the 409 price_mismatch the API now returns', () => {
    expect(src).toMatch(/409/);
  });
});

describe('store order history (COM-09)', () => {
  it('has a buyer-facing /store/orders page', () => {
    expect(existsSync(web('app/store/orders/page.tsx'))).toBe(true);
  });

  it('that page reads the real GET /store/orders endpoint', () => {
    const src = read('app/store/orders/page.tsx');
    expect(src).toMatch(/store\/orders/);
    expect(src).toMatch(/orderNumber/);
    expect(src).toMatch(/trackingNumber/);
  });

  it('renders an honest empty state rather than sample orders', () => {
    const src = read('app/store/orders/page.tsx');
    expect(src).toMatch(/No orders yet|no orders/i);
    // No fixture arrays masquerading as the customer's orders.
    expect(src).not.toMatch(/ORD-2026\d{4}/);
  });

  it('points the confirmation CTA at the order history, not /bookings', () => {
    const src = read('app/store/checkout/page.tsx');
    const cta = src.slice(src.indexOf('View My Orders') - 400, src.indexOf('View My Orders'));
    expect(cta).toMatch(/\/store\/orders/);
  });
});
