/**
 * Astrologer weekly availability, web side. The API twin is
 * apps/api/src/lib/astrologer-availability.ts, which is what POST
 * /consultation/book enforces; `__tests__/astrologer-availability.test.ts`
 * pins the two to the same answers, so edit both together.
 *
 * Two shapes are stored in the same JSON column (the web grid and the mobile
 * app wrote different ones and overwrote each other):
 *   web    { Monday: { morning, afternoon, evening }, ... }   12-17 / 17-22
 *   mobile { weekly: [{ day: 'Mon', morning, ... }, ...] }     12-18 / 18-22
 * Hours are IST.
 */

export interface DaySlots {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
}

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

/** What GET /astrology/astrologers/:id returns as `availability`. */
export interface PublicAvailability {
  days: Record<WeekDay, DaySlots>;
  hours: { morning: string; afternoon: string; evening: string };
  timezone: 'IST';
}

const SUN_FIRST: WeekDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function slots(v: unknown): DaySlots | null {
  if (!isRecord(v)) return null;
  return { morning: v.morning === true, afternoon: v.afternoon === true, evening: v.evening === true };
}

const SHORT: Record<string, WeekDay> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

/**
 * The portal grid from whatever is stored. `null` = nothing recognisable stored
 * (never saved, `{}`, or an unknown shape): the page must say so rather than
 * show an invented schedule as if it were saved.
 */
export function parseStoredAvailability(raw: unknown): Record<WeekDay, DaySlots> | null {
  if (!isRecord(raw)) return null;
  const out = {} as Record<WeekDay, DaySlots>;
  let seen = 0;
  const closed = (): DaySlots => ({ morning: false, afternoon: false, evening: false });
  for (const d of WEEK_DAYS) out[d] = closed();

  if (Array.isArray(raw.weekly)) {
    for (const entry of raw.weekly) {
      if (!isRecord(entry) || typeof entry.day !== 'string') continue;
      const day = SHORT[entry.day.slice(0, 3).toLowerCase()];
      const s = slots(entry);
      if (day && s) {
        out[day] = s;
        seen++;
      }
    }
  } else {
    for (const d of WEEK_DAYS) {
      const s = slots(raw[d]);
      if (s) {
        out[d] = s;
        seen++;
      }
    }
  }
  return seen > 0 ? out : null;
}

function openAt(a: PublicAvailability, at: Date): boolean {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const day = SUN_FIRST[ist.getUTCDay()]!;
  const s = a.days[day];
  if (!s) return false;
  const hour = ist.getUTCHours() + ist.getUTCMinutes() / 60;
  const bound = (range: string) => range.split('-').map((x) => Number(x.slice(0, 2))) as [number, number];
  const [m0, a0] = bound(a.hours.morning);
  const [, e0] = bound(a.hours.afternoon);
  const [, e1] = bound(a.hours.evening);
  if (hour >= m0 && hour < a0) return s.morning;
  if (hour >= a0 && hour < e0) return s.afternoon;
  if (hour >= e0 && hour < e1) return s.evening;
  return false;
}

/** Every minute of the session falls in a window the astrologer ticked. No schedule = no restriction. */
export function isSlotAvailable(a: PublicAvailability | null | undefined, start: Date, minutes: number): boolean {
  if (!a) return true;
  if (Number.isNaN(start.getTime())) return false;
  for (let m = 0; m < minutes; m++) {
    if (!openAt(a, new Date(start.getTime() + m * 60_000))) return false;
  }
  return true;
}

const SLOT_LABEL = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' } as const;

/** One line per open day: "Mon: Morning 06:00-12:00, Afternoon 12:00-17:00". */
export function availabilitySummary(a: PublicAvailability): Array<{ day: WeekDay; text: string }> {
  const rows: Array<{ day: WeekDay; text: string }> = [];
  for (const day of WEEK_DAYS) {
    const s = a.days[day];
    const parts = (['morning', 'afternoon', 'evening'] as const)
      .filter((k) => s?.[k])
      .map((k) => `${SLOT_LABEL[k]} ${a.hours[k].replace('-', '–')}`);
    if (parts.length) rows.push({ day, text: parts.join(', ') });
  }
  return rows;
}
