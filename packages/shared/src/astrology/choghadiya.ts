// Choghadiya — Vedic daily muhurat. 8 day-periods + 8 night-periods, each
// ~1.5 hr (1/8 of day-arc / night-arc). Each period classified per Brihat
// Samhita as Amrit/Shubh/Labh (auspicious), Kaal/Rog/Udveg (inauspicious),
// Char (movement, neutral). Sunrise/sunset via Almanac for Computers (USGS,
// ~1 min accuracy — sufficient for 90-minute period granularity).

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type ChoghadiyaKind =
 | 'Amrit'   // most auspicious — start anything
 | 'Shubh'   // auspicious — wedding, ceremonies
 | 'Labh'    // gain — business, money
 | 'Char'    // movement — neutral, ideal for travel
 | 'Kaal'    // inauspicious — avoid new starts
 | 'Rog'     // inauspicious — avoid health-critical work
 | 'Udveg';  // inauspicious — anxiety, restlessness

export type ChoghadiyaQuality = 'auspicious' | 'inauspicious' | 'neutral';

export type ChoghadiyaPeriod = {
 index: number;        // 1..8
 kind: ChoghadiyaKind;
 quality: ChoghadiyaQuality;
 startTime: string;    // HH:MM local
 endTime: string;
 startMinutes: number; // minutes from midnight local
 endMinutes: number;
 isCurrent: boolean;
 ruler: string;        // planetary lord
 bestFor: string;
};

export type ChoghadiyaDay = {
 date: string;         // YYYY-MM-DD
 city: string;
 sunrise: string;      // HH:MM local
 sunset: string;
 nextSunrise: string;
 weekday: string;
 day: ChoghadiyaPeriod[];   // 8 periods sunrise → sunset
 night: ChoghadiyaPeriod[]; // 8 periods sunset → next sunrise
 currentPeriod: ChoghadiyaPeriod | null;
 nextAuspicious: ChoghadiyaPeriod | null;
};

export const CITY_OPTIONS: Array<{ label: string; lat: number; lng: number; tz: number }> = [
 { label: 'Delhi',       lat: 28.6139, lng: 77.2090, tz: 5.5 },
 { label: 'Mumbai',      lat: 19.0760, lng: 72.8777, tz: 5.5 },
 { label: 'Kolkata',     lat: 22.5726, lng: 88.3639, tz: 5.5 },
 { label: 'Chennai',     lat: 13.0827, lng: 80.2707, tz: 5.5 },
 { label: 'Bengaluru',   lat: 12.9716, lng: 77.5946, tz: 5.5 },
 { label: 'Hyderabad',   lat: 17.3850, lng: 78.4867, tz: 5.5 },
 { label: 'Pune',        lat: 18.5204, lng: 73.8567, tz: 5.5 },
 { label: 'Ahmedabad',   lat: 23.0225, lng: 72.5714, tz: 5.5 },
 { label: 'Jaipur',      lat: 26.9124, lng: 75.7873, tz: 5.5 },
 { label: 'Varanasi',    lat: 25.3176, lng: 82.9739, tz: 5.5 },
 { label: 'Tirupati',    lat: 13.6288, lng: 79.4192, tz: 5.5 },
 { label: 'Haridwar',    lat: 29.9457, lng: 78.1642, tz: 5.5 },
 { label: 'Ujjain',      lat: 23.1765, lng: 75.7885, tz: 5.5 },
 { label: 'Ayodhya',     lat: 26.7922, lng: 82.1998, tz: 5.5 },
 { label: 'Dwarka',      lat: 22.2394, lng: 68.9678, tz: 5.5 },
 { label: 'Puri',        lat: 19.8135, lng: 85.8312, tz: 5.5 },
 { label: 'Shirdi',      lat: 19.7645, lng: 74.4769, tz: 5.5 },
 { label: 'Mathura',     lat: 27.4924, lng: 77.6737, tz: 5.5 },
 { label: 'Vrindavan',   lat: 27.5650, lng: 77.6593, tz: 5.5 },
 { label: 'Rishikesh',   lat: 30.0869, lng: 78.2676, tz: 5.5 },
 { label: 'New York',    lat: 40.7128, lng: -74.0060, tz: -5 },
 { label: 'London',      lat: 51.5074, lng: -0.1278, tz: 0 },
 { label: 'Toronto',     lat: 43.6532, lng: -79.3832, tz: -5 },
 { label: 'Sydney',      lat: -33.8688, lng: 151.2093, tz: 10 },
 { label: 'Singapore',   lat: 1.3521, lng: 103.8198, tz: 8 },
 { label: 'Dubai',       lat: 25.2048, lng: 55.2708, tz: 4 },
];

