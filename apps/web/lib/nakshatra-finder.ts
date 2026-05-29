// Nakshatra finder — compute birth nakshatra + pada + rashi from DOB + time.
// Uses a simplified Meeus-style moon longitude computation (main perturbation
// terms only) — accurate to within ~0.3°. Since each nakshatra spans 13°20'
// (13.333°) and each pada 3°20' (3.333°), this precision is fully sufficient
// for namakaran and basic kundli purposes.
//
// For ceremonial precision (muhurat-grade), users should still verify with
// a pandit who runs full Drik panchang ephemeris.
//
// Source: Jean Meeus "Astronomical Algorithms" Ch 47, abridged.

import { NAKSHATRAS, type Nakshatra } from './nakshatras';

export type NakshatraFinderInput = {
 dob: string;        // YYYY-MM-DD
 time: string;       // HH:MM (24h, local)
 timezoneOffset: number; // hours, e.g. 5.5 for IST
};

export type NakshatraFinderResult = {
 input: NakshatraFinderInput;
 julianDay: number;
 moonTropicalLongitude: number;   // degrees [0,360)
 moonSiderealLongitude: number;   // degrees [0,360), after Lahiri ayanamsa
 ayanamsa: number;                // degrees
 nakshatra: Nakshatra;
 nakshatraIndex: number;          // 0-26
 pada: 1 | 2 | 3 | 4;
 padaLongitude: number;           // position within the nakshatra (0-13.33)
 rashi: string;                   // 12 zodiac signs
 rashiIndex: number;              // 0-11
};

const RASHIS = [
 'Mesha (Aries)',
 'Vrishabha (Taurus)',
 'Mithuna (Gemini)',
 'Karka (Cancer)',
 'Simha (Leo)',
 'Kanya (Virgo)',
 'Tula (Libra)',
 'Vrischika (Scorpio)',
 'Dhanu (Sagittarius)',
 'Makara (Capricorn)',
 'Kumbha (Aquarius)',
 'Meena (Pisces)',
];

const NAK_SIZE = 360 / 27;   // 13.333333...
const PADA_SIZE = NAK_SIZE / 4; // 3.333333...

const DEG_TO_RAD = Math.PI / 180;

function norm360(deg: number): number {
 const r = deg % 360;
 return r < 0 ? r + 360 : r;
}

// Julian Day from UTC date + time. Algorithm: Meeus ch 7.
function julianDay(year: number, month: number, day: number, hourUtc: number): number {
 let y = year;
 let m = month;
 if (m <= 2) {
  y -= 1;
  m += 12;
 }
 const a = Math.floor(y / 100);
 const b = 2 - a + Math.floor(a / 4);
 const jd =
  Math.floor(365.25 * (y + 4716)) +
  Math.floor(30.6001 * (m + 1)) +
  day + b - 1524.5 + hourUtc / 24;
 return jd;
}

// Lahiri ayanamsa — simplified linear fit, accurate ±0.01° over 2000-2050.
// Value at J2000.0 = 23.853° (per Indian Ephemeris).
// Precession rate ≈ 50.27"/year = 0.013963°/year.
function lahiriAyanamsa(jd: number): number {
 const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
 return 23.853 + 0.013963 * yearsFromJ2000;
}

// Moon longitude (tropical) — Meeus simplified.
// Main term + top 10 perturbations. Accuracy: ~0.3° throughout 1900-2100.
function moonTropicalLongitude(jd: number): number {
 const d = jd - 2451545.0; // days from J2000.0

 // Mean longitude of Moon
 const Lp = 218.3164591 + 13.17639648 * d;

 // Mean elongation Moon-Sun
 const D = 297.8502042 + 12.19074912 * d;

 // Sun's mean anomaly
 const M = 357.5291092 + 0.98560028 * d;

 // Moon's mean anomaly
 const Mp = 134.9634114 + 13.06499295 * d;

 // Moon's argument of latitude — not needed for ecliptic longitude

 const D_r = D * DEG_TO_RAD;
 const M_r = M * DEG_TO_RAD;
 const Mp_r = Mp * DEG_TO_RAD;

 // Perturbation series (top 11 terms, in degrees)
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

 const nak = NAKSHATRAS[nakIdx];
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
  rashi: RASHIS[rashiIdx] ?? RASHIS[0]!,
  rashiIndex: rashiIdx,
 };
}

function daysInMonth(year: number, month: number): number {
 if (month === 2) {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? 29 : 28;
 }
 if ([4, 6, 9, 11].includes(month)) return 30;
 return 31;
}

// Common timezone offsets for the dropdown.
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
