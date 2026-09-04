import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import Fastify from 'fastify';
import { adminLeadConversionRoutes } from './admin-lead-conversion.js';
import { adminLeadsRoutes } from './admin-leads.js';

/**
 * SCAL-04 — the two `outreach_logs` day-bucket scans.
 *
 * GET /admin/leads/conversion/timeline and GET /admin/outreach/stats each read
 * every outreach row in their window — no `take`, no `cursor` — and reduced
 * them to at most 120 (respectively 30) tuples of small integers in a JS loop.
 * `outreach_logs` gains a row per MESSAGE per lead and loses none, so its row
 * count is a multiple of the lead table's; the timeline's window is sized by
 * the CALLER (`?days`, up to 120). These were the largest reads left in the
 * admin surface.
 *
 * The ratchet (lib/unbounded-findmany.scal04.test.ts) refused this rewrite
 * TWICE, for one specific reason worth restating: Prisma cannot express
 * `date_trunc`, both handlers answer zeros on any error, and a raw statement
 * Postgres rejects would therefore convert a slow dashboard into a silently
 * empty one — which is exactly what an unknown `groupBy` field did to
 * /admin/waitlist/stats. This file is the answer to that objection, in two
 * halves:
 *
 *   1. ARITHMETIC. The handlers are driven through a mocked `$queryRaw` and the
 *      rendered buckets are pinned against a stated ledger, including the
 *      containment rule that a row outside the seeded days counts toward
 *      neither its bucket nor the totals. Both tests are RED before the fix:
 *      with `$queryRaw` mocked and `findMany` returning nothing, the old
 *      handlers render an all-zero timeline.
 *
 *   2. IDENTIFIERS. Every quoted identifier inside every `$queryRaw` template
 *      in both route files is checked against prisma/schema.prisma — table
 *      names against `@@map`, columns against `@map` (or the bare field name
 *      where a model declares none). That is the one oracle a mock cannot
 *      agree with, and the only one available while prod and the local stack
 *      are both down.
 *
 * COMMENTS ARE STRIPPED BEFORE THE SOURCE SCAN. The prose in both routes and
 * the prose above legitimately name `"sent_at"`, `"outreach_logs"` and
 * `date_trunc`; a guard that reads its own documentation as a call site is the
 * single most repeated defect in this sweep.
 */

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const AUTH = { authorization: 'Bearer demo-admin' };

// ─── Day keys, derived the same way each handler derives them ────────────────

const TIMELINE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `/conversion/timeline`: buckets are `since + i` for i in [0, days). */
function timelineSince(days: number): Date {
  const since = new Date(Date.now() - days * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);
  return since;
}
function timelineKey(days: number, i: number): string {
  return new Date(timelineSince(days).getTime() + i * DAY_MS).toISOString().slice(0, 10);
}

/** `/outreach/stats`: `lastNDays(30)` ends on TODAY, so key(29) is today. */
function outreachKey(i: number): string {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return new Date(today.getTime() - (29 - i) * DAY_MS).toISOString().slice(0, 10);
}

/** A day that is deliberately OUTSIDE either seeded window. */
function outOfRangeKey(): string {
  return new Date(Date.now() + 5 * DAY_MS).toISOString().slice(0, 10);
}

type ModelMock = {
  findMany: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

let outreachMock: ModelMock;
let leadMock: ModelMock;

/** The SQL text of a tagged-template call, for routing the mock's answer. */
function sqlOf(strings: unknown): string {
  return Array.isArray(strings) ? strings.join(' ') : String(strings);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockImplementation(async (args: never) =>
    (args as { where: { email?: string } }).where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );

  // Invariant: the shared mock's methods are never REASSIGNED. `lead` and
  // `outreachLog` are installed as whole objects on a local alias, exactly as
  // the sibling SCAL-04 tests do it.
  leadMock = {
    findMany: vi.fn(async () => []),
    groupBy: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  };
  outreachMock = {
    findMany: vi.fn(async () => []),
    groupBy: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  };
  (prismaMock as unknown as { lead: ModelMock }).lead = leadMock;
  (prismaMock as unknown as { outreachLog: ModelMock }).outreachLog = outreachMock;
});

// ─── 1. /admin/leads/conversion/timeline ─────────────────────────────────────
//
// Ledger for the 30-day default window:
//   day 0   sent 10, of which replied 3   ·  opened 4  ·  clicked 1
//   day 1   sent  7, of which replied 0   ·  opened 2  ·  clicked 0
//   a day OUTSIDE the window carries 999 of everything and must be dropped.
//
// totals are not part of this endpoint's contract; the buckets are.