// Per-weekday choghadiya orders. Index 0 = Sunday ... 6 = Saturday.
const DAY_ORDER: ChoghadiyaKind[][] = [
 ['Udveg','Char','Labh','Amrit','Kaal','Shubh','Rog','Udveg'],   // Sun
 ['Amrit','Kaal','Shubh','Rog','Udveg','Char','Labh','Amrit'],   // Mon
 ['Rog','Udveg','Char','Labh','Amrit','Kaal','Shubh','Rog'],     // Tue
 ['Labh','Amrit','Kaal','Shubh','Rog','Udveg','Char','Labh'],    // Wed
 ['Shubh','Rog','Udveg','Char','Labh','Amrit','Kaal','Shubh'],   // Thu
 ['Char','Labh','Amrit','Kaal','Shubh','Rog','Udveg','Char'],    // Fri
 ['Kaal','Shubh','Rog','Udveg','Char','Labh','Amrit','Kaal'],    // Sat
];

const NIGHT_ORDER: ChoghadiyaKind[][] = [
 ['Shubh','Amrit','Char','Rog','Kaal','Labh','Udveg','Shubh'],   // Sun
 ['Char','Rog','Kaal','Labh','Udveg','Shubh','Amrit','Char'],    // Mon
 ['Kaal','Labh','Udveg','Shubh','Amrit','Char','Rog','Kaal'],    // Tue
 ['Udveg','Shubh','Amrit','Char','Rog','Kaal','Labh','Udveg'],   // Wed
 ['Amrit','Char','Rog','Kaal','Labh','Udveg','Shubh','Amrit'],   // Thu
 ['Rog','Kaal','Labh','Udveg','Shubh','Amrit','Char','Rog'],     // Fri
 ['Labh','Udveg','Shubh','Amrit','Char','Rog','Kaal','Labh'],    // Sat
];

const QUALITY: Record<ChoghadiyaKind, ChoghadiyaQuality> = {
 Amrit: 'auspicious', Shubh: 'auspicious', Labh: 'auspicious',
 Char: 'neutral',
 Kaal: 'inauspicious', Rog: 'inauspicious', Udveg: 'inauspicious',
};

const RULER: Record<ChoghadiyaKind, string> = {
 Amrit: 'Chandra (Moon)',
 Shubh: 'Guru (Jupiter)',
 Labh: 'Budha (Mercury)',
 Char: 'Shukra (Venus)',
 Kaal: 'Shani (Saturn)',
 Rog: 'Mangal (Mars)',
 Udveg: 'Surya (Sun)',
};

const BEST_FOR: Record<ChoghadiyaKind, string> = {
 Amrit: 'Most auspicious — any new beginning, important work, spiritual practice',
 Shubh: 'Weddings, religious ceremonies, ornament purchase, learning',
 Labh: 'Business, investments, starting new ventures, education',
 Char: 'Travel, transport, daily errands — neutral but movement-friendly',
 Kaal: 'Avoid new starts. Suitable only for routine + legal work',
 Rog: 'Avoid health-critical work. Suitable for warfare-type defensive action',
 Udveg: 'Avoid important decisions. Government / paperwork tolerable',
};

const WEEKDAY = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function norm360(d: number): number {
 const r = d % 360;
 return r < 0 ? r + 360 : r;
}

// Day of year for a given Date (UTC-safe, 1-based).
function dayOfYear(y: number, m: number, d: number): number {
 const start = Date.UTC(y, 0, 1);
 const cur = Date.UTC(y, m - 1, d);
 return Math.floor((cur - start) / 86400000) + 1;
}

// Almanac-for-Computers sunrise/sunset solver.
// Returns local time in fractional hours (24h) for a given lat/lng, date,
// and whether sunrise (rising=true) or sunset (rising=false).
// tzOffset in hours.
function solarTime(y: number, m: number, d: number, lat: number, lng: number, tzOffset: number, rising: boolean): number {
 const N = dayOfYear(y, m, d);
 const lngHour = lng / 15;
 const t = N + ((rising ? 6 : 18) - lngHour) / 24;

 // Mean anomaly
 const M = 0.9856 * t - 3.289;
 // True longitude
 let L = M + 1.916 * Math.sin(M * DEG) + 0.020 * Math.sin(2 * M * DEG) + 282.634;
 L = norm360(L);
 // Right ascension
 let RA = Math.atan(0.91764 * Math.tan(L * DEG)) * RAD;
 RA = norm360(RA);
 // Adjust quadrant of RA to match L
 const Lquadrant = Math.floor(L / 90) * 90;
 const RAquadrant = Math.floor(RA / 90) * 90;
 RA = RA + (Lquadrant - RAquadrant);
 RA = RA / 15;

 // Declination
 const sinDec = 0.39782 * Math.sin(L * DEG);
 const cosDec = Math.cos(Math.asin(sinDec));

 // Local hour angle (zenith 90.833° = official sunrise/sunset incl. refraction)
 const zenith = 90.833;
 const cosH = (Math.cos(zenith * DEG) - sinDec * Math.sin(lat * DEG)) / (cosDec * Math.cos(lat * DEG));
 if (cosH > 1 || cosH < -1) return NaN; // sun never rises/sets at this lat/date

 let H = rising
  ? 360 - Math.acos(cosH) * RAD
  : Math.acos(cosH) * RAD;
 H = H / 15;

 const T = H + RA - 0.06571 * t - 6.622;
 let UT = T - lngHour;
 UT = ((UT % 24) + 24) % 24;
 let local = UT + tzOffset;
 local = ((local % 24) + 24) % 24;
 return local;
}

