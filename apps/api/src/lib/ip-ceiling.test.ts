import { describe, it, expect } from 'vitest';
import { createIpCeiling } from './ip-ceiling.js';

describe('createIpCeiling', () => {
  it('limits one IP after max hits regardless of credential, and resets with the window', () => {
    const check = createIpCeiling(3, 1000);
    const t = 1_000_000;
    expect(check('1.1.1.1', t).limited).toBe(false);
    expect(check('1.1.1.1', t).limited).toBe(false);
    expect(check('1.1.1.1', t).limited).toBe(false);
    const r = check('1.1.1.1', t + 10);
    expect(r.limited).toBe(true);
    expect(r.retryAfterSeconds).toBe(1);
    expect(check('2.2.2.2', t + 10).limited).toBe(false);
    expect(check('1.1.1.1', t + 1500).limited).toBe(false);
  });

  it('is disabled when max is 0 and bounded in memory', () => {
    expect(createIpCeiling(0)('x').limited).toBe(false);
    const check = createIpCeiling(1, 60_000, 3);
    for (let i = 0; i < 10; i++) check(`ip${i}`);
    expect(check('ip-new').limited).toBe(false);
  });
});
