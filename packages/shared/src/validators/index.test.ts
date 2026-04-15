import { describe, it, expect } from 'vitest';
import {
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  updateProfileSchema,
  createAddressSchema,
  createBookingSchema,
  createReviewSchema,
  searchQuerySchema,
  paginationSchema,
} from './index.js';

// ─── phoneOtpRequestSchema ───────────────────────────────────────────────────

describe('phoneOtpRequestSchema', () => {
  it('accepts a valid +91 phone number', () => {
    const result = phoneOtpRequestSchema.safeParse({
      phone: '+919876543210',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid international phone number', () => {
    const result = phoneOtpRequestSchema.safeParse({
      phone: '+14155551234',
      countryCode: '+1',
    });
    expect(result.success).toBe(true);
  });

  it('defaults countryCode to +91', () => {
    const result = phoneOtpRequestSchema.safeParse({
      phone: '+919876543210',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.countryCode).toBe('+91');
    }
  });

  it('rejects phone numbers starting with 0', () => {
    const result = phoneOtpRequestSchema.safeParse({
      phone: '09876543210',
    });
    expect(result.success).toBe(false);
  });

  it('rejects phone numbers that are too short', () => {
    const result = phoneOtpRequestSchema.safeParse({
      phone: '+12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty phone string', () => {
    const result = phoneOtpRequestSchema.safeParse({
      phone: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric phone input', () => {
    const result = phoneOtpRequestSchema.safeParse({
      phone: 'abc123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects countryCode longer than 4 chars', () => {
    const result = phoneOtpRequestSchema.safeParse({
      phone: '+919876543210',
      countryCode: '+9999',
    });
    expect(result.success).toBe(false);
  });
});

// ─── phoneOtpVerifySchema ────────────────────────────────────────────────────

describe('phoneOtpVerifySchema', () => {
  it('accepts valid phone + 6-digit OTP', () => {
    const result = phoneOtpVerifySchema.safeParse({
      phone: '+919876543210',
      otp: '123456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects OTP shorter than 6 digits', () => {
    const result = phoneOtpVerifySchema.safeParse({
      phone: '+919876543210',
      otp: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects OTP longer than 6 digits', () => {
    const result = phoneOtpVerifySchema.safeParse({
      phone: '+919876543210',
      otp: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty OTP', () => {
    const result = phoneOtpVerifySchema.safeParse({
      phone: '+919876543210',
      otp: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing phone', () => {
    const result = phoneOtpVerifySchema.safeParse({
      otp: '123456',
    });
    expect(result.success).toBe(false);
  });

  it('defaults countryCode to +91', () => {
    const result = phoneOtpVerifySchema.safeParse({
      phone: '+919876543210',
      otp: '123456',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.countryCode).toBe('+91');
    }
  });
});

// ─── updateProfileSchema ─────────────────────────────────────────────────────

describe('updateProfileSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a valid displayName', () => {
    const result = updateProfileSchema.safeParse({
      displayName: 'Ram Prasad',
    });
    expect(result.success).toBe(true);
  });

  it('rejects displayName shorter than 2 chars', () => {
    const result = updateProfileSchema.safeParse({
      displayName: 'A',
    });
    expect(result.success).toBe(false);
  });

  it('rejects displayName longer than 100 chars', () => {
    const result = updateProfileSchema.safeParse({
      displayName: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid email', () => {
    const result = updateProfileSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = updateProfileSchema.safeParse({
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid dateOfBirth in YYYY-MM-DD', () => {
    const result = updateProfileSchema.safeParse({
      dateOfBirth: '1990-05-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects dateOfBirth in DD/MM/YYYY format', () => {
    const result = updateProfileSchema.safeParse({
      dateOfBirth: '15/05/1990',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid tradition values', () => {
    const traditions = [
      'SHAIVA', 'VAISHNAVA', 'SHAKTA', 'SMARTA', 'GANAPATYA',
      'SAURA', 'BUDDHIST', 'JAIN', 'SIKH',
    ];
    for (const tradition of traditions) {
      const result = updateProfileSchema.safeParse({ tradition });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid tradition value', () => {
    const result = updateProfileSchema.safeParse({
      tradition: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid avatar URL', () => {
    const result = updateProfileSchema.safeParse({
      avatarUrl: 'https://example.com/avatar.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid avatar URL', () => {
    const result = updateProfileSchema.safeParse({
      avatarUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts gotra, nakshatra, and rashi fields', () => {
    const result = updateProfileSchema.safeParse({
      gotra: 'Bharadwaj',
      nakshatra: 'Ashwini',
      rashi: 'Mesha',
    });
    expect(result.success).toBe(true);
  });
});

// ─── createAddressSchema ─────────────────────────────────────────────────────

describe('createAddressSchema', () => {
  const validAddress = {
    label: 'Home',
    addressLine1: '123 Temple Street',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    postalCode: '221001',
  };

  it('accepts a valid address', () => {
    const result = createAddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it('defaults country to IN', () => {
    const result = createAddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('IN');
    }
  });

  it('defaults isDefault to false', () => {
    const result = createAddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(false);
    }
  });

  it('rejects missing label', () => {
    const { label, ...noLabel } = validAddress;
    const result = createAddressSchema.safeParse(noLabel);
    expect(result.success).toBe(false);
  });

  it('rejects missing addressLine1', () => {
    const { addressLine1, ...noAddr } = validAddress;
    const result = createAddressSchema.safeParse(noAddr);
    expect(result.success).toBe(false);
  });

  it('rejects missing city', () => {
    const { city, ...noCity } = validAddress;
    const result = createAddressSchema.safeParse(noCity);
    expect(result.success).toBe(false);
  });

  it('rejects missing state', () => {
    const { state, ...noState } = validAddress;
    const result = createAddressSchema.safeParse(noState);
    expect(result.success).toBe(false);
  });

  it('rejects missing postalCode', () => {
    const { postalCode, ...noPostal } = validAddress;
    const result = createAddressSchema.safeParse(noPostal);
    expect(result.success).toBe(false);
  });

  it('rejects postalCode shorter than 4 chars', () => {
    const result = createAddressSchema.safeParse({
      ...validAddress,
      postalCode: '123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts addressLine2 as optional', () => {
    const result = createAddressSchema.safeParse({
      ...validAddress,
      addressLine2: 'Near Ganga Ghat',
    });
    expect(result.success).toBe(true);
  });

  it('rejects label longer than 50 chars', () => {
    const result = createAddressSchema.safeParse({
      ...validAddress,
      label: 'A'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects addressLine1 shorter than 5 chars', () => {
    const result = createAddressSchema.safeParse({
      ...validAddress,
      addressLine1: '123',
    });
    expect(result.success).toBe(false);
  });
});

// ─── createBookingSchema ─────────────────────────────────────────────────────

describe('createBookingSchema', () => {
  // Build a future date for tests
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const validBooking = {
    templeId: '550e8400-e29b-41d4-a716-446655440000',
    pujaTypeId: '550e8400-e29b-41d4-a716-446655440001',
    templePujaOfferingId: '550e8400-e29b-41d4-a716-446655440002',
    scheduledDate: futureDateStr,
    devoteeNames: ['Ram Prasad', 'Sita Devi'],
  };

  it('accepts a valid booking', () => {
    const result = createBookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID templeId', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      templeId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID pujaTypeId', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      pujaTypeId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID templePujaOfferingId', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      templePujaOfferingId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a past date', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      scheduledDate: '2020-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts today\'s date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]!;
    const result = createBookingSchema.safeParse({
      ...validBooking,
      scheduledDate: tomorrowStr,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      scheduledDate: '15-01-2026',
    });
    expect(result.success).toBe(false);
  });

  it('requires at least 1 devotee name', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      devoteeNames: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 devotee names', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      devoteeNames: Array.from({ length: 11 }, (_, i) => `Devotee ${i + 1}`),
    });
    expect(result.success).toBe(false);
  });

  it('rejects devotee names shorter than 2 chars', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      devoteeNames: ['A'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 10 devotee names', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      devoteeNames: Array.from({ length: 10 }, (_, i) => `Devotee ${i + 1}`),
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional scheduledTime in HH:MM format', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      scheduledTime: '10:30',
    });
    expect(result.success).toBe(true);
  });

  it('rejects scheduledTime in invalid format', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      scheduledTime: '10:30:00',
    });
    expect(result.success).toBe(false);
  });

  it('defaults isOnline to false', () => {
    const result = createBookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOnline).toBe(false);
    }
  });

  it('defaults prasadDeliveryRequested to false', () => {
    const result = createBookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prasadDeliveryRequested).toBe(false);
    }
  });

  it('defaults currency to INR', () => {
    const result = createBookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('INR');
    }
  });

  it('accepts USD as currency', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      currency: 'USD',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid currency', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      currency: 'EUR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects specialInstructions over 500 chars', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      specialInstructions: 'A'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid prasadDeliveryAddressId as UUID', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      prasadDeliveryRequested: true,
      prasadDeliveryAddressId: '550e8400-e29b-41d4-a716-446655440099',
    });
    expect(result.success).toBe(true);
  });
});

// ─── createReviewSchema ──────────────────────────────────────────────────────

describe('createReviewSchema', () => {
  const validReview = {
    bookingId: '550e8400-e29b-41d4-a716-446655440000',
    rating: 5,
  };

  it('accepts a valid review with rating only', () => {
    const result = createReviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it('accepts rating of 1 (minimum)', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts rating of 5 (maximum)', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 5 });
    expect(result.success).toBe(true);
  });

  it('rejects rating of 0 (below minimum)', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating of 6 (above maximum)', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID bookingId', () => {
    const result = createReviewSchema.safeParse({
      bookingId: 'not-uuid',
      rating: 5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional title between 3-100 chars', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      title: 'Great puja experience',
    });
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 3 chars', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      title: 'Hi',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 100 chars', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      title: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional comment between 10-1000 chars', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      comment: 'This was an excellent puja experience. The priest was very knowledgeable.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects comment shorter than 10 chars', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      comment: 'Good',
    });
    expect(result.success).toBe(false);
  });

  it('rejects comment longer than 1000 chars', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      comment: 'A'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ─── searchQuerySchema ───────────────────────────────────────────────────────

describe('searchQuerySchema', () => {
  it('accepts a valid search query', () => {
    const result = searchQuerySchema.safeParse({ query: 'shiva temple' });
    expect(result.success).toBe(true);
  });

  it('defaults page to 1', () => {
    const result = searchQuerySchema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it('defaults pageSize to 20', () => {
    const result = searchQuerySchema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('defaults sortOrder to desc', () => {
    const result = searchQuerySchema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('coerces string page to number', () => {
    const result = searchQuerySchema.safeParse({ query: 'test', page: '3' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it('coerces string pageSize to number', () => {
    const result = searchQuerySchema.safeParse({ query: 'test', pageSize: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageSize).toBe(50);
    }
  });

  it('rejects empty query string', () => {
    const result = searchQuerySchema.safeParse({ query: '' });
    expect(result.success).toBe(false);
  });

  it('rejects query longer than 200 chars', () => {
    const result = searchQuerySchema.safeParse({ query: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize over 100', () => {
    const result = searchQuerySchema.safeParse({ query: 'test', pageSize: 200 });
    expect(result.success).toBe(false);
  });

  it('rejects page less than 1', () => {
    const result = searchQuerySchema.safeParse({ query: 'test', page: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts valid tradition filter', () => {
    const result = searchQuerySchema.safeParse({
      query: 'temple',
      tradition: 'SHAIVA',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid tradition filter', () => {
    const result = searchQuerySchema.safeParse({
      query: 'temple',
      tradition: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional city and state', () => {
    const result = searchQuerySchema.safeParse({
      query: 'temple',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
    });
    expect(result.success).toBe(true);
  });

  it('trims whitespace from query', () => {
    const result = searchQuerySchema.safeParse({ query: '  shiva temple  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('shiva temple');
    }
  });
});

// ─── paginationSchema ────────────────────────────────────────────────────────

describe('paginationSchema', () => {
  it('accepts empty object with defaults', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('accepts custom page and pageSize', () => {
    const result = paginationSchema.safeParse({ page: 5, pageSize: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it('coerces string values to numbers', () => {
    const result = paginationSchema.safeParse({ page: '3', pageSize: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('rejects page below 1', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize below 1', () => {
    const result = paginationSchema.safeParse({ pageSize: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize above 100', () => {
    const result = paginationSchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts sortOrder "asc"', () => {
    const result = paginationSchema.safeParse({ sortOrder: 'asc' });
    expect(result.success).toBe(true);
  });

  it('accepts sortOrder "desc"', () => {
    const result = paginationSchema.safeParse({ sortOrder: 'desc' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid sortOrder', () => {
    const result = paginationSchema.safeParse({ sortOrder: 'random' });
    expect(result.success).toBe(false);
  });

  it('accepts optional sortBy field', () => {
    const result = paginationSchema.safeParse({ sortBy: 'createdAt' });
    expect(result.success).toBe(true);
  });

  it('rejects sortBy longer than 50 chars', () => {
    const result = paginationSchema.safeParse({ sortBy: 'A'.repeat(51) });
    expect(result.success).toBe(false);
  });
});
