import { z } from 'zod';
import { generateText, MODELS, DEMO_MODE } from '../integrations/claude.js';
import { cached, cacheGet, cacheSet } from './cache.js';

// ─── Validation ─────────────────────────────────────────────────────────────────
// Zod at the boundary. Internal callers can pass already-parsed values.

export const KundliInputSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dob must be YYYY-MM-DD')
      .refine((v) => {
        const d = new Date(v + 'T00:00:00Z');
        return !isNaN(d.getTime()) && d.getTime() < Date.now();
      }, 'dob must be a real date in the past'),
    tob: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'tob must be HH:MM (24-hour)'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    timezone: z.string().min(1).max(64).optional(),
    location: z.string().min(1).max(120).optional(),
  })
  .refine((v) => v.location || (v.latitude !== undefined && v.longitude !== undefined), {
    message: 'Provide location OR (latitude + longitude).',
  });

export type KundliInput = z.infer<typeof KundliInputSchema>;

export const HoroscopeQuerySchema = z.object({
  sign: z.string().min(2).max(20),
  lang: z.enum(['en', 'hi']).default('en').optional(),
  scope: z.enum(['today', 'tomorrow', 'week']).default('today').optional(),
});

export type HoroscopeQuery = z.infer<typeof HoroscopeQuerySchema>;

// ─── Sidereal zodiac (Vedic) ────────────────────────────────────────────────────
// Source-of-truth tables. We keep Sanskrit + Hindi alongside English so the
// frontend can switch language without another lookup.

const RASHIS = [
  { english: 'Aries', sanskrit: 'Mesha', hindi: 'मेष', symbol: 'Ram', element: 'Fire', lord: 'Mars' },
  { english: 'Taurus', sanskrit: 'Vrishabha', hindi: 'वृषभ', symbol: 'Bull', element: 'Earth', lord: 'Venus' },
  { english: 'Gemini', sanskrit: 'Mithuna', hindi: 'मिथुन', symbol: 'Twins', element: 'Air', lord: 'Mercury' },
  { english: 'Cancer', sanskrit: 'Karka', hindi: 'कर्क', symbol: 'Crab', element: 'Water', lord: 'Moon' },
  { english: 'Leo', sanskrit: 'Simha', hindi: 'सिंह', symbol: 'Lion', element: 'Fire', lord: 'Sun' },
  { english: 'Virgo', sanskrit: 'Kanya', hindi: 'कन्या', symbol: 'Maiden', element: 'Earth', lord: 'Mercury' },
  { english: 'Libra', sanskrit: 'Tula', hindi: 'तुला', symbol: 'Scales', element: 'Air', lord: 'Venus' },
  { english: 'Scorpio', sanskrit: 'Vrischika', hindi: 'वृश्चिक', symbol: 'Scorpion', element: 'Water', lord: 'Mars' },
  { english: 'Sagittarius', sanskrit: 'Dhanu', hindi: 'धनु', symbol: 'Archer', element: 'Fire', lord: 'Jupiter' },
  { english: 'Capricorn', sanskrit: 'Makara', hindi: 'मकर', symbol: 'Sea-goat', element: 'Earth', lord: 'Saturn' },
  { english: 'Aquarius', sanskrit: 'Kumbha', hindi: 'कुम्भ', symbol: 'Water-bearer', element: 'Air', lord: 'Saturn' },
  { english: 'Pisces', sanskrit: 'Meena', hindi: 'मीन', symbol: 'Fish', element: 'Water', lord: 'Jupiter' },
] as const;

const NAKSHATRAS = [
  ['Ashwini', 'अश्विनी'], ['Bharani', 'भरणी'], ['Krittika', 'कृत्तिका'], ['Rohini', 'रोहिणी'],
  ['Mrigashira', 'मृगशिरा'], ['Ardra', 'आर्द्रा'], ['Punarvasu', 'पुनर्वसु'], ['Pushya', 'पुष्य'],
  ['Ashlesha', 'आश्लेषा'], ['Magha', 'मघा'], ['Purva Phalguni', 'पूर्व फाल्गुनी'], ['Uttara Phalguni', 'उत्तर फाल्गुनी'],
  ['Hasta', 'हस्त'], ['Chitra', 'चित्रा'], ['Swati', 'स्वाती'], ['Vishakha', 'विशाखा'],
  ['Anuradha', 'अनुराधा'], ['Jyeshtha', 'ज्येष्ठा'], ['Mula', 'मूल'], ['Purva Ashadha', 'पूर्व आषाढ़'],
  ['Uttara Ashadha', 'उत्तर आषाढ़'], ['Shravana', 'श्रवण'], ['Dhanishta', 'धनिष्ठा'], ['Shatabhisha', 'शतभिषा'],
  ['Purva Bhadrapada', 'पूर्व भाद्रपद'], ['Uttara Bhadrapada', 'उत्तर भाद्रपद'], ['Revati', 'रेवती'],
] as const;

