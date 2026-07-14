#!/usr/bin/env node
// scripts/mcp-smoke.mjs — smoke-check the darshya MCP server returns all 6 tools.
//
// Spawns the built stdio server (apps/darshya-mcp/dist/index.js), performs the
// MCP initialize handshake, calls tools/list, and asserts the response carries
// exactly the 6 expected read-only tools. Prints a single PASS/FAIL line and
// always exits (5s timeout + close handler) so it never hangs CI.
//
// Run via `pnpm mcp:smoke` from the repo root (that builds first), or directly
// with `node scripts/mcp-smoke.mjs` after a manual `pnpm --filter @darshya/mcp build`.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const SERVER_PATH = 'apps/darshya-mcp/dist/index.js';
const EXPECTED = [
  'funnel_today',
  'kpi_snapshot',
  'agent_reports',
  'agent_report_read',
  'prod_health',
  'recent_commits',
];

if (!existsSync(SERVER_PATH)) {
  console.error(
    `MCP SMOKE: FAIL server not built — run "pnpm --filter @darshya/mcp build" first (missing ${SERVER_PATH})`,
  );
  process.exit(1);
}

// stdio: pipe stdin (we write JSON-RPC), pipe stdout (we parse the response),
// inherit stderr (server diagnostics surface in CI logs directly).
const child = spawn('node', [SERVER_PATH], { stdio: ['pipe', 'pipe', 'inherit'] });

let stdout = '';
let exited = false;
const finish = (fn) => {
  if (exited) return;
  exited = true;
  clearTimeout(timeout);
  fn();
};

child.stdout.on('data', (d) => {
  stdout += d.toString();
});

child.on('error', (err) => {
  finish(() => {
    console.error(`MCP SMOKE: FAIL spawn error — ${err.message}`);
    process.exit(1);
  });
});

const timeout = setTimeout(() => {
  finish(() => {
    console.error('MCP SMOKE: FAIL timeout (no tools/list response within 5s)');
    child.kill();
    process.exit(1);
  });
}, 5000);

// 1. initialize, 2. notifications/initialized, 3. tools/list (id:2 is what we parse).
const lines = [
  JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-smoke', version: '1' },
    },
  }),
  JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
];
child.stdin.write(lines.join('\n') + '\n');
child.stdin.end();

child.on('close', () => {
  finish(() => {
    // Scan every stdout line for the tools/list response (id:2). Skip blanks +
    // non-JSON noise (the server shouldn't log to stdout, but be defensive).
    let toolsList = null;
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        if (j.id === 2 && j.result && Array.isArray(j.result.tools)) {
          toolsList = j.result.tools;
        }
      } catch {
        /* not a JSON-RPC line — ignore */
      }
    }

    if (!toolsList) {
      console.error('MCP SMOKE: FAIL no tools/list response (id:2) received');
      process.exit(1);
    }

    const names = toolsList.map((t) => t.name).sort();
    const want = [...EXPECTED].sort();
    const ok = names.length === want.length && names.every((n, i) => n === want[i]);
    if (ok) {
      console.log(`MCP SMOKE: PASS (${toolsList.length} tools)`);
      process.exit(0);
    }
    console.error(`MCP SMOKE: FAIL got [${names.join(',')}] expected [${want.join(',')}]`);
    process.exit(1);
  });
});
