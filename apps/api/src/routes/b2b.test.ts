import { describe, it, expect, beforeEach } from 'vitest';
import { __testing } from './b2b.js';

const { sha256, maskEmail, maskPhone, resolveApiKey, checkRate, listQuerySchema, sinceQuerySchema, RATE_BUCKETS } = __testing;

describe('B2B sha256', () => {
  it('produces stable hex output', () => {
    expect(sha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});

describe('B2B PII masking', () => {
  it('maskEmail returns 16-char sha256 prefix', () => {
    const m = maskEmail('Devotee@Example.COM');
    expect(m).not.toBeNull();
    expect(m!.length).toBe(16);
    // case-insensitive: same hash for diff case
    expect(maskEmail('devotee@example.com')).toBe(m);
  });

  it('maskEmail returns null for empty', () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail(undefined)).toBeNull();
  });

  it('maskPhone keeps last 4', () => {
    expect(maskPhone('+919876543210')).toBe('***3210');
  });

  it('maskPhone redacts short numbers', () => {
    expect(maskPhone('1234')).toBe('****');
  });

  it('maskPhone returns null for empty', () => {
    expect(maskPhone(null)).toBeNull();
  });
});

describe('B2B rate limiter', () => {
  beforeEach(() => RATE_BUCKETS.clear());

  it('allows requests up to limit', () => {
    for (let i = 0; i < 60; i++) {
      expect(checkRate('k1', 60).ok).toBe(true);
    }
  });

  it('returns 429 with Retry-After on N+1 req', () => {
    for (let i = 0; i < 60; i++) checkRate('k1', 60);
    const r = checkRate('k1', 60);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it('isolates per-key buckets', () => {
    for (let i = 0; i < 60; i++) checkRate('keyA', 60);
    // keyA exhausted; keyB still fresh
    expect(checkRate('keyA', 60).ok).toBe(false);
    expect(checkRate('keyB', 60).ok).toBe(true);
  });
});

describe('B2B resolveApiKey (DEV path)', () => {
  const ORIG = process.env.B2B_DEV_KEY;
  beforeEach(() => { process.env.B2B_DEV_KEY = 'dk_test_devkey_abc123'; });

  it('returns null for missing key', async () => {
    expect(await resolveApiKey('')).toBeNull();
  });

  it('returns null for unknown key', async () => {
    expect(await resolveApiKey('dk_unknown')).toBeNull();
  });

  it('returns record for matching DEV key', async () => {
    const r = await resolveApiKey('dk_test_devkey_abc123');
    expect(r).not.toBeNull();
    expect(r!.orgName).toBe('DEV_PARTNER');
    expect(r!.scopes).toContain('read:temples');
    expect(r!.rpmLimit).toBe(60);
  });

  afterAll: () => { if (ORIG === undefined) delete process.env.B2B_DEV_KEY; else process.env.B2B_DEV_KEY = ORIG; };
});

describe('B2B listQuerySchema', () => {
  it('accepts empty -> defaults limit 20', () => {
    const r = listQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(20);
  });

  it('coerces string limit to number', () => {
    const r = listQuerySchema.safeParse({ limit: '50' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(50);
  });

  it('rejects limit > 100', () => {
    expect(listQuerySchema.safeParse({ limit: 200 }).success).toBe(false);
  });

  it('rejects limit < 1', () => {
    expect(listQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('accepts iso datetime in since', () => {
    expect(listQuerySchema.safeParse({ since: '2026-01-01T00:00:00.000Z' }).success).toBe(true);
  });

  it('rejects malformed since', () => {
    expect(listQuerySchema.safeParse({ since: '2026-01-01' }).success).toBe(false);
  });
});

describe('B2B sinceQuerySchema', () => {
  it('accepts since-only query', () => {
    const r = sinceQuerySchema.safeParse({ since: '2026-06-01T00:00:00.000Z' });
    expect(r.success).toBe(true);
  });
});
