# Deploy plan + branch analysis — 2026-08-14

**Read with `SESSION-STATE.md` and `LEDGER.json`.** This file exists because the
branch situation is non-obvious and getting it wrong would revert live fixes.

---

## The branch situation (analysed 2026-08-14, do not re-derive)

Working branch: **`feat/recurring-razorpay-planid`** — 12 ahead of `origin/main`,
**36 behind**.

### The 36 commits main has that we don't

| What | Files |
|---|---:|
| `graft/**` — the code-graph cache, which is *supposed* to be gitignored but was committed to main | **1,424** |
| `docs/agent-reports` + `docs/roadmap` — automated cron output | 126 |
| **Real source under `apps/` + `packages/`** | **112** |

Of the 36 commits, **34 are automated cron** (`chore(agents): daily fleet run`,
`roadmap: orchestrator cycle … (dryrun)`, `health smoke`). Only two are real:

- **`1715d4d6`** `fix(api): close audit findings, remove stripe, fix commission ledger P0s`
- `515dbae7` `cxo: weekly advisory 2026-W33 [skip ci]`

### The important part: `1715d4d6` is NOT in our history — but its CONTENT is

`git merge-base --is-ancestor 1715d4d6 HEAD` → false.

That looks alarming (TASKS.md records `1715d4d6` as deployed and live-verified)
but it is a **squash artefact**, not missing work. The same engagement exists on
this branch as its own commits:

```
61b52fb8  chore(audit): full E2E audit + 50 of 58 findings fixed
b338e4aa  fix(api): close audit findings, remove stripe, fix commission ledger P0s
c11d50a2  chore(deps): drop stripe packages from the lockfile
c75fb12d  fix(api): close batch-9 review findings, auth timeouts, ledger integrity
```

`b338e4aa` carries the *identical commit message* to `1715d4d6` under a
different SHA — main squashed what this branch kept unsquashed.

**Verified, not assumed:** `apps/api/src/lib/commission-math.ts` is
**byte-identical** (2,944 bytes) on both sides.

### Money-file comparison, ours vs main

| Verdict | Count | Meaning |
|---|---:|---|
| identical | 6 | add/add, resolves trivially |
| ours is a strict superset | 2 | main's content plus our later waves |
| genuinely diverged | 8 | ours has 4 further waves on top of the same base |

The 8 "diverged" files (`payment.service`, `payout.service`, `refund.service`,
`payout-requests`, `CommissionsPanel`, `/pricing`, `/refunds` and their tests)
diverge because **this branch carries four remediation waves main never saw** —
not because main has a fix we lack. Every divergence is additive on our side.

### Merge strategy (decided)

1. `git merge origin/main` into the working branch.
2. Conflict resolution rule:
   - `apps/**`, `packages/**` → **prefer OURS**. Our side is main's content plus
     223 further fixes. Taking theirs would revert audited work.
   - `docs/roadmap/**`, `docs/agent-reports/**`, `graft/**` → **take THEIRS**.
     Cron output; we have no opinion.
   - `apps/api/prisma/schema.prisma` → **OURS**, then re-verify migrations list.
3. After merging, re-run `tsc` on all three apps and the full suites. A green
   merge that reverts a fix is the failure mode to guard against, so spot-check
   the two load-bearing invariants explicitly (see SESSION-STATE).

---

## Deploy sequence

Render `autoDeploy` is **false** on both services. Deployment is manual.

| Step | Command / action |
|---|---|
| 1 | Merge `origin/main` per the rule above; resolve; tsc + full suites green |
| 2 | Push branch; open PR; **commitlint runs on every PR and is the one gate never skipped** |
| 3 | Merge to `main` once CI is green (no branch protection — convention only) |
| 4 | Deploy API: `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d7mc2n8sfn5c73dfce0g` — read the note under this table before adding any other input |
| 5 | **Apply pending migrations by hand, then verify.** From `apps/api`: `set -a && . ./.env.production && set +a`, then `DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy`. Confirm with `npx prisma migrate status` → "Database schema is up to date!". Read the note under this table first |
| 6 | **Redeploy the API** so it boots against the migrated schema (client regen) |
| 7 | Deploy web: same workflow, `sid=srv-d970l2ks728c738fc33g` |
| 8 | Live-verify — curl prod endpoints, load key pages, check the deploy log. Never claim green from a summary field |

