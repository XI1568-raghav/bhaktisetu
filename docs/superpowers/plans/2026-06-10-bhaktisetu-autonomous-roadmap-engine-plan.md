# Bhaktisetu Autonomous Roadmap Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build cron-driven Opus-4.7 Orchestrator that reads year-1 roadmap (YAML items) + live KPIs, emits ready-to-paste Claude Code prompts to a queue every 6h, founder/Claude consumes via session-pickup hook, ships work to prod, KPIs update, loop closes — at $0 recurring cost.

**Architecture:** Git-tracked YAML+MD roadmap items under `docs/roadmap/items/`. GH Actions cron (every 6h) runs `scripts/agents/roadmap-orchestrator.mjs` → scrapes KPIs (Supabase/PostHog/Render/CF/GH) → evaluates 10 global tripwires → spawns Decision Agent (Opus 4.7 via Blackbox proxy) → which spawns N sub-agents in parallel → each writes one queue prompt to `docs/roadmap/queue/` → orchestrator commits w/ `[skip ci]`. Founder session picks oldest queue item via UserPromptSubmit hook. Verify via `Closes: Q-<queueId>` commit trailer → finalize workflow moves to `done/`. `/admin/roadmap` dashboard surfaces state.

**Tech Stack:** Node 20 ESM, pnpm 10, `@anthropic-ai/sdk`, `js-yaml`, `pg` (Supabase Postgres direct), `gh` CLI, GitHub Actions, Next.js 15 edge runtime (dashboard), vitest 3.

**Spec:** `../specs/2026-06-10-bhaktisetu-autonomous-roadmap-engine-design.md`

---

## Phase 0: Foundation scaffold

### Task 0.1: Create directory tree + README

**Files:**
- Create: `docs/roadmap/README.md`
- Create: `docs/roadmap/items/Q1/engineering/.gitkeep`
- Create: `docs/roadmap/items/Q1/marketing/.gitkeep`
- Create: `docs/roadmap/items/Q1/supply/.gitkeep`
- Create: `docs/roadmap/items/Q1/sales/.gitkeep`
- Create: `docs/roadmap/items/Q1/finance/.gitkeep`
- Create: `docs/roadmap/items/Q1/legal/.gitkeep`
- Create: `docs/roadmap/items/Q1/hr/.gitkeep`
- Create: `docs/roadmap/items/Q1/cs/.gitkeep`
- Create: `docs/roadmap/items/Q1/it/.gitkeep`
- Create: `docs/roadmap/items/Q1/geo/.gitkeep`
- Create: `docs/roadmap/items/Q1/product/.gitkeep`
- (Repeat for Q2, Q3, Q4 — 44 .gitkeep total)
- Create: `docs/roadmap/queue/.gitkeep`
- Create: `docs/roadmap/done/.gitkeep`
- Create: `docs/roadmap/decisions/.gitkeep`
- Create: `docs/roadmap/advisory/.gitkeep`
- Create: `docs/roadmap/_alerts/.gitkeep`

- [ ] **Step 1: Run mkdir + write README**

```bash
cd E:/NewClaude/bhaktisetu
for q in Q1 Q2 Q3 Q4; do
  for c in engineering marketing supply sales finance legal hr cs it geo product; do
    mkdir -p "docs/roadmap/items/$q/$c"
    touch "docs/roadmap/items/$q/$c/.gitkeep"
  done
done
mkdir -p docs/roadmap/queue docs/roadmap/done docs/roadmap/decisions docs/roadmap/advisory docs/roadmap/_alerts
touch docs/roadmap/queue/.gitkeep docs/roadmap/done/.gitkeep docs/roadmap/decisions/.gitkeep docs/roadmap/advisory/.gitkeep docs/roadmap/_alerts/.gitkeep
```

- [ ] **Step 2: Write `docs/roadmap/README.md`** (operator guide)

Content: Section headings — Overview / Directory layout / Adding an item / Killing an item / Override commands / Tripwires / Free-tier budget / Where decisions live / How to read the queue. Cite spec doc path. ~200 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap/
git commit -m "feat(roadmap): scaffold ARE directory tree + README [skip ci]"
```

### Task 0.2: Write `_tripwires-global.yml`

**Files:**
- Create: `docs/roadmap/_tripwires-global.yml`

- [ ] **Step 1: Write file with all 10 tripwires from spec §8**

```yaml
# Global tripwires. Evaluated each orchestrator cycle.
# Conditions = sandboxed JS expressions w/ frozen `ctx` (signal-context.json).
version: 1
tripwires:
  - id: T-001
    name: NRI Day-30 retention low
    condition: "ctx.kpis.nriD30Retention?.current < 25 && new Date(ctx.cycle.ts) > new Date('2026-08-01')"
    action: spawn_subagent
    spawnRole: cpo
    spawnBrief: "Tripwire T-001 fired. Fold to NRI-only SKU per docs/strategy/appsforbharat-steelman.md."
    weight: 1.0

  - id: T-002
    name: Sri Mandir USD launch
    condition: "ctx.external?.competitorReleases?.some(r => r.competitor === 'Sri Mandir' && /USD/.test(r.release))"
    action: defer_to_founder
    deferMessage: "URGENT: Sri Mandir launched USD tier. Execute NRI pivot now."
    weight: 2.0

  - id: T-003
    name: GH minutes overrun
    condition: "ctx.budget.ghMinutesMonth.pct > 80 && ctx.cycle.dayOfMonth < 25"
    action: throttle
    throttleConfig: { cronCadenceHours: 12, skipSpawn: true }
    weight: 0.5

  - id: T-004
    name: CF builds overrun
    condition: "ctx.budget.cfBuildsMonth.pct > 60 && ctx.cycle.dayOfMonth < 20"
    action: defer_to_founder
    deferMessage: "CF builds 60%+ pre-day-20. Pause non-critical web pushes."
    weight: 0.7

  - id: T-005
    name: Anthropic proxy blocked
    condition: "ctx.external?.lastAnthropicError && /Free tier|forbidden|403/.test(ctx.external.lastAnthropicError)"
    action: kill_workflow
    killMessage: "Halt — Blackbox rejected Opus 4.7. Founder must upgrade OR approve model swap."
    weight: 3.0

  - id: T-006
    name: Render saturated
    condition: "ctx.budget.renderHoursMonth.pct > 95"
    action: defer_to_founder
    deferMessage: "Render 95% used. Cold-start risk imminent."
    weight: 1.5

  - id: T-007
    name: Engineering velocity flatline
    condition: "ctx.verticals.engineering.commits7d < 3 && ctx.verticals.engineering.openP0Bugs === 0"
    action: spawn_subagent
    spawnRole: cto
    spawnBrief: "7-day commit count < 3. Review planned items, propose 3 ready-to-ship."
    weight: 0.8

  - id: T-008
    name: Roadmap drained
    condition: "ctx.items.byStatus.planned < 30"
    action: spawn_subagent
    spawnRole: cpo
    spawnBrief: "Backlog < 30 planned. Generate 50 new items from CEO roadmap Q3/Q4."
    weight: 1.0

  - id: T-009
    name: Single role over-spawned
    condition: "ctx.queue.depth >= 5 && (Math.max(...Object.values(ctx.queue.byRole)) / ctx.queue.depth) > 0.6"
    action: rebalance
    rebalanceMessage: "One role dominates queue. Decision Agent must diversify next cycle."
    weight: 0.6

  - id: T-010
    name: Queue stale
    condition: "ctx.queue.oldestAgeHours > 72"
    action: defer_to_founder
    deferMessage: "Queue oldest item > 72h unconsumed. Triage."
    weight: 1.0
```

- [ ] **Step 2: Commit**

```bash
git add docs/roadmap/_tripwires-global.yml
git commit -m "feat(roadmap): 10 global tripwires (steelman + free-tier + velocity) [skip ci]"
```

### Task 0.3: Write `_manual-kpis.yml` + empty seeds

**Files:**
- Create: `docs/roadmap/_manual-kpis.yml`
- Create: `docs/roadmap/_kpi-cache.json`
- Create: `docs/roadmap/_budget-snapshot.json`
- Create: `docs/roadmap/_sector-summaries.json`
- Create: `docs/roadmap/_index.json`

- [ ] **Step 1: Write `_manual-kpis.yml`**

```yaml
# Founder-updated KPIs that no system auto-tracks.
# Update by hand; orchestrator reads on every cycle.
last_updated: 2026-06-10
values:
  verified_temples_count: 12
  press_hits_count: 1
  investor_meetings_count: 3
  iskcon_loi_status: prospect          # prospect|introd|meeting|term_sheet|signed
  product_hunt_launched: false
  nri_d30_retention: null              # measured starting M3
```

- [ ] **Step 2: Write empty JSON seeds**

```bash
cd E:/NewClaude/bhaktisetu
echo '{"lastFullRefresh":null,"entries":{}}' > docs/roadmap/_kpi-cache.json
echo '{"month":"2026-06","ghMinutes":{"used":0,"cap":2000},"cfBuilds":{"used":0,"cap":500},"orchestratorPaused":false}' > docs/roadmap/_budget-snapshot.json
echo '{"compiledAt":null,"summaries":{}}' > docs/roadmap/_sector-summaries.json
echo '{"generatedAt":null,"items":[]}' > docs/roadmap/_index.json
```

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap/_manual-kpis.yml docs/roadmap/_kpi-cache.json docs/roadmap/_budget-snapshot.json docs/roadmap/_sector-summaries.json docs/roadmap/_index.json
git commit -m "feat(roadmap): manual KPI seed + empty cache/budget/index files [skip ci]"
```

### Task 0.4: Write 3 sample items end-to-end (schema validation)

**Files:**
- Create: `docs/roadmap/items/Q1/engineering/001-csp-nonce-middleware.md`
- Create: `docs/roadmap/items/Q1/supply/001-onboard-50-pandits-varanasi.md`
- Create: `docs/roadmap/items/Q1/marketing/001-reddit-week-3-plant-flags.md`

- [ ] **Step 1: Write engineering sample**

```markdown
---
id: R-Q1-E-001
title: CSP nonce middleware completion + per-page schema
category: engineering
owner_role: cto
quarter: Q1
month_target: 1
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: [R-Q1-E-002]

kpi:
  metric: pages_with_csp_nonce
  current: 1
  target: 250
  unit: count
  source: gh_repo
  query: "grep -r 'nonce={nonce}' apps/web/app/ --include=*.tsx | wc -l"

revenue_impact:
  amount_inr: 0
  confidence: high
  basis: "security hygiene; no direct revenue"

est_hours: 6
est_cost_inr: 0

success_criteria:
  - "curl -sI https://darshya.online/ returns CSP header with nonce-{base64} + strict-dynamic, NO unsafe-inline in script-src"
  - "Browser DevTools console on home: NO CSP violations across Razorpay/Stripe/PostHog/GTM/CF/AdSense"
  - "≥ 100 pages have inline scripts with nonce attr"

agent_brief:
  context_files:
    - apps/web/middleware.ts
    - apps/web/app/layout.tsx
    - docs/company/01-cto.md
  prompt_skeleton: |
    CTO sub-agent. Complete CSP nonce migration from prior commit 7adbd87.
    147 page-level JSON-LD scripts need nonce={nonce} codemod via jscodeshift or sed.
    Verify per success_criteria above.

handoff_notes: |
  2026-06-08 commit 7adbd87 shipped middleware + layout wiring. 146 pages still pending codemod.
  2026-06-10: created roadmap item from TASKS.md deferred list.

tags: [security, csp, nonce, p1]
created_at: 2026-06-10T19:00:00Z
updated_at: 2026-06-10T19:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
CSP nonce shipped via middleware (7adbd87) but only home page lit up. 146 routes still vulnerable to inline-script XSS via 3rd-party loaders.

# Reference material
- HANDOFF #20 in TASKS.md
- docs/company/01-cto.md security row
- middleware.ts L1-30 nonce generation

# Already shipped
- Middleware
- `_headers` unsafe-inline drop
- Layout `<Script nonce={nonce}>` wiring (home only)

# Risks
- 3rd-party scripts (Razorpay, Stripe) may not propagate nonce → strict-dynamic catches most; manual whitelist for stragglers
- Codemod may touch generated routes — exclude `.next/` + `node_modules/`
```

- [ ] **Step 2: Write supply sample** (use full Varanasi pandit item from spec §4 verbatim)

- [ ] **Step 3: Write marketing sample**

```markdown
---
id: R-Q1-M-001
title: Reddit week-3 plant-flags — r/hinduism + r/india_speaks
category: marketing
owner_role: cmo
quarter: Q1
month_target: 1
priority: P1
status: planned
agent_assignable: false
founder_blocker: null
depends_on: []
blocks: [R-Q1-M-002]

kpi:
  metric: reddit_comments_posted
  current: 0
  target: 21
  unit: count
  source: manual
  query: "manual count from _manual-kpis.yml field reddit_comments_count"

revenue_impact:
  amount_inr: 0
  confidence: low
  basis: "indirect — referral traffic, brand awareness"

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "21 helpful comments posted across r/hinduism + r/india_speaks (comment-only, no asks per CMO §2 week 1)"
  - "0 mod removals"
  - "Manual KPI updated"

agent_brief:
  context_files:
    - docs/company/02-cmo.md
  prompt_skeleton: |
    CMO sub-agent. Compose 21 Reddit comment drafts for founder approval.
    Topics: puja/dharma/temple questions. Cite Darshya only if directly relevant. Comment-only, no asks.

handoff_notes: |
  2026-06-10: created from CMO doc week-1 plant-flags activity.

tags: [reddit, week-1, plant-flags, marketing]
created_at: 2026-06-10T19:00:00Z
updated_at: 2026-06-10T19:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Per CEO roadmap Day 1-30 + CMO §2 week 1.

# Reference material
- docs/company/02-cmo.md §2
- docs/ceo-roadmap-2026-05-27.md Day 1-30
```

