// support-intent-triage — hourly read of inbound support tickets dropped
// into `docs/agent-reports/_inbound-tickets.jsonl` (one JSON per line) and
// classifies each by intent using keyword heuristics:
//
//   refund | abuse | booking-status | payment | technical | general
//
// Refund + abuse trigger immediate slack-style alert via GH issue (P0
// label). Everything else gets aggregated into the daily report so the
// founder can batch-respond.
//
// Inbound source is intentionally a file rather than a webhook —
// future-proof: WhatsApp / email parser can append to the JSONL without
// any coupling to this agent. Until that hook ships, this agent runs
// no-op-but-alive so its cron slot is established.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, TODAY, isoNow } from './_lib.mjs';

const REPORT_DIR = 'docs/agent-reports';
const INBOUND_FILE = join(REPORT_DIR, '_inbound-tickets.jsonl');
const STATE_FILE = join(REPORT_DIR, '_support-intent-state.json');
const GH_REPO = process.env.GH_REPO || 'XI1568-raghav/bhaktisetu';
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

const RULES = [
  { intent: 'refund', priority: 'P0', re: /\b(refund|money back|chargeback|cancel.*(book|order)|return.*money)\b/i },
  { intent: 'abuse', priority: 'P0', re: /\b(fraud|scam|fake|cheat|spam|harass|abuse|threat|legal)\b/i },
  { intent: 'booking-status', priority: 'P1', re: /\b(booking|video proof|video.*missing|when.*puja|status of|tracking)\b/i },
  { intent: 'payment', priority: 'P1', re: /\b(payment.*fail|charged.*twice|double.*charge|upi|razorpay|stripe)\b/i },
  { intent: 'technical', priority: 'P2', re: /\b(error|crash|bug|broken|not load|404|app.*hang)\b/i },
];

function classify(text) {
  for (const r of RULES) if (r.re.test(text)) return { intent: r.intent, priority: r.priority };
  return { intent: 'general', priority: 'P3' };
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { processed: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { processed: {} };
  }
}

function saveState(s) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

async function ghFileIssue(title, body, labels) {
  if (!GH_TOKEN) return { ok: false, skipped: 'no-token' };
  try {
    const r = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${GH_TOKEN}`,
        'user-agent': 'darshya-support-intent-triage',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title, body, labels }),
    });
    const json = await r.json().catch(() => null);
    if (r.status === 201) return { ok: true, number: json?.number, url: json?.html_url };
    return { ok: false, status: r.status, error: json?.message };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function readInbound() {
  if (!existsSync(INBOUND_FILE)) return [];
  const lines = readFileSync(INBOUND_FILE, 'utf8').split('\n').filter((l) => l.trim());
  const tickets = [];
  for (const line of lines) {
    try {
      const t = JSON.parse(line);
      if (!t.id || !t.text) continue;
      tickets.push(t);
    } catch {
      // skip malformed line
    }
  }
  return tickets;
}

async function main() {
  console.log('[support-intent-triage] starting');

  const tickets = readInbound();
  const state = loadState();
  state.processed = state.processed || {};

  const buckets = { refund: [], abuse: [], 'booking-status': [], payment: [], technical: [], general: [] };
  const alerts = [];

  for (const t of tickets) {
    if (state.processed[t.id]) continue;
    const cls = classify(t.text);
    buckets[cls.intent].push({ ...t, ...cls });
    state.processed[t.id] = { ...cls, processedAt: isoNow() };
    if (cls.priority === 'P0') alerts.push({ ...t, ...cls });
  }

  // File one combined P0 issue if anything critical landed this run.
  let alertResult = null;
  if (alerts.length > 0) {
    const body = `## Support tickets needing immediate human attention

${alerts
  .slice(0, 25)
  .map(
    (a) => `### ${a.intent.toUpperCase()} — \`${a.id}\` (${a.channel || 'unknown'})

> ${a.text.slice(0, 400).replace(/\n/g, ' ')}

From: ${a.from || 'unknown'} · received: ${a.receivedAt || 'unknown'}`,
  )
  .join('\n\n')}

---
_Auto-filed by \`support-intent-triage\` on ${TODAY}._
`;
    alertResult = await ghFileIssue(
      `[support] ${alerts.length} P0 ticket(s) need response`,
      body,
      ['agent-auto-filed', 'support', 'P0'],
    );
  }

  saveState(state);

  const inboundCount = tickets.length;
  const processedCount = Object.values(buckets).reduce((a, b) => a + b.length, 0);

  const md = `# support-intent-triage — ${TODAY}

Reads inbound tickets from \`${INBOUND_FILE}\` (append-only JSONL: \`{id,text,from,channel,receivedAt}\`) and classifies by intent.

## Summary

- Total tickets in inbox: **${inboundCount}**
- New since last run: **${processedCount}**
- P0 (refund / abuse): **${alerts.length}**
- GH issue filed: ${alertResult ? (alertResult.ok ? `✓ #${alertResult.number} — ${alertResult.url}` : `✗ ${alertResult.error || alertResult.skipped}`) : '_no P0 this run_'}

## Bucket counts

${Object.entries(buckets)
  .map(([k, v]) => `- **${k}**: ${v.length}`)
  .join('\n')}

${
  inboundCount === 0
    ? '_No inbound tickets yet. Wire WhatsApp / Resend webhook → append to `_inbound-tickets.jsonl` to activate triage._'
    : ''
}

## Recent P1 / P2 (founder batch-respond)

${[...buckets['booking-status'], ...buckets.payment, ...buckets.technical]
  .slice(0, 15)
  .map((t) => `- \`${t.intent}\` · \`${t.id}\` · from \`${t.from || 'unknown'}\` — _${t.text.slice(0, 120).replace(/\n/g, ' ')}…_`)
  .join('\n') || '_none_'}
`;

  writeReport('support-intent-triage', md);
  console.log('[support-intent-triage] done');
}

main().catch((e) => {
  console.error('[support-intent-triage] fatal:', e);
  process.exit(1);
});
