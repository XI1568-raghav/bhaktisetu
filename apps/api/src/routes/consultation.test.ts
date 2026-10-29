import { describe, it, expect } from 'vitest';
import { __testing } from './consultation.js';

const { bookSchema, verifySchema, adminListSchema, astrologerListSchema, nextConsultRef } = __testing;

describe('consultation bookSchema', () => {
  const valid = { astrologerId: 'astro_001', minutes: 15 };

  it('accepts minimal valid request', () => {
    expect(bookSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional scheduledAt iso datetime', () => {
    // bookSchema refines `scheduledAt must be in the future`, so the fixture
    // must stay ahead of the wall clock — a fixed past date is a time-bomb
    // (broke CI 2026-07-08 once the date aged into the past). Derive it from the
    // clock so it never ages; the horizon cap (60 days) rules out a fixed far date.
    const r = bookSchema.safeParse({ ...valid, scheduledAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
    expect(r.success).toBe(true);
  });

  it('rejects a slot beyond the 60-day booking horizon (2099 was accepted on prod)', () => {
    const r = bookSchema.safeParse({ ...valid, scheduledAt: '2099-06-01T10:00:00.000Z' });
    expect(r.success).toBe(false);
    const edge = bookSchema.safeParse({ ...valid, scheduledAt: new Date(Date.now() + 61 * 86_400_000).toISOString() });
    expect(edge.success).toBe(false);
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

describe('consultation adminListSchema', () => {
  it('accepts empty query and applies defaults', () => {
    const r = adminListSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(50);
      expect(r.data.offset).toBe(0);
      expect(r.data.status).toBeUndefined();
    }
  });

  it('coerces string limit/offset to numbers (URL query params arrive as strings)', () => {
    const r = adminListSchema.safeParse({ limit: '25', offset: '100' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(25);
      expect(r.data.offset).toBe(100);
    }
  });

  it('rejects status outside the 4-value enum', () => {
    const r = adminListSchema.safeParse({ status: 'in_progress' });
    expect(r.success).toBe(false);
  });

  it('accepts all 4 valid status values', () => {
    for (const status of ['pending_payment', 'confirmed', 'completed', 'cancelled'] as const) {
      expect(adminListSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('caps limit at 200 to prevent unbounded admin pulls', () => {
    expect(adminListSchema.safeParse({ limit: 200 }).success).toBe(true);
    expect(adminListSchema.safeParse({ limit: 201 }).success).toBe(false);
  });

  it('rejects negative offset', () => {
    expect(adminListSchema.safeParse({ offset: -1 }).success).toBe(false);
  });

  it('rejects astrologerId over 64 chars (mirrors bookSchema cap)', () => {
    expect(adminListSchema.safeParse({ astrologerId: 'x'.repeat(65) }).success).toBe(false);
  });
});

describe('consultation astrologerListSchema', () => {
  it('accepts empty query and applies defaults', () => {
    const r = astrologerListSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(50);
      expect(r.data.offset).toBe(0);
      expect(r.data.status).toBeUndefined();
    }
  });

  it('coerces string limit/offset to numbers (URL query params arrive as strings)', () => {
    const r = astrologerListSchema.safeParse({ limit: '75', offset: '25' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(75);
      expect(r.data.offset).toBe(25);
    }
  });

  it('rejects status outside the 4-value enum', () => {
    expect(astrologerListSchema.safeParse({ status: 'scheduled' }).success).toBe(false);
  });

  it('accepts all 4 valid status values', () => {
    for (const status of ['pending_payment', 'confirmed', 'completed', 'cancelled'] as const) {
      expect(astrologerListSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('caps limit at 200 to prevent unbounded astrologer-side pulls', () => {
    expect(astrologerListSchema.safeParse({ limit: 200 }).success).toBe(true);
    expect(astrologerListSchema.safeParse({ limit: 201 }).success).toBe(false);
  });

  it('rejects negative offset', () => {
    expect(astrologerListSchema.safeParse({ offset: -1 }).success).toBe(false);
  });
});
