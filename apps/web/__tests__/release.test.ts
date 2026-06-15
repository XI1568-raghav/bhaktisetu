import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRelease, getReleaseShortSha, hasReleaseTag } from '../lib/release';

describe('R-Q2-E-015 release surface', () => {
  const original = process.env.NEXT_PUBLIC_SENTRY_RELEASE;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_RELEASE;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_RELEASE;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_RELEASE = original;
    }
  });

  it('falls back to "dev" when env unset', () => {
    expect(getRelease()).toBe('dev');
    expect(getReleaseShortSha()).toBe('dev');
    expect(hasReleaseTag()).toBe(false);
  });

  it('parses darshya@<sha> tag', () => {
    process.env.NEXT_PUBLIC_SENTRY_RELEASE = 'darshya@abc1234567890def';
    expect(getRelease()).toBe('darshya@abc1234567890def');
    expect(getReleaseShortSha()).toBe('abc1234');
    expect(hasReleaseTag()).toBe(true);
  });

  it('handles tag without @ separator', () => {
    process.env.NEXT_PUBLIC_SENTRY_RELEASE = 'v1.2.3';
    expect(getReleaseShortSha()).toBe('v1.2.3');
    expect(hasReleaseTag()).toBe(true);
  });
});
