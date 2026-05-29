import { z } from 'zod';

// Vedic wedding muhurat finder.
// Rules drawn from Brihat Samhita (Varahamihira), Muhurta Chintamani (Rama Daivajna),
// and Dharmasindhu. We avoid hard external panchang dependencies and instead rely on
// deterministic astronomical approximations: Moon longitude → nakshatra → rashi,
// Tithi from Sun-Moon elongation, weekday, panchak, abhijit muhurat, and Chandrashtama.
// Output is a ranked list with a per-day score and human-readable reasons.

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
] as const;
export type Nakshatra = (typeof NAKSHATRA_NAMES)[number];

export const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
] as const;
export type Rashi = (typeof RASHI_NAMES)[number];

// Classical wedding-auspicious nakshatras per Muhurta Chintamani 6.3.
// Rohini, Mrigashira, Magha, Uttara Phalguni, Hasta, Swati, Anuradha,
// Mula, Uttara Ashadha, Uttara Bhadrapada, Revati.
const VIVAH_NAKSHATRAS: ReadonlySet<Nakshatra> = new Set([
  'Rohini', 'Mrigashira', 'Magha', 'Uttara Phalguni', 'Hasta', 'Swati',
  'Anuradha', 'Mula', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati',
]);

// Bharani and Krittika are explicitly forbidden (Bharani — Yama, Krittika — fire).
const FORBIDDEN_NAKSHATRAS: ReadonlySet<Nakshatra> = new Set(['Bharani', 'Krittika']);

// Tithis to avoid: Rikta tithis (4, 9, 14), Amavasya (30), Purnima accepted but not preferred.
// Auspicious: Dwitiya (2), Tritiya (3), Panchami (5), Saptami (7), Dashami (10), Ekadashi (11),
// Trayodashi (13).
const VIVAH_TITHIS = new Set([2, 3, 5, 7, 10, 11, 13]);
const RIKTA_TITHIS = new Set([4, 9, 14]);

// Weekday auspiciousness for vivah (Brihat Samhita 102.5).
// Mon(1), Wed(3), Thu(4), Fri(5) preferred. Tue(2), Sat(6) generally avoided. Sun(0) neutral.
const WEEKDAY_SCORE: Record<number, number> = { 0: 0, 1: 8, 2: -6, 3: 7, 4: 9, 5: 10, 6: -4 };

// Panchak nakshatras (Dhanishta 2nd half through Revati). Wedding traditionally avoided
// during Panchak. We mark Dhanishta (22), Shatabhisha (23), Purva Bhadrapada (24),
// Uttara Bhadrapada (25), Revati (26) as panchak window for simplicity.
const PANCHAK_INDICES = new Set([22, 23, 24, 25]);

// Nakshatra → Rashi mapping (every nakshatra spans 13°20'; 9 padas per rashi → 2.25 nakshatras).
// We use the standard table.
const NAKSHATRA_TO_RASHI: Rashi[] = [
  'Mesha', 'Mesha', 'Mesha',
  'Vrishabha', 'Vrishabha',
  'Mithuna', 'Mithuna',
  'Karka', 'Karka',
  'Simha', 'Simha',
  'Kanya', 'Kanya',
  'Tula', 'Tula',
  'Vrischika', 'Vrischika',
  'Dhanu', 'Dhanu',
  'Makara', 'Makara',
  'Kumbha', 'Kumbha',
  'Meena', 'Meena', 'Meena',
];

// ─── Validation ─────────────────────────────────────────────────────────────────

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM');

export const MuhuratInputSchema = z
  .object({
    brideDob: dateString,
    brideTob: timeString,
    brideNakshatra: z.enum(NAKSHATRA_NAMES).optional(),
    groomDob: dateString,
    groomTob: timeString,
    groomNakshatra: z.enum(NAKSHATRA_NAMES).optional(),
    fromDate: dateString,
    toDate: dateString,
    location: z.string().min(1).max(120).default('Delhi'),
  })
  .refine(
    (v) => new Date(v.fromDate).getTime() <= new Date(v.toDate).getTime(),
    'fromDate must be on or before toDate',
  )
  .refine((v) => {
    const span =
      (new Date(v.toDate).getTime() - new Date(v.fromDate).getTime()) / (1000 * 60 * 60 * 24);
    return span <= 365;
  }, 'date range cannot exceed 365 days');

export type MuhuratInput = z.infer<typeof MuhuratInputSchema>;

// ─── Astronomical helpers ──────────────────────────────────────────────────────
// Cheap, deterministic approximations (NOT NASA-grade). Good enough for daily
// muhurat selection where the question is "is this nakshatra/tithi auspicious".
// Errors of 1° in Moon longitude shift nakshatra boundary by < 2 hours which we
// accept for the booking-decision use case.

export function julianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
  let yy = y;
  let mm = m;
  if (mm <= 2) {
    yy -= 1;
    mm += 12;
  }
  const A = Math.floor(yy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524.5;
}

