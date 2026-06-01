// Lightweight Vedic chart context for AI Astrologer chat — no LLM, no external API.
// Computes Moon rashi, nakshatra, Lagna, current Vimshottari Mahadasha + dosha flags
// from user-supplied birth details. Falls back to Delhi coords when only city name given.

import { buildVedicChart, type VedicChart } from './jyotish.js';

const RASHIS = [
  { english: 'Aries', sanskrit: 'Mesha', hindi: 'मेष', lord: 'Mars', element: 'Fire' },
  { english: 'Taurus', sanskrit: 'Vrishabha', hindi: 'वृषभ', lord: 'Venus', element: 'Earth' },
  { english: 'Gemini', sanskrit: 'Mithuna', hindi: 'मिथुन', lord: 'Mercury', element: 'Air' },
  { english: 'Cancer', sanskrit: 'Karka', hindi: 'कर्क', lord: 'Moon', element: 'Water' },
  { english: 'Leo', sanskrit: 'Simha', hindi: 'सिंह', lord: 'Sun', element: 'Fire' },
  { english: 'Virgo', sanskrit: 'Kanya', hindi: 'कन्या', lord: 'Mercury', element: 'Earth' },
  { english: 'Libra', sanskrit: 'Tula', hindi: 'तुला', lord: 'Venus', element: 'Air' },
  { english: 'Scorpio', sanskrit: 'Vrischika', hindi: 'वृश्चिक', lord: 'Mars', element: 'Water' },
  { english: 'Sagittarius', sanskrit: 'Dhanu', hindi: 'धनु', lord: 'Jupiter', element: 'Fire' },
  { english: 'Capricorn', sanskrit: 'Makara', hindi: 'मकर', lord: 'Saturn', element: 'Earth' },
  { english: 'Aquarius', sanskrit: 'Kumbha', hindi: 'कुम्भ', lord: 'Saturn', element: 'Air' },
  { english: 'Pisces', sanskrit: 'Meena', hindi: 'मीन', lord: 'Jupiter', element: 'Water' },
] as const;

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
] as const;

const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'] as const;

// City → approx coords. Falls back to Delhi when unknown.
const CITY_COORDS: Record<string, { lat: number; lon: number; tzOffsetMin: number }> = {
  delhi: { lat: 28.6139, lon: 77.209, tzOffsetMin: 330 },
  mumbai: { lat: 19.076, lon: 72.8777, tzOffsetMin: 330 },
  bombay: { lat: 19.076, lon: 72.8777, tzOffsetMin: 330 },
  kolkata: { lat: 22.5726, lon: 88.3639, tzOffsetMin: 330 },
  calcutta: { lat: 22.5726, lon: 88.3639, tzOffsetMin: 330 },
  chennai: { lat: 13.0827, lon: 80.2707, tzOffsetMin: 330 },
  madras: { lat: 13.0827, lon: 80.2707, tzOffsetMin: 330 },
  bengaluru: { lat: 12.9716, lon: 77.5946, tzOffsetMin: 330 },
  bangalore: { lat: 12.9716, lon: 77.5946, tzOffsetMin: 330 },
  hyderabad: { lat: 17.385, lon: 78.4867, tzOffsetMin: 330 },
  pune: { lat: 18.5204, lon: 73.8567, tzOffsetMin: 330 },
  ahmedabad: { lat: 23.0225, lon: 72.5714, tzOffsetMin: 330 },
  jaipur: { lat: 26.9124, lon: 75.7873, tzOffsetMin: 330 },
  varanasi: { lat: 25.3176, lon: 82.9739, tzOffsetMin: 330 },
  lucknow: { lat: 26.8467, lon: 80.9462, tzOffsetMin: 330 },
  kanpur: { lat: 26.4499, lon: 80.3319, tzOffsetMin: 330 },
  nagpur: { lat: 21.1458, lon: 79.0882, tzOffsetMin: 330 },
  indore: { lat: 22.7196, lon: 75.8577, tzOffsetMin: 330 },
  bhopal: { lat: 23.2599, lon: 77.4126, tzOffsetMin: 330 },
  patna: { lat: 25.5941, lon: 85.1376, tzOffsetMin: 330 },
  surat: { lat: 21.1702, lon: 72.8311, tzOffsetMin: 330 },
  vadodara: { lat: 22.3072, lon: 73.1812, tzOffsetMin: 330 },
  rajkot: { lat: 22.3039, lon: 70.8022, tzOffsetMin: 330 },
  chandigarh: { lat: 30.7333, lon: 76.7794, tzOffsetMin: 330 },
  amritsar: { lat: 31.634, lon: 74.8723, tzOffsetMin: 330 },
  ludhiana: { lat: 30.901, lon: 75.8573, tzOffsetMin: 330 },
  agra: { lat: 27.1767, lon: 78.0081, tzOffsetMin: 330 },
  vrindavan: { lat: 27.5806, lon: 77.7006, tzOffsetMin: 330 },
  haridwar: { lat: 29.9457, lon: 78.1642, tzOffsetMin: 330 },
  rishikesh: { lat: 30.0869, lon: 78.2676, tzOffsetMin: 330 },
  ujjain: { lat: 23.1765, lon: 75.7885, tzOffsetMin: 330 },
  ayodhya: { lat: 26.7922, lon: 82.1998, tzOffsetMin: 330 },
  tirupati: { lat: 13.6288, lon: 79.4192, tzOffsetMin: 330 },
  puri: { lat: 19.8135, lon: 85.8312, tzOffsetMin: 330 },
  dwarka: { lat: 22.2394, lon: 68.9678, tzOffsetMin: 330 },
  // NRI hubs (approx)
  'new york': { lat: 40.7128, lon: -74.006, tzOffsetMin: -300 },
  nyc: { lat: 40.7128, lon: -74.006, tzOffsetMin: -300 },
  london: { lat: 51.5074, lon: -0.1278, tzOffsetMin: 0 },
  toronto: { lat: 43.6532, lon: -79.3832, tzOffsetMin: -300 },
  sydney: { lat: -33.8688, lon: 151.2093, tzOffsetMin: 600 },
  dubai: { lat: 25.2048, lon: 55.2708, tzOffsetMin: 240 },
  singapore: { lat: 1.3521, lon: 103.8198, tzOffsetMin: 480 },
};

