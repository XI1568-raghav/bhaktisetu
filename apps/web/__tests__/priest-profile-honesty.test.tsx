/**
 * `/priest/profile` — no fixture identity, and an unambiguous revenue split.
 *
 * PJ-06 (P1/trust): the page shipped a full fabricated persona as its catch
 * branch. `if (res.ok) {...} else { throw new Error('API unavailable'); }`
 * followed by a bare `catch { setProfile(fallbackProfile); }` meant an ordinary
 * expired session — a 401 — took the else branch and painted ANOTHER PERSON's
 * name, phone number, email, an "approved / Aadhaar verified" badge and a
 * 4.8-star / 156-review history onto the signed-in pandit's own profile. The
 * editable fields were seeded from the same object, so saving from that state
 * wrote a stranger's data into his record.
 *
 * PJ-03 (P1/money): the read-only panel labelled the number "Commission Rate"
 * and printed "{rate}% of booking". `commissionRate` is the PANDIT'S SHARE
 * (apps/api/src/services/priest.service.ts:665 → booking.service resolves it as
 * `priestShare`), so once the 0.70 → 0.80 backfill landed the panel read
 * "Commission Rate: 80% of booking" — which reads as the platform taking 80%.
 * Same column, opposite meaning, on the one screen a pandit checks before he
 * trusts the payout.
 *
 * These tests fail if either comes back.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const useAuthMock = vi.fn();
vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
}));

// The portal layout already gates access; here the guard would only fight the
// jsdom location. Pass children straight through.
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import PriestProfilePage from '../app/priest/profile/page';

const SOURCE = path.resolve(__dirname, '..', 'app/priest/profile/page.tsx');

/** Source with comments removed — the WHY comment names the deleted persona on
 *  purpose, and a guard that tripped on its own documentation gets deleted. */
function codeOnly(): string {
  return readFileSync(SOURCE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function realProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    userId: 'u-1',
    displayName: 'Pandit Devdatt Joshi',
    bio: null,
    avatarUrl: null,
    specializations: ['Ganesh Puja'],
    languages: ['Hindi'],
    experienceYears: 4,
    aadhaarVerified: false,
    isVerified: false,
    verificationStatus: 'pending',
    ratingAvg: 0,
    ratingCount: 0,
    commissionRate: 0.8,
    status: 'active',
    user: { fullName: 'Devdatt Joshi', phone: '+91 90000 00001', email: null },
    temples: [],
    stats: { totalBookings: 0, completedBookings: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue({ session: { accessToken: 'tok' } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PJ-06 — a failed profile fetch never renders another pandit', () => {
  it('shows a re-auth path on 401, not a fabricated persona', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
      text: async () => 'Unauthorized',
    } as Response);

    render(<PriestProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in/i })).toBeTruthy();
    });

    const body = document.body.textContent ?? '';
    expect(body).not.toContain('Ramesh Sharma');
    expect(body).not.toContain('+91 98765 43210');
    expect(body).not.toContain('pandit.ramesh@email.com');
    expect(body).not.toContain('Aadhaar Verified');
    expect(body).not.toContain('4.8');
    expect(body).not.toContain('156');
    expect(body).not.toContain('Kashi Vishwanath');

    // The re-auth link must come back to this page, not dump him on the home
    // page with no idea what happened.
    const link = screen.getByRole('link', { name: /sign in/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('/auth/login');
    expect(link.getAttribute('href')).toContain('priest%2Fprofile');
  });

  it('shows an honest error with a retry on a 500, and refetches on retry', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => 'boom',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => realProfile(),
        text: async () => '',
      } as Response);

    render(<PriestProfilePage />);

    const retry = await screen.findByRole('button', { name: /try again/i });
    expect(document.body.textContent ?? '').not.toContain('Ramesh Sharma');

    fireEvent.click(retry);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pandit Devdatt Joshi')).toBeTruthy();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('shows an honest error when the network throws, not fixture data', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    render(<PriestProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    });
    const body = document.body.textContent ?? '';
    expect(body).not.toContain('Ramesh Sharma');
    expect(body).not.toContain('Trimbakeshwar');
  });

  it('carries no fabricated persona literals in the source at all', () => {
    const code = codeOnly();
    for (const literal of [
      'Ramesh Sharma',
      '98765 43210',
      'pandit.ramesh@email.com',
      'Kashi Vishwanath',
      'Trimbakeshwar',
      'fallbackProfile',
    ]) {
      expect(code).not.toContain(literal);
    }
    // 0.70 was the stale priest share; it must not survive as a client default.
    expect(code).not.toMatch(/0\.70\b/);
  });
});

describe('PJ-03 — the revenue split names both sides', () => {
  it('renders the pandit share and the platform take, never a bare "Commission Rate"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => realProfile({ commissionRate: 0.8 }),
      text: async () => '',
    } as Response);

    render(<PriestProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pandit Devdatt Joshi')).toBeTruthy();
    });

    const body = document.body.textContent ?? '';
    // The pandit keeps 80%; Darshya takes 20%. Both numbers, both owners.
    expect(body).toMatch(/you keep 80%/i);
    expect(body).toMatch(/darshya (takes|keeps)? ?20%/i);
    // The old wording is the exact ambiguity that made 80% read as a fee.
    expect(body).not.toMatch(/commission rate/i);
    expect(body).not.toMatch(/80% of booking/i);
  });

  it('honours a negotiated non-default rate rather than hardcoding 80/20', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => realProfile({ commissionRate: 0.85 }),
      text: async () => '',
    } as Response);

    render(<PriestProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pandit Devdatt Joshi')).toBeTruthy();
    });

    const body = document.body.textContent ?? '';
    expect(body).toMatch(/you keep 85%/i);
    expect(body).toMatch(/15%/);
  });
});
