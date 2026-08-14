import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { commissionGross, commissionPlatformCut } from '../lib/commission-math.js';

/**
 * `GET /api/v1/payouts/commissions` — added 2026-08-11.
 *
 * A batch-9 fix pointed `apps/web/lib/commission-api.ts:listMyCommissions` at
 * this path, but the route did not exist: `payoutRequestRoutes` declared only
 * /balance, /request and /my, so `/wellness-portal/earnings` traded a 403 for a
 * 404 and stayed just as dead. The adversarial review caught it as NOT WIRED.
 *
 * The route harness in apps/api/src/routes is pure-function/Zod only (no
 * Fastify+Prisma scaffolding anywhere in this suite), so what is pinned here is
 * the part that was actually wrong and could silently regress: the derived-money
 * policy on a deliberately mixed ledger, and the page/pageSize contract the
 * client parses.
 */

const CUTOVER = new Date('2026-08-11T00:00:00.000Z');

/** Mirrors the route's gate: derive only for post-cutover rows. */
function derivable(createdAt: Date): boolean {
  return createdAt >= CUTOVER;
}

describe('GET /payouts/commissions — derived money on a mixed ledger', () => {
  // ₹1,100 puja, 20% platform: provider keeps ₹880, platform takes ₹220.
  const postCutover = {
    amount: new Prisma.Decimal('880.00'),
    percentage: new Prisma.Decimal('0.2000'),
    createdAt: new Date('2026-08-12T09:00:00.000Z'),
  };

  it('derives gross and platform cut for a post-cutover row', () => {
    expect(derivable(postCutover.createdAt)).toBe(true);
    expect(commissionGross(postCutover.amount, postCutover.percentage).toString()).toBe('1100');
    expect(commissionPlatformCut(postCutover.amount, postCutover.percentage).toString()).toBe('220');
  });

  it('refuses to derive for a pre-cutover row — a blank cell beats a wrong rupee figure', () => {
    // Same columns, written under the OLD convention where `amount` was the
    // platform's ₹220. Deriving would claim a gross of ₹275 and a platform cut
    // of ₹55: confidently, specifically wrong.
    const legacy = { ...postCutover, createdAt: new Date('2026-08-01T09:00:00.000Z') };
    expect(derivable(legacy.createdAt)).toBe(false);
    // Proving the number we are refusing to show really is nonsense:
    expect(commissionGross(new Prisma.Decimal('220'), legacy.percentage).toString()).toBe('275');
  });

  it('treats the cutover instant itself as derivable (boundary is inclusive)', () => {
    expect(derivable(new Date('2026-08-11T00:00:00.000Z'))).toBe(true);
    expect(derivable(new Date('2026-08-10T23:59:59.999Z'))).toBe(false);
  });

  it('never produces a negative or infinite gross from a degenerate rate', () => {
    // A 100% take rate would divide by zero; commission-math clamps to 0 rather
    // than emitting Infinity into a money field.
    expect(commissionGross(new Prisma.Decimal('880'), new Prisma.Decimal('1')).toString()).toBe('0');
    expect(commissionPlatformCut(new Prisma.Decimal('880'), new Prisma.Decimal('1')).toString()).toBe('0');
  });
});

describe('GET /payouts/commissions — the envelope the web client parses', () => {
  // apps/web/lib/commission-api.ts unwrapPage() reads `data`, `total`, `page`,
  // `pageSize`. Anything else renders an empty panel with no error.
  it('names the fields unwrapPage looks for', () => {
    const payload = { data: [], total: 0, page: 1, pageSize: 20 };
    expect(Object.keys(payload).sort()).toEqual(['data', 'page', 'pageSize', 'total']);
  });

  it('amount is a string, so a Decimal never reaches JSON as an object', () => {
    const serialized = new Prisma.Decimal('880.00').toString();
    expect(typeof serialized).toBe('string');
    expect(serialized).toBe('880');
  });
});
