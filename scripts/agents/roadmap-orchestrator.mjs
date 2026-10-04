#!/usr/bin/env node
// scripts/agents/roadmap-orchestrator.mjs
// Master entry. Cron-invoked every 6h.
// Flow: ingest → scrape KPIs → tripwires → Decision Agent → spawn sub-agents → write queue+decisions.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { scrapeAllKpis } from './roadmap/_kpi-scraper.mjs';
import { evalTripwires } from './roadmap/_tripwire-eval.mjs';
import { buildSignalContext } from './roadmap/_signal-context.mjs';
import {
  DECISION_SYSTEM_PROMPT,
  DECISION_TOOLS,
  buildDecisionUserMessage,
} from './roadmap/_decision-prompt.mjs';
import { runSubagent } from './roadmap/_subagent-runner.mjs';
import { callOpus47, ModelRejectedError } from './roadmap/_anthropic-client.mjs';
import { buildIndex } from './roadmap/_index-build.mjs';
import { createLock } from './roadmap/_lock.mjs';

const DRY_RUN = process.env.DRY_RUN === 'true';
const QUEUE_DIR = DRY_RUN ? 'docs/roadmap/_dryrun/queue' : 'docs/roadmap/queue';
const DECISIONS_DIR = DRY_RUN ? 'docs/roadmap/_dryrun/decisions' : 'docs/roadmap/decisions';
const ALERTS_DIR = 'docs/roadmap/_alerts';
const BUDGET_PATH = 'docs/roadmap/_budget-snapshot.json';
const TRIPWIRES_PATH = 'docs/roadmap/_tripwires-global.yml';

// raceWithWall — wraps a promise w/ a unref'd setTimeout that resolves to
// `fallback` after `wallMs`. Critical: handle is .unref()'d + cleared on
// settle so it cannot keep event loop alive after the cycle finishes.
// Cycle 12 RCA: bare Promise.race+setTimeout left dangling handles → node
// sat idle 45min after orchestrator finished, hit GH 50min ceiling.
function raceWithWall(p, wallMs, fallback, warnMsg) {
  let handle;
  const timer = new Promise((resolve) => {
    handle = setTimeout(() => {
      if (warnMsg) console.warn(`[orchestrator] ${warnMsg}`);
      resolve(fallback);
    }, wallMs);
    if (handle.unref) handle.unref();
  });
  return Promise.race([p, timer]).finally(() => {
    if (handle) clearTimeout(handle);
  });
}

function writeAlert(filename, body) {
  mkdirSync(ALERTS_DIR, { recursive: true });
  writeFileSync(
    join(ALERTS_DIR, filename),
    `# Alert\n\n${body}\n\nTs: ${new Date().toISOString()}\n`,
  );
}

