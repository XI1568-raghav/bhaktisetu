import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * SCAL-07 — boot must not replay 80 DDL statements against Tokyo every time.
 *
 * `ensureSchemaInvariants` awaited 80 `ALTER TABLE … IF NOT EXISTS` /
 * `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` statements one at
 * a time, before `bootstrap()` registered a single route. At the measured
 * Oregon↔Tokyo round trip of ~95 ms that is ~7.6 s of pure network wait added
 * to every cold start — on top of Render free's own 30–60 s spin-up, against
 * Cloudflare's 100 s origin timeout. `ADD COLUMN IF NOT EXISTS` also takes an
 * ACCESS EXCLUSIVE lock even when it no-ops, so all 80 briefly locked most
 * tables on every restart, including mid-deploy with live traffic.
 *
 * The statements stay (they are the documented recovery path for a skipped
 * migration) but a fingerprint marker makes the steady-state cost ONE query.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  } as Record<string, any>,
}));

vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

import { ensureSchemaInvariants, SCHEMA_INVARIANTS_FINGERPRINT } from './ensure-schema.js';

const log = { info: vi.fn(), error: vi.fn() };

/** DDL statements only — the marker's own bookkeeping is not schema replay. */
function ddlCalls(): string[] {
  return prismaMock.$executeRawUnsafe.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((sql: string) => !sql.includes('_schema_invariants'));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://localhost:5432/test';
  delete process.env.SCHEMA_INVARIANTS_FORCE;
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
});

describe('SCAL-07 — schema invariants replay', () => {
  it('runs every statement and records the fingerprint on a cold database', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('relation does not exist'));

    await ensureSchemaInvariants(log);

    expect(ddlCalls().length).toBeGreaterThan(50);
    const marker = prismaMock.$executeRawUnsafe.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((sql: string) => sql.includes('_schema_invariants'));
    // Marker table created, then the fingerprint recorded.
    expect(marker.length).toBe(2);
    expect(prismaMock.$executeRawUnsafe.mock.calls.at(-1)![1]).toBe(
      SCHEMA_INVARIANTS_FINGERPRINT,
    );
  });

  it('costs one query when the recorded fingerprint already matches', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { fingerprint: SCHEMA_INVARIANTS_FINGERPRINT },
    ]);

    await ensureSchemaInvariants(log);

    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('replays when the statement set has changed since the marker was written', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ fingerprint: 'an-older-build' }]);

    await ensureSchemaInvariants(log);

    expect(ddlCalls().length).toBeGreaterThan(50);
  });

  it('replays on demand for a hand-run recovery', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { fingerprint: SCHEMA_INVARIANTS_FINGERPRINT },
    ]);
    process.env.SCHEMA_INVARIANTS_FORCE = 'true';

    await ensureSchemaInvariants(log);

    expect(ddlCalls().length).toBeGreaterThan(50);
  });

  it('does NOT record the fingerprint when a statement failed', async () => {
    // Otherwise one bad boot would mark the schema good and the next boot would
    // skip the very statement that has not been applied.
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('no marker table'));
    let n = 0;
    prismaMock.$executeRawUnsafe.mockImplementation(async () => {
      if (++n === 3) throw new Error('permission denied');
      return 0;
    });

    await ensureSchemaInvariants(log);

    const marker = prismaMock.$executeRawUnsafe.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((sql: string) => sql.includes('_schema_invariants'));
    expect(marker).toHaveLength(0);
    expect(log.error).toHaveBeenCalled();
  });

  it('treats a duplicate-object error as satisfied and still records', async () => {
    // Observed live: 2 of the 95 statements are `DO $$` blocks adding a
    // constraint whose name an index already holds, so they raise 42P07 on
    // every boot. The invariant holds — if that blocked the marker the full
    // replay would run forever, which is the cost this finding is about.
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('no marker table'));
    let n = 0;
    prismaMock.$executeRawUnsafe.mockImplementation(async () => {
      if (++n === 3) {
        throw new Error(
          'Raw query failed. Code: `42P07`. Message: `ERROR: relation "referral_codes_user_id_key" already exists`',
        );
      }
      return 0;
    });

    await ensureSchemaInvariants(log);

    const marker = prismaMock.$executeRawUnsafe.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((sql: string) => sql.includes('_schema_invariants'));
    expect(marker).toHaveLength(2);
    // …and it is not logged as a failure, because it is not one.
    expect(log.error).not.toHaveBeenCalled();
  });

  it('still skips entirely without a DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;

    await ensureSchemaInvariants(log);

    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
