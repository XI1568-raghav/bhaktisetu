import { describe, it, expect } from 'vitest';
import { __testing } from '../sla-breach-outreach.js';

const { csvField, transformToCsvRows, renderCsv, summarize, CSV_HEADER } = __testing;

const SAMPLE_BOOKINGS = [
  {
    id: 'uuid-1',
    bookingNumber: 'BS-20260427-K3HSD',
    templeId: 'temple-1',
    priestId: '821edbe5',
    scheduledDate: '2026-05-04T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'priest_assigned',
    priceAmount: '501',
  },
  {
    id: 'uuid-2',
    bookingNumber: 'BS-20260427-43U88',
    templeId: 'temple-1',
    priestId: '821edbe5',
    scheduledDate: '2026-05-04T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'priest_assigned',
    priceAmount: '501',
  },
  {
    id: 'uuid-3',
    bookingNumber: 'BS-20260427-03BS5',
    templeId: 'temple-1',
    priestId: '821edbe5',
    scheduledDate: '2026-05-04T06:00:00.000Z',
    scheduledTimeSlot: '06:00',
    status: 'priest_assigned',
    priceAmount: '501',
  },
  {
    id: 'uuid-4',
    bookingNumber: 'BS-20260530-NEWER',
    templeId: 'temple-2',
    priestId: 'other-priest',
    scheduledDate: '2026-06-05T10:00:00.000Z',
    scheduledTimeSlot: '10:00',
    status: 'priest_assigned',
    priceAmount: '1001',
  },
];

const NOW = new Date('2026-06-12T05:00:00.000Z');

describe('csvField', () => {
  it('returns plain values unquoted when safe', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField(501)).toBe('501');
  });

  it('quotes + escapes embedded double-quotes per RFC 4180', () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes when commas / newlines / CRs present', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('renders null/undefined as empty fields', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
  });
});

describe('transformToCsvRows', () => {
  it('computes daysOverdue from scheduledDate vs now', () => {
    const rows = transformToCsvRows(SAMPLE_BOOKINGS, NOW);
    // 2026-05-04 06:00Z → 2026-06-12 05:00Z = 38 full days (just shy of 39)
    expect(rows.find((r) => r.bookingCode === 'BS-20260427-K3HSD')?.daysOverdue).toBe(38);
  });

  it('flags priest 821edbe5 w/ repeatBreachCount=3 (3 sibs in fixture)', () => {
    const rows = transformToCsvRows(SAMPLE_BOOKINGS, NOW);
    const k3 = rows.find((r) => r.bookingCode === 'BS-20260427-K3HSD');
    expect(k3?.repeatBreachCount).toBe(3);
    expect(k3?.suggestedAction).toContain('PRIEST-FLAG');
  });

  it('newer single-priest booking gets non-PRIEST-FLAG suggestedAction', () => {
    const rows = transformToCsvRows(SAMPLE_BOOKINGS, NOW);
    const newer = rows.find((r) => r.bookingCode === 'BS-20260530-NEWER');
    expect(newer?.repeatBreachCount).toBe(1);
    expect(newer?.suggestedAction).not.toContain('PRIEST-FLAG');
  });

  it('sort: priestId ASC, then bookingCode ASC (deterministic)', () => {
    const rows = transformToCsvRows(SAMPLE_BOOKINGS, NOW);
    const codes = rows.map((r) => r.bookingCode);
    // priest 821edbe5 (3) comes before 'other-priest' alphabetically
    expect(codes).toEqual([
      'BS-20260427-03BS5',
      'BS-20260427-43U88',
      'BS-20260427-K3HSD',
      'BS-20260530-NEWER',
    ]);
  });

  it('empty input → empty rows array', () => {
    expect(transformToCsvRows([], NOW)).toEqual([]);
  });

  it('booking w/ null priestId: repeatBreachCount=0, no PRIEST-FLAG', () => {
    const rows = transformToCsvRows(
      [
        {
          id: 'x',
          bookingNumber: 'BS-NULL-PRIEST',
          templeId: 't',
          priestId: null,
          scheduledDate: '2026-05-04T00:00:00.000Z',
          scheduledTimeSlot: '06:00',
          status: 'confirmed',
          priceAmount: '101',
        },
      ],
      NOW,
    );
    expect(rows[0].priestId).toBe('');
    expect(rows[0].repeatBreachCount).toBe(0);
  });
});

describe('renderCsv', () => {
  it('starts with header line + ends with newline', () => {
    const out = renderCsv(transformToCsvRows(SAMPLE_BOOKINGS, NOW));
    expect(out.split('\n')[0]).toBe(CSV_HEADER);
    expect(out.endsWith('\n')).toBe(true);
  });

  it('idempotent: same input → byte-identical output', () => {
    const a = renderCsv(transformToCsvRows(SAMPLE_BOOKINGS, NOW));
    const b = renderCsv(transformToCsvRows(SAMPLE_BOOKINGS, NOW));
    expect(a).toBe(b);
  });

  it('empty input → header-only CSV (no crash)', () => {
    const out = renderCsv(transformToCsvRows([], NOW));
    expect(out).toBe(CSV_HEADER + '\n');
  });
});

describe('summarize', () => {
  it('sums atRiskInr + flags repeat-breach priests', () => {
    const s = summarize(transformToCsvRows(SAMPLE_BOOKINGS, NOW));
    expect(s.count).toBe(4);
    expect(s.totalAtRiskInr).toBe(501 + 501 + 501 + 1001);
    expect(s.priestsFlagged).toEqual(['821edbe5']);
  });

  it('empty input → zero stats, no priests flagged', () => {
    const s = summarize([]);
    expect(s.count).toBe(0);
    expect(s.totalAtRiskInr).toBe(0);
    expect(s.priestsFlagged).toEqual([]);
  });
});
