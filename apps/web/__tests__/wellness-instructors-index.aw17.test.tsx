import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * AW-17 (2026-08-12, P3): http://localhost:3000/wellness/instructors was a hard
 * 404. `apps/web/app/wellness/instructors/` held only `[id]/`, so the index
 * level of a marketed section did not exist — reachable by URL guess or an
 * external link, and dead either way.
 *
 * It is built on the same live `wellness_sessions` feed the /wellness landing
 * page uses (COM-14), NOT on GET /api/v1/wellness/instructors — that endpoint
 * still serves the eight-person `instructors` fixture in
 * apps/api/src/routes/wellness.ts, and an index page rendering it would
 * re-import the invented supply COM-14 and AW-07 just removed.
 */

vi.mock('../lib/api-config', () => ({ API_BASE_URL: 'https://api.test' }));

const PAGE_DIR = path.join(__dirname, '..', 'app', 'wellness', 'instructors');

const LIVE_CLASSES = [
  {
    id: 'c1',
    title: 'Sunrise Hatha',
    scheduledAt: '2026-09-01T05:30:00.000Z',
    durationMinutes: 60,
    capacity: 12,
    priceInr: '1000',
    instructorName: 'Ananya Devi',
    spotsLeft: 5,
  },
  {
    id: 'c2',
    title: 'Evening Pranayama',
    scheduledAt: '2026-09-02T13:30:00.000Z',
    durationMinutes: 45,
    capacity: 20,
    priceInr: '400',
    instructorName: 'Ananya Devi',
    spotsLeft: 9,
  },
  {
    id: 'c3',
    title: 'Vipassana Sit',
    scheduledAt: '2026-09-03T02:00:00.000Z',
    durationMinutes: 90,
    capacity: 30,
    priceInr: '0',
    instructorName: 'Bhikkhu Anand',
    spotsLeft: 30,
  },
];

function mockClasses(data: unknown, ok = true) {
  return vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => ({ data }) }) as Response);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-17 — /wellness/instructors index exists', () => {
  it('has a page.tsx at the index level, not only the [id] child', () => {
    const entries = fs.readdirSync(PAGE_DIR);
    expect(entries).toContain('[id]');
    expect(entries).toContain('page.tsx');
  });

  it('renders the instructors teaching real upcoming classes', async () => {
    vi.stubGlobal('fetch', mockClasses(LIVE_CLASSES));
    const { default: Page } = await import('../app/wellness/instructors/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Ananya Devi')).toBeInTheDocument();
    });
    expect(screen.getByText('Bhikkhu Anand')).toBeInTheDocument();
  });

  it('publishes no invented instructor when the live feed is empty', async () => {
    vi.stubGlobal('fetch', mockClasses([]));
    const { default: Page } = await import('../app/wellness/instructors/page');
    const { container } = render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/no instructors/i)).toBeInTheDocument();
    });
    // Comments are stripped from rendered output already, but the fixture names
    // that the /api/v1/wellness/instructors endpoint still serves must not
    // appear from any source.
    const text = container.textContent ?? '';
    for (const invented of ['Aarav Sharma', 'Meera Iyer', 'Swami Dhyanananda', 'Acharya Goenkaji']) {
      expect(text).not.toContain(invented);
    }
  });

  it('says the load failed rather than rendering an empty directory', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down');
      }),
    );
    const { default: Page } = await import('../app/wellness/instructors/page');
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument();
    });
  });
});
