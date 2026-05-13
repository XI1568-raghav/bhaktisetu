import { describe, it, expect, vi } from 'vitest';

// `server-only` is a runtime guard; mock so vitest can import the module.
vi.mock('server-only', () => ({}));

import {
  __testing,
  loadManifest,
  loadAllManifests,
  loadChapter,
  nextChapter,
  prevChapter,
  listBookSlugs,
} from '../lib/books';
import type { BookManifest } from '@poojly/shared';

const { safeBookSlug, safeChapterSlug } = __testing;

describe('books loader — slug guards', () => {
  it('accepts known slugs', () => {
    expect(safeBookSlug('bhagavad-gita')).toBe('bhagavad-gita');
    expect(safeBookSlug('upanishads')).toBe('upanishads');
  });

  it('rejects path-traversal', () => {
    expect(() => safeBookSlug('../etc')).toThrow();
    expect(() => safeChapterSlug('../../passwd')).toThrow();
    expect(() => safeChapterSlug('foo/../bar')).toThrow();
  });

  it('rejects upper-case', () => {
    expect(() => safeBookSlug('Bhagavad')).toThrow();
  });

  it('accepts compound chapter slugs', () => {
    expect(safeChapterSlug('bala/sarga-1')).toBe('bala/sarga-1');
  });
});

describe('books loader — disk reads', () => {
  it('lists all known book slugs', async () => {
    const slugs = await listBookSlugs();
    expect(slugs).toEqual(expect.arrayContaining(['bhagavad-gita', 'ramayana', 'upanishads']));
  });

  it('loads the Gita manifest with 18 chapters', async () => {
    const m = await loadManifest('bhagavad-gita');
    expect(m).not.toBeNull();
    expect(m!.title).toMatch(/Bhagavad Gita/);
    expect(m!.chapters).toHaveLength(18);
  });

  it('loads the Ramayana manifest with 77 sargas', async () => {
    const m = await loadManifest('ramayana');
    expect(m).not.toBeNull();
    expect(m!.kandas?.[0]?.sargaCount).toBe(77);
  });

  it('returns null for an unknown book', async () => {
    expect(await loadManifest('not-a-book' as never).catch(() => null)).toBeNull();
  });

  it('loads Isha Upanishad with 18 verses', async () => {
    const ch = await loadChapter('upanishads', 'isha');
    expect(ch).not.toBeNull();
    expect(ch!.verses).toHaveLength(18);
    expect(ch!.placeholder).toBe(false);
  });

  it('loads compound Ramayana sarga slug', async () => {
    const ch = await loadChapter('ramayana', 'bala/sarga-1');
    expect(ch).not.toBeNull();
    expect(ch!.kanda).toBe('bala');
    expect(ch!.verses.length).toBeGreaterThan(0);
  });

  it('loadAllManifests returns 3 books', async () => {
    const all = await loadAllManifests();
    expect(all.length).toBe(3);
  });
});

describe('books loader — chapter navigation', () => {
  const stub: BookManifest = {
    slug: 'x',
    title: 'X',
    language: ['en'],
    coverImage: '',
    description: '',
    structure: 'chapters',
    chapters: [
      { slug: 'a', number: 1, title: 'A' },
      { slug: 'b', number: 2, title: 'B' },
      { slug: 'c', number: 3, title: 'C' },
    ],
  };

  it('finds next chapter', () => {
    expect(nextChapter(stub, 'a')?.slug).toBe('b');
    expect(nextChapter(stub, 'b')?.slug).toBe('c');
  });

  it('returns null past the last chapter', () => {
    expect(nextChapter(stub, 'c')).toBeNull();
  });

  it('returns null before the first chapter', () => {
    expect(prevChapter(stub, 'a')).toBeNull();
  });

  it('finds previous chapter', () => {
    expect(prevChapter(stub, 'b')?.slug).toBe('a');
  });
});
