import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { astrologyService } from './astrology.service.js';

/**
 * AW-02 (P0) — the teardown half.
 *
 * Every consumer-facing door onto the 15 invented astrologers was closed in
 * earlier passes and those closures are NOT re-litigated here (see
 * astrology-directory-real-supply.aw02.test.ts,
 * astrology-fixture-profile-unreachable.aw02.test.ts,
 * astrology-consult-start-real-astrologer.aw02.test.ts and
 * astrology-start-consultation-no-fixture.aw02.test.ts on this side, and
 * app/astrology/__tests__/astrology-free-minutes-claim.aw02.test.tsx on the
 * web side). What survived every one of those passes was the DATA itself:
 *
 *   const ASTROLOGERS     15 rows, slug ids 001..015 — invented people with
 *                         invented ratings, review counts and per-minute rates
 *   const REVIEWS         75 generated testimonials attributed to 10 invented
 *                         devotees
 *   const SPECIALIZATIONS 8 facet rows whose counts (11/4/5/3/5/4/4/4) describe
 *                         forty specialization slots across those fifteen
 *                         non-existent people
 *
 * plus the five service methods that read them. Each earlier closure left the
 * arrays in place because some OTHER reader still existed; with the last route
 * rebound to approved `AstrologerProfile` rows, none does. Dormant fiction one
 * forgotten argument away from a live surface is precisely what this finding is
 * about, so it goes.
 *
 * Deletion order matters and is asserted in both directions here: the five
 * readers must be gone (part 1), the arrays must be gone (part 2), and the real
 * surviving API must still work (part 3) so neither part can pass by the module
 * having been emptied.
 */

// ─── Comment stripping ───────────────────────────────────────────────────────
//
// MANDATORY, not hygiene. The deletion is DOCUMENTED in source comments that
// necessarily name what was removed (the slug ids, ASTROLOGERS, getReviews), so
// a raw substring scan would match the comment recording the removal and pass
// forever while the fixture came back. That exact failure has shipped seven
// times in this repo (a localStorage ban tripping on the comment documenting
// the ban; a 5xx scan flagging six valid 4xx echoes; a CTA test matching a
// comment naming the CTA; the SCAL-04 ratchet held over baseline by a comment
// about a deleted query; SCAL-04 again on a nested `take`; an agent catching
// its own draft; and a claim-removal guard matching its own removal note).
function stripComments(src: string): string {
  return (
    src
      // Block comments — also covers JSDoc.
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      // Line comments, but never the "//" inside a URL such as https://…
      .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
  );
}

const SERVICE_FILE = join(import.meta.dirname, 'astrology.service.ts');
const API_SRC = join(import.meta.dirname, '..');

function serviceSource(): string {
  return stripComments(readFileSync(SERVICE_FILE, 'utf8'));
}

/** Every .ts/.tsx file under apps/api/src. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** The five methods whose only data source was the fixture. */
const FIXTURE_READERS = [
  'getAstrologers',
  'getAstrologerById',
  'getAstrologerByIdOrSlug',
  'getReviews',
  'getSpecializations',
] as const;

/** Names that existed ONLY inside the deleted fixture. */
const INVENTED_ASTROLOGERS = [
  'Raghunath Sharma',
  'Meera Devi',
  'Vikram Joshi',
  'Sunita Patel',
  'Devendra Mishra',
  'Tarot Priya Singh',
  'Ramesh Iyer',
  'Kavita Reddy',
  'Pandit Suresh Kumar',
  'Ananya Ghosh',
  'Bhaskar Rao',
  'Neha Kapoor',
  'Harish Chandra',
  'Asha Mehta',
  'Gopal Das',
];

/** Authors of the 75 generated testimonials. */
const INVENTED_REVIEWERS = [
  'Priya M.',
  'Rahul K.',
  'Sneha T.',
  'Amit S.',
  'Kavya R.',
  'Deepak G.',
  'Anjali P.',
  'Vikash N.',
  'Ritu D.',
  'Suresh B.',
];

// ─── Part 1: the readers are gone, and nothing calls them ────────────────────

