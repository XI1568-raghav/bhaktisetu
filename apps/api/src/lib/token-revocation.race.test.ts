import { describe, it, expect, beforeEach, vi } from 'vitest';

// Deterministic interleaving: a lookup is parked mid-read, a revoke commits, then the read resumes.
const gates = vi.hoisted(() => ({ reads: [] as Array<{ rows: unknown[]; release: (rows: unknown[]) => void }> }));
const dbRows = vi.hoisted(() => ({ rows: [] as Array<{ session_id: string; valid_after: Date }> }));
const prismaMock = vi.hoisted(() => ({
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
}));
vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

import { isTokenRevoked, revokeUserTokens, __revocationReset } from './token-revocation.js';

const UID = '11111111-1111-4111-8111-111111111111';
const jwt = (iat: number) =>
  `h.${Buffer.from(JSON.stringify({ iat })).toString('base64url')}.s`;

beforeEach(() => {
  __revocationReset();
  gates.reads = [];
  dbRows.rows = [];
  prismaMock.$queryRawUnsafe.mockReset();
  prismaMock.$executeRawUnsafe.mockReset();
  prismaMock.$executeRawUnsafe.mockImplementation(async (sql: string) => {
    if (/INSERT INTO "auth_token_revocations"/.test(sql)) dbRows.rows = [{ session_id: '', valid_after: new Date() }];
    return 1;
  });
});

describe('revocation vs in-flight lookup', () => {
  it('a read that started before the revoke committed cannot re-store the pre-revocation state', async () => {
    // First read is parked and, when released, returns the STALE (empty) snapshot it took before the revoke.
    prismaMock.$queryRawUnsafe.mockImplementationOnce(
      () => new Promise((resolve) => gates.reads.push({ rows: [], release: resolve })),
    );
    prismaMock.$queryRawUnsafe.mockImplementation(async () => dbRows.rows);

    const oldToken = jwt(Math.floor(Date.now() / 1000) - 120);
    const lookup = isTokenRevoked(UID, oldToken); // parked mid-read
    await Promise.resolve();
    expect(gates.reads).toHaveLength(1);

    await revokeUserTokens(UID); // commits the cutoff
    gates.reads[0]!.release([]); // stale snapshot arrives late
    await lookup;

    // A later request in the same process must see the revocation, not a cached empty state.
    expect(await isTokenRevoked(UID, oldToken)).toBe(true);
  });

  it('the parked caller itself is answered from a fresh read, not the stale snapshot', async () => {
    prismaMock.$queryRawUnsafe.mockImplementationOnce(
      () => new Promise((resolve) => gates.reads.push({ rows: [], release: resolve })),
    );
    prismaMock.$queryRawUnsafe.mockImplementation(async () => dbRows.rows);
    const lookup = isTokenRevoked(UID, jwt(Math.floor(Date.now() / 1000) - 120));
    await Promise.resolve();
    await revokeUserTokens(UID);
    gates.reads[0]!.release([]);
    expect(await lookup).toBe(true);
  });
});
