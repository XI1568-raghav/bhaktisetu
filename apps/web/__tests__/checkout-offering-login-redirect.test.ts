/**
 * PF-03 (prod sweep 2026-08-12) — signing in dropped the offering you picked.
 *
 * Observed: navigating to /checkout/offering?id=<offeringId> while logged out
 * ended at /auth/login?redirect=%2Fcheckout%2Foffering — the query string was
 * gone. The page's only input is that param (`sp.get('id')`), so after signing
 * in the devotee landed on a checkout that no longer knew what they were
 * buying and had to find the offering again from scratch. The code comment
 * directly above the redirect promised the opposite ("they land back on the
 * same checkout after signing in"). It fired at the moment of highest purchase
 * intent, on both the auth-gate effect and the Pay button's own guard.
 *
 * DF-01 had already solved exactly this for the temple wizard with
 * `buildLoginRedirect(pathname, search)` in lib/booking-draft.ts — including
 * the open-redirect guard. This page was simply left behind, which is the
 * dominant defect class in this repo: one side fixed, the other not.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildLoginRedirect } from '../lib/booking-draft';

const src = readFileSync(
  path.resolve(__dirname, '..', 'app/checkout/offering/page.tsx'),
  'utf8',
);

describe('PF-03 — the offering checkout preserves its query string through login', () => {
  it('does not build the redirect from pathname alone', () => {
    expect(src).not.toMatch(/encodeURIComponent\(\s*window\.location\.pathname\s*\)/);
  });

  it('uses the shared buildLoginRedirect helper', () => {
    expect(src).toMatch(/from '[^']*lib\/booking-draft'/);
    expect(src).toContain('buildLoginRedirect(');
  });

  it('routes BOTH redirect sites through it — the effect and the Pay guard', () => {
    const uses = src.match(/buildLoginRedirect\(/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
    // Nothing may hand-roll `/auth/login?redirect=` around the helper.
    expect(src).not.toMatch(/`\/auth\/login\?redirect=\$\{/);
  });

  it('the helper carries ?id= through to the login target', () => {
    const href = buildLoginRedirect('/checkout/offering', '?id=1f0a-offering');
    expect(href).toBe(
      `/auth/login?redirect=${encodeURIComponent('/checkout/offering?id=1f0a-offering')}`,
    );
    expect(decodeURIComponent(href)).toContain('?id=1f0a-offering');
  });

  it('still refuses an off-origin target (the open-redirect guard survives)', () => {
    expect(buildLoginRedirect('https://evil.example/steal', '?id=x')).toBe(
      `/auth/login?redirect=${encodeURIComponent('/steal?id=x')}`,
    );
    expect(buildLoginRedirect('//evil.example', '')).toBe(
      `/auth/login?redirect=${encodeURIComponent('/')}`,
    );
  });
});
