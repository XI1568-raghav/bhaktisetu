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
import { DECISION_SYSTEM_PROMPT, DECISION_TOOLS, buildDecisionUserMessage } from './roadmap/_decision-prompt.mjs';
import { runSubagent } from './roadmap/_subagent-runner.mjs';
import { callOpus47, ModelRejectedError } from './roadmap/_anthropic-client.mjs';
import { buildIndex } from './roadmap/_index-build.mjs';

const DRY_RUN = process.env.DRY_RUN === 'true';
const QUEUE_DIR = DRY_RUN ? 'docs/roadmap/_dryrun/queue' : 'docs/roadmap/queue';
const DECISIONS_DIR = DRY_RUN ? 'docs/roadmap/_dryrun/decisions' : 'docs/roadmap/decisions';
const ALERTS_DIR = 'docs/roadmap/_alerts';
const BUDGET_PATH = 'docs/roadmap/_budget-snapshot.json';
const TRIPWIRES_PATH = 'docs/roadmap/_tripwires-global.yml';

function writeAlert(filename, body) {
  mkdirSync(ALERTS_DIR, { recursive: true });
  writeFileSync(join(ALERTS_DIR, filename), `# Alert\n\n${body}\n\nTs: ${new Date().toISOString()}\n`);
}

function readQueue() {
  if (!existsSync(QUEUE_DIR)) return [];
  return readdirSync(QUEUE_DIR).filter(f => f.endsWith('.md')).map(f => {
    const content = readFileSync(join(QUEUE_DIR, f), 'utf8');
    const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!m) return null;
    try { return yaml.load(m[1]); } catch { return null; }
  }).filter(Boolean);
}

async function main() {
  const cycleTs = new Date().toISOString();
  const cycleId = `C-${cycleTs.replace(/[^0-9T]/g, '').slice(0, 13)}`;
  console.log(`[orchestrator] cycle ${cycleId} start (DRY_RUN=${DRY_RUN})`);

  // 1. PAUSE CHECK
  const budget = existsSync(BUDGET_PATH) ? JSON.parse(readFileSync(BUDGET_PATH, 'utf8')) : {};
  if (budget.orchestratorPaused) { console.log('[orchestrator] paused — exiting'); process.exit(0); }

  // 2. INGEST
  const index = buildIndex();
  const items = index.items;
  const tripwires = yaml.load(readFileSync(TRIPWIRES_PATH, 'utf8')).tripwires;
  const queue = readQueue();
  console.log(`[orchestrator] ingested ${items.length} items, ${queue.length} queue, ${tripwires.length} tripwires`);

  // 3. SCRAPE KPIS
  const kpis = await scrapeAllKpis(items.filter(i => i.kpi?.source));
  console.log(`[orchestrator] scraped ${kpis.length} KPIs (${kpis.filter(k => k.stale).length} stale)`);

  // 4. SIGNAL CONTEXT (initial — tripwires re-merged in step 5)
  const externalErr = budget.lastAnthropicError || null;
  const signalContext = buildSignalContext({
    items, kpis, queue,
    tripwiresFired: [],
    budgets: budget,
    external: { lastAnthropicError: externalErr },
  });

  // 5. TRIPWIRES
  const firedTripwires = evalTripwires(tripwires, signalContext);
  signalContext.firedTripwires = firedTripwires;
  console.log(`[orchestrator] fired tripwires: ${firedTripwires.map(t => t.id).join(', ') || 'none'}`);

  // 6. T-005 KILL
  if (firedTripwires.find(t => t.id === 'T-005')) {
    writeAlert(`tripwire-T-005-${cycleId}.md`, 'Anthropic proxy blocked. Halting workflow per user directive.');
    process.exit(2);
  }

  // 7. DECISION AGENT
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
      // Persist error so future cycles see lastAnthropicError
      budget.lastAnthropicError = e.message;
      writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
      process.exit(2);
    }
    writeAlert(`decision-error-${cycleId}.md`, e.message);
    process.exit(1);
  }

  // 8. PARSE TOOL CALLS
  const toolCalls = decisionResponse.content.filter(c => c.type === 'tool_use');
  const spawnPlan = toolCalls.filter(t => t.name === 'spawn_subagent').map(t => t.input);
  const deferrals = toolCalls.filter(t => t.name === 'defer_to_founder').map(t => t.input);
  const kills = toolCalls.filter(t => t.name === 'kill_item').map(t => t.input);
  const decisionNote = toolCalls.find(t => t.name === 'write_decision_note')?.input;

  console.log(`[orchestrator] decision: spawn ${spawnPlan.length}, defer ${deferrals.length}, kill ${kills.length}`);

  // 9. SPAWN SUB-AGENTS (parallel, max concurrency 5)
  const allQueueFiles = [];
  for (let i = 0; i < spawnPlan.length; i += 5) {
    const chunk = spawnPlan.slice(i, i + 5);
    const results = await Promise.allSettled(chunk.map(p => runSubagent({ ...p, items, cycleId })));
    for (const r of results) {
      if (r.status === 'fulfilled') allQueueFiles.push(...r.value.queueFiles);
    }
  }

  // 10. WRITE QUEUE FILES
  mkdirSync(QUEUE_DIR, { recursive: true });
  for (const qf of allQueueFiles) {
    const slug = (qf.frontmatter.itemTitle || qf.frontmatter.itemId || 'untitled')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const fname = `${cycleTs.replace(/[:.]/g, '-')}-${qf.frontmatter.role}-${qf.frontmatter.itemId}-${slug}.md`;
    writeFileSync(join(QUEUE_DIR, fname), `---\n${yaml.dump(qf.frontmatter)}---\n${qf.body}`);
  }

  // 11. WRITE DECISION NOTE
  mkdirSync(DECISIONS_DIR, { recursive: true });
  writeFileSync(
    join(DECISIONS_DIR, `${cycleId}.md`),
    `# Decision ${cycleId}\n\n## Spawn plan\n${JSON.stringify(spawnPlan, null, 2)}\n\n## Deferrals\n${JSON.stringify(deferrals, null, 2)}\n\n## Kills\n${JSON.stringify(kills, null, 2)}\n\n## Decision note\n${JSON.stringify(decisionNote, null, 2)}\n\n## Fired tripwires\n${JSON.stringify(firedTripwires, null, 2)}\n`
  );

  // 12. UPDATE BUDGET SNAPSHOT
  budget.lastCycle = cycleTs;
  budget.lastCycleSpawned = spawnPlan.length;
  budget.lastCycleQueueFiles = allQueueFiles.length;
  delete budget.lastAnthropicError; // success → clear error flag
  writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));

  console.log(`[orchestrator] cycle ${cycleId} done. ${allQueueFiles.length} queue files written.`);
}

main().catch(e => {
  console.error(e);
  writeAlert(`uncaught-${Date.now()}.md`, e.stack || String(e));
  process.exit(1);
});
