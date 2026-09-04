import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * PAR-22 — the hand-off census in docs/mobile-v1-scope.md must be the real one.
 *
 * WHY THIS EXISTS
 * ---------------
 * §5.3 of the scope document opens with a count of `Linking.openURL` sites and
 * then classifies them into three groups, one of which is labelled "should
 * become in-app" — i.e. the open defect list PAR-22 is measured against. The
 * count was stated as **23**. The tree contained 19.
 *
 * Four of the missing four were not miscounts, they were the wrong KIND of
 * thing: `pujas.tsx`, `store.tsx`, `yatra-detail.tsx` and `booking-flow.ts`
 * each contain a COMMENT describing a bounce-out — and in all four cases the
 * comment exists precisely because PAR-15, PAR-16 or PAR-18 had already
 * REMOVED that bounce-out. The document was therefore listing four fixed
 * defects as open ones, on the authority of a text search that cannot tell a
 * call from a paragraph about a call.
 *
 * That is the same failure mode, in the same direction, as the JSDoc break
 * that took `tsc` down in lib/in-app-web.ts: reasoning about source text
 * without a parser. So this guard uses one.
 *
 * THE DISTINCTION A GREP FLATTENS
 * -------------------------------
 * Two shapes both look like `Linking.openURL` to a search:
 *
 *   · an INVOCATION      — `Linking.openURL(url)`
 *   · a VALUE REFERENCE  — `{ openExternal: Linking.openURL }`, where a helper
 *                          decides whether to call it at all
 *
 * astrology.tsx moved from the first shape to the second when it adopted
 * `openWebHandoff`, which routes in-app when a WebView exists and bounces out
 * when one does not. The document has to be able to say that, so the census
 * reports the split rather than a single number.
 *
 * WHAT FAILURE HERE MEANS
 * -----------------------
 * Not "the code is broken" — "the document no longer describes the code".
 * Update docs/mobile-v1-scope.md §5.3 to the numbers this test reports.
 */

const APP_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../..');
const DOC = path.join(REPO_ROOT, 'docs/mobile-v1-scope.md');

const doc = (): string => readFileSync(DOC, 'utf8');

interface OpenUrlCensus {
  /** `Linking.openURL(...)` — the function is actually called here. */
  invocations: number;
  /** `Linking.openURL` handed to something else, which decides whether to call. */
  references: number;
  /** Distinct non-test files carrying either shape. */
  files: number;
  /** Repo-relative paths (posix) of files containing a real invocation. */
  invokingFiles: string[];
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.expo', 'dist', 'build'].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function openUrlCensus(): OpenUrlCensus {
  let invocations = 0;
  let references = 0;
  const touched = new Set<string>();
  const invokingFiles: string[] = [];

  const roots = [path.join(APP_ROOT, 'app'), path.join(APP_ROOT, 'lib')];
  for (const file of roots.flatMap(sourceFiles)) {
    // The tests deliberately quote the pattern; counting them would make the
    // census grow every time it is written about.
    if (file.includes('__tests__')) continue;

    const src = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    let invokedHere = false;
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node) && node.getText(src) === 'Linking.openURL') {
        if (ts.isCallExpression(node.parent) && node.parent.expression === node) {
          invocations += 1;
          invokedHere = true;
        } else {
          references += 1;
        }
        touched.add(file);
      }
      ts.forEachChild(node, visit);
    };
    visit(src);

    if (invokedHere) {
      invokingFiles.push(path.relative(APP_ROOT, file).split(path.sep).join('/'));
    }
  }

  return { invocations, references, files: touched.size, invokingFiles };
}

/** Pull a figure the document states, failing loudly if it stopped stating it. */
function statedFigure(pattern: RegExp): number {
  const match = pattern.exec(doc());
  expect(
    match,
    `docs/mobile-v1-scope.md no longer states the figure matched by ${pattern}. ` +
      `If §5.3 was reworded, update this pattern; if the figure was dropped, put it back.`,
  ).not.toBeNull();
  return Number(match![1]);
}

describe('PAR-22 — Linking.openURL census matches the scope document', () => {
  const census = openUrlCensus();

  it('found the call sites at all — an empty census would pass everything below', () => {
    // A walker that returned [], or a parser that stopped matching the
    // property access, would make every comparison below trivially true.
    expect(census.invocations).toBeGreaterThan(5);
    expect(census.files).toBeGreaterThan(5);
  });

  it('counts a real invocation and a value reference as different things', () => {
    // Proves the discrimination the whole census rests on. If both shapes ever
    // collapsed into one bucket, the astrology.tsx row in §5.3 would silently
    // stop meaning what it says.
    const probe = ts.createSourceFile(
      'probe.ts',
      'Linking.openURL(a); const io = { openExternal: Linking.openURL };',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    let calls = 0;
    let refs = 0;
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node) && node.getText(probe) === 'Linking.openURL') {
        if (ts.isCallExpression(node.parent) && node.parent.expression === node) calls += 1;
        else refs += 1;
      }
      ts.forEachChild(node, visit);
    };
    visit(probe);
    expect({ calls, refs }).toEqual({ calls: 1, refs: 1 });
  });

  it('states the total number of occurrences the tree contains', () => {
    expect(statedFigure(/\*\*(\d+) `Linking\.openURL` occurrences\*\*/)).toBe(
      census.invocations + census.references,
    );
  });

  it('states the invocation / value-reference split correctly', () => {
    expect(statedFigure(/\*\*(\d+) real invocations\*\*/)).toBe(census.invocations);
    expect(statedFigure(/\*\*(\d+) places the function is passed as a value\*\*/)).toBe(
      census.references,
    );
  });

  it('states how many files carry one', () => {
    expect(statedFigure(/across (\d+)\s+files/)).toBe(census.files);
  });

  it('group (c) is empty for the reason the document claims', () => {
    // §5.3 (c) asserts these four no longer bounce out. If anyone re-adds a
    // catalogue hand-off, that sentence becomes false and this fails — rather
    // than the claim quietly rotting the way the 23 did.
    for (const file of [
      'app/(devotee)/pujas.tsx',
      'app/(devotee)/store.tsx',
      'app/(devotee)/yatra-detail.tsx',
      'lib/booking-flow.ts',
    ]) {
      expect(
        census.invokingFiles,
        `${file} calls Linking.openURL again — §5.3 group (c) says it does not`,
      ).not.toContain(file);
    }
  });

  it('astrology.tsx hands off by reference, not by calling directly', () => {
    // The specific claim §5.3 makes about the one entry whose mechanism
    // changed. It routes through openWebHandoff, so it must NOT appear among
    // the direct invokers.
    expect(census.invokingFiles).not.toContain('app/(devotee)/astrology.tsx');
  });
});
