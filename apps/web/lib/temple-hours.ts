/**
 * The devotional hours of the day, in IST.
 *
 * WHY THIS EXISTS. A devotee paying someone to perform a ritual on their behalf
 * is making a trust purchase, and the trust deficit is specific: is there really
 * a temple at the other end of this, doing a real thing, right now? Every other
 * lever we have is a claim ("verified priests", "video proof"). This one is a
 * fact the page can simply demonstrate — temples run on a clock, that clock is
 * public, and at any given moment the page can say which part of the day it is
 * at the temple and which aarti is next.
 *
 * It is deliberately NOT an animation. The page changes its ground tint with the
 * hour and states a real countdown; nothing moves, nothing is scroll-driven, and
 * there is no `prefers-reduced-motion` branch to get wrong. NN/g's scrolljacking
 * and scroll-fading findings do not apply to a thing that never moves, and this
 * audience — older, mobile, often on a slow connection — pays nothing for it.
 *
 * DAY BOUNDARIES are the traditional divisions, not clock quarters. Brahma
 * muhurta is the pre-dawn window the shastras name as most auspicious for
 * worship; sandhya is the twilight juncture when most temples run their largest
 * aarti. They are approximations of solar time — real muhurta shifts with
 * sunrise and latitude — which is why nothing here is presented as a muhurat
 * calculation. `lib/muhurat.ts` and the API's panchang service own that. This
 * module answers only "what part of the day is it", to one-hour honesty.
 */

/** Ordered, non-overlapping, covering all 1440 minutes. `ratri` wraps midnight. */
export type TempleHour = 'brahma' | 'pratah' | 'madhyahna' | 'aparahna' | 'sandhya' | 'ratri';

export interface TempleHourInfo {
  key: TempleHour;
  /** Sanskrit name, as a devotee would recognise it. */
  name: string;
  /** Plain-English gloss. Never assume the reader knows the term. */
  gloss: string;
  startMin: number;
  endMin: number;
}

/**
 * Order matters: `resolveTempleHour` returns the first window that contains the
 * minute, and `ratri` is last precisely because it is the wrap-around fallback.
 */
export const TEMPLE_HOURS: readonly TempleHourInfo[] = [
  { key: 'brahma', name: 'Brahma muhurta', gloss: 'the hour before dawn', startMin: 4 * 60, endMin: 6 * 60 },
  { key: 'pratah', name: 'Pratah', gloss: 'morning', startMin: 6 * 60, endMin: 10 * 60 },
  { key: 'madhyahna', name: 'Madhyahna', gloss: 'midday', startMin: 10 * 60, endMin: 14 * 60 },
  { key: 'aparahna', name: 'Aparahna', gloss: 'afternoon', startMin: 14 * 60, endMin: 17 * 60 },
  { key: 'sandhya', name: 'Sandhya', gloss: 'dusk', startMin: 17 * 60, endMin: 20 * 60 },
  { key: 'ratri', name: 'Ratri', gloss: 'night', startMin: 20 * 60, endMin: 4 * 60 },
] as const;

export const MINUTES_PER_DAY = 24 * 60;

/**
 * Which devotional hour a given minute-past-IST-midnight falls in.
 *
 * Input is deliberately minutes rather than a Date: every caller already holds
 * IST minutes via `nowMinutesIST` (lib/aarti-schedules.ts:159), which derives
 * them through an explicit Asia/Kolkata formatter. Passing a Date around and
 * re-deriving the timezone per call site is how the old sticky-aarti countdown
 * grew a DST bug — a viewer in London crossing their own DST transition between
 * now and the target had the countdown overstate by an hour.
 */
export function resolveTempleHour(minutesIST: number): TempleHourInfo {
  const m = ((Math.floor(minutesIST) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  for (const h of TEMPLE_HOURS) {
    if (h.startMin < h.endMin) {
      if (m >= h.startMin && m < h.endMin) return h;
    } else if (m >= h.startMin || m < h.endMin) {
      // The wrap-around window (ratri, 20:00 -> 04:00).
      return h;
    }
  }
  // Unreachable: the windows above cover all 1440 minutes. Kept because
  // noUncheckedIndexedAccess would otherwise force a non-null assertion on
  // TEMPLE_HOURS[5], which is a worse thing to have in the file.
  return TEMPLE_HOURS[TEMPLE_HOURS.length - 1] as TempleHourInfo;
}

/**
 * Minutes from `fromMin` until `targetMin`, forward, wrapping midnight.
 * Returns 0..1439. A target equal to now reads as a full day away rather than
 * 0, which is correct for "next" semantics — the slot happening right now is
 * not the one you are waiting for.
 */
export function minutesUntil(fromMin: number, targetMin: number): number {
  const delta = (targetMin - fromMin) % MINUTES_PER_DAY;
  return delta <= 0 ? delta + MINUTES_PER_DAY : delta;
}

/**
 * "in 42 min" / "in 3 hr 5 min" / "in 3 hr".
 * Under a minute reads "now" rather than "in 0 min".
 */
export function formatCountdown(mins: number): string {
  if (mins < 1) return 'now';
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `in ${h} hr` : `in ${h} hr ${m} min`;
}
