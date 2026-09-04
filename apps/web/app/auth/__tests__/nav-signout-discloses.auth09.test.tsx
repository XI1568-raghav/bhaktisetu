/**
 * AUTH-09 — the PRIMARY sign-out affordance still ended every session on every
 * device without saying so.
 *
 * The disclosure landed on /auth/logout (see
 * app/auth/logout/__tests__/discloses-all-devices.test.tsx) and `signOut` learnt
 * to carry a scope (app/auth/__tests__/signout-scope.auth09.test.tsx), but the
 * button almost every user actually presses — "Sign Out" in the header account
 * menu, components/NavAuthButton.tsx — called `signOut()` INLINE and then
 * hard-navigated to '/'. It therefore never reached the screen that discloses,
 * and the user's phone was signed out with nothing on screen having mentioned
 * it. Fixing the shared path did not fix the primary path.
 *
 * What is pinned here is the user-visible property, not one implementation:
 * activating the nav sign-out must either say the words in place or hand off to
 * the screen that does. Three designs satisfy that (route to /auth/logout, a
 * confirm state carrying the same sentence, or a local-scope nav sign-out with
 * an explicit "sign out everywhere" elsewhere) and this test accepts any of
 * them — what it refuses is the silent global sign-out that was there.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const signOut = vi.fn(async () => undefined);

vi.mock('../../../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/auth-context')>(
    '../../../lib/auth-context',
  );
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 'u-1',
        fullName: 'Mandir Trust',
        email: 'mandir.trust@example.com',
        phone: '+919812345678',
        avatarUrl: null,
        preferredLanguage: 'hi',
        subscriptionTier: 'free',
        role: 'devotee',
      },
      isAuthenticated: true,
      isLoading: false,
      signOut,
    }),
  };
});

import NavAuthButton from '../../../components/NavAuthButton';

const realLocation = window.location;
let navigatedTo = '';

beforeEach(() => {
  signOut.mockClear();
  navigatedTo = '';
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      ...realLocation,
      get href() {
        return navigatedTo;
      },
      set href(value: string) {
        navigatedTo = value;
      },
      assign: (value: string) => {
        navigatedTo = value;
      },
    },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: realLocation,
  });
  vi.restoreAllMocks();
});

/**
 * Opens the account menu, presses "Sign Out", and lets the handler settle.
 *
 * The await matters: the old handler was `await signOut(); window.location.href
 * = '/'`, so the navigation only lands after a microtask. Asserting
 * synchronously would read an empty `navigatedTo` and pass vacuously.
 */
async function pressNavSignOut() {
  render(<NavAuthButton />);
  fireEvent.click(screen.getByRole('button', { name: /Mandir Trust/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Sign Out/i }));
  });
}

const DISCLOSURE = /all your devices|every device|all devices/i;

describe('AUTH-09 — the nav sign-out does not end every session in silence', () => {
  it('either discloses the multi-device effect or routes to the screen that does', async () => {
    await pressNavSignOut();

    const saidItHere = DISCLOSURE.test(document.body.textContent ?? '');
    const handedOffToTheScreenThatSaysIt = navigatedTo.startsWith('/auth/logout');

    expect(
      saidItHere || handedOffToTheScreenThatSaysIt,
      'the primary sign-out button burned every refresh_token_jtis row the ' +
        'account holds — signing the user out on their phone — and neither the ' +
        'menu nor the page it landed on ever mentioned that',
    ).toBe(true);
  });

  it('does not sign out globally AND skip the disclosure by going straight home', async () => {
    await pressNavSignOut();

    const wentStraightHome = navigatedTo === '/';
    const disclosedFirst = DISCLOSURE.test(document.body.textContent ?? '');
    expect(
      wentStraightHome && !disclosedFirst,
      "'/' is not a screen that can explain what just happened",
    ).toBe(false);
  });

  it('still signs the user out', async () => {
    await pressNavSignOut();
    // Either this component called it, or it handed the job to /auth/logout,
    // which calls it on mount. What must never happen is neither.
    const handedOff = navigatedTo.startsWith('/auth/logout');
    expect(signOut.mock.calls.length > 0 || handedOff).toBe(true);
  });
});
