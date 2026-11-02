import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { markFreshSignIn, takeFreshSignIn, GURUKUL_PORTAL_PATH } from '../lib/gurukul-landing';

// QA 2026-10-31 (tester PDF 3): a gurukul manager signs in as a devotee and landed on
// /dashboard, which "feels like a devotee portal". Login stays one navigation (a lookup there
// cost every devotee 0.75-1.4 s on prod); it only leaves a marker and the dashboard, which
// already asks the API for the account's gurukuls, forwards an owner to the portal.

describe('fresh sign-in marker', () => {
  beforeEach(() => sessionStorage.clear());

  it('is taken once', () => {
    markFreshSignIn(1_000);
    expect(takeFreshSignIn(1_500)).toBe(true);
    expect(takeFreshSignIn(1_600)).toBe(false);
  });

  it('expires after a minute so a later dashboard visit never redirects', () => {
    markFreshSignIn(1_000);
    expect(takeFreshSignIn(1_000 + 61_000)).toBe(false);
  });

  it('is false when nothing was marked', () => {
    expect(takeFreshSignIn()).toBe(false);
  });

  it('points at the gurukul portal', () => {
    expect(GURUKUL_PORTAL_PATH).toBe('/gurukul-portal');
  });
});

describe('wiring', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  it('login marks only a plain devotee sign-in and adds no API call', () => {
    const src = read('app/auth/login/page.tsx');
    expect(src).toMatch(/user\.role === 'devotee' && !explicit && !isNew\) markFreshSignIn\(\)/);
    expect(src).not.toContain('gurukuls/mine/list');
  });

  it('dashboard forwards an owner with the browser location, not the router', () => {
    const src = read('app/dashboard/page.tsx');
    expect(src).toMatch(/takeFreshSignIn\(\) && d\.gurukuls\.length > 0\) window\.location\.replace\(GURUKUL_PORTAL_PATH\)/);
    expect(src).not.toMatch(/router\.(replace|push)\(['"`]\/gurukul-portal/);
  });
});
