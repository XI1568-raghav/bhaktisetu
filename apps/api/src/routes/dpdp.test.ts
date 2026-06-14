import { describe, it, expect } from 'vitest';
import { __testing } from './dpdp.js';

const {
  dsarFileSchema,
  dsarListSchema,
  dsarResolveSchema,
  consentRecordSchema,
  dsarKindEnum,
  consentPurposeEnum,
} = __testing;

describe('dsarFileSchema', () => {
  it('accepts a bare access request', () => {
    expect(dsarFileSchema.safeParse({ kind: 'access' }).success).toBe(true);
  });

  it('accepts each of the 4 supported kinds', () => {
    for (const kind of ['access', 'erasure', 'rectify', 'portability']) {
      expect(dsarFileSchema.safeParse({ kind }).success).toBe(true);
    }
  });

  it('rejects unsupported kind', () => {
    expect(dsarFileSchema.safeParse({ kind: 'subscribe' }).success).toBe(false);
  });

  it('rejects missing kind', () => {
    expect(dsarFileSchema.safeParse({}).success).toBe(false);
  });

  it('accepts optional note up to 2000 chars', () => {
    const note = 'a'.repeat(2000);
    expect(dsarFileSchema.safeParse({ kind: 'access', note }).success).toBe(true);
  });

  it('rejects note above 2000 chars', () => {
    const note = 'a'.repeat(2001);
    expect(dsarFileSchema.safeParse({ kind: 'access', note }).success).toBe(false);
  });
});

describe('dsarListSchema', () => {
  it('uses default limit 50 / offset 0', () => {
    const r = dsarListSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(50);
      expect(r.data.offset).toBe(0);
    }
  });

  it('coerces string query params to numbers', () => {
    const r = dsarListSchema.safeParse({ limit: '25', offset: '10' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(25);
      expect(r.data.offset).toBe(10);
    }
  });

  it('rejects limit above 200', () => {
    expect(dsarListSchema.safeParse({ limit: '201' }).success).toBe(false);
  });

  it('rejects negative offset', () => {
    expect(dsarListSchema.safeParse({ offset: '-1' }).success).toBe(false);
  });

  it('accepts each valid status', () => {
    for (const status of ['pending', 'in_progress', 'resolved', 'rejected']) {
      expect(dsarListSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects unknown status', () => {
    expect(dsarListSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });
});

describe('dsarResolveSchema', () => {
  it('accepts resolved without note', () => {
    expect(dsarResolveSchema.safeParse({ status: 'resolved' }).success).toBe(true);
  });

  it('accepts rejected with note', () => {
    expect(dsarResolveSchema.safeParse({ status: 'rejected', resolutionNote: 'Could not verify identity' }).success).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(dsarResolveSchema.safeParse({ status: 'pending' }).success).toBe(false);
  });
});

describe('consentRecordSchema', () => {
  it('accepts every supported purpose', () => {
    for (const purpose of consentPurposeEnum.options) {
      expect(consentRecordSchema.safeParse({ purpose, action: 'granted' }).success).toBe(true);
    }
  });

  it('accepts granted and withdrawn actions', () => {
    for (const action of ['granted', 'withdrawn']) {
      expect(consentRecordSchema.safeParse({ purpose: 'marketing_email', action }).success).toBe(true);
    }
  });

  it('rejects unknown action', () => {
    expect(consentRecordSchema.safeParse({ purpose: 'marketing_email', action: 'maybe' }).success).toBe(false);
  });

  it('rejects unknown purpose', () => {
    expect(consentRecordSchema.safeParse({ purpose: 'newsletter', action: 'granted' }).success).toBe(false);
  });

  it('source max length 120', () => {
    const source = 'a'.repeat(120);
    expect(consentRecordSchema.safeParse({ purpose: 'analytics', action: 'granted', source }).success).toBe(true);
    expect(
      consentRecordSchema.safeParse({ purpose: 'analytics', action: 'granted', source: 'a'.repeat(121) }).success,
    ).toBe(false);
  });
});

describe('dsarKindEnum', () => {
  it('has exactly 4 kinds', () => {
    expect(dsarKindEnum.options).toEqual(['access', 'erasure', 'rectify', 'portability']);
  });
});
