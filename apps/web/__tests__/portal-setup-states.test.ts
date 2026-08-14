import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const web = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

// S-06 / S-08 (prod sweep 2026-08-12), the web halves.
//
// S-06: /temple-portal/pujas showed an empty list and an enabled "Add Puja"
// button for a manager with no linked Temple; saving answered
// `400 {"error":"No matched Temple for this manager"}`, rendered verbatim.
//
// S-08: /gaushala-portal rendered four zero-filled stat tiles and "No donations
// yet" when the API said `profile: null` — every screen zeros with no
// explanation and no call to action.

describe('temple-portal pujas — unlinked account is explained (S-06)', () => {
  const page = web('app/temple-portal/pujas/page.tsx');
  const api = web('lib/temple-api.ts');

  it('reads the templeLinked signal the API now sends', () => {
    expect(api).toMatch(/templeLinked/);
    expect(api).toMatch(/listTemplePujasWithLinkState/);
    expect(page).toMatch(/listTemplePujasWithLinkState/);
  });

  it('renders a named blocker instead of a silent empty list', () => {
    expect(page).toMatch(/No temple linked to this account/);
  });

  it('does not invite an add that cannot succeed', () => {
    expect(page).toMatch(/disabled=\{!!templeLinkIssue\}/);
  });
});

describe('gaushala-portal — null profile is explained (S-08)', () => {
  const page = web('app/gaushala-portal/page.tsx');

  it('tracks the profile:null case the dashboard returns', () => {
    expect(page).toMatch(/profileMissing/);
    expect(page).toMatch(/j\.profile === null/);
  });

  it('tells the manager why every number is zero and what to do', () => {
    expect(page).toMatch(/Finish setting up your gaushala/);
    expect(page).toMatch(/gaushala-portal\/profile/);
  });
});
