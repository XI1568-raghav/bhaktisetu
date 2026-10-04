import { describe, it, expect } from 'vitest';
import {
 NAKSHATRA_CORE,
 RASHI_NAMES,
 RASHI_LABELS,
 allNakshatraOptions,
 getNakshatraCore,
 primaryRashiOf,
 rashiIndexOf,
} from './nakshatra-table.js';
import { findNakshatra, julianDay, lahiriAyanamsa, norm360 } from './nakshatra-finder.js';
import { checkManglik } from './manglik.js';
import { computeMilan } from './kundli-milan.js';
import { computeNumerology, lifePath, birthdayNumber, nameChaldean } from './numerology.js';
import { computeChoghadiya, CITY_OPTIONS } from './choghadiya.js';
import { computeRahuKalam } from './rahu-kalam.js';

/**
 * The calculators that moved out of apps/web/lib so apps/mobile could run them
 * too. Every golden number below was produced by THIS code and is pinned so a
 * future edit that changes an answer has to change a test on purpose.
 *
 * The web-vs-mobile identity guarantee is structural, not a comparison: both
 * apps import these functions. apps/web/__tests__/astrology-shared-parity.test.ts
 * proves apps/web/lib re-exports rather than reimplements them, and
 * apps/mobile/lib/__tests__/astrology-parity.test.ts proves the mobile screens
 * call the same module.
 */

describe('nakshatra table', () => {
 it('carries all 27, in canonical order, with unique slugs', () => {
  expect(NAKSHATRA_CORE).toHaveLength(27);
  expect(NAKSHATRA_CORE[0]!.slug).toBe('ashwini');
  expect(NAKSHATRA_CORE[26]!.slug).toBe('revati');
  expect(new Set(NAKSHATRA_CORE.map((n) => n.slug)).size).toBe(27);
 });

 it('every gana is one of the three, and every primary rashi is a real rashi', () => {
  for (const n of NAKSHATRA_CORE) {
   expect(['Deva', 'Manushya', 'Rakshasa']).toContain(n.gana);
   // A typo in a straddling entry ("Aries-Taurus") would silently score the
   // Varna / Vashya / Bhakoot kootas as undefined rather than fail.
   expect(rashiIndexOf(primaryRashiOf(n)), `${n.slug} primary rashi`).toBeGreaterThanOrEqual(0);
  }
 });

 it('exposes 12 rashis with matching labels', () => {
  expect(RASHI_NAMES).toHaveLength(12);
  expect(RASHI_LABELS).toHaveLength(12);
  expect(RASHI_LABELS[0]).toBe('Mesha (Aries)');
  expect(RASHI_LABELS[11]).toBe('Meena (Pisces)');
 });

 it('dropdown options match the table one-for-one', () => {
  const opts = allNakshatraOptions();
  expect(opts).toHaveLength(27);
  expect(opts[10]).toEqual({ slug: 'purva-phalguni', label: 'Purva Phalguni (पूर्व फाल्गुनी)' });
 });

 it('looks a nakshatra up by slug, and returns undefined for one that is not there', () => {
  expect(getNakshatraCore('rohini')?.gana).toBe('Manushya');
  expect(getNakshatraCore('not-a-nakshatra')).toBeUndefined();
 });
});

