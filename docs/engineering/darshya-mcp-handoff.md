# Darshya MCP Server — Engineering Handoff

**Status:** Shipped (branch `fix/audit-remediation-p0-p3`, awaiting PR merge)
**Date:** 2026-07-14
**Package:** `apps/darshya-mcp` (`@darshya/mcp`)
**Spec:** `docs/specs/darshya-growth-tooling-gtm-spec.md`
**Plan:** `docs/plans/darshya-mcp-implementation-plan.md`

## What this is

An in-house MCP (Model Context Protocol) server that gives Claude Code 6 read-only tools to inspect Darshya's prod state — funnel, KPIs, agent reports, prod DB health, and recent git history. It runs over stdio and is registered in `.mcp.json` so Claude Code loads it automatically.

The server is **read-only by construction**: a SQL guard (`guard.ts`) rejects any non-SELECT statement before it reaches the DB, path-traversal is blocked in the file-system tool, and the one shell-out tool uses `execFile` with an args array (no shell). No write/mutation capability exists anywhere in the package.

## The 6 tools

| Tool                | What it does                                                                               | Data source                        |
| ------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `funnel_today`      | Today + last-7d signups, bookings by status, captured revenue INR, donations INR           | Prisma (prod DB)                   |
| `kpi_snapshot`      | All-time users/completed-bookings/lifetime-revenue, 7d deltas, active subs, pipeline leads | Prisma (prod DB)                   |
| `agent_reports`     | List up to 50 agent-report `.md` files (recursive, newest-first)                           | filesystem (`docs/agent-reports/`) |
| `agent_report_read` | Read one report by relative path (truncates >10k chars)                                    | filesystem                         |
| `prod_health`       | Row counts for users/puja_bookings/payments/donations                                      | Prisma raw SQL (guarded)           |
| `recent_commits`    | Last N git commits (sha/author/date/subject)                                               | `git log` via `execFile`           |

## How to use it

### One-command smoke check

```bash
pnpm mcp:smoke
# builds @darshya/mcp + asserts the server responds with all 6 tools
```

### Register with Claude Code

The `darshya` entry is already in `.mcp.json`. It points at the **built** server (`apps/darshya-mcp/dist/index.js`), so you must build once before Claude Code can load it:

```bash
pnpm --filter @darshya/mcp build
# then restart Claude Code (or /mcp) to pick up the new server
```

The server reads `DIRECT_URL` from the env (mapped from `${env:SUPABASE_READONLY_URL}` in `.mcp.json`). If that env var isn't exported, `loadEnv()` falls back to parsing `apps/api/.env.production`.

### Run the server directly

```bash
pnpm --filter @darshya/mcp dev    # tsx (no build needed)
pnpm --filter @darshya/mcp start  # built dist
```

## Architecture

```
apps/darshya-mcp/src/
├── index.ts            # stdio Server wiring — registers all 6 tools, SIGINT/SIGTERM cleanup
├── env.ts              # loadEnv(): DIRECT_URL from process.env, fallback to .env.production
├── prisma.ts           # singleton PrismaClient (read-only by usage, not role)
├── guard.ts            # isReadOnlyQuery(): 18 write-keyword blocklist + comment/str strip
└── tools/
    ├── funnel-today.ts
    ├── kpi-snapshot.ts
    ├── agent-reports.ts     # both list + read share safeResolve()
    ├── prod-health.ts       # the ONLY $queryRawUnsafe path — routed through guard first
    └── recent-commits.ts    # execFile (not exec) — args array, no shell
```

## Security model

