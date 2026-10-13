import { describe, it, expect } from 'vitest';
import { placeLabel } from '../lib/place-label';

describe('placeLabel', () => {
  it('skips an empty city', () => {
    expect(placeLabel('', 'Telangana')).toBe('Telangana');
    expect(placeLabel(undefined, 'Telangana')).toBe('Telangana');
  });
  it('skips an empty trailing part', () => {
    expect(placeLabel('QA E2E Temple', '')).toBe('QA E2E Temple');
    expect(placeLabel('QA E2E Temple', null)).toBe('QA E2E Temple');
  });
  it('joins present parts and trims', () => {
    expect(placeLabel(' Hyderabad ', 'Telangana')).toBe('Hyderabad, Telangana');
    expect(placeLabel('', null, undefined)).toBe('');
  });
});
