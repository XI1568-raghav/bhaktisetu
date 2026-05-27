// agent-issue-filer — scans today's agent reports for critical signals and
// opens GitHub issues automatically. Closes the loop between detection
// (uptime/broken-link/schema-validator) and action.
//
// Requires GITHUB_TOKEN env var with `issues:write` scope. Skips silently
// if missing — same env-or-noop pattern as other agents.
//
// Idempotent: tags each created issue with `agent-auto-filed:<source>:<hash>`
// and skips re-filing if an open issue already carries the same fingerprint
// in its body.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, TODAY } from './_lib.mjs';

const REPORT_DIR = 'docs/agent-reports';
const GH_REPO = process.env.GH_REPO || 'XI1568-raghav/bhaktisetu';
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function ghFetch(path, init = {}) {
  if (!GH_TOKEN) return { status: 0, json: null };
  try {
    const r = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${GH_TOKEN}`,
        'user-agent': 'darshya-agent-issue-filer',
        ...(init.headers || {}),
      },
    });
    const json = await r.json().catch(() => null);
    return { status: r.status, json };
  } catch (e) {
    return { status: 0, json: null, error: String(e) };
  }
}

async function listOpenAutoIssues() {
  const { json } = await ghFetch(
    `/repos/${GH_REPO}/issues?state=open&labels=agent-auto-filed&per_page=100`
  );
  return Array.isArray(json) ? json : [];
}

function fingerprint(source, sigBody) {
  let h = 0;
  for (let i = 0; i < sigBody.length; i++) {
    h = ((h << 5) - h + sigBody.charCodeAt(i)) | 0;
  }
  return `${source}:${Math.abs(h).toString(36)}`;
}

async function fileIssue(title, body, labels = []) {
  const { status, json } = await ghFetch(`/repos/${GH_REPO}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      labels: ['agent-auto-filed', ...labels],
    }),
  });
  if (status === 201) return { ok: true, url: json?.html_url, number: json?.number };
  return { ok: false, status, error: json?.message };
}

// --- Signal extractors ---

function extractUptimeSignals(text) {
  // Look for "## Action required" or DOWN/ERROR rows
  const signals = [];
  const downRe = /\|\s*([^|]+?)\s*\|\s*(DOWN|ERROR)\s*\|/g;
  let m;
  while ((m = downRe.exec(text)) !== null) {
    const surface = m[1].trim();
    const state = m[2].trim();
    if (!surface || surface.includes('---')) continue;
    signals.push({ surface, state });
  }
  return signals;
}

function extractBrokenLinkSignals(text) {
  const signals = [];
  const brokenRe = /\|\s*([^|]+?)\s*\|\s*BROKEN\s*\|\s*(\d+|0)\s*\|/g;
  let m;
  while ((m = brokenRe.exec(text)) !== null) {
    const url = m[1].trim();
    const code = m[2].trim();
    if (!url || url.includes('---')) continue;
    signals.push({ url, code });
  }
  return signals.slice(0, 10); // cap
}

function extractSchemaSignals(text) {
  const signals = [];
  // Headings like "### `/url` (HTTP 200)"
  const re = /###\s+`([^`]+)`\s+\(HTTP\s+(\d+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    signals.push({ url: m[1], status: m[2] });
  }
  return signals;
}

// --- Main pipeline ---

async function processReport(filename, source, extractor, titleFn, bodyFn) {
  const fpath = join(REPORT_DIR, filename);
  if (!existsSync(fpath)) return { skipped: 'no report' };
  const text = readFileSync(fpath, 'utf8');
  const signals = extractor(text);
  if (signals.length === 0) return { skipped: 'no signals' };

  const fp = fingerprint(source, JSON.stringify(signals));
  const openIssues = await listOpenAutoIssues();
  const already = openIssues.find((i) => (i.body || '').includes(`fingerprint:${fp}`));
  if (already) return { skipped: 'dedup', existing: already.html_url };

  const title = titleFn(signals);
  const body = `${bodyFn(signals)}

---
_Auto-filed by \`agent-issue-filer\` on ${TODAY}._
_Source report: \`${filename}\`_
_fingerprint:${fp}_
`;
  const result = await fileIssue(title, body, [source]);
  return { signals: signals.length, ...result };
}

