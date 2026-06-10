// scripts/agents/run-orchestrator-bg.mjs
// Wrapper invoked by Render bg-spawn. Steps:
//   1. cd repo root
//   2. git fetch + reset to origin/main (fresh state)
//   3. run roadmap-orchestrator.mjs (no time cap on Render)
//   4. git add + commit + push via GH_ORCHESTRATOR_PAT
//   5. write final status to /tmp log
// Env: CYCLE_ID, LOG_PATH, GH_ORCHESTRATOR_PAT, ANTHROPIC_API_KEY, SUPABASE_DIRECT_URL etc.

import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, appendFileSync, existsSync } from 'node:fs';

const LOG_PATH = process.env.LOG_PATH || `/tmp/orchestrator-${Date.now()}.log`;
const CYCLE_ID = process.env.CYCLE_ID || `C-${Date.now()}`;
const PAT = process.env.GH_ORCHESTRATOR_PAT;
const REPO = process.env.GH_REPO || 'XI1568-raghav/bhaktisetu';
const GIT_USER = 'orchestrator-bot[bot]';
const GIT_EMAIL = 'orchestrator@bhaktisetu.local';
const DRY_RUN = process.env.DRY_RUN === 'true';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try { appendFileSync(LOG_PATH, line); } catch {}
}

function run(cmd, opts = {}) {
  log(`$ ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    if (out && out.trim()) log(out.trim());
    return { ok: true, out };
  } catch (e) {
    log(`ERR: ${e.message}`);
    if (e.stdout) log(`stdout: ${e.stdout.toString().slice(0, 500)}`);
    if (e.stderr) log(`stderr: ${e.stderr.toString().slice(0, 500)}`);
    return { ok: false, err: e };
  }
}

async function main() {
  log(`==== Orchestrator BG wrapper start ====`);
  log(`CYCLE_ID=${CYCLE_ID} DRY_RUN=${DRY_RUN}`);

  if (!PAT) {
    log('FATAL: GH_ORCHESTRATOR_PAT not set in Render env');
    process.exit(1);
  }

  // Step 1: Sync to latest origin/main (defensive — drop any local drift)
  run('git config user.name "' + GIT_USER + '"');
  run('git config user.email "' + GIT_EMAIL + '"');
  run('git fetch origin main');
  run('git reset --hard origin/main');

  // Step 2: Run orchestrator. Hard 60min ceiling (Render free tier safety).
  // 4 cycles/day × 60min = 4h/day × 30 = 120h/mo = 16% of 750h free tier.
  // Opus 4.7 tokens uncapped per user directive — cycle ends on wall-clock not tokens.
  log('---- orchestrator start ----');
  const t0 = Date.now();
  const orchResult = spawnSync('node', ['scripts/agents/roadmap-orchestrator.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'inherit', 'inherit'],
    timeout: 60 * 60 * 1000,
  });
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  log(`---- orchestrator end (exit=${orchResult.status}, ${dur}s) ----`);

  // Step 3: Git commit + push results
  const statusBefore = run('git status --short');
  if (!statusBefore.out || statusBefore.out.trim() === '') {
    log('No changes from orchestrator — nothing to push');
    log(`==== Wrapper done (exit=${orchResult.status}) ====`);
    process.exit(orchResult.status || 0);
  }

  run('git add docs/roadmap/');
  const commitMsg = `roadmap: orchestrator cycle ${CYCLE_ID}${DRY_RUN ? ' (dryrun)' : ''} [skip ci]`;
  run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);

  // Push via PAT
  const pushUrl = `https://x-access-token:${PAT}@github.com/${REPO}.git`;
  const pushResult = spawnSync('git', ['push', pushUrl, 'HEAD:main'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (pushResult.status !== 0) {
    const stderr = pushResult.stderr?.toString() || '';
    // Redact PAT from any error string
    const safe = stderr.replace(PAT, '<REDACTED>');
    log(`PUSH FAILED: ${safe.slice(0, 500)}`);
    // Try rebase + retry once
    log('Attempting rebase + retry...');
    run('git fetch origin main');
    run('git rebase origin/main');
    const retry = spawnSync('git', ['push', pushUrl, 'HEAD:main'], {
      cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (retry.status !== 0) {
      log(`PUSH RETRY FAILED: ${(retry.stderr?.toString() || '').replace(PAT, '<REDACTED>').slice(0, 500)}`);
      process.exit(2);
    }
    log('PUSH RETRY OK');
  } else {
    log('PUSH OK');
  }

  log(`==== Wrapper done (exit=${orchResult.status}) ====`);
  process.exit(orchResult.status || 0);
}

main().catch((e) => {
  log(`UNCAUGHT: ${e.stack || e.message}`);
  process.exit(1);
});
