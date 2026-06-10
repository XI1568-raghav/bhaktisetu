#!/usr/bin/env node
// scripts/agents/roadmap/orchestrator-pause.mjs
// Toggle `orchestratorPaused` in docs/roadmap/_budget-snapshot.json.
import { readFileSync, writeFileSync } from 'node:fs';

const arg = process.argv[2];
if (arg !== 'true' && arg !== 'false') { console.error('usage: orchestrator-pause <true|false>'); process.exit(1); }

const path = 'docs/roadmap/_budget-snapshot.json';
const budget = JSON.parse(readFileSync(path, 'utf8'));
budget.orchestratorPaused = (arg === 'true');
writeFileSync(path, JSON.stringify(budget, null, 2));
console.log(`orchestratorPaused: ${budget.orchestratorPaused}`);
