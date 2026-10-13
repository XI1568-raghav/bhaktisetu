import { describe, it, expect } from 'vitest';
import { isAuthUpstreamDown } from './auth-upstream.js';

describe('isAuthUpstreamDown', () => {
  it('recognises network failures from supabase-js', () => {
    expect(isAuthUpstreamDown({ name: 'AuthRetryableFetchError', message: 'fetch failed', status: 0 })).toBe(true);
    expect(isAuthUpstreamDown({ message: 'fetch failed' })).toBe(true);
    expect(isAuthUpstreamDown({ status: 502, message: 'Bad Gateway' })).toBe(true);
  });
  it('does not treat bad input as an outage', () => {
    expect(isAuthUpstreamDown({ name: 'AuthApiError', status: 400, message: 'Invalid login credentials' })).toBe(false);
    expect(isAuthUpstreamDown({ status: 422, message: 'User already registered' })).toBe(false);
    expect(isAuthUpstreamDown(null)).toBe(false);
  });
});
