#!/usr/bin/env node
// Run all agents in the fleet. Used by GH Actions daily workflow.
import { spawnSync } from 'node:child_process';

const agents = process.argv.slice(2);
const ALL = ['seo-audit', 'content-pipeline', 'lead-gen', 'investor-pipeline', 'growth-metrics', 'social-queue', 'onboarding-drip', 'pr-outreach', 'health-smoke', 'broken-link', 'gsc-submitter', 'founder-tweet-draft', 'content-publisher'];
const list = agents.length ? agents : ALL;

let failed = 0;
for (const a of list) {
  console.log(`\n=== ${a} ===`);
  const r = spawnSync('node', [`scripts/agents/${a}.mjs`], { stdio: 'inherit', timeout: 240_000 });
  if (r.status !== 0) {
    console.error(`✗ ${a} failed (exit ${r.status})`);
    failed++;
  } else {
    console.log(`✓ ${a}`);
  }
}

console.log(`\n${list.length - failed}/${list.length} agents passed`);
process.exit(failed > 0 ? 1 : 0);
