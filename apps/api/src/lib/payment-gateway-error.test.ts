import { describe, it, expect } from 'vitest';
import { describeGatewayFailure, PaymentGatewayError, PAYMENT_GATEWAY_USER_MESSAGE } from './payment-gateway-error.js';

describe('describeGatewayFailure', () => {
  it('reads the Razorpay SDK rejection shape', () => {
    expect(describeGatewayFailure({ statusCode: 401, error: { code: 'BAD_REQUEST_ERROR', description: 'Authentication failed' } }))
      .toEqual({ status: 401, code: 'BAD_REQUEST_ERROR', reason: 'Authentication failed' });
  });
  it('reads an ordinary Error (network fault)', () => {
    const r = describeGatewayFailure(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }));
    expect(r.reason).toBe('socket hang up');
    expect(r.code).toBe('ECONNRESET');
  });
  it('survives null and junk', () => {
    expect(describeGatewayFailure(null)).toEqual({ status: undefined, code: undefined, reason: undefined });
    expect(describeGatewayFailure('boom')).toEqual({ status: undefined, code: undefined, reason: undefined });
  });
});

describe('PaymentGatewayError', () => {
  it('carries a stable code and a message that promises only what is true', () => {
    const e = new PaymentGatewayError(PAYMENT_GATEWAY_USER_MESSAGE, 401, 'X', 'why');
    expect(e.code).toBe('PAYMENT_GATEWAY_UNAVAILABLE');
    expect(e.message).toMatch(/saved and nothing has been charged/);
    expect(e.message).not.toMatch(/401|why/);
  });
});
