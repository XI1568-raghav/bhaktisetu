import { describe, it, expect } from 'vitest';
import { assessCauseQuality } from './cause-quality.js';

const GOOD = {
  name: 'Shri Krishna Gaushala',
  description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.',
  address: 'Vrindavan Road, Mathura',
};

describe('assessCauseQuality', () => {
  it('passes a real record', () => {
    expect(assessCauseQuality(GOOD)).toEqual({ ok: true, reasons: [] });
  });

  it('passes the shortest seeded real record', () => {
    expect(
      assessCauseQuality({
        name: 'Pathmeda Gauseva Sansthan',
        description: "One of India's largest gaushalas.",
        address: 'Pathmeda, Jalore, Rajasthan',
      }).ok,
    ).toBe(true);
  });

  it('rejects the production junk record', () => {
    const r = assessCauseQuality({ name: 'saharanpur', description: 'skkss', address: 'ssdwdqe' });
    expect(r.ok).toBe(false);
    expect(r.reasons).toEqual([
      'description_too_short',
      'description_too_few_words',
      'address_too_short',
    ]);
  });

  it('rejects a name under 3 characters', () => {
    expect(assessCauseQuality({ ...GOOD, name: 'ab' }).reasons).toContain('name_too_short');
  });

  it('rejects a name with no letter', () => {
    expect(assessCauseQuality({ ...GOOD, name: '12345' }).reasons).toEqual(['name_no_letter']);
  });

  it('accepts a Devanagari name', () => {
    expect(assessCauseQuality({ ...GOOD, name: 'श्री गौशाला' }).ok).toBe(true);
  });

  it('rejects a description under 20 characters', () => {
    expect(assessCauseQuality({ ...GOOD, description: 'a b c d e f' }).reasons).toEqual([
      'description_too_short',
    ]);
  });

  it('rejects a long description with fewer than 4 words', () => {
    expect(
      assessCauseQuality({ ...GOOD, description: 'Averyveryverylongsingleword here' }).reasons,
    ).toEqual(['description_too_few_words']);
  });

  it('accepts a terse 3-word description of 20+ characters', () => {
    expect(assessCauseQuality({ ...GOOD, description: 'ISKCON-affiliated cow shelter.' }).ok).toBe(true);
  });

  it('rejects an address under 10 characters', () => {
    expect(assessCauseQuality({ ...GOOD, address: 'Mathura' }).reasons).toEqual([
      'address_too_short',
    ]);
  });

  it('treats null, undefined and whitespace as empty', () => {
    const r = assessCauseQuality({ name: '   ', description: null, address: undefined });
    expect(r.ok).toBe(false);
    expect(r.reasons).toEqual([
      'name_too_short',
      'name_no_letter',
      'description_too_short',
      'description_too_few_words',
      'address_too_short',
    ]);
  });

  it('trims before measuring', () => {
    expect(assessCauseQuality({ ...GOOD, address: '   Mathura   ' }).reasons).toEqual([
      'address_too_short',
    ]);
  });
});
