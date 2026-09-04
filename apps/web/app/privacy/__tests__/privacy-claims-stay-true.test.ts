import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * TC-10, second half — keep the REPLACEMENT claim true.
 *
 * apps/web/__tests__/tc10-privacy-security-claims.test.ts bans the sentence
 * that was false ("row-level security"). That is only half the job: the
 * sentence that replaced it is itself a factual claim about how this codebase
 * reaches the database, and nothing stopped it from rotting the first time a
 * component reached past the API.
 *
 * The Privacy Policy now says, in section 5 and in the Supabase sub-processor
 * entry, that the database is never reachable from the browser and that every
 * read and write goes through the authenticated API. That is true today —
 * verified, not assumed: the only browser Supabase data call anywhere in
 * apps/web is `supabase.storage.from(bucket)` in
 * components/provider/VideoProofUpload.tsx, which is Supabase Storage rather
 * than a Postgres table, and apps/mobile contains no Supabase client at all.
 *
 * One `getSupabaseBrowserClient().from('users')` would make the policy false
 * again — and RLS is not defined on any Prisma-managed table, so such a query
 * would also be genuinely unguarded rather than merely off-message. This test
 * fails on the line that introduces it.
 *
 * COMMENT HANDLING. The scan strips comments before matching. A source-text
 * guard that forgets to is the single most repeated defect class in this
 * engagement — it trips on the comment documenting the ban. The stripper is
 * exercised by its own tests below, including the exact trap: a file whose
 * ONLY occurrence of the banned call is inside a comment must pass.
 *
 * KNOWN LIMIT, stated rather than hidden: the scan only opens files whose
 * stripped source mentions "supabase", so a table query issued through a
 * re-exported client in a file that never names Supabase would slip past. It
 * catches the realistic regression — someone importing the client and calling
 * `.from()` — not an adversary. A test asserting `relrowsecurity` on the
 * database itself is the only complete answer, and that needs a live DIRECT_URL
 * (see the remediation note in ../page.tsx).
 */

const WEB_ROOT = path.resolve(__dirname, '..', '..', '..');

const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', 'coverage', '__tests__', 'e2e']);
const SOURCE_EXT = new Set(['.ts', '.tsx']);

/**
 * Receivers whose `.from(` is not a PostgREST table query.
 * `storage` is the deliberate exemption: Supabase Storage is a separate
 * subsystem with its own bucket policies and is not one of "these tables".
 */
const NON_POSTGREST_RECEIVERS = new Set([
  'storage',
  'Array',
  'Buffer',
  'Object',
  'String',
  'Number',
  'BigInt',
  'Date',
  'Set',
  'Map',
  'Promise',
  'Uint8Array',
  'Int8Array',
  'Float64Array',
]);

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/[^\n]*/g;

/**
 * Strips block comments (which covers JSX `{/* ... *\/}` expressions, since the
 * braces are inert once the comment body is gone) and line comments. The
 * `[^:]` guard keeps `https://` inside string literals intact.
 */
export function stripComments(src: string): string {
  return src.replace(BLOCK_COMMENT, ' ').replace(LINE_COMMENT, '$1');
}

/** Every `<receiver>.from(` in the source, with comments already removed. */
export function postgrestTableQueries(src: string): string[] {
  const body = stripComments(src);
  const hits: string[] = [];
  const re = /([A-Za-z_$][\w$]*)\s*\.\s*from\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const receiver = m[1]!;
    if (NON_POSTGREST_RECEIVERS.has(receiver)) continue;
    hits.push(m[0]);
  }
  return hits;
}

function collectSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSources(full, out);
    } else if (SOURCE_EXT.has(path.extname(entry)) && !entry.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

describe('TC-10 guard — the comment stripper actually strips', () => {
  it('does not flag a banned call that appears only in a block comment', () => {
    const src = '/* we must never write supabase.from("users") here */ const a = 1;';
    expect(postgrestTableQueries(src)).toEqual([]);
  });

  it('does not flag a banned call that appears only in a JSX comment', () => {
    const src = '<p>{' + '/* banned: supabase.from("bookings") */' + '}Copy.</p>';
    expect(postgrestTableQueries(src)).toEqual([]);
  });

  it('does not flag a banned call that appears only in a line comment', () => {
    const src = '// TC-10: never supabase.from("users")\nconst b = 2;';
    expect(postgrestTableQueries(src)).toEqual([]);
  });

  it('DOES flag a real call — the stripper must not blind the scan', () => {
    const src = 'const { data } = await supabase.from("users").select("*");';
    expect(postgrestTableQueries(src)).toHaveLength(1);
  });

  it('flags a call reached through the client factory', () => {
    const src = 'const c = getSupabaseBrowserClient();\nawait c.from("bookings").select();';
    expect(postgrestTableQueries(src)).toHaveLength(1);
  });

  it('exempts Supabase Storage and the JS built-ins', () => {
    expect(postgrestTableQueries('supabase.storage.from(bucket).upload(p, f)')).toEqual([]);
    expect(postgrestTableQueries('Array.from({ length: 3 })')).toEqual([]);
    expect(postgrestTableQueries('Buffer.from(raw, "utf8")')).toEqual([]);
  });
});

describe('TC-10 — "the database is never reachable from your browser" stays true', () => {
  const files = collectSources(WEB_ROOT).filter((f) =>
    /supabase/i.test(stripComments(readFileSync(f, 'utf8'))),
  );

  it('finds the Supabase-touching files it is supposed to scan', () => {
    // A scan that silently matches nothing proves nothing. If this drops to
    // zero, the collector broke — fix the collector, do not relax the ban.
    expect(files.length).toBeGreaterThan(0);
  });

  it('no file in apps/web issues a PostgREST table query', () => {
    const offenders = files
      .map((f) => ({ file: path.relative(WEB_ROOT, f).split(path.sep).join('/'), hits: postgrestTableQueries(readFileSync(f, 'utf8')) }))
      .filter((r) => r.hits.length > 0);

    expect(
      offenders,
      'apps/web must not query Supabase tables directly — /privacy states every read and write ' +
        'passes through the authenticated API, and no Prisma-managed table has an RLS policy to ' +
        'fall back on. Offenders: ' + JSON.stringify(offenders),
    ).toEqual([]);
  });
});