1. **SQL guard (`guard.ts`)** — `isReadOnlyQuery(sql)` strips SQL comments + string literals, then rejects if any of 18 write keywords appear (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `GRANT`, `REVOKE`, `CREATE`, `MERGE`, `CALL`, `INTO`, `COPY`, `COMMENT`, `REFRESH`, `REINDEX`, `VACUUM`, `CLUSTER`). Every `$queryRawUnsafe` call routes through it first (defense in depth — the only raw-SQL tool uses a hardcoded literal, but a future interpolated edit would be caught).
2. **Path traversal (`safeResolve` in agent-reports.ts)** — rejects absolute paths AND any path where `relative(root, join(root, rel))` starts with `..`. Audited adversarially: traversal, embedded `..`, backslashes, URL-encoding, and null-byte injection all blocked (the last by Node's fs layer). No input reads outside `docs/agent-reports/`.
3. **Shell injection (`recent-commits.ts`)** — uses `execFile('git', [...args])`, not `exec(string)`. Args never hit a shell. `count` is Zod-validated `int().positive().max(50)` so it carries no metacharacters; the array form keeps it safe even if a string arg is added later.
4. **No secret egress** — the server only reads DB rows + local files + git log. It never writes, never calls out to external services, never prints credentials.

## Verification performed

Every claim above was verified against live prod, not just unit tests:

- **`prod_health`** live: `users:32, puja_bookings:6, payments:1, donations:0` (matches real `COUNT(*)` exactly).
- **`funnel_today`** live: today/7d signups/bookings/revenue all 0 (consistent — no captured payments, no bookings today).
- **`kpi_snapshot`** live: `totalUsers:32` (matches prod_health), `completedBookings:0`, `lifetimeRevenueInr:0`, `activeSubscriptions:0`, `pipelineLeads:19` (real lead pipeline).
- **`agent_reports` / `agent_report_read`**: security audit planted an out-of-root secret file; zero probes retrieved it.
- **`recent_commits`**: Zod-cap test proves `count: 999/0/negative/non-integer/"5; rm -rf /"` are all rejected before the process is spawned.
- **Server boots**: `pnpm mcp:smoke` spawns the server, does the MCP handshake, and asserts all 6 tool names return from `tools/list`.

## Test suite

49 tests, 7 files, all green. `pnpm --filter @darshya/mcp test`.

| File                     | Tests | Covers                                                                                 |
| ------------------------ | ----- | -------------------------------------------------------------------------------------- |
| `guard.test.ts`          | 25    | 18 write keywords rejected, false-positive guards (e.g. `comment_count` allowed)       |
| `agent-reports.test.ts`  | 7     | recursive list, subdir read, truncation, traversal-reject, absolute-reject, not-found  |
| `recent-commits.test.ts` | 6     | pipe-parse, args-array, count-reflection, Zod-cap injection-safety, git-failure, empty |
| `env.test.ts`            | 3     | DIRECT_URL from env, fallback to .env.production, missing both                         |
| `prod-health.test.ts`    | 4     | counts, guard-routing, reltuples-regression, db-failure                                |
| `funnel-today.test.ts`   | 2     | happy path (all metrics + enum locks), empty-prod zeros                                |
| `kpi-snapshot.test.ts`   | 2     | happy path (7 metrics + 3 enum filters), empty-prod zeros                              |

## Commits on this branch (MCP work)

```
5242ccce fix(mcp): prod_health use real COUNT(*) not stale reltuples estimate
0dae7186 feat(mcp): mcp:smoke script + register darshya server in .mcp.json
7fa30d2b feat(mcp): stdio server wiring all 6 tools + guard hardening
19ea8012 harden(mcp): recent_commits exec -> execFile (defense in depth)
064bb3ce feat(mcp): prod_health + recent_commits tools
cec0bc5d feat(mcp): agent_reports + agent_report_read tools
e58f6b21 feat(mcp): kpi_snapshot tool
6bca51ea feat(mcp): funnel_today tool
9af44af0 feat(mcp): env loader + read-only Prisma client
755ddc2c feat(mcp): read-only SQL guard + tests
b92ae67c feat(mcp): scaffold @darshya/mcp package
```

Each tool was built TDD (test red → implement → green) and reviewed by a second agent for spec compliance + code quality + (for the security-sensitive tools) an adversarial audit.

## Known gaps / follow-ups

1. **Read-only DB role not wired.** The `.mcp.json` maps `DIRECT_URL` from `SUPABASE_READONLY_URL` (the `claude_readonly` role), but if that env var isn't exported the server falls back to the **owner** `DIRECT_URL` in `.env.production`. Read-only is currently enforced by `guard.ts` + hardcoded SELECTs, not the DB role. Follow-up: ensure `SUPABASE_READONLY_URL` is exported in the Claude Code environment so the DB itself rejects any write (belt + suspenders). See `docs/engineering/R-Q1-E-014-sentry-postgres-mcp-handoff.md` for the readonly-role setup.
2. **`recentCommits` return type is `Promise<unknown>`** — the `new Promise((resolve) => ...)` has no type param (pre-existing from Task 7). Harmless (the registry types it loosely + try/catch wraps it), but a future tighten-up could add the explicit return type.
3. **No CI gate on `mcp:smoke` yet.** The script exists (`pnpm mcp:smoke`) but isn't wired into `.github/workflows`. Follow-up: add it as a CI step so a broken server build fails the PR.

## Why this matters for revenue

The spec (`docs/specs/darshya-growth-tooling-gtm-spec.md`) frames these tools as the founder's real-time pulse on the funnel: how many signups today, how much captured revenue, how many leads in the pipeline, is prod up. Before this, answering "how is the business doing right now?" meant running ad-hoc SQL. Now it's a single MCP tool call from inside Claude Code — which is the first step in the GTM loop (measure → decide → act). The live numbers confirm the funnel is currently at zero revenue and 19 pipeline leads, which is the real starting position the GTM plan must move.
