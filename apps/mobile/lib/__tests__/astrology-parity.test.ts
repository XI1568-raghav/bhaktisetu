import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
 ASTROLOGY_TOOLS,
 allNakshatraOptions,
 birthInputError,
 canComputeBirth,
 checkManglik,
 computeChoghadiya,
 computeMilan,
 computeNumerology,
 computeRahuKalam,
 findNakshatra,
 isValidDateInput,
 isValidTimeInput,
 milanScoreLabel,
 todayLocalISO,
 CITY_OPTIONS,
 TIMEZONE_OPTIONS,
 NAKSHATRA_CORE,
} from '../astrology-tools';

import * as shared from '@poojly/shared/astrology';

/**
 * The Vedic calculators now run IN THE APP, and this file is what makes that
 * claim checkable.
 *
 * Three separate things can go wrong and each is pinned separately:
 *
 *   1. THE MATHS FORKS. The mobile screens could grow their own copy of the
 *      Ashtakoot table or the moon-longitude series, and then quietly disagree
 *      with the website about whether a marriage scores 22 or 24. Guarded by
 *      object identity against @poojly/shared/astrology, plus fixed-input
 *      golden values that are the SAME numbers pinned in
 *      apps/web/__tests__/astrology-shared-parity.test.ts and
 *      packages/shared/src/astrology/index.test.ts.
 *
 *   2. A SCREEN IS BUILT AND LEFT UNREACHABLE. Three screens in this app have
 *      already been built and never routed to. Every entry in ASTROLOGY_TOOLS
 *      is checked against a real file in app/(devotee), and app/(devotee)/
 *      astrology.tsx is checked to actually render the registry.
 *
 *   3. THE CENSUS ROTS. lib/__tests__/handoff-census.par22.test.ts compares a
 *      tree-wide `Linking.openURL` count against figures written into
 *      docs/mobile-v1-scope.md. A new screen that bounced out would move those
 *      figures without anyone editing the document, so the new screens are
 *      checked to contain no hand-off at all.
 */

const MOBILE = path.resolve(__dirname, '../..');
const DEVOTEE = path.join(MOBILE, 'app/(devotee)');

function screenSource(name: string): string {
 return readFileSync(path.join(DEVOTEE, `${name}.tsx`), 'utf8');
}

