import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 't' }, isAuthenticated: true }),
}));

import TempleInvitesCard from '../components/priest/TempleInvitesCard';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stub = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
  );

describe('TempleInvitesCard for a pandit pending approval', () => {
  it('shows no error banner on a 403 (not approved yet)', async () => {
    stub(403, { message: 'forbidden' });
    const { container } = render(<TempleInvitesCard />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/could not check for temple invitations/i)).toBeNull();
    expect(container.textContent ?? '').not.toMatch(/could not check/i);
  });

  it('still reports a genuine failure (500)', async () => {
    stub(500);
    render(<TempleInvitesCard />);
    expect(await screen.findByText(/could not check for temple invitations/i)).toBeTruthy();
  });
});
