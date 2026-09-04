import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * PAR-22 — every TypeScript source in the mobile app must actually PARSE.
 *
 * WHAT THIS CAUGHT
 * ----------------
 * lib/in-app-web.ts documented react-native-webview's `originWhitelist`
 * internals by pasting the library's two regex literals into a JSDoc block.
 * Both of them end in a star followed by a slash — which is the block-comment
 * terminator. The comment therefore ENDED in the middle of the paragraph, and
 * every following line of prose was handed to the parser as code.
 *
 * Consequences, all of which were live at HEAD and none of which were noticed:
 *   · `npx tsc --noEmit` in apps/mobile emitted 18+ TS1005/TS1109/TS1434
 *     errors, so the package did not type-check at all;
 *   · lib/__tests__/in-app-web.par22.test.ts and
 *     lib/__tests__/webview-origin-guard.par22.test.ts could not be collected —
 *     vitest reported them as 2 FAILED FILES rather than failed assertions, so
 *     the 57 assertions inside them silently stopped running;
 *   · the commit that shipped it was titled "both suites fully green".
 *
 * WHY IT IS A PARSE AND NOT A TEXT SCAN
 * -------------------------------------
 * The obvious guard — grep the source for a stray terminator — is the exact
 * shape of guard this audit keeps getting wrong, because to know what is a
 * comment it must first strip comments, which is the question it was asked. A
 * scan also cannot tell a real terminator from the characters `*` and `/`
 * sitting inside a string, a template literal or a regex.
 *
 * TypeScript's own parser answers directly and cannot be fooled by any of
 * that. It is also the exact parser `pnpm --filter @poojly/mobile type-check`
 * runs, so green here means that gate can no longer be broken this way.
 *
 * Type ERRORS are out of scope: `createSourceFile` parses without a program,
 * so `parseDiagnostics` holds syntax only. That is deliberate — this pins the
 * weaker property that nonetheless failed, and stays fast enough to run on
 * every file on every suite run.
 */

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MOBILE_ROOT = join(HERE, '..', '..');
const SCANNED = ['lib', 'app'];
const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist', 'build', '.turbo']);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (extname(full) === '.ts' || extname(full) === '.tsx') out.push(full);
  }
  return out;
}

/** Syntax diagnostics for one file, formatted `path:line — message`. */
function syntaxErrors(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    extname(file) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  // `parseDiagnostics` is where createSourceFile records syntax errors; a
  // SourceFile carries no other diagnostics without a Program behind it.
  const diagnostics =
    (source as unknown as { parseDiagnostics?: ts.DiagnosticWithLocation[] }).parseDiagnostics ??
    [];
  return diagnostics.map((d) => {
    const { line } = source.getLineAndCharacterOfPosition(d.start);
    return `${relative(MOBILE_ROOT, file)}:${line + 1} — ${ts.flattenDiagnosticMessageText(
      d.messageText,
      ' ',
    )}`;
  });
}

const files = SCANNED.flatMap((d) => sourceFiles(join(MOBILE_ROOT, d)));

describe('PAR-22 — mobile TypeScript sources parse', () => {
  it('finds the sources it is meant to be guarding', () => {
    // A walker that silently returned [] would make every assertion below pass
    // while checking nothing. 100 is far under the real count and far above
    // anything an accidental empty or single-directory walk could produce.
    expect(files.length).toBeGreaterThan(100);
  });

  it('reports a syntax error when one is really there (the guard itself works)', () => {
    // Proves parseDiagnostics is actually being read. If a TypeScript upgrade
    // ever renamed or emptied that field, every other assertion here would go
    // green on an empty array and guard nothing at all.
    const source = ts.createSourceFile(
      'broken.ts',
      'const a = ;',
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS,
    );
    const diagnostics =
      (source as unknown as { parseDiagnostics?: ts.DiagnosticWithLocation[] }).parseDiagnostics ??
      [];
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it('parses every .ts/.tsx under lib/ and app/ with no syntax errors', () => {
    const broken = files.flatMap(syntaxErrors);
    expect(broken).toEqual([]);
  });

  it('parses lib/in-app-web.ts — the file the regex-in-JSDoc break landed in', () => {
    expect(syntaxErrors(join(MOBILE_ROOT, 'lib', 'in-app-web.ts'))).toEqual([]);
  });
});
