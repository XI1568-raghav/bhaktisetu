// Summarize 24-agent fleet daily reports → compact JSON for Decision Agent context.
// Reads docs/agent-reports/YYYY-MM-DD-{agent}.md (latest per agent), extracts first 1500 chars,
// writes docs/roadmap/_sector-summaries.json so signal-context can pass to Decision Agent.
// Usage: node scripts/agents/roadmap/_agent-fleet-summary.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPORTS_DIR = 'docs/agent-reports';
const OUT_PATH = 'docs/roadmap/_sector-summaries.json';
const MAX_EXCERPT = 1500;

// Map each agent → relevant sector (helps Decision Agent route summary to right CXO).
const AGENT_TO_SECTOR = {
  'seo-audit': 'cmo',
  'seo-internal-linker': 'cmo',
  'content-pipeline': 'cmo',
  'content-publisher': 'cmo',
  'content-draft': 'cmo',
  'social-queue': 'cmo',
  'social-content-multiplexer': 'cmo',
  'rss-to-thread': 'cmo',
  'founder-tweet-draft': 'cmo',
  'daily-devotional-broadcast': 'cmo',
  'keyword-rank-tracker': 'cmo',
  'backlinks-monitor': 'cmo',
  'gsc-submitter': 'cmo',
  'pr-outreach': 'cmo',
  'lead-gen': 'sales',
  'investor-pipeline': 'cfo',
  'investor-weekly-digest-v2': 'cfo',
  'weekly-investor-update': 'cfo',
  'onboarding-drip': 'hr',
  'onboarding-nudge': 'hr',
  'cold-temple-outreach': 'sales',
  'broken-link': 'cto',
  'uptime-pinger': 'it',
  'health-smoke': 'it',
  'schema-validator': 'cto',
  'temple-link-validator': 'cs',
  'review-harvest': 'cs',
  'competitor-watch': 'cpo',
  'competitor-feature-watcher': 'cpo',
  'funnel-drop-analyzer': 'cpo',
  'growth-metrics': 'cfo',
  'agent-issue-filer': 'it',
  'weekly-digest': 'founder',
  'x-engagement-digest': 'cmo',
  'support-intent-triage': 'cs',
  'dormant-reactivation': 'cmo',
  'referral-nudge': 'cmo',
  'booking-quality-monitor': 'cs',
};

function findLatestPerAgent() {
  if (!existsSync(REPORTS_DIR)) return {};
  const files = readdirSync(REPORTS_DIR).filter(f => /^\d{4}-\d{2}-\d{2}-/.test(f) && f.endsWith('.md'));
  const latest = {}; // agent → { date, file }
  for (const f of files) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})-(.+?)(?:-\d+h)?\.md$/);
    if (!m) continue;
    const [, date, agent] = m;
    if (!latest[agent] || date > latest[agent].date) {
      latest[agent] = { date, file: f };
    }
  }
  return latest;
}

export function summarizeFleet() {
  const latest = findLatestPerAgent();
  const summaries = {};
  const byector = {}; // sector → array of agent summaries

  for (const [agent, info] of Object.entries(latest)) {
    const content = readFileSync(join(REPORTS_DIR, info.file), 'utf8');
    const excerpt = content.slice(0, MAX_EXCERPT) + (content.length > MAX_EXCERPT ? '\n...[truncated]' : '');
    const sector = AGENT_TO_SECTOR[agent] || 'unmapped';
    const entry = { agent, sector, date: info.date, file: info.file, excerpt };
    summaries[agent] = entry;
    if (!byector[sector]) byector[sector] = [];
    byector[sector].push({ agent, date: info.date, excerpt: excerpt.slice(0, 500) });
  }

  return {
    compiledAt: new Date().toISOString(),
    agentCount: Object.keys(summaries).length,
    summaries,
    bySector: byector,
  };
}

const __cli = (() => {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch { return false; }
})();

if (__cli) {
  const data = summarizeFleet();
  writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
  console.log(`Wrote ${OUT_PATH} with ${data.agentCount} agent summaries (${Object.keys(data.bySector).length} sectors).`);
}
