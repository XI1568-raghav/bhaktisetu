import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'tok-1' }, user: { id: 'u1' } }),
}));

import { warmGet, takeWarmed, __warmGetClear } from '../lib/warm-get';
import TempleInvitesCard from '../components/priest/TempleInvitesCard';
import { API_BASE_URL } from '../lib/api-config';

const INVITES = `${API_BASE_URL}/priest/temple-invites`;
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  __warmGetClear();
  fetchMock = vi.fn(async () => json({ invites: [{ id: 'i1', templeName: 'Kashi Temple', templeCity: 'Varanasi', isPrimary: false }] }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('warm-get (priest first screen: the cards no longer wait for the dashboard)', () => {
  it('hands the in-flight request over exactly once, for the same url and token only', async () => {
    warmGet(INVITES, 'tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(takeWarmed(INVITES, 'other-token')).toBeNull();
    const first = takeWarmed(INVITES, 'tok-1');
    expect(first).not.toBeNull();
    expect(takeWarmed(INVITES, 'tok-1')).toBeNull();
    expect((await (await first!).json()).invites).toHaveLength(1);
  });

  it('does not start a second request while one is warm, and sends the bearer token', () => {
    warmGet(INVITES, 'tok-1');
    warmGet(INVITES, 'tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it('a warmed request older than 20 s is not handed out', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    warmGet(INVITES, 'tok-1');
    vi.setSystemTime(Date.now() + 21_000);
    expect(takeWarmed(INVITES, 'tok-1')).toBeNull();
  });

  it('a failed warmed request is not an unhandled rejection', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    warmGet(INVITES, 'tok-1');
    await new Promise((r) => setTimeout(r, 10));
    const taken = takeWarmed(INVITES, 'tok-1');
    await expect(taken).rejects.toThrow('network');
  });

  it('TempleInvitesCard uses the warmed request: one network call in total, same rendering', async () => {
    warmGet(INVITES, 'tok-1');
    render(<TempleInvitesCard />);
    await waitFor(() => expect(screen.getByText(/Kashi Temple/)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('without a warmed request the card still fetches by itself', async () => {
    render(<TempleInvitesCard />);
    await waitFor(() => expect(screen.getByText(/Kashi Temple/)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('the priest page warms both cards in the same effect that starts the dashboard', () => {
    const page = readFileSync(join(__dirname, '..', 'app/priest/page.tsx'), 'utf8');
    expect(page).toMatch(/warmGet\(`\$\{API_BASE_URL\}\/priest\/temple-invites`/);
    expect(page).toMatch(/warmGet\(`\$\{API_BASE_URL\}\/onboarding\/provider\?role=PANDIT`/);
    expect(page.indexOf('warmGet(')).toBeLessThan(page.indexOf('await Promise.all([fetchDashboard()'));
  });
});
