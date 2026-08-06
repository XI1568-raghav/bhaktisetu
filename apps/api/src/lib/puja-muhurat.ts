// Per-puja-type muhurat scoring — the booking-slot differentiator.
//
// Rules drawn from Muhurta Chintamani, Brihat Samhita and Dharmasindhu, scoped
// to the two launch SKUs (Griha Pravesh + Satyanarayan Katha). Built on the
// same astronomy helpers as `lib/muhurat.ts` (Meeus-approx + Lahiri ayanamsa)
// so these answers are always consistent with `/panchang/today`.
//
// What a caller gets per day: a grade (shubh / neutral / avoid), concrete
// bookable time *windows* with the Rahukaal minutes subtracted, and flags
// (Purnima / Ekadashi / Amavasya / eclipse-season / month-note) the UI can
// render as badges or greys. The booking date picker consumes this to turn a
// blind calendar into a guided shubh-window selector — the thing every
// competitor publishes as static data but none embeds in the slot picker.

import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PujaType = 'GRIHA_PRAVESH' | 'SATYANARAYAN';

export type MuhuratGrade = 'shubh' | 'neutral' | 'avoid';

export interface MuhuratWindow {
  from: string; // HH:MM
  to: string;   // HH:MM
  label: string;
}

export interface DayInputs {
  /** YYYY-MM-DD */
  date: string;
  /** 0=Sunday … 6=Saturday */
  dayOfWeek: number;
  /** Tithi number 1..30 (1=Shukla Pratipada, 15=Purnima, 30=Amavasya). */
  tithiNumber: number;
  /** Nakshatra name (title-case, e.g. "Rohini"). */
  nakshatra: string;
  /** Calendar month 1..12. */
  month: number;
  /** Sunrise / sunset "HH:MM" (24h, local). */
  sunrise: string;
  sunset: string;
  /** Rahukaal window "HH:MM - HH:MM". */
  rahuKaal: string;
}

export interface PujaMuhuratDay {
  date: string;
  grade: MuhuratGrade;
  /** 0..100 — higher is more auspicious for the puja type. */
  score: number;
  /** Bookable windows after Rahukaal subtraction (empty if grade=avoid). */
  windows: MuhuratWindow[];
  /** Raw Rahukaal "HH:MM - HH:MM" so the UI can grey it in a time dropdown. */
  rahuKaal: string;
  flags: string[];
  reasons: string[];
  warnings: string[];
}

// ─── Classical rule tables (cited) ───────────────────────────────────────────

// Griha Pravesh auspicious tithis (Muhurta Chintamani): Dwitiya, Tritiya,
// Panchami, Saptami, Dashami, Ekadashi, Trayodashi → numbers 2,3,5,7,10,11,13.
const GP_TITHIS = new Set([2, 3, 5, 7, 10, 11, 13]);
// Griha Pravesh auspicious nakshatras: Rohini, Mrigashira, Uttara Phalguni,
// Chitra, Anuradha, Uttara Ashadha, Uttara Bhadrapada, Revati.
const GP_NAKSHATRAS = new Set([
  'Rohini', 'Mrigashira', 'Uttara Phalguni', 'Chitra',
  'Anuradha', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati',
]);
// Rikta tithis (4, 9, 14) are penalised for any griha-entry work.
const RIKTA_TITHIS = new Set([4, 9, 14]);

// Weekday auspiciousness for Griha Pravesh. Mon/Wed/Thu/Fri preferred;
// Tue/Sat penalised (Tue=Mangal conflict for new-home entry, Sat=Shani delay).
const GP_WEEKDAY_SCORE: Record<number, number> = { 0: 0, 1: 8, 2: -10, 3: 7, 4: 9, 5: 8, 6: -8 };

// Satyanarayan Katha: Purnima (15) is the canonical day. Shukla Ekadashi (11)
// and Shukla Chaturdashi (14) carry a bonus. Thursday (Guru-var) is preferred.
const SN_BONUS_TITHIS = new Set([11, 14]);

// ─── Time helpers ────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function minsToHHMM(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = Math.floor(m % 60);
  return `${pad2(h)}:${pad2(mm)}`;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Parse a "HH:MM - HH:MM" window into [startMin, endMin]. */
export function parseWindow(win: string): [number, number] {
  const [a, b] = win.split('-').map((x) => x.trim());
  return [parseHHMM(a ?? '0'), parseHHMM(b ?? '0')];
}

/**
 * Subtract the Rahukaal window from a candidate window, splitting it. Drops
 * any resulting sliver < 15 min (not a usable bookable slot). Returns the
 * surviving sub-windows in minutes.
 */
export function subtractWindow(
  win: [number, number],
  rahu: [number, number],
  minSlot = 15,
): Array<[number, number]> {
  const [ws, we] = win;
  const [rs, re] = rahu;
  // No overlap.
  if (re <= ws || rs >= we) return we - ws >= minSlot ? [[ws, we]] : [];
  const out: Array<[number, number]> = [];
  if (rs > ws && rs - ws >= minSlot) out.push([ws, rs]);
  if (re < we && we - re >= minSlot) out.push([re, we]);
  return out;
}

// Eclipse-season proxy: we do not compute lunar nodes, so we flag a coarse
// window. A day within ±3 days of a node-crossing is treated as cautionary.
// Node crossings recur ~ every 173.3 days; anchored to a known 2026 eclipse.
const ECLIPSE_EPOCH_UTC = Date.UTC(2026, 1, 17); // 2026-02-17 annular solar eclipse
const ECLIPSE_CYCLE_DAYS = 173.3;
function eclipseSeason(dateStr: string): boolean {
  const t = Date.parse(`${dateStr}T00:00:00.000Z`);
  if (isNaN(t)) return false;
  const days = (t - ECLIPSE_EPOCH_UTC) / (1000 * 60 * 60 * 24);
  const mod = ((days % ECLIPSE_CYCLE_DAYS) + ECLIPSE_CYCLE_DAYS) % ECLIPSE_CYCLE_DAYS;
  const dist = Math.min(mod, ECLIPSE_CYCLE_DAYS - mod);
  return dist <= 3;
}

