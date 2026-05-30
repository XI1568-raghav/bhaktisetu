/**
 * Per-temple aarti schedules in IST.
 *
 * Why this exists: live-darshan detail page (/darshan/[id]) previously rendered
 * a single static schedule regardless of temple. Devotee at 06:00 IST visiting
 * Mahakaleshwar saw "Bhasma Aarti (04:00 — completed)" with no current-slot
 * marker. This module resolves the CURRENT aarti slot per temple at request
 * time so the page surfaces "LIVE NOW: Mangala Aarti" plus accurate today
 * schedule.
 *
 * Times sourced from official temple websites (verified 2026-05). Drift OK
 * within ±30 min; daily-validation agent (temple-link-validator) will surface
 * if temple changes published schedule.
 */

export interface AartiSlot {
 time: string; // "04:00" 24h IST display
 minutes: number; // hour*60 + min from midnight IST
 event: string;
 durationMin: number; // window during which slot is "LIVE NOW"
}

export interface TempleAartiSchedule {
 templeSlug: string;
 aliases?: string[];
 slots: AartiSlot[];
}

function mkSlot(time: string, event: string, durationMin = 60): AartiSlot {
 const [hStr, mStr] = time.split(':');
 const h = parseInt(hStr ?? '0', 10);
 const m = parseInt(mStr ?? '0', 10);
 return { time, minutes: h * 60 + m, event, durationMin };
}

export const AARTI_SCHEDULES: Record<string, TempleAartiSchedule> = {
 'kashi-vishwanath': {
  templeSlug: 'kashi-vishwanath',
  aliases: ['kashi-vishwanath-varanasi'],
  slots: [
   mkSlot('02:30', 'Mangala Aarti', 90),
   mkSlot('11:30', 'Bhog Aarti', 60),
   mkSlot('17:00', 'Sapta Rishi Aarti', 60),
   mkSlot('19:00', 'Shringar / Sandhya Aarti', 90),
   mkSlot('21:00', 'Shayan Aarti', 60),
  ],
 },
 'tirupati': {
  templeSlug: 'tirupati',
  aliases: ['tirumala-tirupati'],
  slots: [
   mkSlot('03:00', 'Suprabhatam', 60),
   mkSlot('04:30', 'Thomala Seva', 60),
   mkSlot('08:00', 'Sahasranama Archana', 60),
   mkSlot('10:00', 'Nitya Kalyanam', 90),
   mkSlot('19:30', 'Sandhya Aaradhana', 90),
   mkSlot('22:30', 'Ekanta Seva', 60),
  ],
 },
 'siddhivinayak': {
  templeSlug: 'siddhivinayak',
  aliases: ['siddhivinayak-mumbai'],
  slots: [
   mkSlot('05:30', 'Kakad Aarti', 60),
   mkSlot('12:15', 'Naivedya', 45),
   mkSlot('19:30', 'Sandhya Aarti', 60),
   mkSlot('21:50', 'Shejaarti', 40),
  ],
 },
 'mahakaleshwar': {
  templeSlug: 'mahakaleshwar',
  aliases: ['mahakaleshwar-ujjain'],
  slots: [
   mkSlot('04:00', 'Bhasma Aarti', 90),
   mkSlot('07:30', 'Naivedya', 45),
   mkSlot('10:30', 'Bhog Aarti', 45),
   mkSlot('17:00', 'Sandhya Pujan', 60),
   mkSlot('19:00', 'Sandhya Aarti', 90),
   mkSlot('22:30', 'Shayan Aarti', 60),
  ],
 },
 'somnath': {
  templeSlug: 'somnath',
  aliases: ['somnath-gujarat'],
  slots: [
   mkSlot('07:00', 'Morning Aarti', 60),
   mkSlot('12:00', 'Noon Aarti', 60),
   mkSlot('19:00', 'Evening Aarti', 90),
  ],
 },
 'golden-temple': {
  templeSlug: 'golden-temple',
  aliases: ['golden-temple-amritsar'],
  slots: [
   mkSlot('03:00', 'Asa di Var', 120),
   mkSlot('09:00', 'Morning Hukamnama', 60),
   mkSlot('18:30', 'Rehras Sahib', 60),
   mkSlot('21:30', 'Kirtan Sohila', 60),
  ],
 },
 'shirdi': {
  templeSlug: 'shirdi',
  aliases: ['shirdi-sai-baba'],
  slots: [
   mkSlot('04:30', 'Kakad Aarti', 60),
   mkSlot('12:00', 'Madhyan Aarti', 60),
   mkSlot('18:30', 'Dhoop Aarti', 60),
   mkSlot('22:30', 'Shej Aarti', 45),
  ],
 },
 'vaishno-devi': {
  templeSlug: 'vaishno-devi',
  slots: [
   mkSlot('06:00', 'Mangala Aarti', 90),
   mkSlot('12:00', 'Noon Aarti', 60),
   mkSlot('19:00', 'Sandhya Aarti', 90),
  ],
 },
 'jagannath-puri': {
  templeSlug: 'jagannath-puri',
  slots: [
   mkSlot('05:00', 'Mangala Aarti', 90),
   mkSlot('08:00', 'Sahana Mela', 60),
   mkSlot('11:00', 'Madhyahna Dhupa', 60),
   mkSlot('19:00', 'Sandhya Aarti', 90),
   mkSlot('23:00', 'Pahuda', 45),
  ],
 },
 'iskcon-vrindavan': {
  templeSlug: 'iskcon-vrindavan',
  slots: [
   mkSlot('04:30', 'Mangala Aarti', 60),
   mkSlot('07:00', 'Darshan Aarti', 60),
   mkSlot('12:00', 'Raj Bhog Aarti', 60),
   mkSlot('16:30', 'Dhoop Aarti', 60),
   mkSlot('18:30', 'Sandhya Aarti', 60),
   mkSlot('20:15', 'Shayan Aarti', 60),
  ],
 },
};

