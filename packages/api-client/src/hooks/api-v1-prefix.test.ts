import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Why this test exists ────────────────────────────────────────────────────
//
// batch9-review (2026-08-11): every one of the 25 request paths in
// hooks/wave-1-4.ts was root-relative WITHOUT the `/api/v1` prefix
// (`/donations/create-order`, `/store/orders`, …) while every other hooks file
// in this package had it. The API mounts all of those routes under `/api/v1`
// (apps/api/src/server.ts), and the mobile app configures the client with the
// BARE ORIGIN as baseUrl (`https://api.darshya.online` — apps/mobile/lib/api.ts
// `apiBase()`, wired at apps/mobile/app/_layout.tsx). client.ts resolves with
// `new URL(path, baseUrl)`, and a root-relative path REPLACES the base's whole
// pathname — so nothing ever supplied the prefix and all 25 requests 404'd.
// Nine mobile screens were dead, including a money path: a devotee tapping
// "Donate ₹1,100" never received a Razorpay order and the donation silently
// failed.
//
// The assertion below is deliberately made against the RESOLVED URL rather
// than against the source string, because the source string alone does not
// state the bug. The bug is a resolution rule. Resolving each literal against
// a bare origin is the same arithmetic the mobile app does at runtime, so this
// test fails both ways the invariant can break:
//
//   1. a new hook is added with an unprefixed path, and
//   2. someone "fixes" a 404 by moving the prefix into the baseUrl instead —
//      which would silently double-prefix every already-correct file.
//
// ─────────────────────────────────────────────────────────────────────────────

const HOOKS_DIR = path.dirname(fileURLToPath(import.meta.url));

/** The mobile baseUrl shape: origin only, no path. */
const BARE_ORIGIN = 'https://api.darshya.online';

interface Literal {
  file: string;
  line: number;
  /** Leading STATIC text of the literal — for templates, up to the first `${`. */
  text: string;
}

/**
 * Collect the static leading text of every string / template literal that is
 * real code in `src`, skipping anything inside a comment.
 *
 * A regex-and-strip approach is not good enough here: the first attempt at
 * this test stripped block comments before line comments, and a `//` comment
 * in wave-1-4.ts that legitimately mentioned a glob swallowed 8 KB of real
 * code — the test then scanned 7 literals instead of 25 and passed while
 * blind. So this walks the source once with explicit states. `${` inside a
 * template returns to code mode via a stack, so a nested template (the query
 * string in `useAdminCommissions`) is scanned as its own literal rather than
 * being mistaken for the outer template's terminator.
 */
function scanLiterals(src: string, file: string): Literal[] {
  const out: Literal[] = [];
  type State = 'code' | 'line' | 'block' | 'single' | 'double' | 'template';
  let state: State = 'code';
  let line = 1;
  // Brace depth inside a `${ }` interpolation; non-empty means we can return
  // to template mode when it unwinds past zero.
  const templateStack: number[] = [];
  let braceDepth = 0;
  let start = 0;
  let startLine = 1;
  // Only the FIRST segment of a literal decides its prefix. After a `${…}` the
  // rest of the template is a continuation (`/status` in
  // `/api/v1/store/orders/${id}/status`) and must not be scanned as a path of
  // its own, or every interpolated route reports a false offender.
  let capturing = false;

  const push = (end: number) => {
    if (!capturing) return;
    capturing = false;
    out.push({ file, line: startLine, text: src.slice(start, end) });
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '\n') line++;

    switch (state) {
      case 'code':
        if (c === '/' && next === '/') {
          state = 'line';
          i++;
        } else if (c === '/' && next === '*') {
          state = 'block';
          i++;
        } else if (c === "'" || c === '"' || c === '`') {
          state = c === "'" ? 'single' : c === '"' ? 'double' : 'template';
          start = i + 1;
          startLine = line;
          capturing = true;
        } else if (c === '{') {
          braceDepth++;
        } else if (c === '}') {
          if (braceDepth === 0 && templateStack.length > 0) {
            templateStack.pop();
            state = 'template';
            // Continuation of the outer template: `capturing` stays false so
            // the trailing `/status`-style segment is skipped.
          } else {
            braceDepth--;
          }
        }
        break;

      case 'line':
        if (c === '\n') state = 'code';
        break;

      case 'block':
        if (c === '*' && next === '/') {
          state = 'code';
          i++;
        }
        break;

      case 'single':
      case 'double': {
        const quote = state === 'single' ? "'" : '"';
        if (c === '\\') i++;
        else if (c === quote) {
          push(i);
          state = 'code';
        }
        break;
      }

      case 'template':
        if (c === '\\') i++;
        else if (c === '$' && next === '{') {
          push(i);
          templateStack.push(braceDepth);
          braceDepth = 0;
          state = 'code';
          i++;
        } else if (c === '`') {
          push(i);
          state = 'code';
        }
        break;
    }
  }
  return out;
}

