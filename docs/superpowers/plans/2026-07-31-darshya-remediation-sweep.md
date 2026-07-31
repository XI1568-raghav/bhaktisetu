# Darshya Remediation Sweep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unblock the two P0 security PRs (cork = fleet-integrity CI gap), land them, then fix the independent code bugs the 9-agent fleet surfaced (gurukul-mut 401, static 404s, smoke creds, analyzer filing, SLA bookings, Wikimedia image, slow pages, orchestrator 0-queue), and verify end-to-end against prod.

**Architecture:** Cork-first sequencing — Workstream A fixes the CI checker so PRs can merge; Workstream B lands #181 then #182; Workstreams C–J are independent code fixes that fan out via subagents; a final E2E + live-probe phase plus a Founder Action Report for the secret/KYC-gated items (daily-cron 503, funnel-zero, Resend/WhatsApp).

**Tech Stack:** pnpm + turbo monorepo; `apps/api` (Node + vitest), `apps/web` (Next.js `output:'standalone'` on Render), `scripts/agents/*.mjs` (Node ESM fleet), GitHub Actions (`.github/workflows`), Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-07-31-darshya-remediation-sweep-design.md`

**Guardrails (from memory):** GLM-5.2 subagents (omit `model`); free-tier — no new workflows/crons, batch commits; **finish a merge, wait for Render deploy=live before next push** (concurrent push cancels in-flight deploy); verify-before-done (read real logs, curl prod); never weaken prod auth with smoke creds.

---

## Phase 0 — Branch setup

**Files:**

- Create: branch `fix/fleet-integrity-route-manifest` off `main`

- [ ] **Step 0.1: sync main and cut the work branch**

```bash
cd E:/NewClaude/bhaktisetu
git checkout main && git pull origin main
git checkout -b fix/fleet-integrity-route-manifest
```

- [ ] **Step 0.2: confirm clean baseline**

Run: `git status --short && git log --oneline -1`
Expected: empty status; tip = latest `main` commit.

---

## Workstream A — fleet-integrity route-manifest fix (THE CORK)

**Why first:** `pr-checks.yml` "Verify schema-validator targets are routable" fails on 5 probes that use **named** dynamic segments the checker's hardcoded `[slug]`/`[leaf]` fallbacks don't resolve. This blocks PR #181 (which touches `agents-daily.yml`, a path-trigger) and #182. The 5:

| Probe                        | Real route                                  |
| ---------------------------- | ------------------------------------------- |
| `/calendar/march`            | `apps/web/app/calendar/[month]/page.tsx`    |
| `/gita/karma-yoga`           | `apps/web/app/gita/[chapter]/page.tsx`      |
| `/ramayana/sundara-kanda`    | `apps/web/app/ramayana/[kanda]/page.tsx`    |
| `/mahabharata/bhishma-parva` | `apps/web/app/mahabharata/[parva]/page.tsx` |
| `/yoga-sutras/sadhana-pada`  | `apps/web/app/yoga-sutras/[pada]/page.tsx`  |

### Task A1: route-manifest resolver module (TDD)

**Files:**

- Create: `scripts/agents/route-manifest.mjs`
- Test: `scripts/agents/route-manifest.test.mjs`

- [ ] **Step A1.1: write the failing test**

Create `scripts/agents/route-manifest.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRouteManifest, resolveProbe } from './route-manifest.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function mk(root, rel) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, 'export default function Page(){}');
}

test('resolves static + named dynamic + catch-all routes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
  mk(root, 'page.tsx'); // /
  mk(root, 'pujas/page.tsx'); // /pujas
  mk(root, 'calendar/[month]/page.tsx'); // /calendar/:month
  mk(root, 'gita/[chapter]/page.tsx'); // /gita/:chapter
  mk(root, 'docs/[...rest]/page.tsx'); // /docs/*
  const manifest = buildRouteManifest(root);
  assert.equal(resolveProbe(manifest, '/'), true);
  assert.equal(resolveProbe(manifest, '/pujas'), true);
  assert.equal(resolveProbe(manifest, '/calendar/march'), true);
  assert.equal(resolveProbe(manifest, '/gita/karma-yoga'), true);
  assert.equal(resolveProbe(manifest, '/docs/a/b/c'), true);
  assert.equal(resolveProbe(manifest, '/nope/missing'), false);
});
```

- [ ] **Step A1.2: run test to verify it fails**

Run: `node --test scripts/agents/route-manifest.test.mjs`
Expected: FAIL — `Cannot find module './route-manifest.mjs'`

- [ ] **Step A1.3: implement the resolver**

Create `scripts/agents/route-manifest.mjs`:

```javascript
// Build a route manifest from apps/web/app by scanning for page.tsx files.
// Each dynamic segment [param] -> regex capture group; [...slug] -> greedy.
// Static — derived from the filesystem, so it can never drift when new
// named params ([id], [slug], catch-alls) are added.
import fs from 'node:fs';
import path from 'node:path';

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.name === 'page.tsx') yield full;
  }
}

