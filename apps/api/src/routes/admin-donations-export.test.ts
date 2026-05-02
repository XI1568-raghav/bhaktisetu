import { describe, it, expect } from 'vitest';
import { __testing } from './admin-donations-export.js';

describe('admin-donations-export csvField', () => {
  const { csvField, CSV_HEADER } = __testing;

  it('returns plain values unquoted when safe', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField(101)).toBe('101');
  });

  it('quotes and escapes embedded double-quotes per RFC 4180', () => {
    expect(csvField('Name "Big" Donor')).toBe('"Name ""Big"" Donor"');
  });

  it('quotes when commas, newlines, or carriage returns are present', () => {
    expect(csvField('Last, First')).toBe('"Last, First"');
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
    expect(csvField('line1\rline2')).toBe('"line1\rline2"');
  });

  it('renders null/undefined as empty fields, not the literal strings', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
  });

  it('exposes the documented CSV header in fixed column order', () => {
    expect(CSV_HEADER).toBe(
      'receipt_number,donor_name,donor_pan,donor_email,donee_name,amountInr,donation_date,gaushala_id',
    );
  });
});
