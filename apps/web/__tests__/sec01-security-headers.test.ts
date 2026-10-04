/**
 * SEC-01 — darshya.online ships ZERO security headers.
 *
 * The 3.7 KB `apps/web/public/_headers` file declares a full set: HSTS,
 * X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
 * and a Content-Security-Policy. None of it reaches a browser.
 *
 * `_headers` is a CLOUDFLARE PAGES / Workers-Static-Assets mechanism. The web
 * app was cut over to Render (Next `output: 'standalone'` in a Docker image —
 * see next.config.ts and apps/web/Dockerfile) and Render's Node server has no
 * idea the file exists; it is served as a static asset at /_headers and
 * otherwise ignored. So every declaration in it has been inert since the
 * cutover. Verified against production on 2026-08-19, before the Render
 * account suspension: no CSP, no HSTS, no XFO, no nosniff, no Referrer-Policy.
 *
 * The only header mechanism Render actually honours is the one Next itself
 * implements: `headers()` in next.config.ts (and middleware). These tests bind
 * to that, and to PARITY with `_headers` so the two can never silently drift
 * again.
 *
 * NOTE ON PARSING `_headers`: that file is comment-bearing (`#` lines), and a
 * scan that forgot to strip them would happily "find" a header name inside the
 * prose explaining why it was removed. The parser below drops comments and
 * blanks before it reads anything, and only looks at the `/*` (all paths)
 * block — not at the per-path blocks further down.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import nextConfig from '../next.config';

type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> };

async function rules(): Promise<HeaderRule[]> {
  expect(typeof nextConfig.headers).toBe('function');
  return (await nextConfig.headers!()) as HeaderRule[];
}

/** Every header applied to a rule whose source matches every path. */
async function globalHeaders(): Promise<Map<string, string>> {
  const all = await rules();
  const out = new Map<string, string>();
  for (const rule of all) {
    // `/:path*` / `/(.*)` are the two Next spellings of "everything".
    if (rule.source !== '/:path*' && rule.source !== '/(.*)') continue;
    for (const h of rule.headers) out.set(h.key.toLowerCase(), h.value);
  }
  return out;
}

async function headersForSource(source: string): Promise<Map<string, string>> {
  const all = await rules();
  const out = new Map<string, string>();
  for (const rule of all) {
    if (rule.source !== source) continue;
    for (const h of rule.headers) out.set(h.key.toLowerCase(), h.value);
  }
  return out;
}

/**
 * Header NAMES declared in the `/*` block of public/_headers, with comments
 * and blank lines removed first.
 */
function headersFileGlobalKeys(): string[] {
  const raw = readFileSync(
    path.resolve(__dirname, '..', 'public', '_headers'),
    'utf8',
  );
  const lines = raw
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'));

  const keys: string[] = [];
  let inGlobalBlock = false;
  for (const line of lines) {
    const isPathLine = !/^\s/.test(line);
    if (isPathLine) {
      inGlobalBlock = line.trim() === '/*';
      continue;
    }
    if (!inGlobalBlock) continue;
    const key = line.split(':')[0]?.trim();
    if (key) keys.push(key);
  }
  return keys;
}

/** Parse a CSP into directive → source-list. */
function directives(csp: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of csp.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    out.set(name!.toLowerCase(), sources.join(' '));
  }
  return out;
}