// Convert a route dir pattern to a RegExp matching concrete URLs.
// 'calendar/[month]' -> /^\/calendar\/[^/]+\/?$/
function patternToRegex(routePattern) {
  const segs = routePattern.split('/').filter(Boolean);
  const parts = segs.map((s) => {
    const catchAll = s.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) return '(?:/.+)?';
    const dyn = s.match(/^\[(.+)\]$/);
    if (dyn) return '[^/]+';
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp('^/' + parts.join('/') + '/?$');
}

export function buildRouteManifest(appDir) {
  const manifest = [];
  for (const pagePath of walk(appDir)) {
    const rel = path.relative(appDir, path.dirname(pagePath));
    const routePattern = rel.split(path.sep).join('/');
    manifest.push({ pattern: routePattern, regex: patternToRegex(routePattern) });
  }
  return manifest;
}

export function resolveProbe(manifest, url) {
  const clean = url.replace(/^\//, '').replace(/\/$/, '');
  const target = '/' + clean;
  return manifest.some((m) => m.regex.test(target));
}
```

- [ ] **Step A1.4: run test to verify it passes**

Run: `node --test scripts/agents/route-manifest.test.mjs`
Expected: PASS (1 test)

- [ ] **Step A1.5: verify against the real repo routes**

```bash
cd E:/NewClaude/bhaktisetu
node -e "import('./scripts/agents/route-manifest.mjs').then(m=>{const mf=m.buildRouteManifest('apps/web/app');for(const u of ['/calendar/march','/gita/karma-yoga','/ramayana/sundara-kanda','/mahabharata/bhishma-parva','/yoga-sutras/sadhana-pada','/pujas','/'])console.log(u,m.resolveProbe(mf,u));})"
```

Expected: all `true`.

- [ ] **Step A1.6: commit**

```bash
git add scripts/agents/route-manifest.mjs scripts/agents/route-manifest.test.mjs
git commit -m "feat(fleet): route-manifest resolver for named dynamic Next routes"
```

### Task A2: extract + rewire the CI routable-check

**Files:**

- Create: `scripts/agents/fleet-integrity-check.mjs`
- Modify: `.github/workflows/pr-checks.yml:68-97` (replace inline Node heredoc)

- [ ] **Step A2.1: write the checker script**

Create `scripts/agents/fleet-integrity-check.mjs`:

```javascript
// Verify every schema-validator probe URL resolves to a real Next route.
// Replaces the inline pr-checks.yml heredoc. Uses the route manifest so
// named dynamic params ([month], [chapter], [kanda], [parva], [pada], [slug],
// catch-alls) all resolve. Exit 1 with ::error:: on any unresolvable probe.
import fs from 'node:fs';
import { buildRouteManifest, resolveProbe } from './route-manifest.mjs';

const src = fs.readFileSync(new URL('./schema-validator.mjs', import.meta.url), 'utf8');
const urls = [...src.matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1]);
const manifest = buildRouteManifest('apps/web/app');
const missing = urls.filter((u) => !resolveProbe(manifest, u));
if (missing.length) {
  console.error('::error::Probe URLs without matching route: ' + missing.join(', '));
  process.exit(1);
}
console.log('All ' + urls.length + ' probe URLs resolve to a route.');
```

- [ ] **Step A2.2: run it locally — must pass with 73 probes**

Run: `node scripts/agents/fleet-integrity-check.mjs`
Expected: `All 73 probe URLs resolve to a route.` exit 0.

- [ ] **Step A2.3: point pr-checks.yml at the script**

In `.github/workflows/pr-checks.yml`, replace the entire `Verify schema-validator targets are routable` step (lines 68-97, the heredoc) with:

```yaml
- name: Verify schema-validator targets are routable
  run: node scripts/agents/fleet-integrity-check.mjs
```

- [ ] **Step A2.4: commit + push, confirm the check goes green**

```bash
git add scripts/agents/fleet-integrity-check.mjs .github/workflows/pr-checks.yml
git commit -m "fix(ci): resolve named dynamic routes in fleet-integrity via route manifest"
git push -u origin fix/fleet-integrity-route-manifest
gh pr create --title "fix(ci): fleet-integrity route-manifest (unblocks P0 PRs #181/#182)" --body "Fixes the 5 named-dynamic-probe false-failures blocking #181/#182. 73/73 resolve locally."
```

- [ ] **Step A2.5: verify the fleet-integrity check passes on THIS PR**

Run: `gh pr checks` (watch fleet-integrity)
Expected: `fleet-integrity pass`. **Read the real run** before proceeding.

---

## Workstream B — rebase + merge PR #181 then #182

### Task B1: merge the fleet-integrity fix first

- [ ] **Step B1.1: merge Workstream A's PR**

```bash
gh pr merge fix/fleet-integrity-route-manifest --squash --delete-branch
git checkout main && git pull origin main
```

- [ ] **Step B1.2: wait for Render deploy=live before next push (free-tier guard)**

Run: `gh run list --workflow=deploy-web-render.yml --limit 1`
Expected: latest run `completed success`. Do NOT push again until live.

### Task B2: rebase + merge PR #181

- [ ] **Step B2.1: rebase #181 onto main**

```bash
git fetch origin
git checkout fix/audit-p0-p1-p2-2026-07-17
git rebase origin/main
# resolve any conflicts (agents-daily.yml likely clean now)
git push --force-with-lease origin fix/audit-p0-p1-p2-2026-07-17
```

- [ ] **Step B2.2: verify checks green, then merge**

```bash
gh pr checks 181   # expect fleet-integrity + Lint+Type+Test+Build pass
gh pr merge 181 --squash
git checkout main && git pull origin main
```

- [ ] **Step B2.3: confirm deploy=live before touching #182**

Run: `gh run list --workflow=deploy-web-render.yml --limit 1` → `success`.

### Task B3: rebase + merge PR #182 (resolves login-page overlap)

- [ ] **Step B3.1: rebase #182, fix commitlint, resolve login/page.tsx conflict keeping BOTH fixes**

```bash
git checkout fix/security-audit-jul-17
git rebase origin/main
# On apps/web/app/auth/login/page.tsx conflict: keep markdown sanitizeUrl XSS fix (from #181)
# AND safe-redirect fix (from #182). Fix any non-conventional commit msg that tripped commitlint.
git push --force-with-lease origin fix/security-audit-jul-17
```

- [ ] **Step B3.2: verify checks + merge**

```bash
gh pr checks 182   # expect fleet-integrity + commitlint + build pass
gh pr merge 182 --squash
git checkout main && git pull origin main
```

- [ ] **Step B3.3: confirm deploy=live; run full suite on main**

```bash
pnpm install --frozen-lockfile && pnpm test
```

Expected: suite green (853/853 target). Read the real output.

---

## Workstream C — gurukul-mut 401 (parallel-safe; new branch `fix/gurukul-mut-401`)

The `gurukul-mut` string is the smoke-test label in `health-smoke.mjs`; the real API routes are `apps/api/src/routes/gurukuls.ts` + `admin-gurukuls.ts`. Symptom: admin role authenticates but the gurukul mutation/list endpoint returns 401/empty.

### Task C1: reproduce + fix the admin gurukul guard (TDD)

**Files:**

- Modify: `apps/api/src/routes/admin-gurukuls.ts` (or `gurukuls.ts` — wherever the admin list/mutation guard lives)
- Test: `apps/api/src/routes/admin-gurukuls.test.ts` (create if absent)

- [ ] **Step C1.1: locate the guard + write failing test**

Grep `grep -niE "admin|requireRole|authorize|401|gurukul" apps/api/src/routes/admin-gurukuls.ts`. Write a test asserting an **admin-role token** gets `200` (not `401`) on the gurukul list endpoint:

```typescript
it('admin role can list gurukul mutations (not 401)', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/gurukuls/mutations',
    headers: { authorization: `Bearer ${adminToken}` },
  });
  expect(res.statusCode).toBe(200);
});
```

- [ ] **Step C1.2: run — confirm 401 failure**

Run: `pnpm --filter api test -- admin-gurukuls` → FAIL `expected 401 to be 200`.

- [ ] **Step C1.3: fix the guard** (role check too strict / missing admin scope / guard ordering). Minimal change to admit admin role.

- [ ] **Step C1.4: run — PASS; commit**

```bash
git add apps/api/src/routes/admin-gurukuls.ts apps/api/src/routes/admin-gurukuls.test.ts
git commit -m "fix(api): admin role can access gurukul mutations (was 401)"
```

---

## Workstream D — static-asset 404s (branch `fix/static-asset-404`)

`manifest.json` + `favicon.svg` exist in `apps/web/public/` but 404 on prod → Next `output:'standalone'` does **not** copy `public/` or `.next/static` into the standalone bundle.

**Files:**

- Modify: `apps/web/Dockerfile` (copy `public/` + `.next/static` into standalone)

- [ ] **Step D1.1: confirm standalone is dropping public/**

Run: `grep -niE "standalone|public|\.next/static|COPY" apps/web/Dockerfile`
Expected: no `COPY` of `public/` or `.next/static` into the runner stage.

- [ ] **Step D1.2: add the copies**

In `apps/web/Dockerfile` runner stage, after the standalone copy:

```dockerfile
# Next standalone does NOT bundle public/ or .next/static — copy them in.
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
```

- [ ] **Step D1.3: commit + verify prod after deploy**

```bash
git add apps/web/Dockerfile
git commit -m "fix(web): copy public/ + .next/static into standalone bundle (manifest/favicon 404)"
# after merge+deploy:
curl -sI https://darshya.online/manifest.json | head -1   # expect 200
curl -sI https://darshya.online/favicon.svg | head -1     # expect 200
```

---

## Workstream E — health-smoke creds (branch `fix/health-smoke-creds`)

8/9 smoke fails are `LOGIN no token` — no seeded smoke users. **Guard:** least-privilege test accounts, never demo tokens in prod.

**Files:**

- Modify: `scripts/agents/health-smoke.mjs` (read per-role creds from env, skip-with-flag when unset instead of fail)
- Modify: `.github/workflows/agents-health.yml` (inject smoke creds env)

- [ ] **Step E1.1: write failing test / reproduce**

Run smoke login path locally without creds → 8 `no token` fails mask real bugs.

- [ ] **Step E1.2: make missing creds an explicit SKIP, not a FAIL**

In `health-smoke.mjs`, when a role's cred env is absent, record `SKIP (no creds)` distinct from `FAIL`; only FAIL on a real auth/endpoint error. Inject `SMOKE_<ROLE>_EMAIL/PASSWORD` env in `agents-health.yml` from GH secrets.

- [ ] **Step E1.3: commit; founder pastes the actual smoke-user secrets (report)**

```bash
git commit -m "fix(fleet): distinguish missing smoke creds (SKIP) from real endpoint bugs (FAIL)"
```

---

## Workstream F — funnel-drop-analyzer filing bug (branch `fix/analyzer-filing`)

Confirmed: `findings=5 filed=0` for 60+ days. The filing path exists (`fileIssue`, dedupe via `_fingerprint`) but never fires — `alreadyFiled` matches every open `agent-auto-filed,P0` issue as a dupe, OR `GH_TOKEN`/threshold gate short-circuits.

**Files:**

- Modify: `scripts/agents/funnel-drop-analyzer.mjs` (`alreadyFiled` fingerprint matching + `CRON_AUTH_TOKEN`/token guards)
- Test: `scripts/agents/funnel-drop-analyzer.test.mjs`

- [ ] **Step F1.1: write failing test — N findings + no matching fingerprint → exactly 1 issue filed**

```javascript
test('files one deduped issue when a stage drops and fingerprint not already filed', async () => {
  // mock ghFetch: alreadyFiled returns [] ; fileIssue captures body
  const filed = await runAnalyzer({ gh: mockGh({ openIssues: [] }), funnel: deadFunnel });
  assert.equal(filed.length, 1);
  assert.match(filed[0].body, /_fingerprint_/);
});
```

- [ ] **Step F1.2: run — FAIL (0 filed)**

- [ ] **Step F1.3: fix `alreadyFiled` to match on the exact `_fingerprint` (not just labels), and remove the gate that suppresses filing.** Run — PASS.

- [ ] **Step F1.4: commit**

```bash
git commit -m "fix(fleet): funnel-drop-analyzer files deduped P0 issue (was silently filed=0)"
```

---

## Workstream G — SLA bookings #179 (branch `fix/sla-bookings-escalation`)

5 bookings (`BS-20260427-*`) stuck `priest_assigned` 3 months, no `videoProofUrl`. Code the auto-escalation state machine + refund endpoint; priest contact is founder-adjacent.

**Files:**

- Modify: `apps/api/src/services/booking.service.ts` (add `escalateStaleBookings`)
- Test: `apps/api/src/services/booking.service.test.ts`

- [ ] **Step G1.1: failing test — booking past 72h with no videoProof → force-complete-or-cancel-refund transition**

```typescript
it('escalates booking past 72h without videoProof to cancel+refund review', async () => {
  const stale = await seedBooking({
    status: 'priest_assigned',
    scheduledAt: daysAgo(90),
    videoProofUrl: null,
  });
  const out = await escalateStaleBookings();
  expect(out.escalated).toContain(stale.id);
  expect((await getBooking(stale.id)).status).toBe('refund_pending');
});
```

- [ ] **Step G1.2: run — FAIL; Step G1.3: implement `escalateStaleBookings`; Step G1.4: PASS + commit**

```bash
git commit -m "feat(api): SLA escalation for stale bookings (72h no video proof -> refund review)"
```

---

## Workstream H — Wikimedia image 429 (branch `fix/wikimedia-kashi`)

`apps/web/app/layout.tsx:129,136,267,268` references `upload.wikimedia.org` Golden Temple image (429 every audit). Self-host.

**Files:**

- Create: `apps/web/public/images/golden-temple.jpg` (license-compatible copy)
- Modify: `apps/web/app/layout.tsx:129,136,267,268`

- [ ] **Step H1.1: download a license-clean image into `public/images/`, swap the 4 references to `/images/golden-temple.jpg`, drop the preconnect/dns-prefetch to wikimedia.**

- [ ] **Step H1.2: commit + verify (no more wikimedia 429 in next broken-link report)**

```bash
git commit -m "fix(web): self-host Golden Temple OG image (Wikimedia 429 rate-limit)"
```

---

## Workstream I — slow content pages (branch `fix/content-isr`)

`/content/[slug]` already has `generateStaticParams` + `revalidate=3600` but `dynamicParams=true` → unknown slugs SSR per-request (cold-start 3-5s). The 5 slow pages are known slugs that should be prerendered.

**Files:**

- Modify: `apps/web/app/content/[slug]/page.tsx` (ensure the 5 slow slugs are in `generateStaticParams`; consider `dynamicParams=false` for prerender-only)
- Modify: `apps/web/app/darshan/[slug]/page.tsx` (same)

- [ ] **Step I1.1: confirm the 5 slow slugs are returned by `generateStaticParams`** (ganesh-mantra-om-gam, durga-chalisa, lakshmi-chalisa, baidyanath-dham, rameshwaram). Add any missing.

- [ ] **Step I1.2: commit + probe after deploy**

```bash
git commit -m "perf(web): prerender slow content/darshan slugs (ISR generateStaticParams)"
# after deploy: time curl the 5 pages, expect <1s TTFB
```

---

## Workstream J — orchestrator 0-queue + dry-run (branch `fix/orchestrator-tooluse-output`)

`roadmap-orchestrator.mjs:420-446`: sub-agents emit `---END-QUEUE-FILE---` + YAML frontmatter; glm-5.2 doesn't reliably produce it → 0 queue files. Decision Agent already uses `tool_use` (line 314) — port sub-agents to the same.

**Files:**

- Modify: `scripts/agents/roadmap-orchestrator.mjs` (sub-agent structured output via tool_use instead of text parsing)
- Test: `scripts/agents/roadmap-orchestrator.test.mjs`

- [ ] **Step J1.1: failing test — recorded glm-5.2 non-conforming output still yields a queue file via tool_use path**

```javascript
test('sub-agent tool_use output produces a queue file even when text is non-conforming', async () => {
  const qfs = parseSubagentQueue({
    toolCalls: [{ type: 'tool_use', name: 'write_queue', input: validQF }],
    text: 'no end-marker here',
  });
  assert.equal(qfs.length, 1);
  assert.equal(qfs[0].frontmatter.itemId, validQF.itemId);
});
```

- [ ] **Step J1.2: run — FAIL; Step J1.3: refactor sub-agent to request `write_queue` tool_use + parse `content.filter(c=>c.type==='tool_use')`; Step J1.4: PASS + commit**

```bash
git commit -m "fix(agents): orchestrator sub-agents emit queue files via tool_use (0-queue-write fix)"
```

- [ ] **Step J1.5: drain the rotting dry-run queue + prepare graduation (founder flips switch)**

R-Q2-M-011 sits in `_dryrun/queue/` 34 days firing T-010. Document drain; the `ROADMAP_DRY_RUN=false` flip is a **founder action** (report).

---

## Phase E2E — integration verification + Founder Action Report

- [ ] **Step E2E.1: full suite green on main**

```bash
cd E:/NewClaude/bhaktisetu && pnpm install --frozen-lockfile && pnpm test
```

Expected: green. Read real output, not summary.

- [ ] **Step E2E.2: re-run fleet-integrity — 73/73**

Run: `node scripts/agents/fleet-integrity-check.mjs` → `All 73 probe URLs resolve to a route.`

- [ ] **Step E2E.3: trigger Playwright E2E against prod after deploy=live, read the run**

```bash
gh workflow run e2e.yml
gh run list --workflow=e2e.yml --limit 1   # read actual result
```

- [ ] **Step E2E.4: live probes (verify-before-done)**

```bash
curl -sI https://darshya.online/manifest.json | head -1      # 200 (Workstream D)
curl -sI https://darshya.online/favicon.svg | head -1        # 200
curl -s -o /dev/null -w "%{time_total}s\n" https://darshya.online/content/durga-chalisa  # <1s (Workstream I)
```

- [ ] **Step E2E.5: compile the Founder Action Report** (the secret/KYC-gated items I cannot complete):

| Gate                                                 | Action                               | Unblocks                                                   |
| ---------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| U18 `CRON_AUTH_TOKEN`                                | `openssl rand -hex 32` → GH + Render | daily-cron 503 (also Workstream needs API health re-check) |
| U1 Razorpay KYC / U2 Stripe KYC                      | submit business docs                 | funnel dead-zero (revenue)                                 |
| `RESEND_API_KEY`                                     | paste → GH Actions env               | cold-temple-outreach, referral-nudge                       |
| `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` | paste                                | daily-devotional-broadcast                                 |
| Smoke-user secrets                                   | paste per-role creds                 | health-smoke real signal (Workstream E)                    |
| `ROADMAP_DRY_RUN=false`                              | `gh variable set`                    | orchestrator graduation (Workstream J)                     |

---

## Self-Review

- **Spec coverage:** A↔fleet-integrity ✓, B↔PR merge ✓, C↔gurukul ✓, D↔static 404 ✓, E↔smoke creds ✓, F↔analyzer filing ✓, G↔SLA #179 ✓, H↔Wikimedia ✓, I↔slow pages ✓, J↔orchestrator ✓, E2E+founder report ✓. Founder-gated items (503, funnel-zero, Resend/WhatsApp) → report only, per decision ✓.
- **Placeholder scan:** no TBD; every code step has code/commands. C1.3/D1.2/G1.3 implementations reference exact files; the precise guard-line edits are located by the grep step within each task.
- **Type consistency:** `buildRouteManifest`/`resolveProbe` consistent A1↔A2; `escalateStaleBookings` consistent G; `parseSubagentQueue`/`write_queue` consistent J.
