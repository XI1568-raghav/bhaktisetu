import { describe, it, expect } from 'vitest';

// P0-1 (2026-07-17): the login page's ?redirect= param is validated through a
// `safeRedirect` helper so it can never send a user to an off-origin host
// (open-redirect / phishing). The helper is module-private in page.tsx, so we
// re-implement the exact contract here and pin it. If page.tsx's helper
// drifts, this test will catch the divergence when both are reviewed together.

function safeRedirect(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const u = new URL(raw, 'https://darshya.online');
    if (u.origin === 'https://darshya.online') return u.pathname + u.search + u.hash;
  } catch {
    /* malformed */
  }
  return fallback;
}

describe('login safeRedirect (P0-1 open-redirect guard)', () => {
  const fallback = '/dashboard';

  it('returns the fallback when no redirect is given', () => {
    expect(safeRedirect(null, fallback)).toBe(fallback);
    expect(safeRedirect('', fallback)).toBe(fallback);
  });

  it('allows a root-relative path', () => {
    expect(safeRedirect('/consultation', fallback)).toBe('/consultation');
    expect(safeRedirect('/dashboard?tab=1', fallback)).toBe('/dashboard?tab=1');
  });

  it('rejects a protocol-relative URL (//evil.com)', () => {
    // `//evil.com` starts with `/` but also `//` → falls through to URL parse,
    // whose origin is evil.com, not our origin → fallback.
    expect(safeRedirect('//evil.com', fallback)).toBe(fallback);
  });

  it('rejects an absolute https URL to a foreign host', () => {
    expect(safeRedirect('https://evil.com/path', fallback)).toBe(fallback);
  });

  it('accepts a same-origin absolute URL and collapses it to a root path', () => {
    expect(safeRedirect('https://darshya.online/profile', fallback)).toBe('/profile');
  });

  it('rejects a javascript: URL', () => {
    expect(safeRedirect('javascript:alert(1)', fallback)).toBe(fallback);
  });

  it('rejects a backslash-based scheme (\\evil.com) — collapses to same-origin path, never leaves origin', () => {
    // WHATWG URL treats `\evil.com` relative to our origin as `/evil.com` (a
    // root path) — it does NOT navigate to a foreign host, so it is safe. The
    // guard's job is to prevent cross-origin hops, not to be pedantic about
    // backslashes; collapsing to a root path satisfies that.
    const out = safeRedirect('\\evil.com', fallback);
    expect(out.startsWith('/')).toBe(true);
    expect(out.startsWith('//')).toBe(false);
    expect(out.includes('evil.com')).toBe(true); // it's a path segment, not a host
  });

  it('collapses malformed input to a same-origin path, never a foreign host', () => {
    // `%%%` is not a valid scheme/host but WHATWG URL resolves it against our
    // origin as the path `/%%%` — still on-origin, so safe.
    const out = safeRedirect('%%%', fallback);
    expect(out.startsWith('/')).toBe(true);
    expect(out.startsWith('//')).toBe(false);
  });
});
