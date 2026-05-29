// Shubh Muhurat finder — composite scorer that overlays Choghadiya quality +
// Hora planet match + Rahu/Yamaganda/Gulika avoidance to rank time windows
// for common life events (marriage, griha-pravesh, vehicle, naming, business
// start, signing, travel, surgery-elective, etc). No new astronomy — pure
// aggregation over already-shipped modules.

import { computeChoghadiya, type ChoghadiyaDay } from './choghadiya';
import { computeHora, type HoraDay, type Planet } from './hora';
import { computeRahuKalam, type RahuKalamDay } from './rahu-kalam';

export type EventType =
 | 'marriage'
 | 'griha-pravesh'
 | 'vehicle'
 | 'property'
 | 'naming'
 | 'mundan'
 | 'business-start'
 | 'signing'
 | 'travel'
 | 'surgery'
 | 'study'
 | 'general';

export const EVENT_OPTIONS: Array<{ value: EventType; label: string; sanskrit: string; idealPlanets: Planet[]; idealChogh: string[] }> = [
 { value: 'marriage',       label: 'Marriage / Vivah',           sanskrit: 'विवाह मुहूर्त',        idealPlanets: ['Jupiter', 'Venus', 'Moon'],         idealChogh: ['Amrit', 'Shubh', 'Labh'] },
 { value: 'griha-pravesh',  label: 'Griha Pravesh (House warming)', sanskrit: 'गृह प्रवेश',         idealPlanets: ['Jupiter', 'Mercury', 'Venus'],      idealChogh: ['Amrit', 'Shubh', 'Labh'] },
 { value: 'vehicle',        label: 'Vehicle purchase',           sanskrit: 'वाहन क्रय',           idealPlanets: ['Venus', 'Mercury', 'Moon'],         idealChogh: ['Amrit', 'Shubh', 'Labh', 'Char'] },
 { value: 'property',       label: 'Property / land purchase',   sanskrit: 'भूमि क्रय',           idealPlanets: ['Jupiter', 'Mercury', 'Saturn'],     idealChogh: ['Amrit', 'Shubh', 'Labh'] },
 { value: 'naming',         label: 'Namakaran (baby naming)',    sanskrit: 'नामकरण',              idealPlanets: ['Jupiter', 'Mercury', 'Moon'],       idealChogh: ['Amrit', 'Shubh'] },
 { value: 'mundan',         label: 'Mundan (first hair-cut)',    sanskrit: 'मुंडन संस्कार',        idealPlanets: ['Mercury', 'Jupiter', 'Venus'],      idealChogh: ['Amrit', 'Shubh'] },
 { value: 'business-start', label: 'Business / shop open',       sanskrit: 'व्यवसाय आरंभ',        idealPlanets: ['Mercury', 'Jupiter', 'Sun'],        idealChogh: ['Amrit', 'Shubh', 'Labh'] },
 { value: 'signing',        label: 'Contract / signing',         sanskrit: 'अनुबंध',              idealPlanets: ['Mercury', 'Jupiter'],               idealChogh: ['Amrit', 'Shubh', 'Labh'] },
 { value: 'travel',         label: 'Journey / yatra start',      sanskrit: 'यात्रा आरंभ',          idealPlanets: ['Moon', 'Mercury', 'Venus'],         idealChogh: ['Amrit', 'Shubh', 'Labh', 'Char'] },
 { value: 'surgery',        label: 'Elective surgery',           sanskrit: 'शल्य चिकित्सा',        idealPlanets: ['Mars', 'Sun'],                      idealChogh: ['Labh', 'Char'] },
 { value: 'study',          label: 'Vidyarambh / study start',   sanskrit: 'विद्यारंभ',            idealPlanets: ['Mercury', 'Jupiter'],               idealChogh: ['Amrit', 'Shubh', 'Labh'] },
 { value: 'general',        label: 'General auspicious',         sanskrit: 'सामान्य शुभ',          idealPlanets: ['Jupiter', 'Sun', 'Moon', 'Venus', 'Mercury'], idealChogh: ['Amrit', 'Shubh', 'Labh'] },
];

const CHOGH_SCORE: Record<string, number> = {
 Amrit: 30,
 Shubh: 25,
 Labh: 20,
 Char: 15,
 Udveg: -20,
 Rog: -25,
 Kaal: -30,
};

export type MuhuratWindow = {
 startTime: string;     // HH:MM
 endTime: string;
 startMinutes: number;
 endMinutes: number;
 score: number;         // 0..100
 verdict: 'excellent' | 'good' | 'fair' | 'avoid';
 horaPlanet: Planet;
 choghadiyaName: string;
 reasons: string[];     // chips
 warnings: string[];
};

export type MuhuratResult = {
 date: string;
 city: string;
 weekday: string;
 event: EventType;
 eventLabel: string;
 sunrise: string;
 sunset: string;
 topWindows: MuhuratWindow[];       // sorted desc by score, top 6
 allWindows: MuhuratWindow[];
 // Diagnostic block
 choghadiya: ChoghadiyaDay;
 hora: HoraDay;
 rahuKalam: RahuKalamDay;
};

