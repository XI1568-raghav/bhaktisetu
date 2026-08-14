import { describe, it, expect } from 'vitest';
import { __testing } from './bookings.js';

// ─── DB-05 — never charge for a prasad delivery with nowhere to ship it ──────
//
// Reproduced from the prod sweep (2026-08-12) against a booted API: POST
// /bookings/create-order with `"prasadDelivery": true` and NO `deliveryAddress`
// key returned
//
//   201 {"bookingNumber":"BS-20260812-PXP93","amount":130100}
//
// i.e. ₹1,301 = ₹1,100 base + ₹51 platform + ₹150 prasad delivery — and the
// booking row came back with prasadDeliveryRequested = true and
// prasadDeliveryAddressId = null. The Zod body declared `deliveryAddress` as
// `.optional()` with no cross-field rule, the route only persisted an address
// `if (body.prasadDelivery && body.deliveryAddress)`, and
// booking.service.createBooking adds PRASAD_DELIVERY_FEE_INR on the boolean
// alone. The web wizard validates the address client-side, so the only clients
// that could reach this were the mobile app, a retried request, or anything
// calling the API directly.
//
// Both money-taking order bodies now carry the pairing rule, so the request is
// rejected before a booking row or a Razorpay order exists.

const { createOrderBodySchema, fromOfferingBodySchema } = __testing;

/** A date comfortably inside the booking window, so the past-date refinement
 *  never masks the assertion under test. */
function futureDate(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

const address = {
  fullName: 'Arjun Sharma',
  line1: '12 Ganga Marg',
  city: 'Varanasi',
  state: 'Uttar Pradesh',
  country: 'IN',
  pincode: '221001',
  phone: '9876543210',
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

describe('DB-05 — POST /bookings/create-order requires an address for prasad', () => {
  it('rejects prasadDelivery: true with no deliveryAddress key at all', () => {
    const r = createOrderBodySchema.safeParse({
      ...createOrderBase,
      prasadDelivery: true,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.join('.') === 'deliveryAddress');
      expect(issue).toBeDefined();
      expect(issue!.message).toMatch(/delivery address is required/i);
    }
  });

  it('rejects prasadDelivery: true with an explicitly undefined deliveryAddress', () => {
    const r = createOrderBodySchema.safeParse({
      ...createOrderBase,
      prasadDelivery: true,
      deliveryAddress: undefined,
    });
    expect(r.success).toBe(false);
  });

  it('accepts prasadDelivery: true when a full deliveryAddress rides along', () => {
    const r = createOrderBodySchema.safeParse({
      ...createOrderBase,
      prasadDelivery: true,
      deliveryAddress: address,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.prasadDelivery).toBe(true);
      expect(r.data.deliveryAddress?.pincode).toBe('221001');
    }
  });

  it('still accepts a booking with no prasad delivery and no address', () => {
    const r = createOrderBodySchema.safeParse(createOrderBase);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.prasadDelivery).toBe(false);
  });

  it('still accepts prasadDelivery: false with no address', () => {
    const r = createOrderBodySchema.safeParse({
      ...createOrderBase,
      prasadDelivery: false,
    });
    expect(r.success).toBe(true);
  });

  it('keeps the past-date guard (the refinement did not replace it)', () => {
    const r = createOrderBodySchema.safeParse({
      ...createOrderBase,
      scheduledDate: '2020-01-01',
      prasadDelivery: true,
      deliveryAddress: address,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /past date/i.test(i.message))).toBe(true);
    }
  });
});

describe('DB-05 — POST /bookings/from-offering carries the same guard', () => {
  it('rejects prasadDelivery: true with no deliveryAddress', () => {
    const r = fromOfferingBodySchema.safeParse({
      ...fromOfferingBase,
      prasadDelivery: true,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.join('.') === 'deliveryAddress'),
      ).toBe(true);
    }
  });

  it('accepts prasadDelivery: true with a deliveryAddress', () => {
    const r = fromOfferingBodySchema.safeParse({
      ...fromOfferingBase,
      prasadDelivery: true,
      deliveryAddress: address,
    });
    expect(r.success).toBe(true);
  });

  it('leaves the currency hint alone — it is analytics only, never the rail', () => {
    const r = fromOfferingBodySchema.safeParse({
      ...fromOfferingBase,
      currency: 'USD',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.currency).toBe('USD');
  });
});