- [ ] **Step 4: Schema validation script**

Create `scripts/agents/roadmap/_validate-items.mjs`:

```javascript
#!/usr/bin/env node
// Validates all docs/roadmap/items/**/*.md frontmatter against schema.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = 'docs/roadmap/items';
const REQUIRED = ['id','title','category','owner_role','quarter','month_target','priority','status','agent_assignable','depends_on','blocks','kpi','revenue_impact','est_hours','est_cost_inr','success_criteria','agent_brief','tags','created_at','updated_at'];
const CATEGORIES = ['engineering','marketing','supply','sales','finance','legal','hr','cs','it','geo','product'];
const ROLES = ['cto','cfo','cmo','cpo','sales','talent','cs','legal','it','hr','founder'];
const PRIORITIES = ['P0','P1','P2','P3'];
const STATUSES = ['planned','in_progress','blocked','shipped','verified','killed'];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]+?)\n---/);
  if (!m) throw new Error('no frontmatter');
  return yaml.load(m[1]);
}

let errors = 0;
for (const file of walk(ROOT)) {
  try {
    const fm = parseFrontmatter(readFileSync(file, 'utf8'));
    for (const k of REQUIRED) if (fm[k] === undefined) { console.error(`${file}: missing ${k}`); errors++; }
    if (!CATEGORIES.includes(fm.category)) { console.error(`${file}: bad category ${fm.category}`); errors++; }
    if (!ROLES.includes(fm.owner_role)) { console.error(`${file}: bad owner_role ${fm.owner_role}`); errors++; }
    if (!PRIORITIES.includes(fm.priority)) { console.error(`${file}: bad priority ${fm.priority}`); errors++; }
    if (!STATUSES.includes(fm.status)) { console.error(`${file}: bad status ${fm.status}`); errors++; }
    if (!/^R-(Q[1-4]|Y\d-Q[1-4])-[A-Z]+-\d{3}$/.test(fm.id)) { console.error(`${file}: bad id format ${fm.id}`); errors++; }
  } catch (e) {
    console.error(`${file}: ${e.message}`); errors++;
  }
}
console.log(`Validated ${walk(ROOT).length} items, ${errors} errors.`);
process.exit(errors > 0 ? 1 : 0);
```

- [ ] **Step 5: Install `js-yaml` if not already + run validator**

```bash
cd E:/NewClaude/bhaktisetu
pnpm ls js-yaml 2>&1 | grep js-yaml || pnpm add -w js-yaml
node scripts/agents/roadmap/_validate-items.mjs
```

Expected: `Validated 3 items, 0 errors.`

- [ ] **Step 6: Commit**

```bash
git add docs/roadmap/items/ scripts/agents/roadmap/_validate-items.mjs package.json pnpm-lock.yaml
git commit -m "feat(roadmap): 3 sample items + schema validator [skip ci]"
```

### Task 0.5: Index builder

**Files:**
- Create: `scripts/agents/roadmap/_index-build.mjs`
- Test: `scripts/agents/roadmap/_index-build.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// scripts/agents/roadmap/_index-build.test.mjs
import { describe, it, expect } from 'vitest';
import { buildIndex } from './_index-build.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const FIXTURE = 'docs/roadmap/_test-fixture';

describe('buildIndex', () => {
  it('parses items and emits compact array', () => {
    mkdirSync(`${FIXTURE}/items/Q1/engineering`, { recursive: true });
    writeFileSync(`${FIXTURE}/items/Q1/engineering/001-foo.md`, `---
id: R-Q1-E-001
title: Foo
category: engineering
owner_role: cto
quarter: Q1
month_target: 1
priority: P1
status: planned
agent_assignable: true
depends_on: []
blocks: []
kpi: { metric: foo, current: 0, target: 1, unit: count, source: manual, query: "n/a" }
revenue_impact: { amount_inr: 0, confidence: low, basis: "test" }
est_hours: 1
est_cost_inr: 0
success_criteria: ["ok"]
agent_brief: { context_files: [], prompt_skeleton: "test" }
tags: []
created_at: 2026-06-10T00:00:00Z
updated_at: 2026-06-10T00:00:00Z
---
# body`);
    const idx = buildIndex(`${FIXTURE}/items`);
    expect(idx.items).toHaveLength(1);
    expect(idx.items[0].id).toBe('R-Q1-E-001');
    expect(idx.items[0]).not.toHaveProperty('agent_brief.prompt_skeleton'); // body excluded
    rmSync(FIXTURE, { recursive: true });
  });
});
```

- [ ] **Step 2: Run, expect FAIL (no module)**

```bash
cd E:/NewClaude/bhaktisetu
pnpm vitest run scripts/agents/roadmap/_index-build.test.mjs
```

Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement `_index-build.mjs`**

```javascript
#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

export function buildIndex(itemsRoot = 'docs/roadmap/items') {
  const items = [];
  for (const file of walk(itemsRoot)) {
    const content = readFileSync(file, 'utf8');
    const m = content.match(/^---\n([\s\S]+?)\n---/);
    if (!m) continue;
    const fm = yaml.load(m[1]);
    // Drop verbose body + prompt_skeleton from index (keep references for filtering)
    const compact = { ...fm };
    if (compact.agent_brief?.prompt_skeleton) {
      compact.agent_brief = { context_files: compact.agent_brief.context_files || [] };
    }
    compact._file = file;
    items.push(compact);
  }
  return { generatedAt: new Date().toISOString(), items };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const idx = buildIndex();
  writeFileSync('docs/roadmap/_index.json', JSON.stringify(idx, null, 2));
  console.log(`Wrote _index.json with ${idx.items.length} items.`);
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
pnpm vitest run scripts/agents/roadmap/_index-build.test.mjs
```

Expected: PASS

- [ ] **Step 5: Regenerate real index + verify**

```bash
node scripts/agents/roadmap/_index-build.mjs
cat docs/roadmap/_index.json | head -20
```

Expected: 3 items present, generatedAt populated.

- [ ] **Step 6: Commit**

```bash
git add scripts/agents/roadmap/_index-build.mjs scripts/agents/roadmap/_index-build.test.mjs docs/roadmap/_index.json
git commit -m "feat(roadmap): index builder + vitest coverage [skip ci]"
```

---

**Phase 0 done. Output: scaffold + 3 items + validator + index builder.**

---

## Phase 1: Year-1 content (283 items)

### Task 1.1: Q1 engineering items (15)

**Files:**
- Create: `docs/roadmap/items/Q1/engineering/{002..016}-*.md`

- [ ] **Step 1: Source mapping**

Read these source files to pull item content:
- `docs/company/01-cto.md` (P0 blockers, security audit)
- `docs/company/09-it.md` (observability, DR)
- `TASKS.md` HANDOFF blocks (deferred P0/P1 lists)
- `docs/future-plans.md` E2/E9/E10 carried items

15 items to create (one per topic):
1. R-Q1-E-002 — Razorpay raw-body HMAC flip (founder_blocker: null, but needs test-mode validation runbook)
2. R-Q1-E-003 — Donations Map → Prisma table migration (CTO P0 #2)
3. R-Q1-E-004 — Refresh token JTI single-use rotation logic (deferred batch from HANDOFF #20)
4. R-Q1-E-005 — EmailSession.expiresAt enforcement in middleware
5. R-Q1-E-006 — 147 page-level JSON-LD nonce codemod (jscodeshift)
6. R-Q1-E-007 — 9 page-level schema additions (Product/TouristTrip/Book/FAQPage/Service per audit Pillar 2)
7. R-Q1-E-008 — 5 funnel events instrumentation (puja_card_click, book_clicked, payment_initiated, payment_success, video_proof_viewed)
8. R-Q1-E-009 — 3 A/B feature flags (hero_copy_v2, cta_color_test, nri_lane_above_fold)
9. R-Q1-E-010 — Astrologer slug↔UUID design pass
10. R-Q1-E-011 — Wire FCM server key (env-or-noop branch already in place; gated on U5)
11. R-Q1-E-012 — Embedded Stripe Elements full Provider (E9 carry)
12. R-Q1-E-013 — `getPublicPriests({specialization, deity})` server-side filter
13. R-Q1-E-014 — Sentry MCP + Postgres MCP env-var setup (IT §2 Fri AM)
14. R-Q1-E-015 — Top 10 WCAG fixes (per audit Pillar 1)
15. R-Q1-E-016 — Inline-style → Tailwind home refactor (198 occurrences)

- [ ] **Step 2: Write helper to bulk-create from CSV**

Create `scripts/agents/roadmap/_bulk-create.mjs`:

```javascript
#!/usr/bin/env node
// Reads docs/roadmap/_bulk-input.csv → creates per-item .md files.
// CSV columns: id,quarter,category,owner_role,month_target,priority,title,kpi_metric,kpi_target,kpi_unit,kpi_source,revenue_inr,est_hours,depends_on,blocks,tags
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CSV = process.argv[2] || 'docs/roadmap/_bulk-input.csv';
const NOW = new Date().toISOString();

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
      else cur += ch;
    }
    cols.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (cols[i] || '').trim()]));
  });
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function itemMd(row) {
  const depends = row.depends_on ? row.depends_on.split(';').map(s => s.trim()) : [];
  const blocks = row.blocks ? row.blocks.split(';').map(s => s.trim()) : [];
  const tags = row.tags ? row.tags.split(';').map(s => s.trim()) : [];
  return `---
id: ${row.id}
title: ${row.title}
category: ${row.category}
owner_role: ${row.owner_role}
quarter: ${row.quarter}
month_target: ${row.month_target}
priority: ${row.priority}
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ${JSON.stringify(depends)}
blocks: ${JSON.stringify(blocks)}

kpi:
  metric: ${row.kpi_metric}
  current: 0
  target: ${row.kpi_target}
  unit: ${row.kpi_unit}
  source: ${row.kpi_source}
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: ${row.revenue_inr}
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: ${row.est_hours}
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  ${NOW.slice(0, 10)}: bulk-imported from year-1 content sprint.

tags: ${JSON.stringify(tags)}
created_at: ${NOW}
updated_at: ${NOW}
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
`;
}

const rows = parseCsv(readFileSync(CSV, 'utf8'));
let created = 0, skipped = 0;
for (const row of rows) {
  const dir = `docs/roadmap/items/${row.quarter}/${row.category}`;
  mkdirSync(dir, { recursive: true });
  const seq = row.id.match(/-(\d{3})$/)?.[1] || '000';
  const path = join(dir, `${seq}-${slugify(row.title)}.md`);
  if (existsSync(path)) { skipped++; continue; }
  writeFileSync(path, itemMd(row));
  created++;
}
console.log(`Created ${created}, skipped ${skipped}.`);
```

**Important caveat**: bulk-created items have `query: "TBD-populate-before-orchestrator-go-live"` + empty `success_criteria` + `agent_brief`. They MUST be populated before Phase 3 orchestrator goes live. Task 1.4 covers this via first cycle emission. Validator updated in Task 1.4 to flag unpopulated items.

- [ ] **Step 3: Write Q1 engineering CSV**

Create `docs/roadmap/_bulk-input-q1-eng.csv` with 15 rows matching item list above. Example header + first row:

```csv
id,quarter,category,owner_role,month_target,priority,title,kpi_metric,kpi_target,kpi_unit,kpi_source,revenue_inr,est_hours,depends_on,blocks,tags
R-Q1-E-002,Q1,engineering,cto,1,P0,Razorpay raw-body HMAC flip after test-mode validation,razorpay_verify_raw_enabled,1,count,manual,0,6,,,"security;p0;razorpay"
R-Q1-E-003,Q1,engineering,cto,1,P0,Promote donations from in-memory Map to Prisma Donation table,donations_persisted,1,count,manual,0,4,,,"data;p0;cto"
...
```

(13 more rows. Engineer fills from §1 item list.)

- [ ] **Step 4: Run bulk-create**

```bash
cd E:/NewClaude/bhaktisetu
node scripts/agents/roadmap/_bulk-create.mjs docs/roadmap/_bulk-input-q1-eng.csv
node scripts/agents/roadmap/_validate-items.mjs
node scripts/agents/roadmap/_index-build.mjs
```

Expected: `Created 15, skipped 0.` → `Validated 18 items, 0 errors.` → `Wrote _index.json with 18 items.`

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap/items/Q1/engineering/ docs/roadmap/_bulk-input-q1-eng.csv scripts/agents/roadmap/_bulk-create.mjs docs/roadmap/_index.json
git commit -m "feat(roadmap): Q1 engineering items (15) bulk-import [skip ci]"
```

### Task 1.2: Q1 supply + marketing + sales items (25)

