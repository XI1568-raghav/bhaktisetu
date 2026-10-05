/**
 * I18N-07 — the profile language control must not offer a choice that changes
 * nothing without saying so.
 *
 * `User.preferredLanguage` now selects the language of API error responses
 * (apps/api/src/lib/i18n.ts → src/plugins/error-localization.ts). The Prisma
 * enum has ten members and /profile offers all ten, but apps/api only has error
 * catalogues for five (en, hi, ta, te, kn — `TRANSLATED_LANGUAGES`). Picking
 * Gujarati saves fine, returns 200, shows a success toast, and then every
 * message the API sends arrives in English forever, with nothing on screen
 * having hinted at that.
 *
 * Two contracts are asserted:
 *   1. the web-side list is the SAME ten the platform accepts — apps/web may
 *      not import @poojly/shared at runtime (its NodeNext './foo.js' barrels
 *      break turbopack and every page 500s), so the list is duplicated
 *      deliberately and this test is the thing that keeps the copy honest;
 *   2. the five with no catalogue are labelled as such in the rendered DOM.
 *
 * The wording asserted is "English for now" rather than "coming soon": nobody
 * has committed to translating them, and a promise is not a disclosure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SUPPORTED_LANGUAGES, TRANSLATED_LANGUAGES } from '@poojly/shared';

import {
  ACCOUNT_LANGUAGES,
  API_TRANSLATED_LANGUAGES,
  accountLanguageLabel,
} from '../../lib/i18n/locales';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/profile',
    useSearchParams: () => new URLSearchParams(),
  };
});

vi.mock('../../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', preferredLanguage: 'gu' },
    refreshUser: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
  }),
  getRoleDashboardPath: () => '/dashboard',
}));

vi.mock('../../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('I18N-07 — the web copy of the language lists matches the platform', () => {
  it('offers exactly the languages the platform accepts, in the same order', () => {
    expect(ACCOUNT_LANGUAGES.map((l) => l.value)).toEqual([...SUPPORTED_LANGUAGES]);
  });

  it('marks exactly the languages the API has a catalogue for', () => {
    expect([...API_TRANSLATED_LANGUAGES]).toEqual([...TRANSLATED_LANGUAGES]);
  });

  it('discloses the untranslated ones and leaves the translated ones plain', () => {
    for (const lang of ACCOUNT_LANGUAGES) {
      const label = accountLanguageLabel(lang.value);
      if ((TRANSLATED_LANGUAGES as readonly string[]).includes(lang.value)) {
        expect(label, `${lang.value} is translated and must not be disclaimed`).toBe(lang.label);
      } else {
        expect(label, `${lang.value} has no catalogue and must say so`).toContain(
          'English for now',
        );
      }
    }
  });
});

// Ceiling for a heavily loaded full-suite run (happy-dom + dynamic import of the
// whole profile page). Healthy runs finish in tens of ms; this only bounds a hang.
const ASYNC_TIMEOUT = { timeout: 15_000 };

describe('I18N-07 — /profile renders the disclosure, not just stores it', () => {
  // Deterministic network: /profile fetches /users/me on mount. Left unmocked,
  // that is a real fetch to an unreachable host, which under full-suite load
  // outlived the 1s findBy/waitFor default and surfaced as an AbortError. Answer
  // it immediately with the same user the auth mock reports.
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ user: { id: 'u1', fullName: 'Test User', preferredLanguage: 'gu' } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('labels every untranslated option in the DOM', async () => {
    const { default: ProfilePage } = await import('../../app/profile/page');
    render(<ProfilePage />);
    // The form is behind a load gate that opens once the (mocked) fetch resolves.
    await waitFor(
      () => expect(document.querySelectorAll('option').length).toBeGreaterThan(0),
      ASYNC_TIMEOUT,
    );

    const options = Array.from(document.querySelectorAll('option'));
    expect(options.length).toBeGreaterThanOrEqual(SUPPORTED_LANGUAGES.length);

    const byValue = new Map(options.map((o) => [o.getAttribute('value'), o.textContent ?? '']));
    for (const code of SUPPORTED_LANGUAGES) {
      const text = byValue.get(code);
      expect(text, `no /profile option for ${code}`).toBeTruthy();
      if ((TRANSLATED_LANGUAGES as readonly string[]).includes(code)) {
        expect(text).not.toContain('English for now');
      } else {
        expect(text, `${code} is offered with no disclosure`).toContain('English for now');
      }
    }
  });

  it('says once, in prose, what the control actually controls', async () => {
    const { default: ProfilePage } = await import('../../app/profile/page');
    render(<ProfilePage />);
    expect(
      await screen.findByText(/language of the messages we send you/i, undefined, ASYNC_TIMEOUT),
    ).toBeTruthy();
  });
});
