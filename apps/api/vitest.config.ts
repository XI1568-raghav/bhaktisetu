import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    // Razorpay `await import()` + client init under CPU contention (turbo
    // parallel build) was tripping the 5s default and false-failing 6
    // payment tests. 30s per-test + 2 forks caps memory + lets cold imports
    // settle.
    testTimeout: 30000,
    poolOptions: {
      forks: {
        maxForks: 2,
        singleFork: false,
      },
    },
  },
});
