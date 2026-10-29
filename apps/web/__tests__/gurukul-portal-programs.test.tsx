import { describe, it, expect } from 'vitest';
import { programCount } from '../app/gurukul-portal/GurukulPortalClient';

describe('gurukul portal program count', () => {
  it('does not crash when the API omits programs', () => {
    expect(programCount({})).toBe(0);
    expect(programCount({ programs: undefined })).toBe(0);
  });
  it('counts programs when present', () => {
    expect(programCount({ programs: [{}, {}] })).toBe(2);
  });
});
