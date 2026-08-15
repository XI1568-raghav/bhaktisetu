import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * AW-13 (2026-08-12, P2) — web half.
 *
 * A devotee paid ₹1,000 for a wellness class and, once the tab closed, had no
 * route back to it: no "my enrolments" endpoint and no page. The API half added
 * GET /wellness/enrollments/mine; this is the surface that consumes it.
 *
 * Everything rendered is a real enrolment row. There is no fixture fallback: an
 * empty list says it is empty and a failed fetch says THAT, because "no classes"
 * and "we could not read your classes" are different facts to someone who has
 * paid.
 */

vi.mock('../lib/api-config', () => ({ API_BASE_URL: 'https://api.test' }));

const useAuthMock = vi.fn();
vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

// AuthGuard would otherwise gate the whole tree behind its own session probe.
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import MyClassesPage from '../app/wellness/my-classes/page';

const PAID_WITH_ROOM = {
  id: 'e1',
  sessionId: 's1',
  status: 'PAID',
  enrolledAt: '2026-08-10T09:00:00.000Z',
  attendedAt: null,
  session: {
    id: 's1',
    title: 'Sunrise Hatha',
    type: 'YOGA',
    scheduledAt: '2026-09-01T05:30:00.000Z',
    durationMinutes: 60,
    capacity: 12,
    priceInr: '1000',
    status: 'SCHEDULED',
    instructorName: 'Ananya Devi',
    roomUrl: 'https://meet.jit.si/darshya-wellness-sunrise',
  },
};

const PAID_NO_ROOM_YET = {
  ...PAID_WITH_ROOM,
  id: 'e2',
  sessionId: 's2',
  session: {
    ...PAID_WITH_ROOM.session,
    id: 's2',
    title: 'Evening Pranayama',
    roomUrl: null,
  },
};

function mockFetch(rows: unknown[], ok = true) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ data: rows }),
  }) as Response);
}

beforeEach(() => {
  vi.unstubAllGlobals();
  useAuthMock.mockReturnValue({ session: { accessToken: 'demo-devotee-token' } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-13 — the devotee can find a class they paid for', () => {
  it('lists the paid class with its title, time and instructor', async () => {
    vi.stubGlobal('fetch', mockFetch([PAID_WITH_ROOM]));
    render(<MyClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sunrise Hatha')).toBeInTheDocument();
    });
    expect(screen.getByText(/Ananya Devi/)).toBeInTheDocument();
  });

  it('reads the enrolments endpoint, not the public catalog', async () => {
    const fetchMock = mockFetch([PAID_WITH_ROOM]);
    vi.stubGlobal('fetch', fetchMock);
    render(<MyClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('Sunrise Hatha')).toBeInTheDocument();
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/wellness/enrollments/mine');
  });

  it('offers the join link when the server released one', async () => {
    vi.stubGlobal('fetch', mockFetch([PAID_WITH_ROOM]));
    render(<MyClassesPage />);
    const link = await screen.findByRole('link', { name: /join the live room/i });
    expect(link).toHaveAttribute('href', 'https://meet.jit.si/darshya-wellness-sunrise');
  });

  it('says the room is not published yet rather than showing a dead button', async () => {
    vi.stubGlobal('fetch', mockFetch([PAID_NO_ROOM_YET]));
    render(<MyClassesPage />);
    await waitFor(() => {
      expect(screen.getByText('Evening Pranayama')).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: /join the live room/i })).toBeNull();
    expect(screen.getByText(/not published the live room/i)).toBeInTheDocument();
  });

  it('is reachable from the class catalog — an unlinked page is still unfindable', async () => {
    vi.stubGlobal('fetch', mockFetch([]));
    const { default: Catalog } = await import('../app/wellness/classes/WellnessClassesClient');
    render(<Catalog />);
    const link = await screen.findByRole('link', { name: /classes i have enrolled in/i });
    expect(link).toHaveAttribute('href', '/wellness/my-classes');
  });

  it('distinguishes an empty list from a failed read', async () => {
    vi.stubGlobal('fetch', mockFetch([]));
    const { unmount } = render(<MyClassesPage />);
    await waitFor(() => {
      expect(screen.getByText(/haven.t enrolled in a class yet/i)).toBeInTheDocument();
    });
    unmount();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down');
      }),
    );
    render(<MyClassesPage />);
    await waitFor(() => {
      expect(screen.getByText(/couldn.t load your classes/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/haven.t enrolled in a class yet/i)).toBeNull();
  });
});
