import { describe, it, expect } from 'vitest';
import {
  CSV_HEADER,
  filterBreaches,
  groupByPriest,
  toCsv,
  type BookingRow,
} from '../sla-breach-outreach.js';

const NOW = new Date('2026-06-14T00:00:00.000Z');

const FIXTURE: BookingRow[] = [
  // 1. priest_assigned, >7d overdue, no video → INCLUDED (priest 821edbe5)
  {
    id: 'uuid-1',
    bookingNumber: 'BS-20260427-K3HSD',
    templeId: 'temple-1',
    priestId: '821edbe5',
    scheduledDate: '2026-05-04T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'priest_assigned',
    priceAmount: '501',
    videoProofUrl: null,
  },
  // 2. priest_assigned, >7d overdue, no video → INCLUDED (priest 821edbe5)
  {
    id: 'uuid-2',
    bookingNumber: 'BS-20260427-43U88',
    templeId: 'temple-1',
    priestId: '821edbe5',
    scheduledDate: '2026-05-04T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'priest_assigned',
    priceAmount: '501',
    videoProofUrl: null,
  },
  // 3. priest_assigned, >7d overdue, no video → INCLUDED (different priest)
  {
    id: 'uuid-3',
    bookingNumber: 'BS-20260427-03BS5',
    templeId: 'temple-1',
    priestId: 'other-priest',
    scheduledDate: '2026-05-04T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'priest_assigned',
    priceAmount: '1001',
    videoProofUrl: null,
  },
  // 4. EXCLUDED: status = confirmed (not priest_assigned)
  {
    id: 'uuid-4',
    bookingNumber: 'BS-20260427-EXCL1',
    templeId: 'temple-1',
    priestId: '821edbe5',
    scheduledDate: '2026-05-04T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'confirmed',
    priceAmount: '501',
    videoProofUrl: null,
  },
  // 5. EXCLUDED: scheduledDate is now-3d (not >7d overdue)
  {
    id: 'uuid-5',
    bookingNumber: 'BS-20260611-EXCL2',
    templeId: 'temple-1',
    priestId: '821edbe5',
    scheduledDate: '2026-06-11T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'priest_assigned',
    priceAmount: '501',
    videoProofUrl: null,
  },
  // 6. EXCLUDED: videoProofUrl IS NOT null (proof exists)
  {
    id: 'uuid-6',
    bookingNumber: 'BS-20260427-EXCL3',
    templeId: 'temple-1',
    priestId: '821edbe5',
    scheduledDate: '2026-05-04T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'priest_assigned',
    priceAmount: '501',
    videoProofUrl: 'https://video.example.com/proof.mp4',
  },
];

describe('filterBreaches', () => {
  it('keeps only priest_assigned + >7d overdue + no videoProofUrl bookings', () => {
    const out = filterBreaches(FIXTURE, NOW);
    const codes = out.map((b) => b.bookingNumber).sort();
    expect(codes).toEqual([
      'BS-20260427-03BS5',
      'BS-20260427-43U88',
      'BS-20260427-K3HSD',
    ]);
  });

  it('excludes wrong status, recent scheduledDate, present videoProofUrl', () => {
    const out = filterBreaches(FIXTURE, NOW);
    const excludedCodes = ['BS-20260427-EXCL1', 'BS-20260611-EXCL2', 'BS-20260427-EXCL3'];
    for (const code of excludedCodes) {
      expect(out.find((b) => b.bookingNumber === code)).toBeUndefined();
    }
  });

  it('empty input → empty output, no crash', () => {
    expect(filterBreaches([], NOW)).toEqual([]);
  });
});

describe('groupByPriest', () => {
  it('groups bookings by priestId, flags repeatBreachCount >= 2', () => {
    const filtered = filterBreaches(FIXTURE, NOW);
    const groups = groupByPriest(filtered);
    expect(groups.get('821edbe5')?.length).toBe(2);
    expect(groups.get('other-priest')?.length).toBe(1);
    // assertion: priest 821edbe5 hits >=2 → repeat-breach class
    const flagged = Array.from(groups.entries())
      .filter(([key, arr]) => key !== '' && arr.length >= 2)
      .map(([key]) => key);
    expect(flagged).toEqual(['821edbe5']);
  });

  it('null priestId is keyed as empty string', () => {
    const out = groupByPriest([
      {
        id: 'np',
        bookingNumber: 'BS-NULLP',
        templeId: 't',
        priestId: null,
        scheduledDate: '2026-05-04T00:00:00.000Z',
        scheduledTimeSlot: '06:00',
        status: 'priest_assigned',
        priceAmount: '101',
        videoProofUrl: null,
      },
    ]);
    expect(out.get('')?.length).toBe(1);
  });
});

describe('toCsv', () => {
  it('parses JSON shape → CSV rows w/ correct header + columns', () => {
    const filtered = filterBreaches(FIXTURE, NOW);
    const csv = toCsv(filtered, NOW);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(CSV_HEADER);
    // 3 filtered + header + trailing empty (from final \n)
    expect(lines.length).toBe(3 + 1 + 1);
    // header has exactly 12 columns
    expect(CSV_HEADER.split(',').length).toBe(12);
    // each data line has 12 columns
    for (const dataLine of lines.slice(1, 4)) {
      expect(dataLine.split(',').length).toBe(12);
    }
  });

  it('repeatBreachCount column reflects priest grouping; suggestedAction PRIEST-FLAG for >=2', () => {
    const filtered = filterBreaches(FIXTURE, NOW);
    const csv = toCsv(filtered, NOW);
    // Find K3HSD row (priest 821edbe5, has 2 siblings filtered → repeatBreachCount=2)
    const k3 = csv.split('\n').find((l) => l.startsWith('BS-20260427-K3HSD'))!;
    const cols = k3.split(',');
    // column indexes: 0=bookingCode 1-5=devotee/puja 6=daysOverdue 7=amount 8=priestId 9=priestName 10=repeatBreachCount 11=suggestedAction
    expect(cols[10]).toBe('2');
    expect(cols[11]).toContain('PRIEST-FLAG');
    // Find 03BS5 row (priest other-priest, only 1 → repeatBreachCount=1, no PRIEST-FLAG)
    const bs5 = csv.split('\n').find((l) => l.startsWith('BS-20260427-03BS5'))!;
    const bs5Cols = bs5.split(',');
    expect(bs5Cols[10]).toBe('1');
    expect(bs5Cols[11]).not.toContain('PRIEST-FLAG');
  });

  it('idempotent: same input twice → byte-identical CSV', () => {
    const filtered = filterBreaches(FIXTURE, NOW);
    const a = toCsv(filtered, NOW);
    const b = toCsv(filtered, NOW);
    expect(a).toBe(b);
    // also: shuffled input → identical output (sort by bookingCode ASC)
    const shuffled = [...filtered].reverse();
    const c = toCsv(shuffled, NOW);
    expect(c).toBe(a);
  });

  it('empty input → header-only CSV with trailing newline (no crash)', () => {
    const out = toCsv([], NOW);
    expect(out).toBe(CSV_HEADER + '\n');
  });
});