describe('nakshatra finder', () => {
 it('pins the Julian Day and ayanamsa the moon longitude is built on', () => {
  // J2000.0 epoch — 2000-01-01 12:00 UTC.
  expect(julianDay(2000, 1, 1, 12)).toBe(2451545);
  expect(lahiriAyanamsa(2451545)).toBeCloseTo(23.853, 6);
 });

 it('normalises degrees into [0,360)', () => {
  expect(norm360(-1)).toBe(359);
  expect(norm360(721)).toBe(1);
  expect(norm360(0)).toBe(0);
 });

 it('resolves a known birth moment to a fixed nakshatra, pada and rashi', () => {
  const r = findNakshatra({ dob: '1995-08-21', time: '14:30', timezoneOffset: 5.5 });
  expect(r).not.toBeNull();
  expect(r!.nakshatra.slug).toBe('ardra');
  expect(r!.nakshatraIndex).toBe(5);
  expect(r!.pada).toBe(1);
  expect(r!.rashi).toBe('Mithuna (Gemini)');
  expect(r!.rashiIndex).toBe(2);
  expect(r!.julianDay).toBeCloseTo(2449950.875, 6);
  expect(r!.moonSiderealLongitude).toBeCloseTo(69.4754192568377, 9);
  expect(r!.ayanamsa).toBeCloseTo(23.79205881622177, 9);
 });

 it('crosses UTC midnight backwards without landing on day 0', () => {
  // 00:30 IST is 19:00 UTC the PREVIOUS day, and 1 March rolls back to 28/29
  // Feb — the branch that has to know how long February was.
  const leap = findNakshatra({ dob: '2024-03-01', time: '00:30', timezoneOffset: 5.5 });
  const nonLeap = findNakshatra({ dob: '2023-03-01', time: '00:30', timezoneOffset: 5.5 });
  expect(leap).not.toBeNull();
  expect(nonLeap).not.toBeNull();
  // 2024-02-29 19:00 UTC and 2023-02-28 19:00 UTC.
  expect(leap!.julianDay).toBeCloseTo(julianDay(2024, 2, 29, 19), 9);
  expect(nonLeap!.julianDay).toBeCloseTo(julianDay(2023, 2, 28, 19), 9);
 });

 it('crosses UTC midnight forwards over a month end', () => {
  // 23:00 in UTC-8 is 07:00 UTC the NEXT day.
  const r = findNakshatra({ dob: '2024-01-31', time: '23:00', timezoneOffset: -8 });
  expect(r).not.toBeNull();
  expect(r!.julianDay).toBeCloseTo(julianDay(2024, 2, 1, 7), 9);
 });

 it('refuses malformed input rather than guessing', () => {
  expect(findNakshatra({ dob: '21-08-1995', time: '14:30', timezoneOffset: 5.5 })).toBeNull();
  expect(findNakshatra({ dob: '1995-08-21', time: '2:5', timezoneOffset: 5.5 })).toBeNull();
  expect(findNakshatra({ dob: '1995-08-21', time: '25:30', timezoneOffset: 5.5 })).toBeNull();
  expect(findNakshatra({ dob: '1995-08-21', time: '14:75', timezoneOffset: 5.5 })).toBeNull();
 });
});

describe('manglik', () => {
 it('pins a known chart', () => {
  const r = checkManglik({ dob: '1995-08-21', time: '14:30', timezoneOffset: 5.5 });
  expect(r).not.toBeNull();
  expect(r!.isManglik).toBe(false);
  expect(r!.severity).toBe('none');
  expect(r!.marsHouseFromMoon).toBe(5);
  expect(r!.marsRashi).toBe('Tula (Libra)');
  expect(r!.moonRashi).toBe('Mithuna (Gemini)');
  expect(r!.marsLongitude).toBeCloseTo(205.829876351574, 9);
 });

 it('never reports a house outside 1-12, and states its reasoning', () => {
  // Sampled across a wide date range rather than one chart, because the
  // house is modular arithmetic on two longitudes and an off-by-one only
  // shows at the wrap.
  for (const dob of ['1950-01-01', '1977-06-15', '1999-12-31', '2011-02-28', '2030-09-09']) {
   const r = checkManglik({ dob, time: '09:15', timezoneOffset: 5.5 });
   expect(r).not.toBeNull();
   expect(r!.marsHouseFromMoon).toBeGreaterThanOrEqual(1);
   expect(r!.marsHouseFromMoon).toBeLessThanOrEqual(12);
   expect(r!.reasoning).toContain(`house ${r!.marsHouseFromMoon}`);
   // The verdict and the severity can never disagree.
   expect(r!.isManglik).toBe(r!.severity !== 'none');
  }
 });

 it('returns null on input the finder cannot parse', () => {
  expect(checkManglik({ dob: 'nope', time: '09:15', timezoneOffset: 5.5 })).toBeNull();
 });
});