describe('AW-02 — the fixture-reading service methods are deleted', () => {
  it.each(FIXTURE_READERS)('astrologyService.%s no longer exists', (method) => {
    expect(
      (astrologyService as unknown as Record<string, unknown>)[method],
      `astrologyService.${method} still exists; it can only answer from the invented 15`,
    ).toBeUndefined();
  });

  it('no source file in apps/api/src calls any of them', () => {
    const offenders: string[] = [];
    const call = new RegExp(
      `astrologyService\\s*\\.\\s*(${FIXTURE_READERS.join('|')})\\b`,
    );
    for (const file of walk(API_SRC)) {
      const hit = stripComments(readFileSync(file, 'utf8')).match(call);
      if (hit) offenders.push(`${file} -> ${hit[0]}`);
    }
    expect(offenders, 'a caller of a deleted fixture reader survives').toEqual([]);
  });

  it('the walker actually reached the tree it claims to scan', () => {
    // Guards the guard: an empty file list would make the scan above pass
    // vacuously forever.
    const files = walk(API_SRC);
    expect(files.length).toBeGreaterThan(200);
    expect(files).toContain(SERVICE_FILE);
  });
});

// ─── Part 2: the data is gone ────────────────────────────────────────────────

describe('AW-02 — the invented astrologer fixture is deleted', () => {
  it('declares no ASTROLOGERS / REVIEWS / SPECIALIZATIONS array', () => {
    const src = serviceSource();
    for (const decl of [
      /\bconst\s+ASTROLOGERS\b/,
      /\bconst\s+REVIEWS\b/,
      /\bconst\s+SPECIALIZATIONS\b/,
      /\bconst\s+reviewTemplates\b/,
    ]) {
      expect(src, `${decl} is still declared in astrology.service.ts`).not.toMatch(decl);
    }
  });

  it('holds no fixture astrologer slug', () => {
    // The slug ids as actual string literals, not as prose in a comment.
    expect(serviceSource(), 'a fixture slug id survives in code').not.toMatch(
      /['"`]astro_\d{3}['"`]/,
    );
  });

  it.each(INVENTED_ASTROLOGERS)('does not name the invented astrologer %s', (name) => {
    expect(serviceSource()).not.toContain(name);
  });

  it.each(INVENTED_REVIEWERS)('does not carry the fabricated review author %s', (name) => {
    expect(serviceSource()).not.toContain(name);
  });

  it('states no fabricated specialization supply count', () => {
    // The 8 facet rows read `{ name: 'Vedic Astrology', count: 11, icon: 'star' }`.
    // GET /specializations now counts approved AstrologerProfile rows instead.
    expect(serviceSource()).not.toMatch(/count:\s*\d+,\s*icon:/);
  });
});

// ─── Part 3: what must NOT have been deleted ─────────────────────────────────

describe('AW-02 — the real astrology service survives the teardown', () => {
  const REAL_ID = '71e54617-6963-418e-845f-920f4350505b';

  it('still opens a consultation for a resolved, real, online astrologer', () => {
    const out = astrologyService.startConsultation('user-1', REAL_ID, 'video', {
      id: REAL_ID,
      userId: 'astro-user-1',
      name: 'Acharya Vinod Sharma',
      specializations: ['Vedic Astrology'],
      perMinuteRate: 25,
      isOnline: true,
      isBusy: false,
    }) as { sessionId?: string; perMinuteRate?: number; error?: string };
    expect(out.error).toBeUndefined();
    expect(out.sessionId).toMatch(/^session_/);
    expect(out.perMinuteRate).toBe(25);
  });

  it('still refuses a fixture slug that resolves to nothing', () => {
    expect(astrologyService.startConsultation('user-1', 'astro_001', 'chat')).toEqual({
      error: 'Astrologer not found.',
    });
  });

  it('keeps the Vedic calculators that are genuinely the platform own work', () => {
    expect(astrologyService.getAllHoroscopes()).toHaveLength(12);
    expect(astrologyService.getDailyHoroscope('LEO')).not.toBeNull();
    expect(astrologyService.getCompatibility('Leo', 'Aries')).not.toBeNull();
    expect(
      astrologyService.getKundli('1990-08-15', '10:30', 'Mumbai', 'Test User')
        .planetaryPositions,
    ).toHaveLength(9);
  });

  it('the stripper removes comments without eating the code around them', () => {
    const sample = [
      `const u = 'https://a.test/x'; // trailing`,
      `/* const ASTROLOGERS = [{ id: 'astro_001' }] */`,
      `const SPECIALIZATIONS = [{ name: 'Vedic Astrology', count: 11, icon: 'star' }];`,
    ].join('\n');
    const out = stripComments(sample);
    expect(out).toContain('https://a.test/x');
    expect(out).not.toContain('trailing');
    expect(out).not.toMatch(/['"`]astro_\d{3}['"`]/);
    // Real code must survive stripping, or every assertion above is vacuous.
    expect(out).toMatch(/\bconst\s+SPECIALIZATIONS\b/);
    expect(out).toMatch(/count:\s*\d+,\s*icon:/);
  });
});