#### On steps 4 and 7 — what actually selects the code that ships

Render deploys the branch the service tracks. Until 2026-09-09 step 4 passed a
`branch` input — and step 7 says "same workflow", so it inherited one — which
read as though it pinned what would ship. It does not: the input is DEPRECATED
and Render IGNORES it, and `.github/workflows/render-diag.yml` says exactly that
in the input's own description. Under an outage the gap between "I pinned it"
and "I pinned nothing" is the gap between rolling back and redeploying the
broken HEAD, which is why the input is gone from the command rather than merely
annotated beside it.

The lever that does select what ships is `-f commit=<SHA>`, appended to the same
dispatch. Empty means tracked-branch HEAD. That same input is the rollback —
procedure in `docs/runbooks/prod-rollback.md`, which owns it.

#### On step 5 — a green deploy is not evidence that a migration ran

This step said the opposite until 2026-09-09: "NOT NEEDED — `prisma migrate
deploy` DOES run on every API boot". The repo configuration does say that.
`render.yaml:21` starts `pnpm --filter @poojly/api start`,
`apps/api/package.json:10` is `prisma migrate deploy && node dist/server.js`,
and `apps/api/Dockerfile:66` carries the same command. The deployed service does
not behave that way. Measured 2026-09-08, twice — the second run pinned to a SHA
to rule out a branch mismatch: Render polled to live, `/health` returned
`db: ok`, and the same three migrations were still pending afterwards.
Re-measured 2026-09-09 directly from `_prisma_migrations`, their `finished_at`
timestamps are those of the manual run, not of either deploy. Why the live start
path skips it is not yet pinned; the full measurement, and the causes already
ruled out, are recorded in `TASKS.md` under "Deploy/migrate procedure".

The failure mode is therefore not a crash-loop but a silent no-op: the deploy
reports green, the schema never moves, and the new code 500s at runtime on
columns that were never created. Apply first, confirm with `migrate status`, and
only then treat step 6 as the thing that picks the schema up.

### Pending migrations

**Do not take a fixed list from this page.** Written on 2026-08-14, this section
named `20260813000000_scal03_growth_table_indexes` as *the* migration to watch.
As of 2026-09-09 `apps/api/prisma/migrations/` holds 44 migrations, 10 of them
created after that one, so "the pending migration" is no longer a single thing
and this page is not the source of truth for which are unapplied.

Ask the database, using `DIRECT_URL` from `.env.production` and not the pooled
URL:

```bash
cd apps/api && npx prisma migrate status
```

`apps/api/scripts/verify-migration-objects.mjs --unexecuted` is **not** a pending
check and must not be read as one: it lists ledger rows whose
`applied_steps_count` is 0, most of which are fully applied. Measured 2026-09-09
it reported 6 and exited non-zero while the genuinely pending count was 0. Use
it only to ask whether specific objects already exist, which is the usual killer
(42P07 / 42701 "already exists"). `migrate status` is the one to trust.

The original note still holds for `scal03` itself: nine indexes on the growth
tables, non-destructive, `IF NOT EXISTS`, and **proven to apply inside a single
transaction** against the local stack, so it will not hit the 25001
CONCURRENTLY trap that blocked this repo's migrations for two months.

### Post-deploy owner check — PM-03 (pandit commission rate)

`prisma/seed.ts` wrote `commissionRate: 0.70` on the priest `create:` branch
until 2026-08-28. That literal is now removed, so the `@default(0.80)` column
default applies to every newly-seeded pandit. But the removal is **not
retroactive**, and migration `20260812000000_priest_commission_rate_80` cannot
help: it already ran, and on a database that was seeded *after* it ran its
backfill `UPDATE` matched zero rows.

No blanket backfill migration is shipped for this on purpose. `PATCH
/admin/priests/:id/commission-rate` is a real, owner-authenticated write path,
so `0.70` in that column can legitimately mean "negotiated", and a migration
that rewrote every 0.70 row would silently overwrite a deal the owner made.

Once prod is restored, **read before writing**:

```sql
-- 1. Who is below the 80% default, and were they ever negotiated?
SELECT p.id, u.email, p.commission_rate, p.created_at
FROM priests p JOIN users u ON u.id = p.user_id
WHERE p.commission_rate < 0.80
ORDER BY p.created_at;
```

Rows whose email is one of the three seeded demo pandits, or that predate any
`admin_audit_log` entry for a commission-rate change, are seed artefacts and
should be corrected:

```sql
-- 2. Only after confirming step 1. Name the ids explicitly; do NOT run this
--    as a blanket `WHERE commission_rate = 0.70`.
UPDATE priests SET commission_rate = 0.80 WHERE id IN (...);
```

Any commission rows already stamped at the old rate stay as they are —
`Commission.percentage` is immutable by design and reconciliation depends on it.

### Post-deploy owner check — PF-04 (dead avatar host)

`prisma/seed.ts` wrote two `https://images.darshya.online/priests/*.jpg` URLs
into `priests.avatar_url`. That hostname has no DNS record. Both are now `null`
in the seed, and every avatar surface falls back on `onError` as well as on
absence, so the broken-image icon is gone either way — but the seed's `update:`
branch does not touch `avatar_url`, so **existing rows keep the dead URL**.

