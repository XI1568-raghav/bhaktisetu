import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * SCAL-04 collateral — every field name /admin/waitlist/stats sends to Prisma
 * must be a REAL column of `model Waitlist`.
 *
 * WHY THIS EXISTS. The 2026-08-14 SCAL-04 fix replaced a whole-table waitlist
 * scan with two `groupBy` reads. The funnel group was right. The leaderboard
 * group asked Postgres for `referredByEmail`, and `model Waitlist` has no such
 * field — the column is `referredByCode` (`routes/waitlist.ts` writes it as the
 * referrer's `referralCode`). Prisma answers an unknown `by` entry with a
 * validation error, the error rejected the enclosing `Promise.all`, and the
 * handler's `catch` returned the all-zero object. Total, confirmed, invited,
 * converted, the 30-day series AND the leaderboard were all zero — the whole
 * endpoint, not just the part with the typo.
 *
 * It was invisible three ways at once, which is why a text guard is worth its
 * weight here:
 *   1. `waitlistModel()` is hand-typed as `(args: unknown) => Promise<any[]>`
 *      so the field name never reaches the generated Prisma types and `tsc`
 *      cannot see it.
 *   2. The route's own test mocked `groupBy` and branched on
 *      `by.includes('referredByEmail')`, so it asserted the code's fiction back
 *      to itself and went green.
 *   3. The handler answers zeros on ANY error, so a dead endpoint and a genuinely
 *      empty waitlist are indistinguishable from the outside.
 *
 * A mock cannot catch this class and neither can the compiler. The schema can:
 * read the field list out of prisma/schema.prisma and check the call sites
 * against it. No database required, which matters — this landed while both prod
 * and the local stack were down.
 *
 * COMMENTS ARE STRIPPED FIRST. The prose above and in the route legitimately
 * names `referredByEmail` while describing the bug; a guard that scans source
 * text and reads its own documentation as a call site is the single most
 * repeated defect in this sweep.
 */

const API_ROOT = join(import.meta.dirname, '..', '..');
const SCHEMA = join(API_ROOT, 'prisma', 'schema.prisma');
const ROUTE = join(import.meta.dirname, 'admin-leads.ts');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Scalar field names declared on a Prisma model. */
function modelFields(schema: string, model: string): Set<string> {
  const m = new RegExp(`^model\\s+${model}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(schema);
  if (!m) throw new Error(`model ${model} not found in schema.prisma`);
  const fields = new Set<string>();
  for (const raw of m[1]!.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line || line.startsWith('@@')) continue;
    const f = /^([A-Za-z_][A-Za-z0-9_]*)\s+\S/.exec(line);
    if (f) fields.add(f[1]!);
  }
  return fields;
}

/** Paren-balanced argument text of every `<receiver>.<method>(` call. */
function callArgs(source: string, receiver: string, method: string): string[] {
  const spans: string[] = [];
  const call = new RegExp(`\\b${receiver}\\s*\\.\\s*${method}\\s*\\(`, 'g');
  for (;;) {
    const m = call.exec(source);
    if (!m) return spans;
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let i = open;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    spans.push(source.slice(open, i + 1));
    call.lastIndex = i + 1;
  }
}

/**
 * Prisma's own vocabulary. Anything in a query argument that is neither one of
 * these nor a declared model field is a name Postgres will not recognise.
 */
const PRISMA_KEYWORDS = new Set([
  'where', 'select', 'include', 'orderBy', 'by', 'take', 'skip', 'cursor', 'distinct',
  'data', 'AND', 'OR', 'NOT', 'not', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte',
  'equals', 'contains', 'startsWith', 'endsWith', 'mode', 'some', 'every', 'none',
  'is', 'isNot', 'has', 'hasEvery', 'hasSome', 'isEmpty',
  '_count', '_sum', '_avg', '_min', '_max', '_all', 'having',
]);

/** Object keys appearing anywhere inside a query argument. */
function objectKeys(span: string): string[] {
  return [...span.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]!);
}

/** Quoted strings inside a top-level `by: [ ... ]` array. */
function groupByFields(span: string): string[] {
  const m = /\bby\s*:\s*\[([^\]]*)\]/.exec(span);
  if (!m) return [];
  return [...m[1]!.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]!);
}

describe('SCAL-04 — /admin/waitlist/stats queries real Waitlist columns', () => {
  const schema = readFileSync(SCHEMA, 'utf8');
  const source = stripComments(readFileSync(ROUTE, 'utf8'));
  const fields = modelFields(schema, 'Waitlist');

  it('reads the Waitlist field list out of the schema', () => {
    // Sanity: if this ever comes back empty the guard below passes vacuously.
    expect(fields.size).toBeGreaterThan(5);
    expect(fields.has('referredByCode')).toBe(true);
    expect(fields.has('referralCode')).toBe(true);
    expect(fields.has('status')).toBe(true);
    // The name the broken leaderboard asked for. It is not a column.
    expect(fields.has('referredByEmail')).toBe(false);
  });

  it('groups only by columns that exist', () => {
    const spans = callArgs(source, 'waitlist', 'groupBy');
    expect(spans.length, 'no waitlist.groupBy call found — did the route move?').toBeGreaterThan(0);
    for (const span of spans) {
      for (const f of groupByFields(span)) {
        expect(
          fields.has(f),
          `waitlist.groupBy({ by: ['${f}'] }) — "${f}" is not a field on model Waitlist. ` +
            `Prisma rejects the query, the enclosing Promise.all rejects, and the handler's ` +
            `catch answers all zeros. Declared fields: ${[...fields].join(', ')}`,
        ).toBe(true);
      }
    }
  });

  it('filters, orders and selects only on columns that exist', () => {
    const spans = [
      ...callArgs(source, 'waitlist', 'groupBy'),
      ...callArgs(source, 'waitlist', 'findMany'),
      ...callArgs(source, 'waitlist', 'count'),
    ];
    expect(spans.length).toBeGreaterThan(0);
    for (const span of spans) {
      for (const key of objectKeys(span)) {
        expect(
          fields.has(key) || PRISMA_KEYWORDS.has(key),
          `waitlist query references "${key}", which is neither a Waitlist field nor a Prisma ` +
            `operator. Offending call: ${span.slice(0, 160).replace(/\s+/g, ' ')}`,
        ).toBe(true);
      }
    }
  });
});
