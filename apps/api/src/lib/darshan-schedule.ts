/**
 * Darshan schedule helpers — parse Temple.timingInfo (Json) and decide
 * if a temple is currently in a live-darshan window, or compute the next
 * scheduled aarti slot.
 *
 * Times are IST (Asia/Kolkata, UTC+5:30). All comparisons happen in IST.
 *
 * Aarti slots = live-darshan windows (mangala/sandhya/shringar/kakad/dhup
 * /shej/madhyana/rajbhog). Plain darshan/open hours are scheduled-but-not-streamed.
 */

const IST_OFFSET_MIN = 5 * 60 + 30;

function istMinutes(now: Date = new Date()): number {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + IST_OFFSET_MIN) % (24 * 60);
}

function parseRange(s: string): [number, number] | null {
  const m = s.match(/^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/);
  if (!m) return null;
  const sh = Number(m[1]); const sm = Number(m[2]);
  const eh = Number(m[3]); const em = Number(m[4]);
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) return null;
  return [sh * 60 + sm, eh * 60 + em];
}

export type ScheduleSlot = {
  key: string;
  label: string;
  start: number;
  end: number;
  isAarti: boolean;
};

function keyToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const AARTI_HINTS = ['aarti', 'arati', 'suprabhatam', 'shej', 'kakad', 'dhup', 'dhoop', 'madhyana', 'rajbhog'];

function isAartiKey(key: string): boolean {
  const k = key.toLowerCase();
  return AARTI_HINTS.some((h) => k.includes(h));
}

export function parseSchedule(timingInfo: unknown): ScheduleSlot[] {
  if (!timingInfo || typeof timingInfo !== 'object') return [];
  const ti = timingInfo as { regularHours?: unknown };
  const hours = ti.regularHours;
  if (!hours || typeof hours !== 'object') return [];
  const out: ScheduleSlot[] = [];
  for (const [key, raw] of Object.entries(hours as Record<string, unknown>)) {
    if (typeof raw !== 'string') continue;
    for (const part of raw.split(',')) {
      const parsed = parseRange(part);
      if (!parsed) continue;
      out.push({ key, label: keyToLabel(key), start: parsed[0], end: parsed[1], isAarti: isAartiKey(key) });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export type LiveStatus =
  | { isLive: true; current: ScheduleSlot; endsInMin: number; nextAarti: ScheduleSlot | null; nextStartsInMin: number | null }
  | { isLive: false; nextAarti: ScheduleSlot | null; nextStartsInMin: number | null };

export function getLiveStatus(timingInfo: unknown, now: Date = new Date()): LiveStatus {
  const slots = parseSchedule(timingInfo);
  const aartis = slots.filter((s) => s.isAarti);
  if (aartis.length === 0) {
    return { isLive: false, nextAarti: null, nextStartsInMin: null };
  }
  const nowMin = istMinutes(now);

  let current: ScheduleSlot | null = null;
  for (const a of aartis) {
    if (a.start <= nowMin && nowMin < a.end) {
      if (!current || a.end > current.end) current = a;
    }
  }

  let next: ScheduleSlot | null = null;
  let nextStartsInMin: number | null = null;
  for (const a of aartis) {
    if (a.start > nowMin) { next = a; nextStartsInMin = a.start - nowMin; break; }
  }
  if (!next) {
    const first = aartis[0]!;
    next = first;
    nextStartsInMin = (24 * 60 - nowMin) + first.start;
  }

  if (current) {
    return { isLive: true, current, endsInMin: current.end - nowMin, nextAarti: next, nextStartsInMin };
  }
  return { isLive: false, nextAarti: next, nextStartsInMin };
}
