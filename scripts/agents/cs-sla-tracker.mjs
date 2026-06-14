// cs-sla-tracker — daily SLA measurement for CS first-response across email/WA/chat.
//
// Reads inbound tickets from `docs/agent-reports/_inbound-tickets.jsonl`
// (same JSONL the `support-intent-triage` agent consumes) and computes
// first-response latency where the ticket has been ack'd via an optional
// `firstResponseAt` (ISO timestamp) field appended by the responder.
//
// Roadmap item: R-Q3-CS-001 — P50 first-response SLA <2h across email/WA/chat.
// KPI written to `docs/agent-reports/_cs-sla-state.json` so the agent-fleet
// dashboard (and ROADMAP _manual-kpis.yml refresher) can read it without
// re-parsing the JSONL.
//
// Channels tracked: email, whatsapp, chat. Anything else is bucketed as `other`.
// Window: last 7 days (rolling). Tickets older than that drop off the cohort.
//
// Founder action required (one-time): wire the inbound source so
// `_inbound-tickets.jsonl` actually fills. Until then this agent runs no-op-
// but-alive so its cron slot is established and the KPI hook is in place.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { writeReport, TODAY, isoNow } from './_lib.mjs';

const REPORT_DIR = 'docs/agent-reports';
const INBOUND_FILE = join(REPORT_DIR, '_inbound-tickets.jsonl');
const STATE_FILE = join(REPORT_DIR, '_cs-sla-state.json');
const WINDOW_DAYS = 7;
const SLA_TARGET_MINUTES = 120; // R-Q3-CS-001 target: p50 < 2h

const CHANNELS = ['email', 'whatsapp', 'chat', 'other'];

function normalizeChannel(c) {
  if (!c) return 'other';
  const lc = String(c).toLowerCase();
  if (lc === 'email' || lc === 'mail' || lc === 'resend') return 'email';
  if (lc === 'whatsapp' || lc === 'wa' || lc === 'wa-cloud') return 'whatsapp';
  if (lc === 'chat' || lc === 'web-chat' || lc === 'livechat') return 'chat';
  return 'other';
}