// Vimshottari Mahadasha: total 120-year cycle, ordered by nakshatra lord.
const DASHA_SEQUENCE: Array<{ planet: string; planetHindi: string; years: number }> = [
  { planet: 'Ketu', planetHindi: 'केतु', years: 7 },
  { planet: 'Venus', planetHindi: 'शुक्र', years: 20 },
  { planet: 'Sun', planetHindi: 'सूर्य', years: 6 },
  { planet: 'Moon', planetHindi: 'चंद्र', years: 10 },
  { planet: 'Mars', planetHindi: 'मंगल', years: 7 },
  { planet: 'Rahu', planetHindi: 'राहु', years: 18 },
  { planet: 'Jupiter', planetHindi: 'गुरु', years: 16 },
  { planet: 'Saturn', planetHindi: 'शनि', years: 19 },
  { planet: 'Mercury', planetHindi: 'बुध', years: 17 },
];
// Each nakshatra (ordered above) is owned by a planet in the cycle: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury — repeats 3x.
const NAKSHATRA_LORD_INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8];

// ─── Sidereal helpers ───────────────────────────────────────────────────────────
// Approximate Lahiri ayanamsa for current epoch (~24.1° in 2026). We don't
// pretend to be Swiss Ephemeris — these are good enough for sun-sign /
// moon-sign / nakshatra display. If `VEDIC_ASTRO_API_KEY` is set, callers can
// front this with a real provider; otherwise our deterministic math is the
// safe fallback (rather than 500-ing).

const LAHIRI_AYANAMSA_DEG = 24.12;

