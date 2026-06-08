// Minimal vitest config for kundli golden-chart regression — bypasses the global
// jsdom + @testing-library setup (deps not installed in this workspace) since
// vedic-astrology.ts is pure compute and needs no DOM.
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/kundli-golden-charts.test.ts'],
    css: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
