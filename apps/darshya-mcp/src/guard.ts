// The single chokepoint for every raw-SQL tool. Returns true ONLY when the
// statement is provably read-only.
//
// Defense-in-depth: this is NOT the primary safety control. No darshya-mcp tool
// passes user-controlled SQL to the executor — the tools use Prisma typed
// queries (count/aggregate/findMany), and the only $queryRawUnsafe call
// (prod_health) runs a hardcoded literal with no interpolation. This guard is a
// backstop that catches the common write verbs, SELECT INTO, and COPY. It is
// not a full SQL parser; it errs on the side of rejecting (conservative), so it
// may refuse some safe reads that contain a write verb inside a string literal
// or a dollar-quoted body. The e2e test in tests/e2e-read-only.test.ts fires a
// real DELETE and asserts rejection.
const WRITE_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'TRUNCATE',
  'ALTER',
  'GRANT',
  'REVOKE',
  'CREATE',
  'MERGE',
  'CALL',
  // SELECT ... INTO creates a new table and copies rows (a write) but contains
  // none of the verbs above, so it needs its own entry. INTO only ever appears
  // in write contexts (INSERT INTO, SELECT INTO), so blocking it is safe.
  'INTO',
  // COPY ... FROM bulk-loads rows into a table (a write). Block outright.
  'COPY',
];

export function isReadOnlyQuery(sql: string): boolean {
  // 1. Collapse single-quoted string literals to a placeholder FIRST, so a
  //    '--' or '/*' that lives inside a string is not mistaken for a comment
  //    (which would let a real write after it slip through — see the regression
  //    tests). Handles the standard Postgres '' escape. Dollar-quoted strings
  //    ($$...$$) are NOT handled — a write verb inside $$...$$ will be
  //    (conservatively) matched, which is the safe direction.
  const noStrings = sql.replace(/'(?:''|[^'])*'/g, "'?'");
  // 2. Now strip line + block comments (anything remaining is real SQL syntax).
  const stripped = noStrings.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
  for (const kw of WRITE_KEYWORDS) {
    // Whole-word, case-insensitive match on the keyword.
    const re = new RegExp(`\\b${kw}\\b`, 'i');
    if (re.test(stripped)) return false;
  }
  return true;
}