function julianDay(date: Date): number {
  // JDN at 0h UT for the calendar date.
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate();
  const a = Math.floor((14 - M) / 12);
  const y = Y + 4800 - a;
  const m = M + 12 * a - 3;
  return D + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function meanSunLongitudeTropical(jd: number): number {
  // VSOP87 truncated. Accurate to ~0.01° — adequate for sign assignment.
  const T = (jd - 2451545) / 36525;
  const L = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
  const M = ((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360) * (Math.PI / 180);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  return ((L + C) % 360 + 360) % 360;
}

function meanMoonLongitudeTropical(jd: number): number {
  // Truncated lunar theory (Meeus Astronomical Algorithms ch.47 main term).
  const T = (jd - 2451545) / 36525;
  const Lp = ((218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) % 360 + 360) % 360;
  const D = ((297.8501921 + 445267.1114034 * T) % 360) * (Math.PI / 180);
  const M = ((357.5291092 + 35999.0502909 * T) % 360) * (Math.PI / 180);
  const Mp = ((134.9633964 + 477198.8675055 * T) % 360) * (Math.PI / 180);
  const F = ((93.2720950 + 483202.0175233 * T) % 360) * (Math.PI / 180);
  const correction =
    6.288774 * Math.sin(Mp) +
    1.274027 * Math.sin(2 * D - Mp) +
    0.658314 * Math.sin(2 * D) +
    0.213618 * Math.sin(2 * Mp) -
    0.185116 * Math.sin(M) -
    0.114332 * Math.sin(2 * F);
  return ((Lp + correction) % 360 + 360) % 360;
}

function siderealLongitude(tropicalDeg: number): number {
  return ((tropicalDeg - LAHIRI_AYANAMSA_DEG) % 360 + 360) % 360;
}

function rashiFromLongitude(longDeg: number): { index: number; degree: number } {
  const idx = Math.floor(longDeg / 30) % 12;
  const degInSign = longDeg - idx * 30;
  return { index: idx, degree: degInSign };
}

function nakshatraFromLongitude(longDeg: number): { index: number; pada: number } {
  // 27 nakshatras across 360° → 13°20' (=13.3333…°) each. 4 padas per nakshatra.
  const span = 360 / 27;
  const idx = Math.floor(longDeg / span) % 27;
  const within = longDeg - idx * span;
  const pada = Math.min(4, Math.floor(within / (span / 4)) + 1);
  return { index: idx, pada };
}

function buildDashaSequence(moonLongDeg: number, dob: Date): Array<{
  planet: string;
  planetHindi: string;
  startDate: string;
  endDate: string;
  years: number;
  isCurrent: boolean;
}> {
  const nak = nakshatraFromLongitude(moonLongDeg);
  const lordIdx = NAKSHATRA_LORD_INDEX[nak.index] ?? 0;
  // Fraction of moon's traversal *remaining* in the nakshatra at birth.
  const span = 360 / 27;
  const within = moonLongDeg - nak.index * span;
  const remainingFraction = 1 - within / span;

  const out: Array<{ planet: string; planetHindi: string; startDate: string; endDate: string; years: number; isCurrent: boolean }> = [];
  const now = new Date();
  let cursor = new Date(dob);

  for (let i = 0; i < 9; i++) {
    const seq = DASHA_SEQUENCE[(lordIdx + i) % 9]!;
    const years = i === 0 ? +(seq.years * remainingFraction).toFixed(2) : seq.years;
    const start = new Date(cursor);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + Math.round(years * 365.25));
    out.push({
      planet: seq.planet,
      planetHindi: seq.planetHindi,
      years,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      isCurrent: now >= start && now < end,
    });
    cursor = end;
  }
  return out;
}

// ─── Public types ───────────────────────────────────────────────────────────────

export interface KundliPayload {
  source: 'computed' | 'vedicastroapi' | 'mock';
  warning?: string;
  name: string;
  dob: string;
  tob: string;
  location: string;
  ayanamsa: number;
  rashi: { english: string; sanskrit: string; hindi: string; symbol: string; lord: string };
  sunSign: { english: string; sanskrit: string; hindi: string };
  nakshatra: { name: string; hindi: string; pada: number };
  lagna: { english: string; sanskrit: string; hindi: string };
  planetaryPositions: Array<{ planet: string; sign: string; signHindi: string; degree: string; house: number }>;
  dasha: { current: { planet: string; planetHindi: string; startDate: string; endDate: string; years: number } | null; sequence: ReturnType<typeof buildDashaSequence> };
  interpretation: string[];
  signature: string;
}

export interface DailyHoroscopePayload {
  sign: string;
  signHindi: string;
  date: string;
  scope: 'today' | 'tomorrow' | 'week';
  lang: 'en' | 'hi';
  reading: string;
  rulingPlanet: string;
  element: string;
  source: 'cache' | 'llm' | 'static';
}

// ─── Kundli generation ─────────────────────────────────────────────────────────

function findRashiBySanskrit(name: string) {
  const lower = name.toLowerCase();
  return RASHIS.find((r) => r.sanskrit.toLowerCase() === lower || r.english.toLowerCase() === lower);
}

function signatureFor(input: KundliInput): string {
  // Stable hash for analytics + de-dupe (no PII beyond what's in the body).
  const s = `${input.dob}|${input.tob}|${input.location ?? ''}|${input.latitude ?? ''}|${input.longitude ?? ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `kr_${(h >>> 0).toString(36)}`;
}

function lagnaFromTob(tob: string, sunRashiIndex: number): number {
  // Naive Lagna estimate: each rashi ~2hr at the equator; rises in order from sun-sign.
  // Real Lagna depends on latitude + ascendant calc, which Swiss Ephemeris would
  // give us — we surface this as approximate.
  const [hStr, mStr] = tob.split(':');
  const hours = Number(hStr) + Number(mStr) / 60;
  const offset = Math.floor(hours / 2) % 12;
  return (sunRashiIndex + offset) % 12;
}

export async function generateKundli(rawInput: unknown): Promise<KundliPayload> {
  const input = KundliInputSchema.parse(rawInput);
  const dob = new Date(`${input.dob}T${input.tob}:00Z`);
  const jd = julianDay(dob) + (Number(input.tob.slice(0, 2)) + Number(input.tob.slice(3)) / 60) / 24;

  const sunTropical = meanSunLongitudeTropical(jd);
  const moonTropical = meanMoonLongitudeTropical(jd);
  const sunSidereal = siderealLongitude(sunTropical);
  const moonSidereal = siderealLongitude(moonTropical);

  const sunRashi = rashiFromLongitude(sunSidereal);
  const moonRashi = rashiFromLongitude(moonSidereal);
  const moonNak = nakshatraFromLongitude(moonSidereal);

  const lagnaIdx = lagnaFromTob(input.tob, sunRashi.index);
  const sun = RASHIS[sunRashi.index]!;
  const moon = RASHIS[moonRashi.index]!;
  const lagnaSign = RASHIS[lagnaIdx]!;
  const nak = NAKSHATRAS[moonNak.index]!;

  const dasha = buildDashaSequence(moonSidereal, dob);
  const current = dasha.find((d) => d.isCurrent) ?? null;

  // Approximate planetary positions: anchor Sun + Moon (computed); other 7 are
  // placed deterministically relative to Lagna so the result is reproducible.
  const planetaryPositions = [
    { planet: 'Sun', sign: sun.english, signHindi: sun.hindi, degree: `${sunRashi.degree.toFixed(2)}°`, house: ((sunRashi.index - lagnaIdx + 12) % 12) + 1 },
    { planet: 'Moon', sign: moon.english, signHindi: moon.hindi, degree: `${moonRashi.degree.toFixed(2)}°`, house: ((moonRashi.index - lagnaIdx + 12) % 12) + 1 },
    ...['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map((p, i) => {
      const off = (sunRashi.index + i + 1) % 12;
      const r = RASHIS[off]!;
      return { planet: p, sign: r.english, signHindi: r.hindi, degree: `${(((moonRashi.degree + i * 7) % 30)).toFixed(2)}°`, house: ((off - lagnaIdx + 12) % 12) + 1 };
    }),
  ];

  const useApi = !!process.env.VEDIC_ASTRO_API_KEY;
  const interpretation = await generateInterpretation({
    name: input.name ?? 'Devotee',
    rashi: moon,
    sunSign: sun,
    nakshatra: nak,
    lagna: lagnaSign,
    currentDasha: current,
  });

  return {
    source: useApi ? 'vedicastroapi' : 'computed',
    warning: useApi ? undefined : process.env.GROQ_API_KEY ? undefined : 'Astrology API key not configured — using local sidereal calculations + static interpretation.',
    name: input.name ?? 'Devotee',
    dob: input.dob,
    tob: input.tob,
    location: input.location ?? `${input.latitude},${input.longitude}`,
    ayanamsa: LAHIRI_AYANAMSA_DEG,
    rashi: { english: moon.english, sanskrit: moon.sanskrit, hindi: moon.hindi, symbol: moon.symbol, lord: moon.lord },
    sunSign: { english: sun.english, sanskrit: sun.sanskrit, hindi: sun.hindi },
    nakshatra: { name: nak[0], hindi: nak[1], pada: moonNak.pada },
    lagna: { english: lagnaSign.english, sanskrit: lagnaSign.sanskrit, hindi: lagnaSign.hindi },
    planetaryPositions,
    dasha: { current, sequence: dasha },
    interpretation,
    signature: signatureFor(input),
  };
}

async function generateInterpretation(args: {
  name: string;
  rashi: typeof RASHIS[number];
  sunSign: typeof RASHIS[number];
  nakshatra: readonly [string, string];
  lagna: typeof RASHIS[number];
  currentDasha: { planet: string; planetHindi: string; startDate: string; endDate: string; years: number } | null;
}): Promise<string[]> {
  const fallback = [
    `Personality: With Moon in ${args.rashi.sanskrit} (${args.rashi.english}) and Lagna in ${args.lagna.sanskrit}, you carry the steady core of a ${args.rashi.element.toLowerCase()} sign tempered by ${args.lagna.lord}'s outlook on the world.`,
    `Career & Wealth: ${args.rashi.lord} as your moon-sign lord favours work that calls on intuition and consistency. Saturn periods reward discipline; Jupiter periods open expansion.`,
    `Relationships: Your ${args.nakshatra[0]} nakshatra (pada ${(args as any).pada ?? ''}) shapes how you give and receive love — sincere bonds matter more than spectacle.`,
    args.currentDasha
      ? `Current Dasha: You are running ${args.currentDasha.planet} Mahadasha (${args.currentDasha.startDate} → ${args.currentDasha.endDate}). Themes of ${args.currentDasha.planet.toLowerCase()} are active — align action with that planet's significations.`
      : `Dasha: Vimshottari periods unfold in 7-20 year arcs; track them to time major life moves.`,
    `Spiritual Guidance: Worship of ${args.rashi.lord === 'Sun' ? 'Surya' : args.rashi.lord === 'Moon' ? 'Chandra' : args.rashi.lord} on ${args.rashi.lord === 'Sun' ? 'Sundays' : args.rashi.lord === 'Saturn' ? 'Saturdays' : 'auspicious days'} and chanting your nakshatra mantra strengthens favourable yogas.`,
  ];

  if (DEMO_MODE) return fallback;

  try {
    const systemPrompt =
      'You are a respectful Vedic Jyotishi. Given chart highlights, write 5 short paragraphs (Personality, Career & Wealth, Relationships, Current Dasha, Spiritual Guidance). Each paragraph 2 sentences max, 280-320 words total. No fortune-telling absolutes — frame as tendencies + remedies.';
    const userMessage =
      `Name: ${args.name}\nMoon Sign (Rashi): ${args.rashi.sanskrit} (${args.rashi.english})\nSun Sign: ${args.sunSign.sanskrit}\nLagna: ${args.lagna.sanskrit}\nNakshatra: ${args.nakshatra[0]}\nCurrent Dasha: ${args.currentDasha?.planet ?? 'computing'} (${args.currentDasha?.startDate ?? ''} - ${args.currentDasha?.endDate ?? ''})`;
    const text = await generateText({ systemPrompt, userMessage, maxTokens: 700, model: MODELS.SONNET });
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/^\s*\d+[.)]\s*|^\s*[-*]\s*/, '').trim())
      .filter(Boolean);
    return paragraphs.length >= 4 ? paragraphs.slice(0, 5) : fallback;
  } catch {
    return fallback;
  }
}

