/**
 * The API stores a temple's hours as `{ regularHours: { mangalaAarti: "04:00 - 05:00" } }`
 * (camelCase key, "HH:MM - HH:MM" value). Managers should never have to type
 * either form: they write "Mangala Aarti" and pick two times.
 */

export interface ScheduleRow {
  /** What the manager sees and edits, e.g. "Mangala Aarti". */
  name: string;
  /** "HH:MM" (what <input type="time"> produces), or "". */
  start: string;
  end: string;
  /** The stored key this row was loaded from, kept while the name is untouched. */
  originalKey?: string;
}

export const SLOT_SUGGESTIONS = [
  'Mangala Aarti',
  'Shringar Aarti',
  'Rajbhog Aarti',
  'Sandhya Aarti',
  'Shayan Aarti',
  'Darshan',
] as const;

const WORDS = /[A-Za-z0-9]+/g;

/** "Mangala Aarti" -> "mangalaAarti"; an already-camelCase "mangalaAarti" is kept. */
export function slotNameToKey(name: string): string {
  const words = name.match(WORDS) ?? [];
  return words
    .map((w, i) => {
      const flat = w === w.toUpperCase() || w === w.toLowerCase();
      const body = flat ? w.toLowerCase() : w;
      return i === 0 ? body.charAt(0).toLowerCase() + body.slice(1) : body.charAt(0).toUpperCase() + body.slice(1);
    })
    .join('');
}

/** "mangalaAarti" -> "Mangala Aarti" (same rule the public pages use for labels). */
export function keyToSlotName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const AARTI_HINTS = ['aarti', 'arati', 'suprabhatam', 'shej', 'kakad', 'dhup', 'dhoop', 'madhyana', 'rajbhog'];

/** Only slots whose name reads as an aarti drive the "Live" and "Next Aarti" badges (api darshan-schedule.ts). */
export function isAartiName(name: string): boolean {
  const k = slotNameToKey(name).toLowerCase();
  return AARTI_HINTS.some((h) => k.includes(h));
}

const RANGE = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/;
const pad = (n: number) => String(n).padStart(2, '0');

/** "4:00 - 05:00" -> { start: "04:00", end: "05:00" }; null when it is not one plain range. */
export function parseRange(value: string): { start: string; end: string } | null {
  const m = RANGE.exec(value);
  if (!m) return null;
  const [sh, sm, eh, em] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) return null;
  return { start: `${pad(sh)}:${pad(sm)}`, end: `${pad(eh)}:${pad(em)}` };
}

export function formatRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

export function rowsFromRegularHours(hours: Record<string, unknown>): ScheduleRow[] {
  return Object.entries(hours).map(([key, raw]) => {
    const r = typeof raw === 'string' ? parseRange(raw) : null;
    return { name: keyToSlotName(key), start: r?.start ?? '', end: r?.end ?? '', originalKey: key };
  });
}

export interface RowIssue {
  name?: string;
  time?: string;
  /** Not blocking: shown as a hint. */
  note?: string;
}

export function keyForRow(row: ScheduleRow): string {
  return row.originalKey && row.name.trim() === keyToSlotName(row.originalKey) ? row.originalKey : slotNameToKey(row.name);
}

export function validateRows(rows: ScheduleRow[]): { errors: Record<number, RowIssue>; ok: boolean } {
  const errors: Record<number, RowIssue> = {};
  const seen = new Map<string, number>();
  rows.forEach((row, i) => {
    const issue: RowIssue = {};
    const name = row.name.trim();
    const key = keyForRow(row);
    if (!name) issue.name = 'Give this slot a name, for example "Mangala Aarti".';
    else if (!key) issue.name = 'Use letters or numbers in the name.';
    else if (name.length > 60) issue.name = 'Keep the name under 60 characters.';
    else if (seen.has(key)) issue.name = `Already used in row ${seen.get(key)! + 1}. Each slot needs its own name.`;
    else seen.set(key, i);

    if (!row.start || !row.end) issue.time = 'Pick both a start and an end time.';
    else if (row.end <= row.start) issue.time = 'The end time must be after the start time. For a slot that runs past midnight, add two slots.';

    if (name && !issue.name && !issue.time && !isAartiName(name)) {
      issue.note = 'Counts as regular open hours. Only slots with "Aarti" in the name show the Live and Next Aarti badges.';
    }
    if (issue.name || issue.time || issue.note) errors[i] = issue;
  });
  const ok = !Object.values(errors).some((e) => e.name || e.time);
  return { errors, ok };
}

export function regularHoursFromRows(rows: ScheduleRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) out[keyForRow(r)] = formatRange(r.start, r.end);
  return out;
}
