/**
 * The astrologer's weekly availability, read back out of the free-form JSON
 * column `AstrologerProfile.availability`.
 *
 * WHY THIS EXISTS. The web portal told astrologers "Devotees can book
 * consultations only during your available slots" and stored the grid, but
 * nothing ever read it back: the booking endpoint accepted any `scheduledAt`,
 * and the public profile did not carry the hours at all. The schedule was
 * decoration. This is the one reader, so the booking route and the public
 * payload cannot disagree about what "available" means.
 *
 * TWO SHAPES EXIST IN THE WILD (they were written by different clients and
 * overwrite each other):
 *   web    `{ Monday: { morning, afternoon, evening }, ... }`  (full day names)
 *          morning 06-12, afternoon 12-17, evening 17-22 (the labels the web grid prints)
 *   mobile `{ weekly: [{ day: 'Mon', morning, afternoon, evening }, ...] }`
 *          morning 06-12, afternoon 12-18, evening 18-22 (the labels the app prints)
 * Each is read with the hours its own screen printed, so what an astrologer
 * ticked is what is enforced. Anything else parses to `null` ("no schedule on
 * file"), which means NO restriction: an unreadable blob must never lock an
 * astrologer out of bookings.
 *
 * All hours are India Standard Time (UTC+05:30, no daylight saving), the only
 * zone this product schedules in.
 */

export type DayBuckets = { morning: boolean; afternoon: boolean; evening: boolean };

/** Sunday-first, to line up with `Date#getUTCDay` after the IST shift. */
export const WEEKDAYS_SUN_FIRST = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export type WeekdayName = (typeof WEEKDAYS_SUN_FIRST)[number];

export interface WeeklyAvailability {
  /** Day name -> which of the three windows are open. A day not listed is closed. */
  days: Partial<Record<WeekdayName, DayBuckets>>;
  /** Hour boundaries (IST): [morningStart, afternoonStart, eveningStart, eveningEnd]. */
  bounds: readonly [number, number, number, number];
}

const WEB_BOUNDS = [6, 12, 17, 22] as const;
const MOBILE_BOUNDS = [6, 12, 18, 22] as const;

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function buckets(v: unknown): DayBuckets | null {
  if (!isRecord(v)) return null;
  return { morning: v.morning === true, afternoon: v.afternoon === true, evening: v.evening === true };
}

const SHORT_TO_FULL: Record<string, WeekdayName> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

/**
 * `null` when nothing recognisable is stored (never saved, `{}`, or a shape this
 * reader does not know). A recognisable grid with every window off is NOT null:
 * that is an astrologer who deliberately offers no scheduled slots.
 */
export function parseWeeklyAvailability(raw: unknown): WeeklyAvailability | null {
  if (!isRecord(raw)) return null;

  if (Array.isArray(raw.weekly)) {
    const days: WeeklyAvailability['days'] = {};
    let seen = 0;
    for (const entry of raw.weekly) {
      if (!isRecord(entry) || typeof entry.day !== 'string') continue;
      const full = SHORT_TO_FULL[entry.day.slice(0, 3).toLowerCase()];
      const b = buckets(entry);
      if (!full || !b) continue;
      days[full] = b;
      seen++;
    }
    return seen > 0 ? { days, bounds: MOBILE_BOUNDS } : null;
  }

  const days: WeeklyAvailability['days'] = {};
  let seen = 0;
  for (const name of WEEKDAYS_SUN_FIRST) {
    const b = buckets(raw[name]);
    if (!b) continue;
    days[name] = b;
    seen++;
  }
  return seen > 0 ? { days, bounds: WEB_BOUNDS } : null;
}

/** The IST weekday and the minutes since IST midnight for an instant. */
function istParts(at: Date): { day: WeekdayName; minuteOfDay: number } {
  const shifted = new Date(at.getTime() + IST_OFFSET_MS);
  return {
    day: WEEKDAYS_SUN_FIRST[shifted.getUTCDay()]!,
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function openAt(avail: WeeklyAvailability, at: Date): boolean {
  const { day, minuteOfDay } = istParts(at);
  const b = avail.days[day];
  if (!b) return false;
  const [m0, a0, e0, e1] = avail.bounds;
  const h = minuteOfDay / 60;
  if (h >= m0 && h < a0) return b.morning;
  if (h >= a0 && h < e0) return b.afternoon;
  if (h >= e0 && h < e1) return b.evening;
  return false;
}

/**
 * Is every minute of `[start, start + minutes)` inside an open window? A
 * session that starts in an open morning window and runs past noon needs the
 * afternoon window open too: the astrologer only promised the windows they
 * ticked. No schedule on file (`avail === null`) means no restriction.
 */
export function isWithinAvailability(
  avail: WeeklyAvailability | null,
  start: Date,
  minutes: number,
): boolean {
  if (!avail) return true;
  for (let m = 0; m < minutes; m++) {
    if (!openAt(avail, new Date(start.getTime() + m * 60_000))) return false;
  }
  return true;
}

/** "Mon morning, afternoon; Tue morning ..." for an error message. IST. */
export function describeAvailability(avail: WeeklyAvailability): string {
  const label = (n: WeekdayName) => n.slice(0, 3);
  const parts: string[] = [];
  for (const name of [...WEEKDAYS_SUN_FIRST.slice(1), WEEKDAYS_SUN_FIRST[0]] as WeekdayName[]) {
    const b = avail.days[name];
    if (!b) continue;
    const open = (['morning', 'afternoon', 'evening'] as const).filter((k) => b[k]);
    if (open.length) parts.push(`${label(name)} ${open.join('/')}`);
  }
  return parts.length ? `${parts.join('; ')} (IST)` : 'no scheduled slots';
}

/**
 * The public, normalised form of a stored schedule: seven named days with the
 * three windows, or `null` when none is on file. What the booking page renders.
 */
export function publicAvailability(raw: unknown): {
  days: Record<WeekdayName, DayBuckets>;
  hours: { morning: string; afternoon: string; evening: string };
  timezone: 'IST';
} | null {
  const parsed = parseWeeklyAvailability(raw);
  if (!parsed) return null;
  const days = {} as Record<WeekdayName, DayBuckets>;
  for (const name of WEEKDAYS_SUN_FIRST) {
    days[name] = parsed.days[name] ?? { morning: false, afternoon: false, evening: false };
  }
  const [m0, a0, e0, e1] = parsed.bounds;
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return {
    days,
    hours: {
      morning: `${hh(m0)}-${hh(a0)}`,
      afternoon: `${hh(a0)}-${hh(e0)}`,
      evening: `${hh(e0)}-${hh(e1)}`,
    },
    timezone: 'IST',
  };
}
