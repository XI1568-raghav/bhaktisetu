/**
 * Astrologer portal revamp (2026-08-05) — regression guards.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Astrologer portal — go-online toggle', () => {
  it('dashboard has an online presence toggle hitting /astrologer-portal/online', () => {
    const src = read('app/astrologer-portal/page.tsx');
    expect(src).toContain('/astrologer-portal/online');
    expect(src).toMatch(/toggleOnline/);
  });
});

describe('Astrologer portal — earnings fixed (was dead admin route)', () => {
  it('earnings page reads the astrologer-own earnings endpoint, not /admin/commissions', () => {
    const src = read('app/astrologer-portal/earnings/page.tsx');
    expect(src).toContain('/astrologer-portal/earnings');
    expect(src).not.toContain('/admin/commissions');
    expect(src).not.toContain('CommissionsPanel');
  });
});
