/**
 * Captions for the booking tiles on /admin/reports.
 *
 * The tile value is an ALL-TIME count for a status group; the old caption was a
 * month-to-date vs whole-previous-month percentage ("-100% vs last month" under a 0, in
 * red). Two different populations on one tile, and a percentage that is meaningless early
 * in a month or when last month was empty. The caption now states the two raw counts, in a
 * neutral colour, and says so plainly when there is nothing to compare with.
 */
export interface BookingTileLike {
  label: string;
  thisMonth?: number;
  lastMonth?: number;
}

export function bookingTileCaption(tile: BookingTileLike): string {
  const { thisMonth, lastMonth } = tile;
  if (typeof thisMonth !== 'number' || typeof lastMonth !== 'number') return '—';
  if (lastMonth === 0) {
    return thisMonth === 0 ? 'None this month or last' : `${thisMonth} this month, none last month`;
  }
  return `${thisMonth} this month, ${lastMonth} last month`;
}

/** Tile titles that say which population the number counts. */
export function bookingTileTitle(label: string): string {
  if (label === 'Total Bookings') return 'Total (excl. cancelled)';
  return label;
}
