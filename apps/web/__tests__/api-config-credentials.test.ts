import { describe, it, expect, vi } from 'vitest';
import { withApiCredentials } from '../lib/api-config';

const API = 'https://api.darshya.online/api/v1';

describe('withApiCredentials', () => {
  it('adds credentials: include to API calls that did not choose', () => {
    const native = vi.fn().mockResolvedValue(new Response('{}'));
    withApiCredentials(native as unknown as typeof fetch, API)(`${API}/support/tickets`, { method: 'GET' });
    expect(native).toHaveBeenCalledWith(`${API}/support/tickets`, { method: 'GET', credentials: 'include' });
  });

  it('adds it when no init is given at all', () => {
    const native = vi.fn().mockResolvedValue(new Response('{}'));
    withApiCredentials(native as unknown as typeof fetch, API)(`${API}/auth/me`);
    expect(native).toHaveBeenCalledWith(`${API}/auth/me`, { credentials: 'include' });
  });

  it('leaves an explicit choice alone', () => {
    const native = vi.fn().mockResolvedValue(new Response('{}'));
    withApiCredentials(native as unknown as typeof fetch, API)(`${API}/x`, { credentials: 'omit' });
    expect(native).toHaveBeenCalledWith(`${API}/x`, { credentials: 'omit' });
  });

  it('does not touch calls to other hosts', () => {
    const native = vi.fn().mockResolvedValue(new Response('{}'));
    withApiCredentials(native as unknown as typeof fetch, API)('https://example.com/a', { method: 'POST' });
    expect(native).toHaveBeenCalledWith('https://example.com/a', { method: 'POST' });
  });
});
