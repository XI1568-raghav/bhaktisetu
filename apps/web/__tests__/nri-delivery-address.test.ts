import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateDeliveryAddress,
  emptyDeliveryAddress,
  prasadAddressForApi,
  PRASAD_INDIA_ONLY_LINE,
} from '../lib/delivery-address';

/**
 * Prasad delivery is India-only (owner decision 2026-10-06).
 *
 * History: CM-06 (2026-08-13) opened the prasad address to 50+ countries so an
 * NRI could finish checkout. The owner has since decided prasad ships within
 * India only. An NRI can still BOOK the puja (no prasad) from anywhere; they
 * just do not choose prasad delivery. The address country is fixed to India,
 * the pincode must be 6 digits, the state is required, and the page says so.
 *
 * Billing stays INR (RV-01); nothing here touches a foreign-currency charge.
 */

const WEB = join(__dirname, '..');

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

describe('prasad address is India-only: validation', () => {
  it('defaults a fresh address to India', () => {
    expect(emptyDeliveryAddress().country).toBe('IN');
  });

  it('accepts a domestic address', () => {
    expect(validateDeliveryAddress(inAddr)).toEqual({});
  });

  it.each(['11000', '1100011', '11000A', '', '07030'])('rejects pincode %j', (pincode) => {
    expect(validateDeliveryAddress({ ...inAddr, pincode })).toHaveProperty('addr_pincode');
  });

  it('requires a state', () => {
    expect(validateDeliveryAddress({ ...inAddr, state: '' })).toHaveProperty('addr_state');
  });

  it('rejects an Indian number that is not a mobile', () => {
    expect(validateDeliveryAddress({ ...inAddr, phone: '2234567890' })).toHaveProperty('addr_phone');
  });

  it('still requires name, line1 and city', () => {
    const errs = validateDeliveryAddress({ ...inAddr, fullName: ' ', line1: '', city: '' });
    expect(errs).toHaveProperty('addr_name');
    expect(errs).toHaveProperty('addr_line1');
    expect(errs).toHaveProperty('addr_city');
  });

  it('does not let a stale foreign draft country pass: a US ZIP still fails', () => {
    const stale = { ...inAddr, country: 'US', pincode: '07030', state: 'New Jersey' };
    expect(validateDeliveryAddress(stale)).toHaveProperty('addr_pincode');
  });

  it('always sends country IN to the API, whatever a restored draft held', () => {
    expect(prasadAddressForApi({ ...inAddr, country: 'GB' }).country).toBe('IN');
  });

  it('states the rule honestly', () => {
    expect(PRASAD_INDIA_ONLY_LINE).toBe('Prasad is delivered within India only.');
  });
});

describe('prasad India-only wizard wiring', () => {
  const page = readFileSync(join(WEB, 'app/pujas/book/page.tsx'), 'utf8');

  it('has no country selector', () => {
    expect(page).not.toContain('DELIVERY_COUNTRY_OPTIONS');
    expect(page).not.toContain('id="addr-country"');
    expect(page).not.toContain('address.country}');
  });

  it('shows the India-only line and sends an India-pinned address', () => {
    expect(page).toContain('PRASAD_INDIA_ONLY_LINE');
    expect(page).toContain('prasadAddressForApi');
  });

  it('delegates address validation to the shared helper', () => {
    expect(page).toContain('validateDeliveryAddress');
  });

  it('keeps the prasad checkout offering free of any prasad option (it sends prasadDelivery:false)', () => {
    const offering = readFileSync(join(WEB, 'app/checkout/offering/page.tsx'), 'utf8');
    expect(offering).toContain('prasadDelivery: false');
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
    const src = readFileSync(join(WEB, 'app/pujas/(index)/page.tsx'), 'utf8');
    expect(src).not.toMatch(/dual INR\/USD pricing/i);
  });
});
