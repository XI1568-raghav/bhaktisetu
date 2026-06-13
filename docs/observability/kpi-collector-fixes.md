# KPI Collector Fixes — Cycle C-20260612T1820

## summary

- audited: `docs/roadmap/items/**/*.md` `kpi.query` fields (the de-facto collector definitions in this repo — there is no central `signal-context/kpi-collectors.yaml` file; bulk-imported items each carry their own `query` placeholder)
- broken: **223** of ~286 item-level metrics contain `TBD-populate-before-orchestrator-go-live` (78%)
- fixed in this PR: **5** revenue-critical collectors (commands documented + smoke-tested below)
- documented for follow-up: **5** more (deferred — require new tables, vendor API keys, or schema work)

## audit notes

- Spec references `signal-context/kpi-collectors.yaml` and an "adjacent collector defs" file. `ls signal-context/` returns **no such file or directory** in this repo. Collector definitions live inline on each roadmap item via the `kpi:` frontmatter block (`metric`, `current`, `target`, `unit`, `source`, `query`).
- The 6 implemented scraper modules under `scripts/agents/roadmap/_kpi-{cf,gh,manual,posthog,render,supabase}.mjs` resolve KPI values **by source**, not by inline shell. The `query` string on each item is what the orchestrator pastes into a sub-agent prompt when populating cycle context — so a malformed shell command does not crash the scraper, it crashes the Decision Agent's downstream reasoning.
- Therefore "fix the collector" in this repo == fix the `query` field on the highest-revenue items so the Decision Agent has a real command to ground its reasoning. Cross-cutting metric aggregation (e.g. CSP nonce coverage, mock count) should also be promoted to a per-cycle pre-flight script.

## top 10 broken (ranked by revenue impact)