describe('SCAL-04 — /admin/leads/conversion/timeline buckets in SQL', () => {
  function mockTimelineSql() {
    prismaMock.$queryRaw.mockImplementation((strings: unknown) => {
      const sql = sqlOf(strings);
      const gone = outOfRangeKey();
      if (sql.includes('"opened_at" IS NOT NULL')) {
        return Promise.resolve([
          { day: timelineKey(TIMELINE_DAYS, 0), n: 4 },
          { day: timelineKey(TIMELINE_DAYS, 1), n: 2 },
          { day: gone, n: 999 },
        ]);
      }
      if (sql.includes('"clicked_at" IS NOT NULL')) {
        return Promise.resolve([
          { day: timelineKey(TIMELINE_DAYS, 0), n: 1 },
          { day: gone, n: 999 },
        ]);
      }
      return Promise.resolve([
        { day: timelineKey(TIMELINE_DAYS, 0), n: 10, replied: 3 },
        { day: timelineKey(TIMELINE_DAYS, 1), n: 7, replied: 0 },
        { day: gone, n: 999, replied: 999 },
      ]);
    });
  }

  async function getTimeline() {
    const app = Fastify();
    void app.register(adminLeadConversionRoutes, { prefix: '/api/v1/admin/leads' });
    return app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/conversion/timeline?days=30',
      headers: AUTH,
    });
  }

  it('renders the exact per-day counts from grouped rows', async () => {
    mockTimelineSql();
    const res = await getTimeline();
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      days: number;
      degraded: boolean;
      timeline: Array<{ date: string; sent: number; opened: number; clicked: number; replied: number }>;
    };

    expect(body.days).toBe(30);
    expect(body.timeline).toHaveLength(30);
    expect(body.timeline[0]).toEqual({
      date: timelineKey(TIMELINE_DAYS, 0),
      sent: 10,
      opened: 4,
      clicked: 1,
      replied: 3,
    });
    expect(body.timeline[1]).toEqual({
      date: timelineKey(TIMELINE_DAYS, 1),
      sent: 7,
      opened: 2,
      clicked: 0,
      replied: 0,
    });
    // The out-of-window day must not have leaked into any bucket.
    expect(body.timeline.some((d) => d.sent === 999 || d.opened === 999)).toBe(false);
    expect(body.degraded).toBe(false);
  });

  it('reads no outreach rows at all', async () => {
    mockTimelineSql();
    await getTimeline();
    const unbounded = outreachMock.findMany.mock.calls
      .map((c) => (c[0] ?? {}) as Record<string, unknown>)
      .filter((a) => !('take' in a) && !('cursor' in a));
    expect(
      unbounded,
      'the timeline must not scan outreach_logs — that table grows with every message ever sent',
    ).toEqual([]);
  });

  it('says so when the grouped read fails, instead of answering a quiet month', async () => {
    prismaMock.$queryRaw.mockImplementation(() => Promise.reject(new Error('relation does not exist')));
    const res = await getTimeline();
    expect(res.statusCode).toBe(200);
    const body = res.json() as { degraded: boolean; timeline: Array<{ sent: number }> };
    expect(body.degraded).toBe(true);
    expect(body.timeline.every((d) => d.sent === 0)).toBe(true);
  });
});

// ─── 2. /admin/outreach/stats ────────────────────────────────────────────────
//
// Ledger for the 30-day window ending TODAY:
//   day 0  sent 12 · replied 2 · bounced 1
//   day 29 sent  5 · replied 0 · bounced 4
//   an out-of-window day carries 999 of everything and must reach neither the
//   buckets nor the totals.
//
// totals: sent 17 · replied 2 · bounced 5

