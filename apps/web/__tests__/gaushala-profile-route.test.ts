import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const web = (rel: string) => resolve(__dirname, '..', rel);

// COM-07 (prod sweep 2026-08-12): the "Approved gaushalas you can support
// directly" strip linked every real onboarded profile to /gaushala/<uuid> —
// which is the adoptable-COW route, `dynamicParams = false` with
// generateStaticParams over cow ids. Verified live: every one 404'd. The only
// clickable gaushalas on the page were the three fictional fixtures.

describe('gaushala profile route (COM-07)', () => {
  it('exists on its own segment so it cannot collide with the cow route', () => {
    expect(existsSync(web('app/gaushala/profile/[id]/page.tsx'))).toBe(true);
  });

  it('the cow route still owns /gaushala/[id]', () => {
    const cow = readFileSync(web('app/gaushala/[id]/page.tsx'), 'utf8');
    expect(cow).toMatch(/dynamicParams = false/);
  });

  it('the provider strip links gaushalas at the profile route', () => {
    const strip = readFileSync(web('components/ApprovedProvidersStrip.tsx'), 'utf8');
    expect(strip).toMatch(/gaushala\/profile\/\$\{id\}/);
    expect(strip).not.toMatch(/gaushala: \(id\) => `\/gaushala\/\$\{id\}`/);
  });

  it('the profile page 404s instead of rendering placeholder content', () => {
    const page = readFileSync(web('app/gaushala/profile/[id]/page.tsx'), 'utf8');
    expect(page).toMatch(/notFound\(\)/);
    // No fixture fallback: an unreachable API must not produce a fake gaushala.
    expect(page).not.toMatch(/gs_00\d/);
  });

  it('its donate CTA carries the resolved donation cause id', () => {
    const page = readFileSync(web('app/gaushala/profile/[id]/page.tsx'), 'utf8');
    expect(page).toMatch(/donationCauseId/);
    expect(page).toMatch(/causeKind=gaushala/);
  });
});

describe('donations page lists real gaushalas (S-05)', () => {
  const page = readFileSync(web('app/donations/page.tsx'), 'utf8');

  it('no longer hardcodes fictional gaushala causes', () => {
    expect(page).not.toMatch(/id: 'gs_00\d'/);
    expect(page).not.toMatch(/Kamdhenu Gaushala/);
    expect(page).not.toMatch(/Gokul Gaushala/);
  });

  it('reads the approved-provider directory', () => {
    expect(page).toMatch(/getApprovedProviders\('gaushala'/);
  });

  it('keys the donate link on the owner id the portal filters by', () => {
    expect(page).toMatch(/causeId: g\.userId \|\| g\.id/);
  });

  it('says so honestly when no gaushala is onboarded', () => {
    expect(page).toMatch(/No gaushalas are listed for donations yet/);
  });
});
