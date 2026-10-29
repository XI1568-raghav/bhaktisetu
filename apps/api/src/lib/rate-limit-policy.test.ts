/**
 * The per-prefix rate-limit policies were dead in production.
 *
 * Measured on prod 2026-09-08:
 *   GET /api/v1/admin/users   -> x-ratelimit-limit: 100
 *   GET /api/v1/temples       -> x-ratelimit-limit: 100
 *   GET /api/v1/panchang/today-> x-ratelimit-limit: 100
 *
 * 100 is `RATE_LIMIT_MAX || 100`, the GLOBAL default (server.ts:252). The
 * `/admin/` branch intends 60, so no per-prefix policy was being applied at all.
 *
 * Cause: routes are registered with a prefix — `server.register(authRoutes,
 * { prefix: '/api/v1/auth' })` — so Fastify hands the onRoute hook the full
 * `/api/v1/auth/login`. The hook tested `url.startsWith('/auth/')`, which that
 * string does not. No branch could ever match.
 *
 * Consequence, worst first: `/auth/*` intends 10/min as brute-force protection
 * on password login and actually allowed 100. `/ai/*` and `/astrology/ask`
 * intend 20 to cap LLM spend. `/donations/create-order` intends 10.
 *
 * The comment above the hook records it having been found a no-op once before
 * and moved to fix it. It stayed a no-op for this different reason, which is why
 * the matching now lives in a pure function with tests instead of inline in the
 * server bootstrap where nothing could reach it.
 */
import { describe, it, expect } from 'vitest';
import { resolveRateLimitPolicy } from './rate-limit-policy.js';

const AUTH_MAX = 10;

describe('resolveRateLimitPolicy', () => {
  it('matches the prefixed urls Fastify actually passes', () => {
    // These are the real strings, as registered in server.ts.
    expect(resolveRateLimitPolicy('/api/v1/auth/login', AUTH_MAX)).toEqual({ max: 10, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/admin/users', AUTH_MAX)).toEqual({ max: 60, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/ai/chat', AUTH_MAX)).toEqual({ max: 20, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/astrology/ask', AUTH_MAX)).toEqual({ max: 20, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/bookings/create-order', AUTH_MAX)).toEqual({ max: 30, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/bookings/verify-payment', AUTH_MAX)).toEqual({ max: 30, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/donations/create-order', AUTH_MAX)).toEqual({ max: 10, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/consultation/book', AUTH_MAX)).toEqual({ max: 30, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/consultation/verify-payment', AUTH_MAX)).toEqual({ max: 30, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/api/v1/consultation/mine', AUTH_MAX)).toBeNull();
    expect(resolveRateLimitPolicy('/api/v1/affiliate/click', AUTH_MAX)).toEqual({ max: 60, timeWindow: '1 minute' });
    // Unauthenticated by design AND a write — see CT-CONSENT-1.
    expect(resolveRateLimitPolicy('/api/v1/digest/unsubscribe', AUTH_MAX)).toEqual({ max: 10, timeWindow: '1 minute' });
  });

  it('still matches unprefixed urls, so a route registered without a prefix is covered too', () => {
    expect(resolveRateLimitPolicy('/auth/login', AUTH_MAX)).toEqual({ max: 10, timeWindow: '1 minute' });
    expect(resolveRateLimitPolicy('/admin/users', AUTH_MAX)).toEqual({ max: 60, timeWindow: '1 minute' });
  });

  it('leaves everything else to the global default', () => {
    expect(resolveRateLimitPolicy('/api/v1/temples', AUTH_MAX)).toBeNull();
    expect(resolveRateLimitPolicy('/api/v1/panchang/today', AUTH_MAX)).toBeNull();
    expect(resolveRateLimitPolicy('/health', AUTH_MAX)).toBeNull();
    expect(resolveRateLimitPolicy('', AUTH_MAX)).toBeNull();
  });

  it('does not let a lookalike prefix borrow a policy', () => {
    // /authors is not /auth. Matching on a bare startsWith('/auth') would have
    // handed this the login limit.
    expect(resolveRateLimitPolicy('/api/v1/authors', AUTH_MAX)).toBeNull();
    expect(resolveRateLimitPolicy('/api/v1/administration', AUTH_MAX)).toBeNull();
  });

  it('honours a configured auth max', () => {
    expect(resolveRateLimitPolicy('/api/v1/auth/login', 3)).toEqual({ max: 3, timeWindow: '1 minute' });
  });

  it('caps the tightest money and LLM routes below the global default of 100', () => {
    for (const url of ['/api/v1/auth/login', '/api/v1/ai/chat', '/api/v1/donations/create-order']) {
      const p = resolveRateLimitPolicy(url, AUTH_MAX);
      expect(p, url).not.toBeNull();
      expect(p!.max, url).toBeLessThan(100);
    }
  });
});
