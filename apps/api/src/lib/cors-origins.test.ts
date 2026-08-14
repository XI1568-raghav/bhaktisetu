/**
 * A11Y-16 — the local CORS allowlist omitted 127.0.0.1.
 *
 * Reproduced with curl on 2026-08-12:
 *   GET /pujas/types/rudrabhishek  Origin: http://localhost:3000
 *     -> 200, access-control-allow-origin: http://localhost:3000
 *   GET /pujas/types/rudrabhishek  Origin: http://127.0.0.1:3000
 *     -> 200, NO access-control-allow-origin header
 *
 * The browser therefore blocked every client fetch from 127.0.0.1:3000, and
 * /pujas/book?slug=rudrabhishek rendered its catalog-error state with
 * h1Count=0, 22 text runs and zero form fields — at HTTP 200, so an automated
 * scan reports it as the real product. Two accessibility passes (A11Y-08 and
 * A11Y-09) were burned on that error screen before the discrepancy was caught.
 *
 * No end-user impact in production; this protects every QA, screenshot and
 * accessibility run performed against the loopback address.
 */

import { describe, it, expect } from 'vitest';
import { resolveCorsOrigins, LOCAL_DEV_ORIGINS } from './cors-origins.js';

describe('A11Y-16 — the development fallback', () => {
  it('allows the 127.0.0.1 spelling of the web dev server', () => {
    const origins = resolveCorsOrigins({ NODE_ENV: 'development' });
    expect(origins).toContain('http://127.0.0.1:3000');
  });

  it('still allows the localhost spelling', () => {
    const origins = resolveCorsOrigins({ NODE_ENV: 'development' });
    expect(origins).toContain('http://localhost:3000');
  });

  it('covers both ports the harness uses, in both spellings', () => {
    const origins = resolveCorsOrigins({ NODE_ENV: 'test' });
    for (const port of [3000, 3001]) {
      for (const host of ['localhost', '127.0.0.1']) {
        expect(origins, `${host}:${port}`).toContain(`http://${host}:${port}`);
      }
    }
  });

  it('stays loopback-only — no LAN address, no wildcard', () => {
    const origins = resolveCorsOrigins({ NODE_ENV: 'development' });
    for (const o of origins) {
      expect(o, `${o} is not a loopback origin`).toMatch(
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
      );
    }
    expect(origins).not.toContain('*');
  });

  it('exports the same list it returns, so server.ts cannot drift from it', () => {
    expect(resolveCorsOrigins({})).toEqual([...LOCAL_DEV_ORIGINS]);
  });
});

describe('A11Y-16 — production is untouched', () => {
  it('refuses to start with a default allowlist in production', () => {
    expect(() => resolveCorsOrigins({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN/);
  });

  it('uses CORS_ORIGIN verbatim when it is set, and adds nothing to it', () => {
    const origins = resolveCorsOrigins({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://darshya.online, https://www.darshya.online',
    });
    expect(origins).toEqual(['https://darshya.online', 'https://www.darshya.online']);
    expect(origins, 'the loopback fallback must never leak into prod').not.toContain(
      'http://127.0.0.1:3000',
    );
  });

  it('an explicit CORS_ORIGIN also wins outside production', () => {
    const origins = resolveCorsOrigins({
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://example.test',
    });
    expect(origins).toEqual(['http://example.test']);
  });

  it('a blank CORS_ORIGIN in production is treated as unset, not as an empty allowlist', () => {
    // ',,  ,' would otherwise produce [] and silently allow nothing.
    expect(() => resolveCorsOrigins({ NODE_ENV: 'production', CORS_ORIGIN: ',,  ,' })).toThrow(
      /CORS_ORIGIN/,
    );
  });
});
