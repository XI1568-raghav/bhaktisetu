import { describe, it, expect, vi } from 'vitest';
import {
  CSV_COLUMNS,
  USER_AGENT,
  RATE_LIMIT_MS,
  checkRobotsAllowed,
  dedupRows,
  toCsv,
  rateLimit,
} from '../canada-pandit-prospector.mjs';

describe('canada-pandit-prospector (R-Q3-S-007)', () => {
  it('exposes the 12 required CSV columns', () => {
    expect(CSV_COLUMNS.length).toBe(12);
    for (const c of [
      'name',
      'temple_affiliation',
      'city',
      'province',
      'source_url',
      'email',
      'phone',
      'linkedin',
      'language_preference',
      'notes',
      'outreach_status',
      'first_contact_at',
    ]) {
      expect(CSV_COLUMNS).toContain(c);
    }
  });

  it('honors 2s rate limit via injected sleep impl', async () => {
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    await rateLimit({ sleepImpl, ms: RATE_LIMIT_MS });
    expect(sleepImpl).toHaveBeenCalledWith(2000);
  });

  it('User-Agent identifies the bot per polite-crawl spec', () => {
    expect(USER_AGENT).toMatch(/Bhaktisetu-supply-research/);
    expect(USER_AGENT).toMatch(/\+contact@bhaktisetu\.com/);
  });

  it('skips fetch when robots.txt forbids (Disallow: /)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'User-agent: *\nDisallow: /\n',
    });
    const allowed = await checkRobotsAllowed('https://example.org/foo', {
      fetchImpl,
    });
    expect(allowed).toBe(false);
  });

  it('allows fetch when robots.txt absent or permissive', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'User-agent: *\nAllow: /\n',
    });
    const allowed = await checkRobotsAllowed('https://example.org/foo', {
      fetchImpl,
    });
    expect(allowed).toBe(true);
  });

  it('dedups by (name, temple_affiliation, city) case-insensitively', () => {
    const rows = [
      { name: 'Pandit A', temple_affiliation: 'ISKCON Toronto', city: 'Toronto' },
      { name: 'pandit a', temple_affiliation: 'iskcon toronto', city: 'toronto' },
      { name: 'Pandit B', temple_affiliation: 'BAPS Toronto', city: 'Toronto' },
    ];
    const deduped = dedupRows(rows);
    expect(deduped).toHaveLength(2);
  });

  it('toCsv emits header + RFC-4180 escaping of commas/quotes', () => {
    const csv = toCsv([
      {
        name: 'Pandit, Sr.',
        temple_affiliation: 'BAPS "Toronto"',
        city: 'Toronto',
        province: 'ON',
        source_url: 'https://baps.org',
        email: '',
        phone: '',
        linkedin: '',
        language_preference: 'en',
        notes: '',
        outreach_status: 'pending',
        first_contact_at: '',
      },
    ]);
    expect(csv.split('\n')[0]).toBe(CSV_COLUMNS.join(','));
    expect(csv).toMatch(/"Pandit, Sr\."/);
    expect(csv).toMatch(/"BAPS ""Toronto"""/);
  });
});
