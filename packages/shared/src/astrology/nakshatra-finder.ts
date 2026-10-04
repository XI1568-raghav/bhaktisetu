// Nakshatra finder — birth nakshatra + pada + rashi from DOB + time + tz.
//
// Moved verbatim out of apps/web/lib/nakshatra-finder.ts so apps/web and
// apps/mobile run ONE implementation. The maths is unchanged; only the
// nakshatra lookup now goes through NAKSHATRA_CORE (the computational subset)
// instead of the web app's editorial dataset, and the result carries the
// nakshatra INDEX so a caller that wants the prose fields can look them up in
// its own table.
//
// Uses a simplified Meeus-style moon longitude computation (main perturbation
// terms only) — accurate to within ~0.3°. Each nakshatra spans 13°20'
// (13.333°) and each pada 3°20' (3.333°), so that precision is sufficient for
// namakaran and basic kundli purposes. For ceremonial (muhurat-grade)
// precision a pandit still runs a full Drik panchang ephemeris.
//
// Source: Jean Meeus "Astronomical Algorithms" Ch 47, abridged.

import {
 NAKSHATRA_CORE,
 RASHI_LABELS,
 type NakshatraCore,
} from './nakshatra-table.js';

export type NakshatraFinderInput = {
 /** YYYY-MM-DD */
 dob: string;
 /** HH:MM, 24h, local to the birth place */
 time: string;
 /** Hours from UTC, e.g. 5.5 for IST */
 timezoneOffset: number;
};

export type NakshatraFinderResult = {
 input: NakshatraFinderInput;
 julianDay: number;
 /** degrees [0,360) */
 moonTropicalLongitude: number;
 /** degrees [0,360), after Lahiri ayanamsa */
 moonSiderealLongitude: number;
 /** degrees */
 ayanamsa: number;
 nakshatra: NakshatraCore;
 /** 0-26 */
 nakshatraIndex: number;
 pada: 1 | 2 | 3 | 4;
 /** position within the nakshatra (0-13.33) */
 padaLongitude: number;
 /** e.g. "Karka (Cancer)" */
 rashi: string;
 /** 0-11 */
 rashiIndex: number;
};

const NAK_SIZE = 360 / 27; // 13.333333...
const PADA_SIZE = NAK_SIZE / 4; // 3.333333...

const DEG_TO_RAD = Math.PI / 180;

export function norm360(deg: number): number {
 const r = deg % 360;
 return r < 0 ? r + 360 : r;
}

/** Julian Day from UTC date + fractional hour. Meeus ch 7. */
export function julianDay(year: number, month: number, day: number, hourUtc: number): number {
 let y = year;
 let m = month;
 if (m <= 2) {
  y -= 1;
  m += 12;
 }
 const a = Math.floor(y / 100);
 const b = 2 - a + Math.floor(a / 4);
 return (
  Math.floor(365.25 * (y + 4716)) +
  Math.floor(30.6001 * (m + 1)) +
  day + b - 1524.5 + hourUtc / 24
 );
}

/**
 * Lahiri ayanamsa — simplified linear fit, accurate ±0.01° over 2000-2050.
 * Value at J2000.0 = 23.853° (per Indian Ephemeris).
 * Precession rate ~= 50.27"/year = 0.013963°/year.
 */
export function lahiriAyanamsa(jd: number): number {
 const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
 return 23.853 + 0.013963 * yearsFromJ2000;
}

/**
 * Moon longitude (tropical) — Meeus simplified.
 * Main term + top 11 perturbations. Accuracy ~0.3° throughout 1900-2100.
 */
export function moonTropicalLongitude(jd: number): number {
 const d = jd - 2451545.0; // days from J2000.0

 const Lp = 218.3164591 + 13.17639648 * d; // mean longitude of Moon
 const D = 297.8502042 + 12.19074912 * d; // mean elongation Moon-Sun
 const M = 357.5291092 + 0.98560028 * d; // Sun's mean anomaly
 const Mp = 134.9634114 + 13.06499295 * d; // Moon's mean anomaly

 const D_r = D * DEG_TO_RAD;
 const M_r = M * DEG_TO_RAD;
 const Mp_r = Mp * DEG_TO_RAD;

 const correction =
  6.289 * Math.sin(Mp_r)
  - 1.274 * Math.sin(Mp_r - 2 * D_r)
  + 0.658 * Math.sin(2 * D_r)
  - 0.186 * Math.sin(M_r)
  - 0.059 * Math.sin(2 * Mp_r - 2 * D_r)
  - 0.057 * Math.sin(Mp_r - 2 * D_r + M_r)
  + 0.053 * Math.sin(Mp_r + 2 * D_r)
  + 0.046 * Math.sin(2 * D_r - M_r)
  + 0.041 * Math.sin(Mp_r - M_r)
  - 0.035 * Math.sin(D_r)
  - 0.031 * Math.sin(Mp_r + M_r);

 return norm360(Lp + correction);
}

