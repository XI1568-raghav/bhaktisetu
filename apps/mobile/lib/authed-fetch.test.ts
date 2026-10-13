import { describe, it, expect, vi, beforeEach } from 'vitest';

const onUnauthorised = vi.fn();
const getToken = vi.fn();
vi.mock('./auth-context', () => ({
  onUnauthorisedMobile: () => onUnauthorised(),
  getStoredAccessToken: () => getToken(),
}));
vi.mock('./language', () => ({ currentAcceptLanguage: () => 'en' }));

import { authedFetch } from './authed-fetch';

const res = (status: number) => new Response('{}', { status });

describe('authedFetch', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    onUnauthorised.mockReset().mockResolvedValue(undefined);
    getToken.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('passes a non-401 straight through without refreshing', async () => {
    fetchMock.mockResolvedValueOnce(res(200));
    const r = await authedFetch('http://x/a', { headers: { Authorization: 'Bearer old' } });
    expect(r.status).toBe(200);
    expect(onUnauthorised).not.toHaveBeenCalled();
  });

  it('on 401 refreshes once and retries with the new token', async () => {
    fetchMock.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200));
    getToken.mockResolvedValue('new');
    const r = await authedFetch('http://x/a', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer old' },
    });
    expect(r.status).toBe(200);
    expect(onUnauthorised).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryHeaders = new Headers(fetchMock.mock.calls[1][1].headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer new');
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH');
  });

  it('returns the 401 when the token did not change (refresh rejected/unavailable)', async () => {
    fetchMock.mockResolvedValueOnce(res(401));
    getToken.mockResolvedValue('old');
    const r = await authedFetch('http://x/a', { headers: { Authorization: 'Bearer old' } });
    expect(r.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh a demo token or an unauthenticated request', async () => {
    fetchMock.mockResolvedValue(res(401));
    await authedFetch('http://x/a', { headers: { Authorization: 'Bearer demo-pandit-token' } });
    await authedFetch('http://x/a');
    expect(onUnauthorised).not.toHaveBeenCalled();
  });
});
