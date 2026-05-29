// Daily / weekly / monthly horoscope per rashi using gochar (transit) of
// Moon, Sun, Mars, Jupiter, Venus, Saturn relative to natal Moon sign.
// Deterministic from (rashi, date) — no LLM, no API call, refreshes each
// day automatically via Next ISR.
//
// House-from-natal interpretations follow classical Vedic gochar:
//   Moon transit 1/3/6/7/10/11 = favourable; 4/8/12 = challenging; 2/5/9 = mixed
//   Sun transit 3/6/10/11 = good; 4/8/12 = stressful
//   Mars transit 3/6/11 = energising; 1/4/7/8/12 = friction
//   Jupiter transit 2/5/7/9/11 = expansive; 3/4/8/10/12 = restraint
//
// References: BPHS chapter on Gochar; Phaladeepika gochar tables.

import {
  toJulianDay,
  getLahiriAyanamsa,
  getSunLongitude,
  getMoonLongitude,
  getPlanetLongitude,
  tropicalToSidereal,
  getSignIndex,
} from './vedic-astrology';

const RASHI_ORDER = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

export type PeriodKind = 'today' | 'week' | 'month';

export interface DailyHoroscope {
  date: string;            // YYYY-MM-DD
  period: PeriodKind;
  rashi: string;
  prediction: string;
  career: string;
  love: string;
  health: string;
  finance: string;
  luckyNumber: number;
  luckyColor: string;
  rating: number;          // 1-5
  transits: {
    moonHouse: number;
    sunHouse: number;
    marsHouse: number;
    jupiterHouse: number;
    venusHouse: number;
    saturnHouse: number;
  };
  nakshatra: string;       // today's moon nakshatra
  tithi: string;           // synodic moon-sun arc / 12 → tithi name
}

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana',
  'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada',
  'Revati',
];

const TITHI_NAMES = [
  'Pratipada (Shukla)', 'Dwitiya (Shukla)', 'Tritiya (Shukla)',
  'Chaturthi (Shukla)', 'Panchami (Shukla)', 'Shashthi (Shukla)',
  'Saptami (Shukla)', 'Ashtami (Shukla)', 'Navami (Shukla)',
  'Dashami (Shukla)', 'Ekadashi (Shukla)', 'Dwadashi (Shukla)',
  'Trayodashi (Shukla)', 'Chaturdashi (Shukla)', 'Purnima',
  'Pratipada (Krishna)', 'Dwitiya (Krishna)', 'Tritiya (Krishna)',
  'Chaturthi (Krishna)', 'Panchami (Krishna)', 'Shashthi (Krishna)',
  'Saptami (Krishna)', 'Ashtami (Krishna)', 'Navami (Krishna)',
  'Dashami (Krishna)', 'Ekadashi (Krishna)', 'Dwadashi (Krishna)',
  'Trayodashi (Krishna)', 'Chaturdashi (Krishna)', 'Amavasya',
];

// Sunday=0..Saturday=6 → deity tone + lucky colour
const DOW_DEITY = ['Surya', 'Chandra', 'Mangal', 'Budh', 'Brihaspati', 'Shukra', 'Shani'];
const DOW_COLOR = ['Orange', 'White', 'Red', 'Green', 'Yellow', 'Pink', 'Blue'];

function rashiIndex(rashi: string): number {
  const idx = RASHI_ORDER.indexOf(rashi.toLowerCase());
  return idx >= 0 ? idx : 0;
}

function houseFromNatal(transitRashi: number, natalIdx: number): number {
  return ((transitRashi - natalIdx + 12) % 12) + 1;
}

function midUtJdForDate(date: Date): number {
  // Use 12:00 IST (06:30 UT) of the target date — standard panchang reference.
  return toJulianDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 6.5 / 24);
}

function moonNakshatra(jd: number): string {
  const ayan = getLahiriAyanamsa(jd);
  const moonSid = tropicalToSidereal(getMoonLongitude(jd), ayan);
  const idx = Math.floor(moonSid / (360 / 27)) % 27;
  return NAKSHATRA_NAMES[idx]!;
}

function todayTithi(jd: number): string {
  const sun = getSunLongitude(jd);
  let arc = getMoonLongitude(jd) - sun;
  while (arc < 0) arc += 360;
  while (arc >= 360) arc -= 360;
  const idx = Math.floor(arc / 12) % 30;
  return TITHI_NAMES[idx]!;
}

interface Transits {
  moonHouse: number;
  sunHouse: number;
  marsHouse: number;
  jupiterHouse: number;
  venusHouse: number;
  saturnHouse: number;
  mercuryHouse: number;
}

