import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PRODUCTION_WEB_ORIGIN,
  resolveWebOrigin,
  hostOf,
} from '../web-origin';
import { resumePaymentUrl } from '../booking-flow';

/**
 * PAR-15 — the payment hand-off must belong to the same environment as the
 * booking it is paying for.
 *
 * THE DEFECT (declared but left unfixed by the previous pass)
 * ----------------------------------------------------------
 * Every API call in this app goes through `apiBase()`, which reads
 * EXPO_PUBLIC_API_URL — that is how a development build talks to a LAN server
 * and how a preview build could talk to a staging API. `resumePaymentUrl`
 * ignored all of it and returned a literal `https://darshya.online/...`.
 *
 * So a build pointed anywhere other than production created a real booking on
 * THAT server and then opened PRODUCTION to pay for it. The id does not exist
 * there, so `/bookings/pay` can only fail — and it fails after the booking has
 * already taken a slot hold, in the one flow where the devotee is reaching for
 * their card. Silent cross-environment hand-off in a money path.
 *
 * THE SHAPE OF THE FIX
 * --------------------
 * The web origin is now resolved, not assumed:
 *
 *   1. EXPO_PUBLIC_WEB_URL when the build sets it — an operator saying so
 *      explicitly always wins.
 *   2. else derived from EXPO_PUBLIC_API_URL by dropping the `api.` label,
 *      which is exactly how the two hosts relate in every EAS profile
 *      (api.darshya.online → darshya.online).
 *   3. else production, and `matchesEnvironment` is FALSE — the caller is told
 *      the origin is a guess so it can say so on screen rather than shipping
 *      the devotee somewhere the booking does not exist.
 *
 * `resumePaymentUrl` now REQUIRES the origin. That is deliberate: an optional
 * parameter defaulting to production would let a new call site re-introduce the
 * bug by omission, and the type checker would say nothing.
 */

describe('PAR-15 resolveWebOrigin — the web origin belongs to the API it pairs with', () => {
  it('derives the production web host from the production API host', () => {
    const r = resolveWebOrigin('https://api.darshya.online');
    expect(r.origin).toBe('https://darshya.online');
    expect(r.matchesEnvironment).toBe(true);
  });

  it('derives a staging web host from a staging API host', () => {
    const r = resolveWebOrigin('https://api.staging.darshya.online');
    expect(r.origin).toBe('https://staging.darshya.online');
    expect(r.matchesEnvironment).toBe(true);
  });

  it('keeps the scheme and the port when it derives', () => {
    const r = resolveWebOrigin('http://api.localhost:4000');
    expect(r.origin).toBe('http://localhost:4000');
    expect(r.matchesEnvironment).toBe(true);
  });

  it('an explicit EXPO_PUBLIC_WEB_URL always wins over the derivation', () => {
    const r = resolveWebOrigin('https://api.darshya.online', 'http://192.168.1.100:3000');
    expect(r.origin).toBe('http://192.168.1.100:3000');
    expect(r.matchesEnvironment).toBe(true);
  });

  it('strips a trailing slash so the caller can concatenate a path', () => {
    expect(resolveWebOrigin(null, 'https://staging.example.test/').origin).toBe(
      'https://staging.example.test',
    );
  });

  it('a LAN dev API cannot be derived — production, and SAID to be a guess', () => {
    // This is the case the old literal handled silently and wrongly.
    const r = resolveWebOrigin('http://192.168.1.100:4000');
    expect(r.origin).toBe(PRODUCTION_WEB_ORIGIN);
    expect(r.matchesEnvironment).toBe(false);
  });

  it('an absent or unparseable API url is also a guess, never a silent default', () => {
    for (const api of [undefined, null, '', '   ', 'not a url']) {
      const r = resolveWebOrigin(api);
      expect(r.origin).toBe(PRODUCTION_WEB_ORIGIN);
      expect(r.matchesEnvironment, `api=${String(api)}`).toBe(false);
    }
  });

  it('hostOf names the site for a label, so a button cannot advertise the wrong one', () => {
    expect(hostOf('https://darshya.online')).toBe('darshya.online');
    expect(hostOf('http://192.168.1.100:3000')).toBe('192.168.1.100:3000');
    expect(hostOf('nonsense')).toBe('nonsense');
  });
});

