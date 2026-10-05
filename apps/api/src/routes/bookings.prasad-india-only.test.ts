import { describe, it, expect } from 'vitest';
import { PRASAD_INDIA_ONLY_MESSAGE } from '@poojly/shared';
import { __testing } from './bookings.js';

// Owner decision 2026-10-06: prasad is delivered within India only. A booking
// WITHOUT prasad stays open to NRIs anywhere.

const { createOrderBodySchema, fromOfferingBodySchema, zodErrorBody } = __testing;

function futureDate(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

const indian = {
  fullName: 'Arjun Sharma',
  line1: '12 Ganga Marg',
  city: 'Varanasi',
  state: 'Uttar Pradesh',
  country: 'IN',
  pincode: '221001',
  phone: '9876543210',
};
const london = {
  fullName: 'Asha Patel',
  line1: '10 Downing Street',
  city: 'London',
  state: '',
  country: 'GB',
  pincode: 'SW1A 1AA',
  phone: '+44 7700 900123',
};

const createOrderBase = {
  pujaSlug: 'rudrabhishek',
  templeOfferingId: '0f9a3d4c-2b41-4d6e-8a10-6f2c9b7e1d55',
  scheduledDate: futureDate(),
  scheduledTime: '06:00',
  devotees: [{ name: 'Arjun Sharma' }],
};
const fromOfferingBase = {
  offeringId: '3a1c8e77-9d02-4f5b-b6c1-70e4d2a91f38',
  scheduledDate: futureDate(),
  scheduledTime: '06:00',
  devotees: [{ name: 'Arjun Sharma' }],
};

const cases = [
  ['create-order', createOrderBodySchema, createOrderBase],
  ['from-offering', fromOfferingBodySchema, fromOfferingBase],
] as const;

describe.each(cases)('prasad is India-only: %s', (_name, schema, base) => {
  it('rejects prasad to a non-Indian country with the clear sentence', () => {
    const r = schema.safeParse({ ...base, prasadDelivery: true, deliveryAddress: london });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === PRASAD_INDIA_ONLY_MESSAGE)).toBe(true);
      expect(zodErrorBody(r.error).error).toBe(PRASAD_INDIA_ONLY_MESSAGE);
    }
  });

  it.each(['12345', '1100011', '11000A', ''])('rejects prasad to pincode %j', (pincode) => {
    const r = schema.safeParse({
      ...base,
      prasadDelivery: true,
      deliveryAddress: { ...indian, pincode },
    });
    expect(r.success).toBe(false);
  });

  it('rejects prasad with a missing state (Indian addresses need one)', () => {
    const r = schema.safeParse({
      ...base,
      prasadDelivery: true,
      deliveryAddress: { ...indian, state: '' },
    });
    expect(r.success).toBe(false);
  });

  it('accepts prasad to a valid Indian address, country defaulting to India', () => {
    const { country: _c, ...noCountry } = indian;
    expect(schema.safeParse({ ...base, prasadDelivery: true, deliveryAddress: indian }).success).toBe(true);
    expect(schema.safeParse({ ...base, prasadDelivery: true, deliveryAddress: noCountry }).success).toBe(true);
  });

  it('still lets an NRI book WITHOUT prasad, with or without an address', () => {
    expect(schema.safeParse({ ...base, nriPricing: true }).success).toBe(true);
    expect(
      schema.safeParse({ ...base, prasadDelivery: false, deliveryAddress: london }).success,
    ).toBe(true);
  });
});

describe('zodErrorBody', () => {
  it('keeps the legacy Validation Error string for every other failure', () => {
    const r = createOrderBodySchema.safeParse({ ...createOrderBase, prasadDelivery: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodErrorBody(r.error).error).toBe('Validation Error');
  });
});
