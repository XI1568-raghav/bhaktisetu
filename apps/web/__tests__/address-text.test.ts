import { describe, it, expect } from 'vitest';
import { addressText } from '../lib/address-text';

describe('addressText', () => {
  it('flattens an address object', () => {
    expect(addressText({ name: 'A', line1: '1 Rd', city: 'Pune', state: 'MH', pincode: '411001', country: 'India' }))
      .toBe('A, 1 Rd, Pune, MH, 411001, India');
  });
  it('passes strings through and tolerates empties', () => {
    expect(addressText('12 Main St')).toBe('12 Main St');
    expect(addressText(null)).toBe('');
    expect(addressText(undefined)).toBe('');
  });
});