describe('PAR-15 resumePaymentUrl carries no host of its own', () => {
  /** The `redirect` target the web login page will forward to after sign-in. */
  function redirectTarget(url: string): string {
    return decodeURIComponent(new RegExp('[?&]redirect=([^&]+)').exec(url)?.[1] ?? '');
  }

  it('builds the resume page on the origin it is given', () => {
    const url = resumePaymentUrl(
      'bk111111-1111-4000-8000-000000000001',
      'https://staging.darshya.online',
    );
    expect(url.startsWith('https://staging.darshya.online/')).toBe(true);
    expect(redirectTarget(url)).toMatch(/^\/bookings\/pay\?id=/);
    expect(url).toContain('bk111111-1111-4000-8000-000000000001');
    // The attribution the previous version carried must survive.
    expect(redirectTarget(url)).toContain('utm_source=mobile-app');
  });

  it('has no production host baked into it any more', () => {
    const url = resumePaymentUrl('bk-1', 'http://192.168.1.100:3000');
    expect(url).not.toContain('darshya.online');
  });

  it('still refuses to send the devotee back into the wizard', () => {
    const url = resumePaymentUrl('bk-1', 'https://darshya.online');
    expect(url).not.toContain('/pujas/book');
    expect(url).not.toContain('create-order');
  });

  /**
   * THE HAND-OFF SURVIVES THE WEB LOGIN GATE.
   *
   * apps/web/app/bookings/pay/page.tsx:445 wraps the page in <AuthGuard>, and
   * AuthGuard.tsx:37 redirects an unauthenticated visitor with
   *
   *     `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
   *
   * — `pathname` only. The `?id=<bookingId>` is DROPPED, so after signing in
   * the devotee lands on a /bookings/pay that has no booking to pay for, and
   * the flow dead-ends with the slot hold already taken.
   *
   * And they will be unauthenticated: the app's session lives in
   * expo-secure-store, the website's in localStorage['poojly_session'], and
   * opening a link in the mobile browser shares neither.
   *
   * So the app links through the login page itself with a redirect that keeps
   * the query string. apps/web/app/auth/login/page.tsx:31 returns a
   * root-relative redirect verbatim, and its authenticated-user effect
   * (:117-120) forwards to the same target, so this one URL is correct whether
   * or not the browser already has a session.
   *
   * Fixing AuthGuard to forward `pathname + search` is the root cause and is a
   * web-lane change; this URL is correct either way, so the two do not have to
   * land together.
   */
  it('routes through the login gate so the booking id survives sign-in', () => {
    const url = resumePaymentUrl('bk-42', 'https://darshya.online');
    expect(url).toMatch(/^https:\/\/darshya\.online\/auth\/login\?redirect=/);
    expect(redirectTarget(url)).toBe(
      '/bookings/pay?id=bk-42&utm_source=mobile-app&utm_medium=booking-payment',
    );
  });

  it('the redirect stays root-relative, so the web open-redirect guard accepts it', () => {
    // login/page.tsx safeRedirect: a root-relative value is returned verbatim;
    // anything protocol-relative or cross-origin is discarded and the devotee
    // would be dropped on their dashboard instead of the payment page.
    const target = redirectTarget(resumePaymentUrl('bk-1', 'https://darshya.online'));
    expect(target.startsWith('/')).toBe(true);
    expect(target.startsWith('//')).toBe(false);
  });

  it('a booking id with url-significant characters cannot break out of the redirect', () => {
    const url = resumePaymentUrl('bk&id=evil', 'https://darshya.online');
    expect(redirectTarget(url)).toBe(
      '/bookings/pay?id=bk%26id%3Devil&utm_source=mobile-app&utm_medium=booking-payment',
    );
  });
});

describe('PAR-15 — the booking screen resolves the origin instead of assuming it', () => {
  const SCREEN = path.resolve(__dirname, '../../app/(devotee)/puja-book.tsx');
  const raw = readFileSync(SCREEN, 'utf8');
  /** Comments blanked in place — prose about the fix cannot satisfy a guard. */
  const src = raw
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));

  it('the stripper actually removes this file class of comment', () => {
    expect(raw.length).toBe(src.length);
    expect(raw).not.toBe(src);
  });

  it('passes a resolved origin into resumePaymentUrl', () => {
    expect(src).toMatch(/resumePaymentUrl\(\s*created\.id\s*,/);
    expect(src).toMatch(/webOrigin\(\)/);
  });

  it('names the site it is actually opening, rather than a fixed string', () => {
    // "Pay on darshya.online" hardcoded next to a non-production origin is the
    // same lie the URL used to tell, moved into the label.
    expect(src).not.toMatch(/Pay on darshya\.online/);
    expect(src).toMatch(/hostOf\(/);
  });

  it('tells the devotee when the pay site is a guess, not the API environment', () => {
    expect(src).toMatch(/matchesEnvironment/);
  });
});

describe('PAR-15 — the build profiles declare the web origin', () => {
  const REPO_MOBILE = path.resolve(__dirname, '../..');

  it('every EAS profile that pins an API url also pins a web url', () => {
    const eas = JSON.parse(readFileSync(path.join(REPO_MOBILE, 'eas.json'), 'utf8')) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    const profiles = Object.entries(eas.build).filter(
      ([, cfg]) => typeof cfg.env?.EXPO_PUBLIC_API_URL === 'string',
    );
    // A silently empty list would make the assertion below vacuous.
    expect(profiles.length).toBeGreaterThanOrEqual(3);
    for (const [name, cfg] of profiles) {
      expect(cfg.env!.EXPO_PUBLIC_WEB_URL, `${name} pins an API url but no web url`).toBeTruthy();
    }
  });

  it('the resolver documents the variable and the fallback it guards', () => {
    // apps/mobile/.env.example is write-denied to this agent, so the variable
    // is documented at its source instead and flagged for the owner to mirror
    // into .env.example. Pinning it here means the documentation cannot be
    // dropped while the mechanism stays.
    const src = readFileSync(path.join(REPO_MOBILE, 'lib/web-origin.ts'), 'utf8');
    expect(src).toMatch(/EXPO_PUBLIC_WEB_URL/);
    expect(src).toMatch(/EXPO_PUBLIC_API_URL/);
  });
});