export function readInbound(file = INBOUND_FILE) {
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
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

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

export function computeSla(tickets, { nowMs = Date.now(), windowDays = WINDOW_DAYS } = {}) {
  const cutoff = nowMs - windowDays * 24 * 60 * 60 * 1000;
  const byChannel = { email: [], whatsapp: [], chat: [], other: [] };
  const pending = { email: 0, whatsapp: 0, chat: 0, other: 0 };

  let cohort = 0;
  for (const t of tickets) {
    const recv = t.receivedAt ? Date.parse(t.receivedAt) : NaN;
    if (!Number.isFinite(recv) || recv < cutoff) continue;
    cohort++;
    const ch = normalizeChannel(t.channel);
    if (t.firstResponseAt) {
      const resp = Date.parse(t.firstResponseAt);
      if (Number.isFinite(resp) && resp >= recv) {
        const minutes = (resp - recv) / 60000;
        byChannel[ch].push(minutes);
      }
    } else {
      pending[ch]++;
    }
  }

  const stats = {};
  let allMinutes = [];
  for (const ch of CHANNELS) {
    const arr = [...byChannel[ch]].sort((a, b) => a - b);
    allMinutes = allMinutes.concat(arr);
    stats[ch] = {
      sample: arr.length,
      pending: pending[ch],
      p50: arr.length ? Math.round(percentile(arr, 50)) : null,
      p90: arr.length ? Math.round(percentile(arr, 90)) : null,
      met_sla: arr.length ? arr.filter((m) => m <= SLA_TARGET_MINUTES).length : 0,
    };
  }
  allMinutes.sort((a, b) => a - b);
  const overall = {
    sample: allMinutes.length,
    pending: Object.values(pending).reduce((a, b) => a + b, 0),
    p50: allMinutes.length ? Math.round(percentile(allMinutes, 50)) : null,
    p90: allMinutes.length ? Math.round(percentile(allMinutes, 90)) : null,
    met_sla: allMinutes.length ? allMinutes.filter((m) => m <= SLA_TARGET_MINUTES).length : 0,
    sla_target_minutes: SLA_TARGET_MINUTES,
  };
  return { cohort, windowDays, overall, byChannel: stats };
}

function renderReport(snapshot) {
  const { cohort, windowDays, overall, byChannel } = snapshot;
  const pct = overall.sample > 0 ? Math.round((overall.met_sla / overall.sample) * 100) : 0;
  const verdict = overall.p50 === null
    ? 'no-data'
    : overall.p50 <= SLA_TARGET_MINUTES
    ? `GREEN (p50=${overall.p50}m ≤ ${SLA_TARGET_MINUTES}m target)`
    : `RED (p50=${overall.p50}m > ${SLA_TARGET_MINUTES}m target)`;
  return `# cs-sla-tracker — ${TODAY}

R-Q3-CS-001 — P50 first-response SLA <2h across email/WA/chat (24x7).
Rolling window: **${windowDays} days**. Target: p50 ≤ ${SLA_TARGET_MINUTES} minutes.

## Verdict

**${verdict}**

- Cohort size (tickets received in last ${windowDays}d): **${cohort}**
- Responded to: **${overall.sample}** / Pending: **${overall.pending}**
- Met SLA: **${overall.met_sla}** (${pct}%)
- p50: **${overall.p50 ?? 'n/a'}m** · p90: **${overall.p90 ?? 'n/a'}m**

## By channel

| Channel | Sample | Pending | p50 (min) | p90 (min) | Met SLA |
|---|---|---|---|---|---|
${CHANNELS.map((c) => `| ${c} | ${byChannel[c].sample} | ${byChannel[c].pending} | ${byChannel[c].p50 ?? 'n/a'} | ${byChannel[c].p90 ?? 'n/a'} | ${byChannel[c].met_sla} |`).join('\n')}

## How to feed this agent

Append JSON lines to \`${INBOUND_FILE}\` with shape:

\`\`\`json
{"id":"wa-001","text":"...","from":"+9198…","channel":"whatsapp","receivedAt":"2026-06-14T08:00:00Z","firstResponseAt":"2026-06-14T08:42:00Z"}
\`\`\`

Required: \`id\`, \`text\`, \`receivedAt\` (ISO). Optional: \`firstResponseAt\` (ISO) — once present
the ticket counts toward the SLA cohort. \`channel\` is normalized: email/mail/resend → email,
whatsapp/wa/wa-cloud → whatsapp, chat/web-chat/livechat → chat.

## Founder action required

This agent runs no-op-but-alive until the inbound source is wired. Options:
1. WhatsApp Cloud webhook → append to \`_inbound-tickets.jsonl\` (gated on U7 Meta KYC).
2. Resend inbound parse → append on every support@ email.
3. LiveChatWidget escalation → append on every "talk to human" event.

Track: \`cs_p50_response_minutes\` in \`docs/roadmap/_manual-kpis.yml\` (refresher reads
the \`overall.p50\` field from \`${STATE_FILE}\`).
`;
}

async function main() {
  console.log('[cs-sla-tracker] starting');
  const tickets = readInbound();
  const snapshot = computeSla(tickets);
  snapshot.computedAt = isoNow();
  snapshot.target_minutes = SLA_TARGET_MINUTES;

  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(snapshot, null, 2));

  const md = renderReport(snapshot);
  writeReport('cs-sla-tracker', md);
  console.log(
    `[cs-sla-tracker] done — cohort=${snapshot.cohort} p50=${snapshot.overall.p50 ?? 'n/a'}m pending=${snapshot.overall.pending}`,
  );
}

const isDirect = import.meta.url.startsWith('file:') &&
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/^.*\//, ''));

if (isDirect || process.env.CS_SLA_TRACKER_RUN === '1') {
  main().catch((e) => {
    console.error('[cs-sla-tracker] fatal:', e);
    process.exit(1);
  });
}
