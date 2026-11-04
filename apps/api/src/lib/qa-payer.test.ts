import { describe, it, expect, afterEach } from 'vitest';
import { isQaPayer, isQaPayerEmail, parseQaPayerEmails } from './qa-payer.js';

const ORIGINAL = process.env.QA_PAYER_EMAILS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.QA_PAYER_EMAILS;
  else process.env.QA_PAYER_EMAILS = ORIGINAL;
});

describe('QA_PAYER_EMAILS allowlist', () => {
  it('is OFF when the env var is unset', () => {
    delete process.env.QA_PAYER_EMAILS;
    expect(isQaPayerEmail('test.devotee@example.com')).toBe(false);
    expect(isQaPayer({ email: 'test.devotee@example.com' })).toBe(false);
  });

  it('is OFF when the env var is empty or only separators', () => {
    process.env.QA_PAYER_EMAILS = ' , ,';
    expect(isQaPayerEmail('test.devotee@example.com')).toBe(false);
  });

  it('matches case-insensitively and ignores whitespace around entries', () => {
    process.env.QA_PAYER_EMAILS = ' Test.Devotee@Example.com , test.priest@example.com';
    expect(isQaPayerEmail('test.devotee@example.com')).toBe(true);
    expect(isQaPayerEmail('TEST.DEVOTEE@EXAMPLE.COM')).toBe(true);
    expect(isQaPayerEmail('  test.priest@example.com ')).toBe(true);
  });

  it('does not match an email that is not listed, or a substring/superstring of one', () => {
    process.env.QA_PAYER_EMAILS = 'test.devotee@example.com';
    expect(isQaPayerEmail('someone@example.com')).toBe(false);
    expect(isQaPayerEmail('xtest.devotee@example.com')).toBe(false);
    expect(isQaPayerEmail('test.devotee@example.com.evil.io')).toBe(false);
  });

  it('is false for a missing user or a missing email', () => {
    process.env.QA_PAYER_EMAILS = 'test.devotee@example.com';
    expect(isQaPayer(undefined)).toBe(false);
    expect(isQaPayer(null)).toBe(false);
    expect(isQaPayer({ email: null })).toBe(false);
    expect(isQaPayerEmail('')).toBe(false);
  });

  it('drops entries that are not emails (so a stray word can never match)', () => {
    expect([...parseQaPayerEmails('all, *, a@b.co')]).toEqual(['a@b.co']);
    process.env.QA_PAYER_EMAILS = '*';
    expect(isQaPayerEmail('anyone@example.com')).toBe(false);
  });

  it('re-reads the env on each call', () => {
    process.env.QA_PAYER_EMAILS = 'a@b.co';
    expect(isQaPayerEmail('a@b.co')).toBe(true);
    process.env.QA_PAYER_EMAILS = 'c@d.co';
    expect(isQaPayerEmail('a@b.co')).toBe(false);
  });
});
