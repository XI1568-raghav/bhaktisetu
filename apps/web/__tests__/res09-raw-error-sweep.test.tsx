/**
 * RES-09 (final sweep) — no page or component under apps/web may render a raw
 * caught error.
 *
 * The finding was "the friendly-error helper exists but is wired into only 2
 * surfaces". Four passes wired it into the portals, the bookings pages, the
 * upgrade page and the account pages, one directory at a time, each with its own
 * hand-kept list of files. A hand-kept list is the reason the pattern kept
 * coming back: a new page is not on it. This guard walks EVERY source file under
 * app/ and components/, so a page added tomorrow is covered the day it lands.
 *
 * What counts as a raw caught error (after comments are stripped, so a note that
 * quotes the old pattern is not the violation):
 *
 *   1. `X instanceof Error ? X.message : …`        — the platform's own words:
 *      "Failed to fetch", "Load failed", "Unexpected token '<'…", or a thrown
 *      `HTTP 502 Bad Gateway`.
 *   2. `err.message` / `e?.message` / `result.reason.message` on a caught value.
 *   3. `String(err)` / `JSON.stringify(err)` — the same text, stringified.
 *   4. `.statusText` — an HTTP reason phrase is developer text by construction.
 *   5. A `setXxxError(\`…${res.status}…\`)` sink that interpolates a status code.
 *
 * Route the caught value through `userFacingMessage(err, fallback)` /
 * `classifyUserFacing` (lib/friendly-error) or `loadErrorMessage` (lib/api-config).
 * A sentence the product wrote on purpose is thrown as a `UserFacingError`.
 *
 * Out of scope here: app/pujas/book/** (another lane), app/api/** (route
 * handlers answer machines, not users), tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');

/**
 * Comment stripper that tracks string / template state, so `https://x` and a
 * message containing `/*` are left alone. Same approach as the priest-lane
 * stripper, kept local because importing a test file would re-run its suite.
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

/** The identifiers a caught / rejected value is bound to in this codebase. */
const CAUGHT = String.raw`(?:err|e|error|ex|exception|caught|cause|[\w.\[\]]*\.reason)`;

export function rawErrorLeaks(src: string): string[] {
  const code = stripComments(src);
  const hits: string[] = [];
  const rules: Array<[string, RegExp]> = [
    ['instanceof-Error-message', /\b([A-Za-z_][\w.]*)\s+instanceof\s+Error\s*\?\s*\1\s*\.\s*message/g],
    ['caught.message', new RegExp(String.raw`\b${CAUGHT}\s*\??\.\s*message\b`, 'g')],
    ['as-Error.message', new RegExp(String.raw`\(\s*${CAUGHT}\s+as\s+Error\s*\)\s*\??\.\s*message`, 'g')],
    ['String(caught)', new RegExp(String.raw`\bString\(\s*${CAUGHT}\s*\)`, 'g')],
    ['JSON.stringify(caught)', new RegExp(String.raw`JSON\.stringify\(\s*${CAUGHT}\s*[,)]`, 'g')],
    ['statusText', /\.statusText\b/g],
    ['status-in-error-sink', /\bset\w*(?:Error|Err|Message|Toast)\s*\(\s*`[^`]*\$\{[^}]*\bstatus\b[^}]*\}/g],
  ];
  for (const [name, re] of rules) {
    for (const m of code.matchAll(re)) hits.push(`${name}: ${m[0].replace(/\s+/g, ' ').slice(0, 80)}`);
  }
  return hits;
}

const SKIP_DIRS = new Set(['__tests__', 'node_modules', '.next']);
// Another lane owns the booking wizard; route handlers talk to machines.
const SKIP_PREFIXES = ['app/pujas/book/', 'app/api/'];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(full) && !/\.(test|spec)\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

const FILES = [
  ...sourceFiles(path.join(WEB, 'app')),
  ...sourceFiles(path.join(WEB, 'components')),
].filter((f) => !SKIP_PREFIXES.some((p) => path.relative(WEB, f).startsWith(p)));

describe('RES-09 — the detector itself', () => {
  it('flags every raw shape', () => {
    const bad = [
      "setError(err instanceof Error ? err.message : 'x')",
      'setError(e.message)',
      'setError(result.reason?.message ?? "err")',
      'alert((err as Error).message)',
      'setError(String(e))',
      'setX(JSON.stringify(err))',
      'throw new Error(`${res.status} ${res.statusText}`)',
      'setError(`Failed (${res.status})`)',
    ];
    for (const s of bad) expect(rawErrorLeaks(s), s).not.toEqual([]);
  });

  it('does not flag the corrected forms, a quoted comment, or domain text', () => {
    const good = [
      "setError(userFacingMessage(err, 'Could not load'))",
      '// was: err instanceof Error ? err.message : x\nconst a = 1;',
      '/* e.message */ const b = 2;',
      'if (order.status === "PAID") setError(data.message)',
      'throw new Error(`HTTP ${res.status}`)',
    ];
    for (const s of good) expect(rawErrorLeaks(s), s).toEqual([]);
  });
});

describe('RES-09 — no page or component renders a raw caught error', () => {
  it('walks a real corpus (the guard cannot pass by scanning nothing)', () => {
    expect(FILES.length).toBeGreaterThan(150);
  });

  it('has zero raw-error leaks under app/ and components/', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const hit of rawErrorLeaks(readFileSync(file, 'utf8'))) {
        offenders.push(`${path.relative(WEB, file)} -> ${hit}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
