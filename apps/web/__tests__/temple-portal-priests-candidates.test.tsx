import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' }, user: { id: 'u1' } }),
}));

import TemplePriestsPage from '../app/temple-portal/priests/page';
import { API_BASE_URL } from '../lib/api-config';

function stubFetch(candidates: { status: number; body: unknown }) {
  const fn = vi.fn(async (url: string): Promise<Response> => {
    const u = String(url);
    const r = u.endsWith('/candidates') ? candidates : { status: 200, body: { priests: [], invitations: [] } };
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

describe('temple priests page: who can be invited', () => {
  it('offers live but unverified pandits from the candidates endpoint, not the verified-only public directory', async () => {
    const fetchFn = stubFetch({
      status: 200,
      body: {
        candidates: [
          { id: 'p1', displayName: 'Test Pandit Sharma', specializations: ['Satyanarayan'], experienceYears: 8, isVerified: false, invited: false },
          { id: 'p2', displayName: 'Demo Pandit', specializations: [], experienceYears: 1, isVerified: true, invited: true },
        ],
      },
    });
    render(<TemplePriestsPage />);
    const opt = await screen.findByRole('option', { name: /Test Pandit Sharma/ });
    expect((opt as HTMLOptionElement).disabled).toBe(false);
    const already = screen.getByRole('option', { name: /Demo Pandit.*already invited/ }) as HTMLOptionElement;
    expect(already.disabled).toBe(true);
    const urls = fetchFn.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain(`${API_BASE_URL}/temple-portal/priests/candidates`);
    expect(urls).not.toContain(`${API_BASE_URL}/priests`);
  });

  it('says why the picker is empty', async () => {
    stubFetch({ status: 200, body: { candidates: [] } });
    render(<TemplePriestsPage />);
    await waitFor(() => expect(screen.getByText(/no pandit to invite right now/i)).toBeTruthy());
  });

  it('says so when the pandit list could not be loaded', async () => {
    stubFetch({ status: 500, body: {} });
    render(<TemplePriestsPage />);
    await waitFor(() => expect(screen.getByText(/could not load the list of pandits/i)).toBeTruthy());
  });
});