function hoursToHHMM(h: number): string {
 const total = Math.round(h * 60);
 const hh = Math.floor(total / 60) % 24;
 const mm = total % 60;
 return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function hoursToMinutes(h: number): number {
 return Math.round(h * 60);
}

export type ChoghadiyaInput = {
 date: string;     // YYYY-MM-DD
 lat: number;
 lng: number;
 tz: number;       // hours offset
 city: string;
};

export function computeChoghadiya(input: ChoghadiyaInput, asOf?: Date): ChoghadiyaDay | null {
 const [y, m, d] = input.date.split('-').map(Number);
 if (!y || !m || !d) return null;

 const sunriseH = solarTime(y, m, d, input.lat, input.lng, input.tz, true);
 const sunsetH = solarTime(y, m, d, input.lat, input.lng, input.tz, false);
 if (Number.isNaN(sunriseH) || Number.isNaN(sunsetH)) return null;

 // Next day sunrise for night periods
 const nextDate = new Date(Date.UTC(y, m - 1, d + 1));
 const ny = nextDate.getUTCFullYear();
 const nm = nextDate.getUTCMonth() + 1;
 const nd = nextDate.getUTCDate();
 const nextSunriseHRaw = solarTime(ny, nm, nd, input.lat, input.lng, input.tz, true);
 // Add 24 if next sunrise wrapped past midnight
 const nextSunriseH = nextSunriseHRaw < sunsetH ? nextSunriseHRaw + 24 : nextSunriseHRaw;

 // Weekday from Date (local midnight)
 const weekdayIdx = new Date(y, m - 1, d).getDay(); // 0=Sun
 const dayOrder = DAY_ORDER[weekdayIdx]!;
 const nightOrder = NIGHT_ORDER[weekdayIdx]!;

 const dayLen = sunsetH - sunriseH;
 const nightLen = nextSunriseH - sunsetH;
 const dayPeriodLen = dayLen / 8;
 const nightPeriodLen = nightLen / 8;

 // Current moment in fractional local hours
 const now = asOf ?? new Date();
 const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
 const isToday = now.toISOString().slice(0, 10) === input.date;

 function buildPeriod(i: number, startH: number, lenH: number, kind: ChoghadiyaKind): ChoghadiyaPeriod {
  const endH = startH + lenH;
  const isCurrent = isToday && nowH >= startH && nowH < endH;
  return {
   index: i + 1,
   kind,
   quality: QUALITY[kind],
   startTime: hoursToHHMM(startH),
   endTime: hoursToHHMM(endH),
   startMinutes: hoursToMinutes(startH),
   endMinutes: hoursToMinutes(endH),
   isCurrent,
   ruler: RULER[kind],
   bestFor: BEST_FOR[kind],
  };
 }

 const day: ChoghadiyaPeriod[] = dayOrder.map((kind, i) =>
  buildPeriod(i, sunriseH + i * dayPeriodLen, dayPeriodLen, kind),
 );
 const night: ChoghadiyaPeriod[] = nightOrder.map((kind, i) =>
  buildPeriod(i, sunsetH + i * nightPeriodLen, nightPeriodLen, kind),
 );

 const all = [...day, ...night];
 const currentPeriod = all.find((p) => p.isCurrent) ?? null;
 const nextAuspicious = all.find((p) => p.quality === 'auspicious' && p.startMinutes >= hoursToMinutes(nowH)) ?? null;

 return {
  date: input.date,
  city: input.city,
  sunrise: hoursToHHMM(sunriseH),
  sunset: hoursToHHMM(sunsetH),
  nextSunrise: hoursToHHMM(nextSunriseH),
  weekday: WEEKDAY[weekdayIdx]!,
  day,
  night,
  currentPeriod,
  nextAuspicious,
 };
}

export const CHOGHADIYA_QUALITY = QUALITY;
export const CHOGHADIYA_RULER = RULER;
export const CHOGHADIYA_BEST_FOR = BEST_FOR;
