import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RES-01 — the last of the call sites this finding names by file:line.
 *
 * The sweep instrumented five surfaces with a route interception that accepts
 * every /api/v1/* request and never answers, and watched all five sit on their
 * spinner at T+10s AND at T+30s: /priest, /profile, /messages, /dashboard,
 * /payouts. Four of them were converted in the first pass. What survived was
 * the handful of calls inside those same files that are not the page's initial
 * load — the Cancel action on /bookings, its react-query list fetch, and the
 * rating submit inside the message thread — plus /bookings, which RES-09 names
 * for the same class of failure.
 *
 * `fetch` does not reject on a stalled socket. Every one of those sites has a
 * `finally` that clears its spinner and a `catch` that sets an error, and none
 * of them can run. This asserts, mechanically, that no bare `fetch(` is left in
 * the two files — a codemod-shaped guarantee, checked the same way.
 */

const WEB = join(__dirname, '..');

/** Strip comments so prose describing the old code cannot trip the guard. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const FILES = ['app/bookings/page.tsx', 'components/Inbox.tsx'];

describe('RES-01 — named call sites route through fetchWithTimeout', () => {
  for (const rel of FILES) {
    it(`${rel} has no bare fetch(`, () => {
      const src = code(readFileSync(join(WEB, rel), 'utf8'));
      // `fetchWithTimeout(` must not be counted as a bare `fetch(`.
      const bare = [...src.matchAll(/(?<![A-Za-z0-9_$.])fetch\s*\(/g)];
      expect(
        bare.length,
        `${rel} still issues ${bare.length} fetch(es) with no AbortSignal — a stalled ` +
          'socket leaves the spinner up forever',
      ).toBe(0);
    });

    it(`${rel} imports the shared helper rather than defining its own`, () => {
      const src = readFileSync(join(WEB, rel), 'utf8');
      expect(src).toMatch(/fetchWithTimeout/);
      // One helper, one budget. A second local timeout wrapper is how the auth
      // pair and the data pages ended up with different behaviour in the first
      // place.
      expect(src).not.toMatch(/function\s+fetchWithTimeout/);
      expect(src).toMatch(/from '\.\.?\/(\.\.\/)?lib\/api-config'/);
    });
  }
});
