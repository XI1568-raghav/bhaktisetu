import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// findBy* / waitFor default to a 1s ceiling. ~110 test files lean on that
// default, and under full-suite CPU contention (happy-dom + dynamic page
// imports) a healthy render can exceed 1s, so tests failed on TIMEOUT rather
// than on any assertion (I18N-07 /profile was the visible one). 5s is a ceiling
// for a stuck render, not a budget: waits still return the moment the
// condition holds, so passing tests are not slower.
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
}
