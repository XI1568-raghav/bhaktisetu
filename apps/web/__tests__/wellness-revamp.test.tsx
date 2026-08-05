/**
 * Wellness instructor revamp (2026-08-05) — regression guards.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Wellness instructor — live-room editor (was unreachable)', () => {
  it('wellness-api exposes setWellnessSessionRoom hitting /sessions/:id/room', () => {
    const src = read('lib/wellness-api.ts');
    expect(src).toContain('setWellnessSessionRoom');
    expect(src).toContain('/room');
  });

  it('sessions page has a Set-room UI (endpoint was curl-only before)', () => {
    const src = read('app/wellness-portal/sessions/page.tsx');
    expect(src).toContain('setWellnessSessionRoom');
    expect(src).toMatch(/Set live-class room link|Room link set/);
  });
});

describe('Wellness dashboard — instructor share (not gross)', () => {
  it('dashboard shows the instructor-share label (was gross before)', () => {
    const src = read('app/wellness-portal/page.tsx');
    expect(src).toMatch(/instructorShare|You keep/);
  });
});
