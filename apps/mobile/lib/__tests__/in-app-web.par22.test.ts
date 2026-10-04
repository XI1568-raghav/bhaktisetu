import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  IN_APP_WEB_ROUTE,
  isRenderableInApp,
  planWebHandoff,
  openWebHandoff,
  describeWebHandoff,
  type WebHandoffPlan,
} from '../in-app-web';

/**
 * PAR-22 — the in-app WebView, written BEFORE the dependency lands.
 *
 * WHAT THE PREVIOUS HANDOFF SAID, AND WHERE IT WAS WRONG
 * ------------------------------------------------------
 * "Once react-native-webview is installed the change is small and confined to
 * this lane." That treats the package as a PREREQUISITE for the code. It is
 * not, and the file the same note cites as the pattern proves it:
 * app/(devotee)/darshan-player.tsx `require()`s the module inside a try/catch
 * and renders a fallback when the require throws. It has always thrown in this
 * tree, and the player still compiles, still ships, still degrades cleanly.
 *
 * So the code half does not need the owner. What needed the owner was ONLY the
 * install — and until the code existed, installing it would have bought
 * nothing for these two links. That ordering is now reversed: this module and
 * app/(devotee)/web-view.tsx are the in-app path, dormant today because the
 * require fails, live the moment `npx expo install react-native-webview` runs.
 * No further mobile change is needed at that point.
 *
 * WHAT A WEBVIEW ACTUALLY BUYS, STATED HONESTLY
 * ---------------------------------------------
 * The back stack and the app-exit — nothing more. The web session lives in
 * localStorage['poojly_session'] and the app's in expo-secure-store, so the
 * devotee still signs in inside the WebView. The gain over Linking.openURL is
 * that the cookie/localStorage then PERSISTS across visits within the app, and
 * that the hardware back button returns to the app instead of leaving it. The
 * earlier note's "so the session and back-stack survive" overstated the first
 * half; this module's docblock says the narrower true thing.
 *
 * WHY AN ORIGIN ALLOWLIST IS PART OF THE FIX AND NOT A NICETY
 * ----------------------------------------------------------
 * The screen takes its URL from route params, and expo-router derives its
 * linking config from the file tree — so `darshya://(devotee)/web-view?url=…`
 * is reachable from any link a devotee can be made to tap. A chrome-less
 * full-screen WebView with no address bar, pointed at an attacker's URL, inside
 * an app the devotee trusts with a payment flow, is a credential-harvesting
 * surface that `Linking.openURL` never was — the system browser at least shows
 * the host. So the plan refuses any URL that is not http(s) on THIS build's own
 * web origin, and the screen re-checks before it renders.
 */

const MOBILE = path.resolve(__dirname, '..');

