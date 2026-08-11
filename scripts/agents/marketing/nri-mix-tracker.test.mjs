import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  buildMixSql,
  calculateMix,
  dbReport,
  errorReport,
  noopReport,
  SQL_LAST_7D,
  SQL_LAST_30D,
} from './nri-mix-tracker.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(HERE, '..', '..', '..', 'apps', 'api', 'prisma', 'schema.prisma');
const SCHEMA = readFileSync(SCHEMA_PATH, 'utf8');

// ─── schema fixture ──────────────────────────────────────────────────────────
// The tracker's SQL is raw text — nothing type-checks it, and it shipped with
// FOUR simultaneous schema errors (table "Booking", status 'COMPLETED', column
// `amount`, column "createdAt"), so the "live DB read" path had never produced
// a number in its life. There is no database in CI to EXPLAIN against, so the
// equivalent guard is to resolve every identifier the SQL uses against
// schema.prisma itself: a table, column or enum-value rename fails here rather
// than silently zeroing an investor-facing milestone metric.

function parseModels(src) {
  const byTable = {};
  const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let m;
  while ((m = modelRe.exec(src)) !== null) {
    const [, modelName, body] = m;
    const tableMatch = body.match(/@@map\("([^"]+)"\)/);
    const table = tableMatch ? tableMatch[1] : modelName;
    const columns = new Set();
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
      const field = line.match(/^(\w+)\s+\S/);
      if (!field) continue;
      const mapped = line.match(/@map\("([^"]+)"\)/);
      columns.add(mapped ? mapped[1] : field[1]);
    }
    byTable[table] = { modelName, columns };
  }
  return byTable;
}

function parseEnumValues(src, enumName) {
  const m = src.match(new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!m) throw new Error(`enum ${enumName} not found in schema.prisma`);
  return new Set(
    m[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//')),
  );
}

/** alias -> table, read straight out of the SQL's FROM/JOIN clauses. */
function aliasMap(sql) {
  const map = {};
  // Quotes are captured deliberately: `FROM "Booking" b` must resolve to the
  // table name `Booking` and then fail the exists-check, not slip past unmatched.
  const re = /\b(?:FROM|JOIN)\s+"?([A-Za-z_][\w]*)"?\s+([a-z][\w]*)/gi;
  let m;
  while ((m = re.exec(sql)) !== null) map[m[2]] = m[1];
  return map;
}

/** every `alias.column` reference in the SQL. */
function columnRefs(sql) {
  const refs = [];
  const re = /\b([a-z][\w]*)\.([a-z_][\w]*)\b/g;
  let m;
  while ((m = re.exec(sql)) !== null) refs.push({ alias: m[1], column: m[2] });
  return refs;
}

const MODELS = parseModels(SCHEMA);
const BOOKING_STATUSES = parseEnumValues(SCHEMA, 'BookingStatus');

describe('SQL resolves against the real Prisma schema', () => {
  for (const [label, sql] of [
    ['SQL_LAST_30D', SQL_LAST_30D],
    ['SQL_LAST_7D', SQL_LAST_7D],
  ]) {
    describe(label, () => {
      const aliases = aliasMap(sql);

      it('reads only tables that exist', () => {
        const tables = Object.values(aliases);
        expect(tables.length).toBeGreaterThan(0);
        for (const table of tables) {
          expect(Object.keys(MODELS), `table ${table} is not mapped by any model`).toContain(table);
        }
      });

      it('reads only columns that exist on those tables', () => {
        const refs = columnRefs(sql);
        expect(refs.length).toBeGreaterThan(0);
        for (const { alias, column } of refs) {
          const table = aliases[alias];
          expect(table, `alias ${alias} has no FROM/JOIN binding`).toBeTruthy();
          expect(
            [...MODELS[table].columns],
            `${table}.${column} does not exist (model ${MODELS[table].modelName})`,
          ).toContain(column);
        }
      });

      it('filters on real BookingStatus enum members', () => {
        const inClause = sql.match(/b\.status\s+IN\s*\(([^)]*)\)/i);
        expect(inClause, 'no b.status IN (...) predicate found').toBeTruthy();
        const values = inClause[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''));
        expect(values.length).toBeGreaterThan(0);
        for (const value of values) {
          expect([...BOOKING_STATUSES], `status '${value}' is not a BookingStatus`).toContain(value);
        }
      });

      it('carries no resurrected FX constant, paise cast, or Stripe-era currency proxy', () => {
        expect(sql).not.toMatch(/\*\s*83/); // hardcoded ₹/USD — the RV-01 class
        expect(sql).not.toMatch(/::bigint/); // truncates paise off Decimal(10,2)
        expect(sql).not.toMatch(/_paise/); // price_amount is in RUPEES
        expect(sql).not.toMatch(/'USD'/); // Stripe removed; INR is the only currency
        expect(sql).not.toMatch(/"Booking"/); // the table is puja_bookings
      });

      it('splits on the NRI flag, not on currency', () => {
        expect(sql).toMatch(/u\.is_nri/);
        expect(sql).toMatch(/u\.nri_country/);
      });
    });
  }

  it('the two windows differ only in their interval', () => {
    expect(SQL_LAST_30D).toContain("INTERVAL '30 days'");
    expect(SQL_LAST_7D).toContain("INTERVAL '7 days'");
    expect(SQL_LAST_30D.replace("'30 days'", 'X')).toBe(SQL_LAST_7D.replace("'7 days'", 'X'));
  });

  it('refuses a non-integer window rather than emitting injectable SQL', () => {
    expect(() => buildMixSql("1'; DROP TABLE users; --")).toThrow(/positive integer/);
    expect(() => buildMixSql(0)).toThrow(/positive integer/);
  });
});

