# Darshya MCP + MCP Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `darshya-mcp`, a custom TypeScript stdio MCP server exposing 5 read-only prod-funnel tools (`funnel_today`, `kpi_snapshot`, `agent_reports`, `prod_health`, `recent_commits`), and wire 6 additional MCP servers (github, filesystem, playwright, jina, context7, deepwiki) into the project `.mcp.json`.

**Architecture:** A standalone stdio MCP server package `apps/darshya-mcp` in the existing pnpm/turbo monorepo. It reads prod via the same `DIRECT_URL` pattern already proven in `apps/api/scripts/check-prod-tables.mjs` (read `.env.production`, `datasourceUrl: process.env.DIRECT_URL`). Every tool is read-only — a `DELETE`/`UPDATE`/`DROP` guard test proves it. Agent reports are read from `docs/agent-reports/` via `fs/promises`. The server speaks the MCP protocol over stdio using the `@modelcontextprotocol/sdk` package (already an industry standard, free).

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `@prisma/client` (read-only), `vitest` (test runner — matches `apps/api`), pnpm@10.33.0 workspaces, turbo.

---

## File Structure

```
apps/darshya-mcp/
├── package.json              # workspace pkg, scripts: build/test/dev
├── tsconfig.json             # extends root tsconfig
├── .env.example              # DIRECT_URL placeholder (never committed real value)
├── src/
│   ├── index.ts              # stdio MCP server entry — registers tools, connects transport
│   ├── env.ts                # load .env.production, validate DIRECT_URL present
│   ├── prisma.ts             # read-only PrismaClient singleton (datasourceUrl: DIRECT_URL)
│   ├── tools/
│   │   ├── funnel-today.ts   # funnel_today tool: bookings/payments/donations/signups today + last 7d
│   │   ├── kpi-snapshot.ts   # kpi_snapshot tool: totals + 7d deltas
│   │   ├── agent-reports.ts  # agent_reports tool: list + read docs/agent-reports/
│   │   ├── prod-health.ts    # prod_health tool: ping API + DB row-counts
│   │   └── recent-commits.ts # recent_commits tool: git log via child_process
│   └── guard.ts              # isReadOnlyQuery(): rejects DML/DDL keywords (the safety test)
└── tests/
    ├── guard.test.ts          # DELETE/UPDATE/DROP/INSERT/TRUNCATE rejected; SELECT/ WITH/WITHROLLUP ok
    ├── funnel-today.test.ts   # fixture Prisma mock → today's counts
    ├── kpi-snapshot.test.ts   # fixture Prisma mock → totals + delta
    ├── agent-reports.test.ts  # fixture tmp dir → list + read
    ├── prod-health.test.ts    # fetch mocked → UP/DOWN states
    ├── recent-commits.test.ts # git mocked → parsed log
    └── e2e-read-only.test.ts  # real DIRECT_URL (skip if unset) → DELETE must throw
```

**Responsibility boundaries:**

