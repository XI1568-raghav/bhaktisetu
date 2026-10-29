import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' }, user: { id: 'u1' } }),
}));
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import TemplePujasPage from '../app/temple-portal/pujas/page';
import { API_BASE_URL } from '../lib/api-config';

type Reply = { status: number; body: unknown };

function stubFetch(opts: { roster: unknown[]; rosterStatus?: number }) {
  const fn = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    const u = String(url);
    let r: Reply = { status: 200, body: {} };
    if (init?.method === 'POST' && u.endsWith('/temple-portal/pujas')) {
      r = { status: 201, body: { offering: { id: 'o1', templeId: 't', pujaTypeId: 'pt1', priceOverride: null, nriPrice: null, assignedPriestId: null, availableSlots: [], maxBookingsPerSlot: 5, isActive: true } } };
    } else if (u.endsWith('/temple-portal/pujas')) {
      r = { status: 200, body: { offerings: [], templeLinked: true } };
    } else if (u.endsWith('/temple-portal/priests')) {
      r = { status: opts.rosterStatus ?? 200, body: { priests: opts.roster, invitations: [] } };
    } else if (u.includes('/pujas/types')) {
      r = { status: 200, body: { pujaTypes: [{ id: 'pt1', slug: 'ganesh', name: 'Ganesh Puja', deity: 'Ganesh' }] } };
    }
    return { ok: r.status < 400, status: r.status, json: async () => r.body, text: async () => JSON.stringify(r.body) } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openForm() {
  render(<TemplePujasPage />);
  const add = await screen.findByRole('button', { name: /add puja/i });
  await waitFor(() => expect((add as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(add);
  await screen.findByText('Add New Puja');
}

function priestSelect(): HTMLSelectElement {
  return screen.getByText('No priest yet', { selector: 'option' }).closest('select') as HTMLSelectElement;
}

describe('temple pujas: assigned priest control', () => {
  it('offers only roster pandits and defaults to "No priest yet"', async () => {
    stubFetch({ roster: [{ id: 'r1', priestId: 'p1', displayName: 'Pandit Roster', isPrimary: false }] });
    await openForm();
    const sel = priestSelect();
    expect(sel.value).toBe('');
    expect(Array.from(sel.options).map((o) => o.textContent)).toEqual(['No priest yet', 'Pandit Roster']);
    expect(sel.options[1]!.value).toBe('p1');
  });

  it('never calls the public directory for the picker (it lists pandits who are not on the roster)', async () => {
    const fetchFn = stubFetch({ roster: [] });
    await openForm();
    const urls = fetchFn.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain(`${API_BASE_URL}/temple-portal/priests`);
    expect(urls).not.toContain(`${API_BASE_URL}/priests`);
  });

  it('an empty roster explains the invite path and still lets the puja be added without a priest', async () => {
    const fetchFn = stubFetch({ roster: [] });
    await openForm();
    expect(Array.from(priestSelect().options).map((o) => o.textContent)).toEqual(['No priest yet']);
    const help = screen.getByTestId('priest-help');
    expect(help.textContent).toMatch(/invite a pandit/i);
    expect(help.querySelector('a')?.getAttribute('href')).toBe('/temple-portal/priests');

    fireEvent.change(screen.getByText('Select a puja type').closest('select')!, { target: { value: 'pt1' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(fetchFn.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(true));
    const post = fetchFn.mock.calls.find((c) => c[1]?.method === 'POST')!;
    expect(JSON.parse(String(post[1]!.body)).assignedPriestId).toBeNull();
  });

  it('says so, instead of implying an empty roster, when the roster could not be loaded', async () => {
    stubFetch({ roster: [], rosterStatus: 500 });
    await openForm();
    expect(screen.getByTestId('priest-help').textContent).toMatch(/could not load your roster/i);
  });

  it('rejects a malformed time slot before submitting', async () => {
    const fetchFn = stubFetch({ roster: [] });
    await openForm();
    fireEvent.change(screen.getByText('Select a puja type').closest('select')!, { target: { value: 'pt1' } });
    fireEvent.change(screen.getByPlaceholderText(/06:00, 10:00, 18:00/), { target: { value: '6am, 10:00' } });
    fireEvent.submit(document.querySelector('form')!);
    expect((await screen.findByRole('alert')).textContent).toMatch(/"6am" is not a valid time/);
    expect(fetchFn.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(false);
  });
});
