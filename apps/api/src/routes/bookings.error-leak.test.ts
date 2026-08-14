import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// SEC-04 — two read routes echoed the raw `error.message` in a 500 body.
//
// The subtlety that made this survive: apps/api/src/server.ts installs a
// setErrorHandler which DOES sanitise 5xx bodies in production. But it only
// fires for errors that PROPAGATE out of a handler. Both of these sites caught
// their error and called `reply.status(500).send(...)` directly, so the global
// guard never ran and a raw Prisma/driver string reached an unauthenticated
// caller — the same class as the P2 that leaked the ORM name, model and query
// method from GET /priests/:id.
//
// This is a source-level assertion rather than a request test because the
// trigger is an infrastructure failure (a dead database) that a unit test
// cannot honestly induce. What is worth locking is narrow and mechanical: no
// handler in this file may put `error.message` in a response body.

const ROUTES = join(__dirname, 'bookings.ts');

/** Strip comments so a comment naming the banned pattern cannot trip the guard. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('SEC-04 — bookings routes never echo a raw error message', () => {
  const src = code(readFileSync(ROUTES, 'utf8'));

  it('no 5xx response body interpolates a raw error message', () => {
    // Scoped to 5xx ON PURPOSE. A 4xx that echoes error.message is CORRECT here
    // — those messages are thrown deliberately for the user ("No availability
    // for the selected slot", "This temple has not been verified yet") and the
    // wizard renders them. My first version of this assertion matched every
    // `error: x.message` and flagged six legitimate 4xx sites; a guard that
    // cries wolf gets deleted, so it is narrowed to the case that actually
    // leaks infrastructure detail.
    const offenders: string[] = [];
    for (const m of src.matchAll(/reply\s*\.status\(\s*5\d\d\s*\)\s*\.send\(\s*\{([\s\S]{0,200}?)\}\s*\)/g)) {
      if (/\.message\b/.test(m[1] ?? '')) offenders.push(m[0].replace(/\s+/g, ' ').slice(0, 120));
    }
    expect(offenders, `5xx bodies leaking a raw message: ${offenders.join(' | ')}`).toEqual([]);
  });

  it('still logs the real error server-side, so the detail is not lost', () => {
    // The fix must not have been "delete the error handling" — both sites
    // should still log before replying.
    expect(src).toMatch(/server\.log\.error\(error, 'Failed to fetch user bookings'\)/);
    expect(src).toMatch(/server\.log\.error\(error, 'Failed to check slot availability'\)/);
  });

  it('both handlers still answer 500 with a fixed, non-empty string', () => {
    expect(src).toMatch(/error:\s*'Failed to fetch bookings'/);
    expect(src).toMatch(/error:\s*'Failed to check availability'/);
  });
});