describe('kundli milan — Ashtakoot', () => {
 it('pins a 36-point breakdown for a known pair', () => {
  const r = computeMilan('rohini', 'hasta');
  expect(r).not.toBeNull();
  expect(r!.gunas.map((g) => [g.name, g.score])).toEqual([
   ['Varna', 1],
   ['Vashya', 1],
   ['Tara', 0],
   ['Yoni', 2],
   ['Graha Maitri', 5],
   ['Gana', 5],
   ['Bhakoot', 0],
   ['Nadi', 8],
  ]);
  expect(r!.total).toBe(22);
  expect(r!.maxTotal).toBe(36);
  expect(r!.verdictLevel).toBe('acceptable');
  expect(r!.hasBhakootDosh).toBe(true);
  expect(r!.hasNadiDosh).toBe(false);
  expect(r!.hasGanaDosh).toBe(false);
 });

 it('flags Nadi dosh when both partners share a nadi', () => {
  // Same nakshatra on both sides is the textbook Nadi dosh.
  const r = computeMilan('ashwini', 'ashwini');
  expect(r!.hasNadiDosh).toBe(true);
  expect(r!.gunas.find((g) => g.name === 'Nadi')!.score).toBe(0);
  expect(r!.total).toBe(25);
 });

 it('adds the Manglik note only when the two partners differ', () => {
  const one = computeMilan('krittika', 'mula', { maleManglik: true, femaleManglik: false });
  expect(one!.manglikNote).toMatch(/One partner is Manglik/);
  const both = computeMilan('krittika', 'mula', { maleManglik: true, femaleManglik: true });
  expect(both!.manglikNote).toMatch(/Mangal-bhanga/);
  const neither = computeMilan('krittika', 'mula');
  expect(neither!.manglikNote).toBeUndefined();
  // The note is commentary — it must not move the score.
  expect(one!.total).toBe(neither!.total);
  expect(one!.total).toBe(24.5);
 });

 it('never scores a koota above its own maximum, for any of the 729 pairs', () => {
  // The whole matrix, because a bad table entry shows up on one pair only.
  let seen = 0;
  for (const m of NAKSHATRA_CORE) {
   for (const f of NAKSHATRA_CORE) {
    const r = computeMilan(m.slug, f.slug);
    expect(r, `${m.slug} x ${f.slug}`).not.toBeNull();
    for (const g of r!.gunas) {
     expect(g.score, `${m.slug} x ${f.slug} ${g.name}`).toBeGreaterThanOrEqual(0);
     expect(g.score, `${m.slug} x ${f.slug} ${g.name}`).toBeLessThanOrEqual(g.max);
    }
    expect(r!.total).toBeLessThanOrEqual(36);
    seen += 1;
   }
  }
  expect(seen).toBe(729);
 });

 it('returns null for a slug that is not a nakshatra', () => {
  expect(computeMilan('rohini', 'not-a-nakshatra')).toBeNull();
  expect(computeMilan('not-a-nakshatra', 'rohini')).toBeNull();
 });
});

describe('numerology', () => {
 it('pins a known reading', () => {
  const r = computeNumerology('1995-08-21', 'Arjun Sharma');
  expect(r).not.toBeNull();
  expect(r!.lifePath).toBe(8);
  expect(r!.lifePathSteps).toBe('35 → 8');
  expect(r!.birthday).toBe(3);
  expect(r!.nameChaldean).toBe(4);
  expect(r!.nameSoul).toBe(6);
  expect(r!.namePersonality).toBe(1);
  expect(r!.meanings.lifePath.title).toBe('The Executive');
 });

 it('keeps master numbers unreduced', () => {
  // 1975-11-29 sums to 1+9+7+5+1+1+2+9 = 35 → 8; 2008-08-29 → 2+0+0+8+8+2+9 = 29 → 11.
  expect(lifePath('2008-08-29').value).toBe(11);
  expect(lifePath('2008-08-29').trace).toBe('29 → 11');
 });

 it('reads the day from either date format', () => {
  expect(birthdayNumber('1995-08-21')).toBe(3);
  expect(birthdayNumber('21/08/1995')).toBe(3);
  expect(birthdayNumber('21-08-1995')).toBe(3);
  expect(birthdayNumber('not a date')).toBe(0);
 });

 it('ignores non-letters in a name rather than scoring them', () => {
  expect(nameChaldean('Arjun Sharma')).toBe(nameChaldean('  arjun-sharma!  '));
 });

 it('returns null when the date carries fewer than 8 digits', () => {
  expect(computeNumerology('1995', 'Arjun')).toBeNull();
 });
});

