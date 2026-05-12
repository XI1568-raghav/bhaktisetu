import { describe, it, expect } from 'vitest';
import { __testing } from './admin.js';

const { slugifyTempleName, templeCreateSchema } = __testing;

// Slug derivation hits Temple.slug @unique. If the helper produces empty
// strings, double-dashes, or whitespace edges, the DB throws confusing
// P2002s instead of clean 400s. Pin the behavior with examples.
describe('admin.slugifyTempleName', () => {
  it('lowercases ASCII names and joins with single dashes', () => {
    expect(slugifyTempleName('Shri Krishna Mandir')).toBe('shri-krishna-mandir');
  });

  it('collapses runs of punctuation into one dash', () => {
    expect(slugifyTempleName('Sri  Ram --  Temple!!')).toBe('sri-ram-temple');
  });

  it('strips leading/trailing dashes from punctuation-only edges', () => {
    expect(slugifyTempleName('!! Hanuman Mandir ??')).toBe('hanuman-mandir');
  });

  it('truncates at 80 chars to fit DB column / URL budgets', () => {
    const long = 'x'.repeat(200);
    expect(slugifyTempleName(long).length).toBe(80);
  });

  it('returns empty string for input with no slug-safe chars', () => {
    expect(slugifyTempleName('!!!')).toBe('');
  });
});

describe('admin.templeCreateSchema', () => {
  const valid = {
    name: 'Shri Krishna Mandir',
    description: 'Vrindavan based temple',
    deityPrimary: 'Krishna',
    addressLine: 'Temple Road 12',
    city: 'Vrindavan',
    state: 'UP',
    pincode: '281121',
    lat: 27.58,
    lng: 77.69,
  };

  it('accepts a minimum-required payload and applies defaults', () => {
    const parsed = templeCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // Defaults the contract relies on at create-time.
      expect(parsed.data.tradition).toBe('other');
      expect(parsed.data.deities).toEqual([]);
      expect(parsed.data.country).toBe('India');
    }
  });

  it('rejects out-of-range latitude (DB column accepts only -90..90)', () => {
    const parsed = templeCreateSchema.safeParse({ ...valid, lat: 95 });
    expect(parsed.success).toBe(false);
  });

  it('rejects slug with uppercase or spaces — slug must be URL-safe', () => {
    const parsed = templeCreateSchema.safeParse({ ...valid, slug: 'Shri Krishna' });
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown tradition enum values', () => {
    const parsed = templeCreateSchema.safeParse({ ...valid, tradition: 'pastafarian' });
    expect(parsed.success).toBe(false);
  });

  it('requires description (Temple.description is NOT NULL in schema)', () => {
    const { description: _omit, ...without } = valid;
    void _omit;
    const parsed = templeCreateSchema.safeParse(without);
    expect(parsed.success).toBe(false);
  });
});
