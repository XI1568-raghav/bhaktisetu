import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from './index.js';

// ─── API_ENDPOINTS structural sanity ─────────────────────────────────────────
//
// Lightweight sanity check (NOT a full route-resolution test):
// every endpoint value — whether a literal string or a path-builder function —
// must produce a non-empty path rooted at `/api/v1`. This catches regressions
// like the historical `AUTH_REQUEST_OTP = "/api/v1/auth/otp/request"` mismatch
// where the path drifted from the actual backend route (`/auth/send-otp`).
//
// Functions are invoked with placeholder args to exercise the builder; the
// resulting string is checked the same way as literal entries.

describe('API_ENDPOINTS', () => {
  it('AUTH_* entries match the BE auth routes', () => {
    // apps/api/src/routes/auth.ts (mounted at /api/v1/auth):
    //   POST /send-otp   (line 247)
    //   POST /verify-otp (line 288)
    //   POST /refresh    (line 378)
    //   POST /logout     (line 485)
    expect(API_ENDPOINTS.AUTH_REQUEST_OTP).toBe('/api/v1/auth/send-otp');
    expect(API_ENDPOINTS.AUTH_VERIFY_OTP).toBe('/api/v1/auth/verify-otp');
    expect(API_ENDPOINTS.AUTH_REFRESH_TOKEN).toBe('/api/v1/auth/refresh');
    expect(API_ENDPOINTS.AUTH_LOGOUT).toBe('/api/v1/auth/logout');
  });

  it('every endpoint resolves to a non-empty /api/v1 path', () => {
    const violations: string[] = [];

    // Placeholder arguments for path-builder functions: any non-empty string
    // slug/id is fine since we only assert the path shape, not the substituted
    // value.
    const SAMPLE_ARG = 'sample';

    for (const [key, value] of Object.entries(API_ENDPOINTS)) {
      let resolved: unknown;
      if (typeof value === 'function') {
        try {
          // Path builders take a single id/slug argument.
          resolved = (value as (s: string) => string)(SAMPLE_ARG);
        } catch {
          violations.push(`${key}: function threw when called`);
          continue;
        }
      } else {
        resolved = value;
      }

      if (typeof resolved !== 'string' || resolved.length === 0) {
        violations.push(`${key}: resolved to ${JSON.stringify(resolved)} (not a non-empty string)`);
        continue;
      }

      if (!resolved.startsWith('/api/v1')) {
        violations.push(`${key}: ${resolved} does not start with /api/v1`);
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