describe('choghadiya + rahu kalam', () => {
 // A fixed instant, so `isCurrent` is deterministic rather than clock-dependent.
 const asOf = new Date('2026-03-15T04:00:00.000Z');
 const input = { date: '2026-03-15', lat: 28.6139, lng: 77.209, tz: 5.5, city: 'Delhi' };

 it('pins sunrise, sunset and the first period of each arc', () => {
  const d = computeChoghadiya(input, asOf);
  expect(d).not.toBeNull();
  expect(d!.weekday).toBe('Sunday');
  expect(d!.sunrise).toBe('06:32');
  expect(d!.sunset).toBe('18:29');
  expect(d!.nextSunrise).toBe('06:31');
  expect(d!.day).toHaveLength(8);
  expect(d!.night).toHaveLength(8);
  expect(d!.day[0]!.kind).toBe('Udveg');
  expect(d!.day[0]!.startTime).toBe('06:32');
  expect(d!.day[0]!.endTime).toBe('08:01');
  expect(d!.night[0]!.kind).toBe('Shubh');
  expect(d!.night[0]!.startTime).toBe('18:29');
 });

 it('covers the whole day-arc with no gap between periods', () => {
  const d = computeChoghadiya(input, asOf)!;
  for (let i = 1; i < 8; i += 1) {
   expect(d.day[i]!.startMinutes).toBe(d.day[i - 1]!.endMinutes);
   expect(d.night[i]!.startMinutes).toBe(d.night[i - 1]!.endMinutes);
  }
 });

 it('pins the three inauspicious windows for a Sunday in Delhi', () => {
  const r = computeRahuKalam(input, asOf);
  expect(r).not.toBeNull();
  expect(r!.weekday).toBe('Sunday');
  // Sunday's Rahu Kalam is the 8th octet — the late-afternoon window every
  // panchang prints as roughly 16:30-18:00 for north India.
  expect(r!.windows.map((w) => [w.kind, w.octet, w.startTime, w.endTime])).toEqual([
   ['yamaganda', 5, '12:31', '14:00'],
   ['gulika', 7, '15:30', '16:59'],
   ['rahu', 8, '16:59', '18:29'],
  ]);
  expect(r!.octetLengthMin).toBeCloseTo(89.625, 6);
 });

 it('gives every weekday exactly one Rahu, one Yamaganda and one Gulika window', () => {
  for (const date of [
   '2026-03-15', '2026-03-16', '2026-03-17', '2026-03-18',
   '2026-03-19', '2026-03-20', '2026-03-21',
  ]) {
   const r = computeRahuKalam({ ...input, date }, asOf);
   expect(r, date).not.toBeNull();
   expect(r!.windows.map((w) => w.kind).sort()).toEqual(['gulika', 'rahu', 'yamaganda']);
   for (const w of r!.windows) {
    expect(w.octet, `${date} ${w.kind}`).toBeGreaterThanOrEqual(1);
    expect(w.octet, `${date} ${w.kind}`).toBeLessThanOrEqual(8);
   }
   // Sorted by clock time, always.
   expect(r!.windows.map((w) => w.startMinutes)).toEqual(
    [...r!.windows.map((w) => w.startMinutes)].sort((a, b) => a - b),
   );
  }
 });

 it('ships the same city list to both clients', () => {
  expect(CITY_OPTIONS.length).toBeGreaterThan(20);
  expect(CITY_OPTIONS[0]).toEqual({ label: 'Delhi', lat: 28.6139, lng: 77.209, tz: 5.5 });
  expect(new Set(CITY_OPTIONS.map((c) => c.label)).size).toBe(CITY_OPTIONS.length);
 });

 it('returns null for a malformed date rather than a NaN clock', () => {
  expect(computeChoghadiya({ ...input, date: 'tomorrow' }, asOf)).toBeNull();
  expect(computeRahuKalam({ ...input, date: 'tomorrow' }, asOf)).toBeNull();
 });
});
