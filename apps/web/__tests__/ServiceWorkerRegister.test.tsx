import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';

import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';

type SW = { register: ReturnType<typeof vi.fn> };

function installServiceWorker(): SW {
  const sw: SW = { register: vi.fn().mockResolvedValue({}) };
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: sw,
  });
  return sw;
}

function uninstallServiceWorker(): void {
  try {
    // @ts-expect-error — test cleanup
    delete (window.navigator as { serviceWorker?: unknown }).serviceWorker;
  } catch {
    // happy-dom navigator may be a Proxy that refuses delete; reassign instead.
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });
  }
}

describe('ServiceWorkerRegister', () => {
  beforeEach(() => {
    // Run synchronously instead of waiting for real requestIdleCallback.
    (window as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
    }).requestIdleCallback = (cb: () => void): number => {
      cb();
      return 1;
    };
  });

  afterEach(() => {
    uninstallServiceWorker();
  });

  it('registers /sw.js when serviceWorker API is available', () => {
    const sw = installServiceWorker();
    render(<ServiceWorkerRegister />);
    expect(sw.register).toHaveBeenCalledWith('/sw.js');
  });

  it('no-ops gracefully when serviceWorker API is absent', () => {
    uninstallServiceWorker();
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow();
  });

  it('swallows registration rejection without bubbling', async () => {
    const sw: SW = { register: vi.fn().mockRejectedValue(new Error('boom')) };
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: sw,
    });
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow();
    // allow microtasks to settle
    await Promise.resolve();
    expect(sw.register).toHaveBeenCalled();
  });
});
