import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  deriveTab,
  isCompleteAll,
  readBookingsCache,
  writeBookingsCache,
  __clearBookingsCache,
  PRIEST_TAB_STATUSES,
} from '../lib/priest-booking-views';

const row = (id: string, status: string) => ({ id, status });
const all = {
  bookings: [
    row('a', 'confirmed'),
    row('b', 'priest_assigned'),
    row('c', 'completed'),
    row('d', 'video_uploaded'),
    row('e', 'delivered'),
    row('f', 'in_progress'),
  ],
  total: 6,
  totalPages: 1,
};

describe('priest bookings tab shortcut', () => {
  beforeEach(() => __clearBookingsCache());

  it('derives every tab from a complete all-list, with Completed covering the three delivered states', () => {
    expect(deriveTab(all, 'confirmed')!.bookings.map((b) => b.id)).toEqual(['a']);
    expect(deriveTab(all, 'priest_assigned')!.bookings.map((b) => b.id)).toEqual(['b']);
    expect(deriveTab(all, 'in_progress')!.bookings.map((b) => b.id)).toEqual(['f']);
    expect(deriveTab(all, 'completed')!.bookings.map((b) => b.id)).toEqual(['c', 'd', 'e']);
    expect(deriveTab(all, 'all')!.bookings).toHaveLength(6);
  });

  it('refuses to derive from a truncated list (more pages exist, so the server decides)', () => {
    const truncated = { ...all, total: 25, totalPages: 2 };
    expect(isCompleteAll(truncated)).toBe(false);
    expect(deriveTab(truncated, 'confirmed')).toBeNull();
  });

  it('keeps the status groups identical to the API view map', () => {
    const src = readFileSync(join(__dirname, '../../api/src/services/priest.service.ts'), 'utf8');
    const block = src.slice(src.indexOf('export const PRIEST_BOOKING_VIEWS'), src.indexOf('satisfies Record'));
    for (const [tab, statuses] of Object.entries(PRIEST_TAB_STATUSES)) {
      if (!statuses) continue;
      const m = block.match(new RegExp(`${tab}: \\[([^\\]]*)\\]`));
      expect(m, tab).toBeTruthy();
      const apiStatuses = m![1].split(',').map((x) => x.trim().replace(/'/g, ''));
      expect(apiStatuses).toEqual([...statuses]);
    }
  });

  it('never hands one session cached rows from another', () => {
    writeBookingsCache('tok-1', 'all', 1, { n: 1 });
    expect(readBookingsCache('tok-1', 'all', 1)).toEqual({ n: 1 });
    expect(readBookingsCache('tok-2', 'all', 1)).toBeUndefined();
    expect(readBookingsCache('tok-1', 'confirmed', 1)).toBeUndefined();
  });
});