function readQueue() {
  if (!existsSync(QUEUE_DIR)) return [];
  return readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const content = readFileSync(join(QUEUE_DIR, f), 'utf8');
      const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
      if (!m) return null;
      try {
        return yaml.load(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const LOCK_PATH = 'docs/roadmap/_lock.json';
// Lock TTL 15min — if Render killed a cycle silently, next trigger reclaims fast.
// Was 90min; cycle 8 (2026-06-12) showed Render kills happen unpredictably mid-run.
const LOCK_MAX_AGE_MS = 15 * 60 * 1000;
const RESUME_STATE_PATH = 'docs/roadmap/_cycle-resume.json';

// Lock lifecycle lives in ./roadmap/_lock.mjs so it is unit-testable
// against a temp file. Production defaults: 15min TTL, docs/roadmap/_lock.json.
const { checkLock, acquireLock, releaseLock } = createLock({
  lockPath: LOCK_PATH,
  ttlMs: LOCK_MAX_AGE_MS,
});

// Resumable Decision plan: persist after Decision Agent completes so a
// Render mid-cycle kill doesn't waste the Opus call. Next cycle picks up
// the saved spawn plan if still fresh (< 25min) instead of re-running Decision.
function readResumeState() {
  if (!existsSync(RESUME_STATE_PATH)) return null;
  try {
    const s = JSON.parse(readFileSync(RESUME_STATE_PATH, 'utf8'));
    const age = Date.now() - new Date(s.savedAt).getTime();
    if (age > 25 * 60 * 1000) return null; // too old, ignore
    if (s.consumed) return null;
    return s;
  } catch {
    return null;
  }
}

function saveResumeState(cycleId, spawnPlan, deferrals, kills, decisionNote, firedTripwires) {
  try {
    writeFileSync(
      RESUME_STATE_PATH,
      JSON.stringify(
        {
          cycleId,
          spawnPlan,
          deferrals,
          kills,
          decisionNote,
          firedTripwires,
          savedAt: new Date().toISOString(),
          consumed: false,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.warn(`[orchestrator] could not save resume state: ${e.message}`);
  }
}

function markResumeConsumed() {
  if (!existsSync(RESUME_STATE_PATH)) return;
  try {
    const s = JSON.parse(readFileSync(RESUME_STATE_PATH, 'utf8'));
    s.consumed = true;
    s.consumedAt = new Date().toISOString();
    writeFileSync(RESUME_STATE_PATH, JSON.stringify(s, null, 2));
  } catch {}
}

async function main() {
  const cycleTs = new Date().toISOString();
  const cycleId = `C-${cycleTs.replace(/[^0-9T]/g, '').slice(0, 13)}`;
  console.log(`[orchestrator] cycle ${cycleId} start (DRY_RUN=${DRY_RUN})`);

  // 0. LOCK CHECK (prevent concurrent runs from overlapping cron + manual triggers)
  const existing = checkLock();
  if (existing && !existing.released) {
    console.log(
      `[orchestrator] another cycle in flight: ${existing.cycleId} acquired ${existing.acquiredAt}. Exiting clean.`,
    );
    process.exit(0);
  }
  acquireLock(cycleId);

  // 1. PAUSE CHECK
  const budget = existsSync(BUDGET_PATH) ? JSON.parse(readFileSync(BUDGET_PATH, 'utf8')) : {};
  if (budget.orchestratorPaused) {
    console.log('[orchestrator] paused — exiting');
    releaseLock();
    process.exit(0);
  }

  // 2. INGEST
  const index = buildIndex();
  const items = index.items;
  const tripwires = yaml.load(readFileSync(TRIPWIRES_PATH, 'utf8')).tripwires;
  const queue = readQueue();
  console.log(
    `[orchestrator] ingested ${items.length} items, ${queue.length} queue, ${tripwires.length} tripwires`,
  );

  // 3. SCRAPE KPIS — hard-bounded by per-scraper 90s + outer wall 5min.
  console.log(`[orchestrator] phase=kpi start`);
  const KPI_PHASE_WALL_MS = 5 * 60 * 1000;
  const kpis = await raceWithWall(
    scrapeAllKpis(items.filter((i) => i.kpi?.source)),
    KPI_PHASE_WALL_MS,
    [],
    `KPI phase wall hit (${KPI_PHASE_WALL_MS}ms) — proceeding with empty KPIs`,
  );
  console.log(
    `[orchestrator] scraped ${kpis.length} KPIs (${kpis.filter((k) => k.stale).length} stale)`,
  );

  // 3b. REFRESH FLEET AGENT SUMMARIES (24 daily agents → sector-grouped excerpts)
  console.log(`[orchestrator] phase=fleet start`);
  let sectorSummaries = {};
  try {
    const { summarizeFleet } = await import('./roadmap/_agent-fleet-summary.mjs');
    sectorSummaries = summarizeFleet();
    console.log(
      `[orchestrator] fleet summary: ${sectorSummaries.agentCount} agents across ${Object.keys(sectorSummaries.bySector || {}).length} sectors`,
    );
  } catch (e) {
    console.warn(`[orchestrator] fleet summary skipped: ${e.message}`);
  }

  // 3c. EXPERIMENT TRACKER — wall-bound to 60s (PostHog query can stall)
  console.log(`[orchestrator] phase=experiments start`);
  let experiments = { results: [], experimentCount: 0 };
  try {
    const { trackExperiments } = await import('./roadmap/_experiment-tracker.mjs');
    experiments = await raceWithWall(
      trackExperiments(),
      60 * 1000,
      { results: [], experimentCount: 0 },
      `experiment tracker wall hit (60s) — proceeding with empty`,
    );
    console.log(
      `[orchestrator] experiments: ${experiments.experimentCount} tracked (${experiments.decided || 0} decided)`,
    );
  } catch (e) {
    console.warn(`[orchestrator] experiments skipped: ${e.message}`);
  }

  // 4. SIGNAL CONTEXT (initial — tripwires re-merged in step 5)
  const externalErr = budget.lastAnthropicError || null;
  const signalContext = buildSignalContext({
    items,
    kpis,
    queue,
    tripwiresFired: [],
    budgets: budget,
    external: { lastAnthropicError: externalErr, experiments },
    sectorSummaries,
  });

  // 5. TRIPWIRES
  const firedTripwires = evalTripwires(tripwires, signalContext);
  signalContext.firedTripwires = firedTripwires;
  console.log(
    `[orchestrator] fired tripwires: ${firedTripwires.map((t) => t.id).join(', ') || 'none'}`,
  );

  // Log signal-context trim outcome (Fix D)
  if (signalContext._trim?.applied) {
    const origKB = (signalContext._trim.originalBytes / 1024).toFixed(1);
    const trimmedKB = (signalContext._trim.trimmedBytes / 1024).toFixed(1);
    console.log(
      `[orchestrator] signal-context trimmed ${origKB}KB → ${trimmedKB}KB. drops: ${signalContext._trim.drops.join(', ')}`,
    );
  } else {
    const sizeKB = (JSON.stringify(signalContext).length / 1024).toFixed(1);
    console.log(`[orchestrator] signal-context ${sizeKB}KB (under trim threshold)`);
  }

  // 6. T-005 KILL
  if (firedTripwires.find((t) => t.id === 'T-005')) {
    writeAlert(
      `tripwire-T-005-${cycleId}.md`,
      'Anthropic proxy blocked. Halting workflow per user directive.',
    );
    releaseLock();
    process.exit(2);
  }

  console.log(`[orchestrator] phase=decision start`);
  // 7. DECISION AGENT — w/ RESUMABLE STATE.
  // Check if a prior cycle saved a fresh spawn plan (Render killed it before
  // sub-agents finished). If yes, reuse it — saves an entire Opus call.
  let spawnPlan, deferrals, kills, decisionNote;
  const resume = readResumeState();
  if (resume) {
    console.log(
      `[orchestrator] RESUMING from prior cycle ${resume.cycleId} (saved ${resume.savedAt}). Skipping Decision Agent.`,
    );
    spawnPlan = resume.spawnPlan;
    deferrals = resume.deferrals;
    kills = resume.kills;
    decisionNote = resume.decisionNote;
    // Use the resumed firedTripwires for the decision note context.
    if (resume.firedTripwires)
      firedTripwires.push(
        ...resume.firedTripwires.filter((t) => !firedTripwires.find((f) => f.id === t.id)),
      );
  } else {
    // Fresh Decision Agent call.
    // 16k tokens streaming, 10min wall budget. Smaller = survives Render restart.
    let decisionResponse;
    const DECISION_TIMEOUT_MS = 10 * 60 * 1000;
    let decisionTimer;
    try {
      const timer = new Promise((_, reject) => {
        decisionTimer = setTimeout(
          () => reject(new Error(`Decision Agent timeout after ${DECISION_TIMEOUT_MS}ms`)),
          DECISION_TIMEOUT_MS,
        );
        if (decisionTimer.unref) decisionTimer.unref();
      });
      decisionResponse = await Promise.race([
        callOpus47({
          system: DECISION_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildDecisionUserMessage(signalContext) }],
          tools: DECISION_TOOLS,
          maxTokens: 16000,
        }),
        timer,
      ]).finally(() => {
        if (decisionTimer) clearTimeout(decisionTimer);
      });
    } catch (e) {
      if (e instanceof ModelRejectedError) {
        writeAlert(
          `model-rejected-${cycleId}.md`,
          `Decision Agent rejected: ${e.message}\nHalting per user directive.`,
        );
        budget.lastAnthropicError = e.message;
        writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
        releaseLock();
        process.exit(2);
      }
      writeAlert(`decision-error-${cycleId}.md`, e.message);
      releaseLock();
      process.exit(1);
    }

    // 8. PARSE TOOL CALLS
    const toolCalls = decisionResponse.content.filter((c) => c.type === 'tool_use');
    spawnPlan = toolCalls.filter((t) => t.name === 'spawn_subagent').map((t) => t.input);
    deferrals = toolCalls.filter((t) => t.name === 'defer_to_founder').map((t) => t.input);
    kills = toolCalls.filter((t) => t.name === 'kill_item').map((t) => t.input);
    decisionNote = toolCalls.find((t) => t.name === 'write_decision_note')?.input;

    // CHECKPOINT: save spawn plan to disk BEFORE sub-agents fire.
    // If Render kills us mid-fan-out, next cycle resumes from this plan.
    saveResumeState(cycleId, spawnPlan, deferrals, kills, decisionNote, firedTripwires);
    console.log(`[orchestrator] decision saved to resume state (Render-kill survival).`);
  }

  // 2026-07-10: the model does not always call the mandatory
  // write_decision_note tool — it completes spawn/defer/kill but stops before
  // the final note. Without this guard the artifact + dashboard get
  // `Decision note: undefined` (observed on live cron C-20260710T1306 + local
  // C-20260710T1231), losing the reasoning trail. Also covers the resume path
  // (resume.decisionNote can be undefined if the prior cycle hit this gap).
  // Synthesize a default note from the cycle data so a reasoning trace always
  // exists. Model-agnostic + placement after the if/else covers both paths.
  if (!decisionNote) {
    const firedIds = firedTripwires.map((t) => `${t.id}:${t.name}`).join(', ') || 'none';
    decisionNote = {
      reasoning: `[auto-synthesized — Decision Agent did not call write_decision_note] Cycle produced ${spawnPlan.length} spawn(s), ${deferrals.length} deferral(s), ${kills.length} kill(s). Fired tripwires: ${firedIds}.`,
      marketSignals: '(not provided by agent this cycle)',
      kpiDeltas: '(not provided by agent this cycle)',
      nextCycleHypothesis: '(not provided by agent this cycle)',
    };
    console.log(
      `[orchestrator] WARNING: write_decision_note not called — synthesized default note (model tool-sequence gap)`,
    );
  }

  // HARD CAP: trim spawn plan to 4 sub-agents max regardless of Decision Agent output.
  // Each sub-agent ~6min wall-clock streaming Opus 4.7. 4 × concurrency-2 = 12min for fan-out.
  // Plus ~10min Decision + ~3min setup + ~2min commit/push = ~27min total cycle = fits GH 50min ceiling.
  const HARD_SPAWN_CAP = 4;
  if (spawnPlan.length > HARD_SPAWN_CAP) {
    console.log(
      `[orchestrator] trimming spawn plan ${spawnPlan.length} → ${HARD_SPAWN_CAP} (GH free tier budget)`,
    );
    spawnPlan.splice(HARD_SPAWN_CAP);
  }

  console.log(
    `[orchestrator] decision: spawn ${spawnPlan.length}, defer ${deferrals.length}, kill ${kills.length}`,
  );

  // 2026-07-13: F2 empty-spawn guard. The Decision Agent sometimes
  // emits ZERO spawn_subagent tool calls in a cycle (observed C-20260710T1339:
  // Spawn plan []). When that coincides with zero defers + zero kills too, the
  // cycle did nothing at all — no queue items, no deferral, no kill — yet exits
  // 0 "green", so the soak protocol's `grep decision-error` sees a false green.
  // A cycle that defers everything (e.g. T-010 queue-stale) is legitimate and
  // NOT flagged here. Only flag a true no-op. Pure observability — does not
  // force a spawn (forced spawns on cycles with no real work would burn GH
  // free-tier minutes on low-quality queue files).
  if (spawnPlan.length === 0 && deferrals.length === 0 && kills.length === 0) {
    console.warn(
      `[orchestrator] WARNING: cycle produced 0 spawn + 0 defer + 0 kill — Decision Agent under-spawned (model tool-call gap). No work emitted this cycle.`,
    );
    writeAlert(
      `decision-under-spawn-${cycleId}.md`,
      `# Decision Agent emitted no work\n\nCycle ${cycleId}: 0 spawn, 0 defer, 0 kill. The Decision Agent returned no spawn_subagent / defer_to_founder / kill_item tool calls.\n\n## Fired tripwires\n\n${JSON.stringify(firedTripwires, null, 2)}\n\n## Diagnosis\n\nThis is the dominant 0-queue-output failure mode (F2). Unlike the sub-agent 403/timeout case (F3, see subagent-zero-output-* alerts), here the Decision Agent itself produced no spawn plan, so no sub-agent was ever called. Likely causes:\n- The model under-spawns despite the prompt instructing 3-7 (capped 2-4) spawn_subagent calls per cycle.\n- All candidate items were filtered out (already-shipped, already-in-queue, founder-blocked) leaving nothing the agent judged spawnable.\n- A tripwire (e.g. T-010 queue-stale) caused a defer-only cycle — but that path records a deferral, so it would NOT trigger this alert.\n\n## Action\n\nReview _decision-prompt.mjs spawn instructions for tool-calling reliability. If this fires repeatedly across cycles, the prompt needs tightening or a floor (>=1 spawn unless an explicit defer/kill tripwire fired).\n`,
    );
  }

  console.log(`[orchestrator] phase=subagents start (n=${spawnPlan.length})`);
  // 9. SPAWN SUB-AGENTS (parallel, max concurrency 2 — GH runner has ample memory but
  // Anthropic streaming queue can stall if too many concurrent. 2 concurrent = stable.
  // 4 sub-agents × ~6min each, 2 at a time = ~12min total fan-out.
  const allQueueFiles = [];
  // 2026-07-13: sub-agent LLM calls were failing silently every cycle. runSubagent
  // catches throws (403/ModelRejected/timeout/empty-output) at _subagent-runner.mjs:71
  // and returns { queueFiles: [], errors: [msg] }. The prior loop here read ONLY
  // r.value.queueFiles and discarded r.value.errors — so a cycle that decided
  // "spawn 4" with rich briefings produced "0 queue files written" with ZERO
  // diagnostic, and the Decision Agent's own deferral note flagged "queue
  // processor appears broken" for weeks (C-20260712T1717: spawn 4 → 0 files,
  // 3m41s of silent log between phase=subagents start and cycle done). This
  // block surfaces every failure mode so the root cause is visible in the GH
  // Actions log + persists an _alerts/ artifact instead of evaporating.
  const subagentErrors = [];
  for (let i = 0; i < spawnPlan.length; i += 2) {
    const chunk = spawnPlan.slice(i, i + 2);
    const results = await Promise.allSettled(
      chunk.map((p) => runSubagent({ ...p, items, cycleId })),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const plan = chunk[j];
      if (r.status === 'rejected') {
        const msg = `subagent ${plan?.role} (${plan?.itemIds?.join(',')}) REJECTED: ${r.reason?.message || r.reason}`;
        subagentErrors.push(msg);
        console.error(`[orchestrator] ${msg}`);
        continue;
      }
      const { queueFiles, errors } = r.value;
      if (errors?.length) {
        for (const e of errors) {
          const msg = `subagent ${plan?.role} (${plan?.itemIds?.join(',')}) error: ${e}`;
          subagentErrors.push(msg);
          console.error(`[orchestrator] ${msg}`);
        }
      }
      // Empty-but-no-error = the LLM returned text that didn't parse into the
      // ---END-QUEUE-FILE--- frontmatter format (models often do this).
      // Flag it so "0 files" is never silent again.
      if (!queueFiles?.length && !errors?.length) {
        const msg = `subagent ${plan?.role} (${plan?.itemIds?.join(',')}) returned 0 queue files + 0 errors (LLM output did not match the queue-file format)`;
        subagentErrors.push(msg);
        console.warn(`[orchestrator] ${msg}`);
      }
      if (queueFiles?.length) allQueueFiles.push(...queueFiles);
    }
  }
  // Persist the failure diagnosis so it survives the ephemeral GH log.
  if (subagentErrors.length && !allQueueFiles.length) {
    writeAlert(
      `subagent-zero-output-${cycleId}.md`,
      `# Sub-agent fan-out produced 0 queue files\n\nCycle ${cycleId} decided spawn ${spawnPlan.length} / defer ${deferrals.length} / kill ${kills.length} but wrote 0 queue files.\n\n## Failure modes this cycle\n\n${subagentErrors.map((e) => `- ${e}`).join('\n')}\n\n## Spawn plan (briefings that evaporated)\n\n${JSON.stringify(spawnPlan, null, 2)}\n\n## Root cause checklist\n\n- runSubagent calls callOpus47. Confirm the API returned text.\n- The model may not reliably emit the ---END-QUEUE-FILE--- + YAML frontmatter format. If errors are all "returned 0 + 0", the format contract is the blocker — switch the sub-agent output to tool_use (like the Decision Agent) or relax the parser.\n- A 403/ModelRejected error means the model guard or proxy rejected — check _anthropic-client.mjs VERIFIED set.\n`,
    );
  }

  // 10. WRITE QUEUE FILES
  mkdirSync(QUEUE_DIR, { recursive: true });
  for (const qf of allQueueFiles) {
    const slug = (qf.frontmatter.itemTitle || qf.frontmatter.itemId || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40);
    const fname = `${cycleTs.replace(/[:.]/g, '-')}-${qf.frontmatter.role}-${qf.frontmatter.itemId}-${slug}.md`;
    writeFileSync(join(QUEUE_DIR, fname), `---\n${yaml.dump(qf.frontmatter)}---\n${qf.body}`);
  }

  // 11. WRITE DECISION NOTE
  mkdirSync(DECISIONS_DIR, { recursive: true });
  writeFileSync(
    join(DECISIONS_DIR, `${cycleId}.md`),
    `# Decision ${cycleId}\n\n## Spawn plan\n${JSON.stringify(spawnPlan, null, 2)}\n\n## Deferrals\n${JSON.stringify(deferrals, null, 2)}\n\n## Kills\n${JSON.stringify(kills, null, 2)}\n\n## Decision note\n${JSON.stringify(decisionNote, null, 2)}\n\n## Fired tripwires\n${JSON.stringify(firedTripwires, null, 2)}\n`,
  );

  // 12. UPDATE BUDGET SNAPSHOT
  budget.lastCycle = cycleTs;
  budget.lastCycleSpawned = spawnPlan.length;
  budget.lastCycleQueueFiles = allQueueFiles.length;
  delete budget.lastAnthropicError; // success → clear error flag
  writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));

  console.log(`[orchestrator] cycle ${cycleId} done. ${allQueueFiles.length} queue files written.`);
  // Resume state consumed — won't be picked up by next cycle.
  markResumeConsumed();
  releaseLock();
}

// Signal handlers — release the file lock before the process dies.
// Without these, when GH Actions cancels the 50min job (timeout/cancel/
// runner preemption) Node's default SIGTERM disposition terminates the
// process immediately: the pending main() promise's .then/.catch never
// runs, releaseLock() is skipped, and _lock.json is left without
// `released:true`. The 15min TTL self-heals on the next 8h cron, but a
// tighter retry within 15min sees a live lock and exits clean at the
// lock check (line ~132), blocking the run. releaseLock is sync
// (writeFileSync) so it is safe to call directly from a signal handler.
// Handlers registered BEFORE main() fires so SIGTERM mid-Decision-Agent
// still releases the lock.
function shutdownOnSignal(sig) {
  try {
    releaseLock();
  } catch {}
  console.log(`[orchestrator] ${sig} — lock released, exiting`);
  // 130 = 128 + SIGINT(2); 143 = 128 + SIGTERM(15). Non-zero so GH Actions
  // marks the job failed, but the if:always() commit step still runs.
  process.exit(sig === 'SIGINT' ? 130 : 143);
}
process.on('SIGTERM', () => shutdownOnSignal('SIGTERM'));
process.on('SIGINT', () => shutdownOnSignal('SIGINT'));
// Dangling async errors (raceWithWall timers, subagent runners) escape
// main()'s .catch. Release the lock on those too so a stray rejection
// can't strand the lock.
process.on('uncaughtException', (e) => {
  console.error('[orchestrator] uncaughtException', e);
  try {
    writeAlert(`uncaught-${Date.now()}.md`, e.stack || String(e));
  } catch {}
  try {
    releaseLock();
  } catch {}
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[orchestrator] unhandledRejection', reason);
  try {
    releaseLock();
  } catch {}
  process.exit(1);
});

main()
  .then(() => {
    // Explicit exit — race-vs-timeout patterns leave dangling timer handles
    // that prevent natural event-loop drain. Cycle 12 RCA: orchestrator
    // finished at 23:11:44 but node sat idle until 50min ceiling at 23:56.
    console.log('[orchestrator] exit 0');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    writeAlert(`uncaught-${Date.now()}.md`, e.stack || String(e));
    releaseLock();
    process.exit(1);
  });
