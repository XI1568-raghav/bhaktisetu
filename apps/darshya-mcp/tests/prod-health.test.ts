import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
};
vi.mock('../src/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}));

import { prodHealth } from '../src/tools/prod-health.js';

beforeEach(() => vi.clearAllMocks());

describe('prodHealth', () => {
  it('returns table row counts for the core tables', async () => {
    // $queryRawUnsafe returns an array of { table, rows } rows.
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      { table: 'users', rows: 1000 },
      { table: 'puja_bookings', rows: 300 },
      { table: 'payments', rows: 500 },
      { table: 'donations', rows: 50 },
    ]);

    const data = JSON.parse((await prodHealth({})).content[0].text);
    expect(data.ok).toBe(true);
    expect(data.tables.users).toBe(1000);
    expect(data.tables.puja_bookings).toBe(300);
    expect(data.tables.payments).toBe(500);
    expect(data.tables.donations).toBe(50);
  });

  it('routes the SQL through isReadOnlyQuery BEFORE executing (defense in depth)', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await prodHealth({});

    // The query must be the hardcoded SELECT — never interpolated.
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sqlArg] = mockPrisma.$queryRawUnsafe.mock.calls[0];
    expect(sqlArg).toMatch(/SELECT/i);
    expect(sqlArg).toMatch(/COUNT\(\*\)/i);
    expect(sqlArg).not.toMatch(/DELETE|UPDATE|INSERT|DROP/i);
  });

  it('uses real COUNT(*), NOT the stale pg_class.reltuples estimate', async () => {
    // reltuples undercounts young prod tables badly (reported 8 users when the
    // real count was 32) and returns -1 for never-analyzed tables. Lock the
    // accurate COUNT(*) approach in so nobody reverts to reltuples.
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
    await prodHealth({});
    const [sqlArg] = mockPrisma.$queryRawUnsafe.mock.calls[0];
    expect(sqlArg).toMatch(/COUNT\(\*\)/i);
    expect(sqlArg).not.toMatch(/reltuples/);
  });

  it('returns ok:false + error on DB failure', async () => {
    mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('connection refused'));
    const data = JSON.parse((await prodHealth({})).content[0].text);
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/connection refused/i);
  });
});
