/**
 * The referral programme is hidden (gated, not deleted) while
 * HAS_REFERRAL_CREDIT is false.
 *
 * Why: referral credit is unusable today. Only the referrer is credited
 * (WalletService.creditUser from routes/referrals.ts) and nothing in the
 * product spends that balance, so "earn Rs 100 in wallet credit" is a promise
 * the product cannot keep. Flip lib/referral-flag.ts to true once credit can be
 * spent; the API routes and data are untouched.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: null, isAuthenticated: false, isLoading: false, user: null }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('flag', () => {
  it('is false', async () => {
    const { HAS_REFERRAL_CREDIT } = await import('../lib/referral-flag');
    expect(HAS_REFERRAL_CREDIT).toBe(false);
  });
});

describe('/refer while the flag is false', () => {
  it('renders a clear coming-soon state with no credit promise and no API call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { default: ReferPage } = await import('../app/refer/page');
    const { container } = render(<ReferPage />);
    await act(async () => {});
    const text = container.textContent ?? '';
    expect(text).toMatch(/coming soon/i);
    expect(text).not.toMatch(/₹\s*\d+/);
    expect(text).not.toMatch(/wallet/i);
    expect(text).not.toMatch(/earn/i);
    expect(container.querySelector('a[href*="/auth/login?next=/refer"]')).toBeNull();
    expect(container.querySelector('input[type="email"]')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders the real programme again when the flag is flipped on', async () => {
    vi.doMock('../lib/referral-flag', () => ({ HAS_REFERRAL_CREDIT: true }));
    const { default: ReferPage } = await import('../app/refer/page');
    const { container } = render(<ReferPage />);
    await act(async () => {});
    expect(container.textContent).toMatch(/Refer & Earn/);
    vi.doUnmock('../lib/referral-flag');
  });

  it('metadata does not promise credits and keeps the page out of search', async () => {
    const { metadata } = await import('../app/refer/layout');
    const blob = JSON.stringify(metadata);
    expect(blob).not.toMatch(/earn|credit/i);
    expect((metadata.robots as { index?: boolean } | undefined)?.index).toBe(false);
  });
});

describe('no hidden entry point remains', () => {
  it('sitemap does not list /refer', async () => {
    const { default: sitemap } = await import('../app/sitemap');
    const entries = await sitemap();
    expect(entries.map((e) => new URL(e.url).pathname)).not.toContain('/refer');
  });

  it('the root layout only mounts ReferralCapture behind the flag', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toMatch(/HAS_REFERRAL_CREDIT\s*&&\s*<ReferralCapture\s*\/>/);
    expect(layout).not.toMatch(/^\s*<ReferralCapture\s*\/>/m);
  });

  /** Every source file under app/, components/ and lib/ that is not part of the gated programme itself. */
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '__tests__' || name === '.next') continue;
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(tsx?|mdx?)$/.test(name)) out.push(p);
    }
    return out;
  }
  const GATED = new Set([
    'app/refer/page.tsx',
    'app/refer/layout.tsx',
    'components/ReferralCapture.tsx',
    'lib/referral-flag.ts',
  ]);
  const files = ['app', 'components', 'lib']
    .flatMap((d) => walk(path.join(WEB, d)))
    .map((f) => path.relative(WEB, f))
    .filter((f) => !GATED.has(f));

  it('nothing links to /refer', () => {
    const offenders = files.filter((f) => /["'`]\/refer(["'`?#/])/.test(read(f)));
    // sitemap.ts mentions it only inside the flag guard; asserted separately above.
    expect(offenders.filter((f) => f !== 'app/sitemap.ts')).toEqual([]);
  });

  it('no page copy promises referral credit', () => {
    const rx = /refer\s*(&|&amp;|and)\s*earn|referral credit|earn\s+(₹|rs\.?\s*)\d+|₹\s*\d+\s+(in\s+)?wallet credit|wallet credit.*refer/i;
    const offenders = files.filter((f) => rx.test(read(f)));
    expect(offenders).toEqual([]);
  });
});