describe('SCAL-04 — /admin/outreach/stats buckets in SQL', () => {
  function mockOutreachSql() {
    prismaMock.$queryRaw.mockImplementation(() =>
      Promise.resolve([
        { day: outreachKey(0), sent: 12, replied: 2, bounced: 1 },
        { day: outreachKey(29), sent: 5, replied: 0, bounced: 4 },
        { day: outOfRangeKey(), sent: 999, replied: 999, bounced: 999 },
      ]),
    );
  }

  async function getStats() {
    const app = Fastify();
    void app.register(adminLeadsRoutes, { prefix: '/api/v1/admin' });
    return app.inject({ method: 'GET', url: '/api/v1/admin/outreach/stats', headers: AUTH });
  }

  it('renders the exact per-day counts and totals from grouped rows', async () => {
    mockOutreachSql();
    const res = await getStats();
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      degraded: boolean;
      daily: Array<{ date: string; sent: number; replied: number; bounced: number }>;
      totals: { sent: number; replied: number; bounced: number };
    };

    expect(body.daily).toHaveLength(30);
    expect(body.daily[0]).toEqual({ date: outreachKey(0), sent: 12, replied: 2, bounced: 1 });
    expect(body.daily[29]).toEqual({ date: outreachKey(29), sent: 5, replied: 0, bounced: 4 });
    // The totals are the sum of what is RENDERED — the out-of-window day is in
    // neither, which is the containment rule the JS loop enforced with
    // `if (!b) continue;` placed before the total increments.
    expect(body.totals).toEqual({ sent: 17, replied: 2, bounced: 5 });
    expect(body.degraded).toBe(false);
  });

  it('reads no outreach rows at all', async () => {
    mockOutreachSql();
    await getStats();
    const unbounded = outreachMock.findMany.mock.calls
      .map((c) => (c[0] ?? {}) as Record<string, unknown>)
      .filter((a) => !('take' in a) && !('cursor' in a));
    expect(unbounded).toEqual([]);
  });

  it('says so when the grouped read fails', async () => {
    prismaMock.$queryRaw.mockImplementation(() => Promise.reject(new Error('boom')));
    const res = await getStats();
    const body = res.json() as { degraded: boolean; totals: { sent: number } };
    expect(body.degraded).toBe(true);
    expect(body.totals.sent).toBe(0);
  });
});

// ─── 3. The identifier oracle ────────────────────────────────────────────────

const API_ROOT = join(import.meta.dirname, '..', '..');
const SCHEMA_PATH = join(API_ROOT, 'prisma', 'schema.prisma');
const ROUTES = ['admin-lead-conversion.ts', 'admin-leads.ts'] as const;

/**
 * Line and block comments removed. Prose in these files legitimately quotes
 * `"sent_at"` and `"outreach_logs"` while explaining the fix; a scanner that
 * counts its own documentation is the bug class this sweep keeps re-finding.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

/**
 * Every `$queryRaw` / `$queryRawUnsafe` template body in a source file.
 *
 * The optional `<...>` matters: both call sites are written
 * `prisma.$queryRaw<DayRow[]>\`…\``, and a pattern that expects the backtick
 * immediately after the method name finds NOTHING and passes an empty check —
 * which is how this guard first ran green against SQL it had never read. The
 * "at least one block" assertion below exists for the same reason.
 */
