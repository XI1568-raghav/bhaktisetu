import { describe, it, expect } from 'vitest';
import { __testing } from './reading-progress.js';
import {
  readingProgressUpsertSchema,
  readingProgressQuerySchema,
} from '@poojly/shared';

const { isSyntheticUserId, dbDisabled } = __testing;

describe('reading-progress — synthetic user detection', () => {
  it('flags demo-* ids as synthetic', () => {
    expect(isSyntheticUserId('demo-devotee')).toBe(true);
    expect(isSyntheticUserId('demo-admin')).toBe(true);
  });

  it('flags anon-* ids as synthetic', () => {
    expect(isSyntheticUserId('anon-12345')).toBe(true);
  });

  it('does NOT flag real uuids', () => {
    expect(isSyntheticUserId('11111111-2222-3333-4444-555555555555')).toBe(false);
  });
});

describe('reading-progress — env-or-noop guard', () => {
  it('treats missing DATABASE_URL as disabled', () => {
    const before = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    expect(dbDisabled()).toBe(true);
    if (before !== undefined) process.env.DATABASE_URL = before;
  });

  it('reports enabled when DATABASE_URL set', () => {
    const before = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://u:p@h/db';
    expect(dbDisabled()).toBe(false);
    if (before === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = before;
  });
});

describe('reading-progress — upsert payload validation', () => {
  const valid = {
    bookSlug: 'bhagavad-gita',
    chapterSlug: 'chapter-2',
    chapterNumber: 2,
    scrollPercent: 42.5,
  };

  it('accepts a minimal valid payload', () => {
    expect(readingProgressUpsertSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts compound chapter slugs (Ramayana style)', () => {
    expect(
      readingProgressUpsertSchema.safeParse({
        ...valid,
        bookSlug: 'ramayana',
        chapterSlug: 'bala/sarga-1',
      }).success
    ).toBe(true);
  });

  it('rejects scrollPercent above 100', () => {
    expect(
      readingProgressUpsertSchema.safeParse({ ...valid, scrollPercent: 101 }).success
    ).toBe(false);
  });

  it('rejects negative scrollPercent', () => {
    expect(
      readingProgressUpsertSchema.safeParse({ ...valid, scrollPercent: -1 }).success
    ).toBe(false);
  });

  it('rejects non-integer chapterNumber', () => {
    expect(
      readingProgressUpsertSchema.safeParse({ ...valid, chapterNumber: 1.5 }).success
    ).toBe(false);
  });

  it('rejects path-traversal slug', () => {
    expect(
      readingProgressUpsertSchema.safeParse({
        ...valid,
        bookSlug: '../etc/passwd',
      }).success
    ).toBe(false);
  });

  it('rejects upper-case slug', () => {
    expect(
      readingProgressUpsertSchema.safeParse({ ...valid, bookSlug: 'Bhagavad-Gita' }).success
    ).toBe(false);
  });

  it('accepts optional lastVerse', () => {
    expect(
      readingProgressUpsertSchema.safeParse({ ...valid, lastVerse: 47 }).success
    ).toBe(true);
  });
});

describe('reading-progress — query schema', () => {
  it('accepts known book slugs', () => {
    expect(readingProgressQuerySchema.safeParse({ bookSlug: 'upanishads' }).success).toBe(true);
  });

  it('rejects empty slug', () => {
    expect(readingProgressQuerySchema.safeParse({ bookSlug: '' }).success).toBe(false);
  });
});
