#!/usr/bin/env node
// Weekly Investor Update Generator — synthesizes Mon-Sun activity from
// agent reports + git log into a clean markdown update suitable for
// emailing investors / posting to /press#investor-updates. Idempotent:
// safely skips Mon-Sat (only runs on Sunday) unless FORCE=1.
//
// Output: docs/agent-reports/YYYY-MM-DD-weekly-investor-update.md
import { writeReport, REPORT_DIR, TODAY } from './_lib.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

function isSunday() { return new Date().getDay() === 0; }

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function gitCommitsLastWeek() {
  try {
    const out = execSync('git log --since="7 days ago" --pretty=format:"%h|%s|%an|%ad" --date=short', {
      encoding: 'utf8', cwd: process.cwd(),
    });
    return out.split('\n').filter(Boolean).map((l) => {
      const [hash, subject, author, date] = l.split('|');
      return { hash, subject, author, date };
    });
  } catch { return []; }
}

function classifyCommit(subject) {
  if (/^feat/i.test(subject)) return 'feature';
  if (/^fix/i.test(subject)) return 'fix';
  if (/^docs/i.test(subject)) return 'docs';
  if (/^chore/i.test(subject)) return 'chore';
  if (/^refactor/i.test(subject)) return 'refactor';
  if (/^test/i.test(subject)) return 'test';
  if (/^perf/i.test(subject)) return 'perf';
  return 'other';
}

function collectAgentReports(days) {
  if (!existsSync(REPORT_DIR)) return [];
  const all = readdirSync(REPORT_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  return all
    .filter((f) => days.some((d) => f.startsWith(d)))
    .map((f) => ({
      name: f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
      file: f,
      date: f.slice(0, 10),
    }));
}

function summarizeKeywordRank() {
  const statePath = join(REPORT_DIR, '_keyword-rank-tracker-state.json');
  if (!existsSync(statePath)) return null;
  try {
    const s = JSON.parse(readFileSync(statePath, 'utf8'));
    const days = Object.keys(s.history || {}).sort();
    if (days.length < 2) return null;
    const today = s.history[days[days.length - 1]] || {};
    const weekAgo = s.history[days[Math.max(0, days.length - 7)]] || {};
    const todayRanked = Object.values(today).filter((v) => v.rank !== null).length;
    const weekAgoRanked = Object.values(weekAgo).filter((v) => v.rank !== null).length;
    const top10 = Object.values(today).filter((v) => v.rank !== null && v.rank <= 10).length;
    return { todayRanked, weekAgoRanked, delta: todayRanked - weekAgoRanked, top10 };
  } catch { return null; }
}

function main() {
  if (!isSunday() && process.env.FORCE !== '1') {
    console.log('[weekly-investor-update] skip — not Sunday (set FORCE=1 to override)');
    return;
  }

  const days = lastNDays(7);
  const commits = gitCommitsLastWeek();
  const buckets = { feature: [], fix: [], docs: [], chore: [], refactor: [], test: [], perf: [], other: [] };
  for (const c of commits) buckets[classifyCommit(c.subject)].push(c);

  const reports = collectAgentReports(days);
  const reportTypes = Array.from(new Set(reports.map((r) => r.name))).sort();
  const seo = summarizeKeywordRank();

  const lines = [];
  lines.push(`# Darshya — weekly update ${days[0]} → ${days[6]}`);
  lines.push('');
  lines.push(`> Generated automatically from git log + agent fleet output. Founder reviews before sending.`);
  lines.push('');

  lines.push('## TL;DR');
  lines.push('');
  lines.push(`- ${commits.length} commits this week (${buckets.feature.length} features, ${buckets.fix.length} fixes).`);
  lines.push(`- ${reports.length} fleet artifacts across ${reportTypes.length} agent types.`);
  if (seo) {
    const dir = seo.delta > 0 ? 'up' : seo.delta < 0 ? 'down' : 'flat';
    lines.push(`- SEO: ${seo.todayRanked} keywords ranked (${dir} ${Math.abs(seo.delta)} WoW), ${seo.top10} in top 10.`);
  }
  lines.push('');

  if (buckets.feature.length) {
    lines.push('## Shipped this week');
    lines.push('');
    for (const c of buckets.feature.slice(0, 12)) {
      lines.push(`- \`${c.hash}\` ${c.subject.replace(/^feat[(:][^)]*\)?:?\s*/i, '')}`);
    }
    if (buckets.feature.length > 12) lines.push(`- _…and ${buckets.feature.length - 12} more_`);
    lines.push('');
  }

  if (buckets.fix.length) {
    lines.push('## Fixed');
    lines.push('');
    for (const c of buckets.fix.slice(0, 8)) lines.push(`- \`${c.hash}\` ${c.subject.replace(/^fix[(:][^)]*\)?:?\s*/i, '')}`);
    lines.push('');
  }

  lines.push('## Agent fleet activity');
  lines.push('');
  lines.push('| Agent | Runs this week |');
  lines.push('|---|---|');
  const agentRuns = {};
  for (const r of reports) agentRuns[r.name] = (agentRuns[r.name] || 0) + 1;
  for (const [name, count] of Object.entries(agentRuns).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${name} | ${count} |`);
  }
  lines.push('');

  if (seo) {
    lines.push('## SEO snapshot');
    lines.push('');
    lines.push(`- Keywords ranked: **${seo.todayRanked}** (was ${seo.weekAgoRanked} 7d ago, Δ ${seo.delta > 0 ? '+' : ''}${seo.delta})`);
    lines.push(`- In top 10: **${seo.top10}**`);
    lines.push('');
  }

  lines.push('## Next week — focus');
  lines.push('');
  lines.push('- _(founder fills in: top 3 priorities + any asks for investors)_');
  lines.push('');

  lines.push('## Asks');
  lines.push('');
  lines.push('- _(founder fills in: warm intros / advisor time / hiring referrals)_');
  lines.push('');

  lines.push('---');
  lines.push(`_Sent: ${TODAY} · Darshya · https://darshya.online_`);

  writeReport('weekly-investor-update', lines.join('\n'));
}

main();
