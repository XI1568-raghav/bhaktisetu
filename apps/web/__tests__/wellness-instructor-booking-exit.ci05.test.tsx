import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CI-05 — `/wellness/instructors/[id]` is a dead end.
 *
 * The profile is a prerendered server page for eight static instructor rows.
 * Its only hrefs are `/wellness` (breadcrumb, not-found branch, footer "Back
 * to Wellness") and the category listing. The bookable unit in this section is
 * `/wellness/classes/[id]`, fed by real `wellness_sessions` rows — and nothing
 * on the profile reaches it, or even reaches the `/wellness/classes` index.
 * `/wellness/instructors` (the index) does not link the profiles either, so a
 * reader arriving from search has no path to anything sellable.
 *
 * The exit must come from the LIVE feed, never from the static row: AW-17
 * established that this section does not republish the eight-person fixture as
 * if it were supply. So — deep-link this instructor's real upcoming classes
 * when the feed has them, and fall back to the live catalogue plus the
 * category listing when it does not. Never a bare `/wellness`.
 */

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 8000,
  fetchWithTimeout: vi.fn(),
}));

const PAGE = path.join(__dirname, '..', 'app', 'wellness', 'instructors', '[id]', 'page.tsx');

/** A source guard that matches a COMMENT passes on a reverted file. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function feed(data: unknown, ok = true) {
  return vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => ({ data }) }) as Response);
}

async function renderProfile(id = 'inst-001') {
  const { default: Page } = await import('../app/wellness/instructors/[id]/page');
  return render(await Page({ params: Promise.resolve({ id }) }));
}

function hrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('a'))
    .map((a) => a.getAttribute('href') ?? '')
    .filter(Boolean);
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CI-05 — an instructor profile reaches something bookable', () => {
  it('deep-links this instructor’s real upcoming classes when the feed has them', async () => {
    vi.stubGlobal(
      'fetch',
      feed([
        {
          id: 'sess-1',
          title: 'Sunrise Hatha',
          scheduledAt: '2026-09-01T05:30:00.000Z',
          durationMinutes: 60,
          capacity: 12,
          priceInr: '599',
          instructorName: 'Aarav Sharma',
          spotsLeft: 4,
        },
        {
          id: 'sess-2',
          title: 'Someone Else’s Class',
          scheduledAt: '2026-09-02T05:30:00.000Z',
          durationMinutes: 60,
          capacity: 12,
          priceInr: '499',
          instructorName: 'Meera Iyer',
          spotsLeft: 4,
        },
      ]),
    );
    const { container } = await renderProfile('inst-001');
    await waitFor(() => {
      expect(hrefs(container)).toContain('/wellness/classes/sess-1');
    });
    expect(screen.getByText('Sunrise Hatha')).toBeInTheDocument();
    // Another instructor's class must not be attributed to this profile.
    expect(hrefs(container)).not.toContain('/wellness/classes/sess-2');
  });

  it('falls back to the live catalogue and the category listing, never a bare /wellness', async () => {
    vi.stubGlobal('fetch', feed([]));
    const { container } = await renderProfile('inst-001');
    await waitFor(() => {
      expect(hrefs(container)).toContain('/wellness/classes');
    });
    expect(hrefs(container)).toContain('/wellness/yoga');
  });

  it('says the schedule could not be read rather than showing an empty profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down');
      }),
    );
    const { container } = await renderProfile('inst-003');
    await waitFor(() => {
      expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument();
    });
    // Even then the reader is handed the surface that always exists.
    expect(hrefs(container)).toContain('/wellness/classes');
    expect(hrefs(container)).toContain('/wellness/meditation');
  });

  it('every static profile ships the exit, not just the one under test', async () => {
    const { default: Page, generateStaticParams } = await import(
      '../app/wellness/instructors/[id]/page'
    );
    const params = await generateStaticParams();
    expect(params.length).toBeGreaterThan(1);
    for (const { id } of params) {
      vi.stubGlobal('fetch', feed([]));
      const { container, unmount } = render(await Page({ params: Promise.resolve({ id }) }));
      await waitFor(() => {
        expect(hrefs(container), id).toContain('/wellness/classes');
      });
      unmount();
    }
  });

  it('the profile closes on the catalogue, not on "Back to Wellness"', async () => {
    // The `if (!inst)` branch legitimately sends a bad id to /wellness; the
    // breadcrumb parent link is structural. What had to go is the footer that
    // closed a FOUND profile with a bare hop back to the section landing page.
    vi.stubGlobal('fetch', feed([]));
    const { container } = await renderProfile('inst-001');
    await waitFor(() => {
      expect(hrefs(container)).toContain('/wellness/classes');
    });
    expect(container.textContent).not.toContain('Back to Wellness');

    // And the exit is the shared component, not a one-off link nobody
    // maintains. Comments stripped: a fix described in prose is not a fix.
    const src = stripComments(fs.readFileSync(PAGE, 'utf8'));
    expect(src).toMatch(/<InstructorClasses/);
  });
});
