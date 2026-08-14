import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateDeliveryAddress,
  DELIVERY_COUNTRY_OPTIONS,
  emptyDeliveryAddress,
} from '../lib/delivery-address';

/**
 * CM-06 (2026-08-13, P0) — the NRI could not complete a booking.
 *
 * The wizard's step-3 prasad address block validated with two India-only
 * regexes, and the API's Zod schema mirrored them exactly:
 *
 *   web  app/pujas/book/page.tsx:856  /^\d{6}$/         pincode
 *   web  app/pujas/book/page.tsx:859  /^[6-9]\d{9}$/    phone
 *   api  routes/bookings.ts:1685-1686 and 1874-1875     same two regexes
 *
 * There was no country field anywhere in the 2,341-line wizard. Meanwhile the
 * homepage NRI lane advertised "Gift a puja from abroad — INR or USD, GBP, AUD,
 * CAD" against a Razorpay-only, INR-only rail.
 *
 * This suite pins both halves of the fix:
 *   1. the form accepts the NRI corridors and still rejects garbage, and
 *   2. the site stops advertising a multi-currency rail it does not have.
 *
 * It deliberately does NOT assert anything about a foreign-currency charge —
 * billing stays INR (RV-01).
 */

const WEB = join(__dirname, '..');

const us = {
  ...emptyDeliveryAddress(),
  fullName: 'Arjun Sharma',
  line1: '412 Washington St, Apt 5B',
  city: 'Hoboken',
  state: 'New Jersey',
  country: 'US',
  pincode: '07030',
  phone: '+1 201 555 0123',
};

