/**
 * AUTH-09 — the SEVEN provider portals were still signing the operator out of
 * every device without saying so.
 *
 * Three surfaces had already been fixed when this finding was last touched:
 * /auth/logout says the words (app/auth/logout/page.tsx), the header account
 * menu routes there (components/NavAuthButton.tsx), and the devotee dashboard
 * routes there (app/dashboard/page.tsx). `signOut` also learnt to carry a scope
 * and /profile → Security offers the choice.
 *
 * What nobody enumerated is that eleven surfaces call sign-out, not four. Every
 * portal sidebar — admin, astrologer, gaushala, priest, store-admin,
 * temple-portal, wellness-portal — still rendered
 *
 *     <button onClick={signOut}>Sign Out</button>
 *
 * A bare `signOut()` sends no scope, the API reads "no scope" as global, and
 * the handler burns every `refresh_token_jtis` row the account holds. So a
 * pandit signing out of a temple's shared desktop was also signed out on their
 * own phone, and none of these seven screens — nor the '/' they landed on —
 * said a word about it. These are the accounts with the most to lose from a
 * surprise sign-out: they are the ones taking bookings and payouts.
 *
 * TWO GUARDS, on purpose:
 *
 *  1. a render assertion per portal, which pins the affordance a user sees; and
 *  2. a sweep of every .tsx under app/ and components/ for the bare pattern,
 *     which is the part that survives a new portal being added next quarter.
 *     The render list can only ever cover the portals that exist today, and
 *     "the list was written once and never revisited" is exactly how these
 *     seven were missed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const signOut = vi.fn(async () => undefined);

/** Each portal's <AuthGuard allowedRoles> gate; set before each render. */
let role = 'admin';

vi.mock('../../../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/auth-context')>(
    '../../../lib/auth-context',
  );
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 'u-9',
        fullName: 'Portal Operator',
        email: 'operator@example.com',
        phone: '+919812345678',
        avatarUrl: null,
        preferredLanguage: 'en',
        subscriptionTier: 'free',
        role,
      },
      session: { accessToken: 'live-token' },
      isAuthenticated: true,
      isLoading: false,
      signOut,
    }),
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/temple-portal',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import AdminLayout from '../../admin/layout';
import AstrologerPortalLayout from '../../astrologer-portal/layout';
import GaushalaPortalLayout from '../../gaushala-portal/layout';
import PriestLayout from '../../priest/layout';
import StoreAdminLayout from '../../store-admin/layout';
import TemplePortalLayout from '../../temple-portal/layout';
import WellnessPortalLayout from '../../wellness-portal/layout';

const PORTALS: Array<[string, React.ComponentType<{ children: React.ReactNode }>, string]> = [
  ['app/admin', AdminLayout, 'admin'],
  ['app/astrologer-portal', AstrologerPortalLayout, 'astrologer'],
  ['app/gaushala-portal', GaushalaPortalLayout, 'gaushala_manager'],
  ['app/priest', PriestLayout, 'priest'],
  ['app/store-admin', StoreAdminLayout, 'store_owner'],
  ['app/temple-portal', TemplePortalLayout, 'temple_manager'],
  ['app/wellness-portal', WellnessPortalLayout, 'wellness_instructor'],
];

beforeEach(() => {
  signOut.mockClear();
});

describe('AUTH-09 — every portal sidebar discloses that sign-out is global', () => {
  it.each(PORTALS)('%s routes Sign Out through /auth/logout', (_name, Layout, portalRole) => {
    role = portalRole;
    render(
      <Layout>
        <div />
      </Layout>,
    );

    const control = screen.getByText('Sign Out').closest('a, button');
    expect(control, 'the portal has no Sign Out control at all').not.toBeNull();

    // The property that matters: activating it cannot end every session
    // silently. /auth/logout runs the same global sign-out and states it.
    expect(
      control!.tagName,
      'a <button onClick={signOut}> signs the operator out everywhere with ' +
        'nothing on screen saying so — the whole of AUTH-09',
    ).toBe('A');
    expect(control!.getAttribute('href')).toBe('/auth/logout');
    expect(signOut).not.toHaveBeenCalled();

    cleanup();
  });
});

describe('AUTH-09 — no surface anywhere calls sign-out bare', () => {
  /** Every .tsx under app/ and components/, tests excluded. */
  function sources(): string[] {
    const roots = [path.resolve(__dirname, '../../../app'), path.resolve(__dirname, '../../../components')];
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          walk(full);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          out.push(full);
        }
      }
    };
    roots.forEach(walk);
    return out;
  }

  /** Block and line comments out. `[^:]` keeps `https://` out of it. */
  function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//gm, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  }

  it('the comment stripper actually removes the pattern it has to remove', () => {
    const mixed = '{/* was onClick={signOut} */}\n<button onClick={signOut} />';
    expect(stripComments(mixed)).not.toContain('was onClick');
    expect(stripComments(mixed)).toContain('<button onClick={signOut} />');
    expect(stripComments('// onClick={signOut}\nkeep')).toBe('\nkeep');
    // …and it must not eat a URL, which would silently truncate a file and
    // hide a real offender further down it.
    expect(stripComments('const u = "https://darshya.online";')).toContain('darshya.online');
  });

  it('finds no `onClick={signOut}` left in the product', () => {
    const files = sources();
    // Guard the guard: if the walk finds nothing, the assertion below is
    // vacuously true and would stay green through any regression.
    expect(files.length).toBeGreaterThan(300);

    // Comments are stripped first, and that step is load-bearing: the fix
    // itself documents what it replaced (`this was \`onClick={signOut}\``), so
    // a raw text scan would report every FIXED file as an offender.
    const offenders = files.filter((f) =>
      /onClick=\{\s*signOut\s*\}/.test(stripComments(fs.readFileSync(f, 'utf8'))),
    );
    expect(
      offenders.map((f) => path.relative(path.resolve(__dirname, '../../..'), f)),
      'a bare `signOut` handler sends no scope, the API reads that as global, ' +
        'and every device is signed out with nothing on screen saying so. ' +
        'Route the control to /auth/logout, or pass an explicit scope and ' +
        'disclose it in place.',
    ).toEqual([]);
  });
});
