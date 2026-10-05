import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' }, user: { id: 'u1' } }),
}));

import TemplePriestsPage from '../app/temple-portal/priests/page';
import TempleInvitesCard from '../components/priest/TempleInvitesCard';
import { API_BASE_URL } from '../lib/api-config';

type Reply = { status: number; body: unknown };
function stubFetch(responder: (url: string, init?: RequestInit) => Reply) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = responder(String(url), init);
    return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('temple manager roster page', () => {
  const rosterBody = {
    priests: [{ id: 'r1', priestId: 'p1', displayName: 'Pandit Ramesh', isPrimary: true }],
    invitations: [
      { id: 'i1', priestId: 'p2', displayName: 'Pandit Suresh', isPrimary: false, status: 'pending' },
      { id: 'i2', priestId: 'p3', displayName: 'Pandit Mohan', isPrimary: false, status: 'declined' },
    ],
  };

  it('labels roster members and waiting invitations differently', async () => {
    stubFetch((url) =>
      url.endsWith('/temple-portal/priests')
        ? { status: 200, body: rosterBody }
        : { status: 200, body: { priests: [{ id: 'p9', displayName: 'Pandit Hari' }] } },
    );
    render(<TemplePriestsPage />);
    await waitFor(() => expect(screen.getByText('Pandit Ramesh')).toBeTruthy());
    // heading + the member's own row label
    expect(screen.getAllByText('On your roster')).toHaveLength(2);
    expect(screen.getByText('Invited — waiting for the pandit')).toBeTruthy();
    expect(screen.getByText('Declined by the pandit')).toBeTruthy();
  });

  it('sends an invitation, and says the pandit must accept', async () => {
    const fetchFn = stubFetch((url, init) => {
      if (init?.method === 'POST') return { status: 201, body: { ok: true, invited: true, status: 'pending' } };
      if (url.endsWith('/temple-portal/priests')) return { status: 200, body: { priests: [], invitations: [] } };
      return { status: 200, body: { priests: [{ id: 'p9', displayName: 'Pandit Hari' }] } };
    });
    render(<TemplePriestsPage />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Pandit Hari' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Pandit'), { target: { value: 'p9' } });
    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));
    await waitFor(() => expect(screen.getByText(/joins your roster only after they accept/i)).toBeTruthy());
    const post = fetchFn.mock.calls.find((c) => c[1]?.method === 'POST')!;
    expect(post[0]).toBe(`${API_BASE_URL}/temple-portal/priests`);
    expect(JSON.parse(String(post[1]!.body))).toEqual({ priestId: 'p9', isPrimary: false });
  });
});

describe('pandit invitations card', () => {
  const invite = { id: 'i1', templeName: 'Somnath', templeCity: 'Veraval', isPrimary: false };

  it('renders nothing when there are no invitations', async () => {
    stubFetch(() => ({ status: 200, body: { invites: [] } }));
    const { container } = render(<TempleInvitesCard />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('shows the temple and accept/decline, and posts the answer', async () => {
    let answered = false;
    const fetchFn = stubFetch((url, init) => {
      if (init?.method === 'POST') {
        answered = true;
        return { status: 200, body: { ok: true, status: 'accepted', message: "You are now on this temple's roster." } };
      }
      return { status: 200, body: { invites: answered ? [] : [invite] } };
    });
    render(<TempleInvitesCard />);
    await waitFor(() => expect(screen.getByText('Somnath')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    await waitFor(() => expect(screen.getByText(/now on this temple's roster/i)).toBeTruthy());
    const post = fetchFn.mock.calls.find((c) => c[1]?.method === 'POST')!;
    expect(post[0]).toBe(`${API_BASE_URL}/priest/temple-invites/i1/accept`);
  });

  it('says so when the check failed instead of looking empty', async () => {
    stubFetch(() => ({ status: 500, body: {} }));
    render(<TempleInvitesCard />);
    await waitFor(() => expect(screen.getByText(/could not check for temple invitations/i)).toBeTruthy());
  });
});