const SLUG_INDEX: Map<string, TempleAartiSchedule> = (() => {
 const m = new Map<string, TempleAartiSchedule>();
 for (const sched of Object.values(AARTI_SCHEDULES)) {
  m.set(sched.templeSlug, sched);
  for (const a of sched.aliases ?? []) m.set(a, sched);
 }
 return m;
})();

export function getScheduleForTemple(slug: string): TempleAartiSchedule | null {
 return SLUG_INDEX.get(slug) ?? null;
}

/**
 * Server-stable IST minutes-since-midnight. Works in edge + node runtimes
 * without `Date.getTimezoneOffset` host-clock bias (CF workers run UTC).
 */
export function nowMinutesIST(now: Date = new Date()): number {
 const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
 });
 const parts = fmt.formatToParts(now);
 const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
 const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
 return h * 60 + m;
}

export interface AartiNowState {
 current: AartiSlot | null;
 next: AartiSlot;
 minutesToNext: number;
 completed: AartiSlot[];
 upcoming: AartiSlot[];
}

/**
 * Resolve where in today's aarti cycle the given temple is RIGHT NOW.
 * - `current` is non-null if nowMin falls inside [slot.minutes, slot.minutes + slot.durationMin)
 * - `next` is the next slot today, OR if all slots done, the first slot tomorrow (with minutesToNext > 0 wrapping past midnight)
 */
export function currentAartiState(slug: string, now: Date = new Date()): AartiNowState | null {
 const sched = getScheduleForTemple(slug);
 if (!sched || sched.slots.length === 0) return null;

 const nowMin = nowMinutesIST(now);
 const slots = [...sched.slots].sort((a, b) => a.minutes - b.minutes);

 const current = slots.find((s) => nowMin >= s.minutes && nowMin < s.minutes + s.durationMin) ?? null;
 const completed = slots.filter((s) => nowMin >= s.minutes + s.durationMin);
 const upcoming = slots.filter((s) => nowMin < s.minutes);

 let next: AartiSlot;
 let minutesToNext: number;
 if (upcoming.length > 0) {
  next = upcoming[0]!;
  minutesToNext = next.minutes - nowMin;
 } else {
  // All done today — next is tomorrow's first slot
  next = slots[0]!;
  minutesToNext = 24 * 60 - nowMin + next.minutes;
 }

 return { current, next, minutesToNext, completed, upcoming };
}

/**
 * Human-readable "next in 1h 23m" / "live now" string.
 */
export function nextAartiLabel(state: AartiNowState): string {
 if (state.current) return `LIVE NOW — ${state.current.event}`;
 const h = Math.floor(state.minutesToNext / 60);
 const m = state.minutesToNext % 60;
 if (h === 0) return `Next: ${state.next.event} in ${m} min`;
 return `Next: ${state.next.event} in ${h}h ${m}m`;
}
