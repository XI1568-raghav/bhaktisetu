/**
 * Wellness deep pass 2026-10-29: roster states, session form validation, IST times,
 * and the real-instructor profile.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' }, user: { id: 'u1' } }),
}));
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import WellnessSessionsPage from '../app/wellness-portal/sessions/page';
import RealInstructorProfile from '../app/wellness/instructors/[id]/RealInstructorProfile';
import { formatClassWhen } from '../app/wellness/classes/WellnessClassesClient';
import { formatIstDate, formatIstDateTime, formatIstTime } from '../lib/wellness-time';
import { fromLocalInput, toLocalInput, validateSessionForm } from '../lib/wellness-session-form';

type Reply = { status: number; body: unknown };
function stubFetch(responder: (url: string, init?: RequestInit) => Reply | Promise<Reply>) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = await responder(String(url), init);
    return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const SESSION = {
  id: 's1',
  instructorId: 'i1',
  title: 'Morning yoga',
  description: 'Gentle flow',
  type: 'YOGA',
  scheduledAt: '2026-11-05T05:00:00.000Z',
  durationMinutes: 60,
  capacity: 30,
  priceInr: '200',
  status: 'SCHEDULED',
  roomUrl: null,
  createdAt: '2026-10-28T00:00:00.000Z',
  updatedAt: '2026-10-28T00:00:00.000Z',
  enrolled: 0,
};

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('sessions page roster', () => {
  it('shows a plain empty state when nobody has enrolled', async () => {
    stubFetch((url) =>
      url.endsWith('/wellness/sessions/mine')
        ? { status: 200, body: { data: [SESSION] } }
        : { status: 200, body: { data: [] } },
    );
    render(<WellnessSessionsPage />);
    await waitFor(() => expect(screen.getByText('Morning yoga')).toBeTruthy());
    fireEvent.click(screen.getByTestId('roster-toggle-s1'));
    await waitFor(() => expect(screen.getByTestId('roster-empty').textContent).toBe('No students enrolled yet.'));
  });

  it('lists real rows and lets the instructor mark attendance', async () => {
    stubFetch((url) =>
      url.endsWith('/wellness/sessions/mine')
        ? { status: 200, body: { data: [SESSION] } }
        : {
            status: 200,
            body: { data: [{ id: 'e1', status: 'PAID', enrolledAt: '2026-10-29T00:00:00Z', attendedAt: null, user: { id: 'u9', fullName: 'Test Devotee' } }] },
          },
    );
    render(<WellnessSessionsPage />);
    await waitFor(() => expect(screen.getByText('Morning yoga')).toBeTruthy());
    fireEvent.click(screen.getByTestId('roster-toggle-s1'));
    await waitFor(() => expect(screen.getByText('Test Devotee')).toBeTruthy());
    expect(screen.getByTestId('attend-e1')).toBeTruthy();
  });

  it('never shows the raw Fastify "Route GET:... not found" text when the server lacks the endpoint', async () => {
    stubFetch((url) =>
      url.endsWith('/wellness/sessions/mine')
        ? { status: 200, body: { data: [SESSION] } }
        : { status: 404, body: { message: 'Route GET:/api/v1/wellness/sessions/s1/enrollments not found', error: 'Not Found', statusCode: 404 } },
    );
    render(<WellnessSessionsPage />);
    await waitFor(() => expect(screen.getByText('Morning yoga')).toBeTruthy());
    fireEvent.click(screen.getByTestId('roster-toggle-s1'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).not.toMatch(/Route GET/);
  });

  it('a slow answer for roster A cannot overwrite roster B', async () => {
    const second = { ...SESSION, id: 's2', title: 'Evening yoga' };
    let releaseA: (r: Reply) => void = () => {};
    stubFetch((url) => {
      if (url.endsWith('/wellness/sessions/mine')) return { status: 200, body: { data: [SESSION, second] } };
      if (url.includes('/sessions/s1/enrollments')) return new Promise<Reply>((resolve) => { releaseA = resolve; });
      return {
        status: 200,
        body: { data: [{ id: 'eB', status: 'PAID', enrolledAt: '2026-10-29T00:00:00Z', attendedAt: null, user: { id: 'u2', fullName: 'Learner B' } }] },
      };
    });
    render(<WellnessSessionsPage />);
    await waitFor(() => expect(screen.getByText('Evening yoga')).toBeTruthy());
    fireEvent.click(screen.getByTestId('roster-toggle-s1'));
    fireEvent.click(screen.getByTestId('roster-toggle-s2'));
    await waitFor(() => expect(screen.getByText('Learner B')).toBeTruthy());
    releaseA({
      status: 200,
      body: { data: [{ id: 'eA', status: 'PAID', enrolledAt: '2026-10-29T00:00:00Z', attendedAt: null, user: { id: 'u1', fullName: 'Learner A' } }] },
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('Learner A')).toBeNull();
    expect(screen.getByText('Learner B')).toBeTruthy();
  });
});

describe('session form validation', () => {
  const ok = { title: 'Morning yoga', description: 'd', scheduledAt: '2999-01-01T10:00', duration: '60', price: '200', capacity: '20', editing: false, minCapacity: 0 };

  it('accepts a valid form, including a free (0) session', () => {
    expect(validateSessionForm(ok)).toBeNull();
    expect(validateSessionForm({ ...ok, price: '0' })).toBeNull();
  });

  it.each([
    [{ title: '   ' }, /title/i],
    [{ title: 'ab' }, /title/i],
    [{ title: 'x'.repeat(201) }, /title/i],
    [{ description: '   ' }, /description/i],
    [{ scheduledAt: '' }, /start/i],
    [{ scheduledAt: '2020-01-01T10:00' }, /future/i],
    [{ duration: '4' }, /duration/i],
    [{ duration: '601' }, /duration/i],
    [{ duration: '30.5' }, /duration/i],
    [{ capacity: '0' }, /capacity/i],
    [{ capacity: '10001' }, /capacity/i],
    [{ price: '' }, /price/i],
    [{ price: '-5' }, /negative/i],
    [{ price: '1000001' }, /10,00,000/],
  ])('rejects %j', (over, msg) => {
    expect(validateSessionForm({ ...ok, ...over })).toMatch(msg);
  });

  it('lets an edit keep a past start but not drop capacity below enrolled learners', () => {
    expect(validateSessionForm({ ...ok, editing: true, scheduledAt: '2020-01-01T10:00' })).toBeNull();
    expect(validateSessionForm({ ...ok, editing: true, capacity: '2', minCapacity: 3 })).toMatch(/3 learners/);
  });
});

describe('class times are India time', () => {
  it('formats one instant as IST whatever the viewer zone is', () => {
    expect(formatClassWhen('2026-11-05T05:00:00.000Z')).toMatch(/10:30\s?am IST$/i);
    expect(formatIstTime('2026-11-05T05:00:00.000Z')).toMatch(/^10:30\s?am IST$/i);
    expect(formatIstDateTime('2026-11-05T05:00:00.000Z')).toMatch(/5 Nov 2026.*10:30\s?am IST$/i);
  });

  it('uses the Indian calendar day (18:30 UTC is already the next day in India)', () => {
    expect(formatIstDate('2026-11-05T19:00:00.000Z')).toBe('6 Nov');
  });

  it('round-trips the form value as IST and survives a non-IST machine', () => {
    expect(fromLocalInput('2026-11-05T10:30').toISOString()).toBe('2026-11-05T05:00:00.000Z');
    expect(toLocalInput('2026-11-05T05:00:00.000Z')).toBe('2026-11-05T10:30');
    expect(toLocalInput('2026-11-05T19:00:00.000Z')).toBe('2026-11-06T00:30');
  });
});

describe('real instructor profile', () => {
  it('renders a listed instructor with no invented rating or price', async () => {
    stubFetch((url) =>
      url.includes('/providers/wellness/')
        ? {
            status: 200,
            body: { provider: { id: 'p1', displayName: 'Test Yoga Guru', specialties: ['Hatha'], certifications: [], experience: 0, bio: 'Hello', pricePerSession: '600', ratingAvg: 0, ratingCount: 0, reviews: [] } },
          }
        : { status: 200, body: { data: [] } },
    );
    render(<RealInstructorProfile id="p1" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Test Yoga Guru' })).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/₹\s?600|reviews?\b.*\d|★/);
    expect(document.body.textContent).not.toMatch(/0 reviews/);
  });

  it('says so when the instructor does not exist', async () => {
    stubFetch(() => ({ status: 404, body: { error: 'wellness provider not found' } }));
    render(<RealInstructorProfile id="nope" />);
    await waitFor(() => expect(screen.getByText('Instructor not found')).toBeTruthy());
  });
});
