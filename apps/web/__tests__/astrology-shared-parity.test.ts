import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { NAKSHATRAS } from '@/lib/nakshatras';
import { findNakshatra, TIMEZONE_OPTIONS } from '@/lib/nakshatra-finder';
import { computeMilan, allNakshatraOptions } from '@/lib/kundli-milan';
import { checkManglik } from '@/lib/manglik';
import { computeNumerology } from '@/lib/numerology';
import { computeChoghadiya, CITY_OPTIONS } from '@/lib/choghadiya';
import { computeRahuKalam } from '@/lib/rahu-kalam';

import * as shared from '@poojly/shared/astrology';

/**
 * The astrology calculators moved into @poojly/shared so apps/mobile could run
 * them. This file is what stops that move from turning into a fork.
 *
 * WHY A FORK IS THE THING TO GUARD
 * --------------------------------
 * The alternative — mobile reimplementing the maths — is not hypothetical in
 * this repo. Wedding prices once differed 5x between web and mobile because
 * each app hardcoded its own. An astrology answer is worse: nobody can eyeball
 * a Gun Milan total and tell that one client is wrong.
 *
 * Two distinct claims are checked, because either can fail alone:
 *
 *   1. apps/web/lib DELEGATES. The six modules re-export the shared functions
 *      rather than declaring their own, so "identical output for identical
 *      input" is structural rather than a coincidence two suites happen to
 *      agree on. Asserted both by identity (=== the shared export) and by
 *      reading the source for a reimplementation.
 *
 *   2. The two nakshatra tables AGREE. apps/web/lib/nakshatras.ts keeps the
 *      editorial prose the SEO pages print; the shared table keeps only what
 *      the calculators read. They are separate arrays, so a typo in gana or
 *      rashi on the web side would silently change nothing on web and
 *      everything about which koota the shared scorer computed. Field-for-
 *      field equality is the guard.
 */

const LIB = path.resolve(__dirname, '../lib');
const COMPUTATIONAL_FIELDS = [
 'slug', 'name', 'sanskritName', 'lord', 'deity', 'symbol', 'gana', 'rashi', 'range',
] as const;

function libSource(name: string): string {
 return readFileSync(path.join(LIB, `${name}.ts`), 'utf8');
}

describe('apps/web/lib delegates to @poojly/shared/astrology', () => {
 it('re-exports the very same function objects', () => {
  // Identity, not equality: a copied implementation would still behave the
  // same today and drift tomorrow. Only the same object cannot.
  expect(computeMilan).toBe(shared.computeMilan);
  expect(allNakshatraOptions).toBe(shared.allNakshatraOptions);
  expect(checkManglik).toBe(shared.checkManglik);
  expect(computeNumerology).toBe(shared.computeNumerology);
  expect(computeChoghadiya).toBe(shared.computeChoghadiya);
  expect(computeRahuKalam).toBe(shared.computeRahuKalam);
  expect(CITY_OPTIONS).toBe(shared.CITY_OPTIONS);
  expect(TIMEZONE_OPTIONS).toBe(shared.TIMEZONE_OPTIONS);
 });

 it('does not re-declare the astronomy in the web tree', () => {
  // The specific constants that would give away a second copy of the Meeus
  // series, the Lahiri fit, or the Almanac-for-Computers solver.
  const banned: Array<[string, RegExp]> = [
   ['nakshatra-finder', /13\.17639648/],   // moon mean longitude rate
   ['nakshatra-finder', /23\.853/],        // Lahiri ayanamsa at J2000
   ['manglik', /0\.5240207766/],           // Mars mean longitude rate
   ['choghadiya', /0\.39782/],             // solar declination coefficient
   ['choghadiya', /90\.833/],              // sunrise zenith incl. refraction
   ['numerology', /Chaldean letter values/],
   ['kundli-milan', /RASHI_VARNA/],
  ];
  for (const [mod, pattern] of banned) {
   expect(libSource(mod), `${mod}.ts reimplements ${pattern}`).not.toMatch(pattern);
  }
 });

 it('every one of the six modules imports from the shared package', () => {
  for (const mod of [
   'nakshatra-finder', 'manglik', 'kundli-milan',
   'numerology', 'choghadiya', 'rahu-kalam',
  ]) {
   expect(libSource(mod), `${mod}.ts`).toMatch(/from '@poojly\/shared\/astrology'/);
  }
 });
});