/** Comments blanked in place, so prose about a fix cannot satisfy a guard. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

const ORIGIN = 'https://darshya.online';

// ─── 1. the plan ────────────────────────────────────────────────────────────

describe('PAR-22 — planWebHandoff decides in-app vs browser', () => {
  it('keeps a same-origin page in the app when the WebView module is present', () => {
    const plan = planWebHandoff(
      { url: `${ORIGIN}/astrology/chat`, title: 'AI Jyotish' },
      { webViewAvailable: true, origin: ORIGIN },
    );
    expect(plan.kind).toBe('in-app');
    expect(plan).toEqual<WebHandoffPlan>({
      kind: 'in-app',
      pathname: IN_APP_WEB_ROUTE,
      params: { url: `${ORIGIN}/astrology/chat`, title: 'AI Jyotish' },
    });
  });

  it('falls back to the browser when the module is absent — which is TODAY', () => {
    // This is the branch every build from this tree actually takes, so it is
    // the one that must be identical to the behaviour being replaced.
    const plan = planWebHandoff(
      { url: `${ORIGIN}/astrology/chat`, title: 'AI Jyotish' },
      { webViewAvailable: false, origin: ORIGIN },
    );
    expect(plan).toEqual<WebHandoffPlan>({
      kind: 'browser',
      url: `${ORIGIN}/astrology/chat`,
    });
  });

  it('keeps the query string, so utm and service params survive the switch', () => {
    const url = `${ORIGIN}/astrology?utm_source=mobile-app&service=Kundli%20Matching`;
    const plan = planWebHandoff({ url, title: 'Astrology' }, { webViewAvailable: true, origin: ORIGIN });
    expect(plan.kind).toBe('in-app');
    expect(plan.kind === 'in-app' && plan.params.url).toBe(url);
  });

  it('a port and a scheme difference are both origin differences', () => {
    // A staging build resolves e.g. http://192.168.1.20:3000; a page on
    // :3001 or on https is NOT the same origin and must not be framed.
    const local = 'http://192.168.1.20:3000';
    for (const url of [
      'http://192.168.1.20:3001/astrology',
      'https://192.168.1.20:3000/astrology',
      'http://192.168.1.20/astrology',
    ]) {
      expect(
        planWebHandoff({ url, title: 't' }, { webViewAvailable: true, origin: local }).kind,
        url,
      ).toBe('browser');
    }
    expect(
      planWebHandoff(
        { url: `${local}/astrology`, title: 't' },
        { webViewAvailable: true, origin: local },
      ).kind,
    ).toBe('in-app');
  });
});

describe('PAR-22 — the allowlist refuses everything that is not this site', () => {
  const hostile = [
    'https://darshya.online.evil.example/pay', // suffix trick
    'https://evil.example/darshya.online', // path trick
    'https://darshya.online@evil.example/pay', // userinfo trick
    'http://darshya.online/pay', // scheme downgrade
    'javascript:alert(1)', // script scheme
    'data:text/html,<h1>hi</h1>', // inline document
    'file:///etc/passwd', // local file
    '//darshya.online/pay', // scheme-relative
    '/astrology', // relative
    '',
  ];

  for (const url of hostile) {
    it(`refuses to frame ${JSON.stringify(url)}`, () => {
      expect(isRenderableInApp(url, ORIGIN)).toBe(false);
      // …and the plan degrades to the browser rather than throwing: a hostile
      // deep link must not crash the screen either.
      expect(planWebHandoff({ url, title: 't' }, { webViewAvailable: true, origin: ORIGIN }).kind).toBe(
        'browser',
      );
    });
  }

  it('accepts the origin root and any path beneath it', () => {
    for (const url of [ORIGIN, `${ORIGIN}/`, `${ORIGIN}/bookings/pay?id=1`, `${ORIGIN}/help#faq`]) {
      expect(isRenderableInApp(url, ORIGIN), url).toBe(true);
    }
  });

  it('ignores a trailing slash on the configured origin', () => {
    expect(isRenderableInApp(`${ORIGIN}/help`, `${ORIGIN}/`)).toBe(true);
  });

  it('is case-insensitive on scheme and host, and only there', () => {
    expect(isRenderableInApp('HTTPS://DARSHYA.ONLINE/Help', ORIGIN)).toBe(true);
    // The PATH keeps its case — this is a host check, not a URL normaliser.
    expect(isRenderableInApp(`${ORIGIN}/HELP`, ORIGIN)).toBe(true);
  });
});

// ─── 2. the caller-facing helper ────────────────────────────────────────────

describe('PAR-22 — openWebHandoff routes through the injected io', () => {
  // Injected rather than imported for the reason lib/help-centre.ts documents:
  // vitest runs this package in plain node with no react-native transform, so
  // a module that imports `react-native` cannot be unit-tested at all.
  it('pushes the in-app route when the module is available', () => {
    const push = vi.fn();
    const openExternal = vi.fn();
    openWebHandoff(
      { url: `${ORIGIN}/astrology`, title: 'Astrology' },
      { webViewAvailable: true, origin: ORIGIN },
      { push, openExternal },
    );
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({
      pathname: IN_APP_WEB_ROUTE,
      params: { url: `${ORIGIN}/astrology`, title: 'Astrology' },
    });
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('opens the browser when it is not', () => {
    const push = vi.fn();
    const openExternal = vi.fn();
    openWebHandoff(
      { url: `${ORIGIN}/astrology`, title: 'Astrology' },
      { webViewAvailable: false, origin: ORIGIN },
      { push, openExternal },
    );
    expect(openExternal).toHaveBeenCalledWith(`${ORIGIN}/astrology`);
    expect(push).not.toHaveBeenCalled();
  });

  it('an opener that rejects does not become an unhandled rejection', async () => {
    // Linking.openURL rejects when no activity can handle the intent. On the
    // astrology screen that would replace a bounce-out with a red box.
    const push = vi.fn();
    const openExternal = vi.fn(() => Promise.reject(new Error('no handler')));
    expect(() =>
      openWebHandoff(
        { url: `${ORIGIN}/astrology`, title: 't' },
        { webViewAvailable: false, origin: ORIGIN },
        { push, openExternal },
      ),
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});

// ─── 3. the control describes what the tap will actually do ─────────────────

describe('PAR-22 — describeWebHandoff derives the affordance from the same decision', () => {
  /**
   * The astrology controls used to hardcode `accessibilityRole="link"` and the
   * hint "Opens darshya.online in your browser". That copy is a CLAIM about
   * where the tap goes, and once the destination became a runtime fact
   * (`WEBVIEW_AVAILABLE`) a hardcoded claim is wrong half the time. The
   * existing guard in astrology-bounceout-honesty.par22.test.ts counted
   * `Linking.openURL(` and required a matching `link` role — the right idea
   * against the old code, unenforceable against the new. It is rewritten
   * against this function instead, which is strictly stronger: role, hint and
   * glyph now come out of the SAME call that decides the route, so they cannot
   * disagree with it at all.
   */
  it('says "in the app" only when it will actually stay in the app', () => {
    const a = describeWebHandoff(
      { url: `${ORIGIN}/astrology`, title: 't' },
      { webViewAvailable: true, origin: ORIGIN },
      'darshya.online',
    );
    expect(a.leavesApp).toBe(false);
    expect(a.role).toBe('button');
    expect(a.icon).toBe('chevron-forward');
    expect(a.hint).toBe('Opens darshya.online in the app');
    expect(a.hint).not.toMatch(/browser/);
  });

  it('says "in your browser" when it will leave — the branch every build takes today', () => {
    const a = describeWebHandoff(
      { url: `${ORIGIN}/astrology`, title: 't' },
      { webViewAvailable: false, origin: ORIGIN },
      'darshya.online',
    );
    expect(a.leavesApp).toBe(true);
    expect(a.role).toBe('link');
    expect(a.icon).toBe('open-outline');
    expect(a.hint).toBe('Opens darshya.online in your browser');
  });

  it('a cross-origin target leaves the app even with the module installed', () => {
    // Because planWebHandoff refuses to frame it. If the two disagreed, the
    // control would announce an in-app screen and open the browser.
    const a = describeWebHandoff(
      { url: 'https://evil.example/x', title: 't' },
      { webViewAvailable: true, origin: ORIGIN },
      'darshya.online',
    );
    expect(a.leavesApp).toBe(true);
    expect(a.role).toBe('link');
  });

  it('agrees with planWebHandoff on every combination — that is the invariant', () => {
    for (const webViewAvailable of [true, false]) {
      for (const url of [`${ORIGIN}/a`, 'https://evil.example/a', 'javascript:x', '']) {
        const opts = { webViewAvailable, origin: ORIGIN };
        const plan = planWebHandoff({ url, title: 't' }, opts);
        const a = describeWebHandoff({ url, title: 't' }, opts, 'darshya.online');
        expect(a.leavesApp, `${webViewAvailable} ${url}`).toBe(plan.kind === 'browser');
      }
    }
  });
});

