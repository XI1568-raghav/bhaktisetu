/**
 * Admin temple editor: fix a manager-created temple (lat/lng 0, empty pincode),
 * verify it, and give it standard offerings in one click.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('../lib/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 't' } }) }));
import AdminTemplesPage from '../app/admin/temples/page';
import { validateForm, toForm } from '../app/admin/temples/temple-form';

const T = '11111111-1111-4111-8111-111111111111';
const PENDING = {
  id: T,
  name: 'Manager Temple',
  slug: 'manager-temple',
  description: 'A temple.',
  deityPrimary: 'Shiva',
  city: 'Gurugram',
  state: 'Haryana',
  addressLine: 'Sector 1',
  pincode: '',
  lat: 0,
  lng: 0,
  isVerified: false,
  status: 'pending_review',
  activeOfferings: 0,
  flags: ['coordinates_missing', 'pincode_invalid'],
};
const res = (b: unknown, status = 200) =>
  ({ ok: status < 400, status, text: async () => JSON.stringify(b), json: async () => b }) as unknown as Response;

type Handler = (url: string, init?: RequestInit) => Response | undefined;
function mock(extra?: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const custom = extra?.(url, init);
    if (custom) return custom;
    if (/\/admin\/temples\/[^/?]+$/.test(url) && (init?.method ?? 'GET') === 'GET') return res({ temple: PENDING });
    return res({ temples: [PENDING], total: 1 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
const calls = (fn: ReturnType<typeof mock>, method: string) =>
  fn.mock.calls.filter((c) => ((c[1] as RequestInit | undefined)?.method ?? 'GET') === method);

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('temple form validation', () => {
  const ok = toForm({ ...PENDING, pincode: '122001', lat: 28.4, lng: 77 } as never);
  it('accepts a real location', () => expect(validateForm(ok)).toEqual({}));
  it('flags 0,0 only through range-valid values (API flags the zero pair), rejects bad ranges and pincode', () => {
    const errs = validateForm({ ...ok, lat: '91', lng: '-181', pincode: '12345' });
    expect(Object.keys(errs).sort()).toEqual(['lat', 'lng', 'pincode']);
    expect(validateForm({ ...ok, pincode: '' }).pincode).toBeTruthy();
    expect(validateForm({ ...ok, lat: '' }).lat).toBeTruthy();
  });
});

describe('admin temples page', () => {
  it('lists temples with flags and the no-offerings warning, and searches', async () => {
    const fn = mock();
    render(<AdminTemplesPage />);
    await screen.findByText('Manager Temple');
    expect(screen.getByText(/Location is 0,0/)).toBeTruthy();
    expect(screen.getByText(/No offerings: booking dead-ends/)).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'manag' } });
    await waitFor(() => expect(fn.mock.calls.some((c) => String(c[0]).includes('q=manag'))).toBe(true));
  });

  it('blocks saving an invalid pincode before calling the API', async () => {
    const fn = mock();
    render(<AdminTemplesPage />);
    fireEvent.click(await screen.findByText('Manager Temple'));
    await screen.findByRole('button', { name: /save changes/i });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/Pincode must be exactly 6 digits/)).toBeTruthy();
    expect(calls(fn, 'PATCH')).toHaveLength(0);
  });

  it('saves a fixed location with a PATCH carrying numbers', async () => {
    const fn = mock((url, init) =>
      init?.method === 'PATCH' ? res({ temple: { ...PENDING, pincode: '122001', lat: 28.4, lng: 77, flags: [] } }) : undefined,
    );
    render(<AdminTemplesPage />);
    fireEvent.click(await screen.findByText('Manager Temple'));
    await screen.findByRole('button', { name: /save changes/i });
    fireEvent.change(screen.getByLabelText(/Pincode/), { target: { value: '122001' } });
    fireEvent.change(screen.getByLabelText(/Latitude/), { target: { value: '28.4' } });
    fireEvent.change(screen.getByLabelText(/Longitude/), { target: { value: '77' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(calls(fn, 'PATCH')).toHaveLength(1));
    const body = JSON.parse((calls(fn, 'PATCH')[0]![1] as RequestInit).body as string);
    expect(body).toMatchObject({ pincode: '122001', lat: 28.4, lng: 77 });
    expect(await screen.findByText(/Manager Temple saved/)).toBeTruthy();
  });

  it('verify toggle sends isVerified and surfaces the API refusal', async () => {
    const fn = mock((url, init) =>
      init?.method === 'PATCH'
        ? res({ error: 'Cannot verify this temple until its location is fixed' }, 400)
        : undefined,
    );
    render(<AdminTemplesPage />);
    fireEvent.click(await screen.findByText('Manager Temple'));
    fireEvent.click(await screen.findByRole('button', { name: /verify temple/i }));
    await waitFor(() => expect(calls(fn, 'PATCH')).toHaveLength(1));
    expect(JSON.parse((calls(fn, 'PATCH')[0]![1] as RequestInit).body as string)).toEqual({ isVerified: true });
    expect(await screen.findByText(/location is fixed/i)).toBeTruthy();
  });

  it('Add standard offerings POSTs to the temple and reports the count', async () => {
    const fn = mock((url, init) =>
      init?.method === 'POST' && url.endsWith(`/admin/temples/${T}/standard-offerings`)
        ? res({ message: 'Standard offerings added', added: 5, alreadyPresent: 0, missingFromCatalogue: [] })
        : undefined,
    );
    render(<AdminTemplesPage />);
    fireEvent.click(await screen.findByText('Manager Temple'));
    fireEvent.click(await screen.findByRole('button', { name: /add standard offerings/i }));
    await waitFor(() => expect(calls(fn, 'POST')).toHaveLength(1));
    expect(await screen.findByText(/Added 5 standard offerings/)).toBeTruthy();
  });
});

describe('admin navigation', () => {
  it('the sidebar links to /admin/temples', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../app/admin/layout.tsx'), 'utf8');
    expect(src).toContain("href: '/admin/temples'");
  });
});

describe('temple puja list leads into the booking wizard', () => {
  it('each Book now deep-links the wizard with the temple preselected', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../app/temples/[slug]/pujas/page.tsx'), 'utf8');
    expect(src).toContain('/book?temple=');
  });
});