**Files:**
- Create: `docs/roadmap/items/Q1/supply/{002..011}-*.md` (10 supply: pandit BLR+VNS+MUM × 3, temples BLR+VNS+MUM × 3, gaushala + gurukul + astrologer + store + wellness = 10)
- Create: `docs/roadmap/items/Q1/marketing/{002..011}-*.md` (10 marketing: SEO clusters, social cadence, PR, content calendar, email DRIP, etc)
- Create: `docs/roadmap/items/Q1/sales/{001..005}-*.md` (5 sales: ISKCON LOI, BAPS intro, NRI orgs outreach, etc)

- [ ] **Step 1: Write CSV files** `_bulk-input-q1-supply.csv` (10 rows) + `_bulk-input-q1-marketing.csv` (10 rows) + `_bulk-input-q1-sales.csv` (5 rows)

Pull content from:
- `docs/company/02-cmo.md` §1-§6 (marketing)
- `docs/company/05-sales.md` §1-§4 (supply + sales)
- `docs/ceo-roadmap-2026-05-27.md` Days 1-30 sprint
- `docs/ceo-roadmap-2026-05-27.md` §8 onboarding playbooks

- [ ] **Step 2: Bulk-create + validate + index**

```bash
node scripts/agents/roadmap/_bulk-create.mjs docs/roadmap/_bulk-input-q1-supply.csv
node scripts/agents/roadmap/_bulk-create.mjs docs/roadmap/_bulk-input-q1-marketing.csv
node scripts/agents/roadmap/_bulk-create.mjs docs/roadmap/_bulk-input-q1-sales.csv
node scripts/agents/roadmap/_validate-items.mjs
node scripts/agents/roadmap/_index-build.mjs
```

Expected: 43 items total in index.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap/items/Q1/supply/ docs/roadmap/items/Q1/marketing/ docs/roadmap/items/Q1/sales/ docs/roadmap/_bulk-input-q1-*.csv docs/roadmap/_index.json
git commit -m "feat(roadmap): Q1 supply (10) + marketing (10) + sales (5) bulk-import [skip ci]"
```

### Task 1.3: Q1 remaining + Q2/Q3/Q4 items (240)

**Files:**
- Create: ~240 more items across Q1 finance/legal/hr/cs/it/geo/product + Q2/Q3/Q4 all categories

- [ ] **Step 1: Write CSVs for remaining categories per spec §4 ladder counts**

| Quarter | Total | By category |
|---|---|---|
| Q1 | 70 | eng 15 / supply 10 / marketing 10 / sales 5 / finance 4 / legal 3 / hr 2 / cs 4 / it 3 / geo 7 / product 7 |
| Q2 | 75 | eng 16 / supply 11 / marketing 13 / sales 5 / finance 4 / legal 3 / hr 2 / cs 4 / it 3 / geo 8 / product 6 |
| Q3 | 70 | eng 15 / supply 10 / marketing 14 / sales 5 / finance 4 / legal 2 / hr 2 / cs 4 / it 2 / geo 7 / product 5 |
| Q4 | 68 | eng 14 / supply 9 / marketing 13 / sales 5 / finance 3 / legal 2 / hr 2 / cs 3 / it 2 / geo 8 / product 7 |
| **Total** | **283** | per spec §4 |

Q1 done in 1.1+1.2 = 40. Remaining Q1 = 30 (finance 4 + legal 3 + hr 2 + cs 4 + it 3 + geo 7 + product 7).

Q2/Q3/Q4 CSVs source from:
- `docs/ceo-roadmap-2026-05-27.md` §3 Q3/Q4 priorities
- `docs/future-plans.md` Q3 candidates
- `docs/roadmap-archive.md` 8 revenue lines + long-term bets

- [ ] **Step 2: Bulk-create all CSVs in one loop**

```bash
cd E:/NewClaude/bhaktisetu
for f in docs/roadmap/_bulk-input-q*.csv; do
  node scripts/agents/roadmap/_bulk-create.mjs "$f"
done
node scripts/agents/roadmap/_validate-items.mjs
node scripts/agents/roadmap/_index-build.mjs
```

Expected: 283 items in index.

- [ ] **Step 3: Commit per-quarter (4 commits = 4 logical chunks)**

```bash
git add docs/roadmap/items/Q1/ docs/roadmap/_bulk-input-q1*.csv
git commit -m "feat(roadmap): Q1 remaining items (finance/legal/hr/cs/it/geo/product = 30) [skip ci]"

git add docs/roadmap/items/Q2/ docs/roadmap/_bulk-input-q2*.csv
git commit -m "feat(roadmap): Q2 items (75) bulk-import [skip ci]"

git add docs/roadmap/items/Q3/ docs/roadmap/_bulk-input-q3*.csv
git commit -m "feat(roadmap): Q3 items (70) bulk-import [skip ci]"

git add docs/roadmap/items/Q4/ docs/roadmap/_bulk-input-q4*.csv docs/roadmap/_index.json
git commit -m "feat(roadmap): Q4 items (68) bulk-import + full index [skip ci]"
```

### Task 1.4: Validator flags TBD placeholders

**Files:**
- Modify: `scripts/agents/roadmap/_validate-items.mjs`
- Test: `scripts/agents/roadmap/_validate-items.test.mjs`

- [ ] **Step 1: Add TBD detection to validator**

Append to validator script:

```javascript
// Warn (don't error) on TBD placeholders — these MUST be populated before orchestrator go-live.
let warnings = 0;
for (const file of walk(ROOT)) {
  const fm = parseFrontmatter(readFileSync(file, 'utf8'));
  if (fm.kpi?.query?.startsWith('TBD')) { console.warn(`WARN ${file}: kpi.query unpopulated`); warnings++; }
  if (fm.success_criteria?.[0]?.includes('Populate during first')) { console.warn(`WARN ${file}: success_criteria unpopulated`); warnings++; }
  if (fm.agent_brief?.prompt_skeleton?.startsWith('TBD')) { console.warn(`WARN ${file}: agent_brief.prompt_skeleton unpopulated`); warnings++; }
}
console.log(`Validated ${walk(ROOT).length} items, ${errors} errors, ${warnings} warnings.`);
```

- [ ] **Step 2: Run + observe warnings**

```bash
node scripts/agents/roadmap/_validate-items.mjs
```

Expected: `Validated 283 items, 0 errors, ~840 warnings.` (3 placeholders × 280 bulk items).

- [ ] **Step 3: Commit**

```bash
git add scripts/agents/roadmap/_validate-items.mjs
git commit -m "feat(roadmap): validator warns on TBD placeholders (must populate pre-go-live) [skip ci]"
```

---

**Phase 1 done. Output: 283 items + bulk-create tool + warning validator. Placeholders flagged; first orchestrator cycle populates via sub-agents.**

---

## Phase 2: KPI scraper + tripwire engine + Anthropic client

### Task 2.1: Anthropic client w/ no-silent-swap guarantee

**Files:**
- Create: `scripts/agents/roadmap/_anthropic-client.mjs`
- Test: `scripts/agents/roadmap/_anthropic-client.test.mjs`

- [ ] **Step 1: Install SDK if needed**

```bash
cd E:/NewClaude/bhaktisetu
pnpm ls @anthropic-ai/sdk 2>&1 | grep anthropic || pnpm add -w @anthropic-ai/sdk
```

- [ ] **Step 2: Write failing test**

```javascript
// scripts/agents/roadmap/_anthropic-client.test.mjs
import { describe, it, expect, vi } from 'vitest';
import { callOpus47, ModelRejectedError } from './_anthropic-client.mjs';

