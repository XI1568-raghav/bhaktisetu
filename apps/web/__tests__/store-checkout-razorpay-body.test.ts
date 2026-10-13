import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// POST /payments/store-orders/:id/razorpay was sent with `Content-Type:
// application/json` and no body; Fastify answers that 400 ("Body cannot be
// empty when content-type is set to 'application/json'"), so online payment for
// store orders never started.
describe('store checkout razorpay order request', () => {
  it('sends a JSON body alongside the JSON content type', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'store', 'checkout', 'page.tsx'), 'utf8');
    const at = src.indexOf('/razorpay`');
    expect(at).toBeGreaterThan(0);
    const call = src.slice(at, at + 400);
    expect(call).toContain("method: 'POST'");
    expect(call).toContain("body: '{}'");
  });
});

describe('store-admin orders normalizer', () => {
  it('reads priceAtPurchase (the field POST /store/orders actually stores)', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'store-admin', 'orders', 'page.tsx'), 'utf8');
    expect(src).toContain('it.priceAtPurchase');
  });
});

describe('store-admin dashboard orders feed', () => {
  it('reads the { data } envelope and totalAmountInr', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'store-admin', 'page.tsx'), 'utf8');
    expect(src).toContain('ordersJson?.data');
    expect(src).toContain('o.totalAmountInr');
  });
});
