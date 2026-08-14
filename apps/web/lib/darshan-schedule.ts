/**
 * Today's live-darshan schedule for the /darshan browse page.
 *
 * TD-02 (2026-08-12 sweep): the browse page used to carry a hand-written table
 * whose rows had a literal `status: 'live'` and an href of `/darshan` — the
 * page they were rendered on. So the highest-intent action on the page
 * ("Watch Mahakaleshwar Bhasma Aarti now") reloaded the current page, and it
 * claimed the 04:00 Bhasma Aarti was streaming at any hour of the day.
 *
 * Rows are now derived from the same per-temple aarti data the detail page
 * uses (lib/aarti-schedules.ts) and the status is resolved against the IST
 * clock at render time. A temple only appears here if it has BOTH a published
 * aarti schedule and a real stream on /darshan/<slug>; nothing is invented to
 * pad the table.
 */
import { AARTI_SCHEDULES, nowMinutesIST } from './aarti-schedules';

export type DarshanScheduleStatus = 'live' | 'completed' | 'upcoming';

export interface DarshanScheduleRow {
  /** Temple slug — resolves at /darshan/<slug>. */
  slug: string;
  /** Display name as it appears in the table. */
  temple: string;
  /** 12-hour IST display time, e.g. "4:00 AM". */
  time: string;
  event: string;
  status: DarshanScheduleStatus;
  href: string;
  /** Minutes past IST midnight — exposed so callers can sort/verify. */
  minutesIST: number;
}

/**
 * Curated highlights across the day. Every slug here must also be a key of
 * CHANNEL_BY_SLUG in app/darshan/[id]/page.tsx, otherwise the row would send a
 * devotee to a "Coming soon" panel. `darshan-schedule-links.test.ts` enforces
 * that both sides stay in step.
 */
const HIGHLIGHTS: { slug: string; temple: string; event: string }[] = [
  { slug: 'kashi-vishwanath', temple: 'Kashi Vishwanath', event: 'Mangala Aarti' },
  { slug: 'tirupati', temple: 'Tirupati Balaji', event: 'Suprabhatam' },
  { slug: 'golden-temple', temple: 'Golden Temple, Amritsar', event: 'Asa di Var' },
  { slug: 'mahakaleshwar', temple: 'Mahakaleshwar', event: 'Bhasma Aarti' },
  { slug: 'shirdi', temple: 'Shirdi Sai Baba', event: 'Kakad Aarti' },
  { slug: 'jagannath-puri', temple: 'Jagannath, Puri', event: 'Mangala Aarti' },
  { slug: 'siddhivinayak', temple: 'Siddhivinayak, Mumbai', event: 'Kakad Aarti' },
  { slug: 'vaishno-devi', temple: 'Vaishno Devi', event: 'Mangala Aarti' },
  { slug: 'somnath', temple: 'Somnath', event: 'Morning Aarti' },
  { slug: 'kashi-vishwanath', temple: 'Kashi Vishwanath', event: 'Bhog Aarti' },
  { slug: 'golden-temple', temple: 'Golden Temple, Amritsar', event: 'Rehras Sahib' },
  { slug: 'jagannath-puri', temple: 'Jagannath, Puri', event: 'Sandhya Aarti' },
  { slug: 'kashi-vishwanath', temple: 'Kashi Vishwanath', event: 'Shayan Aarti' },
  { slug: 'mahakaleshwar', temple: 'Mahakaleshwar', event: 'Shayan Aarti' },
];

function to12h(time24: string): string {
  const [hStr, m] = time24.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m ?? '00'} ${suffix}`;
}

export function darshanScheduleRows(now: Date = new Date()): DarshanScheduleRow[] {
  const nowMin = nowMinutesIST(now);

  const rows: DarshanScheduleRow[] = [];
  for (const h of HIGHLIGHTS) {
    const sched = AARTI_SCHEDULES[h.slug];
    if (!sched) continue;
    const slot = sched.slots.find((s) => s.event === h.event);
    if (!slot) continue;

    const status: DarshanScheduleStatus =
      nowMin >= slot.minutes && nowMin < slot.minutes + slot.durationMin
        ? 'live'
        : nowMin >= slot.minutes + slot.durationMin
          ? 'completed'
          : 'upcoming';

    rows.push({
      slug: h.slug,
      temple: h.temple,
      time: to12h(slot.time),
      event: slot.event,
      status,
      href: `/darshan/${h.slug}`,
      minutesIST: slot.minutes,
    });
  }

  return rows.sort((a, b) => a.minutesIST - b.minutesIST);
}