Once prod is restored:

```sql
-- Expect 2 rows.
SELECT id, display_name, avatar_url FROM priests
WHERE avatar_url LIKE 'https://images.darshya.online/%';

UPDATE priests SET avatar_url = NULL
WHERE avatar_url LIKE 'https://images.darshya.online/%';
```

**Do not "fix" this with a DNS record alone.** No origin in this project serves
`/priests/*.jpg`, so a CNAME would resolve and then 404 — the broken image
survives. If real headshots are wanted, upload them to the Supabase Storage
public bucket (`**.supabase.co` is already in `next.config.ts` remotePatterns)
and store those URLs.

### Cost discipline

**A push builds nothing.** Both Render services carry `autoDeploy: false`
(`render.yaml:28` API, `:60` web), so merging to `main` costs zero build minutes
and changes nothing in production until step 4 dispatches a deploy by hand.
This section previously read "One push = one Render web build + one API build";
that was true before the 2026-07-08 Render cutover and false after it. The June
burn it cites was real — ~120 commits back when a push did build — but batching
is now review hygiene, not a cost control. The spend that still exists is the
dispatched deploy itself, so the discipline that still pays is dispatching once
per intended change rather than per commit.

---

## Sweep coverage gap — `launch-readiness-delta` was INCOMPLETE

Agent accounting across the four sweep workflows:

| Workflow | Dispatched | Area blocks returned | Consolidated brief |
|---|---:|---:|---|
| `authenticated-deep` | 12 | 11 | yes — `36/100 NO-GO` |
| `scale-mindset` | 10 | 9 | yes — `33/100` |
| `prod-clickthrough` | 3 | **3** | n/a — **COMPLETE** |
| `launch-readiness-delta` | 7 | **5** | **none** — **INCOMPLETE** |

For the first two, the 1-agent shortfall is the Consolidate step and both briefs
are in the harvest file. `launch-readiness-delta` has **no brief at all**, so
even crediting one agent to a consolidate that never emitted, **at least one
area agent was lost** — to the session limit that killed 30 of 38 agents during
that run. Its transcripts are gone, so the missing area cannot be identified.

It returned: provider-journeys, devotee-funnel, commerce-temple-gaushala, and
pricing-market twice. Its stated scope was "provider journeys, devotee funnel,
commerce, pricing against the market".

**Consequence:** the true defect count was probably HIGHER than 388, not lower —
consistent with everything found off-sweep this session (`/store` at 29 MB was
never audited; the "Showing 33 of 22 temples" bug came from the owner, not the
sweep).

**Action:** the final before/after re-run must give `launch-readiness-delta` its
full 7 agents. That run is coverage repair, not only delta measurement.

---

## Wave sequencing that worked (and why)

Lanes must be drawn around **shared files**, not area names. 33 of the 102
partials existed purely because a fix crossed a lane boundary — self-inflicted
by over-narrow lanes. The fix was to give ONE agent exclusive repo-wide access
to page-level styling while nothing else ran, then fan out.

Two agents writing the same file do not merge; the second write silently
discards the first. This is the single most expensive mistake available here.
