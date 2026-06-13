# 40-Item Sequential Ship Loop — Design

Date: 2026-06-13
Status: Approved (sequential single-file model)
Driver: Workflow tool, opus subagents
Scope: Bhaktisetu roadmap dryrun queue (65 raw items, dedup ~30, top-up from in_progress items to 40)

## Goal

Ship next 40 roadmap items in single autonomous run. One item per subagent, full TDD + verify + commit + PR per item, sequential (no file conflicts).

## Why sequential

User picked sequential (vs parallel waves) because:
- Bhaktisetu monorepo has shared mutation hotspots: `apps/api/src/server.ts` route registry, `apps/api/prisma/schema.prisma`, `apps/web/middleware.ts`. Parallel agents collide on these.
- Recent commit log shows agents-on-cron already produce churn; adding 8-wide parallel layer risks merge conflicts.
- Tradeoff: wall-clock ~40 × 4 min = 160 min vs ~30 min parallel. Acceptable.

## Item selection (40 of 65)

### Step 1: dedup queue
Group `docs/roadmap/_dryrun/queue/*.md` by embedded roadmap ID (regex `R-Q[1-4]-[A-Z]+-\d+|SIDE-FIX-[A-Z0-9-]+|META-[A-Z-]+`). Keep latest timestamp per ID. Yields ~30 unique items.

### Step 2: exclude
- IT-001 (in-flight background)
- P-007 (shipped, PR #2)
- Anything `status: shipped` in source `docs/roadmap/items/**`

### Step 3: top up to 40
Pull from `docs/roadmap/items/**` `status: in_progress`, sort by:
1. Priority P0 > P1 > P2
2. `est_hours` ascending (small items first — fast wins, low risk)
3. Category diversity (avoid 10 sales items back-to-back; round-robin)

### Step 4: persist
Write to `docs/roadmap/_ship-batch-2026-06-13.json`:
```json
[{"id": "R-Q1-IT-002", "queueFile": "...", "category": "it", "priority": "P0", "estHours": 3, "specPath": "..."}, ...]
```

## Architecture

```
Workflow (driver)
  ├─ phase 1: build batch JSON (1 agent, runs scripts/ship-batch-build.mjs)
  ├─ phase 2: ship items (40 sequential agents, 1 per item)
  └─ phase 3: report (1 agent: summarize ship log, count green/red, list founder-action PRs)
```

### Subagent contract (per-item)
Input: full queue-item spec text + survey cheat sheet + global conventions block (commit format, trailer pattern, branch naming, [skip ci] rule).

Owns end-to-end:
1. Create feature branch: `<category>/<ROADMAP-ID>-<slug>`
2. Read spec carefully, identify files
3. TDD: tests RED first
4. Implement
5. Verify: tests GREEN + `tsc --noEmit` + lint where present
6. Build (if web/api code changed)
7. Commit (conventional, with trailer)
8. Push branch
9. `gh pr create` with labels per spec
10. Return JSON: `{itemId, sha, prUrl, status: 'green'|'red'|'partial', deviations, founderAction}`

### Failure modes
- Spec test never goes red → log warning, continue
- Implementation tsc fail → retry once with fix; second fail → push WIP branch w/ name `wip/<id>`, log RED, continue
- gh pr create fail (auth, existing) → log URL of branch on github.com/<repo>/tree/<branch>, mark partial
- Merge conflict on push → `git fetch + rebase main + push`; if conflict, abort item, log, continue
- Subagent throws → driver catches null, logs FAIL, continues

## File-conflict guard

Sequential model means only one writer at a time, but loop spans hours. Each subagent:
- `git fetch origin && git rebase origin/main` before opening PR
- If rebase conflict → abort item (better than corrupt push)

## Output artifacts

- `docs/roadmap/_ship-batch-2026-06-13.json` — selected 40
- `docs/roadmap/_ship-log-2026-06-13.md` — appended per item: `| id | status | sha | pr | minutes | deviations |`
- Phase 3 summary in workflow return value (counts, founder-action list, failures)

## Out of scope

- No production deploy
- No Cloudflare Pages push for docs-only changes ([skip ci] tag)
- No KPI metadata edits unless spec explicitly demands
- No worktrees (sequential ⇒ unnecessary)
- No DB migration application against prod (dev `prisma migrate dev` only if spec demands; never `db push` to prod)

## Budget

- Per item: ~25-40k output tokens (varies by spec complexity)
- 40 items: ~1.2-1.6M tokens
- Wall: ~3 hours total (4-5 min per item × 40)
- Driver overhead: ~10k tokens

## Risk mitigation

1. **Stash WIP first** — done (`WIP-pre-3item-ship-2026-06-13`)
2. **Stop on 3 consecutive infra failures** — driver tracks; if 3 in row fail at `git push` or `gh` layer, halt + report (likely auth/network)
3. **Smoke-test first 2** — after items 1-2, driver checks both have valid SHAs + PR URLs; if both fail, halt before burning remaining 38
4. **Branch hygiene** — never touch main directly; all work on feature branches
5. **No --no-verify** on commits; never bypass hooks

## Test plan (for the driver itself)

- Dry-run mode: run with `args: {dryRun: true}` → builds batch JSON, picks 1 item, runs full subagent, then halts. User confirms output before unleashing 40.
- (Skipped by user explicit "ship and go" — but driver supports it for next time.)

## Success criteria

- 40 items processed (green OR red logged; no silent skip)
- All green items have: commit SHA, PR URL, tests passing, conventional commit message, trailer present
- Ship log committed to repo
- Final summary lists: count green, count red, count founder-action-required, count partial
- Repo `main` untouched throughout

## References

- Queue: `docs/roadmap/_dryrun/queue/*.md`
- Roadmap items source: `docs/roadmap/items/**/*.md`
- Survey cheat sheet: embedded in subagent prompts (Fastify, vitest, Tailwind v4, no PR template, conventional commits)
- Sister docs: `docs/specs/festival-pre-sale-v1.md` (PR #2, just shipped)
