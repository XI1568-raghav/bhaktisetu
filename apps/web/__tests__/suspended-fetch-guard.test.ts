import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SUSPENDED_EVENT, installSuspendedFetchGuard } from '../lib/suspended-notice';

const BASE = 'http://api.test/api/v1';
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('installSuspendedFetchGuard', () => {
  const events: unknown[] = [];
  let inner: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    events.length = 0;
    delete (window as unknown as Record<string, unknown>).__darshyaSuspendedFetchGuard;
    inner = vi.fn();
    window.fetch = inner as unknown as typeof fetch;
    window.addEventListener(SUSPENDED_EVENT, (e) => events.push((e as CustomEvent).detail), { once: true });
    installSuspendedFetchGuard(BASE);
  });

  it('announces a bare fetch to the API answered 403 suspended, body still readable', async () => {
    inner.mockResolvedValue(json(403, { error: 'Forbidden', message: 'Account suspended: fraud' }));
    const res = await window.fetch(`${BASE}/bookings`);
    expect(events).toEqual([{ reason: 'fraud' }]);
    expect((await res.json()).message).toContain('suspended');
  });
  it('ignores ordinary 403s, non-API hosts and /auth/ calls', async () => {
    inner.mockResolvedValueOnce(json(403, { error: 'Forbidden', message: 'Admin role required' }));
    await window.fetch(`${BASE}/admin/x`);
    inner.mockResolvedValueOnce(json(403, { message: 'Account suspended' }));
    await window.fetch('http://other.test/x');
    inner.mockResolvedValueOnce(json(403, { message: 'Account suspended' }));
    await window.fetch(`${BASE}/auth/login`);
    expect(events).toEqual([]);
  });
  it('is idempotent', () => {
    const wrapped = window.fetch;
    installSuspendedFetchGuard(BASE);
    expect(window.fetch).toBe(wrapped);
  });
});