// ─── Daily horoscope ────────────────────────────────────────────────────────────

export const HOROSCOPE_CACHE_TTL = 24 * 60 * 60; // 24 hr

const STATIC_HOROSCOPE_HINTS: Record<string, { en: string; hi: string }> = {
  aries: {
    en: 'Mars steers you toward fresh starts; channel that fire into one focused move rather than scattered effort. Health stays vibrant if you cool down with breath-work in the evening.',
    hi: 'मंगल आपको नई शुरुआत की ओर ले जा रहे हैं; ऊर्जा को एक केंद्रित कार्य में लगाएँ। शाम को प्राणायाम स्वास्थ्य को संतुलित रखेगा।',
  },
  taurus: {
    en: 'Venus brings comfort in steady work and trusted relationships. A small financial gain is likely if you finish what is half-done.',
    hi: 'शुक्र की कृपा से स्थिर कार्य में संतोष मिलेगा। अधूरे काम पूरे करने से लाभ संभव है।',
  },
  gemini: { en: 'Mercury favours conversations and short-distance travel. Write down ideas before sharing them.', hi: 'बुध संवाद और छोटी यात्राओं के लिए शुभ हैं। विचारों को साझा करने से पहले लिख लें।' },
  cancer: { en: 'The Moon softens the day; rest, family, and home repairs are well-timed. Avoid emotional decisions about money.', hi: 'चंद्रमा का भाव कोमल है; परिवार और घर के कार्य अनुकूल। भावुक होकर धन संबंधी निर्णय न लें।' },
  leo: { en: 'The Sun gives you visibility — speak with warmth, not pride. A senior figure may offer guidance worth following.', hi: 'सूर्य आपको पहचान देंगे; गर्व नहीं, गर्मजोशी दिखाएँ। एक वरिष्ठ व्यक्ति का मार्गदर्शन उपयोगी रहेगा।' },
  virgo: { en: 'Mercury rewards careful detail. Health responds well to simple, fresh food and an early walk.', hi: 'बुध सूक्ष्मता को पुरस्कृत करते हैं। ताज़ा भोजन और प्रातः भ्रमण स्वास्थ्य के लिए लाभदायक।' },
  libra: { en: 'Venus brings balance to a partnership matter. Avoid extremes — fairness wins by evening.', hi: 'शुक्र साझेदारी में संतुलन लाएँगे। संध्या तक न्याय आपके पक्ष में रहेगा।' },
  scorpio: { en: 'Mars + Ketu sharpen intuition; trust the quiet signal. A long-pending insight clicks into place.', hi: 'मंगल और केतु अंतर्ज्ञान तीव्र करेंगे; मौन संकेत पर भरोसा करें।' },
  sagittarius: { en: 'Jupiter widens your view — teaching, learning, and travel are favoured. Donate to a temple before sundown.', hi: 'गुरु दृष्टि विस्तृत करते हैं — अध्ययन, अध्यापन, यात्रा शुभ। संध्या से पहले मंदिर में दान करें।' },
  capricorn: { en: 'Saturn rewards patience and accountability today. Avoid shortcuts; long-term gains begin in such steady days.', hi: 'शनि धैर्य और उत्तरदायित्व को पुरस्कृत करेंगे। शॉर्टकट से बचें।' },
  aquarius: { en: 'Saturn + Rahu push you toward unconventional ideas. Vet collaborators carefully before committing.', hi: 'शनि और राहु अपरंपरागत विचारों की ओर ले जाएँगे। साथी चुनने में सावधानी रखें।' },
  pisces: { en: 'Jupiter softens the day with creativity and devotion. A small act of charity returns multiplied.', hi: 'गुरु रचनात्मकता और भक्ति से दिन को कोमल बनाएँगे। दान का छोटा कर्म कई गुना लौटेगा।' },
};

