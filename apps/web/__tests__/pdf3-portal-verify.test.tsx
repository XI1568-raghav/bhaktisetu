import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const authValue = vi.hoisted(() => ({
  session: { accessToken: 'tok-1' },
  user: { id: 'u1' },
  isAuthenticated: true,
  isLoading: false,
}));
vi.mock('../lib/auth-context', () => ({ useAuth: () => authValue }));

import OpenRequests from '../components/priest/OpenRequests';
import { warmGet, __warmGetClear } from '../lib/warm-get';
import { API_BASE_URL } from '../lib/api-config';

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const URL_OPEN = `${API_BASE_URL}/priest/open-requests`;
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const openBody = {
  eligible: true,
  requests: [
    {
      id: 'bk-1', bookingNumber: 'BS-20261008-AAAAA', scheduledDate: '2026-10-08T00:00:00.000Z',
      scheduledTimeSlot: '07:00', devoteeCount: 2, priestEarningInr: 2400,
      pujaName: 'Hanuman Chalisa Path', templeName: 'Kashi Vishwanath Temple', city: 'Varanasi',
    },
  ],
};

describe('PDF 3 portal verification fixes', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    __warmGetClear();
    fetchMock = vi.fn(async () => json(openBody));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('offers page: open requests are fetched with the offers list, not after it (no waterfall)', async () => {
    // Every sidebar click is a full page load on Cloudflare (static pages answer RSC with HTML), so
    // each extra API round trip is paid in full: offers then open-requests took ~4.4 s on prod.
    const page = read('app/priest/offers/page.tsx');
    expect(page).toMatch(/warmGet\(`\$\{API_BASE_URL\}\/priest\/open-requests`/);
    expect(page.indexOf('warmGet(')).toBeLessThan(page.indexOf('await fetch(`${API_BASE_URL}/priest/offers`'));

    warmGet(URL_OPEN, 'tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    render(<OpenRequests />);
    await waitFor(() => expect(screen.getByText('Hanuman Chalisa Path')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('open requests still fetches by itself when nothing was warmed', async () => {
    render(<OpenRequests />);
    await waitFor(() => expect(screen.getByText('Hanuman Chalisa Path')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('every pattern="" attribute in the app compiles under the v flag Chrome uses', () => {
    // pattern="[a-z0-9-]+" is an invalid class under /v ("Invalid character class"): Chrome logs a
    // console error and silently drops the validation. A trailing hyphen must be escaped.
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '.next' || name === '__tests__') continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx$/.test(name)) {
          const src = readFileSync(full, 'utf8');
          for (const m of src.matchAll(/\spattern="([^"]+)"/g)) {
            try {
              new RegExp(m[1]!, 'v');
            } catch {
              bad.push(`${full.replace(root, '')}: ${m[1]}`);
            }
          }
        }
      }
    };
    walk(join(root, 'app'));
    walk(join(root, 'components'));
    expect(bad).toEqual([]);
  });

  it('icon-only action buttons in the temple and wellness portals have an accessible name', () => {
    const darshan = read('app/temple-portal/darshan/page.tsx');
    expect(darshan).toMatch(/aria-label=\{`Delete stream /);
    const pujas = read('app/temple-portal/pujas/page.tsx');
    expect(pujas).toMatch(/aria-label=\{`Edit \$\{type\?\.name/);
    expect(pujas).toMatch(/aria-label=\{`Delete \$\{type\?\.name/);
    const sessions = read('app/wellness-portal/sessions/page.tsx');
    expect(sessions).toMatch(/aria-label=\{`Edit \$\{s\.title\}`\}/);
    expect(sessions).toMatch(/aria-label=\{`Delete \$\{s\.title\}`\}/);
  });

  it('narrow screens: the reports export buttons and the users pager wrap instead of clipping', () => {
    const reports = read('app/admin/reports/page.tsx');
    expect(reports).toMatch(/flex flex-wrap items-center justify-between gap-3/);
    expect(reports).toMatch(/<div className="flex flex-wrap gap-2">/);
    const users = read('app/admin/users/page.tsx');
    expect(users).toMatch(/flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t/);
    expect(users).toMatch(/<div className="flex flex-wrap items-center gap-1">/);
  });
});