function computeTransits(jd: number, natalIdx: number): Transits {
  const ayan = getLahiriAyanamsa(jd);
  const sid = (long: number) => tropicalToSidereal(long, ayan);
  const moon = getSignIndex(sid(getMoonLongitude(jd)));
  const sun = getSignIndex(sid(getSunLongitude(jd)));
  const mars = getSignIndex(sid(getPlanetLongitude('Mars', jd)));
  const jup = getSignIndex(sid(getPlanetLongitude('Jupiter', jd)));
  const ven = getSignIndex(sid(getPlanetLongitude('Venus', jd)));
  const sat = getSignIndex(sid(getPlanetLongitude('Saturn', jd)));
  const mer = getSignIndex(sid(getPlanetLongitude('Mercury', jd)));
  return {
    moonHouse: houseFromNatal(moon, natalIdx),
    sunHouse: houseFromNatal(sun, natalIdx),
    marsHouse: houseFromNatal(mars, natalIdx),
    jupiterHouse: houseFromNatal(jup, natalIdx),
    venusHouse: houseFromNatal(ven, natalIdx),
    saturnHouse: houseFromNatal(sat, natalIdx),
    mercuryHouse: houseFromNatal(mer, natalIdx),
  };
}

// Gochar quality maps — 1 to +2 (very favourable) … −2 (challenging)
const MOON_GOCHAR: Record<number, number> = {
  1: 1, 2: 0, 3: 2, 4: -1, 5: 0, 6: 1, 7: 1, 8: -2, 9: 0, 10: 2, 11: 2, 12: -1,
};
const SUN_GOCHAR: Record<number, number> = {
  1: -1, 2: -1, 3: 2, 4: -1, 5: 0, 6: 2, 7: -1, 8: -2, 9: 0, 10: 2, 11: 2, 12: -2,
};
const MARS_GOCHAR: Record<number, number> = {
  1: -2, 2: -1, 3: 2, 4: -1, 5: 0, 6: 2, 7: -2, 8: -2, 9: 0, 10: 1, 11: 2, 12: -1,
};
const JUP_GOCHAR: Record<number, number> = {
  1: 0, 2: 2, 3: -1, 4: -1, 5: 2, 6: -1, 7: 2, 8: -1, 9: 2, 10: -1, 11: 2, 12: -1,
};
const VEN_GOCHAR: Record<number, number> = {
  1: 1, 2: 1, 3: 0, 4: 2, 5: 1, 6: 0, 7: 2, 8: 1, 9: 1, 10: 0, 11: 2, 12: 1,
};
const SAT_GOCHAR: Record<number, number> = {
  1: -1, 2: -2, 3: 2, 4: -2, 5: -1, 6: 2, 7: 0, 8: -2, 9: -1, 10: 0, 11: 2, 12: -2,
};

function houseScore(t: Transits): number {
  return (
    MOON_GOCHAR[t.moonHouse]! * 1.5 +
    SUN_GOCHAR[t.sunHouse]! +
    MARS_GOCHAR[t.marsHouse]! +
    JUP_GOCHAR[t.jupiterHouse]! * 1.2 +
    VEN_GOCHAR[t.venusHouse]! * 0.8 +
    SAT_GOCHAR[t.saturnHouse]! * 0.8
  );
}

function scoreToRating(s: number): number {
  if (s >= 4) return 5;
  if (s >= 2) return 4;
  if (s >= 0) return 3;
  if (s >= -2) return 2;
  return 1;
}

const CAREER_BY_HOUSE: Record<number, string> = {
  1: 'A day to lead — visibility on a key initiative. Speak up.',
  2: 'Income flows favourably; review pending receivables today.',
  3: 'Courage to ask for what you want pays off. Cold outreach succeeds.',
  4: 'Focus on home-base work — admin, infrastructure, real estate matters.',
  5: 'Creative output peaks. Ship the idea you have been sitting on.',
  6: 'Routine tasks resolve quickly; competitors slip — capitalise.',
  7: 'Partnership or client conversation moves forward. Negotiate firmly.',
  8: 'Avoid risky bets; tie up paperwork and audits instead.',
  9: 'Strategic direction clarifies — long-term moves are favoured.',
  10: 'Public recognition possible. Senior gives you the nod.',
  11: 'Network pays off — old contacts bring fresh openings.',
  12: 'Wind down loose ends; foreign or remote work emphasised.',
};

const LOVE_BY_VENUS: Record<number, string> = {
  1: 'Magnetism is high. Singles attract attention naturally.',
  2: 'Quality time with family deepens bonds.',
  3: 'Light flirtation and easy banter — keep it playful.',
  4: 'Domestic warmth — cook together, share a quiet meal.',
  5: 'Romance peaks. Plan an evening to remember.',
  6: 'Resolve a small misunderstanding before it grows.',
  7: 'Partner-focus is favourable — clear, honest dialogue.',
  8: 'Intimacy deepens; emotional vulnerability rewarded.',
  9: 'Travel or shared aspirations strengthen the bond.',
  10: 'Status-aligned partnership themes surface.',
  11: 'Friend-circle introductions may spark something.',
  12: 'Private, reflective togetherness over public displays.',
};

const HEALTH_BY_MARS_SAT: Record<number, string> = {
  1: 'Energy is solid — start that exercise routine.',
  4: 'Pace yourself; rest matters more than effort.',
  6: 'Minor ailments clear quickly; immunity favourable.',
  7: 'Avoid confrontation — stress affects digestion.',
  8: 'Be cautious — avoid risky activity, get adequate sleep.',
  10: 'Maintain discipline; small habits compound.',
  11: 'Social activity supports wellbeing.',
  12: 'Restorative practices — yoga, oil massage, early bed.',
};

