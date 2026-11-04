import { describe, it, expect, afterEach } from 'vitest';
import {
  bookingFeesInr,
  PLATFORM_FEE_INR,
  PRASAD_DELIVERY_FEE_INR,
} from './booking.service.js';

const ORIGINAL = process.env.QA_PAYER_EMAILS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.QA_PAYER_EMAILS;
  else process.env.QA_PAYER_EMAILS = ORIGINAL;
});

describe('puja booking fees: QA payer waiver', () => {
  it('charges everyone the platform fee, and prasad only when requested, when the env is unset', () => {
    delete process.env.QA_PAYER_EMAILS;
    expect(bookingFeesInr('test.devotee@example.com', false)).toEqual({
      platformFeeInr: PLATFORM_FEE_INR,
      prasadFeeInr: 0,
    });
    expect(bookingFeesInr('test.devotee@example.com', true)).toEqual({
      platformFeeInr: PLATFORM_FEE_INR,
      prasadFeeInr: PRASAD_DELIVERY_FEE_INR,
    });
  });

  it('waives both fees for an allowlisted email, any case', () => {
    process.env.QA_PAYER_EMAILS = 'Test.Devotee@example.com';
    expect(bookingFeesInr('TEST.devotee@example.com', true)).toEqual({ platformFeeInr: 0, prasadFeeInr: 0 });
    expect(bookingFeesInr('test.devotee@example.com', false)).toEqual({ platformFeeInr: 0, prasadFeeInr: 0 });
  });

  it('leaves a non-listed user and a user with no email on the normal fees', () => {
    process.env.QA_PAYER_EMAILS = 'test.devotee@example.com';
    expect(bookingFeesInr('real.customer@gmail.com', true)).toEqual({
      platformFeeInr: PLATFORM_FEE_INR,
      prasadFeeInr: PRASAD_DELIVERY_FEE_INR,
    });
    expect(bookingFeesInr(null, false).platformFeeInr).toBe(PLATFORM_FEE_INR);
    expect(bookingFeesInr(undefined, false).platformFeeInr).toBe(PLATFORM_FEE_INR);
  });
});
