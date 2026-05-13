import { describe, it, expect, beforeEach } from 'vitest';
import { __testing } from '@poojly/api-client';

const { STORAGE_KEY, FLUSH_THROTTLE_MS, readLocal, writeLocal, readAllLocal, clearLocalAll } = __testing;

describe('reading-progress hook — localStorage helpers', () => {
  beforeEach(() => {
    clearLocalAll();
  });

  it('returns null when no progress stored', () => {
    expect(readLocal('bhagavad-gita')).toBeNull();
  });

  it('persists and reads back a progress row', () => {
    const row = {
      bookSlug: 'bhagavad-gita',
      chapterSlug: 'chapter-2',
      chapterNumber: 2,
      scrollPercent: 47.5,
      lastVerse: 12,
      updatedAt: new Date().toISOString(),
    };
    writeLocal(row);
    expect(readLocal('bhagavad-gita')).toEqual(row);
  });

  it('keeps separate progress per book', () => {
    const a = {
      bookSlug: 'bhagavad-gita',
      chapterSlug: 'chapter-1',
      chapterNumber: 1,
      scrollPercent: 10,
      updatedAt: new Date().toISOString(),
    };
    const b = {
      bookSlug: 'ramayana',
      chapterSlug: 'bala/sarga-3',
      chapterNumber: 3,
      scrollPercent: 80,
      updatedAt: new Date().toISOString(),
    };
    writeLocal(a);
    writeLocal(b);
    const all = readAllLocal();
    expect(Object.keys(all).sort()).toEqual(['bhagavad-gita', 'ramayana']);
    expect(all['bhagavad-gita']!.scrollPercent).toBe(10);
    expect(all['ramayana']!.scrollPercent).toBe(80);
  });

  it('overwrites prior progress for same book', () => {
    writeLocal({
      bookSlug: 'upanishads',
      chapterSlug: 'isha',
      chapterNumber: 1,
      scrollPercent: 25,
      updatedAt: new Date().toISOString(),
    });
    writeLocal({
      bookSlug: 'upanishads',
      chapterSlug: 'kena',
      chapterNumber: 2,
      scrollPercent: 60,
      updatedAt: new Date().toISOString(),
    });
    expect(readLocal('upanishads')!.chapterSlug).toBe('kena');
    expect(readLocal('upanishads')!.scrollPercent).toBe(60);
  });

  it('uses the legacy poojly_ key prefix', () => {
    expect(STORAGE_KEY).toBe('poojly_reading_progress');
  });

  it('throttles flushes by 5 seconds', () => {
    expect(FLUSH_THROTTLE_MS).toBe(5_000);
  });
});
