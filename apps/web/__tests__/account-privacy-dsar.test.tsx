/**
 * LEG-16 (prod sweep 2026-08-12) — /privacy offered exactly one way to
 * exercise a DPDP right: email privacy@darshya.online, an inbox lib/company.ts
 * calls "aspirational" in its own comment. POST /api/v1/dpdp/dsar and
 * GET /api/v1/dpdp/dsar/mine had shipped with R-Q3-L-001 and a repo-wide grep
 * of apps/web for `dpdp` returned zero calls — a working statutory-rights
 * backend wired to no UI.
 *
 * What these tests pin:
 *   1. the screen calls the endpoints that exist, with the body the Zod schema
 *      in apps/api/src/routes/dpdp.ts:66 accepts;
 *   2. a failed load renders an error and NO list — an empty history on a
 *      failed read would tell a user they never asked us for anything;
 *   3. a failed submission never claims the request was filed;
 *   4. the deadline shown is the one the server stamped, not one invented here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1' },
    isAuthenticated: true,
    isLoading: false,
  }),
  getRoleDashboardPath: () => '/dashboard',
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AccountPrivacyPage from '../app/account/privacy/page';

const jsonRes = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

describe('LEG-16 — /account/privacy files real DSARs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => cleanup());

  it('loads the caller’s own request history from GET /dpdp/dsar/mine', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonRes({
        total: 1,
        requests: [
          {
            id: 'r1',
            kind: 'access',
            status: 'pending',
            note: null,
            slaDeadline: '2026-09-11T00:00:00.000Z',
            resolvedAt: null,
            resolutionNote: null,
            createdAt: '2026-08-12T00:00:00.000Z',
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<AccountPrivacyPage />);

    await waitFor(() => expect(screen.getByTestId('dsar-list')).toBeTruthy());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toMatch(/\/dpdp\/dsar\/mine$/);
    expect(screen.getByTestId('dsar-list').textContent).toMatch(/11 Sept? 2026/);
  });

  it('POSTs the selected kind in the shape the endpoint validates', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ total: 0, requests: [] }))
      .mockResolvedValueOnce(
        jsonRes({ id: 'new-1', kind: 'erasure', status: 'pending', slaDeadline: '2026-09-13T00:00:00.000Z' }),
      )
      .mockResolvedValueOnce(jsonRes({ total: 0, requests: [] }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AccountPrivacyPage />);
    await waitFor(() => expect(screen.getByTestId('dsar-empty')).toBeTruthy());

    fireEvent.click(screen.getByLabelText(/Delete my account and data/i));
    fireEvent.change(screen.getByLabelText(/Anything we should know/i), {
      target: { value: 'please close it' },
    });
    fireEvent.click(screen.getByRole('button', { name: /file request/i }));

    await waitFor(() => expect(screen.getByTestId('dsar-filed')).toBeTruthy());

    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toMatch(/\/dpdp\/dsar$/);
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      kind: 'erasure',
      note: 'please close it',
    });
    // the deadline shown is the server's, not one computed on the client
    expect(screen.getByTestId('dsar-filed').textContent).toMatch(/13 Sept? 2026/);
  });

  it('a failed load shows an error and NO list — never an empty history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes({ error: 'boom' }, false, 500)));

    render(<AccountPrivacyPage />);

    await waitFor(() => expect(screen.getByTestId('dsar-load-error')).toBeTruthy());
    expect(screen.queryByTestId('dsar-list')).toBeNull();
    expect(screen.queryByTestId('dsar-empty')).toBeNull();
    expect(screen.getByTestId('dsar-load-error').textContent).toMatch(
      /any request you have filed still stands/i,
    );
  });

  it('a failed submission says nothing was submitted', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ total: 0, requests: [] }))
      .mockResolvedValueOnce(jsonRes({ error: 'nope' }, false, 500));
    vi.stubGlobal('fetch', fetchMock);

    render(<AccountPrivacyPage />);
    await waitFor(() => expect(screen.getByTestId('dsar-empty')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /file request/i }));

    await waitFor(() => expect(screen.getByTestId('dsar-submit-error')).toBeTruthy());
    expect(screen.getByTestId('dsar-submit-error').textContent).toMatch(/Nothing has been submitted/i);
    expect(screen.queryByTestId('dsar-filed')).toBeNull();
  });

  it('offers all four statutory request kinds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes({ total: 0, requests: [] })));
    render(<AccountPrivacyPage />);
    await waitFor(() => expect(screen.getByTestId('dsar-empty')).toBeTruthy());
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.map((r) => r.value).sort()).toEqual(
      ['access', 'erasure', 'portability', 'rectify'].sort(),
    );
  });
});