const PADA_SPAN = 360 / 27;

function rashiFromLong(siderealDeg: number) {
  const idx = Math.floor(((siderealDeg % 360) + 360) % 360 / 30) % 12;
  return { idx, ...RASHIS[idx]! };
}

function nakshatraFromLong(siderealDeg: number) {
  const n = ((siderealDeg % 360) + 360) % 360;
  const idx = Math.floor(n / PADA_SPAN) % 27;
  const within = n - idx * PADA_SPAN;
  const pada = Math.min(4, Math.floor(within / (PADA_SPAN / 4)) + 1);
  return { idx, name: NAKSHATRAS[idx]!, lord: NAKSHATRA_LORDS[idx]!, pada };
}

function buildCurrentMahadasha(moonLong: number, dob: Date, today: Date) {
  const nak = nakshatraFromLong(moonLong);
  const startLordIdx = DASHA_ORDER.indexOf(nak.lord as typeof DASHA_ORDER[number]);
  const within = moonLong - nak.idx * PADA_SPAN;
  const remainingFraction = 1 - within / PADA_SPAN;
  let cursor = new Date(dob);
  for (let i = 0; i < 9; i++) {
    const planet = DASHA_ORDER[(startLordIdx + i) % 9]!;
    const years = i === 0 ? DASHA_YEARS[planet]! * remainingFraction : DASHA_YEARS[planet]!;
    const end = new Date(cursor);
    end.setUTCDate(end.getUTCDate() + Math.round(years * 365.25));
    if (today >= cursor && today < end) {
      const totalDays = (end.getTime() - cursor.getTime()) / 86400000;
      const elapsedDays = (today.getTime() - cursor.getTime()) / 86400000;
      const elapsedYears = +(elapsedDays / 365.25).toFixed(2);
      const remainingYears = +((totalDays - elapsedDays) / 365.25).toFixed(2);
      return {
        planet,
        startDate: cursor.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        years: +years.toFixed(2),
        elapsedYears,
        remainingYears,
      };
    }
    cursor = end;
  }
  return null;
}

export interface VedicContext {
  hasFullChart: boolean;
  approximate: boolean;
  rashi: { english: string; sanskrit: string; hindi: string; lord: string; element: string };
  sunSign: { english: string; sanskrit: string };
  nakshatra: { name: string; lord: string; pada: number };
  lagna: { english: string; sanskrit: string; hindi: string };
  currentMahadasha: { planet: string; startDate: string; endDate: string; years: number; elapsedYears: number; remainingYears: number } | null;
  planets: Array<{ planet: string; sign: string; house: number }>;
  doshas: { manglik: boolean; sadeSati: 'none' | 'rising' | 'peak' | 'setting'; kemadruma: boolean };
  summary: string;
}

function placeToCoords(place?: string) {
  if (!place) return { lat: 28.6139, lon: 77.209, tzOffsetMin: 330, approximate: true };
  const key = place.toLowerCase().trim().split(',')[0]!.trim();
  const hit = CITY_COORDS[key];
  if (hit) return { ...hit, approximate: false };
  return { lat: 28.6139, lon: 77.209, tzOffsetMin: 330, approximate: true };
}

function detectSadeSati(moonRashiIdx: number, saturnRashiIdx: number): 'none' | 'rising' | 'peak' | 'setting' {
  const diff = ((saturnRashiIdx - moonRashiIdx) + 12) % 12;
  if (diff === 11) return 'rising';   // Saturn in 12th from Moon
  if (diff === 0) return 'peak';      // Saturn over Moon
  if (diff === 1) return 'setting';   // Saturn in 2nd from Moon
  return 'none';
}

function detectManglik(marsRashiIdx: number, moonRashiIdx: number, lagnaRashiIdx: number): boolean {
  // Mars in 1/4/7/8/12 from Lagna OR Moon → Manglik (traditional)
  const manglikHouses = new Set([0, 3, 6, 7, 11]); // 1,4,7,8,12 zero-indexed
  const fromLagna = ((marsRashiIdx - lagnaRashiIdx) + 12) % 12;
  const fromMoon = ((marsRashiIdx - moonRashiIdx) + 12) % 12;
  return manglikHouses.has(fromLagna) || manglikHouses.has(fromMoon);
}

