import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * GET /payouts/balance `pendingInr` is the sum of payout requests already
 * requested and awaiting admin settlement. The mobile card must say so and must
 * not call it pending earnings. (API field name is unchanged.)
 */
const src = readFileSync(path.join(__dirname, '../provider-payouts.tsx'), 'utf8');

describe('mobile payout balance card for pendingInr', () => {
  it('is labelled "Requested, awaiting payout"', () => {
    expect(src).toContain('Requested, awaiting payout');
  });

  it('is never called pending earnings', () => {
    expect(src).not.toMatch(/pending earnings?/i);
  });
});
