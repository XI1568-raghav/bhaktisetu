/**
 * Minimal `react-native` stub for the node-environment vitest runner.
 *
 * The real package ships Flow-typed source (`import typeof Alert from …`) that
 * neither vite nor rollup can parse, so any module importing it — even one whose
 * exported logic is pure — fails at collection with
 * "Parse failure: Expected 'from', got 'typeOf'".
 *
 * This stub exists so pure logic can be tested even when it sits in a file that
 * also touches RN's JS-only surface (e.g. `lib/deep-link.ts` imports `Linking`
 * for its hook while `parseDeepLink` itself is pure). It is deliberately tiny:
 * add to it only when a test genuinely needs another RN export, and never give
 * it real behaviour — a test that depends on RN actually doing something wants
 * a component runner (jest-expo / react-test-renderer), not this.
 */

export const Linking = {
  getInitialURL: async (): Promise<string | null> => null,
  addEventListener: () => ({ remove: () => {} }),
  openURL: async (): Promise<void> => {},
  canOpenURL: async (): Promise<boolean> => false,
};

export const Platform = {
  OS: 'android' as 'android' | 'ios' | 'web',
  select: <T,>(spec: { android?: T; ios?: T; native?: T; default?: T }): T | undefined =>
    spec.android ?? spec.native ?? spec.default,
};

export const Alert = { alert: () => {} };

export const Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: (s: unknown) => s,
  hairlineWidth: 1,
  absoluteFillObject: {},
};
