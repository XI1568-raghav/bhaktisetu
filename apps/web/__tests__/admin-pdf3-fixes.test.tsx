import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { bookingTileCaption, bookingTileTitle } from '../lib/admin-reports-format';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }));
vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ user: { fullName: 'Platform Admin' }, session: { accessToken: 't' }, signOut: vi.fn() }),
}));
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminRootLayout from '../app/admin/layout';
import AdminWaitlistPage from '../app/admin/waitlist/page';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PDF3 #11: the admin sidebar reaches Consultations', () => {
  it('links /admin/consultations', () => {
    render(<AdminRootLayout>{null}</AdminRootLayout>);
    expect(screen.getByRole('link', { name: /^consultations$/i }).getAttribute('href')).toBe('/admin/consultations');
  });
});

describe('PDF3 #7: report tile captions are honest', () => {
  it('never prints a percentage and says so when there is nothing to compare', () => {
    expect(bookingTileCaption({ label: 'Total Bookings', thisMonth: 0, lastMonth: 0 })).toBe('None this month or last');
    expect(bookingTileCaption({ label: 'x', thisMonth: 3, lastMonth: 0 })).toBe('3 this month, none last month');
    expect(bookingTileCaption({ label: 'x', thisMonth: 2, lastMonth: 20 })).toBe('2 this month, 20 last month');
    expect(bookingTileCaption({ label: 'x' })).toBe('—');
    expect(bookingTileCaption({ label: 'x', thisMonth: 0, lastMonth: 9 })).not.toMatch(/%/);
  });
  it('names what Total leaves out', () => {
    expect(bookingTileTitle('Total Bookings')).toMatch(/excl\. cancelled/);
    expect(bookingTileTitle('Cancelled')).toBe('Cancelled');
  });
});

describe('PDF3 #8: the waitlist 30-day chart', () => {
  function serve(daily: Array<{ date: string; signups: number }>, total: number) {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            total,
            confirmed: 0,
            invited: 0,
            converted: 0,
            topReferrers: [],
            daily,
            funnel: { pending: 0, confirmed: 0, invited: 0, converted: 0 },
          }),
          { status: 200 },
        ),
    );
  }
  const days = (n: number, hit?: number) =>
    Array.from({ length: n }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, signups: i === hit ? 2 : 0 }));

  it('says so honestly when there are no signups in the window', async () => {
    serve(days(30), 8);
    render(<AdminWaitlistPage />);
    const msg = await screen.findByTestId('waitlist-chart-empty');
    expect(msg.textContent).toMatch(/No signups in the last 30 days/);
    expect(msg.textContent).toMatch(/8 in total/);
  });

  it('gives every bar column a definite height so the bars can render', async () => {
    serve(days(30, 20), 8);
    const { container } = render(<AdminWaitlistPage />);
    await waitFor(() => expect(container.querySelector('[title^="2026-10-21"]')).not.toBeNull());
    expect(container.querySelector('[title^="2026-10-21"]')!.className).toMatch(/\bh-full\b/);
  });
});

describe('PDF3 #9: no developer wording on admin screens', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) {
        if (f !== '__tests__') walk(p, out);
      } else if (/\.tsx$/.test(f)) out.push(p);
    }
    return out;
  }
  it('has no "Sprint N" or "stub" in rendered admin JSX text', () => {
    const root = join(__dirname, '../app/admin');
    const bad: string[] = [];
    for (const f of walk(root)) {
      const src = readFileSync(f, 'utf8');
      if (/sub="[^"]*(Sprint|stub)[^"]*"/i.test(src) || />\s*[^<>{}]*\b(Sprint \d|stub)\b[^<>{}]*</i.test(src)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
  it('labels the retention tiles "Not tracked yet"', () => {
    const src = readFileSync(join(__dirname, '../app/admin/metrics/page.tsx'), 'utf8');
    expect(src.match(/Not tracked yet/g)).toHaveLength(2);
  });
});