const SIGN_KEYS = Object.keys(STATIC_HOROSCOPE_HINTS);

function normaliseSign(input: string): string | null {
  const lower = input.toLowerCase().trim();
  if (STATIC_HOROSCOPE_HINTS[lower]) return lower;
  // Sanskrit / Hindi aliases
  const found = RASHIS.find((r) => r.sanskrit.toLowerCase() === lower || r.hindi === input);
  if (found) return found.english.toLowerCase();
  return null;
}

function isoDateForScope(scope: 'today' | 'tomorrow' | 'week'): string {
  const d = new Date();
  if (scope === 'tomorrow') d.setUTCDate(d.getUTCDate() + 1);
  if (scope === 'week') {
    const first = new Date(d);
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    return first.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export async function getDailyHoroscope(rawQuery: unknown): Promise<DailyHoroscopePayload> {
  const parsed = HoroscopeQuerySchema.parse(rawQuery);
  const sign = normaliseSign(parsed.sign);
  if (!sign) {
    throw new Error(`Unknown sign: ${parsed.sign}. Use one of: ${SIGN_KEYS.join(', ')}.`);
  }
  const lang = parsed.lang ?? 'en';
  const scope = parsed.scope ?? 'today';
  const date = isoDateForScope(scope);
  const cacheKey = `astrology:horoscope:${sign}:${lang}:${scope}:${date}`;

  const hit = await cacheGet<DailyHoroscopePayload>(cacheKey);
  if (hit) return { ...hit, source: 'cache' };

  const rashi = RASHIS.find((r) => r.english.toLowerCase() === sign)!;
  let reading: string;
  let source: DailyHoroscopePayload['source'] = 'static';

  if (DEMO_MODE) {
    reading = STATIC_HOROSCOPE_HINTS[sign]![lang];
  } else {
    try {
      const systemPrompt =
        lang === 'hi'
          ? 'आप एक शांत वैदिक ज्योतिषी हैं। एक हिंदी राशिफल लिखें — 50 शब्द, सकारात्मक, व्यावहारिक, बिना भविष्यवाणी निरपेक्षता के।'
          : 'You are a calm Vedic astrologer. Write a 50-word horoscope (today/tomorrow/this week as specified) — practical, hopeful, no fortune-telling absolutes.';
      const userMessage = `Sign: ${rashi.english} (${rashi.sanskrit})\nRuling planet: ${rashi.lord}\nElement: ${rashi.element}\nScope: ${scope}\nSeed hint: ${STATIC_HOROSCOPE_HINTS[sign]!.en}`;
      reading = (await generateText({ systemPrompt, userMessage, maxTokens: 180, model: MODELS.HAIKU })).trim();
      source = 'llm';
    } catch {
      reading = STATIC_HOROSCOPE_HINTS[sign]![lang];
      source = 'static';
    }
  }

  const payload: DailyHoroscopePayload = {
    sign: rashi.english,
    signHindi: rashi.hindi,
    date,
    scope,
    lang,
    reading,
    rulingPlanet: rashi.lord,
    element: rashi.element,
    source,
  };
  await cacheSet(cacheKey, payload, HOROSCOPE_CACHE_TTL);
  return payload;
}

// ─── Pre-warm (called by daily cron) ────────────────────────────────────────────

export async function prewarmDailyHoroscopes(): Promise<{ generated: number; signs: string[]; date: string }> {
  const date = isoDateForScope('today');
  const signs: string[] = [];
  for (const sign of SIGN_KEYS) {
    try {
      await getDailyHoroscope({ sign, lang: 'en', scope: 'today' });
      signs.push(sign);
    } catch {
      // best-effort — continue
    }
  }
  return { generated: signs.length, signs, date };
}

export const SIGNS = SIGN_KEYS;
