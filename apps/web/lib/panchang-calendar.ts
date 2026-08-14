/**
 * DF-09 (prod sweep 2026-08-12) — /panchang was three defects on one page.
 *
 * The header and the today-panel were genuinely correct (Krishna Chaturdashi,
 * Punarvasu, Rahu Kaal 15:37-17:16 on 11 August), but below them:
 *   1. the month grid rendered "April 2026" with an April day layout — a
 *      hardcoded 30-entry array checked into the page;
 *   2. the masa label read "Chaitra-Vaishakha, Vikram Samvat 2083", which is
 *      the March-May window, in August;
 *   3. "Upcoming Festivals & Vrats" printed two bare ISO strings —
 *      "2026-08-14T00:00:00.000Z" and "2026-08-25T00:00:00.000Z" — with no
 *      name and no formatting.
 *
 * Panchang is the daily-habit surface that feeds muhurat-driven booking intent.
 * A four-month-stale calendar reads as abandoned software and drags down the
 * credibility of the muhurat engine behind it.
 *
 * Everything here derives from the date it is given. Nothing is hardcoded, and
 * where a value cannot be derived honestly (the lunar masa needs the panchang
 * computation, which this page does not have) the caller renders nothing
 * rather than a plausible-looking wrong answer.
 */

export interface CalendarCell {
  day: number;
  month: 'prev' | 'current' | 'next';
  isToday: boolean;
  /** ISO yyyy-mm-dd, so callers can join festivals onto a cell. */
  iso: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "August 2026" for the month `today` falls in. */
export function calendarMonthLabel(today: Date): string {
  return `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
}

/**
 * A Sunday-aligned 6x7 grid for the month `today` falls in, with leading and
 * trailing days marked so the caller can grey them.
 */
export function buildCalendarDays(today: Date): CalendarCell[] {
  const todayIso = iso(today);
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const leading = first.getDay(); // 0 = Sunday
  const cells: CalendarCell[] = [];

  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - leading);

  for (let i = 0; i < 42; i += 1) {
    const cellIso = iso(cursor);
    cells.push({
      day: cursor.getDate(),
      month:
        cursor.getMonth() === today.getMonth() && cursor.getFullYear() === today.getFullYear()
          ? 'current'
          : cursor < first
            ? 'prev'
            : 'next',
      isToday: cellIso === todayIso,
      iso: cellIso,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Trim a trailing all-next week so a 5-week month does not render a blank row.
  while (cells.length > 35 && cells.slice(-7).every((c) => c.month === 'next')) {
    cells.length -= 7;
  }
  return cells;
}

export interface UpcomingFestivalRow {
  /** Human date, e.g. "14 August 2026". Empty when the input was unparseable. */
  label: string;
  name: string;
}

/**
 * Turn the API's `{date, name}` rows into something renderable.
 *
 * The live endpoint returns rows whose `name` is empty, and the page printed
 * the raw `date` in the name slot — which is how two ISO timestamps ended up
 * as festival names. A row with no name is DROPPED unless the local festival
 * calendar can supply one for that date. A machine timestamp is never shown to
 * a devotee, and no name is ever invented.
 */
export function formatUpcomingFestivals(
  rows: readonly { date: string; name?: string | null }[],
  nameForDate: (isoDate: string) => string | undefined = () => undefined,
): UpcomingFestivalRow[] {
  const out: UpcomingFestivalRow[] = [];
  for (const row of rows) {
    if (!row || typeof row.date !== 'string') continue;
    const parsed = new Date(row.date);
    if (Number.isNaN(parsed.getTime())) continue;
    const isoDate = row.date.slice(0, 10);
    const name = (row.name ?? '').trim() || nameForDate(isoDate) || '';
    if (!name) continue;
    out.push({
      label: `${parsed.getUTCDate()} ${MONTH_NAMES[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`,
      name,
    });
  }
  return out;
}
