# Darshya Remediation Sweep — Design

**Date:** 2026-07-31
**Repo:** `E:/NewClaude/bhaktisetu` (monorepo, pnpm + turbo; `apps/api` Node, `apps/web` Next.js on Render standalone)
**Branching:** fix branch per workstream → PR → rebase → merge to `main`. Working tree currently clean on `fix/security-audit-jul-17`.
**Doctrine:** GLM-5.2 subagents, TDD per change, verify before declare done, free-tier discipline (no new crons/workflows; batch commits).

---

## 0. Scope & decision record

Two decisions confirmed with the founder:

1. **fleet-integrity cork** → fix by **reading the route manifest / resolving ALL named dynamic params** at CI time (not an allowlist, not directory-name scan).
2. **PR landing** → **rebase both PRs onto latest main, verify, merge** (#181 then #182).
3. **Prod scope** → **autonomously fix all code bugs; REPORT (not fix) the ones blocked on founder secrets/KYC.**

### Founder-gated (REPORT ONLY — cannot complete without secrets/KYC)

| Item                     | Needs                                                                 | Why blocked                                                                    |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Daily-cron 503           | `CRON_AUTH_TOKEN` (U18) + API health check                            | Cron exits at precheck without the token; 503 root cause needs live API access |
| Funnel dead-zero         | Razorpay U1 + Stripe U2 KYC                                           | No live payment keys → all 5 funnel stages at 0 by definition                  |
| Resend / WhatsApp agents | `RESEND_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Agents no-op on every run without keys                                         |

These get a consolidated **Founder Action Report** as the deliverable, with exact paste-once instructions.

---

## 1. Workstream A — fleet-integrity route-manifest fix (THE CORK)

**Root cause (confirmed):** `pr-checks.yml` "Verify schema-validator targets are routable" step extracts `{ url: '...' }` probes from `scripts/agents/schema-validator.mjs` and checks each maps to `apps/web/app/**/page.tsx`, with fallbacks only for `[slug]` and a literal `[<leaf>]`. Five probes use **named** dynamic segments that exist on disk but don't match the fallback:

| Probe URL                    | Real route param                            |
| ---------------------------- | ------------------------------------------- |
| `/calendar/march`            | `apps/web/app/calendar/[month]/page.tsx`    |
| `/gita/karma-yoga`           | `apps/web/app/gita/[chapter]/page.tsx`      |
| `/ramayana/sundara-kanda`    | `apps/web/app/ramayana/[kanda]/page.tsx`    |
| `/mahabharata/bhishma-parva` | `apps/web/app/mahabharata/[parva]/page.tsx` |
| `/yoga-sutras/sadhana-pada`  | `apps/web/app/yoga-sutras/[pada]/page.tsx`  |

The other 68 of 73 probes resolve fine. The live agent fetches prod (these routes exist and serve 200) — so this is purely a CI checker gap.

**Design — manifest-driven param resolution:**

- Extract the inline routable-check Node script out of `pr-checks.yml` into a versioned, unit-testable script: `scripts/agents/fleet-integrity-check.mjs`.
- Build a **route manifest** by scanning `apps/web/app` for every `page.tsx` and recording its route pattern, converting each dynamic segment `[param]` → a regex capture group (and `[...slug]` → greedy). This is static — derived from the filesystem, independent of probe URLs, so it can never drift when someone adds `[id]`/`[slug]`/catch-alls.
- A probe URL passes if **any** manifest pattern regex-matches it. Replace the hardcoded `[slug]`/`[leaf]` fallbacks with the single manifest matcher.
- Same matcher is reused for the "expected schema" step so behavior stays consistent.

**TDD:** unit tests in `scripts/agents/fleet-integrity-check.test.mjs` — fixture tree with `[month]`, `[slug]`, `[...rest]`, static routes; assert each of the 73 real probes resolves, assert a bogus URL fails. Wire `pr-checks.yml` to call the script.

**Blast radius:** CI-only, no runtime. Fixes #181 + #182 + every future named-dynamic probe.

---

## 2. Workstream B — rebase + merge PR #181 then #182

- #181 files: api admin/ai/yatra routes + services, web login/not-found/markdown, agents-daily.yml. **#181 touches `agents-daily.yml`** → fleet-integrity is path-triggered on it.
- #182 files: magic-link, media, whatsapp-otp routes + tests, login page, consultation, launch.
- **Overlap:** only `apps/web/app/auth/login/page.tsx` — rebase #182 after #181 lands and resolve.
- Sequence: land Workstream A → rebase #181 onto main → full suite green → merge #181 → rebase #182 → resolve login-page conflict → suite green → merge #182.
- commitlint failure on #182: inspect + fix the offending commit message during rebase.

**Verify (per doctrine):** after each merge, read the actual main-branch CI run, not the PR summary.

---

## 3. Workstream C — gurukul-mut 401 (real API bug)

Health-smoke (02h + 13h, persistent) reports `gurukul-mut: list empty` / 401 for the **admin** role while admin auth otherwise passes. This is the one genuine bug masked by 8 false-alarm login fails.

- Locate the gurukul mutation/list endpoint in `apps/api/src/routes` + its auth guard (the smoke string `gurukul-mut` lives in `health-smoke.mjs`, not the API — so find the real route it probes).
- Diagnose: role check too strict? missing admin scope on the guard? route returning empty list vs 401 conflation?
- TDD: failing test reproducing admin-role 401 on the gurukul list/mutation endpoint, then fix guard/handler.

## 4. Workstream D — static-asset 404s (manifest.json / favicon.svg)

Files **exist** at `apps/web/public/manifest.json` + `favicon.svg` but prod 404s → Render **standalone output isn't copying `public/`** (known Next standalone behavior: `public` and `.next/static` must be copied into the standalone dir).

- Inspect `apps/web` Dockerfile / Render start config + `next.config` `output: 'standalone'`.
- Fix: ensure `public/` (and `.next/static`) are copied into the standalone bundle in the Docker/Render build.
- Verify: curl prod `/manifest.json` + `/favicon.svg` return 200.

## 5. Workstream E — health-smoke test-credential seeding

8 of 9 smoke "fails" are `LOGIN no token` across all roles — the GH Actions smoke workflow has **no seeded test-user secrets**, masking the real gurukul-mut bug.

- Add a smoke-test seed path: either a dedicated smoke user per role seeded in a test env, or inject role creds as GH secrets → env.
- Guard: smoke creds must be clearly non-prod / least-privilege; never demo tokens in prod (`ALLOW_DEMO_TOKENS` stays unset).
- Deliverable: smoke suite distinguishes "auth infra down" from "real endpoint bug."

## 6. Workstream F — funnel-drop-analyzer filing bug

The agent has `findings=5 filed=0` for 60+ consecutive days — it detects the dead funnel but **never files a GH issue**. Its `filed=0` logic is itself a defect.

- Read `funnel-drop-analyzer.mjs` + `agent-issue-filer.mjs`; find why findings never become issues (threshold? token? dedupe key? dry-run flag?).
- TDD: failing test that N consecutive findings → exactly one deduped issue; fix the filing path.

## 7. Workstream G — SLA bookings #179 (P0, 18 days stale)

5 bookings from 2026-05-04 (`BS-20260427-*`) stuck `priest_assigned`, no `videoProofUrl`, priests `821edbe5` (4) + `cf18e924` (1).

- Implement the **auto-escalation** the monitor recommends: past-72h force-complete-or-cancel-and-refund path in `booking.service.ts`, plus the WhatsApp-pandit nudge hook.
- The actual priest contact / refund money movement is founder-adjacent → code the state machine + refund endpoint, surface the 5 for founder decision in the report.

## 8. Workstream H — Wikimedia Kashi image 429

`upload.wikimedia.org` Kashi image rate-limits (429) every audit → self-host the asset under `apps/web/public/` (or swap source), update the reference. Confirm license-compatible replacement.

## 9. Workstream I — slow content pages (3.1–5.4s)

`/content/ganesh-mantra-om-gam`, `/content/durga-chalisa`, `/content/lakshmi-chalisa`, `/darshan/baidyanath-dham`, `/darshan/rameshwaram` — likely Render free cold-start + no ISR.

- Add `generateStaticParams` / ISR for these programmatic routes so they're prerendered at build, not per-request.
- Verify: Lighthouse/probe shows prerendered (fast) responses.

## 10. Workstream J — orchestrator: 0-queue fix + dry-run graduation

- **0-queue-write (observable, unfixed):** glm-5.2 doesn't reliably emit `---END-QUEUE-FILE---` + YAML frontmatter → sub-agents return 0 files. **Fix:** switch sub-agent output to `tool_use` structured output (like the Decision Agent already uses), or relax the parser to accept lenient YAML. TDD with recorded bad outputs.
- **Stalled dry-run:** `DRY_RUN` permanently true; `_dryrun/queue/` R-Q2-M-011 rotting 34 days firing the T-010 tripwire. **Graduation path** is founder-controlled (`gh variable set ROADMAP_DRY_RUN --body false`) → I prepare the fix + the dry-run queue drain, founder flips the switch.

---

## 11. E2E / verification strategy

The `e2e.yml` Playwright suite is **informational** (continue-on-error, runs against prod, weekly) — it does not gate. The gating signal is `ci.yml` Lint+Type+Test+Build (turbo, currently 835/853 green per PR claims).

Per-change (TDD): `pnpm test:unit` (vitest) scoped to the touched app + `turbo lint` + `turbo build`.
Integration (after merges):

1. `turbo test` full suite green.
2. Re-run **fleet-integrity** (Workstream A script) → 73/73 resolve.
3. Trigger `e2e.yml` via `workflow_dispatch` against prod **after Render deploys** the merge → read the actual run.
4. **Live probes (verify-before-done):** curl prod `/manifest.json`, `/favicon.svg`, a slow `/content/*` page, the gurukul endpoint, `/api/v1/cron/daily` health — confirm 200/expected.
5. Read the **real Render deploy log** for the merge commit before declaring done.

## 12. Execution order (dependency-aware)

```
A fleet-integrity (cork) ──┐
                           ├─► B rebase+merge #181 → #182 ──► [main green]
C gurukul-mut  ────────────┤
D static 404s  ────────────┤   (parallel-safe with A/B, different files)
E health-smoke creds ──────┤
F analyzer filing ─────────┤
G SLA bookings ────────────┤
H Wikimedia ───────────────┤
I slow pages ──────────────┤
J orchestrator ────────────┘
        │
        ▼
   E2E + live probes + Founder Action Report
```

A is the cork and unblocks B. C–J are independent code fixes that can fan out via subagents once A/B are moving. Founder-gated items compile into the report throughout.

## 13. Testing per workstream

Every workstream ships with a failing-test-first (vitest for api/web/scripts; the route-manifest checker gets a fixture-tree test). No change is "done" until its test + the full `turbo test` pass and (for prod-facing items) a live prod curl confirms.

## 14. Risks / guardrails

- **login/page.tsx conflict** on #181/#182 rebase — resolve carefully, keep both fixes (XSS markdown + safe-redirect).
- **Standalone `public/` copy** — verify against actual Render build, not assumption (prior "verify-before-done" rebuke).
- **Free-tier:** no new workflows/crons; reuse existing. Batch commits to avoid Render concurrent-push cancels (memory: each push cancels in-flight deploy) — so **finish a merge, wait for deploy=live, before next push.**
- **Smoke creds** must not weaken prod auth — least-privilege test accounts only.
