import { describe, expect, it } from 'vitest';
import { normalizePhone, parseAmount, validateDonation } from '../lib/donation-validation';

const ok = { amount: '1100', name: 'Asha', email: 'a@b.co', phone: '8868912697', pan: '', has80G: false };

describe('donation validation (QA 2026-10-22)', () => {
  it('accepts Rs 1,100 with a 10-digit phone and no PAN', () => {
    expect(validateDonation(ok)).toEqual({});
  });
  it('parses amounts typed with separators', () => {
    expect(parseAmount('1,100')).toBe(1100);
    expect(parseAmount('₹ 1100')).toBe(1100);
    expect(parseAmount('')).toBe(0);
  });
  it('rejects below the minimum and blank phone, with the same wording as before', () => {
    const e = validateDonation({ ...ok, amount: '100', phone: '' });
    expect(e.amount).toBe('Minimum donation is ₹101');
    expect(e.donorPhone).toBe('Phone is required');
  });
  it('normalises a pasted +91 number instead of truncating it', () => {
    expect(normalizePhone('+91 88689 12697')).toBe('8868912697');
    expect(normalizePhone('08868912697')).toBe('8868912697');
    expect(validateDonation({ ...ok, phone: '+918868912697' }).donorPhone).toBeUndefined();
  });
  it('asks for PAN at Rs 2,000+ only when an 80G receipt can be issued', () => {
    expect(validateDonation({ ...ok, amount: '5100' }).donorPan).toBeUndefined();
    expect(validateDonation({ ...ok, amount: '5100', has80G: true }).donorPan).toMatch(/PAN is required/);
    expect(validateDonation({ ...ok, amount: '1100', has80G: true }).donorPan).toBeUndefined();
  });
  it('still format-checks a PAN that is given', () => {
    expect(validateDonation({ ...ok, pan: 'bad' }).donorPan).toMatch(/Invalid PAN/);
    expect(validateDonation({ ...ok, pan: 'abcde1234f' }).donorPan).toBeUndefined();
  });
});