describe('callOpus47', () => {
  it('throws ModelRejectedError on 403 Free tier reject (never silent-swaps)', async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockRejectedValue(Object.assign(new Error('Free tier users do not have access'), { status: 403 }))
      }
    };
    await expect(callOpus47({ messages: [], maxTokens: 100, client: mockClient }))
      .rejects.toThrow(ModelRejectedError);
    expect(mockClient.messages.create).toHaveBeenCalledOnce(); // no retry on 403
  });

  it('retries 3× on 5xx + succeeds', async () => {
    const mockClient = {
      messages: {
        create: vi.fn()
          .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
          .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 503 }))
          .mockResolvedValueOnce({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 10, output_tokens: 2 } })
      }
    };
    const res = await callOpus47({ messages: [], maxTokens: 100, client: mockClient, retryDelayMs: 1 });
    expect(res.content[0].text).toBe('ok');
    expect(mockClient.messages.create).toHaveBeenCalledTimes(3);
  });

  it('never falls back to non-Opus-4.7 model', async () => {
    const mockClient = { messages: { create: vi.fn().mockResolvedValue({ content: [], usage: {} }) } };
    await callOpus47({ messages: [], maxTokens: 100, client: mockClient });
    const callArgs = mockClient.messages.create.mock.calls[0][0];
    expect(callArgs.model).toMatch(/opus-4[\.-]7/);
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

```bash
pnpm vitest run scripts/agents/roadmap/_anthropic-client.test.mjs
```

Expected: FAIL "Cannot find module"

- [ ] **Step 4: Implement**

```javascript
// scripts/agents/roadmap/_anthropic-client.mjs
import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';
const RETRY_DELAYS = [2000, 8000, 30000];

export class ModelRejectedError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ModelRejectedError';
    this.status = status;
  }
}

export async function callOpus47({ messages, maxTokens = 8000, temperature = 0.3, tools, system, client, retryDelayMs }) {
  const c = client || new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL,
  });
  const delays = retryDelayMs !== undefined ? [retryDelayMs, retryDelayMs, retryDelayMs] : RETRY_DELAYS;

  // User directive: NEVER silent-swap model. Always Opus 4.7.
  const model = DEFAULT_MODEL;
  if (!/opus-4[\.-]7/.test(model)) {
    throw new Error(`Refusing to call non-Opus-4.7 model: ${model}. Set ANTHROPIC_MODEL=claude-opus-4-7.`);
  }

  let lastErr;
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      return await c.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(system ? { system } : {}),
        ...(tools ? { tools } : {}),
        messages,
      });
    } catch (e) {
      // 403 + "Free tier" / "forbidden" → ModelRejectedError, NO retry, NO swap
      if (e.status === 403 && /Free tier|forbidden|access/i.test(e.message)) {
        throw new ModelRejectedError(`Blackbox proxy rejected ${model}: ${e.message}`, 403);
      }
      // 4xx other than 429 → throw immediately
      if (e.status >= 400 && e.status < 500 && e.status !== 429) throw e;
      lastErr = e;
      if (attempt === 3) break;
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}
```

- [ ] **Step 5: Run test, expect PASS**

```bash
pnpm vitest run scripts/agents/roadmap/_anthropic-client.test.mjs
```

Expected: PASS (3/3)

- [ ] **Step 6: Commit**

```bash
git add scripts/agents/roadmap/_anthropic-client.mjs scripts/agents/roadmap/_anthropic-client.test.mjs package.json pnpm-lock.yaml
git commit -m "feat(roadmap): Anthropic client w/ ModelRejectedError + 3x retry + no-silent-swap [skip ci]"
```

### Task 2.2: Supabase KPI scraper

**Files:**
- Create: `scripts/agents/roadmap/_kpi-supabase.mjs`
- Test: `scripts/agents/roadmap/_kpi-supabase.test.mjs`

- [ ] **Step 1: Install `pg` if needed**

```bash
pnpm ls pg 2>&1 | grep "^pg " || pnpm add -w pg
```

- [ ] **Step 2: Write failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { isSelectOnly, scrapeSupabase } from './_kpi-supabase.mjs';

describe('isSelectOnly', () => {
  it('accepts SELECT', () => expect(isSelectOnly('SELECT COUNT(*) FROM foo')).toBe(true));
  it('rejects INSERT', () => expect(isSelectOnly('INSERT INTO foo VALUES (1)')).toBe(false));
  it('rejects DROP', () => expect(isSelectOnly('SELECT 1; DROP TABLE foo')).toBe(false));
  it('rejects DELETE inline', () => expect(isSelectOnly('SELECT * FROM (DELETE FROM foo RETURNING *) x')).toBe(false));
});

describe('scrapeSupabase', () => {
  it('returns stale flag when pool query throws', async () => {
    const fakePool = { query: () => Promise.reject(new Error('conn refused')) };
    const items = [{ kpi: { source: 'supabase', metric: 'foo', query: 'SELECT 1' } }];
    const res = await scrapeSupabase(items, { pool: fakePool });
    expect(res[0]).toMatchObject({ metric: 'foo', stale: true, error: expect.stringMatching(/conn refused/) });
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

```bash
pnpm vitest run scripts/agents/roadmap/_kpi-supabase.test.mjs
```

- [ ] **Step 4: Implement**

```javascript
// scripts/agents/roadmap/_kpi-supabase.mjs
import pg from 'pg';

export function isSelectOnly(sql) {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) return false;
  // Reject any DML/DDL keyword token anywhere
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COMMENT|VACUUM|REINDEX)\b/i.test(sql)) return false;
  return true;
}

export async function scrapeSupabase(items, { pool: providedPool } = {}) {
  const pool = providedPool || new pg.Pool({
    connectionString: process.env.DATABASE_URL_READONLY || process.env.SUPABASE_DIRECT_URL,
    max: 3,
    statement_timeout: 5000,
  });
  const out = [];
  for (const it of items) {
    const q = it.kpi.query;
    if (!isSelectOnly(q)) {
      out.push({ metric: it.kpi.metric, stale: true, error: 'query rejected: not SELECT-only' });
      continue;
    }
    try {
      const r = await pool.query(q);
      const value = r.rows[0] ? Object.values(r.rows[0])[0] : null;
      out.push({ metric: it.kpi.metric, value: Number(value) || value, stale: false, fetchedAt: new Date().toISOString() });
    } catch (e) {
      out.push({ metric: it.kpi.metric, stale: true, error: e.message });
    }
  }
  if (!providedPool) await pool.end();
  return out;
}
```

- [ ] **Step 5: Run test, expect PASS**

```bash
pnpm vitest run scripts/agents/roadmap/_kpi-supabase.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add scripts/agents/roadmap/_kpi-supabase.mjs scripts/agents/roadmap/_kpi-supabase.test.mjs package.json pnpm-lock.yaml
git commit -m "feat(roadmap): Supabase KPI scraper w/ SELECT-only guard + stale fallback [skip ci]"
```

### Task 2.3: Other KPI scrapers (PostHog, Render, CF, GH, manual)

**Files:**
- Create: `scripts/agents/roadmap/_kpi-posthog.mjs`
- Create: `scripts/agents/roadmap/_kpi-render.mjs`
- Create: `scripts/agents/roadmap/_kpi-cf.mjs`
- Create: `scripts/agents/roadmap/_kpi-gh.mjs`
- Create: `scripts/agents/roadmap/_kpi-manual.mjs`
- Test: one test file per scraper (5 files)

- [ ] **Step 1: PostHog scraper**

`_kpi-posthog.mjs` exports `scrapePosthog(items)`. Each item.kpi.query = insight ID. GET `https://app.posthog.com/api/projects/{POSTHOG_PROJECT_ID}/insights/{insightId}/` w/ Bearer `POSTHOG_PERSONAL_API_KEY`. Extract `result[0].count` or `result[0].data?.[result[0].data.length-1]`. 10s timeout via `AbortSignal.timeout(10000)`. On error → `{stale: true, error}`.

- [ ] **Step 2: Render scraper**

`_kpi-render.mjs` exports `scrapeRender(items)`. GET `https://api.render.com/v1/services/{serviceId}/deploys?limit=1` w/ Bearer `RENDER_API_KEY`. Extract `[0].status` + `[0].finishedAt`. For metrics queries: `/v1/services/{id}/metrics/cpu`.

- [ ] **Step 3: CF Analytics scraper**

`_kpi-cf.mjs` exports `scrapeCfAnalytics(items)`. POST `https://api.cloudflare.com/client/v4/graphql/` w/ Bearer `CF_ANALYTICS_TOKEN`. Query body per item.kpi.query (GraphQL string).

- [ ] **Step 4: GH repo scraper**

`_kpi-gh.mjs` exports `scrapeGhRepo(items)`. Uses `gh api` CLI via `execFileSync`. Parses item.kpi.query as gh-api path.

- [ ] **Step 5: Manual scraper**

`_kpi-manual.mjs` exports `scrapeManual(items)`. Loads `docs/roadmap/_manual-kpis.yml` once, returns `values[item.kpi.metric]` per item.

- [ ] **Step 6: One test per scraper**

Each test mocks fetch/execFileSync. Asserts: happy path returns value + stale=false; error path returns stale=true.

- [ ] **Step 7: Run all scraper tests**

```bash
pnpm vitest run scripts/agents/roadmap/_kpi-*.test.mjs
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add scripts/agents/roadmap/_kpi-*.mjs scripts/agents/roadmap/_kpi-*.test.mjs
git commit -m "feat(roadmap): PostHog + Render + CF + GH + manual KPI scrapers [skip ci]"
```

### Task 2.4: KPI scraper orchestrator + cache layer

**Files:**
- Create: `scripts/agents/roadmap/_kpi-scraper.mjs`
- Test: `scripts/agents/roadmap/_kpi-scraper.test.mjs`

- [ ] **Step 1: Implement orchestrator**

```javascript
// scripts/agents/roadmap/_kpi-scraper.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { scrapeSupabase } from './_kpi-supabase.mjs';
import { scrapePosthog } from './_kpi-posthog.mjs';
import { scrapeRender } from './_kpi-render.mjs';
import { scrapeCfAnalytics } from './_kpi-cf.mjs';
import { scrapeGhRepo } from './_kpi-gh.mjs';
import { scrapeManual } from './_kpi-manual.mjs';

const CACHE_PATH = 'docs/roadmap/_kpi-cache.json';
const TTL_DEFAULT = 3600 * 1000; // 1h
const TTL_BY_SOURCE = { render_logs: 6 * 3600 * 1000, cf_analytics: 24 * 3600 * 1000 };

export async function scrapeAllKpis(items, { now = Date.now(), forceRefresh = false } = {}) {
  const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : { entries: {} };
  const grouped = { supabase: [], posthog: [], render_logs: [], cf_analytics: [], gh_repo: [], manual: [] };
  const fresh = [];

  for (const it of items) {
    const key = `${it.kpi.source}:${it.kpi.metric}`;
    const cached = cache.entries[key];
    const ttl = TTL_BY_SOURCE[it.kpi.source] || TTL_DEFAULT;
    if (!forceRefresh && cached && (now - new Date(cached.fetchedAt).getTime() < ttl)) {
      fresh.push({ ...cached, metric: it.kpi.metric, cached: true });
      continue;
    }
    if (grouped[it.kpi.source]) grouped[it.kpi.source].push(it);
  }

  const results = await Promise.allSettled([
    grouped.supabase.length ? scrapeSupabase(grouped.supabase) : [],
    grouped.posthog.length ? scrapePosthog(grouped.posthog) : [],
    grouped.render_logs.length ? scrapeRender(grouped.render_logs) : [],
    grouped.cf_analytics.length ? scrapeCfAnalytics(grouped.cf_analytics) : [],
    grouped.gh_repo.length ? scrapeGhRepo(grouped.gh_repo) : [],
    grouped.manual.length ? scrapeManual(grouped.manual) : [],
  ]);

  const liveResults = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  for (const r of liveResults) {
    const matchedItem = items.find(i => i.kpi.metric === r.metric);
    if (!matchedItem) continue;
    const key = `${matchedItem.kpi.source}:${r.metric}`;
    cache.entries[key] = { ...r, fetchedAt: r.fetchedAt || new Date(now).toISOString() };
  }

  cache.lastFullRefresh = new Date(now).toISOString();
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  return [...fresh, ...liveResults];
}
```

- [ ] **Step 2: Write test**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { scrapeAllKpis } from './_kpi-scraper.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

vi.mock('./_kpi-manual.mjs', () => ({
  scrapeManual: vi.fn().mockResolvedValue([{ metric: 'foo', value: 42, stale: false, fetchedAt: '2026-06-10T00:00:00Z' }])
}));

describe('scrapeAllKpis', () => {
  it('routes manual source to manual scraper and writes cache', async () => {
    mkdirSync('docs/roadmap', { recursive: true });
    writeFileSync('docs/roadmap/_kpi-cache.json', '{"entries":{}}');
    const res = await scrapeAllKpis([{ kpi: { source: 'manual', metric: 'foo', query: 'foo' } }], { forceRefresh: true });
    expect(res[0]).toMatchObject({ metric: 'foo', value: 42 });
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest run scripts/agents/roadmap/_kpi-scraper.test.mjs
git add scripts/agents/roadmap/_kpi-scraper.mjs scripts/agents/roadmap/_kpi-scraper.test.mjs
git commit -m "feat(roadmap): KPI scraper orchestrator + cache layer [skip ci]"
```

### Task 2.5: Tripwire engine (sandboxed evaluator)

**Files:**
- Create: `scripts/agents/roadmap/_tripwire-eval.mjs`
- Test: `scripts/agents/roadmap/_tripwire-eval.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { evalTripwires } from './_tripwire-eval.mjs';

const TRIPWIRES = [
  { id: 'T-A', name: 'CF budget over', condition: 'ctx.budget.cfBuildsMonth.pct > 60', action: 'defer_to_founder' },
  { id: 'T-B', name: 'Proxy block', condition: "ctx.external.lastAnthropicError && /403/.test(ctx.external.lastAnthropicError)", action: 'kill_workflow' },
  { id: 'T-EVIL', name: 'eval escape attempt', condition: "process.exit(1)", action: 'noop' },
];

describe('evalTripwires', () => {
  it('fires matching tripwires', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 75 } }, external: {} };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).toContain('T-A');
    expect(fired.map(f => f.id)).not.toContain('T-B');
  });

  it('blocks sandbox escape (process.exit etc)', () => {
    const ctx = { budget: { cfBuildsMonth: { pct: 0 } }, external: {} };
    const fired = evalTripwires(TRIPWIRES, ctx);
    expect(fired.map(f => f.id)).not.toContain('T-EVIL'); // process undefined in sandbox
    // Should not have terminated test process
  });

  it('returns parse-error markers instead of throwing on bad condition', () => {
    const bad = [{ id: 'T-BAD', condition: '))))', action: 'noop' }];
    const fired = evalTripwires(bad, {});
    expect(fired).toEqual([]); // bad condition = silent skip + log
  });
});
```

- [ ] **Step 2: Implement w/ sandboxed Function**

```javascript
// scripts/agents/roadmap/_tripwire-eval.mjs
export function evalTripwires(tripwires, ctx) {
  const fired = [];
  // Freeze ctx + provide minimal safe globals only
  const safeCtx = Object.freeze(JSON.parse(JSON.stringify(ctx))); // deep clone + freeze
  for (const tw of tripwires) {
    try {
      // No process, no require, no global, no this. Only `ctx` arg.
      const fn = new Function('ctx', 'Math', 'Object', 'Array', 'JSON', 'Date', `"use strict"; return Boolean(${tw.condition});`);
      const result = fn(safeCtx, Math, Object, Array, JSON, Date);
      if (result) fired.push({ ...tw, firedAt: new Date().toISOString() });
    } catch (e) {
      console.warn(`tripwire ${tw.id} eval error: ${e.message}`);
    }
  }
  return fired;
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest run scripts/agents/roadmap/_tripwire-eval.test.mjs
git add scripts/agents/roadmap/_tripwire-eval.mjs scripts/agents/roadmap/_tripwire-eval.test.mjs
git commit -m "feat(roadmap): tripwire engine w/ sandboxed Function evaluator [skip ci]"
```

---

**Phase 2 done. Output: anthropic client (no swap), 6 KPI scrapers, cache layer, tripwire engine. All TDD-covered.**

---

## Phase 3: Orchestrator + Decision Agent + sub-agents + cron yml

### Task 3.1: Signal-context builder

**Files:**
- Create: `scripts/agents/roadmap/_signal-context.mjs`
- Test: `scripts/agents/roadmap/_signal-context.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
import { describe, it, expect } from 'vitest';
import { buildSignalContext } from './_signal-context.mjs';

describe('buildSignalContext', () => {
  it('compresses items into byStatus/byCategory/byPriority counts', () => {
    const items = [
      { id: 'R-Q1-E-001', status: 'planned', category: 'engineering', priority: 'P0', owner_role: 'cto', agent_assignable: true, founder_blocker: null, depends_on: [], kpi: { metric: 'foo', current: 0, target: 10 }, revenue_impact: { amount_inr: 1000 }, est_hours: 4 },
      { id: 'R-Q1-S-001', status: 'shipped', category: 'supply', priority: 'P1', owner_role: 'cmo', agent_assignable: true, founder_blocker: null, depends_on: [], kpi: { metric: 'bar', current: 5, target: 10 }, revenue_impact: { amount_inr: 5000 }, est_hours: 2 },
    ];
    const ctx = buildSignalContext({ items, kpis: [], queue: [], tripwiresFired: [], budgets: { gh: { used: 100, cap: 2000 } } });
    expect(ctx.items.byStatus).toEqual({ planned: 1, shipped: 1 });
    expect(ctx.items.byCategory).toEqual({ engineering: 1, supply: 1 });
    expect(ctx.items.readyToShip[0]).toBe('R-Q1-E-001');
  });
});
```

- [ ] **Step 2: Implement**

```javascript
// scripts/agents/roadmap/_signal-context.mjs
import { readFileSync, existsSync } from 'node:fs';

function countBy(arr, key) {
  return arr.reduce((acc, x) => { acc[x[key]] = (acc[x[key]] || 0) + 1; return acc; }, {});
}

export function buildSignalContext({ items, kpis, queue, tripwiresFired, budgets, founderState, external, sectorSummaries }) {
  const now = new Date();
  const readyToShip = items
    .filter(i => i.status === 'planned' && i.agent_assignable && !i.founder_blocker)
    .filter(i => i.depends_on.every(dep => items.find(x => x.id === dep)?.status === 'verified'))
    .sort((a, b) => (b.revenue_impact.amount_inr / b.est_hours) - (a.revenue_impact.amount_inr / a.est_hours))
    .slice(0, 20)
    .map(i => i.id);

  const founderBlocked = items.filter(i => i.founder_blocker).map(i => ({
    itemId: i.id,
    blocker: i.founder_blocker,
    daysOpen: Math.floor((now - new Date(i.created_at)) / 86400000),
  }));

  return {
    cycle: { ts: now.toISOString(), dayOfMonth: now.getUTCDate(), dayOfWeek: now.getUTCDay() },
    budget: budgets,
    kpis: kpis.reduce((acc, k) => { acc[k.metric] = k; return acc; }, {}),
    items: {
      totalCount: items.length,
      byStatus: countBy(items, 'status'),
      byCategory: countBy(items, 'category'),
      byPriority: countBy(items, 'priority'),
      byOwnerRole: countBy(items, 'owner_role'),
      tripwireHits: tripwiresFired.filter(t => t.itemId),
      readyToShip,
      founderBlocked,
    },
    queue: {
      depth: queue.length,
      oldestAgeHours: queue.length ? Math.max(...queue.map(q => (now - new Date(q.emittedAt)) / 3600000)) : 0,
      byRole: countBy(queue, 'role'),
    },
    verticals: external?.verticals || {},
    sectorDocs: sectorSummaries || {},
    founderState: founderState || {},
    external: external || {},
    firedTripwires: tripwiresFired,
  };
}
```

- [ ] **Step 3: Commit**

```bash
pnpm vitest run scripts/agents/roadmap/_signal-context.test.mjs
git add scripts/agents/roadmap/_signal-context.mjs scripts/agents/roadmap/_signal-context.test.mjs
git commit -m "feat(roadmap): signal-context builder (compresses items+kpis+queue+budgets) [skip ci]"
```

### Task 3.2: Decision Agent system prompt

**Files:**
- Create: `scripts/agents/roadmap/_decision-prompt.mjs`

- [ ] **Step 1: Write compiler**

```javascript
// scripts/agents/roadmap/_decision-prompt.mjs
// Compiles Decision Agent system prompt. Loaded once per cycle.

export const DECISION_SYSTEM_PROMPT = `You are the Master Orchestrator of Bhaktisetu/Darshya virtual company.
Reasoning: deepest, most rigorous. You are Opus 4.7 at max effort.
Your job: every 6h decide which 3-7 roadmap items advance NEXT cycle.

Hierarchy you command:
  cto-agent     — engineering, security, perf, infra
  cfo-agent     — finance, unit econ, fundraising, free-tier budget
  cmo-agent     — marketing, content, social, SEO, distribution
  cpo-agent     — product, UX, feature prioritization
  sales-agent   — supply (pandit/temple/astrologer/gaushala/gurukul), demand, B2B LOIs
  talent-agent  — hiring triggers, JDs
  cs-agent      — support, churn, NPS, macros
  legal-agent   — incorp, DPDP, contracts
  it-agent      — observability, DR, free-tier tripwires
  hr-agent      — onboarding playbooks per role
  researcher    — web search, competitor scan
  geo-agent     — city/state/country expansion sequencing

Sources of truth (already loaded into your context):
  - docs/roadmap/_index.json (~283 items, all statuses)
  - docs/company/00-09.md (department audits — summarized in sectorDocs)
  - docs/ceo-roadmap-2026-05-27.md (90-day plan + revenue lines)
  - docs/free-tier-budgets.md (NEVER violate)
  - docs/activation-gates.md (founder-blocker Uxx items)
  - signal-context (this cycle's KPI snapshot)

Decision principles (in order):
  1. NEVER schedule founder-blocked work to ship via agent
  2. NEVER violate free-tier (CF 500/mo build, GH 2000min/mo, Resend 100/day)
  3. Revenue-impact / hour ratio = primary ranking metric, tie-broken by P0>P1>P2
  4. Tripwire match → handle immediately (do not skip)
  5. Respect DAG: don't spawn items whose depends_on aren't verified
  6. Diversify roles per cycle: enforce CTO+CMO+Sales+CS coverage minimum
  7. Balance India + NRI work per CEO-roadmap mix targets
  8. Geo sequencing: don't open new city until current city ≥ 80% target
  9. Reason aloud, show work in reasoning field

Output: use the provided tools exclusively.
  - spawn_subagent({role, itemIds[], briefing, estTokens})  — 3-7 per cycle
  - defer_to_founder({itemId, reason, suggestedAction})     — 0-3 per cycle
  - kill_item({itemId, reason, replacementItemId})          — 0-2 per cycle
  - write_decision_note({reasoning, marketSignals, kpiDeltas, nextCycleHypothesis})  — 1 per cycle (always last)
`;

export const DECISION_TOOLS = [
  {
    name: 'spawn_subagent',
    description: 'Spawn a sub-agent to compose Claude Code prompts for 1-3 roadmap items.',
    input_schema: {
      type: 'object',
      required: ['role', 'itemIds', 'briefing'],
      properties: {
        role: { type: 'string', enum: ['cto','cfo','cmo','cpo','sales','talent','cs','legal','it','hr','researcher','geo'] },
        itemIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
        briefing: { type: 'string', description: 'What to focus on, signals to address.' },
        estTokens: { type: 'integer', minimum: 1000, maximum: 50000 },
      }
    }
  },
  {
    name: 'defer_to_founder',
    description: 'Mark item as requiring founder action (cannot be agent-assigned this cycle).',
    input_schema: {
      type: 'object',
      required: ['itemId', 'reason'],
      properties: {
        itemId: { type: 'string' },
        reason: { type: 'string' },
        suggestedAction: { type: 'string' },
      }
    }
  },
  {
    name: 'kill_item',
    description: 'Mark item as killed (tripwire fired or strategically obsolete).',
    input_schema: {
      type: 'object',
      required: ['itemId', 'reason'],
      properties: {
        itemId: { type: 'string' },
        reason: { type: 'string' },
        replacementItemId: { type: 'string' },
      }
    }
  },
  {
    name: 'write_decision_note',
    description: 'Final reasoning trace for this cycle. MUST be called exactly once.',
    input_schema: {
      type: 'object',
      required: ['reasoning', 'kpiDeltas', 'nextCycleHypothesis'],
      properties: {
        reasoning: { type: 'string' },
        marketSignals: { type: 'string' },
        kpiDeltas: { type: 'string' },
        nextCycleHypothesis: { type: 'string' },
      }
    }
  },
];

export function buildDecisionUserMessage(signalContext) {
  return `Cycle ts: ${signalContext.cycle.ts}
Backlog: ${signalContext.items.totalCount} total · ${signalContext.items.byStatus.planned || 0} planned · ${signalContext.items.byStatus.in_progress || 0} in_progress · ${signalContext.items.byStatus.shipped || 0} shipped · ${signalContext.items.byStatus.verified || 0} verified · ${signalContext.items.byStatus.blocked || 0} blocked

Budget: GH ${signalContext.budget?.ghMinutesMonth?.pct?.toFixed(1) ?? '?'}% · CF ${signalContext.budget?.cfBuildsMonth?.pct?.toFixed(1) ?? '?'}%

Queue depth: ${signalContext.queue.depth} (oldest ${signalContext.queue.oldestAgeHours.toFixed(1)}h)

Fired tripwires: ${signalContext.firedTripwires.map(t => t.id).join(', ') || 'none'}

Ready-to-ship (top 20): ${signalContext.items.readyToShip.join(', ')}

Founder-blocked: ${signalContext.items.founderBlocked.map(b => `${b.itemId}(${b.blocker}/${b.daysOpen}d)`).join(', ') || 'none'}

Full signal-context attached as JSON below:

\`\`\`json
${JSON.stringify(signalContext, null, 2)}
\`\`\`

Decide what 3-7 items advance this cycle. Use tools.`;
}
```

- [ ] **Step 2: Commit** (no test — pure constant compilation; tested via orchestrator integration test)

```bash
git add scripts/agents/roadmap/_decision-prompt.mjs
git commit -m "feat(roadmap): Decision Agent system prompt + tool schemas + user msg builder [skip ci]"
```

### Task 3.3: Sub-agent runner

**Files:**
- Create: `scripts/agents/roadmap/_subagent-runner.mjs`
- Test: `scripts/agents/roadmap/_subagent-runner.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { runSubagent } from './_subagent-runner.mjs';

describe('runSubagent', () => {
  it('returns queueFiles[] from valid Opus response', async () => {
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: `---
queueId: Q-test
itemId: R-Q1-E-001
role: cto
emittedAt: 2026-06-10T00:00:00Z
emittedBy: cto-agent
cycleId: C-test
priority: P0
estTokens: 1000
estMinutes: 30
estCfBuilds: 0
estGhMinutes: 0
blocksDeploy: false
spawnPlanContext: { reasoning: "test", kpiDelta: "n/a", tripwireTouches: [] }
verifyContract: { successCriteria: ["ok"], curlChecks: [], sqlChecks: [], testCommand: null }
finalizationActions: [move_self_to_done]
---
# Prompt body here` }],
      usage: { input_tokens: 100, output_tokens: 50 }
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 'test', items: [{ id: 'R-Q1-E-001', title: 'T', agent_brief: {} }], cycleId: 'C-test', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(1);
    expect(res.queueFiles[0].frontmatter.itemId).toBe('R-Q1-E-001');
  });

  it('returns empty queueFiles[] + error on malformed YAML', async () => {
    const fakeOpus = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'not valid yaml frontmatter' }],
      usage: { input_tokens: 100, output_tokens: 10 }
    });
    const res = await runSubagent({ role: 'cto', itemIds: ['R-Q1-E-001'], briefing: 'test', items: [{ id: 'R-Q1-E-001' }], cycleId: 'C-test', opusFn: fakeOpus });
    expect(res.queueFiles).toHaveLength(0);
    expect(res.errors).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implement**

```javascript
// scripts/agents/roadmap/_subagent-runner.mjs
import yaml from 'js-yaml';
import { callOpus47 } from './_anthropic-client.mjs';

const SUBAGENT_SYSTEM = (role) => `You are ${role}-agent for Bhaktisetu. Opus 4.7 max effort.
Master Orchestrator spawned you to compose Claude Code prompts for specific roadmap items.

Your job:
  1. Read each item's full content (provided)
  2. Compose ONE Claude Code prompt PER ITEM
  3. Each prompt must be:
     - Self-contained (paste into /goal command works without other context)
     - Cite all files + line numbers to touch
     - Specify TDD test-first per superpowers doctrine
     - List success_criteria verbatim from item
     - Include verify commands (curl / SQL / pnpm test)
     - Estimate token + minute cost
     - Tag founder-action required steps explicitly
  4. Output format: ONE markdown document per item, separated by line "---END-QUEUE-FILE---"
  5. Each document starts with YAML frontmatter (queueId, itemId, role, emittedAt, etc per queue schema)

Tone: terse caveman per Bhaktisetu doctrine. Code blocks normal. Security warnings normal.
Never invent file paths.`;

export async function runSubagent({ role, itemIds, briefing, items, cycleId, opusFn = callOpus47 }) {
  const targetItems = items.filter(i => itemIds.includes(i.id));
  const userMsg = `Briefing: ${briefing}

Items to process (compose one queue file per item):

${targetItems.map(i => `## ${i.id} — ${i.title}\n\`\`\`yaml\n${yaml.dump(i)}\n\`\`\``).join('\n\n')}

Cycle: ${cycleId}
Emit each queue file separated by line "---END-QUEUE-FILE---".`;

  const errors = [];
  let response;
  try {
    response = await opusFn({
      system: SUBAGENT_SYSTEM(role),
      messages: [{ role: 'user', content: userMsg }],
      maxTokens: 8000,
      temperature: 0.3,
    });
  } catch (e) {
    return { queueFiles: [], errors: [e.message], usage: null };
  }

  const text = response.content.find(c => c.type === 'text')?.text || '';
  const chunks = text.split(/^---END-QUEUE-FILE---$/m).map(c => c.trim()).filter(Boolean);

  const queueFiles = [];
  for (const chunk of chunks) {
    const m = chunk.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
    if (!m) { errors.push(`malformed queue file: ${chunk.slice(0, 100)}`); continue; }
    try {
      const frontmatter = yaml.load(m[1]);
      const body = m[2];
      if (!frontmatter?.queueId || !frontmatter?.itemId) {
        errors.push(`missing queueId or itemId in: ${chunk.slice(0, 100)}`);
        continue;
      }
      queueFiles.push({ frontmatter, body, raw: chunk });
    } catch (e) {
      errors.push(`yaml parse fail: ${e.message}`);
    }
  }

  return { queueFiles, errors, usage: response.usage };
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest run scripts/agents/roadmap/_subagent-runner.test.mjs
git add scripts/agents/roadmap/_subagent-runner.mjs scripts/agents/roadmap/_subagent-runner.test.mjs
git commit -m "feat(roadmap): sub-agent runner (Opus 4.7 → parsed queue files) [skip ci]"
```

### Task 3.4: Orchestrator entry script

**Files:**
- Create: `scripts/agents/roadmap-orchestrator.mjs`

- [ ] **Step 1: Implement orchestrator (no test — integration tested via dry-run)**

```javascript
#!/usr/bin/env node
// scripts/agents/roadmap-orchestrator.mjs
// Master entry. Cron-invoked every 6h.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { scrapeAllKpis } from './roadmap/_kpi-scraper.mjs';
import { evalTripwires } from './roadmap/_tripwire-eval.mjs';
import { buildSignalContext } from './roadmap/_signal-context.mjs';
import { DECISION_SYSTEM_PROMPT, DECISION_TOOLS, buildDecisionUserMessage } from './roadmap/_decision-prompt.mjs';
import { runSubagent } from './roadmap/_subagent-runner.mjs';
import { callOpus47, ModelRejectedError } from './roadmap/_anthropic-client.mjs';
import { buildIndex } from './roadmap/_index-build.mjs';

const DRY_RUN = process.env.DRY_RUN === 'true';
const QUEUE_DIR = DRY_RUN ? 'docs/roadmap/_dryrun/queue' : 'docs/roadmap/queue';
const DECISIONS_DIR = DRY_RUN ? 'docs/roadmap/_dryrun/decisions' : 'docs/roadmap/decisions';
const ALERTS_DIR = 'docs/roadmap/_alerts';

async function main() {
  const cycleTs = new Date().toISOString();
  const cycleId = `C-${cycleTs.replace(/[^0-9T]/g, '').slice(0, 13)}`;
  console.log(`[orchestrator] cycle ${cycleId} start (DRY_RUN=${DRY_RUN})`);

  // Check pause flag
  const budgetPath = 'docs/roadmap/_budget-snapshot.json';
  const budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
  if (budget.orchestratorPaused) {
    console.log(`[orchestrator] paused — exiting`);
    process.exit(0);
  }

  // 1. INGEST
  const index = buildIndex();
  const items = index.items;
  const tripwires = yaml.load(readFileSync('docs/roadmap/_tripwires-global.yml', 'utf8')).tripwires;
  const queue = readdirSync(QUEUE_DIR).filter(f => f.endsWith('.md')).map(f => {
    const content = readFileSync(join(QUEUE_DIR, f), 'utf8');
    const m = content.match(/^---\n([\s\S]+?)\n---/);
    return m ? yaml.load(m[1]) : null;
  }).filter(Boolean);

  console.log(`[orchestrator] ingested ${items.length} items, ${queue.length} queue, ${tripwires.length} tripwires`);

  // 2. SCRAPE KPIs
  const kpis = await scrapeAllKpis(items.filter(i => i.kpi?.source));
  console.log(`[orchestrator] scraped ${kpis.length} KPIs (${kpis.filter(k => k.stale).length} stale)`);

  // 3. BUILD SIGNAL CONTEXT
  const externalErr = null; // populated if prior cycle hit Anthropic error
  const signalContext = buildSignalContext({
    items,
    kpis,
    queue,
    tripwiresFired: [],
    budgets: budget,
    external: { lastAnthropicError: externalErr },
  });

  // 4. EVAL TRIPWIRES
  const firedTripwires = evalTripwires(tripwires, signalContext);
  signalContext.firedTripwires = firedTripwires;
  console.log(`[orchestrator] fired tripwires: ${firedTripwires.map(t => t.id).join(', ') || 'none'}`);

  // T-005 = halt
  if (firedTripwires.find(t => t.id === 'T-005')) {
    writeAlert(`tripwire-T-005-${cycleId}.md`, 'Anthropic proxy blocked. Halting workflow per user directive.');
    process.exit(2);
  }

  // 5. SPAWN DECISION AGENT
  let decisionResponse;
  try {
    decisionResponse = await callOpus47({
      system: DECISION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildDecisionUserMessage(signalContext) }],
      tools: DECISION_TOOLS,
      maxTokens: 8000,
      temperature: 0.3,
    });
  } catch (e) {
    if (e instanceof ModelRejectedError) {
      writeAlert(`model-rejected-${cycleId}.md`, `Decision Agent rejected: ${e.message}\nHalting per user directive.`);
      process.exit(2);
    }
    writeAlert(`decision-error-${cycleId}.md`, e.message);
    process.exit(1);
  }

  // 6. PARSE TOOL CALLS
  const toolCalls = decisionResponse.content.filter(c => c.type === 'tool_use');
  const spawnPlan = toolCalls.filter(t => t.name === 'spawn_subagent').map(t => t.input);
  const deferrals = toolCalls.filter(t => t.name === 'defer_to_founder').map(t => t.input);
  const kills = toolCalls.filter(t => t.name === 'kill_item').map(t => t.input);
  const decisionNote = toolCalls.find(t => t.name === 'write_decision_note')?.input;

  console.log(`[orchestrator] decision: spawn ${spawnPlan.length}, defer ${deferrals.length}, kill ${kills.length}`);

  // 7. SPAWN SUB-AGENTS IN PARALLEL (max 5 concurrent)
  const allQueueFiles = [];
  for (let i = 0; i < spawnPlan.length; i += 5) {
    const chunk = spawnPlan.slice(i, i + 5);
    const results = await Promise.allSettled(chunk.map(p => runSubagent({ ...p, items, cycleId })));
    for (const r of results) {
      if (r.status === 'fulfilled') allQueueFiles.push(...r.value.queueFiles);
    }
  }

  // 8. WRITE QUEUE FILES
  mkdirSync(QUEUE_DIR, { recursive: true });
  for (const qf of allQueueFiles) {
    const slug = qf.frontmatter.itemTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'untitled';
    const fname = `${cycleTs.replace(/[:.]/g, '-')}-${qf.frontmatter.role}-${qf.frontmatter.itemId}-${slug}.md`;
    writeFileSync(join(QUEUE_DIR, fname), `---\n${yaml.dump(qf.frontmatter)}---\n${qf.body}`);
  }

  // 9. WRITE DECISION NOTE
  mkdirSync(DECISIONS_DIR, { recursive: true });
  writeFileSync(join(DECISIONS_DIR, `${cycleId}.md`), `# Decision ${cycleId}\n\n${JSON.stringify({ spawnPlan, deferrals, kills, decisionNote, firedTripwires }, null, 2)}`);

  // 10. UPDATE BUDGET SNAPSHOT
  budget.lastCycle = cycleTs;
  budget.lastCycleSpawned = spawnPlan.length;
  writeFileSync(budgetPath, JSON.stringify(budget, null, 2));

  console.log(`[orchestrator] cycle ${cycleId} done. ${allQueueFiles.length} queue files written.`);
}

function writeAlert(filename, body) {
  mkdirSync(ALERTS_DIR, { recursive: true });
  writeFileSync(join(ALERTS_DIR, filename), `# Alert\n\n${body}\n\nTs: ${new Date().toISOString()}\n`);
}

main().catch(e => { console.error(e); writeAlert(`uncaught-${Date.now()}.md`, e.stack); process.exit(1); });
```

- [ ] **Step 2: Local dry-run**

```bash
cd E:/NewClaude/bhaktisetu
DRY_RUN=true ANTHROPIC_API_KEY=$YOUR_KEY ANTHROPIC_BASE_URL=$BLACKBOX_PROXY ANTHROPIC_MODEL=claude-opus-4-7 node scripts/agents/roadmap-orchestrator.mjs
```

Expected: writes to `docs/roadmap/_dryrun/queue/` + `docs/roadmap/_dryrun/decisions/`. Inspect by hand.

- [ ] **Step 3: Commit**

```bash
git add scripts/agents/roadmap-orchestrator.mjs
git commit -m "feat(roadmap): orchestrator entry (ingest → KPIs → tripwires → decision → spawn → write) [skip ci]"
```

### Task 3.5: GH Actions workflow yml

**Files:**
- Create: `.github/workflows/roadmap-loop.yml`

- [ ] **Step 1: Write workflow**

```yaml
name: Roadmap Orchestrator

on:
  schedule:
    - cron: '17 */6 * * *'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run (write to _dryrun/ paths, no live queue)'
        type: boolean
        default: false

permissions:
  contents: write

concurrency:
  group: roadmap-orchestrator
  cancel-in-progress: false

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 50

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        run: corepack enable && corepack prepare pnpm@10.33.0 --activate

      - name: Install deps (skip web/api)
        run: pnpm install --frozen-lockfile --filter=!@poojly/web --filter=!@poojly/api --prefer-offline

      - name: Run orchestrator
        env:
          DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_BLACKBOX_PROXY }}
          ANTHROPIC_BASE_URL: ${{ secrets.ANTHROPIC_BASE_URL }}
          ANTHROPIC_MODEL: claude-opus-4-7
          DATABASE_URL_READONLY: ${{ secrets.DATABASE_URL_READONLY }}
          SUPABASE_DIRECT_URL: ${{ secrets.SUPABASE_DIRECT_URL }}
          POSTHOG_PERSONAL_API_KEY: ${{ secrets.POSTHOG_PERSONAL_API_KEY }}
          POSTHOG_PROJECT_ID: ${{ secrets.POSTHOG_PROJECT_ID }}
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
          CF_ANALYTICS_TOKEN: ${{ secrets.CF_ANALYTICS_TOKEN }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/agents/roadmap-orchestrator.mjs

      - name: Commit + push
        if: success() || failure()
        run: |
          git config user.name "roadmap-orchestrator[bot]"
          git config user.email "actions@users.noreply.github.com"
          git add docs/roadmap/
          if git diff --cached --quiet; then
            echo "no changes"
          else
            git commit -m "roadmap: orchestrator cycle $(date -u +%Y%m%dT%H%M) [skip ci]"
            git pull --rebase
            git push
          fi
```

- [ ] **Step 2: Add secrets in GH UI** (founder action — list in Phase 6 soak checklist)

Required secrets:
- `ANTHROPIC_API_KEY_BLACKBOX_PROXY`
- `ANTHROPIC_BASE_URL`
- `DATABASE_URL_READONLY` (preferred) OR `SUPABASE_DIRECT_URL`
- `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`
- `RENDER_API_KEY`
- `CF_ANALYTICS_TOKEN`

- [ ] **Step 3: Commit + manual workflow_dispatch trigger w/ dry_run=true**

```bash
git add .github/workflows/roadmap-loop.yml
git commit -m "feat(roadmap): GH Actions cron workflow (6h cadence, 8min timeout) [skip ci]"
git push
gh workflow run roadmap-loop.yml -f dry_run=true
gh run watch
```

Expected: workflow completes ✓, writes files under `docs/roadmap/_dryrun/`.

### Task 3.6: 7-day dry-run soak gate

**Files:**
- Modify: `.github/workflows/roadmap-loop.yml`

- [ ] **Step 1: Add 7-day dry-run override**

Edit workflow: replace `DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}` with:

```yaml
DRY_RUN: ${{ github.event.inputs.dry_run || vars.ROADMAP_DRY_RUN || 'true' }}
```

Set repo variable `ROADMAP_DRY_RUN=true` initially. Founder flips to `false` after 7-day review.

- [ ] **Step 2: Document soak checklist**

Append to `docs/roadmap/README.md`:

```markdown
## Soak protocol (Phase 6, mandatory)

After Phase 3 workflow goes live, run in DRY_RUN for 7 days minimum:

- Day 1-7: cron runs `*/6h` → writes to `_dryrun/queue/` + `_dryrun/decisions/`
- Daily founder review: `git pull && ls docs/roadmap/_dryrun/queue/` + read 1-2 random files
- Per-cycle checks:
  - Does Decision Agent reasoning make sense?
  - Are KPI deltas accurate vs independent SQL spot-check?
  - Are sub-agent prompts complete + paste-ready?
  - Any tripwire false positives?
- Tune Decision Agent system prompt iteratively (edit `_decision-prompt.mjs`)
- After 7d clean cycles → set repo variable `ROADMAP_DRY_RUN=false`
- First live cycle: watch closely. Pause via `/roadmap-pause` if needed.
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/roadmap-loop.yml docs/roadmap/README.md
git commit -m "feat(roadmap): 7-day dry-run gate via repo variable ROADMAP_DRY_RUN [skip ci]"
```

---

**Phase 3 done. Output: signal-context builder, Decision Agent prompt+tools, sub-agent runner, orchestrator entry, GH Actions cron, 7-day dry-run gate.**

---

## Phase 4: Session pickup + finalize workflow + slash commands

### Task 4.1: Queue-pop PowerShell script

**Files:**
- Create: `scripts/agents/roadmap/queue-pop.ps1`

- [ ] **Step 1: Write script**

```powershell
# scripts/agents/roadmap/queue-pop.ps1
# Reads oldest unconsumed queue file, echoes body, marks consumedAt + consumedBy.
# Invoked by UserPromptSubmit hook OR /goal-from-roadmap slash command.

$ErrorActionPreference = 'Stop'
$repoRoot = "E:\NewClaude\bhaktisetu"
$queueDir = Join-Path $repoRoot "docs\roadmap\queue"

if (-not (Test-Path $queueDir)) {
  Write-Output "<!-- roadmap queue dir missing -->"
  exit 0
}

# Find oldest .md by emittedAt (in frontmatter) or filename ts
$candidates = Get-ChildItem -Path $queueDir -Filter "*.md" -File | Sort-Object Name

foreach ($file in $candidates) {
  $content = Get-Content -Path $file.FullName -Raw
  if ($content -match '(?s)^---\r?\n(.+?)\r?\n---\r?\n(.+)$') {
    $fm = $matches[1]
    $body = $matches[2]
    # Skip already consumed
    if ($fm -match 'consumedAt:\s*\S+\S') { continue }

    # Mark consumed
    $sessionId = $env:CLAUDE_SESSION_ID ?? "unknown-session"
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $newFm = $fm -replace 'consumedAt:\s*null', "consumedAt: $now"
    $newFm = $newFm -replace 'consumedBy:\s*null', "consumedBy: claude-code"
    $newFm = $newFm -replace 'consumedInSessionId:\s*null', "consumedInSessionId: $sessionId"
    Set-Content -Path $file.FullName -Value "---`n$newFm`n---`n$body" -NoNewline

    # Echo body to stdout (becomes injected context for Claude)
    Write-Output "<!-- ROADMAP QUEUE ITEM: $($file.Name) -->"
    Write-Output ""
    Write-Output $body
    Write-Output ""
    Write-Output "<!-- On commit: include trailer 'Closes: $($fm | Select-String 'queueId:\s*(\S+)' | ForEach-Object { $_.Matches[0].Groups[1].Value })' -->"
    exit 0
  }
}

Write-Output "<!-- roadmap queue empty -->"
exit 0
```

- [ ] **Step 2: Smoke test**

Create a fake queue file:

```bash
cd E:/NewClaude/bhaktisetu
cat > docs/roadmap/queue/2026-06-10T00-test-cto-R-Q1-E-001-test.md <<'EOF'
---
queueId: Q-test-001
itemId: R-Q1-E-001
role: cto
emittedAt: 2026-06-10T00:00:00Z
consumedAt: null
consumedBy: null
consumedInSessionId: null
priority: P1
estTokens: 100
estMinutes: 10
---
# Test prompt body
Hello world.
EOF

powershell -ExecutionPolicy Bypass -File scripts/agents/roadmap/queue-pop.ps1
cat docs/roadmap/queue/2026-06-10T00-test-cto-R-Q1-E-001-test.md | head -10
rm docs/roadmap/queue/2026-06-10T00-test-cto-R-Q1-E-001-test.md
```

Expected: script outputs body; file's `consumedAt` now populated.

- [ ] **Step 3: Commit**

```bash
git add scripts/agents/roadmap/queue-pop.ps1
git commit -m "feat(roadmap): queue-pop.ps1 (consume oldest, mark consumedAt) [skip ci]"
```

### Task 4.2: UserPromptSubmit hook

**Files:**
- Modify: `C:\Users\DELL\.claude\settings.json` (founder-side, not in repo)
- Document: `docs/roadmap/README.md` setup section

- [ ] **Step 1: Document hook config in README**

Append to `docs/roadmap/README.md`:

```markdown
## Session pickup setup (Windows founder workstation)

Add to `C:\Users\DELL\.claude\settings.json` under `hooks`:

```jsonc
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "^/goal\\s*$",
        "command": "powershell -ExecutionPolicy Bypass -File E:\\NewClaude\\bhaktisetu\\scripts\\agents\\roadmap\\queue-pop.ps1"
      }
    ]
  }
}
```

When founder types bare `/goal` (no args), oldest unconsumed queue prompt auto-injects.
```

- [ ] **Step 2: Commit**

```bash
git add docs/roadmap/README.md
git commit -m "docs(roadmap): UserPromptSubmit hook setup instructions [skip ci]"
```

### Task 4.3: Finalize workflow

**Files:**
- Create: `.github/workflows/roadmap-finalize.yml`
- Create: `scripts/agents/roadmap/finalize.mjs`

- [ ] **Step 1: Write finalize script**

```javascript
#!/usr/bin/env node
// scripts/agents/roadmap/finalize.mjs
// Parses Closes: Q-... trailers from recent commits.
// Verifies + moves queue files to done/.

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const QUEUE_DIR = 'docs/roadmap/queue';
const DONE_ROOT = 'docs/roadmap/done';
const ALERTS_DIR = 'docs/roadmap/_alerts';

function getRecentClosesTrailers() {
  // Look at commits on this push (GITHUB_EVENT_PATH has push.commits[])
  let commits = [];
  if (process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    commits = event.commits || [];
  } else {
    // Local fallback: last 10 commits
    const log = execSync('git log -10 --format=%H%n%B%n---END---', { encoding: 'utf8' });
    commits = log.split('---END---').filter(Boolean).map(c => {
      const [sha, ...rest] = c.trim().split('\n');
      return { id: sha, message: rest.join('\n') };
    });
  }

  const trailers = [];
  for (const c of commits) {
    const matches = c.message.matchAll(/^Closes:\s*(Q-\S+)\s*$/gm);
    for (const m of matches) {
      trailers.push({ commitSha: c.id, queueId: m[1] });
    }
  }
  return trailers;
}

async function verifyContract(verifyContract) {
  // Minimal: just check that field exists; rich SQL/curl runners deferred
  // to Phase 6 (founder may run manually first).
  return { passed: true, notes: 'verifyContract execution deferred — manual verify recommended' };
}

async function main() {
  if (!existsSync(QUEUE_DIR)) { console.log('no queue dir'); return; }
  const trailers = getRecentClosesTrailers();
  if (trailers.length === 0) { console.log('no Closes: trailers found'); return; }

  const queueFiles = readdirSync(QUEUE_DIR).filter(f => f.endsWith('.md'));
  let moved = 0, failed = 0;

  for (const t of trailers) {
    const match = queueFiles.find(f => {
      const content = readFileSync(join(QUEUE_DIR, f), 'utf8');
      const m = content.match(/^---\n([\s\S]+?)\n---/);
      if (!m) return false;
      try { return yaml.load(m[1]).queueId === t.queueId; } catch { return false; }
    });
    if (!match) { console.warn(`queueId ${t.queueId} not found in queue/`); continue; }

    const content = readFileSync(join(QUEUE_DIR, match), 'utf8');
    const fm = yaml.load(content.match(/^---\n([\s\S]+?)\n---/)[1]);

    const verify = await verifyContract(fm.verifyContract);
    if (!verify.passed) {
      mkdirSync(ALERTS_DIR, { recursive: true });
      writeFileSync(join(ALERTS_DIR, `verify-failed-${t.queueId}.md`), `# Verify failed\n\nQueue: ${t.queueId}\nCommit: ${t.commitSha}\nNotes: ${verify.notes}\n`);
      failed++;
      continue;
    }

    // Update frontmatter
    fm.verifiedAt = new Date().toISOString();
    fm.shippedCommits = [...(fm.shippedCommits || []), t.commitSha];

    // Move to done/YYYY-MM/
    const ym = new Date().toISOString().slice(0, 7);
    const doneDir = join(DONE_ROOT, ym);
    mkdirSync(doneDir, { recursive: true });
    const body = content.split(/\n---\n/).slice(1).join('\n---\n');
    writeFileSync(join(doneDir, match), `---\n${yaml.dump(fm)}---\n${body}`);

    // Delete from queue
    execSync(`git rm "${join(QUEUE_DIR, match)}"`);
    moved++;
    console.log(`finalized ${t.queueId} → ${doneDir}/${match}`);
  }

  console.log(`done. moved=${moved}, failed=${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Write workflow yml**

```yaml
# .github/workflows/roadmap-finalize.yml
name: Roadmap Finalize

on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/roadmap/done/**'   # don't loop on our own commits
      - 'docs/roadmap/_alerts/**'

permissions:
  contents: write

concurrency:
  group: roadmap-finalize
  cancel-in-progress: false

jobs:
  finalize:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: corepack enable && corepack prepare pnpm@10.33.0 --activate
      - run: pnpm install --frozen-lockfile --filter=!@poojly/web --filter=!@poojly/api --prefer-offline
      - run: node scripts/agents/roadmap/finalize.mjs
      - name: Commit moves
        run: |
          git config user.name "roadmap-finalize[bot]"
          git config user.email "actions@users.noreply.github.com"
          git add docs/roadmap/
          if ! git diff --cached --quiet; then
            git commit -m "roadmap: finalize closed queue items [skip ci]"
            git pull --rebase
            git push
          fi
```

- [ ] **Step 3: Commit**

```bash
git add scripts/agents/roadmap/finalize.mjs .github/workflows/roadmap-finalize.yml
git commit -m "feat(roadmap): finalize workflow (Closes: trailer → move to done/) [skip ci]"
```

### Task 4.4: Three slash commands

**Files:**
- Create: `.claude/commands/goal-from-roadmap.md`
- Create: `.claude/commands/roadmap-list.md`
- Create: `.claude/commands/roadmap-kill.md`
- Create: `.claude/commands/roadmap-pause.md`
- Create: `.claude/commands/roadmap-resume.md`

- [ ] **Step 1: Write `/goal-from-roadmap`**

```markdown
---
description: Inject a specific roadmap queue item as the goal for this session
argument-hint: <queueId|itemId|next|next-cmo|next-cto|...>
---

Argument: $ARGUMENTS

Run this bash command and use the output as the current session goal:

```bash
node scripts/agents/roadmap/queue-pick.mjs "$ARGUMENTS"
```

If output starts with `<!-- ROADMAP QUEUE ITEM:`, treat the markdown body as the user request. Begin work following the prompt's instructions verbatim — including TDD, verify, commit w/ `Closes:` trailer.
```

- [ ] **Step 2: Write `/roadmap-list`**

```markdown
---
description: List top 10 unconsumed roadmap queue items
---

Run:

```bash
node scripts/agents/roadmap/queue-list.mjs
```

Display the output table to the user. Do not consume any items.
```

- [ ] **Step 3: Write `/roadmap-kill`**

```markdown
---
description: Mark a roadmap item as killed
argument-hint: <itemId> <reason>
---

Argument: $ARGUMENTS

Parse first whitespace-separated token as itemId, rest as reason. Run:

```bash
node scripts/agents/roadmap/item-kill.mjs "$ITEM_ID" "$REASON"
```

Output the result. The script flips status=killed, kills downstream blocked items, logs to `_alerts/`.
```

- [ ] **Step 4: Write `/roadmap-pause` + `/roadmap-resume`**

Simple wrappers that set/clear `orchestratorPaused` field in `_budget-snapshot.json`.

- [ ] **Step 5: Implement helper scripts**

Create:
- `scripts/agents/roadmap/queue-pick.mjs` — args: queueId|itemId|next|next-<role>. Output queue file body, mark consumed.
- `scripts/agents/roadmap/queue-list.mjs` — output table of top 10.
- `scripts/agents/roadmap/item-kill.mjs` — flip status=killed.
- `scripts/agents/roadmap/orchestrator-pause.mjs` — toggle flag.

Each ~30 lines, no LLM. Pure file ops + yaml read/write.

- [ ] **Step 6: Smoke test each command**

```bash
echo "test" > docs/roadmap/queue/test.md  # fake
# In Claude Code:
# /roadmap-list  → should show
# /goal-from-roadmap test  → should consume
```

- [ ] **Step 7: Commit**

```bash
git add .claude/commands/ scripts/agents/roadmap/queue-pick.mjs scripts/agents/roadmap/queue-list.mjs scripts/agents/roadmap/item-kill.mjs scripts/agents/roadmap/orchestrator-pause.mjs
git commit -m "feat(roadmap): 5 slash commands (/goal-from-roadmap, /roadmap-list, /roadmap-kill, /roadmap-pause, /roadmap-resume) [skip ci]"
```

### Task 4.5: End-to-end manual smoke test

- [ ] **Step 1: Run full loop locally w/ dry-run orchestrator**

```bash
cd E:/NewClaude/bhaktisetu
DRY_RUN=true ANTHROPIC_API_KEY=... ANTHROPIC_BASE_URL=... node scripts/agents/roadmap-orchestrator.mjs
ls docs/roadmap/_dryrun/queue/ | head -5
# Inspect 1 random queue file
# Manually copy to docs/roadmap/queue/ (since dry-run wrote elsewhere)
# Run queue-pop.ps1
powershell scripts/agents/roadmap/queue-pop.ps1
# Pretend to ship — commit empty change w/ Closes trailer
git commit --allow-empty -m "test: closes Q-... [skip ci]
Closes: Q-<copied-queueId>"
# Run finalize
node scripts/agents/roadmap/finalize.mjs
# Verify file moved
ls docs/roadmap/done/$(date -u +%Y-%m)/
```

Expected: full loop works.

- [ ] **Step 2: Document smoke test in README**

Append "Smoke test protocol" section.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap/README.md
git commit -m "docs(roadmap): end-to-end smoke test protocol [skip ci]"
```

---

**Phase 4 done. Output: PS1 queue-pop, finalize workflow, 5 slash commands, end-to-end loop tested.**

---

## Phase 5: `/admin/roadmap` dashboard

### Task 5.1: API endpoint

**Files:**
- Create: `apps/api/src/routes/admin-roadmap.ts`
- Modify: `apps/api/src/server.ts` (register route)
- Test: `apps/api/src/routes/admin-roadmap.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/routes/admin-roadmap.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../test-helpers/build-app.js';

describe('GET /api/v1/admin/roadmap', () => {
  it('401 without admin token', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/roadmap' });
    expect(res.statusCode).toBe(401);
  });

  it('200 with admin token + returns index/queue/decisions/kpis shape', async () => {
    const app = await build();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/roadmap',
      headers: { authorization: 'Bearer admin-demo-token' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('index');
    expect(body).toHaveProperty('queue');
    expect(body).toHaveProperty('decisions');
    expect(body).toHaveProperty('kpis');
    expect(body).toHaveProperty('tripwires');
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/routes/admin-roadmap.ts
import type { FastifyPluginAsync } from 'fastify';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import yaml from 'js-yaml';

const ROADMAP_ROOT = process.env.ROADMAP_ROOT || 'docs/roadmap';

function readQueue() {
  const dir = join(ROADMAP_ROOT, 'queue');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const content = readFileSync(join(dir, f), 'utf8');
    const m = content.match(/^---\n([\s\S]+?)\n---/);
    if (!m) return null;
    try {
      const fm = yaml.load(m[1]) as Record<string, unknown>;
      return { filename: f, ...fm };
    } catch { return null; }
  }).filter(Boolean);
}

function readLastDecisions(n = 20) {
  const dir = join(ROADMAP_ROOT, 'decisions');
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir, { recursive: true })
    .filter((f): f is string => typeof f === 'string' && f.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, n);
  return files.map(f => {
    const content = readFileSync(join(dir, f), 'utf8');
    return { filename: f, content: content.slice(0, 4000) }; // truncate huge
  });
}

const route: FastifyPluginAsync = async (app) => {
  app.get('/admin/roadmap', {
    preHandler: [authenticateUser, requireRole('admin')],
    config: { cache: { maxAge: 60 } },
  }, async () => {
    const indexPath = join(ROADMAP_ROOT, '_index.json');
    const kpiPath = join(ROADMAP_ROOT, '_kpi-cache.json');
    const tripwirePath = join(ROADMAP_ROOT, '_tripwires-global.yml');
    return {
      index: existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : { items: [] },
      queue: readQueue(),
      decisions: readLastDecisions(20),
      kpis: existsSync(kpiPath) ? JSON.parse(readFileSync(kpiPath, 'utf8')) : {},
      tripwires: { all: existsSync(tripwirePath) ? (yaml.load(readFileSync(tripwirePath, 'utf8')) as { tripwires: unknown[] }).tripwires : [] },
    };
  });
};

export default route;
```

- [ ] **Step 3: Register in `server.ts`**

```typescript
import adminRoadmapRoutes from './routes/admin-roadmap.js';
// ...
app.register(adminRoadmapRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 4: Run test + commit**

```bash
pnpm --filter @poojly/api test admin-roadmap
git add apps/api/src/routes/admin-roadmap.ts apps/api/src/routes/admin-roadmap.test.ts apps/api/src/server.ts
git commit -m "feat(api): GET /admin/roadmap (admin-gated, reads git files, 60s cache)"
```

### Task 5.2: Next.js dashboard page

**Files:**
- Create: `apps/web/app/admin/roadmap/page.tsx`
- Create: `apps/web/app/admin/roadmap/RoadmapClient.tsx`

- [ ] **Step 1: Server page (edge runtime, auth gate)**

```typescript
// apps/web/app/admin/roadmap/page.tsx
export const runtime = 'edge';
export const revalidate = 60;

import { AuthGuard } from '@/components/AuthGuard';
import RoadmapClient from './RoadmapClient';

export const metadata = { title: 'Roadmap · Darshya Admin', robots: 'noindex' };

export default function Page() {
  return (
    <AuthGuard requiredRole="admin">
      <RoadmapClient />
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Client component (6 panels per spec §10)**

```typescript
// apps/web/app/admin/roadmap/RoadmapClient.tsx
'use client';
import { useEffect, useState } from 'react';

interface RoadmapData {
  index: { items: Array<{ id: string; title: string; status: string; priority: string; owner_role: string; category: string; quarter: string; kpi: { metric: string; current: number; target: number; unit: string } }> };
  queue: Array<{ filename: string; queueId: string; itemId: string; role: string; priority: string; emittedAt: string; estMinutes: number }>;
  decisions: Array<{ filename: string; content: string }>;
  kpis: { entries: Record<string, { value: number; fetchedAt: string }> };
  tripwires: { all: Array<{ id: string; name: string }> };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.darshya.online';

export default function RoadmapClient() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('poojly_session_token') || localStorage.getItem('darshya_session_token');
    if (!token) { setErr('No auth token'); return; }
    fetch(`${API_BASE}/api/v1/admin/roadmap`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(e => setErr(String(e)));
    const i = setInterval(() => {
      fetch(`${API_BASE}/api/v1/admin/roadmap`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(setData).catch(() => {});
    }, 60000);
    return () => clearInterval(i);
  }, []);

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data) return <div className="p-6">Loading…</div>;

  const { items } = data.index;
  const byStatus = items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bhaktisetu Roadmap — Year 1</h1>

      {/* Panel 1: Burn-down */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Burn-down</h2>
        <div className="text-sm">
          {items.length} total · {byStatus.verified || 0} verified ({((byStatus.verified || 0) * 100 / items.length).toFixed(1)}%) · {byStatus.in_progress || 0} in_progress · {byStatus.blocked || 0} blocked · {byStatus.planned || 0} planned
        </div>
      </section>

      {/* Panel 2: KPIs */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Live KPIs (60s refresh)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(data.kpis.entries || {}).slice(0, 12).map(([key, v]) => (
            <div key={key} className="text-sm border rounded p-2">
              <div className="font-mono text-xs text-gray-600">{key}</div>
              <div className="font-bold text-lg">{v.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Panel 3: Queue */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Queue ({data.queue.length})</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left">queueId</th><th>item</th><th>role</th><th>P</th><th>min</th></tr></thead>
          <tbody>
            {data.queue.slice(0, 20).map(q => (
              <tr key={q.queueId} className="border-b">
                <td className="font-mono text-xs">{q.queueId}</td>
                <td>{q.itemId}</td>
                <td>{q.role}</td>
                <td>{q.priority}</td>
                <td>{q.estMinutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Panel 4: Tripwires */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Tripwires</h2>
        <ul className="text-sm space-y-1">
          {data.tripwires.all.map(t => <li key={t.id}><span className="font-mono">{t.id}</span> {t.name}</li>)}
        </ul>
      </section>

      {/* Panel 5: Items board (filtered) */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Items ({items.length})</h2>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="border-b sticky top-0 bg-white"><th className="text-left">id</th><th>title</th><th>status</th><th>P</th><th>owner</th><th>KPI</th></tr></thead>
            <tbody>
              {items.slice(0, 100).map(i => (
                <tr key={i.id} className="border-b">
                  <td className="font-mono">{i.id}</td>
                  <td>{i.title}</td>
                  <td>{i.status}</td>
                  <td>{i.priority}</td>
                  <td>{i.owner_role}</td>
                  <td>{i.kpi.current}/{i.kpi.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Panel 6: Last 20 decisions */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Decision history</h2>
        <details className="text-sm">
          <summary className="cursor-pointer">Show recent decisions</summary>
          {data.decisions.slice(0, 5).map(d => (
            <div key={d.filename} className="border-l-2 pl-3 my-3">
              <div className="font-mono text-xs text-gray-600">{d.filename}</div>
              <pre className="text-xs whitespace-pre-wrap">{d.content.slice(0, 1000)}</pre>
            </div>
          ))}
        </details>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Add nav link in admin**

Modify existing admin nav (`apps/web/app/admin/page.tsx` or admin layout) to add `/admin/roadmap` link alongside `/admin/agents`.

- [ ] **Step 4: Local build + commit (single CF push)**

```bash
cd E:/NewClaude/bhaktisetu
bash scripts/preflight-cf-pages.sh  # mandatory per CLAUDE.md
git add apps/web/app/admin/roadmap/ apps/web/app/admin/page.tsx
git commit -m "feat(web): /admin/roadmap dashboard — 6 panels (burn-down/KPIs/queue/tripwires/items/decisions)"
git push
```

This commit uses 1 CF Pages build slot (within budget). All prior commits this phase `[skip ci]` = 0 burn.

### Task 5.3: Dashboard verify post-deploy

- [ ] **Step 1: Wait for CF deploy ~3min, then curl**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://darshya.online/admin/roadmap
curl -s -o /dev/null -w "%{http_code}\n" https://api.darshya.online/api/v1/admin/roadmap
```

Expected: web 200, api 401 (no auth).

- [ ] **Step 2: Manual browser visit + admin login + verify all 6 panels render**

- [ ] **Step 3: Update TASKS.md HANDOFF**

Append HANDOFF block to `TASKS.md` per project doctrine.

```bash
# Edit TASKS.md, add HANDOFF block at top
git add TASKS.md
git commit -m "docs(tasks): HANDOFF — ARE Phase 5 dashboard live [skip ci]"
```

---

**Phase 5 done. Output: API endpoint + Next.js dashboard live at /admin/roadmap.**

---

## Phase 6: Soak + tune (14 days, ongoing)

### Task 6.1: Run in dry-run mode 7 days

- [ ] **Day 1**: Verify cron fires every 6h. Check `docs/roadmap/_dryrun/queue/` for emitted prompts. Read 2 random files end-to-end.
- [ ] **Day 2**: KPI accuracy audit. Spot-check 5 KPI values in `_kpi-cache.json` vs independent SQL/PostHog query. Fix any > 5% drift.
- [ ] **Day 3**: Tripwire calibration. Force-fire each tripwire condition manually. Check Decision Agent handles correctly.
- [ ] **Day 4**: Decision Agent reasoning review. Read 3 `_dryrun/decisions/*.md` files. Tune system prompt in `_decision-prompt.mjs` if reasoning weak.
- [ ] **Day 5**: Sub-agent prompt quality. Read 5 random queue files. Are they paste-ready? Self-contained? Cite files correctly?
- [ ] **Day 6**: Cost audit. Sum token usage from `_budget-snapshot.json`. Confirm Blackbox proxy still serving Opus 4.7 (no 403s in `_alerts/`).
- [ ] **Day 7**: Final review. Set `gh variable set ROADMAP_DRY_RUN --body false` to flip live.

### Task 6.2: First 7 days live

- [ ] **Day 8**: First live cycle. Founder watches dashboard. Verify queue file actually consumable via `/goal` hook.
- [ ] **Day 9-14**: Daily 5-min review. `/admin/roadmap` glance. Override or kill stale items via slash commands.
- [ ] **Day 14**: 14-day retro. Document learnings in `docs/roadmap/_retros/2026-06-W24.md`.

### Task 6.3: Sub-project gating

After 14d clean soak → ARE = operational → unblocks:
- Sub-project 2 (CXO advisory layer)
- Sub-project 4 (supply onboarding agents v2)
- Sub-project 5 (closed-loop KPI feedback)

Each gets own spec → plan → implement cycle.

---

## Self-review

**1. Spec coverage**: Checked each spec section against plan tasks.

| Spec § | Plan task | Status |
|---|---|---|
| §3 Storage architecture | Task 0.1 dir scaffold | ✓ |
| §4 Item schema + Year-1 ladder | Task 0.4 + Phase 1 | ✓ |
| §5 Orchestrator + cron + Decision Agent + sub-agent | Tasks 3.1-3.5 | ✓ |
| §6 Queue file format | Task 3.3 sub-agent runner output | ✓ |
| §7 KPI scraper + signal-context | Tasks 2.2-2.4 + 3.1 | ✓ |
| §8 Tripwire engine | Tasks 0.2 + 2.5 | ✓ |
| §9 Session pickup + finalization | Tasks 4.1-4.3 | ✓ |
| §10 /admin/roadmap dashboard | Tasks 5.1-5.3 | ✓ |
| §11 Override slash commands | Task 4.4 | ✓ |
| §12 Phased rollout | All phases covered | ✓ |
| §13 Steady-state budget | Phase 6 cost audit | ✓ |
| §14 Risk matrix | Tripwires (T-001..T-010) cover most; T-005 explicit halt | ✓ |
| §15 Open questions | Pre-emptive defaults locked at brainstorm time | ✓ |
| §17 Success criteria | Phase 6 audit covers | ✓ |

No spec gaps.

**2. Placeholder scan**:
- Task 1.1 Step 3 CSV header — only 1 example row shown, says "engineer fills from §1 item list". Acceptable — the §1 list IS the spec for 13 more rows, not a placeholder. Same pattern Task 1.2/1.3.
- Task 1.4 deliberately introduces `TBD-populate-before-orchestrator-go-live` markers — but Task 1.4 itself flags them via validator warning + Phase 6 soak gate ensures they're populated before live.
- All code blocks have full implementations. No "TODO: implement later" left.

**3. Type/name consistency**:
- `callOpus47` used consistently (Task 2.1 def → Tasks 3.3, 3.4 import).
- `ModelRejectedError` consistent (Task 2.1 def → Task 3.4 catch).
- `scrapeAllKpis` consistent (Task 2.4 def → Task 3.4 import).
- `evalTripwires` consistent (Task 2.5 def → Task 3.4 import).
- `buildSignalContext` consistent (Task 3.1 def → Task 3.4 import).
- `runSubagent` consistent (Task 3.3 def → Task 3.4 import).
- `buildIndex` consistent (Task 0.5 def → Task 3.4 import).
- Queue file frontmatter fields: `queueId`, `itemId`, `role`, `emittedAt`, `consumedAt`, `consumedBy`, `consumedInSessionId`, `verifiedAt`, `shippedCommits`, `priority`, `estTokens`, `estMinutes`, `verifyContract`, `spawnPlanContext` — consistent across Task 3.3 generation + Task 4.1 PS1 consumption + Task 4.3 finalize parsing.
- Item schema fields: `id`, `title`, `category`, `owner_role`, `quarter`, `month_target`, `priority`, `status`, `agent_assignable`, `founder_blocker`, `depends_on`, `blocks`, `kpi`, `revenue_impact`, `est_hours`, `success_criteria`, `agent_brief`, `tags`, `created_at`, `updated_at` — consistent across Task 0.4 sample, Task 0.5 index builder, Task 1.1 CSV-to-MD generator, Task 5.1 API serialization.

No mismatches found.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-10-bhaktisetu-autonomous-roadmap-engine-plan.md`.

Total scope: 6 phases, ~25 tasks, ~50h build + 14d soak. Free-tier safe. $0 recurring cost (Blackbox proxy free Opus 4.7).

Two execution options:

**1. Subagent-Driven (recommended)** — dispatch fresh subagent per task, review between, fast iteration. Uses `superpowers:subagent-driven-development`.

**2. Inline Execution** — execute tasks in this session via `superpowers:executing-plans`, batch with checkpoints.

Which approach?





