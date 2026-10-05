import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Temple Manager', email: 't@x.test' },
    isAuthenticated: true,
    isLoading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/temple-portal/schedule',
  useSearchParams: () => new URLSearchParams(),
}));

import TempleScheduleEditor from '../app/temple-portal/schedule/page';
import TemplePortalLayout from '../app/temple-portal/layout';
import { API_BASE_URL } from '../lib/api-config';

function stubFetch(responder: (url: string, init?: RequestInit) => { status: number; body: unknown }) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = responder(String(url), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/temple-portal/schedule');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('temple portal nav', () => {
  it('has a Schedule link to /temple-portal/schedule', () => {
    render(
      <TemplePortalLayout>
        <div />
      </TemplePortalLayout>,
    );
    const links = screen.getAllByRole('link', { name: /schedule/i });
    expect(links.some((a) => a.getAttribute('href') === '/temple-portal/schedule')).toBe(true);
  });
});

describe('temple schedule editor without a typed slug', () => {
  it("loads the manager's own temple (no slug in the request) and shows its hours", async () => {
    const fetchFn = stubFetch(() => ({
      status: 200,
      body: {
        id: 't1',
        slug: 'somnath',
        name: 'Somnath Temple',
        timingInfo: { closedOn: 'Open all days', regularHours: { mangalaAarti: '04:00 - 05:00' } },
      },
    }));
    render(<TempleScheduleEditor />);

    await waitFor(() => expect(screen.getByDisplayValue('04:00 - 05:00')).toBeTruthy());
    expect(screen.getByText('Somnath Temple')).toBeTruthy();
    expect(fetchFn.mock.calls[0]![0]).toBe(`${API_BASE_URL}/temple-portal/schedule`);
    expect(document.body.textContent ?? '').not.toMatch(/\?slug=/);
  });

  it('saves against the slug the API returned', async () => {
    const fetchFn = stubFetch((_url, init) =>
      init?.method === 'PATCH'
        ? { status: 200, body: {} }
        : {
            status: 200,
            body: { slug: 'somnath', name: 'Somnath Temple', timingInfo: { regularHours: { a: '04:00 - 05:00' } } },
          },
    );
    render(<TempleScheduleEditor />);
    await waitFor(() => expect(screen.getByDisplayValue('04:00 - 05:00')).toBeTruthy());

    screen.getByRole('button', { name: /save schedule/i }).click();
    await waitFor(() => expect(fetchFn.mock.calls.length).toBe(2));
    expect(fetchFn.mock.calls[1]![0]).toBe(`${API_BASE_URL}/temple-portal/schedule?slug=somnath`);
  });

  it("shows the API's reason when the manager's temple is not linked", async () => {
    stubFetch(() => ({
      status: 409,
      body: { code: 'temple_not_linked', reason: 'not_approved', message: 'Your temple profile is awaiting approval by the Darshya team.' },
    }));
    render(<TempleScheduleEditor />);
    await waitFor(() => expect(screen.getByText(/awaiting approval/i)).toBeTruthy());
    expect(screen.queryByRole('button', { name: /save schedule/i })).toBeNull();
  });
});
