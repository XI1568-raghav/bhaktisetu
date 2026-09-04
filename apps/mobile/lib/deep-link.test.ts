/**
 * Deep-link routing contract.
 *
 * The bug this locks out: `parseDeepLink` returned pathnames that had no
 * corresponding screen file, so every push-notification tap and every
 * `darshya://` link dead-ended on the expo-router "unmatched route" screen.
 * 7 of 8 targets were broken — including the fallback, so there was no
 * recovery path either.
 *
 * The structural assertion below (every returned pathname resolves to a real
 * file under app/) is the one that matters: it re-checks the whole table
 * against the filesystem on every run, so renaming or deleting a screen
 * fails here instead of silently in production.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseDeepLink } from './deep-link';

const APP_DIR = join(__dirname, '..', 'app');

/** '/(devotee)/puja-book' -> app/(devotee)/puja-book.tsx | .../index.tsx */
function screenExists(pathname: string): boolean {
  const rel = pathname.replace(/^\//, '');
  if (rel === '') return existsSync(join(APP_DIR, 'index.tsx'));
  return (
    existsSync(join(APP_DIR, `${rel}.tsx`)) ||
    existsSync(join(APP_DIR, rel, 'index.tsx'))
  );
}

const LINKS = [
  'darshya://puja/rudrabhishek',
  'darshya://darshan/stream-1',
  'darshya://booking/BK-1001',
  'darshya://consultation/c-42',
  'darshya://chat/thread-7',
  'darshya://inbox',
  'darshya://order/ord-9',
  'darshya://today',
  'darshya://totally-unknown-head',
  'https://darshya.online/puja/ganesh-puja',
  'https://darshya.online/',
  'https://evil.example.com/puja/x',
  'not-a-url',
  '',
  null,
  undefined,
] as const;

describe('parseDeepLink', () => {
  it('every reachable pathname resolves to a real screen file', () => {
    const broken = LINKS.map((l) => parseDeepLink(l))
      .map((r) => r.pathname)
      .filter((p) => !screenExists(p));

    expect(broken).toEqual([]);
  });

  it('routes each known head to its screen', () => {
    expect(parseDeepLink('darshya://puja/rudrabhishek')).toEqual({
      pathname: '/(devotee)/puja-book',
      params: { slug: 'rudrabhishek' },
    });
    expect(parseDeepLink('darshya://darshan/stream-1')).toEqual({
      pathname: '/(devotee)/darshan-player',
      params: { id: 'stream-1' },
    });
    expect(parseDeepLink('darshya://consultation/c-42').pathname).toBe(
      '/(devotee)/consultations',
    );
    expect(parseDeepLink('darshya://chat/thread-7').pathname).toBe(
      '/(devotee)/messages',
    );
    expect(parseDeepLink('darshya://inbox').pathname).toBe('/(devotee)/messages');
  });

  it('falls back to the devotee home for unknown, foreign and malformed input', () => {
    for (const l of [
      'darshya://totally-unknown-head',
      'https://evil.example.com/puja/x',
      'not-a-url',
      '',
      null,
      undefined,
    ]) {
      expect(parseDeepLink(l).pathname).toBe('/(devotee)');
    }
  });

  it('accepts the https web host as well as the custom scheme', () => {
    expect(parseDeepLink('https://darshya.online/puja/ganesh-puja')).toEqual({
      pathname: '/(devotee)/puja-book',
      params: { slug: 'ganesh-puja' },
    });
  });

  it('caps slug length so a hostile link cannot blow up a param', () => {
    const long = 'a'.repeat(1000);
    const r = parseDeepLink(`darshya://puja/${long}`);
    expect(r.params?.slug).toHaveLength(256);
  });
});