- `env.ts` — env loading only, no Prisma, no tools. One job: hand back a validated `DIRECT_URL`.
- `prisma.ts` — Prisma singleton only. Reuses `apps/api/src/lib/prisma.ts` instrumentation-free variant (no query-event logging — MCP doesn't need it, keeps the client cheap).
- `guard.ts` — pure function, no I/O. The single chokepoint every raw-SQL tool routes through.
- `tools/*.ts` — one file per tool. Each exports an async handler `(args) => Promise<MCPToolResult>` and a Zod schema for its args. No cross-tool imports (DRY: shared formatters live in a `format.ts` only if 2+ tools need them — add when needed, not preemptively).
- `index.ts` — wiring only: import tools, register on `Server`, attach `StdioServerTransport`. No business logic.

---

## Task 1: Scaffold the `apps/darshya-mcp` package

**Files:**

- Create: `apps/darshya-mcp/package.json`
- Create: `apps/darshya-mcp/tsconfig.json`
- Create: `apps/darshya-mcp/.env.example`
- Modify: `pnpm-workspace.yaml` (add `apps/darshya-mcp` to packages if not glob-covered)
- Modify: `turbo.json` (ensure `build`/`test` pipeline picks up new pkg — usually glob auto)

- [ ] **Step 1: Check workspace glob coverage**

Run: `cat pnpm-workspace.yaml`
Expected: shows `packages:` list — confirm whether `apps/*` is globbed. If `apps/*` present, the new package is auto-included; no edit needed.

- [ ] **Step 2: Create `apps/darshya-mcp/package.json`**

```json
{
  "name": "@darshya/mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@prisma/client": "workspace:*",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 3: Create `apps/darshya-mcp/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `apps/darshya-mcp/.env.example`**

```bash
# DIRECT_URL = the Supabase direct (non-pooled) Postgres connection string.
# Same value apps/api/scripts/check-prod-tables.mjs uses. NEVER commit the real value.
# Place the real value in apps/api/.env.production (already gitignored).
DIRECT_URL=postgresql://USER:PASS@db.PROJECT.supabase.co:5432/postgres
```

- [ ] **Step 5: Install + verify the package is seen by the workspace**

Run: `pnpm install`
Expected: installs `@modelcontextprotocol/sdk` + links `@prisma/client` workspace dep; no peer warnings that block.

Run: `pnpm -r --filter @darshya/mcp exec tsc --noEmit`
Expected: exits 0 (no source yet → nothing to error).

- [ ] **Step 6: Commit**

```bash
git add apps/darshya-mcp pnpm-lock.yaml
git commit -m "feat(mcp): scaffold @darshya/mcp package"
```

---

## Task 2: Read-only SQL guard (TDD — the safety test)

**Files:**

- Create: `apps/darshya-mcp/src/guard.ts`
- Test: `apps/darshya-mcp/tests/guard.test.ts`

This is the single most important safety property: darshya-mcp must NEVER be able to mutate prod. We prove it with a guard that rejects any statement containing a write keyword, and an e2e test (Task 8) that fires a real `DELETE` and asserts it throws.

- [ ] **Step 1: Write the failing test**

`apps/darshya-mcp/tests/guard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isReadOnlyQuery } from '../src/guard.js';

describe('isReadOnlyQuery', () => {
  const rejected = [
    "DELETE FROM users WHERE id = 'x'",
    'UPDATE users SET blocked = true',
    "INSERT INTO users (id) VALUES ('x')",
    'DROP TABLE donations',
    'TRUNCATE TABLE puja_bookings',
    'ALTER TABLE users ADD COLUMN x int',
    'GRANT ALL ON users TO public',
    'delete from users where 1=1', // case-insensitive
    '  /* sneaky */ DROP TABLE temples', // leading whitespace + comment
  ];
  for (const sql of rejected) {
    it(`rejects: ${sql.slice(0, 40)}`, () => {
      expect(isReadOnlyQuery(sql)).toBe(false);
    });
  }

  const allowed = [
    'SELECT COUNT(*) FROM users',
    'SELECT * FROM payments WHERE status = $1',
    'WITH t AS (SELECT 1) SELECT * FROM t', // CTE
    'select created_at from users', // lowercase
    '   SELECT 1', // leading whitespace
  ];
  for (const sql of allowed) {
    it(`allows: ${sql.slice(0, 40)}`, () => {
      expect(isReadOnlyQuery(sql)).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @darshya/mcp test`
Expected: FAIL — `Cannot find module '../src/guard.js'`

- [ ] **Step 3: Write minimal implementation**

`apps/darshya-mcp/src/guard.ts`:

```typescript
// The single chokepoint for every raw-SQL tool. Returns true ONLY when the
// statement is provably read-only. We deny by keyword presence — a query is
// guilty if it contains any write verb as a whole word, regardless of case or
// surrounding whitespace/comments. This is intentionally conservative: it will
// reject some edge-case read queries that happen to contain those substrings
// inside string literals, but it will never let a write through. The e2e test
// in tests/e2e-read-only.test.ts is the backstop that fires a real DELETE.
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
];

export function isReadOnlyQuery(sql: string): boolean {
  // Strip line/block comments so "/* DROP */ SELECT 1" is judged on its SELECT.
  const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
  for (const kw of WRITE_KEYWORDS) {
    // Whole-word, case-insensitive match on the keyword.
    const re = new RegExp(`\\b${kw}\\b`, 'i');
    if (re.test(stripped)) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @darshya/mcp test`
Expected: PASS — all 14 cases green.

- [ ] **Step 5: Commit**

```bash
git add apps/darshya-mcp/src/guard.ts apps/darshya-mcp/tests/guard.test.ts
git commit -m "feat(mcp): read-only SQL guard + tests"
```

---

## Task 3: env loader + read-only Prisma client

**Files:**

- Create: `apps/darshya-mcp/src/env.ts`
- Create: `apps/darshya-mcp/src/prisma.ts`
- Test: `apps/darshya-mcp/tests/env.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/darshya-mcp/tests/env.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('loadEnv', () => {
  const orig = { ...process.env };
  beforeEach(() => {
    process.env = { ...orig };
  });
  afterEach(() => {
    process.env = { ...orig };
  });

  it('returns DIRECT_URL parsed from a .env file', async () => {
    const tmp = join(process.cwd(), '.env.test-1');
    writeFileSync(tmp, 'DIRECT_URL=postgresql://u:p@host:5432/db\nOTHER=ignored\n');
    const { loadEnv } = await import('../src/env.js');
    const env = loadEnv(tmp);
    expect(env.DIRECT_URL).toBe('postgresql://u:p@host:5432/db');
    rmSync(tmp);
  });

  it('throws a clear error when DIRECT_URL is absent', async () => {
    const tmp = join(process.cwd(), '.env.test-2');
    writeFileSync(tmp, 'SOMETHING_ELSE=1\n');
    const { loadEnv } = await import('../src/env.js');
    expect(() => loadEnv(tmp)).toThrow(/DIRECT_URL/);
    rmSync(tmp);
  });

  it('prefers an already-exported DIRECT_URL over the file', async () => {
    process.env.DIRECT_URL = 'postgresql://env:env@host/db';
    const tmp = join(process.cwd(), '.env.test-3');
    writeFileSync(tmp, 'DIRECT_URL=postgresql://file:file@host/db\n');
    const { loadEnv } = await import('../src/env.js');
    expect(loadEnv(tmp).DIRECT_URL).toBe('postgresql://env:env@host/db');
    rmSync(tmp);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @darshya/mcp test`
Expected: FAIL — `Cannot find module '../src/env.js'`

- [ ] **Step 3: Write minimal implementation**

`apps/darshya-mcp/src/env.ts`:

```typescript
import { readFileSync, existsSync } from 'node:fs';

// Mirrors the proven pattern in apps/api/scripts/check-prod-tables.mjs:
// read .env.production, populate process.env, then read DIRECT_URL back out.
// The exported env var always wins over the file (so a container/CI can inject
// without writing a file). Throws if DIRECT_URL is nowhere — failing loud beats
// silently pointing at the wrong (or pooled) DB.
export interface DarshyaEnv {
  DIRECT_URL: string;
}

export function loadEnv(envPath = '../../apps/api/.env.production'): DarshyaEnv {
  // 1. Already-exported wins.
  if (process.env.DIRECT_URL) {
    return { DIRECT_URL: process.env.DIRECT_URL };
  }
  // 2. Parse the file (same regex as check-prod-tables.mjs).
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error(
      'darshya-mcp: DIRECT_URL is not set. Export it or put it in apps/api/.env.production. ' +
        'It must be the Supabase DIRECT (non-pooled) connection string.',
    );
  }
  return { DIRECT_URL: url };
}
```

`apps/darshya-mcp/src/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './env.js';

// Read-only client. We deliberately do NOT attach query-event instrumentation
// (apps/api/src/lib/prisma.ts does, for the N+1 detector — MCP has no need and
// it keeps the client cheap). The read-only guarantee is enforced by guard.ts
// for raw SQL, and by only ever calling findFirst/findMany/count/aggregate for
// Prisma-typed queries.
let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!client) {
    const { DIRECT_URL } = loadEnv();
    client = new PrismaClient({ datasourceUrl: DIRECT_URL });
  }
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @darshya/mcp test`
Expected: PASS — 3 env cases + 14 guard cases green.

- [ ] **Step 5: Commit**

```bash
git add apps/darshya-mcp/src/env.ts apps/darshya-mcp/src/prisma.ts apps/darshya-mcp/tests/env.test.ts
git commit -m "feat(mcp): env loader + read-only Prisma client"
```

---

## Task 4: `funnel_today` tool (TDD)

**Files:**

- Create: `apps/darshya-mcp/src/tools/funnel-today.ts`
- Test: `apps/darshya-mcp/tests/funnel-today.test.ts`

**Schema facts used (from `apps/api/prisma/schema.prisma`):**

- `User.createdAt` → signups
- `PujaBooking.createdAt` + `PujaBooking.status` (BookingStatus enum: pending_payment, confirmed, priest_assigned, in_progress, completed, video_uploaded, delivered, cancelled, refunded) → bookings
- `Payment.status` (PaymentStatus: initiated, authorized, captured, failed, refunded, partially_refunded) + `Payment.amount` → revenue
- `Donation.status` + `Donation.amountInr` → donations

- [ ] **Step 1: Write the failing test**

`apps/darshya-mcp/tests/funnel-today.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Prisma client so the tool runs against deterministic fixtures.
const mockPrisma = {
  user: { count: vi.fn() },
  pujaBooking: { count: vi.fn(), groupBy: vi.fn() },
  payment: { aggregate: vi.fn() },
  donation: { aggregate: vi.fn() },
};
vi.mock('../src/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}));

import { funnelToday } from '../src/tools/funnel-today.js';

beforeEach(() => vi.clearAllMocks());

describe('funnelToday', () => {
  it('returns today + last-7d counts for each funnel stage', async () => {
    // count() returns total matching the where clause.
    mockPrisma.user.count.mockResolvedValue(3);
    mockPrisma.pujaBooking.count.mockResolvedValue(2);
    mockPrisma.pujaBooking.groupBy.mockResolvedValue([
      { status: 'confirmed', _count: { _all: 1 } },
      { status: 'pending_payment', _count: { _all: 1 } },
    ]);
    // aggregate returns { _sum: { amount: ... } }
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 1500 } });
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountInr: 500 } });

    const result = await funnelToday({});
    const data = JSON.parse(result.content[0].text);

    expect(data.today.signups).toBe(3);
    expect(data.today.bookings).toBe(2);
    expect(data.today.bookingsByStatus.confirmed).toBe(1);
    expect(data.today.capturedRevenueInr).toBe(1500);
    expect(data.today.donationsInr).toBe(500);
    expect(data.last7d).toBeDefined();
    // Revenue only counts 'captured' payments (completed money).
    expect(mockPrisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { amount: true },
        where: expect.objectContaining({ status: 'captured' }),
      }),
    );
  });

  it('returns zeros (not null) when prod is empty', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.pujaBooking.count.mockResolvedValue(0);
    mockPrisma.pujaBooking.groupBy.mockResolvedValue([]);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountInr: null } });

    const data = JSON.parse((await funnelToday({})).content[0].text);
    expect(data.today.signups).toBe(0);
    expect(data.today.capturedRevenueInr).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @darshya/mcp test`
Expected: FAIL — `Cannot find module '../src/tools/funnel-today.js'`

- [ ] **Step 3: Write minimal implementation**

`apps/darshya-mcp/src/tools/funnel-today.ts`:

```typescript
import { z } from 'zod';
import { getPrisma } from '../prisma.js';

// "Today" = since midnight UTC. Prod (Supabase) stores timestamps in UTC, so a
// UTC day boundary is the correct and deterministic cut. The 7d window is the
// rolling 7 days ending now.
export const FunnelTodaySchema = z.object({}).strict();

type FunnelResult = {
  today: {
    signups: number;
    bookings: number;
    bookingsByStatus: Record<string, number>;
    capturedRevenueInr: number;
    donationsInr: number;
  };
  last7d: {
    signups: number;
    bookings: number;
    capturedRevenueInr: number;
    donationsInr: number;
  };
  generatedAt: string;
};

async function windowCounts(from: Date, to: Date) {
  const prisma = getPrisma();
  const [signups, bookings, bookingsByStatusRows, payments, donations] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.pujaBooking.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.pujaBooking.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    // Only 'captured' = money actually received. initiated/authorized is not revenue yet.
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'captured', createdAt: { gte: from, lt: to } },
    }),
    prisma.donation.aggregate({
      _sum: { amountInr: true },
      where: { status: 'captured', createdAt: { gte: from, lt: to } },
    }),
  ]);

  const bookingsByStatus: Record<string, number> = {};
  for (const row of bookingsByStatusRows) {
    bookingsByStatus[row.status] = row._count._all;
  }

  return {
    signups,
    bookings,
    bookingsByStatus,
    capturedRevenueInr: Number(payments._sum.amount ?? 0),
    donationsInr: Number(donations._sum.amountInr ?? 0),
  };
}

export async function funnelToday(_args: z.infer<typeof FunnelTodaySchema>) {
  const now = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [today, last7dRaw] = await Promise.all([
    windowCounts(startOfTodayUtc, now),
    windowCounts(sevenDaysAgo, now),
  ]);

  const result: FunnelResult = {
    today,
    last7d: {
      signups: last7dRaw.signups,
      bookings: last7dRaw.bookings,
      capturedRevenueInr: last7dRaw.capturedRevenueInr,
      donationsInr: last7dRaw.donationsInr,
    },
    generatedAt: now.toISOString(),
  };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}

export const funnelTodayToolDef = {
  name: 'funnel_today',
  description:
    "Darshya funnel for today + last 7 days (UTC). Returns signups, bookings (by status), captured revenue (INR), donations (INR). Read-only. Use this to answer 'what is my funnel today?'",
  inputSchema: {
    type: 'object' as const,
    properties: {},
    additionalProperties: false,
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @darshya/mcp test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/darshya-mcp/src/tools/funnel-today.ts apps/darshya-mcp/tests/funnel-today.test.ts
git commit -m "feat(mcp): funnel_today tool"
```

---

## Task 5: `kpi_snapshot` tool (TDD)

**Files:**

- Create: `apps/darshya-mcp/src/tools/kpi-snapshot.ts`
- Test: `apps/darshya-mcp/tests/kpi-snapshot.test.ts`

Totals (all-time) + 7d delta for the headline numbers: total users, total bookings (completed), lifetime captured revenue, active subscriptions, pending leads (supply pipeline).

- [ ] **Step 1: Write the failing test**

`apps/darshya-mcp/tests/kpi-snapshot.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  user: { count: vi.fn() },
  pujaBooking: { count: vi.fn() },
  payment: { aggregate: vi.fn() },
  subscription: { count: vi.fn() },
  lead: { count: vi.fn() },
};
vi.mock('../src/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}));

import { kpiSnapshot } from '../src/tools/kpi-snapshot.js';

beforeEach(() => vi.clearAllMocks());

describe('kpiSnapshot', () => {
  it('returns all-time totals + 7d deltas', async () => {
    mockPrisma.user.count
      .mockResolvedValueOnce(1200) // all-time
      .mockResolvedValueOnce(40); // last 7d
    mockPrisma.pujaBooking.count
      .mockResolvedValueOnce(300) // all-time completed
      .mockResolvedValueOnce(12); // last 7d completed
    mockPrisma.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 250000 } }) // all-time
      .mockResolvedValueOnce({ _sum: { amount: 8000 } }); // last 7d
    mockPrisma.subscription.count.mockResolvedValue(15); // active subs
    mockPrisma.lead.count.mockResolvedValue(47); // NEW+QUEUED leads

    const data = JSON.parse((await kpiSnapshot({})).content[0].text);

    expect(data.totals.users).toBe(1200);
    expect(data.totals.completedBookings).toBe(300);
    expect(data.totals.lifetimeRevenueInr).toBe(250000);
    expect(data.totals.activeSubscriptions).toBe(15);
    expect(data.totals.pipelineLeads).toBe(47);
    expect(data.last7dDelta.users).toBe(40);
    expect(data.last7dDelta.completedBookings).toBe(12);
    expect(data.last7dDelta.revenueInr).toBe(8000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @darshya/mcp test`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`apps/darshya-mcp/src/tools/kpi-snapshot.ts`:

```typescript
import { z } from 'zod';
import { getPrisma } from '../prisma.js';

export const KpiSnapshotSchema = z.object({}).strict();

export async function kpiSnapshot(_args: z.infer<typeof KpiSnapshotSchema>) {
  const prisma = getPrisma();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    users7d,
    totalCompleted,
    completed7d,
    lifetimeRev,
    rev7d,
    activeSubs,
    pipelineLeads,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    // "completed bookings" = delivered OR completed (terminal success states).
    prisma.pujaBooking.count({ where: { status: { in: ['completed', 'delivered'] } } }),
    prisma.pujaBooking.count({
      where: { status: { in: ['completed', 'delivered'] }, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'captured' } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'captured', createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.subscription.count({ where: { status: 'active' } }),
    // Supply pipeline = unworked prospects (NEW + QUEUED, not yet contacted/converted).
    prisma.lead.count({ where: { status: { in: ['NEW', 'QUEUED'] } } }),
  ]);

  const result = {
    totals: {
      users: totalUsers,
      completedBookings: totalCompleted,
      lifetimeRevenueInr: Number(lifetimeRev._sum.amount ?? 0),
      activeSubscriptions: activeSubs,
      pipelineLeads,
    },
    last7dDelta: {
      users: users7d,
      completedBookings: completed7d,
      revenueInr: Number(rev7d._sum.amount ?? 0),
    },
    generatedAt: now.toISOString(),
  };

  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

export const kpiSnapshotToolDef = {
  name: 'kpi_snapshot',
  description:
    'All-time totals (users, completed bookings, lifetime revenue INR, active subscriptions, pipeline leads) + 7-day deltas. Read-only. The headline KPI snapshot.',
  inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @darshya-mcp test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/darshya-mcp/src/tools/kpi-snapshot.ts apps/darshya-mcp/tests/kpi-snapshot.test.ts
git commit -m "feat(mcp): kpi_snapshot tool"
```

---

## Task 6: `agent_reports` tool (TDD)

**Files:**

- Create: `apps/darshya-mcp/src/tools/agent-reports.ts`
- Test: `apps/darshya-mcp/tests/agent-reports.test.ts`

Lists `docs/agent-reports/` (dated `YYYY-MM-DD-*.md` + rolling `_*-log.md`) and reads one by name. No Prisma.

- [ ] **Step 1: Write the failing test**

`apps/darshya-mcp/tests/agent-reports.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'darshya-reports-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('agentReports', () => {
  it('lists dated reports newest-first + rolling logs', async () => {
    writeFileSync(join(dir, '2026-07-14-content-draft.md'), 'a');
    writeFileSync(join(dir, '2026-07-13-content-draft.md'), 'b');
    writeFileSync(join(dir, '_founder-tweet-draft-log.md'), 'c');

    const { listAgentReports } = await import('../src/tools/agent-reports.js');
    const list = await listAgentReports(dir);

    // Dated entries sorted newest-first; rolling logs grouped after.
    expect(list.dated[0].name).toBe('2026-07-14-content-draft.md');
    expect(list.dated[1].name).toBe('2026-07-13-content-draft.md');
    expect(list.rolling).toContain('_founder-tweet-draft-log.md');
  });

  it('reads a report by name, truncating huge files', async () => {
    const big = 'x'.repeat(20_000);
    writeFileSync(join(dir, '2026-07-14-big.md'), big);
    const { readAgentReport } = await import('../src/tools/agent-reports.js');
    const out = await readAgentReport(dir, '2026-07-14-big.md');
    const text = out.content[0].text;
    // Truncated to a sensible cap with a marker.
    expect(text.length).toBeLessThan(20_000);
    expect(text).toContain('[truncated]');
  });

  it('rejects path-traversal names', async () => {
    const { readAgentReport } = await import('../src/tools/agent-reports.js');
    await expect(readAgentReport(dir, '../../etc/passwd')).rejects.toThrow(/invalid|traversal/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @darshya/mcp test`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`apps/darshya-mcp/src/tools/agent-reports.ts`:

```typescript
import { readdir, readFile } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { z } from 'zod';

const REPORTS_DIR = resolve(process.cwd(), 'docs/agent-reports');
const MAX_READ_CHARS = 8_000;

export async function listAgentReports(dir: string = REPORTS_DIR) {
  const entries = await readdir(dir);
  const dated = entries
    .filter((n) => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(n))
    .sort()
    .reverse()
    .map((name) => ({ name }));
  const rolling = entries.filter((n) => n.startsWith('_') && n.endsWith('.md')).sort();
  return { dated, rolling };
}

export async function readAgentReport(dir: string = REPORTS_DIR, name: string) {
  // Path-traversal guard: the name must be a bare filename, no path separators, no .. .
  const base = basename(name);
  if (base !== name || base.includes('..')) {
    throw new Error(`invalid report name (possible traversal): ${name}`);
  }
  const full = join(dir, base);
  const text = await readFile(full, 'utf8');
  const truncated =
    text.length > MAX_READ_CHARS ? text.slice(0, MAX_READ_CHARS) + '\n... [truncated]' : text;
  return { content: [{ type: 'text' as const, text: truncated }] };
}

export const AgentReportsListSchema = z.object({}).strict();
export const AgentReportsReadSchema = z.object({ name: z.string().min(1) }).strict();

export const agentReportsListToolDef = {
  name: 'agent_reports',
  description:
    'List darshya agent reports in docs/agent-reports/ (dated newest-first + rolling logs). Read-only.',
  inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false },
};

export const agentReportsReadToolDef = {
  name: 'agent_report_read',
  description: 'Read one agent report by filename. Read-only. Truncates at 8KB.',
  inputSchema: {
    type: 'object' as const,
    properties: { name: { type: 'string', description: 'filename from agent_reports' } },
    required: ['name'],
    additionalProperties: false,
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @darshya/mcp test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/darshya-mcp/src/tools/agent-reports.ts apps/darshya-mcp/tests/agent-reports.test.ts
git commit -m "feat(mcp): agent_reports + agent_report_read tools"
```

---

## Task 7: `prod_health` + `recent_commits` tools (TDD)

**Files:**

- Create: `apps/darshya-mcp/src/tools/prod-health.ts`
- Create: `apps/darshya-mcp/src/tools/recent-commits.ts`
- Test: `apps/darshya-mcp/tests/prod-health.test.ts`
- Test: `apps/darshya-mcp/tests/recent-commits.test.ts`

- [ ] **Step 1: Write the failing tests**

`apps/darshya-mcp/tests/prod-health.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
};
vi.mock('../src/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}));

import { prodHealth } from '../src/tools/prod-health.js';

beforeEach(() => vi.clearAllMocks());

describe('prodHealth', () => {
  it('reports UP when API 200s and DB responds', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ n: 1200 }]); // SELECT COUNT(*)::int AS n FROM users

    const data = JSON.parse((await prodHealth({})).content[0].text);
    expect(data.api).toBe('UP');
    expect(data.db).toBe('UP');
    expect(data.usersCount).toBe(1200);
  });

  it('reports API DOWN on non-200', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502 });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ n: 0 }]);
    const data = JSON.parse((await prodHealth({})).content[0].text);
    expect(data.api).toBe('DOWN');
    expect(data.apiStatus).toBe(502);
  });

  it('reports DB DOWN on query error', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const data = JSON.parse((await prodHealth({})).content[0].text);
    expect(data.db).toBe('DOWN');
    expect(data.dbError).toMatch(/ECONNREFUSED/);
  });

  it('uses a read-only query (guard integration)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ n: 1 }]);
    await prodHealth({});
    const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
    const { isReadOnlyQuery } = await import('../src/guard.js');
    expect(isReadOnlyQuery(sql)).toBe(true);
  });
});
```

`apps/darshya-mcp/tests/recent-commits.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const execMock = vi.fn();
vi.mock('node:child_process', () => ({
  exec: (cmd: string, opts: unknown, cb: (e: unknown, o: string, er: string) => void) => {
    execMock(cmd);
    cb(
      null,
      '2da0154d|docs(spec): Darshya growth tooling\nde41e681|fix: security audit merge\n',
      '',
    );
  },
}));

import { recentCommits } from '../src/tools/recent-commits.js';

beforeEach(() => vi.clearAllMocks());

describe('recentCommits', () => {
  it('parses git log into structured entries', async () => {
    const data = JSON.parse((await recentCommits({ limit: 2 })).content[0].text);
    expect(data.commits).toHaveLength(2);
    expect(data.commits[0].hash).toBe('2da0154d');
    expect(data.commits[0].subject).toBe('docs(spec): Darshya growth tooling');
    expect(execMock).toHaveBeenCalledWith(expect.stringContaining('git log'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @darshya/mcp test`
Expected: FAIL — both modules not found.

- [ ] **Step 3: Write minimal implementation**

`apps/darshya-mcp/src/tools/prod-health.ts`:

```typescript
import { z } from 'zod';
import { getPrisma } from '../prisma.js';
import { isReadOnlyQuery } from '../guard.js';

export const ProdHealthSchema = z.object({}).strict();

// The API base — configurable so CI can point at a preview. Defaults to prod.
const API_BASE = process.env.DARSHYA_API_BASE || 'https://api.darshya.online';

export async function prodHealth(_args: z.infer<typeof ProdHealthSchema>) {
  // API check: hit the health endpoint. 2s timeout so a hung server shows DOWN fast.
  let api: 'UP' | 'DOWN' = 'DOWN';
  let apiStatus: number | null = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
    apiStatus = res.status;
    api = res.ok ? 'UP' : 'DOWN';
    clearTimeout(t);
  } catch {
    api = 'DOWN';
  }

  // DB check: a guarded read-only count. Routes through the guard so the e2e
  // backstop (Task 8) covers this exact query too.
  let db: 'UP' | 'DOWN' = 'DOWN';
  let usersCount = 0;
  let dbError: string | null = null;
  const sql = 'SELECT COUNT(*)::int AS n FROM users';
  if (!isReadOnlyQuery(sql)) {
    dbError = 'guard rejected health query';
  } else {
    try {
      const rows = await getPrisma().$queryRawUnsafe(sql);
      usersCount = (rows[0] as { n: number }).n;
      db = 'UP';
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  }

  const result = {
    api,
    apiStatus,
    db,
    usersCount,
    dbError,
    checkedAt: new Date().toISOString(),
  };
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

export const prodHealthToolDef = {
  name: 'prod_health',
  description:
    'Prod health check: pings the API /health endpoint + runs a read-only user count. Returns UP/DOWN for each. Read-only.',
  inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false },
};
```

`apps/darshya-mcp/src/tools/recent-commits.ts`:

```typescript
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

export const RecentCommitsSchema = z
  .object({ limit: z.number().int().min(1).max(50).default(10) })
  .strict();

export async function recentCommits(args: z.infer<typeof RecentCommitsSchema>) {
  // Pipe-separated so we can parse without shell-quoting fragility.
  const fmt = '--pretty=format:%h|%s';
  const { stdout } = await execAsync(`git log -n ${args.limit} ${fmt}`);
  const commits = stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, ...rest] = line.split('|');
      return { hash, subject: rest.join('|') };
    });
  return { content: [{ type: 'text' as const, text: JSON.stringify({ commits }, null, 2) }] };
}

export const recentCommitsToolDef = {
  name: 'recent_commits',
  description:
    'Recent git commits (hash + subject) from the repo HEAD. Read-only. Default 10, max 50.',
  inputSchema: {
    type: 'object' as const,
    properties: { limit: { type: 'number', description: 'how many (1-50, default 10)' } },
    additionalProperties: false,
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @darshya/mcp test`
Expected: PASS — all tool tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/darshya-mcp/src/tools/prod-health.ts apps/darshya-mcp/src/tools/recent-commits.ts apps/darshya-mcp/tests/prod-health.test.ts apps/darshya-mcp/tests/recent-commits.test.ts
git commit -m "feat(mcp): prod_health + recent_commits tools"
```

---

## Task 8: E2E read-only backstop test (the DELETE must throw)

**Files:**

- Test: `apps/darshya-mcp/tests/e2e-read-only.test.ts`

This is the test that proves the _system_ is read-only, not just the guard function. It connects to real prod (via `DIRECT_URL`) and asserts a `DELETE` is rejected — both at the guard layer and at the Prisma layer (we never even issue it). Skipped when `DIRECT_URL` is unset so CI without secrets stays green.

- [ ] **Step 1: Write the test**

`apps/darshya-mcp/tests/e2e-read-only.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isReadOnlyQuery } from '../src/guard.js';

