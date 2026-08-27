/**
 * RES-09 — raw developer error text rendered to users.
 *
 * `lib/friendly-error.ts` has existed since #208 and, as of the last handoff,
 * was wired into six screens; about 25 more still did
 *
 *     catch (err) { setError(err instanceof Error ? err.message : '…') }
 *
 * The handoff called the rest "mostly /admin, staff-facing". The pandit portal
 * is not staff-facing — it is the provider side of the marketplace, used by the
 * people who get paid — and it held ten of them, plus five composed strings
 * that put an HTTP status and up to 200 raw characters of the response body on
 * screen. What a pandit could actually be shown, verbatim, before this change:
 *
 *   app/priest/bookings/view/page.tsx   API 500: {"error":"Internal Server Error"}
 *   app/priest/payouts/page.tsx         Could not load your payouts (502). <html>…
 *   app/priest/offers/page.tsx          Could not load your offers (HTTP 401). …
 *   app/priest/profile/page.tsx         Save failed (HTTP 400)
 *   anywhere, on a flaky connection     Failed to fetch  /  Load failed
 *
 * The last row is the one a status-code sweep misses: `err.message` on a
 * network failure is whatever the browser wrote, and it differs per engine.
 *
 * The fix adds the piece that was missing rather than another call site.
 * `friendlyApiError` alone cannot be dropped into these catches, because it
 * cannot tell a sentence the product wrote from one the browser wrote and so
 * flattens both. `UserFacingError` marks the former; `userFacingMessage`
 * routes on it; `serverErrorText` keeps the API's own sentence when it sent
 * one and never shows a body that is not JSON.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  UserFacingError,
  userFacingMessage,
  serverErrorText,
  GENERIC_ERROR_MESSAGE,
} from '../../../lib/friendly-error';

// ── the helpers ──────────────────────────────────────────────────────────────

describe('RES-09 — serverErrorText', () => {
  it("uses the API's own sentence when it sent a usable one", () => {
    expect(
      serverErrorText('{"error":"This offer was already taken."}', 'fallback copy'),
    ).toBe('This offer was already taken.');
  });

  it('ignores a developer name for the status', () => {
    expect(serverErrorText('{"error":"Internal Server Error"}', 'fallback copy')).toBe(
      'fallback copy',
    );
  });

  it('never renders a body that is not JSON', () => {
    // A gateway, a proxy or a CDN answers HTML. Slicing 140 characters off that
    // and showing it is what the pandit portal used to do.
    expect(serverErrorText('<html><head><title>502 Bad Gateway</title>', 'fallback copy')).toBe(
      'fallback copy',
    );
    expect(serverErrorText('', 'fallback copy')).toBe('fallback copy');
    expect(serverErrorText('   ', 'fallback copy')).toBe('fallback copy');
  });
});

describe('RES-09 — userFacingMessage', () => {
  it('passes a deliberate UserFacingError through untouched', () => {
    expect(userFacingMessage(new UserFacingError('This offer was already taken.'), 'fb')).toBe(
      'This offer was already taken.',
    );
  });

  it('classifies the platform strings that a status sweep never sees', () => {
    // Chrome, Safari and Firefox each word this differently, and all three used
    // to reach the screen verbatim.
    for (const raw of [
      'Failed to fetch', // Chrome / Edge
      'Load failed', // Safari (macOS + iOS)
      'The Internet connection appears to be offline.', // Safari / iOS
      'NetworkError when attempting to fetch resource.', // Firefox
    ]) {
      expect(userFacingMessage(new Error(raw), 'page copy')).toBe(
        'Could not reach the server. Please check your connection and try again.',
      );
    }
    expect(userFacingMessage(new Error('API 500: {"error":"Internal Server Error"}'), 'page copy')).toBe(
      'Something went wrong on our side. Please try again in a moment.',
    );
    expect(userFacingMessage(new Error('HTTP 401 Unauthorized'), 'page copy')).toBe(
      'Your session has expired. Please sign in again to continue.',
    );
  });

  it("prefers the page's own copy over the generic bucket", () => {
    // "Could not load your payouts" beats "We could not load this right now"
    // when nothing more specific is known — but only then.
    expect(userFacingMessage(new Error('Unexpected token \'<\''), 'Could not load your payouts.')).toBe(
      'Could not load your payouts.',
    );
    expect(userFacingMessage(new Error("Unexpected token '<'"))).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('survives an error that is not an Error', () => {
    expect(userFacingMessage(undefined, 'page copy')).toBe('page copy');
    expect(userFacingMessage({ nope: true }, 'page copy')).toBe('page copy');
  });

  it('keeps instanceof working — the whole routing rule depends on it', () => {
    const e = new UserFacingError('deliberate');
    expect(e).toBeInstanceOf(UserFacingError);
    expect(e).toBeInstanceOf(Error);
  });
});

// ── the sweep ────────────────────────────────────────────────────────────────

/**
 * Remove comments so the scan below reads CODE only.
 *
 * This matters more than usual here: the fix's own comments quote the exact
 * strings the scan forbids — `API ${res.status}` and `(HTTP ${res.status})` are
 * written out verbatim in app/priest/bookings/view/page.tsx and
 * app/priest/offers/page.tsx to record what a pandit used to be shown. A
 * stripper that missed them would flag the correction as the violation.
 *
 * String and template-literal state is tracked, so a `//` inside a URL and a
 * `/* ` inside a regex or a message do not start a comment.
 */