describe('CM-06 web form — the NRI corridors pass validation', () => {
  it('accepts a US address that used to fail on both pincode and phone', () => {
    expect(validateDeliveryAddress(us)).toEqual({});
  });

  it('accepts a UK address (SW1A 1AA, +44 7700 900123)', () => {
    expect(
      validateDeliveryAddress({
        ...emptyDeliveryAddress(),
        fullName: 'Priya Nair',
        line1: '10 Downing Street',
        city: 'London',
        state: 'Greater London',
        country: 'GB',
        pincode: 'SW1A 1AA',
        phone: '+44 7700 900123',
      }),
    ).toEqual({});
  });

  it('accepts a Dubai address with no postcode and no state', () => {
    expect(
      validateDeliveryAddress({
        ...emptyDeliveryAddress(),
        fullName: 'Ramesh Iyer',
        line1: 'Villa 22, Al Wasl Road',
        city: 'Dubai',
        state: '',
        country: 'AE',
        pincode: '',
        phone: '+971 50 123 4567',
      }),
    ).toEqual({});
  });

  it('accepts Canada, Australia and Singapore', () => {
    const cases = [
      { country: 'CA', city: 'Toronto', state: 'Ontario', pincode: 'M5V 3L9', phone: '+1 416 555 0199' },
      { country: 'AU', city: 'Sydney', state: 'NSW', pincode: '2000', phone: '+61 412 345 678' },
      { country: 'SG', city: 'Singapore', state: '', pincode: '048616', phone: '+65 8123 4567' },
    ];
    for (const c of cases) {
      expect(
        validateDeliveryAddress({ ...emptyDeliveryAddress(), fullName: 'X', line1: '1 Main St', ...c }),
        `country ${c.country}`,
      ).toEqual({});
    }
  });

  it('offers at least 40 delivery countries, India first', () => {
    // The homepage claims "Book from 40+ countries". Make that claim true.
    expect(DELIVERY_COUNTRY_OPTIONS.length).toBeGreaterThanOrEqual(40);
    expect(DELIVERY_COUNTRY_OPTIONS[0]?.code).toBe('IN');
    for (const code of ['US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'MY', 'ZA', 'QA']) {
      expect(DELIVERY_COUNTRY_OPTIONS.some((c) => c.code === code), code).toBe(true);
    }
  });

  it('defaults a fresh address to India', () => {
    expect(emptyDeliveryAddress().country).toBe('IN');
  });
});

describe('CM-06 web form — India is unchanged and validation still bites', () => {
  const inAddr = {
    ...emptyDeliveryAddress(),
    fullName: 'Arjun Sharma',
    line1: '12 Rajpath',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'IN',
    pincode: '110001',
    phone: '9876543210',
  };

  it('accepts the domestic address', () => {
    expect(validateDeliveryAddress(inAddr)).toEqual({});
  });

  it('rejects a 5-digit Indian pincode', () => {
    expect(validateDeliveryAddress({ ...inAddr, pincode: '11000' })).toHaveProperty('addr_pincode');
  });

  it('rejects an Indian number that is not a mobile', () => {
    expect(validateDeliveryAddress({ ...inAddr, phone: '2234567890' })).toHaveProperty('addr_phone');
  });

  it('rejects garbage in a US ZIP slot', () => {
    expect(validateDeliveryAddress({ ...us, pincode: 'not-a-zip' })).toHaveProperty('addr_pincode');
  });

  it('rejects an empty postcode for a country that has postcodes', () => {
    expect(validateDeliveryAddress({ ...us, pincode: '' })).toHaveProperty('addr_pincode');
  });

  it('rejects a phone that cannot be E.164', () => {
    expect(validateDeliveryAddress({ ...us, phone: '+1234' })).toHaveProperty('addr_phone');
    expect(validateDeliveryAddress({ ...us, phone: '+1-201-CALL-NOW' })).toHaveProperty('addr_phone');
  });

  it('still requires name, line1 and city', () => {
    const errs = validateDeliveryAddress({ ...us, fullName: ' ', line1: '', city: '' });
    expect(errs).toHaveProperty('addr_name');
    expect(errs).toHaveProperty('addr_line1');
    expect(errs).toHaveProperty('addr_city');
  });

  it('requires state for India and the US but not for Singapore', () => {
    expect(validateDeliveryAddress({ ...inAddr, state: '' })).toHaveProperty('addr_state');
    expect(validateDeliveryAddress({ ...us, state: '' })).toHaveProperty('addr_state');
    expect(
      validateDeliveryAddress({
        ...emptyDeliveryAddress(),
        fullName: 'X',
        line1: '1 Raffles Place',
        city: 'Singapore',
        state: '',
        country: 'SG',
        pincode: '048616',
        phone: '+6581234567',
      }),
    ).toEqual({});
  });
});

describe('CM-06 wizard wiring — the form actually has a country field', () => {
  const page = readFileSync(join(WEB, 'app/pujas/book/page.tsx'), 'utf8');

  it('no longer carries the India-only pincode/phone regexes inline', () => {
    expect(page).not.toContain('/^\\d{6}$/');
    expect(page).not.toContain('/^[6-9]\\d{9}$/');
  });

  it('renders a country selector and sends country to the API', () => {
    expect(page).toContain('DELIVERY_COUNTRY_OPTIONS');
    expect(page).toContain('address.country');
  });

  it('delegates address validation to the shared helper', () => {
    expect(page).toContain('validateDeliveryAddress');
  });
});

describe('CM-06 copy — stop advertising a multi-currency rail that does not exist', () => {
  it('the homepage NRI lane no longer promises USD/GBP/AUD/CAD billing', () => {
    const src = readFileSync(join(WEB, 'components/home/NriLaneAbTest.tsx'), 'utf8');
    expect(src).not.toContain('INR or USD, GBP, AUD, CAD');
    expect(src).toMatch(/billed in INR/i);
  });

  it('/nri-pujas no longer claims dual currency with no markup', () => {
    const src = readFileSync(join(WEB, 'app/nri-pujas/page.tsx'), 'utf8');
    expect(src).not.toContain('USD/GBP/CAD/AUD/EUR/SGD/AED');
    expect(src).not.toContain('Dual currency, no markup');
  });

  it('/pujas metadata no longer claims dual INR/USD pricing', () => {
    const src = readFileSync(join(WEB, 'app/pujas/page.tsx'), 'utf8');
    expect(src).not.toMatch(/dual INR\/USD pricing/i);
  });
});