describe('SEC-01 — Render serves the security headers, not just Cloudflare', () => {
  it('declares every non-CSP security header globally', async () => {
    const h = await globalHeaders();

    expect(h.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains; preload',
    );
    expect(h.get('x-frame-options')).toBe('DENY');
    expect(h.get('x-content-type-options')).toBe('nosniff');
    expect(h.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(h.get('permissions-policy')).toBeTruthy();
  });

  it('declares a Content-Security-Policy globally', async () => {
    const h = await globalHeaders();
    expect(
      h.get('content-security-policy'),
      'without this an injected script has no policy stopping it exfiltrating the ' +
        'localStorage session (SEC-02) to any origin it likes',
    ).toBeTruthy();
  });

  it('does not drift from what public/_headers already declared', async () => {
    const h = await globalHeaders();
    const declared = headersFileGlobalKeys();

    // Sanity: the parser must actually have found the block. If _headers is
    // ever deleted this test should fail loudly rather than pass vacuously.
    expect(declared.length).toBeGreaterThanOrEqual(6);

    for (const key of declared) {
      // Content-Security-Policy-Report-Only is DELIBERATELY not ported: its
      // `report-uri /api/csp-report` endpoint does not exist in apps/web
      // (there is no app/api/csp-report route), so every violation report
      // would be a 404 round-trip. Port it together with the endpoint.
      if (key.toLowerCase() === 'content-security-policy-report-only') continue;
      expect(
        h.has(key.toLowerCase()),
        `${key} is declared in public/_headers, which Render ignores, and nowhere Render honours`,
      ).toBe(true);
    }
  });

  it('keeps /admin out of search indexes (the other _headers rule Render drops)', async () => {
    const h = await headersForSource('/admin/:path*');
    expect(h.get('x-robots-tag')).toBe('noindex, nofollow');
  });
});

describe('SEC-01 — the CSP must not break the app it protects', () => {
  it('allows the inline scripts Next.js hydration emits', async () => {
    const csp = (await globalHeaders()).get('content-security-policy')!;
    const d = directives(csp);
    // Next 15 inlines its bootstrap/flight payload scripts. Without
    // 'unsafe-inline' (and no nonce plumbing in this app) the page ships HTML
    // that never hydrates — an over-tight CSP is a full outage, not a warning.
    expect(d.get('script-src')).toContain("'unsafe-inline'");
    expect(d.get('style-src')).toContain("'unsafe-inline'");
  });

  it('allows the app to reach its own API, Supabase and the payment SDK', async () => {
    const csp = (await globalHeaders()).get('content-security-policy')!;
    const d = directives(csp);

    expect(d.get('connect-src')).toContain('https://api.darshya.online');
    expect(d.get('connect-src')).toContain('https://*.supabase.co');
    expect(d.get('script-src')).toContain('https://checkout.razorpay.com');
    expect(d.get('frame-src')).toContain('https://checkout.razorpay.com');
  });

  // Found by opening Razorpay checkout in a browser (customer test 2026-10-05):
  // the console logged one CSP violation for each of these, and card
  // authentication (3-D Secure) and Razorpay's risk check run through them. The
  // test above only covered checkout.razorpay.com, so the policy looked
  // complete while a real payment would hit these blocks.
  it('lets Razorpay checkout load its risk script, its authentication frame and its logger', async () => {
    const d = directives((await globalHeaders()).get('content-security-policy')!);

    expect(d.get('script-src')).toContain('https://cdn.razorpay.com');
    expect(d.get('frame-src')).toContain('https://api.razorpay.com');
    expect(d.get('connect-src')).toContain('https://lumberjack.razorpay.com');
  });

  it('still closes the directives that make a CSP worth having', async () => {
    const csp = (await globalHeaders()).get('content-security-policy')!;
    const d = directives(csp);

    expect(d.get('default-src')).toBe("'self'");
    expect(d.get('object-src')).toBe("'none'");
    expect(d.get('base-uri')).toBe("'self'");
    expect(d.get('frame-ancestors')).toBe("'none'");
    expect(d.has('form-action')).toBe(true);
  });

  it('never allows eval in a production policy', async () => {
    // Guard against a dev-only relaxation leaking into the shipped policy.
    // NODE_ENV is 'test' under vitest, so ask for the production build
    // explicitly rather than trusting whatever the runner set.
    const { productionContentSecurityPolicy } = await import('../next.config');
    expect(productionContentSecurityPolicy()).not.toContain("'unsafe-eval'");
    expect(productionContentSecurityPolicy()).toContain('upgrade-insecure-requests');
  });
});
