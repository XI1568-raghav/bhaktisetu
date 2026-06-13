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
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/api/src/services/**', 'packages/shared/src/**'],
    },
  },
});
