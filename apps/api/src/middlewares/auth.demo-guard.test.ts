import { describe, it, expect } from 'vitest';
import { shouldRejectDemoTokensInProd } from './auth.js';

// P0 #ag-03 (2026-07-09): the demo-token admin bypass is guarded by a
// boot-fatal check. This locks the guard's logic so a regression (e.g.
// dropping the NODE_ENV condition) is caught before deploy.

describe('shouldRejectDemoTokensInProd', () => {
  it('rejects when ALLOW_DEMO_TOKENS=true in production', () => {
    expect(
      shouldRejectDemoTokensInProd({ ALLOW_DEMO_TOKENS: 'true', NODE_ENV: 'production' }),
    ).toBe(true);
  });

  it('does NOT reject in non-production even if demo tokens are allowed', () => {
    expect(
      shouldRejectDemoTokensInProd({ ALLOW_DEMO_TOKENS: 'true', NODE_ENV: 'development' }),
    ).toBe(false);
    expect(
      shouldRejectDemoTokensInProd({ ALLOW_DEMO_TOKENS: 'true', NODE_ENV: 'test' }),
    ).toBe(false);
  });

  it('does NOT reject in production when demo tokens are disabled', () => {
    expect(
      shouldRejectDemoTokensInProd({ ALLOW_DEMO_TOKENS: 'false', NODE_ENV: 'production' }),
    ).toBe(false);
    expect(shouldRejectDemoTokensInProd({ NODE_ENV: 'production' })).toBe(false);
  });

  it('does NOT reject when neither flag is set', () => {
    expect(shouldRejectDemoTokensInProd({})).toBe(false);
  });
});