const FINANCE_BY_JUP: Record<number, string> = {
  2: 'Excellent for new investments and savings.',
  5: 'Returns on past investments materialise.',
  7: 'Joint ventures and partnership finances flow.',
  9: 'Long-term wealth-building decisions are favoured.',
  11: 'Income channels expand; gains exceed expectations.',
  3: 'Conservative spending; save for the next big push.',
  4: 'Property and home expenses dominate.',
  8: 'Pay outstanding bills; avoid speculative bets.',
  10: 'Authority signs off on a financial proposal.',
  12: 'Foreign expenses or charitable giving emphasised.',
  1: 'Self-investment — courses, tools, health.',
  6: 'Debt-clearance day; chase outstanding payments.',
};

function pickPrediction(t: Transits, rating: number): string {
  const moonPhrase = MOON_GOCHAR[t.moonHouse]! >= 1
    ? 'Emotional clarity is strong'
    : MOON_GOCHAR[t.moonHouse]! <= -1
    ? 'Mood may feel unsettled in the morning'
    : 'Mood is steady';
  const jupPhrase = JUP_GOCHAR[t.jupiterHouse]! >= 1
    ? 'Jupiter\'s grace supports growth'
    : 'Jupiter asks patience';
  const tone = rating >= 4
    ? 'Overall a strongly auspicious day — act with confidence.'
    : rating >= 3
    ? 'A balanced day — modest gains with steady effort.'
    : rating >= 2
    ? 'A mixed day — choose battles carefully.'
    : 'A demanding day — prioritise rest and reflection.';
  return `${moonPhrase}. ${jupPhrase}. ${tone}`;
}

function luckyNumberFor(rashi: string, date: Date): number {
  // Deterministic — natal rashi index × DOY mod 9 + 1
  const natalIdx = rashiIndex(rashi);
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  const doy = Math.floor(diff / 86400000);
  return ((natalIdx * 7 + doy * 3) % 9) + 1;
}

export function getDailyHoroscope(rashi: string, date: Date): DailyHoroscope {
  const natalIdx = rashiIndex(rashi);
  const jd = midUtJdForDate(date);
  const t = computeTransits(jd, natalIdx);
  const score = houseScore(t);
  const rating = scoreToRating(score);
  const dow = date.getUTCDay();

  return {
    date: date.toISOString().slice(0, 10),
    period: 'today',
    rashi,
    prediction: pickPrediction(t, rating),
    career: CAREER_BY_HOUSE[t.sunHouse] ?? CAREER_BY_HOUSE[10]!,
    love: LOVE_BY_VENUS[t.venusHouse] ?? LOVE_BY_VENUS[7]!,
    health: HEALTH_BY_MARS_SAT[t.marsHouse]
      ?? HEALTH_BY_MARS_SAT[t.saturnHouse]
      ?? 'Balanced wellbeing — maintain your usual rhythm.',
    finance: FINANCE_BY_JUP[t.jupiterHouse] ?? FINANCE_BY_JUP[2]!,
    luckyNumber: luckyNumberFor(rashi, date),
    luckyColor: DOW_COLOR[dow]!,
    rating,
    transits: {
      moonHouse: t.moonHouse,
      sunHouse: t.sunHouse,
      marsHouse: t.marsHouse,
      jupiterHouse: t.jupiterHouse,
      venusHouse: t.venusHouse,
      saturnHouse: t.saturnHouse,
    },
    nakshatra: moonNakshatra(jd),
    tithi: todayTithi(jd),
  };
}

// Aggregate a week (or month) by averaging the daily score and re-picking
// the dominant tone. Lucky number = first day's. Returns the same shape
// with `period` set + `prediction` widened.
export function getPeriodHoroscope(
  rashi: string,
  startDate: Date,
  period: PeriodKind,
): DailyHoroscope {
  if (period === 'today') return getDailyHoroscope(rashi, startDate);

  const days = period === 'week' ? 7 : 30;
  const all: DailyHoroscope[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    all.push(getDailyHoroscope(rashi, d));
  }
  const avgRating = Math.round(all.reduce((s, h) => s + h.rating, 0) / all.length);
  const first = all[0]!;
  const periodLabel = period === 'week' ? 'this week' : 'this month';
  const intro = avgRating >= 4
    ? `Overall a strong ${periodLabel} — momentum builds. `
    : avgRating >= 3
    ? `A balanced ${periodLabel} — steady forward motion. `
    : avgRating >= 2
    ? `A mixed ${periodLabel} — discernment matters. `
    : `A demanding ${periodLabel} — prioritise recovery. `;
  const peak = all.reduce((best, h) => (h.rating > best.rating ? h : best), all[0]!);
  const dip = all.reduce((worst, h) => (h.rating < worst.rating ? h : worst), all[0]!);
  const peakStr = peak.date === dip.date
    ? ''
    : `Highlight day: ${peak.date} (${peak.rating}/5). Watch-day: ${dip.date} (${dip.rating}/5). `;

  return {
    ...first,
    period,
    prediction: intro + peakStr + first.prediction,
    rating: avgRating,
  };
}