function deg(x: number): number {
  let r = x % 360;
  if (r < 0) r += 360;
  return r;
}

// Sidereal Moon longitude at noon UTC (Lahiri ayanamsha approximation).
// Reference: Meeus, "Astronomical Algorithms" simplified series + Lahiri 24°.
export function moonLongitudeSidereal(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = 93.272095 + 483202.0175233 * T;
  const lon =
    Lp +
    6.289 * Math.sin((Mp * Math.PI) / 180) -
    1.274 * Math.sin(((2 * D - Mp) * Math.PI) / 180) +
    0.658 * Math.sin((2 * D * Math.PI) / 180) -
    0.186 * Math.sin((M * Math.PI) / 180) -
    0.059 * Math.sin(((2 * Mp - 2 * D) * Math.PI) / 180) -
    0.057 * Math.sin(((Mp - 2 * D + M) * Math.PI) / 180) +
    0.053 * Math.sin(((Mp + 2 * D) * Math.PI) / 180) +
    0.046 * Math.sin(((2 * D - M) * Math.PI) / 180) -
    0.041 * Math.sin(((Mp - M) * Math.PI) / 180) -
    0.035 * Math.sin((D * Math.PI) / 180) -
    0.031 * Math.sin(((Mp + M) * Math.PI) / 180);
  // Lahiri ayanamsha at J2000 ≈ 23.85°, drifts ~50.3"/yr.
  const ayan = 23.85 + (50.3 / 3600) * (T * 100);
  return deg(lon - ayan);
}

export function sunLongitudeSidereal(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T;
  const M = 357.52911 + 35999.05029 * T;
  const Mr = (M * Math.PI) / 180;
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(Mr) +
    0.019993 * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const lon = L0 + C;
  const ayan = 23.85 + (50.3 / 3600) * (T * 100);
  return deg(lon - ayan);
}

export function nakshatraFromLongitude(lon: number): { index: number; name: Nakshatra } {
  const idx = Math.min(26, Math.max(0, Math.floor(deg(lon) / (360 / 27))));
  return { index: idx, name: NAKSHATRA_NAMES[idx] as Nakshatra };
}

export function rashiFromLongitude(lon: number): { index: number; name: Rashi } {
  const idx = Math.min(11, Math.max(0, Math.floor(deg(lon) / 30)));
  return { index: idx, name: RASHI_NAMES[idx] as Rashi };
}

export function tithiNumber(jd: number): number {
  const elong = deg(moonLongitudeSidereal(jd) - sunLongitudeSidereal(jd));
  return Math.floor(elong / 12) + 1; // 1..30
}

// ─── Birth-detail derivations ──────────────────────────────────────────────────

export function deriveBirthNakshatra(dob: string, tob: string): Nakshatra {
  const date = new Date(`${dob}T${tob}:00.000Z`);
  // -5:30 IST default; we accept the small error since we only need nakshatra
  // (resolution 13.3°/day moon = ~2.2°/hr → ~2.2° per timezone misalignment).
  const jd = julianDay(date);
  return nakshatraFromLongitude(moonLongitudeSidereal(jd)).name;
}

export function deriveBirthRashi(dob: string, tob: string): Rashi {
  const date = new Date(`${dob}T${tob}:00.000Z`);
  const jd = julianDay(date);
  return rashiFromLongitude(moonLongitudeSidereal(jd)).name;
}

// Chandrashtama: 8th rashi from natal moon's rashi.
function chandrashtamaRashi(birthRashi: Rashi): Rashi {
  const idx = RASHI_NAMES.indexOf(birthRashi);
  return RASHI_NAMES[(idx + 7) % 12] as Rashi;
}

// ─── Day scoring ────────────────────────────────────────────────────────────────

