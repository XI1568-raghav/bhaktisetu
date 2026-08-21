/**
 * AUTH-10 — sign-in HTML must never be held by a shared cache.
 *
 * Every route under /auth is a `'use client'` page with no `revalidate` and no
 * `dynamic` export, so Next prerenders all seven of them. For a prerendered
 * app-router page Next derives the response header from
 * `getCacheControlHeader({ revalidate: false })` in
 * next/dist/server/lib/cache-control.js, whose final branch is literally
 *
 *     return `s-maxage=${CACHE_ONE_YEAR}${swrHeader}`;   // CACHE_ONE_YEAR = 31536000
 *
 * i.e. a ONE-YEAR shared-cache lifetime on the sign-in shell. Behind Cloudflare
 * that means a shared cache can keep serving a PRE-DEPLOY HTML shell whose
 * <script src="/_next/static/chunks/…"> URLs the new build no longer emits.
 * The document paints, hydration never runs, and every button on the page is a
 * dead spinner — the exact symptom the owner reported, and one that is
 * impossible to reproduce from a healthy cache.
 *
 * The fix belongs in next.config.ts `headers()` rather than in the pages,
 * because that is the ONE header mechanism Render honours (SEC-01: Render
 * ignores public/_headers) AND because Next explicitly yields to it —
 * next/dist/server/send-payload.js:
 *
 *     // If cache control is already set on the response we don't
 *     // override it to allow users to customize it via next.config
 *     if (cacheControl && !res.getHeader('Cache-Control')) { … }
 *
 * so a next.config rule set before the render wins over the one-year default.
 *
 * This guard imports next.config as a MODULE and evaluates its real `headers()`
 * output — it never scans source text, so there is no comment-stripping hazard
 * and no way for a rule that exists only inside a comment to satisfy it. Route
 * discovery reads the filesystem so a NEW /auth/* route added later is covered
 * automatically instead of silently escaping the rule.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import nextConfig from '../../../next.config';

type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> };

const AUTH_DIR = path.resolve(__dirname, '..');

/** Every real /auth/* route on disk (a directory that actually has a page). */
function authRoutes(): string[] {
  const routes = readdirSync(AUTH_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== '__tests__')
    .filter((e) =>
      ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some((f) =>
        existsSync(path.join(AUTH_DIR, e.name, f)),
      ),
    )
    .map((e) => `/auth/${e.name}`);
  return routes.sort();
}

async function rules(): Promise<HeaderRule[]> {
  expect(typeof nextConfig.headers).toBe('function');
  return (await nextConfig.headers!()) as HeaderRule[];
}

/**
 * Cache-Control values that would actually be emitted for `pathname`, using
 * Next's OWN path matcher (next/dist/shared/lib/router/utils/path-match) rather
 * than a hand-rolled approximation of its `:param*` syntax.
 */
async function cacheControlFor(pathname: string): Promise<string[]> {
  const all = await rules();
  const out: string[] = [];
  for (const rule of all) {
    if (!getPathMatch(rule.source)(pathname)) continue;
    for (const h of rule.headers) {
      if (h.key.toLowerCase() === 'cache-control') out.push(h.value.toLowerCase());
    }
  }
  return out;
}

describe('AUTH-10 — /auth/* is never shared-cacheable', () => {
  it('finds all seven auth routes on disk', () => {
    // Anchors the sweep below: if this drops to 1 because discovery broke,
    // the per-route assertions would vacuously pass.
    const routes = authRoutes();
    expect(routes).toEqual([
      '/auth/callback',
      '/auth/forgot-password',
      '/auth/login',
      '/auth/logout',
      '/auth/reset-password',
      '/auth/signup',
      '/auth/verify',
    ]);
  });

  for (const route of authRoutes()) {
    it(`${route} declares a no-store Cache-Control`, async () => {
      const values = await cacheControlFor(route);
      expect(
        values.length,
        `${route} has NO Cache-Control rule in next.config headers(), so Next serves it with its prerender default s-maxage=31536000`,
      ).toBeGreaterThan(0);

      for (const v of values) {
        expect(v, `${route} -> "${v}"`).toContain('no-store');
        expect(v, `${route} -> "${v}"`).toContain('private');
        // A shared cache must not be told it may keep this document at all.
        expect(v, `${route} -> "${v}"`).not.toContain('s-maxage');
        expect(v, `${route} -> "${v}"`).not.toMatch(/\bpublic\b/);
        expect(v, `${route} -> "${v}"`).not.toContain('stale-while-revalidate');
      }
    });
  }

  it('the /auth rule does not leak onto unrelated routes', async () => {
    // A rule written as `/:path*` or `/auth:path*` would blanket the whole site
    // and destroy the CDN caching the marketing pages depend on.
    for (const other of ['/', '/temples/somnath', '/pujas/satyanarayan', '/authors']) {
      const values = await cacheControlFor(other);
      for (const v of values) {
        expect(v, `${other} must not inherit the auth no-store rule`).not.toContain('no-store');
      }
    }
  });

  it('the auth pages really are prerendered, which is why the header is required', () => {
    // If someone later adds `export const dynamic = 'force-dynamic'` the pages
    // stop being statically cached and this finding's premise changes — but the
    // header rule is still correct, so this only documents the premise.
    const routes = authRoutes();
    expect(routes.length).toBe(7);
  });
});
