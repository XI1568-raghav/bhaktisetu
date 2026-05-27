#!/usr/bin/env node
// RSS-to-thread — converts the day's most recent agent reports into an
// X (Twitter) thread draft + LinkedIn post draft. Build-in-public
// engine: every operational artifact becomes a public thread the
// founder can review + post in one click.
//
// Reads docs/agent-reports/YYYY-MM-DD-*.md, picks 3-4 most interesting,
// generates 5-7 tweet thread template with stats pulled from each report
// (broken-link count, social posts queued, leads, mentions).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, upsertLog, TODAY, REPORT_DIR } from './_lib.mjs';

function todaysReports() {
  if (!existsSync(REPORT_DIR)) return [];
  return readdirSync(REPORT_DIR)
    .filter((f) => f.startsWith(TODAY) && f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(REPORT_DIR, f), 'utf8');
      const agent = f.replace(`${TODAY}-`, '').replace(/\.md$/, '');
      return { file: f, agent, raw };
    });
}

// Try to extract a single headline number from a report body. Patterns
// mirror what the agents actually write today.
function extractStat(agent, raw) {
  const m =
    raw.match(/\*\*(\d+)\*\*[^\n]{0,60}(broken|mentions|leads|posts|drafts|new)/i) ||
    raw.match(/Checked\s+\*\*(\d+)\*\*/i) ||
    raw.match(/`(\d+)`\s*(broken|new|mentions|leads|posts)/i);
  if (m) return `${m[1]} ${m[2] || 'items'}`;
  // Fallback: count list items.
  const bullets = (raw.match(/^\s*[-*]\s+/gm) || []).length;
  if (bullets > 0) return `${bullets} items tracked`;
  return null;
}

function emojiFor(agent) {
  if (agent.includes('broken')) return '🔗';
  if (agent.includes('seo')) return '🔍';
  if (agent.includes('social')) return '📣';
  if (agent.includes('content')) return '✍️';
  if (agent.includes('lead')) return '📈';
  if (agent.includes('competitor')) return '🕵️';
  if (agent.includes('review')) return '⭐';
  if (agent.includes('lighthouse')) return '⚡';
  if (agent.includes('investor')) return '💼';
  return '🤖';
}

function humanizeAgent(a) {
  return a.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildThread(reports) {
  const intro = `🧵 Build-in-public — ${TODAY}\n\nWhat the Darshya agent fleet shipped today (zero humans pressed any button):`;
  const tweets = [intro];
  for (const r of reports.slice(0, 5)) {
    const stat = extractStat(r.agent, r.raw);
    const e = emojiFor(r.agent);
    const t = `${e} ${humanizeAgent(r.agent)}${stat ? ` — ${stat}` : ''}`;
    tweets.push(t.slice(0, 270));
  }
  tweets.push(`🛠️ All artifacts public at darshya.online/updates\n\nFollow for daily drops. /9`);
  return tweets;
}

function buildLinkedIn(reports) {
  const lines = [
    `Build-in-public log — ${TODAY}`,
    ``,
    `The Darshya agent fleet is nine cron-triggered scripts. Today's drops:`,
    ``,
  ];
  for (const r of reports.slice(0, 6)) {
    const stat = extractStat(r.agent, r.raw);
    lines.push(`• ${humanizeAgent(r.agent)}${stat ? ` — ${stat}` : ''}`);
  }
  lines.push(``, `Every artifact lives in our public repo, served at darshya.online/updates.`, ``, `Zero marketing varnish, just what the bots actually did.`);
  return lines.join('\n');
}

async function run() {
  const reports = todaysReports().filter((r) => !r.agent.startsWith('rss-to-thread'));

  let md = `# RSS-to-thread — ${TODAY}\n\n`;
  md += `Source reports: **${reports.length}** today.\n\n`;

  if (reports.length === 0) {
    md += `_No reports for today yet. Cron may not have fired — re-run after the daily fleet._\n`;
    writeReport('rss-to-thread', md);
    upsertLog('rss-to-thread', 'sources=0');
    return;
  }

  const thread = buildThread(reports);
  md += `## X thread (copy/paste)\n\n`;
  thread.forEach((t, i) => {
    md += `**${i + 1}/${thread.length}**\n\`\`\`\n${t}\n\`\`\`\n\n`;
  });

  md += `## LinkedIn post (copy/paste)\n\n\`\`\`\n${buildLinkedIn(reports)}\n\`\`\`\n\n`;

  md += `## Sources used\n\n`;
  for (const r of reports) md += `- ${humanizeAgent(r.agent)} (${r.file})\n`;

  writeReport('rss-to-thread', md);
  upsertLog('rss-to-thread', `sources=${reports.length} tweets=${thread.length}`);
}

run().catch((e) => {
  console.error('[rss-to-thread] FATAL', e);
  process.exit(1);
});
