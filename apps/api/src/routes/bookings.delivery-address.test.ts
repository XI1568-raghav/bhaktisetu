import { describe, it, expect } from 'vitest';
import { __testing } from './bookings.js';

// ─── CM-06 — an NRI must be able to complete a booking ────────────────────────
//
// Before this suite the prasad delivery address on BOTH /bookings/create-order
// and /bookings/from-offering was pinned to India by two regexes:
//
//   pincode: z.string().regex(/^\d{6}$/)
//   phone:   z.string().regex(/^[6-9]\d{9}$/)
//
// Proven against a freshly-booted API on :4099 (2026-08-13) — a Hoboken NJ
// address (ZIP 07030, +1 201 555 0123) and a London address (SW1A 1AA,
// +44 7700 900123) each returned:
//
//   HTTP 400 {"error":"Validation Error","details":[
//     {"path":["deliveryAddress","pincode"],"validation":"regex"},
//     {"path":["deliveryAddress","phone"],"validation":"regex"}]}
//
// while the identical Indian address returned 201. The homepage was
// simultaneously advertising "INR or USD, GBP, AUD, CAD".
//
// The rail is still Razorpay/INR-only — nothing here reintroduces a foreign
// currency charge (that was RV-01, an 83x overcharge). This is purely about the
// mechanical address/phone barrier.

const { deliveryAddressSchema, buildPrasadAddressRow } = __testing;

const base = {
  fullName: 'Arjun Sharma',
  line1: '412 Washington St, Apt 5B',
  city: 'Hoboken',
  state: 'New Jersey',
};