function hooksFiles(): string[] {
  return fs
    .readdirSync(HOOKS_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .sort();
}

/** Every literal in the hooks dir that looks like an API path. */
function requestPaths(): Literal[] {
  const found: Literal[] = [];
  for (const file of hooksFiles()) {
    const src = fs.readFileSync(path.join(HOOKS_DIR, file), 'utf8');
    for (const lit of scanLiterals(src, file)) {
      if (/^\/[A-Za-z]/.test(lit.text)) found.push(lit);
    }
  }
  return found;
}

describe('api-client hooks: /api/v1 prefix invariant', () => {
  it('resolves every request path under /api/v1 against a bare-origin baseUrl', () => {
    const offenders = requestPaths()
      .filter((lit) => !new URL(lit.text, BARE_ORIGIN).pathname.startsWith('/api/v1/'))
      .map((lit) => `${lit.file}:${lit.line} → ${lit.text}`);

    expect(offenders).toEqual([]);
  });

  it('scans the real files, so a broken scanner cannot pass vacuously', () => {
    // Guard against the failure mode this test itself already had once: a
    // scanner that silently matches nothing reports zero offenders and looks
    // green. These floors sit under the real counts (81 paths across 8 files
    // at the time of writing) and only ever need raising, never lowering.
    const paths = requestPaths();
    expect(paths.length).toBeGreaterThanOrEqual(60);
    expect(new Set(paths.map((p) => p.file)).size).toBeGreaterThanOrEqual(7);

    // wave-1-4.ts is the file the regression was in; assert it specifically
    // rather than trusting the aggregate to notice it going quiet.
    //
    // The floor was 25, matching the 25 paths that file carried when the
    // prefix regression was fixed. It is 22 now because three paths were
    // DELETED, not because the scanner went quiet:
    // /astrology/consultations, /astrology/consultations/:id and
    // /astrology/consultations/:id/start-call answered from an in-memory Map
    // that empties on every restart, and the hooks wrapping them are gone —
    // see the block in wave-1-4.ts. This floor still only moves down when
    // something is deliberately removed, and the offender assertion above is
    // what actually enforces the prefix.
    const wavePaths = paths.filter((p) => p.file === 'wave-1-4.ts');
    expect(wavePaths.length).toBeGreaterThanOrEqual(22);
  });

  it('keeps the donation money path reachable', () => {
    // The P0 symptom, pinned by name: with this path unprefixed the devotee
    // donation flow (apps/mobile/app/(devotee)/donations.tsx) 404s on order
    // creation and the donation fails with no Razorpay order ever created.
    const donation = requestPaths().find((p) => p.text.includes('donations/create-order'));
    expect(donation).toBeDefined();
    expect(new URL(donation!.text, BARE_ORIGIN).toString()).toBe(
      'https://api.darshya.online/api/v1/donations/create-order',
    );
  });
});
