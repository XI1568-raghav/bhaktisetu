/**
 * PAR-22 — the in-app web view, and the decision of when to use it.
 *
 * WHY THIS SHIPS BEFORE THE DEPENDENCY
 * ------------------------------------
 * `react-native-webview` is still not declared in apps/mobile/package.json, and
 * installing it is an owner action: it is a native module, so it needs a new
 * EAS build and it touches the root pnpm-lock.yaml. Four waves of handoff notes
 * treated that as a blocker for the CODE, and it never was.
 * app/(devotee)/darshan-player.tsx has `require()`d the module inside a
 * try/catch since PAR-05 — the require throws in every build produced from this
 * tree and the player degrades to "open in YouTube" without crashing, without
 * failing tsc, and without failing vitest.
 *
 * So the ordering is inverted here. The in-app path is written now and is
 * dormant: `isRenderableInApp` gates it, `planWebHandoff` routes around it, and
 * every call site behaves EXACTLY as it does today. The moment someone runs
 * `npx expo install react-native-webview`, the same code starts keeping the
 * devotee in the app, with no further change in this lane.
 *
 * WHAT A WEBVIEW ACTUALLY BUYS — SAID NARROWLY, ON PURPOSE
 * -------------------------------------------------------
 * The BACK STACK and the APP-EXIT. Not the session.
 *
 * The website keeps its session in localStorage['poojly_session']; the app
 * keeps its in expo-secure-store. A WebView shares neither, so the devotee
 * still signs in inside the frame. What changes is that the WebView's own
 * cookie/localStorage jar then persists across visits WITHIN the app, so the
 * second trip does not ask again — and the hardware back button returns to the
 * app instead of leaving it. An earlier note wrote "so the session and
 * back-stack survive", which claims the app's session carries over. It does
 * not, and a screen that implied it would be lying to a devotee about to type
 * a password.
 *
 * WHY THE ORIGIN ALLOWLIST IS PART OF THE FIX
 * -------------------------------------------
 * expo-router derives its linking configuration from the FILE TREE, so
 * `darshya://(devotee)/web-view?url=…` is addressable from any link a devotee
 * can be induced to tap — the hand-written allowlist in lib/deep-link.ts does
 * not constrain it. A chrome-less full-screen WebView with no address bar,
 * inside an app the devotee already trusts with a booking and a payment, is a
 * credential-harvesting surface that `Linking.openURL` never was: the system
 * browser at least shows the host. So nothing but http(s) on THIS build's own
 * web origin is ever framed, the check is a pure function, and the screen
 * re-runs it on the param it receives rather than trusting its caller.
 *
 * Pure and dependency-free: apps/mobile/vitest.config.ts runs this package in
 * plain node with no react-native transform, so anything that imports
 * `react-native` at the top level cannot be unit-tested at all. The screen
 * injects `router.push` and `Linking.openURL`; the tests inject stubs.
 */

/** The expo-router path of the in-app browser screen. */
export const IN_APP_WEB_ROUTE = '/(devotee)/web-view';

export interface WebHandoff {
  /** Absolute http(s) URL. Only same-origin URLs are ever framed. */
  url: string;
  /** Header title, shown while the page loads and after it fails. */
  title: string;
}

export type WebHandoffPlan =
  | { kind: 'in-app'; pathname: string; params: { url: string; title: string } }
  | { kind: 'browser'; url: string };

/**
 * Scheme + authority, lowercased — or null when the string is not an absolute
 * http(s) URL we are willing to reason about.
 *
 * Deliberately a regex and not `new URL`. React Native's URL is a partial
 * polyfill whose parsing has historically differed from the browser's, and an
 * origin check that disagrees with the WebView's own resolution is worse than
 * no check. lib/web-origin.ts settled on the same approach for the same reason.
 */