describe('the NRI/India split is exhaustive and exclusive', () => {
  // is_nri is NOT NULL with default false, so these two CASE arms are exact
  // complements: every earned booking lands in exactly one half. If they ever
  // overlap the mix silently exceeds 100%; if they ever leave a gap the
  // denominator shrinks and the mix silently inflates.
  const rows = [
    { is_nri: false, nri_country: null },
    { is_nri: true, nri_country: null },
    { is_nri: false, nri_country: 'US' },
    { is_nri: true, nri_country: 'GB' },
  ];
  const isIndia = (r) => r.is_nri === false && r.nri_country === null;
  const isNri = (r) => r.is_nri === true || r.nri_country !== null;

  it('classifies every user row exactly once', () => {
    for (const r of rows) {
      expect(Number(isIndia(r)) + Number(isNri(r)), JSON.stringify(r)).toBe(1);
    }
  });
});

describe('calculateMix', () => {
  it('reports rupees, not paise — inputs are Decimal(10,2) rupee sums', () => {
    const r = calculateMix({ indiaRevenueInr: 600000, nriRevenueInr: 400000 });
    expect(r.totalInr).toBe(1000000);
    expect(r.indiaRevenueInr).toBe(600000);
    expect(r.nriRevenueInr).toBe(400000);
  });

  it('fires the 40% milestone on a genuinely NRI-heavy month', () => {
    // ₹4,00,000 NRI of ₹10,00,000 total. Under the old USD-only heuristic this
    // returned 0.00% / below-target and the milestone workflow never ran.
    const r = calculateMix({ indiaRevenueInr: 600000, nriRevenueInr: 400000 });
    expect(r.mixPct).toBe(40);
    expect(r.classification).toBe('milestone-reached');
  });

  it('bands correctly across the three thresholds', () => {
    expect(calculateMix({ indiaRevenueInr: 700, nriRevenueInr: 300 }).classification).toBe('below-target');
    expect(calculateMix({ indiaRevenueInr: 640, nriRevenueInr: 360 }).classification).toBe('approaching');
    expect(calculateMix({ indiaRevenueInr: 550, nriRevenueInr: 450 }).classification).toBe('exceeded');
  });

  it('returns no-data rather than dividing by zero', () => {
    const r = calculateMix({ indiaRevenueInr: 0, nriRevenueInr: 0 });
    expect(r.classification).toBe('no-data');
    expect(r.mixPct).toBe(0);
  });
});

describe('report shapes', () => {
  const mix = {
    last30: calculateMix({ indiaRevenueInr: 700000, nriRevenueInr: 550000 }),
    last7: calculateMix({ indiaRevenueInr: 100000, nriRevenueInr: 50000 }),
  };

  it('renders the full rupee figure — no /100 paise division', () => {
    const body = dbReport(mix);
    // ₹12,50,000 must not render as ₹12,500.
    expect(body).toContain('₹12,50,000');
    expect(body).not.toContain('₹12,500\n');
    expect(body).not.toContain('USD × 83');
  });

  it('errorReport says the query failed and never claims the env var is missing', () => {
    const body = errorReport(new Error('relation "Booking" does not exist'));
    expect(body).toContain('DB configured but the query failed');
    expect(body).toContain('relation "Booking" does not exist');
    expect(body).not.toContain('not set in env');
    expect(body).toContain('contains no numbers');
  });

  it('noopReport stays reserved for the DB_URL-absent case', () => {
    const body = noopReport();
    expect(body).toContain('NOOP');
    expect(body).toContain('not set in env');
    // The old cross-validation note pointed at a `currency` column on `Booking`.
    expect(body).not.toContain('`Booking`');
    expect(body).toContain('users.is_nri');
  });
});
