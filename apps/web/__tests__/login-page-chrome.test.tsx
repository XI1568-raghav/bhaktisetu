/**
 * A11Y-15 / DU-05 / DU-03 / RESP-07 — /auth/login.
 *
 * Measured on the live page (prod sweep 2026-08-12, 390x844):
 *   heading sequence  h2,h3,h3,h3,h3,h3,h4,h4,h4,h4,h2   h1Count = 0
 *   the page title was a span.text-surface-800.text-xl.font-semibold (page.tsx:310)
 *   Sign In submit    49.6px tall, 12/24 padding, 16px/500  — the tallest and
 *                     largest-typed CTA anywhere on the site
 *   "Forgot password?" 89.2 x 14.8 — the account-recovery path, a third of a
 *                     fingertip tall
 *
 * A missing h1 means the screen-reader H-key jump list has no top-level entry,
 * so the user cannot orient to "this is the sign-in page", and the page has no
 * title for search engines either.
 *
 * This renders the real page (the same way __tests__/auth-forms-a11y.test.tsx
 * does), so it fails if the h1 is demoted back to a span or the submit button
 * is hand-rolled again.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>(
    '../lib/auth-context',
  );
  return {
    ...actual,
    useAuth: () => ({
      signInWithCredentials: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithGoogle: vi.fn(),
      isAuthenticated: false,
      user: null,
      isLoading: false,
    }),
  };
});

vi.mock('../lib/supabase', () => ({
  getSupabaseBrowserClient: () => null,
}));

import LoginPage from '../app/auth/login/page';
import { BUTTON_SIZES, BUTTON_VARIANTS } from '../components/ui/Button';

beforeEach(() => {
  window.localStorage.clear();
});

describe('A11Y-15 / DU-05 — the sign-in page has a page title', () => {
  it('renders exactly one h1', () => {
    render(<LoginPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('the h1 names the product AND what the page is for', () => {
    render(<LoginPage />);
    const h1 = screen.getByRole('heading', { level: 1 });
    // "Darshya" alone is a wordmark, not a page title; the purpose is carried
    // for assistive tech without duplicating it on screen.
    expect(h1.textContent).toMatch(/Darshya/);
    expect(h1.textContent).toMatch(/sign in/i);
  });

  it('keeps the wordmark lockup visible inside it, not replaced by it', () => {
    const { container } = render(<LoginPage />);
    const h1 = container.querySelector('h1')!;
    // The brand mark stays; only the tag around it changed.
    expect(h1.querySelector('svg'), 'the flame mark should still render').toBeTruthy();
    expect(h1.className).toContain('flex');
  });

  it('no heading level is skipped on the way down from the h1', () => {
    const { container } = render(<LoginPage />);
    const levels = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((e) =>
      Number(e.tagName[1]),
    );
    expect(levels[0], 'the first heading on the page must be the h1').toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]! - levels[i - 1]!, `h${levels[i - 1]} -> h${levels[i]}`).toBeLessThanOrEqual(
        1,
      );
    }
  });
});

describe('DU-03 — the submit buttons use the one CTA recipe', () => {
  it('Sign In is painted by buttonClass, not a hand-rolled 49.6px recipe', () => {
    render(<LoginPage />);
    const submit = screen.getByRole('button', { name: /^sign in$/i });
    // One height (h-11 = 44px), one radius, one fill, one type ramp.
    for (const cls of BUTTON_SIZES.md.split(' ')) {
      expect(submit.className, `missing ${cls}`).toContain(cls);
    }
    expect(submit.className).toContain('rounded-lg');
    expect(submit.className).toContain('font-semibold');
    expect(submit.className).toContain(BUTTON_VARIANTS.primary.split(' ')[0]);
  });

  it('it no longer carries the old py-3/px-6 sizing', () => {
    render(<LoginPage />);
    const submit = screen.getByRole('button', { name: /^sign in$/i });
    expect(submit.className).not.toMatch(/\bpy-3\b/);
    expect(submit.className).not.toMatch(/\bpx-6\b/);
  });
});

describe('RESP-07 — the recovery link is a real tap target', () => {
  it('"Forgot password?" opts into the 44px floor', () => {
    render(<LoginPage />);
    const link = screen.getByRole('link', { name: /forgot password/i });
    // jsdom has no layout, so assert the mechanism: `.tap-safe` is the
    // globals.css rule that gives a standalone inline anchor a 44px box and
    // cancels the padding back out with negative margin.
    expect(link.className).toContain('tap-safe');
  });

  it('the tap-safe utility really sets a 44px floor', () => {
    const css = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '..', 'app/globals.css'),
      'utf8',
    ) as string;
    const rule = /\.tap-safe\s*\{([^}]*)\}/.exec(css);
    expect(rule, '.tap-safe missing from globals.css').not.toBeNull();
    expect(rule![1]).toMatch(/min-height:\s*44px/);
    expect(rule![1], 'without a negative margin the row grows and the layout shifts').toMatch(
      /margin-block:\s*-/,
    );
    expect(rule![1], 'min-height does nothing to a display:inline anchor').toMatch(
      /display:\s*inline-flex/,
    );
  });

  it('tap-safe is never written with a Tailwind variant prefix', () => {
    // `.tap-safe` is plain CSS, so `sm:tap-safe` / `hover:tap-safe` silently
    // do nothing — and on a `hidden sm:` element that leaves it hidden.
    const { execSync } = require('node:child_process');
    let hits = '';
    try {
      // The exclusion is this file: the comment above literally contains
      // `sm:tap-safe`, so without it the guard permanently flags itself and the
      // suite is red for a violation that does not exist in any component.
      hits = execSync(
        'git grep -n -E "[a-z0-9-]+:tap-safe" -- "apps/web/**/*.tsx" "apps/web/**/*.ts" ' +
          '":!apps/web/__tests__/login-page-chrome.test.tsx"',
        { encoding: 'utf8', cwd: require('node:path').resolve(__dirname, '..', '..', '..') },
      );
    } catch {
      hits = ''; // git grep exits 1 when there are no matches
    }
    expect(hits.trim()).toBe('');
  });
});