// Month-note cautions (Chaturmas / Pitru Paksha / best-season), keyed by
// calendar month. These are advisories the pandit confirms, not hard blocks.
function monthNote(month: number): string | null {
  if (month === 7 || month === 8) return 'Chaturmas — many families defer Griha Pravesh; confirm with your pandit.';
  if (month === 9 || month === 10) return 'Pitru Paksha window possible — confirm the exact muhurat with your pandit.';
  if (month === 1 || month === 2) return 'Magha–Phalguna — regarded as the best season for Griha Pravesh.';
  return null;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function buildWindows(input: DayInputs): MuhuratWindow[] {
  const rahu = parseWindow(input.rahuKaal);
  const sr = parseHHMM(input.sunrise);
  const ss = parseHHMM(input.sunset);
  const midday = (sr + ss) / 2;
  const dayLen = ss - sr;
  const muhurtaUnit = dayLen / 15;

  // Candidate windows (real sun times): morning, Abhijit (midday ±24m), Vijay.
  const candidates: Array<{ win: [number, number]; label: string }> = [
    { win: [sr + 30, Math.min(sr + 30 + 96, ss)], label: 'Morning' },
    { win: [midday - 24, midday + 24], label: 'Abhijit Muhurat' },
    { win: [sr + muhurtaUnit * 10, sr + muhurtaUnit * 11], label: 'Vijay Muhurat' },
  ];

  const out: MuhuratWindow[] = [];
  for (const c of candidates) {
    for (const [s, e] of subtractWindow(c.win, rahu)) {
      out.push({ from: minsToHHMM(s), to: minsToHHMM(e), label: c.label });
    }
  }
  return out;
}

export function computePujaMuhuratDay(pujaType: PujaType, input: DayInputs): PujaMuhuratDay {
  let score = 50;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const flags: string[] = [];

  const { tithiNumber, nakshatra, dayOfWeek, month } = input;

  // Tithi flags
  if (tithiNumber === 15) flags.push('Purnima');
  if (tithiNumber === 30) flags.push('Amavasya');
  if (tithiNumber === 11 || tithiNumber === 26) flags.push('Ekadashi');

  if (pujaType === 'GRIHA_PRAVESH') {
    if (GP_TITHIS.has(tithiNumber)) { score += 12; reasons.push(`Tithi ${tithiNumber} is auspicious for Griha Pravesh.`); }
    if (RIKTA_TITHIS.has(tithiNumber)) { score -= 12; warnings.push(`Tithi ${tithiNumber} is Rikta — avoided.`); }
    if (tithiNumber === 30) { score -= 40; warnings.push('Amavasya — Griha Pravesh is not performed.'); }
    if (GP_NAKSHATRAS.has(nakshatra)) { score += 18; reasons.push(`${nakshatra} is a Griha-Pravesh nakshatra.`); }
    const wd = GP_WEEKDAY_SCORE[dayOfWeek] ?? 0;
    score += wd;
    if (wd <= -8) warnings.push('This weekday is generally avoided for Griha Pravesh.');
  } else {
    // SATYANARAYAN
    if (tithiNumber === 15) { score += 30; reasons.push('Purnima is the canonical Satyanarayan Katha day.'); }
    if (SN_BONUS_TITHIS.has(tithiNumber)) { score += 12; reasons.push(`Tithi ${tithiNumber} (Shukla) favours Satyanarayan Katha.`); }
    if (tithiNumber === 30) { score -= 15; warnings.push('Amavasya — not preferred for Satyanarayan Katha.'); }
    if (dayOfWeek === 4) { score += 8; reasons.push('Thursday (Guru-var) is preferred for Satyanarayan.'); }
  }

  if (eclipseSeason(input.date)) {
    score -= 8;
    flags.push('eclipse-season');
    warnings.push('Eclipse-season window — verify the muhurat with your pandit.');
  }
  const note = monthNote(month);
  if (note) { flags.push('month-note'); warnings.push(note); }

  score = Math.max(0, Math.min(100, score));
  const grade: MuhuratGrade = score >= 60 ? 'shubh' : score >= 40 ? 'neutral' : 'avoid';
  const windows = grade === 'avoid' ? [] : buildWindows(input);

  return {
    date: input.date,
    grade,
    score,
    windows,
    rahuKaal: input.rahuKaal,
    flags,
    reasons,
    warnings,
  };
}

// ─── Horizon scan ────────────────────────────────────────────────────────────

export const PujaMuhuratQuerySchema = z.object({
  pujaType: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/[\s-]+/g, '_') : v),
    z.enum(['GRIHA_PRAVESH', 'SATYANARAYAN']),
  ),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD').optional(),
  days: z.coerce.number().int().min(1).max(92).default(30),
  city: z.string().min(1).max(80).default('Gurugram'),
});
export type PujaMuhuratQuery = z.infer<typeof PujaMuhuratQuerySchema>;

/**
 * Rank the top-N days across a ≤92-day horizon for a puja type. `getInputs`
 * supplies per-day panchang inputs (tithi/nakshatra/sun/rahukaal) so this layer
 * stays pure and testable; the service wires it to `computePanchang`.
 */
export function findPujaMuhurats(
  pujaType: PujaType,
  days: DayInputs[],
  topN = 5,
): PujaMuhuratDay[] {
  const scored = days.map((d) => computePujaMuhuratDay(pujaType, d));
  scored.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return scored.slice(0, topN);
}
