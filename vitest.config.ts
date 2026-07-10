import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'apps/api/src/**/*.test.ts',
      'apps/api/scripts/**/*.test.ts',
      'packages/shared/src/**/*.test.ts',
      'scripts/**/*.test.mjs',
      'scripts/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/api/src/services/**', 'packages/shared/src/**'],
      // P2-37: honest, non-blocking thresholds. The current baseline against
      // this include is very low (~3% lines on a partial run; the services tree
      // is ~15k lines and the suite only exercises a fraction), so a 60% floor
      // would immediately fail CI. These gate catastrophic drops only — raise
      // them as real coverage is added (track via `vitest run --coverage`).
      thresholds: {
        lines: 1,
        functions: 40,
        branches: 1,
        statements: 1,
      },
    },
    // NOTE: web tests are intentionally NOT in the root `include`. apps/web
    // has its own vitest.config.ts (happy-dom env, JSX automatic runtime,
    // React alias pinning, setup files) and runs via `pnpm --filter @poojly/web
    // test` / turbo. The root config is node-env only (api/shared/scripts),
    // so web is not "silently skipped" — it runs in its own workspace task.
    // A `test:coverage` script still needs adding to the ROOT package.json
    // (A5 owns root package.json — flagged for integration; do NOT add here).
  },
});
