import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  NO_ENTITLEMENTS,
  fetchEntitlements,
  hasEntitlement,
  type EntitlementSnapshot,
} from '../lib/entitlement';

/**
 * TC-04 — the web half.
 *
 * At git HEAD apps/web/lib/entitlement.ts did not exist
 * (`git show HEAD:apps/web/lib/entitlement.ts` -> "path does not exist"), so
 * none of this could have passed. What existed instead:
 *
 *   lib/use-premium.ts        server-truth, bare `fetch` with no timeout,
 *                             ZERO call sites.
 *   components/useIsPremium.ts one call site (AdSlot.tsx), and it never asks
 *                             the server — it matches user.subscriptionTier
 *                             against ['pro','premium','bhakti_pass',
 *                             'annual_ratna'], none of which any API path
 *                             writes when a subscription activates.
 *
 * These tests pin the two properties that make an entitlement client safe to
 * gate money-bearing benefits on: it asks the SERVER, and it fails CLOSED.
 */

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('TC-04 — fetchEntitlements asks the server', () => {
  it('calls GET /subscriptions/entitlements with the bearer token', async () => {
    const spy = vi.fn().mockResolvedValue(
      jsonResponse({ tier: 'ENTERPRISE', entitlements: ['ads.suppressed'] }),
    );
    globalThis.fetch = spy as unknown as typeof fetch;

    const snap = await fetchEntitlements('tok-123');

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/subscriptions/entitlements');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
    expect(snap).toEqual({ tier: 'ENTERPRISE', entitlements: ['ads.suppressed'] });
  });

  it('passes an AbortSignal — no request may hang forever', async () => {
    // lib/use-premium.ts uses a bare fetch with no AbortController; that is
    // the RES-01 / AUTH-01 class that leaves a component spinning on a
    // half-open socket. This client must not repeat it.
    const spy = vi.fn().mockResolvedValue(jsonResponse({ tier: null, entitlements: [] }));
    globalThis.fetch = spy as unknown as typeof fetch;

    await fetchEntitlements('tok-123');

    const init = (spy.mock.calls[0] as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('TC-04 — the entitlement client fails CLOSED', () => {
  it('grants nothing when there is no token', async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;

    expect(await fetchEntitlements(null)).toEqual(NO_ENTITLEMENTS);
    expect(await fetchEntitlements(undefined)).toEqual(NO_ENTITLEMENTS);
    expect(spy).not.toHaveBeenCalled();
  });

  it('grants nothing on a 5xx', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'boom' }, 503)) as unknown as typeof fetch;

    expect(await fetchEntitlements('tok')).toEqual(NO_ENTITLEMENTS);
  });

  it('grants nothing on a 401', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'unauthorised' }, 401)) as unknown as typeof fetch;

    expect(await fetchEntitlements('tok')).toEqual(NO_ENTITLEMENTS);
  });

  it('grants nothing when the network throws', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    expect(await fetchEntitlements('tok')).toEqual(NO_ENTITLEMENTS);
  });

  it('grants nothing when the body is HTML rather than JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('<html>gateway error</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    ) as unknown as typeof fetch;

    expect(await fetchEntitlements('tok')).toEqual(NO_ENTITLEMENTS);
  });

  it('grants nothing when the server omits the entitlements array', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ tier: 'ENTERPRISE' })) as unknown as typeof fetch;

    expect(await fetchEntitlements('tok')).toEqual(NO_ENTITLEMENTS);
  });

  it('never infers an entitlement from a tier string', async () => {
    // The exact defect in components/useIsPremium.ts: it concluded "premium"
    // from a tier name and granted the ad suppression on that basis. A tier
    // with an empty capability list grants nothing here.
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ tier: 'ENTERPRISE', entitlements: [] })) as unknown as typeof fetch;

    const snap = await fetchEntitlements('tok');

    expect(snap.tier).toBe('ENTERPRISE');
    expect(hasEntitlement(snap, 'ads.suppressed')).toBe(false);
    expect(hasEntitlement(snap, 'ai_astro.unlimited')).toBe(false);
  });
});

describe('TC-04 — hasEntitlement', () => {
  const snap: EntitlementSnapshot = {
    tier: 'ENTERPRISE',
    entitlements: ['ads.suppressed', 'ai_astro.unlimited'],
  };

  it('grants a listed capability', () => {
    expect(hasEntitlement(snap, 'ads.suppressed')).toBe(true);
    expect(hasEntitlement(snap, 'ai_astro.unlimited')).toBe(true);
  });

  it('denies an unlisted capability', () => {
    expect(hasEntitlement(snap, 'booking.nri_surcharge_waived')).toBe(false);
    expect(hasEntitlement(NO_ENTITLEMENTS, 'ads.suppressed')).toBe(false);
  });
});

/**
 * ADDED 2026-09-01 — the clause the earlier passes left open.
 *
 * TC-04's headline is "the entitlement hook has zero call sites". Building
 * lib/entitlement.ts did not close it: the new client ALSO had zero call
 * sites, and lib/use-premium.ts was still sitting there with a comment
 * claiming four ("Used by AQ ad-gate, NRI surcharge bypass, priority-booking
 * gating, and the M3 AI astro paywall waiver") and no importers at all.
 *
 * These cases hold the wiring in place: the dead hook is gone, and the one
 * premium gate in apps/web reaches the server client rather than a tier
 * string. They fail against the tree as it stood on 2026-08-31.
 */
describe('TC-04 — the entitlement client is actually wired in', () => {
  const fsMod = require('node:fs') as typeof import('node:fs');
  const pathMod = require('node:path') as typeof import('node:path');
  const WEB = pathMod.resolve(__dirname, '..');

  it('the dead server-truth hook with the false call-site comment is deleted', () => {
    expect(fsMod.existsSync(pathMod.join(WEB, 'lib/use-premium.ts'))).toBe(false);
  });

  it('components/useIsPremium asks lib/entitlement and no longer reads a tier string', () => {
    const src = fsMod.readFileSync(pathMod.join(WEB, 'components/useIsPremium.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toMatch(/useEntitlement\(\s*'ads\.suppressed'\s*\)/);
    expect(code).not.toMatch(/subscriptionTier/);
    expect(code).not.toMatch(/isNriPremium/);
    expect(code).not.toMatch(/PREMIUM_TIERS/);
  });

  it('lib/entitlement.ts has at least one non-test importer', () => {
    const importers: string[] = [];
    (function walk(dir: string) {
      for (const e of fsMod.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (['node_modules', '.next', '__tests__', 'e2e', 'coverage'].includes(e.name)) continue;
          walk(pathMod.join(dir, e.name));
        } else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) {
          const p = pathMod.join(dir, e.name);
          if (p.endsWith(`lib${pathMod.sep}entitlement.ts`)) continue;
          if (/from ['"][^'"]*lib\/entitlement['"]/.test(fsMod.readFileSync(p, 'utf8'))) {
            importers.push(pathMod.relative(WEB, p).split(pathMod.sep).join('/'));
          }
        }
      }
    })(WEB);
    expect(importers).toContain('components/useIsPremium.ts');
  });
});