async function main() {
  console.log('[agent-issue-filer] starting');

  if (!GH_TOKEN) {
    const md = `# Agent Issue Filer — ${TODAY}

**Skipped: no GITHUB_TOKEN env var.**

Set \`GITHUB_TOKEN\` (or \`GH_TOKEN\`) GH Actions secret to enable auto-filing.
The default \`secrets.GITHUB_TOKEN\` provided by GH Actions has \`issues:write\`
scope on the same repo — no additional setup required if wired into
\`agents-daily.yml\`.
`;
    writeReport('agent-issue-filer', md);
    console.log('[agent-issue-filer] no token, skipped');
    return;
  }

  const results = [];

  // 1. Uptime issues
  const today = TODAY;
  const files = readdirSync(REPORT_DIR).filter((f) => f.startsWith(today));

  const uptimeFile = files.find((f) => f.includes('uptime-pinger'));
  if (uptimeFile) {
    const r = await processReport(
      uptimeFile,
      'uptime',
      extractUptimeSignals,
      (sigs) => `[uptime] ${sigs.length} surface(s) reporting DOWN/ERROR`,
      (sigs) => `## Surfaces with critical errors\n\n${sigs.map((s) => `- \`${s.surface}\` — **${s.state}**`).join('\n')}\n\nPlease investigate and resolve.`
    );
    results.push({ source: 'uptime', file: uptimeFile, ...r });
  }

  // 2. Broken-link issues
  const brokenFile = files.find((f) => f.includes('broken-link'));
  if (brokenFile) {
    const r = await processReport(
      brokenFile,
      'broken-link',
      extractBrokenLinkSignals,
      (sigs) => `[broken-link] ${sigs.length} broken internal link(s)`,
      (sigs) => `## Broken links detected\n\n${sigs.map((s) => `- \`${s.url}\` returned HTTP ${s.code}`).join('\n')}\n\nFix or remove these references.`
    );
    results.push({ source: 'broken-link', file: brokenFile, ...r });
  }

  // 3. Schema validation issues
  const schemaFile = files.find((f) => f.includes('schema-validator'));
  if (schemaFile) {
    const r = await processReport(
      schemaFile,
      'schema-validator',
      extractSchemaSignals,
      (sigs) => `[schema] ${sigs.length} page(s) with invalid JSON-LD`,
      (sigs) => `## Pages with schema issues\n\n${sigs.map((s) => `- \`${s.url}\` (HTTP ${s.status})`).join('\n')}\n\nSee full report for missing types + parse errors.`
    );
    results.push({ source: 'schema', file: schemaFile, ...r });
  }

  const md = `# Agent Issue Filer — ${TODAY}

Scanned today's agent reports for critical signals. Files GH issues
(label: \`agent-auto-filed\`) with fingerprint dedup.

## Results

${results.length === 0 ? '_No reports found from upstream agents (uptime-pinger / broken-link / schema-validator).  This run produces no signal._' : results.map((r) => `
### ${r.source}

- Source file: \`${r.file}\`
- ${r.ok ? `✓ Filed issue #${r.number}: ${r.url}` : r.skipped ? `Skipped: ${r.skipped}${r.existing ? ` (existing: ${r.existing})` : ''}` : `Failed: ${r.error || 'unknown'}`}
${r.signals ? `- Signals found: ${r.signals}` : ''}
`).join('\n')}

---
**Note:** Dedup uses fingerprint hash of signal set. Same set of issues
detected on consecutive days will not re-file — close the existing issue
to re-arm.
`;

  writeReport('agent-issue-filer', md);
  console.log('[agent-issue-filer] done');
}

main().catch((e) => {
  console.error('[agent-issue-filer] fatal:', e);
  process.exit(1);
});