function detectKemadruma(moonRashiIdx: number, planetsByRashi: Set<number>): boolean {
  // No planet (other than Moon, Sun, Rahu, Ketu) in 2nd or 12th from Moon → Kemadruma yoga
  const second = (moonRashiIdx + 1) % 12;
  const twelfth = (moonRashiIdx + 11) % 12;
  return !planetsByRashi.has(second) && !planetsByRashi.has(twelfth);
}

export function computeVedicContext(birthDetails: {
  name?: string;
  date?: string;
  time?: string;
  place?: string;
}): VedicContext | null {
  if (!birthDetails?.date || !/^\d{4}-\d{2}-\d{2}$/.test(birthDetails.date)) return null;
  const time = birthDetails.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(birthDetails.time)
    ? birthDetails.time
    : '12:00';
  const coords = placeToCoords(birthDetails.place);
  const [yyyy, mm, dd] = birthDetails.date.split('-').map(Number) as [number, number, number];
  const [hh, mi] = time.split(':').map(Number) as [number, number];
  // Birth local → UTC by subtracting tz offset
  const localMs = Date.UTC(yyyy, mm - 1, dd, hh, mi);
  const utc = new Date(localMs - coords.tzOffsetMin * 60_000);
  if (isNaN(utc.getTime()) || utc.getTime() > Date.now()) return null;

  let chart: VedicChart;
  try {
    chart = buildVedicChart(utc, coords.lat, coords.lon);
  } catch {
    return null;
  }

  const moon = chart.bodies.find((b) => b.planet === 'Moon')!;
  const sun = chart.bodies.find((b) => b.planet === 'Sun')!;
  const mars = chart.bodies.find((b) => b.planet === 'Mars')!;
  const saturn = chart.bodies.find((b) => b.planet === 'Saturn')!;
  const moonRashi = rashiFromLong(moon.longitude);
  const sunRashi = rashiFromLong(sun.longitude);
  const lagnaRashi = rashiFromLong(chart.lagna.longitude);
  const nak = nakshatraFromLong(moon.longitude);
  const currentMahadasha = buildCurrentMahadasha(moon.longitude, utc, new Date());

  const planetsByRashi = new Set(
    chart.bodies
      .filter((b) => !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(b.planet))
      .map((b) => b.rashiIndex),
  );

  const doshas = {
    manglik: detectManglik(mars.rashiIndex, moonRashi.idx, lagnaRashi.idx),
    sadeSati: detectSadeSati(moonRashi.idx, saturn.rashiIndex),
    kemadruma: detectKemadruma(moonRashi.idx, planetsByRashi),
  };

  const summaryParts: string[] = [
    `Moon Sign (Rashi): ${moonRashi.english} (${moonRashi.sanskrit}, ${moonRashi.hindi}), ruled by ${moonRashi.lord}, ${moonRashi.element} element`,
    `Sun Sign: ${sunRashi.english} (${sunRashi.sanskrit})`,
    `Lagna (Ascendant): ${lagnaRashi.english} (${lagnaRashi.sanskrit})${coords.approximate ? ' [approximate — exact place coords not on file]' : ''}`,
    `Nakshatra: ${nak.name} (pada ${nak.pada}), ruled by ${nak.lord}`,
  ];
  if (currentMahadasha) {
    summaryParts.push(`Current Vimshottari Mahadasha: ${currentMahadasha.planet} (${currentMahadasha.startDate} → ${currentMahadasha.endDate}), ${currentMahadasha.elapsedYears}y elapsed, ${currentMahadasha.remainingYears}y remaining`);
  }
  if (doshas.manglik) summaryParts.push('Manglik dosha present (Mars in 1/4/7/8/12 from Lagna or Moon) — relevant for marriage timing');
  if (doshas.sadeSati !== 'none') summaryParts.push(`Saturn Sade-Sati: ${doshas.sadeSati} phase active`);
  if (doshas.kemadruma) summaryParts.push('Kemadruma yoga present (no planet flanking Moon in 2nd/12th) — softens via friendly Jupiter aspects');

  return {
    hasFullChart: true,
    approximate: coords.approximate || !birthDetails.time,
    rashi: { english: moonRashi.english, sanskrit: moonRashi.sanskrit, hindi: moonRashi.hindi, lord: moonRashi.lord, element: moonRashi.element },
    sunSign: { english: sunRashi.english, sanskrit: sunRashi.sanskrit },
    nakshatra: { name: nak.name, lord: nak.lord, pada: nak.pada },
    lagna: { english: lagnaRashi.english, sanskrit: lagnaRashi.sanskrit, hindi: lagnaRashi.hindi },
    currentMahadasha,
    planets: chart.bodies.map((b) => ({ planet: b.planet, sign: RASHIS[b.rashiIndex]!.english, house: b.bhava })),
    doshas,
    summary: summaryParts.join('\n- '),
  };
}
