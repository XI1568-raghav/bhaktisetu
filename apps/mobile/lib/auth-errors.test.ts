import { describe, expect, it } from 'vitest';

import { authFailureMessage } from './auth-errors';

const API_NETWORK_MESSAGE = 'Could not reach Darshya. Check your connection and try again.';
const apiErr = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });

describe('authFailureMessage', () => {
  it('keeps the sentence the server sent, including the 503 outage copy', () => {
    expect(authFailureMessage(apiErr(503, 'Sign-in is temporarily unavailable. Please try again in a moment.'), 'x')).toBe(
      'Sign-in is temporarily unavailable. Please try again in a moment.',
    );
    expect(authFailureMessage(apiErr(401, 'Invalid login credentials'), 'x')).toBe('Invalid login credentials');
  });
  it('replaces transport errors and bare status fallbacks', () => {
    expect(authFailureMessage(apiErr(0, 'Network request failed'), 'x')).toBe(API_NETWORK_MESSAGE);
    expect(authFailureMessage(apiErr(408, 'Request timed out after 30000ms'), 'x')).toBe(API_NETWORK_MESSAGE);
    expect(authFailureMessage(new TypeError('Network request failed'), 'x')).toBe(API_NETWORK_MESSAGE);
    expect(authFailureMessage(apiErr(502, 'Request failed with status 502'), 'x')).toMatch(/trouble/);
    expect(authFailureMessage(apiErr(429, 'Request failed with status 429'), 'x')).toMatch(/Too many/);
    expect(authFailureMessage(apiErr(400, 'Request failed with status 400'), 'fallback')).toBe('fallback');
    expect(authFailureMessage('weird', 'fallback')).toBe('fallback');
  });
});
