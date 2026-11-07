/**
 * A temple alias (tirumala-tirupati -> tirupati-balaji) used to be redirected inside the Worker, which
 * looked the temple up on every request and answered Cloudflare 1102 under a burst (9 of 40 requests).
 * public/_redirects now answers them from the assets layer; this fails if one is missing or points elsewhere.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLE_SLUG_ALIASES, canonicalTempleSlug } from '../lib/temple-slug';

const rules = new Map<string, { to: string; status: string }>();
for (const line of readFileSync(join(__dirname, '..', 'public', '_redirects'), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const [from, to, status] = t.split(/\s+/);
  if (from) rules.set(from, { to: to ?? '', status: status ?? '' });
}

describe('temple aliases are redirected at the edge', () => {
  it.each(Object.entries(TEMPLE_SLUG_ALIASES))('%s -> %s', (alias, target) => {
    expect(rules.get(`/temples/${alias}`)).toEqual({ to: `/temples/${target}`, status: '308' });
  });

  it('every edge temple redirect agrees with canonicalTempleSlug', () => {
    for (const [from, rule] of rules) {
      if (!from.startsWith('/temples/')) continue;
      const alias = from.slice('/temples/'.length);
      expect(rule.to, alias).toBe(`/temples/${canonicalTempleSlug(alias)}`);
    }
  });
});
