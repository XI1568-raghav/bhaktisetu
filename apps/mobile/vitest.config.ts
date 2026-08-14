import { defineConfig } from 'vitest/config';

/**
 * Mobile unit tests.
 *
 * Scope, stated honestly: this is a NODE-environment runner for the app's pure
 * modules only — API adapters, gates and formatters under apps/mobile/lib. It
 * does NOT render React Native components; the app has no react-test-renderer /
 * jest-expo setup, and adding one is a separate piece of work. Screens are
 * covered here only to the extent that their data mapping lives in a pure
 * module the screen imports.
 *
 * Run: pnpm --filter @poojly/mobile test   (uses the workspace-root vitest)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