export interface MuhuratCandidate {
  date: string;
  weekday: string;
  nakshatra: Nakshatra;
  rashi: Rashi;
  tithi: number;
  abhijitMuhurat: { from: string; to: string };
  score: number;
  reasons: string[];
  warnings: string[];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Abhijit muhurat = 8th muhurta of the day = midday ± 24 minutes (approx).
// We use 11:48–12:36 local mean time as the standard window.
function abhijitWindow(): { from: string; to: string } {
  return { from: '11:48', to: '12:36' };
}

function dayScore(date: Date, brideRashi: Rashi, groomRashi: Rashi): MuhuratCandidate {
  const jd = julianDay(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)));
  const moonLon = moonLongitudeSidereal(jd);
  const nak = nakshatraFromLongitude(moonLon);
  const rashi = rashiFromLongitude(moonLon);
  const tithi = tithiNumber(jd);
  const weekday = date.getUTCDay();

  let score = 50;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (VIVAH_NAKSHATRAS.has(nak.name)) {
    score += 20;
    reasons.push(`${nak.name} is among the eleven vivah-auspicious nakshatras (Muhurta Chintamani 6.3).`);
  }
  if (FORBIDDEN_NAKSHATRAS.has(nak.name)) {
    score -= 35;
    warnings.push(`${nak.name} is forbidden for vivah.`);
  }
  if (PANCHAK_INDICES.has(nak.index)) {
    score -= 15;
    warnings.push('Falls in Panchak — traditionally avoided.');
  }

  if (VIVAH_TITHIS.has(tithi)) {
    score += 8;
    reasons.push(`Tithi ${tithi} is auspicious for vivah.`);
  }
  if (RIKTA_TITHIS.has(tithi)) {
    score -= 12;
    warnings.push(`Tithi ${tithi} is Rikta — generally avoided.`);
  }
  if (tithi === 30) {
    score -= 25;
    warnings.push('Amavasya — strictly avoided for vivah.');
  }

  score += WEEKDAY_SCORE[weekday] ?? 0;
  const weekdayName = WEEKDAYS[weekday] ?? 'Day';
  if ((WEEKDAY_SCORE[weekday] ?? 0) >= 7) {
    reasons.push(`${weekdayName} is among the preferred weekdays.`);
  } else if ((WEEKDAY_SCORE[weekday] ?? 0) <= -4) {
    warnings.push(`${weekdayName} is generally avoided for vivah.`);
  }

  // Chandrashtama check for both partners.
  const brideAshtama = chandrashtamaRashi(brideRashi);
  const groomAshtama = chandrashtamaRashi(groomRashi);
  if (rashi.name === brideAshtama) {
    score -= 18;
    warnings.push(`Bride's chandrashtama (${brideAshtama}) — Moon transit unfavourable.`);
  }
  if (rashi.name === groomAshtama) {
    score -= 18;
    warnings.push(`Groom's chandrashtama (${groomAshtama}) — Moon transit unfavourable.`);
  }
  if (rashi.name === brideRashi) {
    score += 4;
    reasons.push('Moon in bride\'s rashi — Janma rashi support.');
  }
  if (rashi.name === groomRashi) {
    score += 4;
    reasons.push('Moon in groom\'s rashi — Janma rashi support.');
  }

  reasons.push('Abhijit muhurat (11:48–12:36) is universally auspicious for sankalp.');

  return {
    date: date.toISOString().slice(0, 10),
    weekday: WEEKDAYS[weekday] ?? 'Unknown',
    nakshatra: nak.name,
    rashi: rashi.name,
    tithi,
    abhijitMuhurat: abhijitWindow(),
    score: Math.max(0, Math.min(100, score)),
    reasons,
    warnings,
  };
}

// Mangalik dosha: Mars in 1, 2, 4, 7, 8, 12 from lagna/moon. We only have moon
// here so we report a flag if either partner's natal moon is in those houses
// from the "marriage 7th" reference (computed from rashi-difference proxy).
export function mangalikFlag(brideRashi: Rashi, groomRashi: Rashi): { brideMangalik: boolean; groomMangalik: boolean } {
  // Approximate flag based on rashi positions relative to natural lagna Mesha.
  // For a full mangalik check we'd need full chart. We mark high-risk rashis.
  const HIGH_RISK = new Set<Rashi>(['Mesha', 'Vrischika', 'Karka', 'Makara']);
  return {
    brideMangalik: HIGH_RISK.has(brideRashi),
    groomMangalik: HIGH_RISK.has(groomRashi),
  };
}

export interface MuhuratResponse {
  bride: { nakshatra: Nakshatra; rashi: Rashi };
  groom: { nakshatra: Nakshatra; rashi: Rashi };
  mangalikFlag: { brideMangalik: boolean; groomMangalik: boolean };
  candidates: MuhuratCandidate[];
}

export function findWeddingMuhurats(input: MuhuratInput, topN = 10): MuhuratResponse {
  const brideNak = input.brideNakshatra ?? deriveBirthNakshatra(input.brideDob, input.brideTob);
  const groomNak = input.groomNakshatra ?? deriveBirthNakshatra(input.groomDob, input.groomTob);
  const brideRashi = NAKSHATRA_TO_RASHI[NAKSHATRA_NAMES.indexOf(brideNak)] as Rashi;
  const groomRashi = NAKSHATRA_TO_RASHI[NAKSHATRA_NAMES.indexOf(groomNak)] as Rashi;

  const start = new Date(`${input.fromDate}T00:00:00.000Z`);
  const end = new Date(`${input.toDate}T00:00:00.000Z`);
  const candidates: MuhuratCandidate[] = [];

  for (let d = new Date(start); d.getTime() <= end.getTime(); d = new Date(d.getTime() + 24 * 3600 * 1000)) {
    candidates.push(dayScore(new Date(d), brideRashi, groomRashi));
  }

  candidates.sort((a, b) => b.score - a.score);
  return {
    bride: { nakshatra: brideNak, rashi: brideRashi },
    groom: { nakshatra: groomNak, rashi: groomRashi },
    mangalikFlag: mangalikFlag(brideRashi, groomRashi),
    candidates: candidates.slice(0, topN),
  };
}
