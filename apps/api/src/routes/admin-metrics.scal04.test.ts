import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { loadFunnelDaily } from './admin-metrics.js';

/**
 * SCAL-04 — /admin/metrics/funnel must aggregate in Postgres.
 *
 * The handler read every lead, user, booking and payment in the window and
 * bucketed them by day in a JS loop: 15,040 kB for the users query and
 * 13,282 kB for the bookings query at 200k rows (EXPLAIN ANALYZE SERIALIZE).
 * The funnel-drop-analyzer cron calls this daily, so ~28 MB per run landed in a
 * 512 MB Render container.
 */

type Tagged = { strings: string[]; values: unknown[] };

/** Capture the tagged-template SQL each call issues, and answer per table. */
function wireQueryRaw(byTable: Record<string, unknown[]>): Tagged[] {
  const seen: Tagged[] = [];
  prismaMock.$queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Array.from(strings).join('?');
    seen.push({ strings: Array.from(strings), values });
    const table = Object.keys(byTable).find((t) => sql.includes(`"${t}"`));
    return Promise.resolve(table ? byTable[table] : []);
  });
  return seen;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SCAL-04 — funnel daily counts', () => {
  it('groups by day in SQL and never reads raw rows', async () => {
    const seen = wireQueryRaw({
      leads: [{ day: '2026-08-12', n: 4 }],
      users: [{ day: '2026-08-12', n: 9, kyc: 7 }],
      puja_bookings: [{ day: '2026-08-12', n: 3 }],
      payments: [{ day: '2026-08-12', n: 2 }],
    });

    const since = new Date('2026-08-10T00:00:00.000Z');
    const out = await loadFunnelDaily(since);

    expect(out['2026-08-12']).toEqual({
      landing: 4,
      signup: 9,
      kyc: 7,
      booking: 3,
      payment_success: 2,
    });
    // Four aggregate queries, no row streaming from any of the four tables.
    expect(seen).toHaveLength(4);
    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
    expect(prismaMock.payment.findMany).not.toHaveBeenCalled();
    // The window is bound as a parameter, never interpolated.
    for (const call of seen) expect(call.values).toEqual([since]);
    for (const call of seen) expect(call.strings.join(' ')).toMatch(/date_trunc\('day'/);
  });

  it('counts a signup with neither phone nor email as un-KYCd', async () => {
    // The old JS loop did `if (u.phone || u.email) row.kyc += 1`; the FILTER
    // clause must mean exactly the same thing.
    wireQueryRaw({ users: [{ day: '2026-08-12', n: 5, kyc: 0 }] });

    const out = await loadFunnelDaily(new Date('2026-08-10T00:00:00.000Z'));

    expect(out['2026-08-12']).toEqual({
      landing: 0,
      signup: 5,
      kyc: 0,
      booking: 0,
      payment_success: 0,
    });
  });

  it('reports zero — not a fabricated number — when a table query fails', async () => {
    prismaMock.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
      const sql = Array.from(strings).join('?');
      if (sql.includes('"leads"')) return Promise.reject(new Error('relation leads does not exist'));
      if (sql.includes('"users"')) return Promise.resolve([{ day: '2026-08-12', n: 5, kyc: 5 }]);
      return Promise.resolve([]);
    });

    const out = await loadFunnelDaily(new Date('2026-08-10T00:00:00.000Z'));

    expect(out['2026-08-12']).toEqual({
      landing: 0,
      signup: 5,
      kyc: 5,
      booking: 0,
      payment_success: 0,
    });
  });

  it('coerces bigint counts from Postgres to plain numbers', async () => {
    wireQueryRaw({ puja_bookings: [{ day: '2026-08-12', n: 12n }] });

    const out = await loadFunnelDaily(new Date('2026-08-10T00:00:00.000Z'));

    expect(out['2026-08-12']!.booking).toBe(12);
  });
});
