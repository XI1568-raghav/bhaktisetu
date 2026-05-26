#!/usr/bin/env node
// Health Agent — runs the full role smoke every 6h, writes pass/fail digest.
// Wraps apps/api/scripts/smoke-all-roles.mjs and pulls a short summary.
import { spawnSync } from 'node:child_process';
import { writeReport, TODAY, isoNow, API_BASE, WEB_BASE } from './_lib.mjs';

function run() {
  const res = spawnSync('node', ['apps/api/scripts/smoke-all-roles.mjs', API_BASE, WEB_BASE], {
    encoding: 'utf8',
    timeout: 240_000,
  });

  const stdout = res.stdout || '';
  const tail = stdout.trim().split('\n').slice(-1)[0] || '';
  const m = tail.match(/Total:\s+(\d+)\s+pass,\s+(\d+)\s+fail/);
  const pass = m ? parseInt(m[1], 10) : 0;
  const fail = m ? parseInt(m[2], 10) : -1;

  const failingRows = stdout.split('\n').filter((l) => l.includes('[FAIL]'));

  const body = `# Health Smoke — ${TODAY} ${isoNow().slice(11, 19)}

> Runs every 6h via GH Actions. Hits public + per-role endpoints on prod.

## Result

- **Pass**: ${pass}
- **Fail**: ${fail < 0 ? 'UNKNOWN (parse error)' : fail}
- **Exit**: ${res.status}
- **API**: ${API_BASE}
- **Web**: ${WEB_BASE}

${fail > 0 ? `## Failing endpoints (${failingRows.length})\n\n\`\`\`\n${failingRows.slice(0, 30).join('\n')}\n\`\`\`` : '✓ All clear.'}

## Tail

\`\`\`
${stdout.trim().split('\n').slice(-40).join('\n')}
\`\`\`

---
*Agent: health-smoke*
`;

  writeReport('health-smoke', body, { suffix: isoNow().slice(11, 13) + 'h' });
  console.log(`Health: ${pass} pass / ${fail} fail`);
  // Don't fail the workflow on smoke failures — we want the artifact + history.
  process.exit(0);
}

run();