describe('the two nakshatra tables cannot drift apart', () => {
 it('hold the same 27 nakshatras in the same order', () => {
  expect(NAKSHATRAS).toHaveLength(27);
  expect(shared.NAKSHATRA_CORE).toHaveLength(27);
  expect(shared.NAKSHATRA_CORE.map((n) => n.slug)).toEqual(NAKSHATRAS.map((n) => n.slug));
 });

 it('agree on every field a calculation reads', () => {
  for (let i = 0; i < NAKSHATRAS.length; i += 1) {
   const web = NAKSHATRAS[i]!;
   const core = shared.NAKSHATRA_CORE[i]!;
   for (const f of COMPUTATIONAL_FIELDS) {
    expect(core[f], `${web.slug}.${f}`).toBe(web[f]);
   }
  }
 });

 it('leaves the editorial fields on the web side only', () => {
  // If the prose ever moved into the shared table, the mobile bundle would
  // start carrying ~20KB of SEO copy it never renders.
  const core = shared.NAKSHATRA_CORE[0]! as Record<string, unknown>;
  for (const f of ['meaning', 'qualities', 'career', 'compatibility', 'spiritualPractice']) {
   expect(core[f], `shared table should not carry ${f}`).toBeUndefined();
  }
  expect(NAKSHATRAS[0]!.qualities.length).toBeGreaterThan(0);
 });
});

describe('the web adapter keeps the shape its pages read', () => {
 it('findNakshatra still returns the rich nakshatra record', () => {
  const r = findNakshatra({ dob: '1995-08-21', time: '14:30', timezoneOffset: 5.5 });
  expect(r).not.toBeNull();
  // NakshatraFinderClient prints these; the shared core table has none of them.
  expect(r!.nakshatra.qualities).toBeInstanceOf(Array);
  expect(typeof r!.nakshatra.career).toBe('string');
  expect(typeof r!.nakshatra.spiritualPractice).toBe('string');
  // …and the computed half is untouched by the swap.
  expect(r!.nakshatra.slug).toBe('ardra');
  expect(r!.nakshatraIndex).toBe(5);
  expect(r!.pada).toBe(1);
  expect(r!.rashi).toBe('Mithuna (Gemini)');
 });

 it('the record it swaps in is the one at the index the shared finder returned', () => {
  // Sampled across the year so the moon lands in many different nakshatras.
  for (const dob of [
   '1988-01-04', '1993-04-19', '2001-07-07', '2014-10-30', '2025-12-25',
  ]) {
   const web = findNakshatra({ dob, time: '11:11', timezoneOffset: 5.5 })!;
   const core = shared.findNakshatra({ dob, time: '11:11', timezoneOffset: 5.5 })!;
   expect(web.nakshatraIndex).toBe(core.nakshatraIndex);
   expect(web.nakshatra.slug).toBe(core.nakshatra.slug);
   expect(web.moonSiderealLongitude).toBe(core.moonSiderealLongitude);
   expect(web.pada).toBe(core.pada);
   expect(web.rashi).toBe(core.rashi);
  }
 });
});

describe('web output for a fixed input is the shared output', () => {
 const birth = { dob: '1995-08-21', time: '14:30', timezoneOffset: 5.5 };
 const day = { date: '2026-03-15', lat: 28.6139, lng: 77.209, tz: 5.5, city: 'Delhi' };
 const asOf = new Date('2026-03-15T04:00:00.000Z');

 it('Gun Milan', () => {
  expect(computeMilan('rohini', 'hasta')).toEqual(shared.computeMilan('rohini', 'hasta'));
  expect(computeMilan('rohini', 'hasta')!.total).toBe(22);
 });

 it('Manglik', () => {
  expect(checkManglik(birth)).toEqual(shared.checkManglik(birth));
  expect(checkManglik(birth)!.marsHouseFromMoon).toBe(5);
 });

 it('Numerology', () => {
  expect(computeNumerology('1995-08-21', 'Arjun Sharma')).toEqual(
   shared.computeNumerology('1995-08-21', 'Arjun Sharma'),
  );
  expect(computeNumerology('1995-08-21', 'Arjun Sharma')!.lifePath).toBe(8);
 });

 it('Choghadiya + Rahu Kalam', () => {
  expect(computeChoghadiya(day, asOf)).toEqual(shared.computeChoghadiya(day, asOf));
  expect(computeRahuKalam(day, asOf)).toEqual(shared.computeRahuKalam(day, asOf));
  expect(computeRahuKalam(day, asOf)!.windows.find((w) => w.kind === 'rahu')!.startTime).toBe(
   '16:59',
  );
 });
});
