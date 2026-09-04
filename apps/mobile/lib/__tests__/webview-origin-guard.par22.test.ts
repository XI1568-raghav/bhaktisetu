import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  isRenderableInApp,
  webViewOriginWhitelist,
  makeNavigationGuard,
} from '../in-app-web';

/**
 * PAR-22 — the in-app frame's origin controls were both wrong. Dormantly.
 *
 * PAR-22's whole promise is that the in-app path is written NOW and goes live
 * "with NO further mobile edit" the moment someone runs
 * `npx expo install react-native-webview`. Two defects in
 * app/(devotee)/web-view.tsx made that promise false — invisibly, because the
 * module is absent so neither could fire.
 *
 * DEFECT 1 — the allowlist matched nothing at all.
 *
 * The screen passed `originWhitelist={[`${WEB.origin}/*`]}`, i.e.
 * `['https://darshya.online/*']`. Every other allowlist in this codebase is a
 * path glob, so it reads correctly. react-native-webview's is not. From the
 * library's own WebViewShared source:
 *
 *   const extractOrigin = (url) =>
 *     /^[A-Za-z][A-Za-z0-9+\-.]+:(\/\/)?[^/]* /.exec(url)?.[0] ?? '';
 *   const originWhitelistToRegex = (e) =>
 *     `^${escapeStringRegexp(e).replace(/\\\*'/g, '.*')}`;
 *   const passesWhitelist = (compiled, url) =>
 *     compiled.some((x) => new RegExp(x).test(extractOrigin(url)));
 *
 * and the prop's documented contract: the strings "get matched against just
 * the origin (not the full URL)". `extractOrigin` stops at the first path
 * slash, so it yields `https://darshya.online` — never a trailing slash. The
 * entry compiles to `^https://darshya\.online/.*`, which demands a slash and
 * at least one more character. It can never match. Every navigation inside the
 * frame would fail the allowlist and be handed to the OS, so each link tap
 * ejects the devotee to Chrome or Safari — the exact behaviour the screen was
 * built to remove, reintroduced by a two-character suffix, and arriving on the
 * same day as the install.
 *
 * DEFECT 2 — the correct allowlist value is still not a sufficient control.
 *
 * `originWhitelistToRegex` anchors at the START and nowhere else, so the
 * fixed-up entry `https://darshya.online` compiles to
 * `^https://darshya\.online` and matches the origin
 * `https://darshya.online.evil.example` just as happily. A prefix match on a
 * hostname is a registrable-domain bypass, and the surface it opens is a
 * chrome-less full-screen frame with no address bar inside an app the devotee
 * already trusts with a payment. There is no anchored form of the prop — the
 * library's own default `https://*` is prefix-only by design — so the exact
 * decision has to move to `onShouldStartLoadWithRequest`, which is a function.
 *
 * WHAT THIS FILE ASSERTS, AND WHAT IT REFUSES TO PROVE BY RE-IMPLEMENTATION
 * ------------------------------------------------------------------------
 * The library is not installed in this tree, so its matcher cannot be called.
 * The transcription below is used ONLY to show the shape of the failure — the
 * load-bearing assertions do not depend on it: `webViewOriginWhitelist` is
 * checked structurally (an entry the library can match carries no path at all),
 * and `makeNavigationGuard` is checked directly against the hostnames a prefix
 * match would wrongly admit. A test that proved a library's behaviour by
 * asserting against its own copy of that library is how apps/api's rate-limit
 * suite stayed green while the server shared one bucket across the platform.
 */

const MOBILE = path.resolve(__dirname, '..');
const ORIGIN = 'https://darshya.online';

/** Comments blanked in place, so prose about a fix cannot satisfy a guard. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

// ─── a transcription of the library, used for illustration only ─────────────

function extractOrigin(url: string): string {
  return /^[A-Za-z][A-Za-z0-9+\-.]+:(\/\/)?[^/]*/.exec(url)?.[0] ?? '';
}

