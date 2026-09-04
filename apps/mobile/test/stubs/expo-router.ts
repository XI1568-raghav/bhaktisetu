/**
 * Minimal `expo-router` stub for the node-environment vitest runner.
 *
 * Same reason as test/stubs/react-native.ts: expo-router resolves to .tsx
 * source that the plain node runner cannot parse ("Unexpected token '<'"),
 * which blocks collection of any test whose module imports `useRouter` — even
 * when the logic under test is pure. Keep it tiny and behaviour-free.
 */

export const router = {
  push: () => {},
  replace: () => {},
  back: () => {},
  navigate: () => {},
};

export const useRouter = () => router;
export const useLocalSearchParams = () => ({});
export const usePathname = () => '/';
export const useSegments = () => [];