describe('CM-06 — deliveryAddressSchema accepts the NRI corridors', () => {
  it('accepts a US address: ZIP 07030 + E.164 +12015550123', () => {
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'US',
      pincode: '07030',
      phone: '+1 201 555 0123',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.country).toBe('US');
      expect(r.data.pincode).toBe('07030');
      // normalised to E.164 for the dispatch call
      expect(r.data.phone).toBe('+12015550123');
    }
  });

  it('accepts a US ZIP+4 and a national 10-digit US number', () => {
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'US',
      pincode: '07030-1234',
      phone: '(201) 555-0123',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+12015550123');
  });

  it('accepts a UK address: SW1A 1AA + +44 7700 900123', () => {
    const r = deliveryAddressSchema.safeParse({
      fullName: 'Priya Nair',
      line1: '10 Downing Street',
      city: 'London',
      state: 'Greater London',
      country: 'GB',
      pincode: 'SW1A 1AA',
      phone: '+44 7700 900123',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+447700900123');
  });

  it('accepts a lowercase / unspaced UK postcode', () => {
    const r = deliveryAddressSchema.safeParse({
      fullName: 'Priya Nair',
      line1: '10 Downing Street',
      city: 'London',
      state: '',
      country: 'GB',
      pincode: 'sw1a1aa',
      phone: '07700900123',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+447700900123');
  });

  it('accepts a Dubai address with NO postcode and no emirate-as-state', () => {
    // The UAE genuinely has no postal-code system. Requiring one is the same
    // class of bug as requiring a 6-digit pincode.
    const r = deliveryAddressSchema.safeParse({
      fullName: 'Ramesh Iyer',
      line1: 'Villa 22, Al Wasl Road',
      city: 'Dubai',
      state: '',
      country: 'AE',
      pincode: '',
      phone: '+971 50 123 4567',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.pincode).toBe('');
      expect(r.data.phone).toBe('+971501234567');
    }
  });

  it('accepts a Canadian postal code in either case, with or without the space', () => {
    for (const pc of ['M5V 3L9', 'm5v3l9']) {
      const r = deliveryAddressSchema.safeParse({
        fullName: 'Simran Kaur',
        line1: '88 Queens Quay W',
        city: 'Toronto',
        state: 'Ontario',
        country: 'CA',
        pincode: pc,
        phone: '+1 416 555 0199',
      });
      expect(r.success, `postcode ${pc}`).toBe(true);
    }
  });

  it('accepts Singapore (6-digit postal, no state) and Australia (4-digit)', () => {
    expect(
      deliveryAddressSchema.safeParse({
        fullName: 'Vikram Rao',
        line1: '1 Raffles Place',
        city: 'Singapore',
        state: '',
        country: 'SG',
        pincode: '048616',
        phone: '+65 8123 4567',
      }).success,
    ).toBe(true);

    expect(
      deliveryAddressSchema.safeParse({
        fullName: 'Anita Desai',
        line1: '200 George St',
        city: 'Sydney',
        state: 'NSW',
        country: 'AU',
        pincode: '2000',
        phone: '+61 412 345 678',
      }).success,
    ).toBe(true);
  });

  it('lets an NRI keep an Indian mobile as the contact number for a US address', () => {
    // Real case: the devotee lives in New Jersey but the reachable number for
    // the prasad courier is their Indian phone. Forcing the dial code to match
    // the delivery country would re-block them.
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'US',
      pincode: '07030',
      phone: '+919876543210',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+919876543210');
  });
});

describe('CM-06 — India stays exactly as strict as it was', () => {
  it('accepts the legacy Indian payload with no country field at all', () => {
    // Backwards compatibility: an older web build posts no `country`.
    const r = deliveryAddressSchema.safeParse({
      fullName: 'Arjun Sharma',
      line1: '12 Rajpath',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '9876543210',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.country).toBe('IN');
      expect(r.data.phone).toBe('+919876543210');
    }
  });

  it('still rejects a 5-digit Indian pincode', () => {
    const r = deliveryAddressSchema.safeParse({
      fullName: 'A',
      line1: 'x',
      city: 'Delhi',
      state: 'Delhi',
      country: 'IN',
      pincode: '11000',
      phone: '9876543210',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes('pincode'))).toBe(true);
  });

  it('still rejects an Indian landline-shaped 10-digit number starting with 2', () => {
    const r = deliveryAddressSchema.safeParse({
      fullName: 'A',
      line1: 'x',
      city: 'Delhi',
      state: 'Delhi',
      country: 'IN',
      pincode: '110001',
      phone: '2234567890',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes('phone'))).toBe(true);
  });

  it('still requires state for India', () => {
    const r = deliveryAddressSchema.safeParse({
      fullName: 'A',
      line1: 'x',
      city: 'Delhi',
      state: '',
      country: 'IN',
      pincode: '110001',
      phone: '9876543210',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes('state'))).toBe(true);
  });
});

describe('CM-06 — validation is relaxed, not deleted', () => {
  it('rejects garbage in a US ZIP slot', () => {
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'US',
      pincode: 'not-a-zip',
      phone: '+12015550123',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes('pincode'))).toBe(true);
  });

  it('rejects an invalid UK postcode', () => {
    const r = deliveryAddressSchema.safeParse({
      fullName: 'P',
      line1: 'x',
      city: 'London',
      state: '',
      country: 'GB',
      pincode: 'ZZZZ 9ZZ9',
      phone: '+447700900123',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a phone that is too short to be E.164', () => {
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'US',
      pincode: '07030',
      phone: '+1234',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes('phone'))).toBe(true);
  });

  it('rejects a phone that is too long to be E.164 (>15 digits)', () => {
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'US',
      pincode: '07030',
      phone: '+1234567890123456',
    });
    expect(r.success).toBe(false);
  });

  it('rejects letters in a phone number', () => {
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'US',
      pincode: '07030',
      phone: '+1-201-CALL-NOW',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an unsupported / unknown country code', () => {
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'ZZ',
      pincode: '07030',
      phone: '+12015550123',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes('country'))).toBe(true);
  });

  it('still requires fullName, line1 and city everywhere', () => {
    const r = deliveryAddressSchema.safeParse({
      fullName: '   ',
      line1: '',
      city: '',
      state: 'New Jersey',
      country: 'US',
      pincode: '07030',
      phone: '+12015550123',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.flatMap((i) => i.path);
      expect(paths).toContain('fullName');
      expect(paths).toContain('line1');
      expect(paths).toContain('city');
    }
  });

  it('rejects a postcode for a country that has one but got an empty string', () => {
    const r = deliveryAddressSchema.safeParse({
      ...base,
      country: 'US',
      pincode: '',
      phone: '+12015550123',
    });
    expect(r.success).toBe(false);
  });
});

describe('CM-06 — the persisted UserAddress row stops hardcoding +91 / India', () => {
  it('writes the real country and an E.164 phone in the label for a US address', () => {
    const parsed = deliveryAddressSchema.parse({
      ...base,
      country: 'US',
      pincode: '07030',
      phone: '+1 201 555 0123',
    });
    const row = buildPrasadAddressRow('user-1', parsed);
    expect(row.country).toBe('United States');
    expect(row.label).toBe('Arjun Sharma (+12015550123)');
    expect(row.pincode).toBe('07030');
    expect(row.line2).toBeNull();
  });

  it('still writes India for a domestic booking', () => {
    const parsed = deliveryAddressSchema.parse({
      fullName: 'Arjun Sharma',
      line1: '12 Rajpath',
      line2: 'Near India Gate',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '9876543210',
    });
    const row = buildPrasadAddressRow('user-1', parsed);
    expect(row.country).toBe('India');
    expect(row.label).toBe('Arjun Sharma (+919876543210)');
    expect(row.line2).toBe('Near India Gate');
    // The old code wrote "+91-9876543210" — the dial code was a literal, so a
    // Dubai number would have been persisted as an Indian one.
    expect(row.label).not.toContain('+91-');
  });
});