export type MuhuratInput = {
 date: string;
 lat: number;
 lng: number;
 tz: number;
 city: string;
 event: EventType;
};

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
 return aStart < bEnd && aEnd > bStart;
}

function chogQualityAt(cd: ChoghadiyaDay, midMin: number): { kind: string; quality: 'auspicious' | 'neutral' | 'inauspicious' } {
 const all = [...cd.day, ...cd.night];
 for (const w of all) {
  const start = w.startMinutes;
  let end = w.endMinutes;
  if (end < start) end += 1440;
  const mid = midMin < start && end >= 1440 ? midMin + 1440 : midMin;
  if (mid >= start && mid < end) return { kind: w.kind, quality: w.quality };
 }
 return { kind: 'Char', quality: 'neutral' };
}

function rahuPenaltyAt(rd: RahuKalamDay, startMin: number, endMin: number): { penalty: number; warnings: string[] } {
 let pen = 0;
 const warnings: string[] = [];
 for (const w of rd.windows) {
  if (overlaps(startMin, endMin, w.startMinutes, w.endMinutes)) {
   pen -= 50;
   warnings.push(`Overlaps ${w.label}`);
  }
 }
 return { penalty: pen, warnings };
}

export function computeShubhMuhurat(input: MuhuratInput, asOf?: Date): MuhuratResult | null {
 const cd = computeChoghadiya({ date: input.date, lat: input.lat, lng: input.lng, tz: input.tz, city: input.city }, asOf);
 const hd = computeHora({ date: input.date, lat: input.lat, lng: input.lng, tz: input.tz, city: input.city }, asOf);
 const rd = computeRahuKalam({ date: input.date, lat: input.lat, lng: input.lng, tz: input.tz, city: input.city }, asOf);
 if (!cd || !hd || !rd) return null;

 const evt = EVENT_OPTIONS.find((e) => e.value === input.event) ?? EVENT_OPTIONS[EVENT_OPTIONS.length - 1]!;

 // Iterate Hora windows as the natural slot grid (~60 min each).
 const windows: MuhuratWindow[] = hd.horas.map((h) => {
  const midMin = ((h.startMinutes + h.endMinutes) / 2) % 1440;
  const ch = chogQualityAt(cd, midMin);
  const chScore = CHOGH_SCORE[ch.kind] ?? 0;

  // Planet match
  let planetScore = 0;
  if (evt.idealPlanets.includes(h.planet)) {
   const pos = evt.idealPlanets.indexOf(h.planet);
   planetScore = 40 - pos * 8; // 40 / 32 / 24 ...
  } else if (h.quality === 'auspicious') {
   planetScore = 10;
  } else if (h.quality === 'inauspicious') {
   planetScore = -25;
  }

  // Rahu / Yamaganda / Gulika overlap penalty
  const startWrapped = h.startMinutes % 1440;
  const endWrapped = h.endMinutes % 1440;
  const rahuRes = startWrapped <= endWrapped
   ? rahuPenaltyAt(rd, startWrapped, endWrapped)
   : rahuPenaltyAt(rd, startWrapped, 1440); // night part — Rahu Kalam is day-only so usually no overlap

  // Day-half bonus (most events prefer daylight for visibility / tradition)
  const dayBonus = h.isDay ? 10 : -5;

  const raw = chScore + planetScore + rahuRes.penalty + dayBonus + 50; // baseline +50
  const score = Math.max(0, Math.min(100, raw));

  const reasons: string[] = [];
  if (chScore > 0) reasons.push(`${ch.kind} Choghadiya`);
  if (planetScore > 0 && evt.idealPlanets.includes(h.planet)) reasons.push(`${h.planet} hora — ideal for ${evt.label.toLowerCase()}`);
  else if (h.quality === 'auspicious') reasons.push(`${h.planet} hora (auspicious)`);
  if (h.isDay) reasons.push('Daytime');

  let verdict: MuhuratWindow['verdict'] = 'fair';
  if (score >= 80) verdict = 'excellent';
  else if (score >= 65) verdict = 'good';
  else if (score >= 45) verdict = 'fair';
  else verdict = 'avoid';

  return {
   startTime: h.startTime,
   endTime: h.endTime,
   startMinutes: h.startMinutes,
   endMinutes: h.endMinutes,
   score,
   verdict,
   horaPlanet: h.planet,
   choghadiyaName: ch.kind,
   reasons,
   warnings: rahuRes.warnings,
  };
 });

 const topWindows = [...windows].sort((a, b) => b.score - a.score).slice(0, 6);

 return {
  date: cd.date,
  city: cd.city,
  weekday: cd.weekday,
  event: input.event,
  eventLabel: evt.label,
  sunrise: cd.sunrise,
  sunset: cd.sunset,
  topWindows,
  allWindows: windows,
  choghadiya: cd,
  hora: hd,
  rahuKalam: rd,
 };
}
