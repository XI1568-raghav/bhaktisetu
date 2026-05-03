import { describe, it, expect } from 'vitest';
import { __testing, REDDIT_AUTOPOST_ALLOWLIST } from './content-auto-post.js';

const { normSub, normTitle, stripFlairFooter } = __testing;

describe('content-auto-post helpers', () => {
  it('normSub strips r/ prefix and lowercases', () => {
    expect(normSub('r/Hinduism')).toBe('hinduism');
    expect(normSub('/r/India')).toBe('india');
    expect(normSub('AskHinduism')).toBe('askhinduism');
  });

  it('normTitle collapses whitespace + lowercases', () => {
    expect(normTitle('  How  to  start  ')).toBe('how to start');
  });

  it('stripFlairFooter pulls flair tag and trims body', () => {
    const body =
      'Body of the post here.\nSecond line.\n\n[suggested flair: Discussion]';
    const r = stripFlairFooter(body);
    expect(r.flair).toBe('Discussion');
    expect(r.clean.endsWith('Second line.')).toBe(true);
    expect(r.clean.includes('suggested flair')).toBe(false);
  });

  it('stripFlairFooter no-ops when no flair present', () => {
    const r = stripFlairFooter('Just a body.');
    expect(r.flair).toBeNull();
    expect(r.clean).toBe('Just a body.');
  });
});

describe('reddit allowlist', () => {
  it('contains the documented safe subs', () => {
    for (const sub of ['hinduism', 'india', 'indiaspeaks', 'askhinduism', 'bhajan']) {
      expect(REDDIT_AUTOPOST_ALLOWLIST.has(sub)).toBe(true);
    }
  });

  it('rejects NSFW or unrelated subs', () => {
    for (const sub of ['nsfw', 'gonewild', 'politics', 'worldnews']) {
      expect(REDDIT_AUTOPOST_ALLOWLIST.has(sub)).toBe(false);
    }
  });
});
