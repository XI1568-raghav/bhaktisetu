// Hora — Vedic planetary hour. 24 horas per civil day, each ruled by one
// of 7 planets in Chaldean order (Sat → Jup → Mars → Sun → Ven → Mer → Moon).
// First hora at sunrise = weekday's planetary lord. Each day-hora =
// (sunset − sunrise) / 12 ≈ 60 min; each night-hora = (next sunrise − sunset) / 12.
// Reuses sunrise/sunset compute from choghadiya module.

import { computeChoghadiya, CITY_OPTIONS } from './choghadiya';

export { CITY_OPTIONS };

export type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

// Chaldean order — descending orbital speed (slowest first). Hora sequence
// cycles through this order regardless of starting planet.
const CHALDEAN: Planet[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

// First-hora-at-sunrise per weekday. Index 0 = Sunday ... 6 = Saturday.
const WEEKDAY_LORD: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

export type HoraQuality = 'auspicious' | 'neutral' | 'inauspicious';

export type Hora = {
 index: number;          // 1..24 (1..12 day, 13..24 night)
 isDay: boolean;
 planet: Planet;
 sanskrit: string;
 startTime: string;      // HH:MM local
 endTime: string;
 startMinutes: number;
 endMinutes: number;
 isCurrent: boolean;
 quality: HoraQuality;
 bestFor: string;
};

export type HoraDay = {
 date: string;
 city: string;
 weekday: string;
 sunrise: string;
 sunset: string;
 nextSunrise: string;
 dayHoraLengthMin: number;
 nightHoraLengthMin: number;
 horas: Hora[];          // all 24, ordered
 currentHora: Hora | null;
 nextAuspicious: Hora | null;
};

const SANSKRIT: Record<Planet, string> = {
 Sun: 'सूर्य · Surya',
 Moon: 'चंद्र · Chandra',
 Mars: 'मंगल · Mangal',
 Mercury: 'बुध · Budha',
 Jupiter: 'गुरु · Guru',
 Venus: 'शुक्र · Shukra',
 Saturn: 'शनि · Shani',
};

const QUALITY: Record<Planet, HoraQuality> = {
 Sun: 'auspicious',      // benefic for authority + health
 Moon: 'auspicious',     // benefic for travel + emotion
 Jupiter: 'auspicious',  // greatest benefic — religion, learning, wealth
 Venus: 'auspicious',    // benefic for art, romance, luxury
 Mercury: 'neutral',     // depends on association — generally neutral
 Mars: 'inauspicious',   // malefic — surgery, conflict only
 Saturn: 'inauspicious', // malefic — hard labor, delays
};

const BEST_FOR: Record<Planet, string> = {
 Sun: 'Government work, dealing with authority, father-related, health, leadership roles, starting new authority position.',
 Moon: 'Travel (especially over water), mother-related, dealing with public/crowds, emotional matters, agriculture, dairy.',
 Mars: 'Avoid most starts. Suitable for property disputes, lawsuits, surgery, sports, defensive military action.',
 Mercury: 'Communication, study, trade, signing contracts, writing, accounting, teaching, short journeys.',
 Jupiter: 'Religion, teaching, marriage, wealth ceremonies, learning, charity, consulting elders, spiritual practice.',
 Venus: 'Romance, art, music, fashion, luxury purchases, jewelry, dance, weddings, fine dining.',
 Saturn: 'Avoid most starts. Suitable for hard labor, mining, agriculture, iron work, dealing with servants/workers, Shani remedies.',
};

function parseHHMM(s: string): number {
 const [h, m] = s.split(':').map(Number);
 return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToHHMM(min: number): string {
 const wrapped = ((min % 1440) + 1440) % 1440;
 const hh = Math.floor(wrapped / 60);
 const mm = Math.round(wrapped % 60);
 return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export type HoraInput = {
 date: string;
 lat: number;
 lng: number;
 tz: number;
 city: string;
};

export function computeHora(input: HoraInput, asOf?: Date): HoraDay | null {
 const cd = computeChoghadiya(input, asOf);
 if (!cd) return null;

 const sunriseMin = cd.day[0]?.startMinutes ?? 0;
 const sunsetMin = cd.day[7]?.endMinutes ?? 0;
 const nextSunriseMin = (cd.night[7]?.endMinutes ?? sunsetMin + 720);
 const dayArc = sunsetMin - sunriseMin;
 const nightArc = nextSunriseMin - sunsetMin;
 if (dayArc <= 0 || nightArc <= 0) return null;

 const dayHoraLen = dayArc / 12;
 const nightHoraLen = nightArc / 12;

 const weekdayIdx = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(cd.weekday);
 if (weekdayIdx < 0) return null;

 const firstPlanet = WEEKDAY_LORD[weekdayIdx]!;
 const startChaldeanIdx = CHALDEAN.indexOf(firstPlanet);

 const now = asOf ?? new Date();
 const todayLocalDate = new Date(now.getTime() + input.tz * 3600000);
 const isToday = todayLocalDate.toISOString().slice(0, 10) === input.date;
 const nowMin = isToday ? todayLocalDate.getUTCHours() * 60 + todayLocalDate.getUTCMinutes() : -1;

 const horas: Hora[] = [];
 for (let i = 0; i < 24; i++) {
  const planet = CHALDEAN[(startChaldeanIdx + i) % 7]!;
  const isDay = i < 12;
  const start = isDay
   ? sunriseMin + i * dayHoraLen
   : sunsetMin + (i - 12) * nightHoraLen;
  const end = isDay
   ? start + dayHoraLen
   : start + nightHoraLen;
  const startWrapped = ((start % 1440) + 1440) % 1440;
  const endWrapped = ((end % 1440) + 1440) % 1440;
  const isCurrent = nowMin >= 0 && (
   startWrapped <= endWrapped
    ? nowMin >= startWrapped && nowMin < endWrapped
    : nowMin >= startWrapped || nowMin < endWrapped
  );
  horas.push({
   index: i + 1,
   isDay,
   planet,
   sanskrit: SANSKRIT[planet],
   startTime: minutesToHHMM(start),
   endTime: minutesToHHMM(end),
   startMinutes: Math.round(start),
   endMinutes: Math.round(end),
   isCurrent,
   quality: QUALITY[planet],
   bestFor: BEST_FOR[planet],
  });
 }

 const currentHora = horas.find((h) => h.isCurrent) ?? null;
 const nextAuspicious = nowMin >= 0
  ? horas.find((h) => h.startMinutes > nowMin && h.quality === 'auspicious') ?? null
  : null;

 return {
  date: cd.date,
  city: cd.city,
  weekday: cd.weekday,
  sunrise: cd.sunrise,
  sunset: cd.sunset,
  nextSunrise: cd.nextSunrise,
  dayHoraLengthMin: dayHoraLen,
  nightHoraLengthMin: nightHoraLen,
  horas,
  currentHora,
  nextAuspicious,
 };
}

export const HORA_PLANETS = CHALDEAN;
export const HORA_WEEKDAY_LORD = WEEKDAY_LORD;
export const HORA_QUALITY = QUALITY;
export const HORA_BEST_FOR = BEST_FOR;
export const HORA_SANSKRIT = SANSKRIT;
