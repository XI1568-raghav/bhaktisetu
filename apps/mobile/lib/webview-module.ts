/**
 * The one place `react-native-webview` is resolved.
 *
 * The module is OPTIONAL and, in this tree, absent: it is not in
 * apps/mobile/package.json, not in node_modules, and appears in pnpm-lock.yaml
 * only as an optional peer of `expo`. Installing it is an owner action — a
 * native module needs a new EAS build and touches the root lockfile.
 *
 * app/(devotee)/darshan-player.tsx has require()d it behind a try/catch since
 * PAR-05 and degrades silently when the require throws, which it always does
 * here. PAR-22 adds a second consumer (app/(devotee)/web-view.tsx) and a third
 * caller that only needs to know whether the first two can work
 * (app/(devotee)/astrology.tsx). Three independent copies of the same
 * try/catch is how one of them ends up disagreeing with the others, so the
 * probe lives here once and `WEBVIEW_AVAILABLE` is the single answer.
 *
 * darshan-player.tsx deliberately keeps its own inline require: it is pinned by
 * lib/__tests__/astrology-bounceout-honesty.par22.test.ts as the evidence that
 * the app already depends on a package it does not declare, and moving it
 * would erase that evidence.
 *
 * WHEN THE PACKAGE IS INSTALLED, nothing here changes. The require succeeds,
 * `WEBVIEW_AVAILABLE` flips to true, and every consumer starts rendering in
 * app. That is the entire remaining cost of the owner action.
 */

import type { ComponentType } from 'react';

/**
 * The subset of react-native-webview's props this app uses. Declared
 * structurally rather than imported, because importing types from a package
 * that is not installed does not type-check.
 */
export interface OptionalWebViewProps {
  /**
   * react-native-webview's WebView is a CLASS component, so a plain `ref`
   * reaches the instance and `goBack()` works. React 18's `ComponentType<P>`
   * does not put `ref` in IntrinsicAttributes, so it has to be declared as a
   * prop here or every consumer fails tsc.
   */
  ref?: unknown;
  source: { uri?: string; html?: string; baseUrl?: string };
  style?: object;
  onLoadEnd?: () => void;
  onError?: () => void;
  onNavigationStateChange?: (state: { canGoBack?: boolean; url?: string }) => void;
  sharedCookiesEnabled?: boolean;
  thirdPartyCookiesEnabled?: boolean;
  domStorageEnabled?: boolean;
  originWhitelist?: string[];
  setSupportMultipleWindows?: boolean;
  allowsFullscreenVideo?: boolean;
  allowsInlineMediaPlayback?: boolean;
  mediaPlaybackRequiresUserAction?: boolean;
}

export type OptionalWebView = ComponentType<OptionalWebViewProps> | null;

function probe(): OptionalWebView {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod = require('react-native-webview') as { WebView?: OptionalWebView };
    return mod?.WebView ?? null;
  } catch {
    // Absent, or `require` itself is undefined (the vitest ESM runner). Both
    // mean the same thing to every caller: there is no in-app frame.
    return null;
  }
}

/** The component, or null. Resolved once at module load. */
export const WebViewComp: OptionalWebView = probe();

/**
 * Whether an in-app frame can be rendered at all in THIS build.
 *
 * `false` in every build produced from this repository today. Callers must
 * treat it as a runtime fact, never as a constant they can assume — that is
 * why it is exported rather than inlined.
 */
export const WEBVIEW_AVAILABLE: boolean = WebViewComp !== null;