function originOf(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (url.length === 0) return null;
  // A backslash is normalised to a forward slash by browsers and by both
  // platform WebViews, so `https:/\evil.example` navigates to evil.example
  // while looking origin-shaped to a naive parser. Refuse rather than guess.
  if (/[\\\s]/.test(url)) return null;
  const m = /^(https?):\/\/([^/?#\\\s]+)/i.exec(url);
  if (!m) return null;
  const authority = m[2]!;
  // `https://darshya.online@evil.example/` has host evil.example. The authority
  // compare below would already reject it; refusing userinfo outright means the
  // rejection does not depend on getting that compare exactly right.
  if (authority.includes('@')) return null;
  return `${m[1]!.toLowerCase()}://${authority.toLowerCase()}`;
}

/**
 * May this URL be rendered inside the app's own chrome-less WebView?
 *
 * Only when it is http(s) and its origin — scheme, host AND port — is exactly
 * the origin this build was configured with. A port or scheme difference is an
 * origin difference: a development build resolves `http://192.168.1.20:3000`,
 * and a page on `:3001` is a different server that happens to share a LAN.
 */
export function isRenderableInApp(url: string, origin: string): boolean {
  const target = originOf(url);
  const allowed = originOf(origin);
  return target !== null && allowed !== null && target === allowed;
}

/**
 * Where this hand-off should go. `webViewAvailable` is the result of the
 * optional require, passed in rather than probed here so this module stays
 * free of `require` and the screen owns the single try/catch.
 */
export function planWebHandoff(
  target: WebHandoff,
  opts: { webViewAvailable: boolean; origin: string },
): WebHandoffPlan {
  if (opts.webViewAvailable && isRenderableInApp(target.url, opts.origin)) {
    return {
      kind: 'in-app',
      pathname: IN_APP_WEB_ROUTE,
      params: { url: target.url, title: target.title },
    };
  }
  return { kind: 'browser', url: target.url };
}

export interface WebHandoffAffordance {
  /** true when the tap will leave the app for the system browser. */
  leavesApp: boolean;
  /** accessibilityRole — `link` only when the control really leaves. */
  role: 'button' | 'link';
  /** accessibilityHint that names where the tap actually goes. */
  hint: string;
  /** Ionicons glyph: a chevron stays, an external-link arrow leaves. */
  icon: 'chevron-forward' | 'open-outline';
}

/**
 * How the control must describe ITSELF, derived from the same decision that
 * routes it.
 *
 * The astrology controls used to hardcode `accessibilityRole="link"` and the
 * hint "Opens darshya.online in your browser". That was correct while every
 * hand-off was unconditionally a browser hand-off. It stops being correct the
 * moment the destination depends on `WEBVIEW_AVAILABLE`: a hardcoded claim is
 * then wrong in exactly one of the two builds, and the failure mode is the one
 * this audit keeps finding — a control that says one thing and does another,
 * to a screen reader that has no other source of truth.
 *
 * Returning role, hint and glyph from the same function that returns the plan
 * makes disagreement unrepresentable rather than merely unlikely.
 */
export function describeWebHandoff(
  target: WebHandoff,
  opts: { webViewAvailable: boolean; origin: string },
  hostLabel: string,
): WebHandoffAffordance {
  const leavesApp = planWebHandoff(target, opts).kind === 'browser';
  return {
    leavesApp,
    role: leavesApp ? 'link' : 'button',
    hint: leavesApp
      ? `Opens ${hostLabel} in your browser`
      : `Opens ${hostLabel} in the app`,
    icon: leavesApp ? 'open-outline' : 'chevron-forward',
  };
}

export interface WebHandoffIo {
  /** `router.push` — pathname plus params, the expo-router object form. */
  push: (route: { pathname: string; params: { url: string; title: string } }) => void;
  /** `Linking.openURL`. May reject; the rejection is swallowed here. */
  openExternal: (url: string) => Promise<unknown> | void;
}

/**
 * Act on the plan.
 *
 * The external open is fire-and-forget with its rejection caught: Linking
 * rejects when no activity can handle the intent, and an unhandled rejection
 * on a catalogue screen turns a failed bounce-out into a red box. The same
 * reasoning as lib/help-centre.ts's `openHelpCentre`.
 */
export function openWebHandoff(
  target: WebHandoff,
  opts: { webViewAvailable: boolean; origin: string },
  io: WebHandoffIo,
): WebHandoffPlan {
  const plan = planWebHandoff(target, opts);
  if (plan.kind === 'in-app') {
    io.push({ pathname: plan.pathname, params: plan.params });
    return plan;
  }
  try {
    const result = io.openExternal(plan.url);
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      void (result as Promise<unknown>).catch(() => undefined);
    }
  } catch {
    // Nothing can be done about a device with no browser, and the screen the
    // devotee is standing on must survive it.
  }
  return plan;
}
