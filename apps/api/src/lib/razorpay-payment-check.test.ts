import { describe, it, expect } from 'vitest';
import { checkGatewayPayment } from './razorpay-payment-check.js';

const client = (impl: () => Promise<unknown>) => ({ payments: { fetch: impl } });
const want = { paymentId: 'pay_1', orderId: 'order_1', amountInr: 101 };
const good = { order_id: 'order_1', amount: 10100, currency: 'INR', status: 'captured' };

describe('checkGatewayPayment', () => {
  it('ok when order, amount, currency match', async () => {
    expect((await checkGatewayPayment(client(async () => good), want)).verdict).toBe('ok');
  });
  it.each([
    ['amount', { ...good, amount: 100 }],
    ['order', { ...good, order_id: 'order_x' }],
    ['currency', { ...good, currency: 'USD' }],
    ['status', { ...good, status: 'failed' }],
  ])('mismatch on %s', async (_n, p) => {
    expect((await checkGatewayPayment(client(async () => p), want)).verdict).toBe('mismatch');
  });
  it('unknown payment (400) is a mismatch; a 500 or timeout is unavailable (signature fallback)', async () => {
    expect((await checkGatewayPayment(client(async () => { throw { statusCode: 400 }; }), want)).verdict).toBe('mismatch');
    expect((await checkGatewayPayment(client(async () => { throw { statusCode: 500 }; }), want)).verdict).toBe('unavailable');
    expect((await checkGatewayPayment(client(async () => { throw new Error('timeout'); }), want)).verdict).toBe('unavailable');
    expect((await checkGatewayPayment(null, want)).verdict).toBe('unavailable');
  });
});