function entryToRegex(entry: string): RegExp {
  const escaped = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\\\*/g, '.*')}`);
}

function passesWhitelist(entries: string[], url: string): boolean {
  const origin = extractOrigin(url);
  return entries.some((e) => entryToRegex(e).test(origin));
}

describe('PAR-22 — webViewOriginWhitelist emits what the library can match', () => {
  it('is the bare origin — scheme and authority, no path segment', () => {
    // THE load-bearing assertion, and it needs no model of the library: the
    // prop is compared against an origin, and an origin never has a path. Any
    // entry carrying one is unsatisfiable by construction.
    const list = webViewOriginWhitelist(ORIGIN);
    expect(list).toEqual([ORIGIN]);
    for (const entry of list) {
      expect(entry, `whitelist entry has a path component: ${entry}`).toMatch(
        /^https?:\/\/[^/?#]+$/,
      );
    }
  });

  it('lowercases and tolerates a value that arrived with junk around it', () => {
    expect(webViewOriginWhitelist('  HTTPS://Darshya.Online  ')).toEqual([ORIGIN]);
  });

  it('keeps the port, because a port is part of an origin', () => {
    expect(webViewOriginWhitelist('http://192.168.1.20:3000')).toEqual([
      'http://192.168.1.20:3000',
    ]);
  });

  it('allows NOTHING rather than everything when the origin is unusable', () => {
    // The failure mode to avoid is falling back to the library default
    // ['http://*','https://*'], which frames any host on earth.
    for (const bad of ['', '   ', 'darshya.online', 'javascript:alert(1)', 'https:/\\x']) {
      expect(webViewOriginWhitelist(bad), bad).toEqual([]);
    }
  });

  it('the suffix that was shipped is unsatisfiable, and the fix is not', () => {
    // Illustration, not proof — see the docblock. The assertion above stands
    // on its own; this one shows the concrete consequence.
    const shipped = [`${ORIGIN}/*`];
    expect(passesWhitelist(shipped, `${ORIGIN}/astrology`)).toBe(false);
    expect(passesWhitelist(shipped, ORIGIN)).toBe(false);

    const fixed = webViewOriginWhitelist(ORIGIN);
    expect(passesWhitelist(fixed, `${ORIGIN}/astrology`)).toBe(true);
    expect(passesWhitelist(fixed, `${ORIGIN}/weddings/muhurat?x=1`)).toBe(true);
  });
});

describe('PAR-22 — makeNavigationGuard is the control that actually holds', () => {
  const guard = makeNavigationGuard(ORIGIN);

  it('admits this build own origin, on any path', () => {
    for (const url of [ORIGIN, `${ORIGIN}/astrology`, `${ORIGIN}/a/b?c=d#e`]) {
      expect(guard({ url }), url).toBe(true);
    }
  });

  it('refuses the registrable-domain prefix a start-anchored regex would admit', () => {
    // This is the whole reason the guard exists. The corrected whitelist entry
    // ADMITS these; the guard must not.
    const impostors = [
      'https://darshya.online.evil.example/login',
      'https://darshya.onlinex.example/login',
      'https://darshya.online.attacker.co.in/pay',
    ];
    for (const url of impostors) {
      expect(passesWhitelist(webViewOriginWhitelist(ORIGIN), url), `whitelist: ${url}`).toBe(true);
      expect(guard({ url }), `guard: ${url}`).toBe(false);
    }
  });

  it('refuses a different scheme, host or port', () => {
    for (const url of [
      'http://darshya.online/x',
      'https://evil.example/x',
      'https://darshya.online:8443/x',
      'https://sub.darshya.online/x',
    ]) {
      expect(guard({ url }), url).toBe(false);
    }
  });

  it('refuses non-http schemes, including the ones a payment page would emit', () => {
    // The screen is explicitly not for the payment hand-off; if someone points
    // it there anyway, upi:/intent: must not be treated as navigable.
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,<h1>x',
      'upi://pay?pa=x',
      'intent://scan#Intent;scheme=upi;end',
      'file:///etc/passwd',
    ]) {
      expect(guard({ url }), url).toBe(false);
    }
  });

  it('refuses a request with no URL rather than guessing', () => {
    expect(guard({})).toBe(false);
    expect(guard({ url: undefined })).toBe(false);
    expect(guard({ url: null })).toBe(false);
    expect(guard({ url: '' })).toBe(false);
  });

  it('never disagrees with isRenderableInApp — one decision, two callers', () => {
    for (const url of [
      ORIGIN,
      `${ORIGIN}/a`,
      'https://darshya.online.evil.example/a',
      'https://evil.example/a',
      'https://darshya.online@evil.example/a',
      'https:/\\darshya.online/a',
      'javascript:x',
      '',
    ]) {
      expect(guard({ url }), url).toBe(isRenderableInApp(url, ORIGIN));
    }
  });

  it('allows nothing at all when the build origin is unusable', () => {
    const blind = makeNavigationGuard('not-an-origin');
    expect(blind({ url: ORIGIN })).toBe(false);
    expect(blind({ url: 'https://anything.example' })).toBe(false);
  });
});

describe('PAR-22 — the screen uses both controls, on the frame itself', () => {
  const SCREEN = path.join(MOBILE, '../app/(devotee)/web-view.tsx');
  const raw = readFileSync(SCREEN, 'utf8');
  const src = stripComments(raw);

  it('the stripper actually removes this file class of comment', () => {
    expect(raw.length).toBe(src.length);
    expect(raw).not.toBe(src);
  });

  it('the unsatisfiable path-glob literal is gone from the code', () => {
    // Comments are blanked above, so the paragraph in the screen explaining
    // this very bug cannot satisfy the guard by containing the string.
    expect(src).not.toMatch(/originWhitelist=\{\[/);
    expect(src).not.toMatch(/\$\{WEB\.origin\}\/\*/);
  });

  it('passes BOTH props on the <Frame> element, not merely somewhere in the file', () => {
    // The distinction matters: a constant declared at module scope and never
    // handed to the component is exactly the shape of a control that looks
    // present and does nothing.
    const open = src.indexOf('<Frame');
    expect(open, 'no <Frame element in the screen').toBeGreaterThan(-1);
    const close = src.indexOf('/>', open);
    expect(close).toBeGreaterThan(open);
    const element = src.slice(open, close);

    expect(element).toMatch(/originWhitelist=\{ORIGIN_WHITELIST\}/);
    expect(element).toMatch(/onShouldStartLoadWithRequest=\{NAVIGATION_GUARD\}/);
  });

  it('derives both from lib/in-app-web rather than spelling them inline', () => {
    expect(src).toMatch(/webViewOriginWhitelist\(/);
    expect(src).toMatch(/makeNavigationGuard\(/);
    expect(src).toMatch(/ORIGIN_WHITELIST\s*=\s*webViewOriginWhitelist\(WEB\.origin\)/);
    expect(src).toMatch(/NAVIGATION_GUARD\s*=\s*makeNavigationGuard\(WEB\.origin\)/);
  });

  it('the optional-module prop surface declares the hook, or tsc would reject it', () => {
    const probe = stripComments(readFileSync(path.join(MOBILE, 'webview-module.ts'), 'utf8'));
    expect(probe).toMatch(/onShouldStartLoadWithRequest\?:/);
  });
});
