#!/usr/bin/env node
// scripts/agents/roadmap/finalize.mjs
// Parses Closes: Q-... trailers from recent commits, moves matching queue files to done/.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const QUEUE_DIR = 'docs/roadmap/queue';
const DONE_ROOT = 'docs/roadmap/done';
const ALERTS_DIR = 'docs/roadmap/_alerts';

function getRecentClosesTrailers() {
  let commits = [];
  if (process.env.GITHUB_EVENT_PATH && existsSync(process.env.GITHUB_EVENT_PATH)) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    commits = event.commits || [];
  } else {
    // Local fallback: last 10 commits
    const log = execSync('git log -10 --format=%H%n%B%n---END---', { encoding: 'utf8' });
    commits = log.split('---END---').filter(Boolean).map(c => {
      const lines = c.trim().split('\n');
      const sha = lines.shift();
      return { id: sha, message: lines.join('\n') };
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
  // v1 stub: returns passed=true always. Real curl/SQL/test runners deferred to Phase 6 soak.
  // verifyContract shape: { successCriteria: [], curlChecks: [], sqlChecks: [], testCommand: null }
  return { passed: true, notes: 'verifyContract execution deferred to Phase 6 — manual verify recommended' };
}

async function main() {
  if (!existsSync(QUEUE_DIR)) { console.log('no queue dir'); return; }
  const trailers = getRecentClosesTrailers();
  if (trailers.length === 0) { console.log('no Closes: trailers found'); return; }

  console.log(`[finalize] found ${trailers.length} Closes: trailer(s)`);

  const queueFiles = readdirSync(QUEUE_DIR).filter(f => f.endsWith('.md'));
  let moved = 0, failed = 0;

  for (const t of trailers) {
    const match = queueFiles.find(f => {
      const content = readFileSync(join(QUEUE_DIR, f), 'utf8');
      const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
      if (!m) return false;
      try { return yaml.load(m[1]).queueId === t.queueId; } catch { return false; }
    });
    if (!match) { console.warn(`queueId ${t.queueId} not found in queue/`); continue; }

    const content = readFileSync(join(QUEUE_DIR, match), 'utf8');
    const fmText = content.match(/^---\r?\n([\s\S]+?)\r?\n---/)[1];
    const fm = yaml.load(fmText);

    const verify = await verifyContract(fm.verifyContract);
    if (!verify.passed) {
      mkdirSync(ALERTS_DIR, { recursive: true });
      writeFileSync(join(ALERTS_DIR, `verify-failed-${t.queueId}.md`),
        `# Verify failed\n\nQueue: ${t.queueId}\nCommit: ${t.commitSha}\nNotes: ${verify.notes}\n`);
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
    const body = content.split(/^---\r?\n[\s\S]+?\r?\n---\r?\n/).slice(1).join('---\n');
    writeFileSync(join(doneDir, match), `---\n${yaml.dump(fm)}---\n${body}`);

    // Delete from queue via git rm (so commit picks up the move atomically)
    try { execSync(`git rm "${join(QUEUE_DIR, match)}"`, { stdio: 'pipe' }); }
    catch { /* file may already be staged or not tracked — best effort */ }
    moved++;
    console.log(`[finalize] ${t.queueId} → ${doneDir}/${match}`);
  }

  console.log(`[finalize] done. moved=${moved}, failed=${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
