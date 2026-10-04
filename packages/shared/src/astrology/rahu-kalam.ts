// Rahu Kalam, Yamaganda, Gulika Kalam — daily inauspicious 90-min windows.
// Each day-arc (sunrise → sunset) split into 8 equal octets; each weekday
// assigns one octet (1..8) to each of the three doshas per traditional
// muhurat shastra. Reuses sunrise/sunset compute from choghadiya module.

import { computeChoghadiya, CITY_OPTIONS } from './choghadiya.js';

export { CITY_OPTIONS };

export type DoshaKind = 'rahu' | 'yamaganda' | 'gulika';

export type DoshaWindow = {
 kind: DoshaKind;
 label: string;          // "Rahu Kalam"
 sanskrit: string;
 octet: number;          // 1..8
 startTime: string;      // HH:MM local
 endTime: string;
 startMinutes: number;
 endMinutes: number;
 isCurrent: boolean;
 ruler: string;
 avoid: string;          // what to skip during this window
};

export type RahuKalamDay = {
 date: string;
 city: string;
 weekday: string;
 sunrise: string;
 sunset: string;
 dayLengthHours: number;
 octetLengthMin: number;
 windows: DoshaWindow[];  // ordered by startMinutes
 currentDosha: DoshaWindow | null;
 nextDosha: DoshaWindow | null;
};

// Per-weekday octet (1..8) where each dosha falls during day-arc.
// Standard tables from Brihat Samhita / Muhurta Chintamani.
// Index 0 = Sunday ... 6 = Saturday.
const RAHU_OCTET     = [8, 2, 7, 5, 6, 4, 3];
const YAMAGANDA_OCTET = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_OCTET   = [7, 6, 5, 4, 3, 2, 1];

const RULER: Record<DoshaKind, string> = {
 rahu: 'Rahu (North lunar node — shadow planet of confusion)',
 yamaganda: 'Yama (lord of death — son of Surya)',
 gulika: 'Gulika / Mandi (son of Shani — slowness, obstruction)',
};

const AVOID: Record<DoshaKind, string> = {
 rahu: 'Avoid travel start, new ventures, signing contracts, weddings, griha pravesh, vehicle purchase. Routine work + reading scriptures OK.',
 yamaganda: 'Avoid auspicious starts, new business, marriage talks, journey commencement. Daily routine acceptable.',
 gulika: 'Avoid important meetings, financial commitments, surgery. Mantra japa + Shani remedies favored.',
};

const SANSKRIT: Record<DoshaKind, string> = {
 rahu: 'राहु काल',
 yamaganda: 'यमगण्ड',
 gulika: 'गुलिक काल',
};

const LABEL: Record<DoshaKind, string> = {
 rahu: 'Rahu Kalam',
 yamaganda: 'Yamaganda',
 gulika: 'Gulika Kalam',
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

export type RahuKalamInput = {
 date: string;
 lat: number;
 lng: number;
 tz: number;
 city: string;
};

export function computeRahuKalam(input: RahuKalamInput, asOf?: Date): RahuKalamDay | null {
 const cd = computeChoghadiya(input, asOf);
 if (!cd) return null;

 const sunriseMin = cd.day[0]?.startMinutes ?? 0;
 const sunsetMin = cd.day[7]?.endMinutes ?? 0;
 const dayArcMin = sunsetMin - sunriseMin;
 if (dayArcMin <= 0) return null;
 const octetLen = dayArcMin / 8;

 const weekdayIdx = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(cd.weekday);
 if (weekdayIdx < 0) return null;

 const now = asOf ?? new Date();
 const todayLocalDate = new Date(now.getTime() + input.tz * 3600000);
 const isToday = todayLocalDate.toISOString().slice(0, 10) === input.date;
 const nowMin = isToday ? todayLocalDate.getUTCHours() * 60 + todayLocalDate.getUTCMinutes() : -1;

 function buildWindow(kind: DoshaKind, octet: number): DoshaWindow {
  const startMin = sunriseMin + (octet - 1) * octetLen;
  const endMin = startMin + octetLen;
  const isCurrent = nowMin >= 0 && nowMin >= startMin && nowMin < endMin;
  return {
   kind,
   label: LABEL[kind],
   sanskrit: SANSKRIT[kind],
   octet,
   startTime: minutesToHHMM(startMin),
   endTime: minutesToHHMM(endMin),
   startMinutes: Math.round(startMin),
   endMinutes: Math.round(endMin),
   isCurrent,
   ruler: RULER[kind],
   avoid: AVOID[kind],
  };
 }

 const windows: DoshaWindow[] = [
  buildWindow('rahu', RAHU_OCTET[weekdayIdx]!),
  buildWindow('yamaganda', YAMAGANDA_OCTET[weekdayIdx]!),
  buildWindow('gulika', GULIKA_OCTET[weekdayIdx]!),
 ].sort((a, b) => a.startMinutes - b.startMinutes);

 const currentDosha = windows.find((w) => w.isCurrent) ?? null;
 const nextDosha = nowMin >= 0
  ? windows.find((w) => w.startMinutes > nowMin) ?? null
  : null;

 return {
  date: cd.date,
  city: cd.city,
  weekday: cd.weekday,
  sunrise: cd.sunrise,
  sunset: cd.sunset,
  dayLengthHours: dayArcMin / 60,
  octetLengthMin: octetLen,
  windows,
  currentDosha,
  nextDosha,
 };
}

export const DOSHA_LABEL = LABEL;
export const DOSHA_SANSKRIT = SANSKRIT;
export const DOSHA_RULER = RULER;
export const DOSHA_AVOID = AVOID;