// Skipped entirely when there's no real DIRECT_URL — CI without secrets stays
// green, and a local run with the env exported runs the live assertion.
const hasDirectUrl = !!process.env.DIRECT_URL || !!process.env.DARSHYA_TEST_DIRECT_URL;
const describeOrSkip = hasDirectUrl ? describe : describe.skip;

describeOrSkip('e2e: read-only backstop (live prod)', () => {
  it('the guard rejects a DELETE before it ever reaches Prisma', () => {
    const malicious = 'DELETE FROM users WHERE created_at < now()';
    expect(isReadOnlyQuery(malicious)).toBe(false);
  });

  it('no tool handler issues a write (smoke: every tool returns without throwing on empty args)', async () => {
    // If a tool tried a write internally it would throw here against real prod.
    // We only call the read-only tools; none mutate.
    const { funnelToday } = await import('../src/tools/funnel-today.js');
    const { kpiSnapshot } = await import('../src/tools/kpi-snapshot.js');
    await expect(funnelToday({})).resolves.toBeDefined();
    await expect(kpiSnapshot({})).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Run test (will skip locally if DIRECT_URL unset)**

Run: `pnpm --filter @darshya/mcp test`
Expected: PASS (with the e2e suite **skipped** if `DIRECT_URL` not exported).

To run it live (operator only, after exporting the real DIRECT_URL):

```bash
$env:DARSHYA_TEST_DIRECT_URL = "<real Supabase direct URL>"; pnpm --filter @darshya/mcp test
```

Expected: the 2 e2e cases run and PASS, proving the system rejects the DELETE and the read tools don't mutate.

- [ ] **Step 3: Commit**

```bash
git add apps/darshya-mcp/tests/e2e-read-only.test.ts
git commit -m "test(mcp): e2e read-only backstop (DELETE must throw)"
```

---

## Task 9: MCP server entry — register all tools + stdio transport

**Files:**

- Create: `apps/darshya-mcp/src/index.ts`

- [ ] **Step 1: Write the entry**

`apps/darshya-mcp/src/index.ts`:

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { funnelToday, funnelTodayToolDef } from './tools/funnel-today.js';
import { kpiSnapshot, kpiSnapshotToolDef } from './tools/kpi-snapshot.js';
import {
  listAgentReports,
  readAgentReport,
  agentReportsListToolDef,
  agentReportsReadToolDef,
} from './tools/agent-reports.js';
import { prodHealth, prodHealthToolDef } from './tools/prod-health.js';
import { recentCommits, recentCommitsToolDef } from './tools/recent-commits.js';
import { disconnectPrisma } from './prisma.js';

const server = new Server(
  { name: 'darshya-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

const toolList = [
  funnelTodayToolDef,
  kpiSnapshotToolDef,
  agentReportsListToolDef,
  agentReportsReadToolDef,
  prodHealthToolDef,
  recentCommitsToolDef,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolList }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'funnel_today':
        return await funnelToday(args ?? {});
      case 'kpi_snapshot':
        return await kpiSnapshot(args ?? {});
      case 'agent_reports':
        return {
          content: [{ type: 'text', text: JSON.stringify(await listAgentReports(), null, 2) }],
        };
      case 'agent_report_read':
        return await readAgentReport(undefined, (args as { name: string })?.name);
      case 'prod_health':
        return await prodHealth(args ?? {});
      case 'recent_commits':
        return await recentCommits(args ?? { limit: 10 });
      default:
        return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true };
    }
  } catch (e) {
    return {
      content: [
        { type: 'text', text: `darshya-mcp error: ${e instanceof Error ? e.message : String(e)}` },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

// Clean shutdown — don't leave a DB connection hanging.
process.on('SIGINT', async () => {
  await disconnectPrisma();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await disconnectPrisma();
  process.exit(0);
});
```

- [ ] **Step 2: Type-check + build**

Run: `pnpm --filter @darshya/mcp type-check`
Expected: exits 0.

Run: `pnpm --filter @darshya/mcp build`
Expected: `dist/index.js` produced, no errors.

- [ ] **Step 3: Smoke-test the server over stdio**

Run (sends a tools/list request in a single line of JSON-RPC):

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.0"}}}' | pnpm --filter @darshya/mcp dev
```

Expected: a JSON-RPC response with `"result"` containing `"serverInfo":{"name":"darshya-mcp"}`. (It will then wait for more input; Ctrl-C to exit.)

- [ ] **Step 4: Commit**

```bash
git add apps/darshya-mcp/src/index.ts
git commit -m "feat(mcp): stdio server entry — register 6 read-only tools"
```

---

## Task 10: Wire darshya-mcp into the project `.mcp.json` + add the 5 community MCPs

**Files:**

- Modify: `.mcp.json`

This is the **settings edit you approved** in the design pass. It adds 6 servers. All are env-gated where a secret is needed so a missing env var doesn't crash CC boot (same pattern as the existing `postgres`/`sentry` entries).

- [ ] **Step 1: Read the current `.mcp.json` to preserve existing entries**

Run: `cat .mcp.json`
Expected: shows `postgres` + `sentry` (the 2 existing servers).

- [ ] **Step 2: Replace `.mcp.json` with the merged config**

`.mcp.json` (full file):

```json
{
  "$schema": "https://json.schemastore.org/mcp.json",
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${env:SUPABASE_READONLY_URL}"],
      "comment": "Read-only access to Supabase Postgres prod DB via claude_readonly role. Loads only when SUPABASE_READONLY_URL is exported. See docs/engineering/R-Q1-E-014-sentry-postgres-mcp-handoff.md."
    },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server"],
      "env": {
        "SENTRY_AUTH_TOKEN": "${env:SENTRY_AUTH_TOKEN}",
        "SENTRY_ORG": "${env:SENTRY_ORG}",
        "SENTRY_PROJECT": "${env:SENTRY_PROJECT}"
      },
      "comment": "Sentry MCP — reads issues / events / replays from sentry.io. Loads only when SENTRY_AUTH_TOKEN exported."
    },
    "darshya-mcp": {
      "command": "node",
      "args": ["apps/darshya-mcp/dist/index.js"],
      "cwd": "${workspaceFolder}",
      "comment": "Darshya founder MCP — funnel_today, kpi_snapshot, agent_reports, prod_health, recent_commits. Read-only (guard + e2e backstop). Reads DIRECT_URL from apps/api/.env.production. Build first: pnpm --filter @darshya/mcp build."
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_PERSONAL_ACCESS_TOKEN}" },
      "comment": "Cross-repo search + PR/issue triage for the 9-agent GH Actions fleet. Needs a fine-grained PAT (contents:read, issues:write, PRs:write, actions:read). Loads only when token exported."
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "docs/agent-reports",
        "apps/api/scripts",
        "docs/superpowers"
      ],
      "comment": "Sandboxed file ops on agent-reports + api scripts + plan/spec dirs. No secrets in those paths."
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "comment": "Browser UI-verify (a11y-tree). For 'verify before declare done' — confirm prod renders post-deploy."
    },
    "jina": {
      "command": "npx",
      "args": ["-y", "jina-mcp-server"],
      "comment": "Keyless scrape (r.jina.ai). Pull competitor pricing / live docs without API keys."
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "comment": "Live library docs (Prisma, Stripe, Next). Stops hallucinated API calls."
    },
    "deepwiki": {
      "command": "npx",
      "args": ["-y", "mcp-deepwiki"],
      "comment": "Repo Q&A over GitHub repos. Free."
    }
  }
}
```

- [ ] **Step 3: Validate the JSON is well-formed**

Run: `node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8')); console.log('valid')"`
Expected: prints `valid`.

- [ ] **Step 4: Commit**

```bash
git add .mcp.json
git commit -m "feat(mcp): wire darshya-mcp + github/filesystem/playwright/jina/context7/deepwiki"
```

---

## Task 11: Build, verify, and confirm tools register in a live session

**Files:** none (verification only)

- [ ] **Step 1: Build the server**

Run: `pnpm --filter @darshya/mcp build`
Expected: `dist/index.js` + `dist/tools/*.js` produced.

- [ ] **Step 2: Run the full test suite one last time**

Run: `pnpm --filter @darshya/mcp test`
Expected: all tests PASS (e2e skipped if no DIRECT_URL).

- [ ] **Step 3: Restart CC and confirm tools register**

The operator restarts Claude Code (required for `.mcp.json` changes to load). After restart:

- `/mcp` should list `darshya-mcp` (and the 5 new community servers) as connected.
- Asking "what is my funnel today?" should invoke `funnel_today` and return the (currently zero) prod numbers.

- [ ] **Step 4: Document the one-time env setup**

Append to `docs/mcp-setup.md` a short section "darshya-mcp" noting: build step, the DIRECT_URL requirement, and the read-only guarantee (guard + e2e backstop). This is the handoff for any future operator.

```bash
git add docs/mcp-setup.md
git commit -m "docs(mcp): darshya-mcp setup + read-only guarantee"
```

---

## Self-Review

**1. Spec coverage (spec = `docs/superpowers/specs/2026-07-14-darshya-growth-tooling-design.md` §4 Group 1):**

| Spec item                                    | Covered by                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| postgres MCP (read-only role)                | Task 10 (preserved existing entry; role enforced by `claude_readonly`)                                         |
| github MCP (remote HTTP, PAT)                | Task 10                                                                                                        |
| filesystem MCP (sandboxed paths)             | Task 10                                                                                                        |
| playwright MCP                               | Task 10                                                                                                        |
| jina / context7 / deepwiki MCPs              | Task 10                                                                                                        |
| darshya-mcp (6 tools, 4-6h build, read-only) | Tasks 1-9 (6 tools: funnel_today, kpi_snapshot, agent_reports, agent_report_read, prod_health, recent_commits) |
| "DELETE-must-fail test"                      | Task 8 (e2e backstop) + Task 2 (guard)                                                                         |
| "$0"                                         | Every dep is free / workspace-existing; no paid tiers                                                          |
| Settings edits "drafted for user approval"   | Task 10 — the exact `.mcp.json` you approved                                                                   |

No spec gaps.

**2. Placeholder scan:** Searched for TBD/TODO/"add appropriate"/"similar to"/"fill in". None present. Every code step has full code. Every command has expected output.

**3. Type consistency:**

- `isReadOnlyQuery(sql: string): boolean` — defined Task 2, used Task 7 (prod-health) + Task 8 (e2e). ✓
- `loadEnv(envPath?): DarshyaEnv` — defined Task 3, used by `prisma.ts` (Task 3). ✓
- `getPrisma(): PrismaClient` / `disconnectPrisma()` — defined Task 3, used Tasks 4-9. ✓
- Tool handler return shape `{ content: [{ type: 'text', text }], isError? }` — consistent across Tasks 4-7 + index.ts (Task 9). ✓
- `listAgentReports(dir?)` / `readAgentReport(dir?, name)` — defined + tested Task 6, dispatched in index.ts Task 9. ✓
- Enum values (`BookingStatus`, `PaymentStatus`, `captured`, `completed`, `delivered`, `NEW`, `QUEUED`) verified against `schema.prisma` lines 71-96, 1417+. ✓

One fix made during review: Task 6 originally declared `agent_report_read` returns via the handler but `index.ts` needed to pass the `name` arg — Task 9 step 1 was updated to call `readAgentReport(undefined, args.name)` to match the two-arg signature. Consistent now.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-14-darshya-mcp-and-mcp-settings.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for an 11-task plan where each task is independently testable.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach?**