function rawSqlBlocks(source: string): string[] {
  const out: string[] = [];
  const call = /\$queryRaw(?:Unsafe)?\s*(?:<[^`]*?>)?\s*`/g;
  for (;;) {
    const m = call.exec(source);
    if (!m) return out;
    const start = m.index + m[0].length;
    const end = source.indexOf('`', start);
    if (end === -1) return out;
    out.push(source.slice(start, end));
    call.lastIndex = end + 1;
  }
}

/**
 * Physical table name → its physical column names, for EVERY model in the
 * schema.
 *
 * Built as a whole map rather than for OutreachLog alone on purpose: each SQL
 * block is checked against the table named in its own `FROM`, so a future
 * `$queryRaw` in either file against some other table is checked properly
 * instead of being reported as a wall of unknown identifiers. A guard that
 * cries wolf on correct code gets relaxed, and a relaxed guard catches nothing.
 */
function tableColumnMap(schema: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const m of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const body = m[2]!;
    const table = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? m[1]!;
    const columns = new Set<string>();
    for (const raw of body.split('\n')) {
      const line = raw.replace(/\/\/.*$/, '').trim();
      if (!line || line.startsWith('@@')) continue;
      const f = /^([A-Za-z_][A-Za-z0-9_]*)\s+\S/.exec(line);
      if (!f) continue;
      columns.add(/@map\("([^"]+)"\)/.exec(line)?.[1] ?? f[1]!);
    }
    out.set(table, columns);
  }
  return out;
}

/** `@@map` table name and the physical column name of every scalar field. */
function modelColumns(schema: string, model: string): { table: string; columns: Set<string> } {
  const m = new RegExp(`^model\\s+${model}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(schema);
  if (!m) throw new Error(`model ${model} not found in schema.prisma`);
  const body = m[1]!;
  const table = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? model;
  const columns = new Set<string>();
  for (const raw of body.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line || line.startsWith('@@')) continue;
    const f = /^([A-Za-z_][A-Za-z0-9_]*)\s+\S/.exec(line);
    if (!f) continue;
    columns.add(/@map\("([^"]+)"\)/.exec(line)?.[1] ?? f[1]!);
  }
  return { table, columns };
}

/** The labels declared by a Prisma `enum`. */
function enumLabels(schema: string, name: string): Set<string> {
  const m = new RegExp(`^enum\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(schema);
  if (!m) throw new Error(`enum ${name} not found in schema.prisma`);
  const out = new Set<string>();
  for (const raw of m[1]!.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (line) out.add(line);
  }
  return out;
}

/**
 * Every literal compared against `"status"::text` in a SQL block.
 *
 * A misspelled enum label does NOT error — `'SENTT'` simply matches no row —
 * so it produces a dashboard of zeros that is indistinguishable from a quiet
 * month, the same silent-wrong-answer shape as an unknown column but without
 * even an exception to catch. `"template_key" = 'inbound_reply'` is
 * deliberately out of scope here: it is a free-text key, not an enum label.
 */
function statusLiterals(sql: string): string[] {
  const out: string[] = [];
  for (const m of sql.matchAll(/"status"::text\s*(?:=\s*'([^']*)'|IN\s*\(([^)]*)\))/g)) {
    if (m[1] != null) out.push(m[1]);
    else if (m[2] != null) for (const lit of m[2].matchAll(/'([^']*)'/g)) out.push(lit[1]!);
  }
  return out;
}

describe('SCAL-04 — the raw day-bucket SQL names only real columns', () => {
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  const outreach = modelColumns(schema, 'OutreachLog');
  const statuses = enumLabels(schema, 'OutreachStatus');
  const byTable = tableColumnMap(schema);

  it('compares status only against declared OutreachStatus labels', () => {
    const seen: string[] = [];
    const unknown: string[] = [];
    for (const file of ROUTES) {
      const source = stripComments(readFileSync(join(import.meta.dirname, file), 'utf8'));
      for (const sql of rawSqlBlocks(source)) {
        for (const lit of statusLiterals(sql)) {
          seen.push(lit);
          if (!statuses.has(lit)) unknown.push(`${file}: '${lit}'`);
        }
      }
    }
    // Without this the check passes by finding nothing — the failure mode that
    // let the first draft of the identifier guard run green over unread SQL.
    expect(seen.length, 'no "status"::text comparison found to check').toBeGreaterThan(0);
    expect(unknown, 'a misspelled label matches no row and renders zeros silently').toEqual([]);
  });

  it('knows what it is checking against', () => {
    // If this drifts, every assertion below is checking nothing.
    expect(outreach.table).toBe('outreach_logs');
    for (const col of ['sent_at', 'opened_at', 'clicked_at', 'template_key', 'status']) {
      expect(outreach.columns, `schema.prisma no longer maps a column to ${col}`).toContain(col);
    }
  });

  for (const file of ROUTES) {
    it(`${file}: every quoted identifier is a real table or column`, () => {
      const source = stripComments(readFileSync(join(import.meta.dirname, file), 'utf8'));
      const blocks = rawSqlBlocks(source);
      // A file that stopped using raw SQL should stop claiming this guard runs.
      expect(blocks.length, `${file} has no $queryRaw template to check`).toBeGreaterThan(0);

      const unknown: string[] = [];
      for (const sql of blocks) {
        // Check each block against the table it actually reads, so this stays
        // correct if either file grows a raw query over a different model.
        const table = /\bFROM\s+"([A-Za-z_][A-Za-z0-9_]*)"/i.exec(sql)?.[1];
        const columns = table ? byTable.get(table) : undefined;
        expect(columns, `no model in schema.prisma maps to the table this query reads: ${table}`).
          toBeDefined();
        for (const m of sql.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)"/g)) {
          const ident = m[1]!;
          if (ident === table || columns?.has(ident)) continue;
          unknown.push(`${ident} (in: ${sql.trim().slice(0, 60).replace(/\s+/g, ' ')}…)`);
        }
      }
      expect(
        unknown,
        'Prisma answers an unknown identifier with an error, the handler catches it, and the ' +
          'dashboard renders zeros — indistinguishable from a quiet month. Fix the name, do not ' +
          'relax this list.',
      ).toEqual([]);
    });
  }
});
