/**
 * The astrologer's weekly availability blob.
 *
 * NO FABRICATED SCHEDULE.
 * -----------------------
 * `app/(astrologer)/availability.tsx` used to open with this literal:
 *
 *   const INITIAL: Slot[] = [
 *     { day: 'Mon', morning: true,  afternoon: true,  evening: false },
 *     { day: 'Tue', morning: true,  afternoon: true,  evening: true  },
 *     { day: 'Wed', morning: false, afternoon: true,  evening: true  },
 *     { day: 'Thu', morning: true,  afternoon: false, evening: true  },
 *     { day: 'Fri', morning: true,  afternoon: true,  evening: true  },
 *     { day: 'Sat', morning: false, afternoon: true,  evening: false },
 *     { day: 'Sun', morning: false, afternoon: false, evening: false },
 *   ];
 *
 * It never read what the astrologer had actually saved — `useAstrologers()`,
 * the PUBLIC directory, was the only thing it fetched, and its result was
 * discarded. So the screen asserted a fourteen-slot working week to every
 * astrologer on the platform, including one who had deliberately set none, and
 * the subtitle counted those invented slots as "14 active slots this week".
 *
 * Worse on write: `save()` PATCHes the WHOLE week. Flipping one switch —
 * turning Sunday evening ON, say — published all thirteen other invented slots
 * as the astrologer's committed schedule, because `PATCH
 * /astrologer-portal/availability` replaces the stored blob wholesale
 * ("partial merging is a UI concern", astrologer-portal.ts:322).
 *
 * The real value lives on `AstrologerProfile.availability` and comes back on
 * `GET /astrologer-portal/dashboard` as `profile.availability`. This module
 * parses it. When there is nothing stored the answer is `null` — an empty week,
 * said out loud — never a guess.
 */

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type SlotKey = 'morning' | 'afternoon' | 'evening';

export interface DayAvailability {
  day: Weekday;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
}

export const SLOT_LABELS: ReadonlyArray<{ key: SlotKey; label: string; range: string }> =
  Object.freeze([
    { key: 'morning', label: 'Morning', range: '06:00 – 12:00' },
    { key: 'afternoon', label: 'Afternoon', range: '12:00 – 18:00' },
    { key: 'evening', label: 'Evening', range: '18:00 – 22:00' },
  ]);

/** Seven days, nothing offered. The honest starting point for an unset profile. */
export function emptyWeek(): DayAvailability[] {
  return WEEKDAYS.map((day) => ({ day, morning: false, afternoon: false, evening: false }));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Read `AstrologerProfile.availability` back into the grid.
 *
 * The column is free-form JSON by design (astrologer-portal.ts:62-71), so this
 * accepts only the one shape this screen writes — `{weekly: [{day, morning,
 * afternoon, evening}, …]}` — and answers `null` for anything else, including
 * `null`, `{}`, and a blob some other client wrote. `null` means "this screen
 * cannot show you what is stored", which is a different statement from "you
 * have nothing stored" and the screen says the right one.
 */
export function parseStoredAvailability(stored: unknown): DayAvailability[] | null {
  if (!isRecord(stored)) return null;
  const weekly = stored.weekly;
  if (!Array.isArray(weekly) || weekly.length === 0) return null;

  const byDay = new Map<string, Record<string, unknown>>();
  for (const entry of weekly) {
    if (!isRecord(entry)) continue;
    const day = typeof entry.day === 'string' ? entry.day.slice(0, 3) : '';
    const match = WEEKDAYS.find((d) => d.toLowerCase() === day.toLowerCase());
    if (match) byDay.set(match, entry);
  }
  if (byDay.size === 0) return null;

  return WEEKDAYS.map((day) => {
    const entry = byDay.get(day);
    return {
      day,
      morning: entry?.morning === true,
      afternoon: entry?.afternoon === true,
      evening: entry?.evening === true,
    };
  });
}

/**
 * The body for `PATCH /astrologer-portal/availability`, which wants
 * `{availability: <blob>}`. This function returns the blob; the caller wraps.
 *
 * `updatedAt` is included because the write replaces the stored value entirely
 * and nothing else records when the astrologer last touched their schedule.
 */
export function buildAvailabilityPayload(
  slots: DayAvailability[],
  now: Date = new Date(),
): { weekly: DayAvailability[]; updatedAt: string } {
  return {
    weekly: WEEKDAYS.map((day) => {
      const found = slots.find((s) => s.day === day);
      return {
        day,
        morning: found?.morning === true,
        afternoon: found?.afternoon === true,
        evening: found?.evening === true,
      };
    }),
    updatedAt: now.toISOString(),
  };
}

/** How many of the 21 slots are offered. Counts what is on screen, nothing else. */
export function countActiveSlots(slots: DayAvailability[]): number {
  return slots.reduce(
    (acc, s) => acc + Number(s.morning) + Number(s.afternoon) + Number(s.evening),
    0,
  );
}