export function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  let escaped = false;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

describe('RES-09 — the comment stripper the sweep depends on', () => {
  it('removes the comment forms this codebase uses', () => {
    expect(stripComments('const a = 1; // note\nconst b = 2;')).toBe('const a = 1; \nconst b = 2;');
    expect(stripComments('/* block */const a = 1;')).toBe('const a = 1;');
    expect(stripComments('<div>{/* jsx note */}</div>')).toBe('<div>{}</div>');
  });

  it('removes a comment that QUOTES a forbidden pattern', () => {
    // The exact hazard: eight guards in this engagement flagged the correction
    // instead of the defect because they scanned the comment describing it.
    const src = '// this used to render `API ${res.status}`\nconst ok = 1;';
    expect(stripComments(src)).not.toContain('res.status');
  });

  it('does NOT eat a // inside a string or a template literal', () => {
    expect(stripComments('const u = "https://darshya.online";')).toContain('https://darshya.online');
    expect(stripComments('const u = `${base}//x`;')).toContain('//x');
    expect(stripComments("const s = 'a /* b */ c';")).toContain('/* b */');
  });

  it('does not choke on an escaped quote', () => {
    expect(stripComments('const s = "he said \\"hi\\""; // note')).toBe(
      'const s = "he said \\"hi\\""; ',
    );
  });
});

const WEB_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Every provider- and devotee-facing screen in this lane. Not /admin. */
const SWEPT = [
  'app/priest/page.tsx',
  'app/priest/bookings/page.tsx',
  'app/priest/bookings/view/page.tsx',
  'app/priest/payouts/page.tsx',
  'app/priest/offers/page.tsx',
  'app/priest/profile/page.tsx',
  'app/priest/reviews/page.tsx',
  'app/priest/services/page.tsx',
  'app/payouts/page.tsx',
  'app/weddings/inquiry/page.tsx',
];

describe('RES-09 — no raw developer text reaches a provider or a devotee', () => {
  it('scans files that actually exist', () => {
    for (const rel of SWEPT) {
      expect(() => readFileSync(path.join(WEB_ROOT, rel), 'utf8')).not.toThrow();
    }
  });

  it('renders no raw Error.message', () => {
    const offenders: string[] = [];
    for (const rel of SWEPT) {
      const code = stripComments(readFileSync(path.join(WEB_ROOT, rel), 'utf8'));
      // `err instanceof Error ? err.message : '…'` — the whole pattern.
      if (/\b(\w+)\s+instanceof\s+Error\s*\?\s*\1\s*\.\s*message/.test(code)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('interpolates no HTTP status into user-facing copy', () => {
    const offenders: string[] = [];
    for (const rel of SWEPT) {
      const code = stripComments(readFileSync(path.join(WEB_ROOT, rel), 'utf8'));
      if (/\$\{\s*res\s*\.\s*status\s*\}/.test(code)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