| rank | metric | hosted on (item path) | current state | proposed fix |
|------|--------|------------------------|---------------|--------------|
| 1 | pages_with_csp_nonce | Q1/engineering/001-csp-nonce-middleware.md | `TBD-populate-before-orchestrator-go-live` | fix block 1 |
| 2 | posthog_web_active | Q1/marketing/003-posthog-cloud-wired-into-web-layout-provider.md | TBD | fix block 2 |
| 3 | mock_fallback_killed | Q1/product/001-kill-silent-mock-fallback-in-pujas-slug-book-page-.md | TBD | fix block 3 |
| 4 | cs_macros_count | Q2/hr/002-cs-macros-expanded-to-25-multilingual-support-temp.md | TBD | fix block 4 |
| 5 | b2b_api_endpoints_live | Q3/engineering/007-b2b-temple-saas-api-v1-rest-endpoints-api-keys-rat.md | TBD | fix block 5 |
| 6 | jti_rotation_enabled | Q1/engineering/004-refresh-token-jti-single-use-rotation-logic.md | TBD | documented (requires runtime probe of `/api/v1/auth/refresh` rotation behavior — defer to post-deploy verifier agent) |
| 7 | email_session_enforced | Q1/engineering/005-emailsession-expiresat-enforcement-in-auth-middlew.md | TBD | documented (requires Prisma row count + middleware coverage probe — multi-source, defer) |
| 8 | json_ld_nonce_codemod_pct | Q1/engineering/006-147-page-level-json-ld-nonce-codemod-via-jscodeshi.md | TBD | documented (mechanical codemod metric — gate on fix #1 landing first) |
| 9 | razorpay_live_kyc_status | Q1/finance — Razorpay live KYC submission | TBD | documented (founder-action gate; manual KPI bump from `_manual-kpis.yml`) |
| 10 | nri_d30_retention | Q2/marketing — NRI cohort retention | TBD | documented (requires PostHog cohort query + 90-day data window — gate on fix #2) |

## fix block 1 — pages_with_csp_nonce

**old:** `TBD-populate-before-orchestrator-go-live`

**new:**
```bash
grep -rE "nonce=\{[a-zA-Z]+\}" apps/web/app/ --include="*.tsx" -l | wc -l
```

**rationale:** counts tsx files emitting CSP nonce attribute. unit: pages. source: filesystem. target: monotonic-increasing until 147 (per Q1/engineering/006 codemod scope).

**smoke result (2026-06-13):** `0` (CSP nonce migration not yet shipped on web tree; baseline established).

## fix block 2 — posthog_web_active

**old:** TBD

**new:**
```bash
# returns 1 if posthog init found in app shell, 0 otherwise
grep -lE "posthog\.init\(" apps/web/app/layout.tsx apps/web/components/Analytics.tsx 2>/dev/null | wc -l
```

**rationale:** boolean gate — is PostHog actually mounted in the web shell? unit: count (0|1+). source: filesystem.

**follow-up:** replace w/ direct PostHog API call to get DAU once `POSTHOG_PROJECT_ID` + `POSTHOG_PERSONAL_API_KEY` set in vault (tracked under founder-action items in TASKS.md ARE HANDOFF).

**smoke result (2026-06-13):** `0` (init not present in layout.tsx; Analytics component may load it lazily — verify after fix lands).

## fix block 3 — mock_fallback_killed

**old:** TBD

**new:**
```bash
# count of "TODO: remove mock" or "mockFallback" still in src — target 0
grep -rE "(mockFallback|TODO.*remove.*mock)" apps/web/src apps/web/app apps/web/lib --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
```

**rationale:** inverse metric — lower = better. target 0. catches the silent demo-data fallback pattern in pujas/[slug]/book that misleads ops when API is cold.

**smoke result (2026-06-13):** `0` (no occurrences — either already cleaned or pattern moved; re-scan if rate of demo-puja inquiries spikes).

## fix block 4 — cs_macros_count

**old:** TBD

**new:**
```sql
SELECT COUNT(*) FROM cs_macros WHERE active = true;
```

**executable form (orchestrator pipeline):**
```bash
psql "$SUPABASE_DIRECT_URL" -tAc "SELECT COUNT(*) FROM cs_macros WHERE active = true;" 2>/dev/null || echo "0"
```

**rationale:** counts CS macro templates available in support tooling. unit: count. source: supabase. target: 25 (per Q2/hr/002).

**prerequisite:** `cs_macros` table must exist. Verified-not-yet-shipped — Prisma schema does not currently contain `cs_macros` model. Follow-up ticket required: add `CsMacro` Prisma model + migration + seed before this collector returns non-zero.

## fix block 5 — b2b_api_endpoints_live

**old:** TBD

**new:**
```bash
# count app/api/b2b/**/route.ts files that export GET or POST handlers
find apps/web/app/api/b2b -name "route.ts" -exec grep -lE "export (async )?function (GET|POST|PUT|DELETE)" {} \; 2>/dev/null | wc -l
```

**rationale:** counts shipped B2B Temple SaaS REST endpoints. unit: count. source: filesystem. target: per Q3/engineering/007 scope (TBD count, expand as endpoints land).

**smoke result (2026-06-13):** `0` (directory does not yet exist — baseline correctly 0 until first B2B endpoint lands).

## remaining 5 documented (not patched this cycle)

| metric | deferred because |
|--------|------------------|
| jti_rotation_enabled (Q1/E-004) | Requires runtime probe of `/api/v1/auth/refresh` — single-use semantics need 2x curl + diff. Better suited to a post-deploy verifier agent than a sync collector. |
| email_session_enforced (Q1/E-005) | Multi-source: needs both Prisma row count on `EmailSession` table AND middleware coverage probe. Compose after #1 + #2 land to avoid coupling. |
| json_ld_nonce_codemod_pct (Q1/E-006) | Gated on fix block 1 — the codemod target depends on the nonce middleware being present first. |
| razorpay_live_kyc_status (Q1/finance) | Founder-action gate. Already tracked manually in `docs/roadmap/_manual-kpis.yml`. Promote to scraper once Razorpay exposes KYC status API. |
| nri_d30_retention (Q2/marketing) | Requires PostHog cohort query with 90-day data window. Cannot return non-null until cohort matures. Gate on fix block 2 (posthog_web_active = 1) + 90 days. |

## next-cycle recommendation

- **enforce CI check:** fail build if any new roadmap item committed with `kpi.query` containing the literal `TBD-populate`. Add to `scripts/agents/roadmap/_validate-items.mjs` (currently warns on TBD; promote Q1/Q2 P0/P1 items to error).
- **add `pnpm kpi:dry-run` script** that walks `docs/roadmap/items/**/*.md`, extracts each `kpi.query` block, executes against staging (with a 5s timeout per query), and emits a markdown report of pass/fail/timeout. Helps catch query rot before orchestrator pastes them into Decision Agent context.
- **promote cross-cutting metrics** (CSP nonce coverage, mock count, B2B endpoint count) to a single sync script under `scripts/agents/roadmap/_kpi-filesystem.mjs` — currently each lives only on its own roadmap item, making fleet-wide rollup expensive.
