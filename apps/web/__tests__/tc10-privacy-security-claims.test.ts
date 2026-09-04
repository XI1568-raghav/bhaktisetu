import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * TC-10 (delta sweep 2026-08-20, P1 / false security representation).
 *
 * The Privacy Policy's "Data Security" section listed, as an implemented
 * safeguard, "Database hosted on Supabase with row-level security policies",
 * and the third-party-processors section repeated the claim for the tables
 * holding "account records, bookings, and content metadata".
 *
 * That is not what this repository does. Measured, at the commit that added
 * this test:
 *
 *   - apps/api/prisma/schema.prisma declares 67 models. Grepping
 *     apps/api/prisma/migrations (36 migrations), apps/api/src and supabase/
 *     for "ENABLE ROW LEVEL SECURITY" / "CREATE POLICY" / "rowsecurity"
 *     returns ZERO hits for any of them.
 *   - The only such policy anywhere in the repo covers two auxiliary tables
 *     defined outside the Prisma chain, antim_sanskar_pandits and
 *     wedding_vendors, in supabase/migrations. Neither table is read by any
 *     application code, and both files carry a "founder-action-required:
 *     confirm preferred migration tool" header, i.e. they are applied by
 *     hand, if at all.
 *   - The application data path bypasses the mechanism by construction
 *     anyway: apps/api/src/lib/supabase.ts states that the admin client uses
 *     the service role key and bypasses it, and Prisma connects as the
 *     Supabase "postgres" role (apps/api/prisma/DATABASE.md:40-41), which is
 *     the table owner and exempt unless FORCE ROW LEVEL SECURITY is set — it
 *     is not set anywhere in this repo.
 *
 * A privacy policy is a representation to users and to a regulator. Stating a
 * database-level control that does not exist is a different category of wrong
 * from marketing overstatement, so the policy must describe the control that
 * IS implemented: authorisation in the application layer.
 *
 * The scan strips comments before matching. A guard that reads source text and
 * forgets to do that ends up tripping on the very comment that documents the
 * ban — that failure mode is proven closed by the stripComments self-tests
 * below, which run before any real assertion.
 */

const WEB_ROOT = path.resolve(__dirname, '..');
const PRIVACY = path.join(WEB_ROOT, 'app', 'privacy', 'page.tsx');
const PRIVACY_V2 = path.join(WEB_ROOT, 'app', 'privacy', 'v2', 'page.tsx');

const JSX_COMMENT = /\{\s*\/\*[\s\S]*?\*\/\s*\}/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/[^\n]*/g;

/**
 * Removes line comments, block comments and JSX comment expressions.
 * String literals and JSX children are left alone — the policy text lives
 * there and must stay visible to the scan.
 */
export function stripComments(src: string): string {
  return src
    .replace(JSX_COMMENT, ' ')
    .replace(BLOCK_COMMENT, ' ')
    .replace(LINE_COMMENT, '$1');
}

const BANNED_SECURITY_CLAIMS: Array<{ label: string; re: RegExp }> = [
  { label: 'database row-level security', re: /row[-\s]?level\s+security/i },
  { label: 'the RLS acronym', re: /\bRLS\b/ },
];

describe('TC-10 guard — the comment stripper actually strips', () => {
  const banned = /row-level security/i;

  it('removes a JSX comment expression containing the banned phrase', () => {
    const src = '<p>{' + '/* we removed the row-level security claim here */' + '}Safe copy.</p>';
    expect(stripComments(src)).not.toMatch(banned);
    expect(stripComments(src)).toContain('Safe copy.');
  });

  it('removes a line comment containing the banned phrase', () => {
    const src = '// TC-10: row-level security is not implemented\nconst x = 1;';
    expect(stripComments(src)).not.toMatch(banned);
    expect(stripComments(src)).toContain('const x = 1;');
  });

  it('removes a block comment containing the banned phrase', () => {
    const src = '/* history: this used to say row-level security */ const y = 2;';
    expect(stripComments(src)).not.toMatch(banned);
    expect(stripComments(src)).toContain('const y = 2;');
  });

  it('does NOT strip the visible policy text it exists to police', () => {
    const src = '<li>Database hosted on Supabase with row-level security policies.</li>';
    expect(stripComments(src)).toMatch(banned);
  });
});

describe('TC-10 — the Privacy Policy claims no database control the code does not implement', () => {
  for (const file of [PRIVACY, PRIVACY_V2]) {
    const rel = path.relative(WEB_ROOT, file).split(path.sep).join('/');

    for (const { label, re } of BANNED_SECURITY_CLAIMS) {
      it(rel + ' does not advertise ' + label, () => {
        const body = stripComments(readFileSync(file, 'utf8'));
        expect(body).not.toMatch(re);
      });
    }
  }

  it('the Data Security section still names a real, implemented control', () => {
    const body = stripComments(readFileSync(PRIVACY, 'utf8'));
    // What IS true: every read and write passes through the Fastify API, which
    // runs authenticateUser / requireAnyRole plus per-handler ownership checks.
    // The browser's Supabase client is used only for auth and file storage
    // (apps/web/lib/supabase.ts); it never queries application tables.
    expect(body).toMatch(/authenticated API/i);
  });

  it('does not assert a data-residency region nothing in the repo can confirm', () => {
    // The two policies contradicted each other: /privacy said "EU-region
    // Postgres" while /privacy/v2 said "Mumbai, India (Supabase ap-south-1)".
    // At most one could be true and neither is pinned anywhere in the repo,
    // so the canonical policy no longer asserts one.
    const body = stripComments(readFileSync(PRIVACY, 'utf8'));
    expect(body).not.toMatch(/EU[-\s]region/i);
  });
});
