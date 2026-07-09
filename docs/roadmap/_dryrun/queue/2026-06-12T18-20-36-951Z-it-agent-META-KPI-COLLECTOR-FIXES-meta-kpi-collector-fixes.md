---
queueId: Q-C-20260612T1820-META-KPI-FIXES
itemId: META-KPI-COLLECTOR-FIXES
role: it-agent
emittedAt: 2026-06-12T18:20:00.000Z
cycle: C-20260612T1820
priority: P0
estTokens: 4500
estMinutes: 45
consumedAt: 2026-07-07T08:27:18Z
consumedBy: claude-code
consumedInSessionId: unknown-session
featureFlag: null
prFlag: true
founderActionRequired: false
scopeNote: |
  META side-deliverable per master-orchestrator briefing.
  Unblocks future cycle decisioning. Orchestrator currently flying blind
  because nearly all KPIs return TBD or shell errors.
---

# /goal Fix top 10 broken KPI collectors — unblock orchestrator decisioning

## context
caveman: orchestrator brain blind. KPI commands either say `TBD-populate-before-orchestrator-go-live` or have malformed shell (unescaped parens, missing files). pick top 10 broken, fix the 5 most revenue-relevant with real commands, document rest.

## deliverable
single file: `docs/observability/kpi-collector-fixes.md`

## structure
```markdown
# KPI Collector Fixes — Cycle C-20260612T1820

## summary
- audited: signal-context/kpi-collectors.yaml (and adjacent collector defs)
- broken: <N> of <total> metrics return TBD or shell error
- fixed in this PR: 5 revenue-critical
- documented for follow-up: 5 more

## top 10 broken (ranked by revenue impact)
| rank | metric | current state | proposed fix |
|------|--------|---------------|--------------|
| 1 | pages_with_csp_nonce | TBD | (see fix block 1) |
| 2 | posthog_web_active | TBD | (see fix block 2) |
| 3 | mock_fallback_killed | TBD | (see fix block 3) |
| 4 | cs_macros_count | TBD | (see fix block 4) |
| 5 | b2b_api_endpoints_live | TBD | (see fix block 5) |
| 6-10 | ... | ... | documented, not patched |

## fix block 1 — pages_with_csp_nonce
**old:** `TBD-populate-before-orchestrator-go-live`
**new:**
\`\`\`bash
grep -rE "nonce=\{[a-zA-Z]+\}" app/ --include="*.tsx" -l | wc -l
\`\`\`
**rationale:** counts tsx files emitting csp nonce attribute. unit: pages. source: filesystem.

## fix block 2 — posthog_web_active
**old:** TBD
**new:**
\`\`\`bash
# returns 1 if posthog init found in app shell, 0 otherwise
grep -lE "posthog\.init\(" app/layout.tsx app/providers.tsx 2>/dev/null | wc -l
\`\`\`
follow-up: replace w/ posthog api call to get DAU once api key in vault.

## fix block 3 — mock_fallback_killed
**old:** TBD
**new:**
\`\`\`bash
# count of "TODO: remove mock" or "mockFallback" still in src — target 0
grep -rE "(mockFallback|TODO.*remove.*mock)" src/ app/ lib/ --include="*.ts" --include="*.tsx" | wc -l
\`\`\`
inverse metric: lower = better. target 0.

## fix block 4 — cs_macros_count
**old:** TBD
**new:**
\`\`\`sql
SELECT COUNT(*) FROM cs_macros WHERE active = true;
\`\`\`
prerequisite: `cs_macros` table must exist. if not, file follow-up ticket.

## fix block 5 — b2b_api_endpoints_live
**old:** TBD
**new:**
\`\`\`bash
# count app/api/b2b/**/route.ts files that export GET or POST handlers
find app/api/b2b -name "route.ts" -exec grep -lE "export (async )?function (GET|POST|PUT|DELETE)" {} \; | wc -l
\`\`\`

## remaining 5 documented (not patched this cycle)
list with metric name + why deferred (e.g., requires vendor api key, requires new table, etc.)

## next-cycle recommendation
- enforce CI check: fail build if any kpi-collector entry contains "TBD-populate"
- add `pnpm kpi:dry-run` script that executes every collector against staging and reports failures
```

## verify
```bash
# file exists
test -f docs/observability/kpi-collector-fixes.md && echo OK

# each proposed command actually runs (smoke)
grep -rE "nonce=\{[a-zA-Z]+\}" app/ --include="*.tsx" -l | wc -l
grep -rE "(mockFallback|TODO.*remove.*mock)" src/ app/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
find app/api/b2b -name "route.ts" 2>/dev/null | wc -l

# count of TBD placeholders should decrement after applying fixes
grep -c 'TBD-populate' signal-context/kpi-collectors.yaml
```

## scope discipline
- DO NOT touch the 5 deferred metrics this cycle
- DO NOT invent table names — if `cs_macros` does not exist, note in deferred list and file follow-up
- agent MUST `ls signal-context/` first to confirm actual collector file location before editing

## handoff
PR title: `obs: fix 5 revenue-critical KPI collectors + audit doc`
links: master-orchestrator briefing C-20260612T1820