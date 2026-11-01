/**
 * Tab views of the priest bookings list, plus the cache that makes switching them instant.
 *
 * Measured on prod 2026-10-31 (test.priest): every tab click on /priest/bookings issued a
 * fresh `GET /priest/bookings?view=<tab>` and sat behind a spinner for ~1.3 s, although the
 * `all` response had already carried every row the pandit owns (20 per page, one page).
 *
 * Two rules keep the shortcut honest:
 *  - a tab is derived locally ONLY from an `all` response that is complete (a single page,
 *    so `total === bookings.length`); with more pages the server stays the authority.
 *  - a derived or cached answer is shown immediately and the real request still runs in the
 *    background, so a stale row cannot outlive the next response.
 *
 * The status groups below must stay equal to PRIEST_BOOKING_VIEWS in
 * apps/api/src/services/priest.service.ts (the badge counts come from the server's map).
 */
export type PriestBookingTab = 'all' | 'confirmed' | 'priest_assigned' | 'in_progress' | 'completed';

export const PRIEST_TAB_STATUSES: Record<PriestBookingTab, readonly string[] | null> = {
  all: null,
  confirmed: ['confirmed'],
  priest_assigned: ['priest_assigned'],
  in_progress: ['in_progress'],
  completed: ['completed', 'video_uploaded', 'delivered'],
};

export interface PriestBookingsPageData<T extends { status: string }> {
  bookings: T[];
  total: number;
  totalPages: number;
}

/** True when `data` (a view=all response) holds every booking the pandit has. */
export function isCompleteAll<T extends { status: string }>(data: PriestBookingsPageData<T> | undefined): boolean {
  return !!data && data.totalPages <= 1 && data.total === data.bookings.length;
}

/** Rows of `tab` taken out of a complete `all` response, newest first as the server sends them. */
export function deriveTab<T extends { status: string }>(
  all: PriestBookingsPageData<T>,
  tab: PriestBookingTab,
): PriestBookingsPageData<T> | null {
  if (!isCompleteAll(all)) return null;
  const statuses = PRIEST_TAB_STATUSES[tab];
  const bookings = statuses ? all.bookings.filter((b) => statuses.includes(b.status)) : all.bookings;
  return { bookings, total: bookings.length, totalPages: 1 };
}

// Keyed by token so a different session never reads another pandit's rows.
const cache = new Map<string, unknown>();
const keyOf = (token: string, tab: PriestBookingTab, page: number) => `${token}\n${tab}\n${page}`;

export function readBookingsCache<T>(token: string, tab: PriestBookingTab, page: number): T | undefined {
  return cache.get(keyOf(token, tab, page)) as T | undefined;
}

export function writeBookingsCache<T>(token: string, tab: PriestBookingTab, page: number, value: T): void {
  cache.set(keyOf(token, tab, page), value);
}

/** Test hook. */
export function __clearBookingsCache(): void {
  cache.clear();
}
