/**
 * The Vedic calculators, in the app.
 *
 * WHAT CHANGED, AND WHY THE OLD REASON STOPPED HOLDING
 * ---------------------------------------------------
 * app/(devotee)/astrology.tsx used to send devotees to the website for all
 * sixteen of these, with a reason that was true when it was written: they
 * "compute ENTIRELY in the browser from apps/web/lib … not a shared package,
 * and the API exposes no endpoint for any of them." The second half is still
 * true. The first half was a fact about where the file sat, not about the
 * maths — and a pure function can be moved.
 *
 * So it was moved. packages/shared/src/astrology now owns the Ashtakoot
 * scorer, the Meeus moon/Mars longitude series, the Lahiri ayanamsa, the
 * Almanac-for-Computers sunrise solver and the numerology tables;
 * apps/web/lib re-exports them; this module imports the same functions. The
 * two clients cannot disagree because there is only one implementation —
 * proved by identity in apps/web/__tests__/astrology-shared-parity.test.ts and
 * by fixed-input equality in lib/__tests__/astrology-parity.test.ts.
 *
 * WHAT IS STILL A HAND-OFF, AND WHY
 * ---------------------------------
 * Lal Kitab, Vastu, Pitra Dosh, Pancha Pakshi and Baby Name are editorial
 * lookups over large prose datasets rather than calculations — porting them
 * means shipping ~90KB of copy into the bundle for a table the website already
 * renders well. Sade Sati, Dasha, Hora, Shubh Muhurat and Kaal Sarp DO compute
 * and are portable on the same footing as these five; they are simply not
 * built yet. Both groups stay on the "More Vedic calculators" hand-off, which
 * still declares that it leaves the app.
 *
 * WHAT IS DELIBERATELY NOT USED
 * -----------------------------
 * `GET /astrology/compatibility`. It scores two rashi NAMES with arithmetic
 * over their character codes (apps/api/src/services/astrology.service.ts,
 * getCompatibility) and returns a fixed list of "strengths" and "challenges"
 * regardless of input. It is not an Ashtakoot and nothing here calls it.
 */

export {
 // Gun Milan
 computeMilan,
 allNakshatraOptions,
 // Birth chart basics
 findNakshatra,
 checkManglik,
 TIMEZONE_OPTIONS,
 // Numerology
 computeNumerology,
 getMeaning,
 // Daily windows
 computeChoghadiya,
 computeRahuKalam,
 CITY_OPTIONS,
 // Reference data
 NAKSHATRA_CORE,
 MANGLIK_REMEDIES,
 CANCELLATION_RULES,
} from '@poojly/shared/astrology';

export type {
 MilanReport,
 GunaScore,
 NakshatraCore,
 NakshatraFinderInput,
 NakshatraFinderResult,
 ManglikResult,
 NumerologyResult,
 NumberMeaning,
 ChoghadiyaDay,
 ChoghadiyaPeriod,
 RahuKalamDay,
 DoshaWindow,
} from '@poojly/shared/astrology';

/** A tool the devotee can open without leaving the app. */
export type AstrologyTool = {
 /** expo-router path, relative to the (devotee) group. */
 route: string;
 title: string;
 body: string;
 /** Ionicons glyph name — kept as a string so this module stays RN-free. */
 icon: string;
};

/**
 * The in-app tool registry. app/(devotee)/astrology.tsx renders this list, so
 * a screen cannot be built and then left unreachable — the registry is the
 * only place a route is written down, and lib/__tests__/astrology-parity
 * .test.ts checks every entry against a real file in app/(devotee).
 */
export const ASTROLOGY_TOOLS: AstrologyTool[] = [
 {
  route: '/(devotee)/kundli-milan',
  title: 'Kundli Milan',
  body: 'Ashtakoot Gun Milan out of 36 — Varna to Nadi, with the Nadi, Bhakoot and Gana dosh flags.',
  icon: 'heart',
 },
 {
  route: '/(devotee)/numerology',
  title: 'Numerology',
  body: 'Life path and birthday numbers, plus Chaldean name, soul urge and personality numbers.',
  icon: 'calculator',
 },
 {
  route: '/(devotee)/nakshatra-finder',
  title: 'Nakshatra finder',
  body: 'Your janma nakshatra, pada and chandra rashi from date, time and timezone of birth.',
  icon: 'star',
 },
 {
  route: '/(devotee)/manglik',
  title: 'Manglik check',
  body: 'Mangal dosh from chandra-lagna, its severity, and the traditional cancellation rules.',
  icon: 'flame',
 },
 {
  route: '/(devotee)/rahu-kalam',
  title: 'Rahu Kalam & Choghadiya',
  body: 'Today’s Rahu, Yamaganda and Gulika windows plus all 16 choghadiya periods for your city.',
  icon: 'time',
 },
];

/** YYYY-MM-DD, and a real calendar date. */
export function isValidDateInput(value: string): boolean {
 const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
 if (!m) return false;
 const y = Number(m[1]);
 const mo = Number(m[2]);
 const d = Number(m[3]);
 if (mo < 1 || mo > 12 || d < 1) return false;
 const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
 const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
 return d <= lengths[mo - 1]!;
}

/** HH:MM on a 24-hour clock. */
export function isValidTimeInput(value: string): boolean {
 const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
 if (!m) return false;
 const h = Number(m[1]);
 const min = Number(m[2]);
 return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/**
 * The one message a birth-details form shows, or null when it can compute.
 * Returned rather than thrown so the screen can render it inline instead of
 * interrupting with an Alert.
 */
export function birthInputError(dob: string, time: string): string | null {
 if (!dob.trim() && !time.trim()) return null;
 if (!isValidDateInput(dob)) return 'Birth date must be a real date in YYYY-MM-DD form.';
 if (!isValidTimeInput(time)) return 'Birth time must be HH:MM on a 24-hour clock.';
 return null;
}

/** True when both fields are filled and valid — i.e. the tool can run. */
export function canComputeBirth(dob: string, time: string): boolean {
 return isValidDateInput(dob) && isValidTimeInput(time);
}

/** Today in the devotee's own timezone, as YYYY-MM-DD. */
export function todayLocalISO(now: Date = new Date()): string {
 const y = now.getFullYear();
 const m = String(now.getMonth() + 1).padStart(2, '0');
 const d = String(now.getDate()).padStart(2, '0');
 return `${y}-${m}-${d}`;
}

/** "22 / 36" style label — the score a devotee actually looks for. */
export function milanScoreLabel(total: number, maxTotal: number): string {
 // Half-points are real in Tara and Graha Maitri, so 24.5 must not print as 24.
 const shown = Number.isInteger(total) ? String(total) : total.toFixed(1);
 return `${shown} / ${maxTotal}`;
}
