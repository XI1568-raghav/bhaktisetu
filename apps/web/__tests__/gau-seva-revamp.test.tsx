/**
 * Gau Seva revamp (2026-08-05) — regression guards.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Gau Seva — adoption plan CTAs now link to the real donation flow', () => {
  it('cow detail plan buttons are Links into /donations with planId (were dead <button>)', () => {
    const src = read('app/gaushala/[id]/page.tsx');
    expect(src).toMatch(/planId=\$\{encodeURIComponent\(plan\.id\)\}/);
    expect(src).toContain('/donations?causeId=');
    // The dead no-op <button> plan cards are replaced by <Link>.
    expect(src).not.toMatch(/<button[\s\S]{0,80}key=\{plan\.id\}/);
  });
});

describe('Gau Seva — donation form pre-fills the plan amount', () => {
  it('donations page maps planId to a plan amount', () => {
    const src = read('app/donations/page.tsx');
    expect(src).toContain('PLAN_AMOUNTS');
    expect(src).toContain('plan_monthly');
    expect(src).toMatch(/planAmount/);
  });

  it('DonationForm accepts a planAmount to pre-select the amount', () => {
    const src = read('components/DonationForm.tsx');
    expect(src).toContain('planAmount');
    expect(src).toMatch(/planAmount \?\? presets/);
  });
});
