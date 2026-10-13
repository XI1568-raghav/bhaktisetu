import { describe, it, expect, afterEach } from 'vitest';
import { withGatewayTimeout } from './razorpay-timeout.js';

describe('withGatewayTimeout', () => {
  afterEach(() => {
    delete process.env.RAZORPAY_TIMEOUT_MS;
  });

  it('bounds the SDK axios instance (default 15s)', () => {
    const client = { api: { rq: { defaults: {} as { timeout?: number } } } };
    expect(withGatewayTimeout(client).api.rq.defaults.timeout).toBe(15_000);
  });

  it('honours RAZORPAY_TIMEOUT_MS', () => {
    process.env.RAZORPAY_TIMEOUT_MS = '2500';
    const client = { api: { rq: { defaults: {} as { timeout?: number } } } };
    expect(withGatewayTimeout(client).api.rq.defaults.timeout).toBe(2500);
  });

  it('tolerates a client without an axios instance (test doubles)', () => {
    const fake = { orders: {} };
    expect(withGatewayTimeout(fake)).toBe(fake);
  });
});
