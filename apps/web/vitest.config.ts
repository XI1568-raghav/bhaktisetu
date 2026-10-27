import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}', 'app/**/__tests__/**/*.test.{ts,tsx}'],
    css: false,

    // ── Suite stability, added 2026-08-23 after three false alarms in one day ──
    //
    // This suite passed 35 files a few months ago and now runs ~300. At that
    // size, unbounded file parallelism starved render-heavy tests of CPU and
    // they failed on TIMEOUT rather than on any assertion. Three separate
    // batches were investigated as regressions and all three turned out to be
    // contention — identical code went green the moment it ran serially
    // (6 files / 74 tests, and an API signature test that needs 14.5s alone).
    //
    // The cost is not the wasted investigation. It is that a full-suite failure
    // stopped being evidence: the honest reading of a red run became "probably
    // contention", which is exactly the state in which a real regression walks
    // through. A slower suite that means something beats a fast one that does
    // not.
    //
    // maxThreads is capped rather than parallelism disabled outright — serial
    // execution of ~300 files is slow enough that people skip it, and a gate
    // nobody runs is worse than a flaky one.
    poolOptions: {
      threads: { maxThreads: 4, minThreads: 1 },
    },
    // happy-dom render + async assertions routinely exceed vitest's 5s default
    // on a loaded machine. These are ceilings for a hung test, not budgets any
    // healthy test should approach.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './') },
      // The `server-only` package is a Next.js runtime guard that throws when
      // imported on the client. pnpm doesn't hoist it into apps/web, so vitest
      // can't resolve it — alias to a no-op stub so server-only modules load.
      {
        find: 'server-only',
        replacement: path.resolve(__dirname, './__tests__/__stubs__/server-only.ts'),
      },
      // The pnpm workspace installs multiple PHYSICAL copies of React 19.3.1:
      // one under apps/web/node_modules/react and a separate one in the .pnpm
      // store that react-dom and @testing-library/react reach through their
      // peer symlinks (plus a stale 18.3.1 hoisted at the worktree root). Even
      // though the files are byte-identical, Node treats them as separate
      // module instances, so the hooks dispatcher set by react-dom isn't
      // visible to the component → "Invalid hook call / Cannot read properties
      // of null (reading 'useState')". Pin React, React-DOM and scheduler —
      // including the `exports` subpaths the automatic JSX runtime and
      // react-dom/client use — to the exact .pnpm store copies react-dom
      // already uses, so every importer shares one physical React instance.
      // Entries are ordered most-specific first so `react-dom/client` matches
      // before `react-dom`.
      {
        find: 'react-dom/client',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react-dom@19.3.1_react@19.3.1/node_modules/react-dom/client.js',
        ),
      },
      {
        find: 'react-dom',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react-dom@19.3.1_react@19.3.1/node_modules/react-dom',
        ),
      },
      {
        find: 'react/jsx-dev-runtime',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react@19.3.1/node_modules/react/jsx-dev-runtime.js',
        ),
      },
      {
        find: 'react/jsx-runtime',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react@19.3.1/node_modules/react/jsx-runtime.js',
        ),
      },
      {
        find: 'react',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react@19.3.1/node_modules/react',
        ),
      },
      {
        find: 'scheduler',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/scheduler@0.28.0/node_modules/scheduler',
        ),
      },
    ],
  },
});