// ─── 4. the screen exists and is wired ──────────────────────────────────────

const SCREEN = path.join(MOBILE, '../app/(devotee)/web-view.tsx');
const ASTROLOGY = path.join(MOBILE, '../app/(devotee)/astrology.tsx');
const LAYOUT = path.join(MOBILE, '../app/(devotee)/_layout.tsx');
const PROBE = path.join(MOBILE, 'webview-module.ts');

describe('PAR-22 — the optional module is resolved in exactly one place', () => {
  const src = stripComments(readFileSync(PROBE, 'utf8'));

  it('requires react-native-webview the way darshan-player does — guarded', () => {
    expect(src).toMatch(/require\(\s*['"]react-native-webview['"]\s*\)/);
    // Guarded: an unguarded require crashes at import rather than degrading,
    // and in this tree the require ALWAYS throws.
    expect(src).toMatch(/catch/);
  });

  it('exports the availability as a value, not a hardcoded false', () => {
    expect(src).toMatch(/WEBVIEW_AVAILABLE/);
    expect(src).not.toMatch(/WEBVIEW_AVAILABLE(\s*:\s*boolean)?\s*=\s*false\b/);
  });

  it('is a pure module — no react-native import, so it stays unit-testable', () => {
    // apps/mobile/vitest.config.ts runs plain node with no RN transform.
    expect(src).not.toMatch(/from\s+['"]react-native['"]/);
  });
});

describe('PAR-22 — the in-app browser screen', () => {
  const raw = readFileSync(SCREEN, 'utf8');
  const src = stripComments(raw);

  it('the stripper actually removes this file class of comment', () => {
    expect(raw.length).toBe(src.length);
    expect(raw).not.toBe(src);
  });

  it('takes the component from the shared probe rather than re-requiring it', () => {
    // A second copy of the try/catch is how the two end up disagreeing about
    // whether an in-app frame exists.
    expect(src).toMatch(/from\s+['"]\.\.\/\.\.\/lib\/webview-module['"]/);
    expect(src).not.toMatch(/require\(\s*['"]react-native-webview['"]\s*\)/);
  });

  it('re-validates the URL param before rendering it', () => {
    // Defence in depth: planWebHandoff guards the call sites, this guards the
    // deep link. expo-router derives linking from the file tree, so the route
    // is addressable whether or not any screen pushes it.
    expect(src).toMatch(/isRenderableInApp\(/);
  });

  it('never interpolates the param into WebView source without that check', () => {
    const i = src.indexOf('isRenderableInApp(');
    const j = src.indexOf('source=');
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
  });

  it('offers the browser as the escape hatch instead of dead-ending', () => {
    expect(src).toMatch(/Linking\.openURL/);
  });

  it('does not hardcode the production host', () => {
    expect(src).not.toMatch(/https:\/\/darshya\.online/);
    expect(src).toMatch(/webOrigin\(\)/);
  });
});

describe('PAR-22 — expo-router bookkeeping for the new route', () => {
  it('is declared in the (devotee) layout with href:null', () => {
    // expo-router builds the tab list from the FILE SYSTEM. An undeclared
    // route file in a Tabs group is not unreachable — it is a permanent extra
    // tab labelled with its raw file name. tab-route-registration.par15.test.ts
    // is the general rule; this is the specific one for this screen, so the
    // failure names the screen.
    const layout = stripComments(readFileSync(LAYOUT, 'utf8'));
    const decl = layout.split('<Tabs.Screen').find((c) => /name=["']web-view["']/.test(c));
    expect(decl, 'no <Tabs.Screen name="web-view"> in app/(devotee)/_layout.tsx').toBeDefined();
    expect(decl!).toMatch(/href:\s*null/);
  });

  it('did not add a sixth visible tab', () => {
    const layout = stripComments(readFileSync(LAYOUT, 'utf8'));
    const visible = layout
      .split('<Tabs.Screen')
      .slice(1)
      .filter((chunk) => !/href:\s*null/.test(chunk))
      .map((chunk) => /name=["']([^"']+)["']/.exec(chunk)?.[1]);
    expect(visible).toEqual(['index', 'pujas', 'darshan', 'store', 'profile']);
  });

  it('the route constant matches the file that implements it', () => {
    // A constant that names a route no file serves pushes to a 404 screen.
    const file = IN_APP_WEB_ROUTE.replace('/(devotee)/', '');
    expect(readdirSync(path.join(MOBILE, '../app/(devotee)'))).toContain(`${file}.tsx`);
  });
});

describe('PAR-22 — the astrology bounce-outs now prefer the in-app view', () => {
  const src = stripComments(readFileSync(ASTROLOGY, 'utf8'));

  /**
   * The count these two assertions pin was 2 and is now 1.
   *
   * The Kundli Milan hand-off is gone because the calculation it pointed at
   * moved: packages/shared/src/astrology owns the Ashtakoot scorer, the Meeus
   * moon/Mars series, the Lahiri ayanamsa, the Almanac-for-Computers sunrise
   * solver and the numerology tables; apps/web/lib re-exports them; and
   * app/(devotee)/{kundli-milan,numerology,nakshatra-finder,manglik,rahu-kalam}
   * .tsx run them in the app. So the number below is DERIVED from the file
   * rather than restated — the real invariant was never "there are two", it is
   * "every hand-off is routed and described by the same call, and at least one
   * still exists to prove the mechanism is live". Ten tools (sade sati, dasha,
   * hora, shubh muhurat, kaal sarp, lal kitab, vastu, pitra dosh, pancha
   * pakshi, baby name) still bounce out, so the mechanism is exercised.
   *
   * lib/__tests__/astrology-parity.test.ts is what pins the other direction —
   * that the five in-app tools exist, are reachable, and cannot fork away from
   * the website's answers.
   */
  const handoffs = (src.match(/openWebHandoff\(/g) ?? []).length;

  it('every control goes through openWebHandoff rather than calling openURL raw', () => {
    expect(src).toMatch(/openWebHandoff\(/);
    expect(handoffs).toBeGreaterThan(0);
  });

  it('no bare Linking.openURL is left on the screen', () => {
    // The fallback still reaches Linking.openURL — through the injected io, so
    // there is exactly one place the destination is decided.
    const bare = (src.match(/Linking\.openURL\(/g) ?? []).length;
    expect(bare).toBe(0);
    expect(src).toMatch(/openExternal:\s*Linking\.openURL/);
  });

  it('every hand-off control describes itself through describeWebHandoff', () => {
    // Not a hardcoded role or hint anywhere: the destination is a runtime fact
    // now, so a literal claim about it is wrong in one of the two builds.
    const described = (src.match(/describeWebHandoff\(/g) ?? []).length;
    expect(described).toBe(handoffs);
    expect(src).not.toMatch(/accessibilityRole=["']link["']/);
    expect(src).not.toMatch(/in your browser['"`]/);
  });

  it('still resolves the origin from the build, not from a literal', () => {
    expect(src).not.toMatch(/https:\/\/darshya\.online/);
    expect(src).toMatch(/webOrigin\(\)/);
  });
});
