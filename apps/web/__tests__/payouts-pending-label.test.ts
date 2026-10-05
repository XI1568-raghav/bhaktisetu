import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * GET /payouts/balance `pendingInr` is the sum of payout requests already
 * requested and awaiting admin settlement. It is NOT earnings that are still
 * pending, so the UI must say what it is. (API field name is unchanged.)
 */
const src = readFileSync(path.join(__dirname, '../app/payouts/page.tsx'), 'utf8');

describe('/payouts balance card for pendingInr', () => {
  it('is labelled "Requested, awaiting payout"', () => {
    expect(src).toContain('Requested, awaiting payout');
  });

  it('is never called pending earnings', () => {
    expect(src).not.toMatch(/pending earnings?/i);
  });
});