/** Comments blanked in place, so prose about a rule cannot satisfy the rule. */
function stripComments(src: string): string {
 return src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

const TOOL_SCREENS = [
 'kundli-milan',
 'numerology',
 'nakshatra-finder',
 'manglik',
 'rahu-kalam',
] as const;

/** The screens that take typed birth/date input and therefore need the keyboard handled. */
const FORM_SCREENS = ['numerology', 'nakshatra-finder', 'manglik'] as const;

describe('the mobile calculators ARE the shared calculators', () => {
 it('re-exports the same function objects, not copies of them', () => {
  expect(computeMilan).toBe(shared.computeMilan);
  expect(checkManglik).toBe(shared.checkManglik);
  expect(findNakshatra).toBe(shared.findNakshatra);
  expect(computeNumerology).toBe(shared.computeNumerology);
  expect(computeChoghadiya).toBe(shared.computeChoghadiya);
  expect(computeRahuKalam).toBe(shared.computeRahuKalam);
  expect(allNakshatraOptions).toBe(shared.allNakshatraOptions);
  expect(CITY_OPTIONS).toBe(shared.CITY_OPTIONS);
  expect(TIMEZONE_OPTIONS).toBe(shared.TIMEZONE_OPTIONS);
  expect(NAKSHATRA_CORE).toBe(shared.NAKSHATRA_CORE);
 });

 it('no screen reimplements the astronomy or the koota tables', () => {
  // The constants that would give away a second copy.
  const banned = [
   /13\.17639648/,   // moon mean longitude rate
   /0\.5240207766/,  // Mars mean longitude rate
   /23\.853/,        // Lahiri ayanamsa at J2000
   /0\.39782/,       // solar declination coefficient
   /RASHI_VARNA/,
   /NAK_NADI/,
   /CHALDEAN_VALUES/,
  ];
  for (const name of TOOL_SCREENS) {
   const src = stripComments(screenSource(name));
   for (const pattern of banned) {
    expect(src, `${name}.tsx reimplements ${pattern}`).not.toMatch(pattern);
   }
  }
 });

 it('every tool screen imports the calculators from lib/astrology-tools', () => {
  for (const name of TOOL_SCREENS) {
   expect(screenSource(name), `${name}.tsx`).toMatch(/from '\.\.\/\.\.\/lib\/astrology-tools'/);
  }
 });
});

describe('fixed input gives the numbers the web suite pins', () => {
 const birth = { dob: '1995-08-21', time: '14:30', timezoneOffset: 5.5 };
 const day = { date: '2026-03-15', lat: 28.6139, lng: 77.209, tz: 5.5, city: 'Delhi' };
 const asOf = new Date('2026-03-15T04:00:00.000Z');

 it('Gun Milan — rohini x hasta scores 22 of 36', () => {
  const r = computeMilan('rohini', 'hasta');
  expect(r).not.toBeNull();
  expect(r!.total).toBe(22);
  expect(r!.verdictLevel).toBe('acceptable');
  expect(r!.hasBhakootDosh).toBe(true);
  expect(r!.gunas.map((g) => g.score)).toEqual([1, 1, 0, 2, 5, 5, 0, 8]);
 });

 it('Gun Milan — the Manglik switches are commentary, not score', () => {
  const plain = computeMilan('krittika', 'mula')!;
  const flagged = computeMilan('krittika', 'mula', { maleManglik: true })!;
  expect(flagged.total).toBe(plain.total);
  expect(flagged.total).toBe(24.5);
  expect(flagged.manglikNote).toMatch(/One partner is Manglik/);
  expect(plain.manglikNote).toBeUndefined();
 });

 it('Nakshatra finder — a known birth moment', () => {
  const r = findNakshatra(birth)!;
  expect(r.nakshatra.slug).toBe('ardra');
  expect(r.nakshatraIndex).toBe(5);
  expect(r.pada).toBe(1);
  expect(r.rashi).toBe('Mithuna (Gemini)');
  expect(r.moonSiderealLongitude).toBeCloseTo(69.4754192568377, 9);
 });

 it('Manglik — the same chart, the same house', () => {
  const r = checkManglik(birth)!;
  expect(r.isManglik).toBe(false);
  expect(r.severity).toBe('none');
  expect(r.marsHouseFromMoon).toBe(5);
  expect(r.marsRashi).toBe('Tula (Libra)');
 });

 it('Numerology — the same reading', () => {
  const r = computeNumerology('1995-08-21', 'Arjun Sharma')!;
  expect(r.lifePath).toBe(8);
  expect(r.lifePathSteps).toBe('35 → 8');
  expect(r.birthday).toBe(3);
  expect(r.nameChaldean).toBe(4);
  expect(r.nameSoul).toBe(6);
  expect(r.namePersonality).toBe(1);
 });

 it('Rahu Kalam — Sunday in Delhi is the 8th octet', () => {
  const r = computeRahuKalam(day, asOf)!;
  expect(r.weekday).toBe('Sunday');
  expect(r.sunrise).toBe('06:32');
  expect(r.sunset).toBe('18:29');
  expect(r.windows.map((w) => [w.kind, w.startTime, w.endTime])).toEqual([
   ['yamaganda', '12:31', '14:00'],
   ['gulika', '15:30', '16:59'],
   ['rahu', '16:59', '18:29'],
  ]);
 });

 it('Choghadiya — 8 day and 8 night periods, contiguous', () => {
  const c = computeChoghadiya(day, asOf)!;
  expect(c.day).toHaveLength(8);
  expect(c.night).toHaveLength(8);
  expect(c.day[0]!.kind).toBe('Udveg');
  expect(c.night[0]!.kind).toBe('Shubh');
  for (let i = 1; i < 8; i += 1) {
   expect(c.day[i]!.startMinutes).toBe(c.day[i - 1]!.endMinutes);
  }
 });
});

describe('form input is validated before anything is computed', () => {
 it('accepts a real date and rejects one that is not', () => {
  expect(isValidDateInput('1995-08-21')).toBe(true);
  expect(isValidDateInput('2024-02-29')).toBe(true);
  expect(isValidDateInput('2023-02-29')).toBe(false);
  expect(isValidDateInput('1995-13-01')).toBe(false);
  expect(isValidDateInput('1995-04-31')).toBe(false);
  expect(isValidDateInput('21-08-1995')).toBe(false);
  expect(isValidDateInput('')).toBe(false);
 });

 it('accepts a 24-hour time and rejects one that is not', () => {
  expect(isValidTimeInput('00:00')).toBe(true);
  expect(isValidTimeInput('23:59')).toBe(true);
  expect(isValidTimeInput('9:05')).toBe(true);
  expect(isValidTimeInput('24:00')).toBe(false);
  expect(isValidTimeInput('12:60')).toBe(false);
  expect(isValidTimeInput('12:5')).toBe(false);
 });

 it('says nothing until the devotee has typed something', () => {
  // An error message on an untouched form is noise, not help.
  expect(birthInputError('', '')).toBeNull();
  expect(birthInputError('1995', '')).toMatch(/YYYY-MM-DD/);
  expect(birthInputError('1995-08-21', '9')).toMatch(/24-hour/);
  expect(birthInputError('1995-08-21', '14:30')).toBeNull();
 });

 it('only reports ready when both halves parse', () => {
  expect(canComputeBirth('1995-08-21', '14:30')).toBe(true);
  expect(canComputeBirth('1995-08-21', '')).toBe(false);
  expect(canComputeBirth('', '14:30')).toBe(false);
 });

 it('defaults the panchang date to today in the device timezone', () => {
  // Not toISOString(): that is UTC, and would show yesterday's windows to
  // anyone in IST between midnight and 05:30.
  expect(todayLocalISO(new Date(2026, 2, 15, 1, 30))).toBe('2026-03-15');
  expect(todayLocalISO(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
 });

 it('prints a half-point Gun Milan total without rounding it away', () => {
  expect(milanScoreLabel(22, 36)).toBe('22 / 36');
  expect(milanScoreLabel(24.5, 36)).toBe('24.5 / 36');
 });
});

describe('every tool that was built is reachable', () => {
 it('the registry is not empty and every route points at a real screen', () => {
  expect(ASTROLOGY_TOOLS.length).toBe(TOOL_SCREENS.length);
  for (const t of ASTROLOGY_TOOLS) {
   expect(t.route.startsWith('/(devotee)/'), t.route).toBe(true);
   const file = path.join(DEVOTEE, `${t.route.replace('/(devotee)/', '')}.tsx`);
   expect(existsSync(file), `${t.route} has no screen file`).toBe(true);
   expect(t.title.length).toBeGreaterThan(0);
   expect(t.body.length).toBeGreaterThan(0);
  }
 });

 it('covers exactly the five screens this wave built', () => {
  expect(ASTROLOGY_TOOLS.map((t) => t.route.replace('/(devotee)/', '')).sort()).toEqual(
   [...TOOL_SCREENS].sort(),
  );
 });

 it('astrology.tsx renders the registry rather than hardcoding a subset', () => {
  // A hardcoded list is how a sixth tool gets built and never linked.
  const hub = stripComments(screenSource('astrology'));
  expect(hub).toMatch(/ASTROLOGY_TOOLS\.map\(/);
  expect(hub).toMatch(/router\.push\(t\.route as never\)/);
 });

 it('astrology.tsx no longer sends Kundli Milan to the website', () => {
  const hub = stripComments(screenSource('astrology'));
  expect(hub).not.toMatch(/kundli-milan\?utm_source/);
  // …and the remaining hand-off is still described by the same call that
  // routes it, which astrology-bounceout-honesty.par22.test.ts also pins.
  const handoffs = (hub.match(/openWebHandoff\(/g) ?? []).length;
  const described = (hub.match(/describeWebHandoff\(/g) ?? []).length;
  expect(handoffs).toBe(1);
  expect(described).toBe(handoffs);
 });

 it('the hand-off that remains names what it still covers', () => {
  // The old copy promised "numerology, nakshatra finder … manglik" on the
  // web card. Five of those are in the app now, so listing them there would
  // send devotees out for something they already have.
  const hub = screenSource('astrology');
  const i = hub.indexOf('More Vedic calculators');
  expect(i).toBeGreaterThan(-1);
  const card = hub.slice(i, i + 400);
  expect(card).toMatch(/sade sati/i);
  expect(card).toMatch(/lal kitab/i);
  expect(card).not.toMatch(/numerology/i);
  expect(card).not.toMatch(/nakshatra finder/i);
 });
});

describe('the new screens keep the app conventions', () => {
 it('no new screen bounces out — the Linking census stays true', () => {
  // handoff-census.par22.test.ts compares a tree-wide count against figures
  // written into docs/mobile-v1-scope.md; a hand-off added here would move
  // them silently.
  for (const name of TOOL_SCREENS) {
   const src = stripComments(screenSource(name));
   expect(src, `${name}.tsx`).not.toMatch(/Linking/);
   expect(src, `${name}.tsx`).not.toMatch(/openWebHandoff/);
  }
 });

 it('no control apologises instead of working', () => {
  for (const name of TOOL_SCREENS) {
   const src = screenSource(name);
   expect(src, `${name}.tsx`).not.toMatch(/Coming Soon/i);
   expect(src, `${name}.tsx`).not.toMatch(/Alert\.alert/);
  }
 });

 it('every screen claims both safe-area edges', () => {
  for (const name of TOOL_SCREENS) {
   expect(stripComments(screenSource(name)), `${name}.tsx`).toMatch(
    /edges=\{\['top',\s*'bottom'\]\}/,
   );
  }
 });

 it('every typed-input screen handles the keyboard the platform way', () => {
  for (const name of FORM_SCREENS) {
   const src = stripComments(screenSource(name));
   expect(src, `${name}.tsx`).toMatch(/KeyboardAvoidingView/);
   expect(src, `${name}.tsx`).toMatch(
    /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/,
   );
  }
 });

 it('no screen reads Dimensions at module scope', () => {
  // lib/use-responsive.ts exists because a module-scope read freezes the
  // width at import time and never updates on rotation.
  for (const name of TOOL_SCREENS) {
   expect(stripComments(screenSource(name)), `${name}.tsx`).not.toMatch(/Dimensions\.get\(/);
  }
 });

 it('the shared tool chrome keeps touch targets at 44', () => {
  const ui = readFileSync(path.join(MOBILE, 'lib/astrology-ui.tsx'), 'utf8');
  expect(ui).toMatch(/export const HIT_MIN = 44;/);
  // Both tappables in that module size themselves from it.
  expect(stripComments(ui)).toMatch(/width: HIT_MIN,\s*\n\s*height: HIT_MIN,/);
  expect(stripComments(ui)).toMatch(/minHeight: HIT_MIN,/);
 });
});