export function daysInMonth(year: number, month: number): number {
 if (month === 2) {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? 29 : 28;
 }
 if ([4, 6, 9, 11].includes(month)) return 30;
 return 31;
}

export function findNakshatra(input: NakshatraFinderInput): NakshatraFinderResult | null {
 const { dob, time, timezoneOffset } = input;
 const dateMatch = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
 if (!dateMatch || !timeMatch) return null;

 const year = Number(dateMatch[1]);
 const month = Number(dateMatch[2]);
 const day = Number(dateMatch[3]);
 const hh = Number(timeMatch[1]);
 const mm = Number(timeMatch[2]);
 if (
  !Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) ||
  !Number.isFinite(hh) || !Number.isFinite(mm) ||
  hh < 0 || hh > 23 || mm < 0 || mm > 59
 ) return null;

 const localHour = hh + mm / 60;
 const utcHour = localHour - timezoneOffset;

 // Normalize across midnight
 let dayAdj = day;
 let monthAdj = month;
 let yearAdj = year;
 let utcH = utcHour;
 if (utcH < 0) {
  utcH += 24;
  dayAdj -= 1;
  if (dayAdj < 1) {
   monthAdj -= 1;
   if (monthAdj < 1) {
    monthAdj = 12;
    yearAdj -= 1;
   }
   dayAdj = daysInMonth(yearAdj, monthAdj);
  }
 } else if (utcH >= 24) {
  utcH -= 24;
  dayAdj += 1;
  if (dayAdj > daysInMonth(yearAdj, monthAdj)) {
   dayAdj = 1;
   monthAdj += 1;
   if (monthAdj > 12) {
    monthAdj = 1;
    yearAdj += 1;
   }
  }
 }

 const jd = julianDay(yearAdj, monthAdj, dayAdj, utcH);
 const moonTrop = moonTropicalLongitude(jd);
 const ayan = lahiriAyanamsa(jd);
 const moonSid = norm360(moonTrop - ayan);

 const nakIdx = Math.floor(moonSid / NAK_SIZE);
 const padaLon = moonSid - nakIdx * NAK_SIZE;
 const padaIdx = Math.floor(padaLon / PADA_SIZE);
 const pada = (padaIdx + 1) as 1 | 2 | 3 | 4;

 const rashiIdx = Math.floor(moonSid / 30);

 const nak = NAKSHATRA_CORE[nakIdx];
 if (!nak) return null;

 return {
  input,
  julianDay: jd,
  moonTropicalLongitude: moonTrop,
  moonSiderealLongitude: moonSid,
  ayanamsa: ayan,
  nakshatra: nak,
  nakshatraIndex: nakIdx,
  pada,
  padaLongitude: padaLon,
  rashi: RASHI_LABELS[rashiIdx] ?? RASHI_LABELS[0],
  rashiIndex: rashiIdx,
 };
}

/** Common timezone offsets for the birth-time form. */
export const TIMEZONE_OPTIONS: Array<{ value: number; label: string }> = [
 { value: 5.5, label: 'IST · India (+5:30)' },
 { value: 0, label: 'UTC / GMT (London winter)' },
 { value: 1, label: 'CET · Central Europe' },
 { value: -5, label: 'EST · US East (winter)' },
 { value: -4, label: 'EDT · US East (summer)' },
 { value: -8, label: 'PST · US West (winter)' },
 { value: -7, label: 'PDT · US West (summer)' },
 { value: 4, label: 'GST · Gulf (+4)' },
 { value: 5.75, label: 'NPT · Nepal (+5:45)' },
 { value: 8, label: 'SGT · Singapore (+8)' },
 { value: 9, label: 'JST · Japan (+9)' },
 { value: 10, label: 'AEST · Australia East' },
];
