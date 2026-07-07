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
      // The pnpm workspace installs multiple PHYSICAL copies of React 19.2.5:
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
          '../../node_modules/.pnpm/react-dom@19.2.5_react@19.2.5/node_modules/react-dom/client.js',
        ),
      },
      {
        find: 'react-dom',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react-dom@19.2.5_react@19.2.5/node_modules/react-dom',
        ),
      },
      {
        find: 'react/jsx-dev-runtime',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react@19.2.5/node_modules/react/jsx-dev-runtime.js',
        ),
      },
      {
        find: 'react/jsx-runtime',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react@19.2.5/node_modules/react/jsx-runtime.js',
        ),
      },
      {
        find: 'react',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react@19.2.5/node_modules/react',
        ),
      },
      {
        find: 'scheduler',
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/scheduler@0.27.0/node_modules/scheduler',
        ),
      },
    ],
  },
});
