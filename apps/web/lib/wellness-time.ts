/**
 * Wellness class times are always shown in India Standard Time.
 *
 * `toLocaleString` with no `timeZone` formats in the viewer's zone, so the same class read "10:30 am" on
 * a phone in Delhi and "5:00 am" for an NRI in London, with nothing saying which clock it was. A class
 * start is one real instant; the label says the clock it is read on. (Server-rendered output would also
 * have been UTC on Cloudflare Workers.)
 */
const IST = 'Asia/Kolkata';

function valid(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Thu, 5 Nov, 10:30 am IST", or null when the value is not a date. */
export function formatIstWhen(iso: string): string | null {
  const d = valid(iso);
  if (!d) return null;
  return `${d.toLocaleString('en-IN', {
    timeZone: IST,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })} IST`;
}

/** "5 Nov 2026, 10:30 am IST" */
export function formatIstDateTime(iso: string): string {
  const d = valid(iso);
  if (!d) return iso;
  return `${d.toLocaleString('en-IN', {
    timeZone: IST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} IST`;
}

/** "10:30 am IST" */
export function formatIstTime(iso: string): string {
  const d = valid(iso);
  if (!d) return iso;
  return `${d.toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit' })} IST`;
}

/** "5 Nov" or "5 Nov 2026": the calendar day in India, not in the viewer's zone. */
export function formatIstDate(iso: string, withYear = false): string {
  const d = valid(iso);
  if (!d) return iso;
  return d.toLocaleDateString('en-IN', {
    timeZone: IST,
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {}),
  });
}
