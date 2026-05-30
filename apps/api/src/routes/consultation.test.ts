import { describe, it, expect } from 'vitest';
import { __testing } from './consultation.js';

const { bookSchema, verifySchema, nextConsultRef } = __testing;

describe('consultation bookSchema', () => {
  const valid = { astrologerId: 'astro_001', minutes: 15 };

  it('accepts minimal valid request', () => {
    expect(bookSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional scheduledAt iso datetime', () => {
    const r = bookSchema.safeParse({ ...valid, scheduledAt: '2026-06-01T10:00:00.000Z' });
    expect(r.success).toBe(true);
  });

  it('rejects malformed scheduledAt', () => {
    const r = bookSchema.safeParse({ ...valid, scheduledAt: '2026-06-01 10:00' });
    expect(r.success).toBe(false);
  });

  it('rejects minutes below 5', () => {
    expect(bookSchema.safeParse({ ...valid, minutes: 4 }).success).toBe(false);
  });

  it('rejects minutes above 60', () => {
    expect(bookSchema.safeParse({ ...valid, minutes: 61 }).success).toBe(false);
  });

  it('rejects fractional minutes', () => {
    expect(bookSchema.safeParse({ ...valid, minutes: 15.5 }).success).toBe(false);
  });

  it('rejects empty astrologerId', () => {
    expect(bookSchema.safeParse({ ...valid, astrologerId: '' }).success).toBe(false);
  });

  it('rejects astrologerId over 64 chars', () => {
    expect(bookSchema.safeParse({ ...valid, astrologerId: 'x'.repeat(65) }).success).toBe(false);
  });
});

describe('consultation verifySchema', () => {
  const uuid = '11111111-2222-3333-4444-555555555555';

  it('accepts uuid + all razorpay fields', () => {
    const r = verifySchema.safeParse({
      consultationId: uuid,
      razorpay_order_id: 'order_test',
      razorpay_payment_id: 'pay_test',
      razorpay_signature: 'sig_test',
    });
    expect(r.success).toBe(true);
  });

  it('accepts demo path with only consultationId', () => {
    expect(verifySchema.safeParse({ consultationId: uuid }).success).toBe(true);
  });

  it('rejects non-uuid consultationId', () => {
    expect(verifySchema.safeParse({ consultationId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('consultation reference number', () => {
  it('matches AC-YYYYMMDD-XXXXXX shape (6 uppercase hex)', () => {
    expect(nextConsultRef()).toMatch(/^AC-\d{8}-[0-9A-F]{6}$/);
  });

  it('emits distinct refs on consecutive calls', () => {
    const refs = new Set(Array.from({ length: 50 }, () => nextConsultRef()));
    expect(refs.size).toBeGreaterThan(40); // <=10 hex collisions across 50 picks is acceptable
  });
});
