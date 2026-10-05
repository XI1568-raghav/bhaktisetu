/**
 * Temple puja slots ("06:00", "Morning (6:00 AM)") are IST wall-clock times:
 * the API measures them against Asia/Kolkata (apps/api/src/lib/slot-time.ts).
 * Nothing on the booking screens said so, so a devotee in New York read
 * "Morning (6:00 AM)" as their own 6 AM and could book a puja that happens at
 * 8:30 PM their evening. These helpers state the zone and, in the browser,
 * show the same instant in the devotee's own zone.
 */

export const IST_TIME_NOTE =
  'All puja times are India Standard Time (IST, UTC+5:30), the time at the temple.';

const IST_OFFSET_MINUTES = 5 * 60 + 30;

/** Append " IST" to a slot label unless it already carries a zone. */
export function withIst(label: string): string {
  const t = label.trim();
  if (!t) return t;
  return /\bIST\b/.test(t) ? t : `${t} IST`;
}

/**
 * The instant of an IST slot, rendered in `timeZone` (default: the browser's).
 * Returns null when the devotee is already on IST, or when the date/slot/zone
 * cannot be read — never a guessed time.
 */
export function localEquivalent(
  dateYmd: string,
  slot24h: string,
  timeZone?: string,
): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd);
  const t = /^\s*([01]?\d|2[0-3]):([0-5]\d)/.exec(slot24h);
  if (!d || !t) return null;
  let zone = timeZone;
  try {
    zone = zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return null;
    const utcMs =
      Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])) -
      IST_OFFSET_MINUTES * 60_000;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(utcMs));
  } catch {
    return null;
  }
}
