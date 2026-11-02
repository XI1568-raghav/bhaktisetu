import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ownsGurukul, resolveLoginLanding } from '../lib/gurukul-landing';

// QA 2026-10-31 (tester PDF 3): a gurukul manager signs in as a devotee and landed on
// /dashboard, which "feels like a devotee portal". Sign-in now routes an owner to
// /gurukul-portal; nobody else changes.

const opts = {
  role: 'devotee',
  accessToken: 'tok',
  hasExplicitRedirect: false,
  isNewAccount: false,
  fallback: '/dashboard',
};

function mockFetch(impl: () => Promise<Response> | Response) {
  const spy = vi.fn(async () => impl());
  vi.stubGlobal('fetch', spy);
  return spy;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('gurukul login landing', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('sends a devotee who owns a gurukul to /gurukul-portal', async () => {
    const spy = mockFetch(() => json({ gurukuls: [{ id: 'g1' }] }));
    expect(await resolveLoginLanding(opts)).toBe('/gurukul-portal');
    expect(String((spy.mock.calls[0] as unknown[])[0])).toContain('/gurukuls/mine/list');
  });

  it('keeps a devotee with no gurukul on /dashboard', async () => {
    mockFetch(() => json({ gurukuls: [] }));
    expect(await resolveLoginLanding(opts)).toBe('/dashboard');
  });

  it('falls back to the dashboard on a 401, a 500, a network error or a bad body', async () => {
    mockFetch(() => json({}, 401));
    expect(await ownsGurukul('tok')).toBe(false);
    mockFetch(() => json({}, 500));
    expect(await ownsGurukul('tok')).toBe(false);
    mockFetch(() => Promise.reject(new Error('offline')));
    expect(await resolveLoginLanding(opts)).toBe('/dashboard');
    mockFetch(() => json({ gurukuls: 'nope' }));
    expect(await ownsGurukul('tok')).toBe(false);
  });

  it('does not probe (or change anything) for other roles, explicit redirects or new accounts', async () => {
    const spy = mockFetch(() => json({ gurukuls: [{ id: 'g1' }] }));
    expect(await resolveLoginLanding({ ...opts, role: 'priest', fallback: '/priest' })).toBe('/priest');
    expect(await resolveLoginLanding({ ...opts, hasExplicitRedirect: true, fallback: '/consultation' })).toBe('/consultation');
    expect(await resolveLoginLanding({ ...opts, isNewAccount: true, fallback: '/profile' })).toBe('/profile');
    expect(await resolveLoginLanding({ ...opts, accessToken: undefined })).toBe('/dashboard');
    expect(spy).not.toHaveBeenCalled();
  });

  it('the login page routes through resolveLoginLanding exactly once', () => {
    const src = readFileSync(join(__dirname, '../app/auth/login/page.tsx'), 'utf8');
    expect(src).toContain('resolveLoginLanding');
    expect(src).toContain('landingStartedRef');
  });
});
