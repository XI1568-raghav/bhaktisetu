import { describe, it, expect } from 'vitest';
import { __testing } from './gurukul-applications.js';

const { submitSchema } = __testing;

const validAdultSelf = {
  programId: '11111111-2222-3333-4444-555555555555',
  applicantType: 'self' as const,
  studentName: 'Arjuna Sharma',
  studentAgeYears: 22,
  consentSigned: true,
  statement: 'I have been studying Sanskrit for two years and wish to deepen my practice.',
};

const validMinorByParent = {
  programId: '11111111-2222-3333-4444-555555555555',
  applicantType: 'parent' as const,
  studentName: 'Arjun Sharma',
  studentAgeYears: 11,
  guardianName: 'Rajesh Sharma',
  guardianRelation: 'Father',
  guardianPhone: '+919876543210',
  consentSigned: true,
  statement: 'My son has shown deep interest in Vedic chanting since age 7.',
};

describe('gurukul application — adult self-applicant', () => {
  it('accepts adult applying for self with consent', () => {
    expect(submitSchema.safeParse(validAdultSelf).success).toBe(true);
  });
  it('rejects adult without consent signed', () => {
    expect(submitSchema.safeParse({ ...validAdultSelf, consentSigned: false }).success).toBe(false);
  });
});

describe('gurukul application — minor by parent', () => {
  it('accepts complete parent-on-behalf payload', () => {
    expect(submitSchema.safeParse(validMinorByParent).success).toBe(true);
  });
  it('rejects minor without guardian fields', () => {
    const bad = { ...validMinorByParent, guardianPhone: undefined };
    expect(submitSchema.safeParse(bad).success).toBe(false);
  });
  it('rejects minor with self type (parent type required)', () => {
    const bad = { ...validMinorByParent, applicantType: 'self' as const };
    expect(submitSchema.safeParse(bad).success).toBe(false);
  });
});

describe('gurukul application — field validation', () => {
  it('rejects invalid UUID programId', () => {
    expect(submitSchema.safeParse({ ...validAdultSelf, programId: 'not-uuid' }).success).toBe(false);
  });
  it('rejects too-short statement', () => {
    expect(submitSchema.safeParse({ ...validAdultSelf, statement: 'too short' }).success).toBe(false);
  });
  it('rejects bad Aadhaar last4 format', () => {
    expect(submitSchema.safeParse({ ...validAdultSelf, guardianAadhaarLast4: '12' }).success).toBe(false);
    expect(submitSchema.safeParse({ ...validAdultSelf, guardianAadhaarLast4: '1234' }).success).toBe(true);
  });
  it('rejects age outside human range', () => {
    expect(submitSchema.safeParse({ ...validAdultSelf, studentAgeYears: 2 }).success).toBe(false);
    expect(submitSchema.safeParse({ ...validAdultSelf, studentAgeYears: 150 }).success).toBe(false);
  });
});
