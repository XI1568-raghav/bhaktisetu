import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// S-07 (prod sweep 2026-08-12), the web half. The empty state told the owner
// "Add your first product to start selling", the add POST answered
// `400 {"error":"No StoreProfile for this user"}`, and the page rendered that
// string verbatim via setError(err.message). No screen anywhere could create
// the missing profile.

const page = readFileSync(
  resolve(__dirname, '../app/store-admin/products/page.tsx'),
  'utf8',
);
const api = readFileSync(resolve(__dirname, '../lib/store-admin-api.ts'), 'utf8');

describe('store-admin products — store setup is reachable (S-07)', () => {
  it('reads the storeProfileMissing signal the API now sends', () => {
    expect(api).toMatch(/storeProfileMissing/);
    expect(page).toMatch(/storeProfileMissing/);
  });

  it('has a client call that creates the StoreProfile', () => {
    expect(api).toMatch(/saveStoreProfile/);
    expect(api).toMatch(/store-admin\/profile/);
    expect(api).toMatch(/method: 'PUT'/);
  });

  it('renders a setup form asking the owner for the store name', () => {
    expect(page).toMatch(/Finish setting up your store/);
    expect(page).toMatch(/Store name/);
    expect(page).toMatch(/saveStoreProfile/);
  });

  it('never invents a store name for the owner', () => {
    expect(page).not.toMatch(/'My Store'/);
    expect(page).not.toMatch(/`\$\{.*\}'s Store`/);
  });

  it('does not invite an add that is guaranteed to fail', () => {
    expect(page).toMatch(/disabled=\{storeSetupRequired\}/);
  });
});
