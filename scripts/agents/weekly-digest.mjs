#!/usr/bin/env node
// Weekly Digest — internal founder dashboard. Distinct from
// weekly-investor-update (external) — this one surfaces what needs
// attention: agent failures, uptime regressions, broken-link spikes,
// keyword losses, new competitor pages, schema errors.
//
// Runs Sundays (FORCE=1 override). Output: founder-facing punch list.

import { writeReport, REPORT_DIR, TODAY } from './_lib.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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

function readLatest(prefix) {
  if (!existsSync(REPORT_DIR)) return null;
  const files = readdirSync(REPORT_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f.includes(`-${prefix}`))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return { file: files[0], body: readFileSync(join(REPORT_DIR, files[0]), 'utf8') };
}

function extractCount(body, regex) {
  if (!body) return 0;
  const m = body.match(regex);
  return m && m[1] ? parseInt(m[1], 10) : 0;
}

function readState(name) {
  const p = join(REPORT_DIR, `_${name}-state.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function uptimeSnapshot() {
  const r = readLatest('uptime-pinger');
  if (!r) return { available: false };
  const down = extractCount(r.body, /(\d+)\s+DOWN/i);
  const error = extractCount(r.body, /(\d+)\s+ERROR/i);
  const slow = extractCount(r.body, /(\d+)\s+SLOW/i);
  const ok = extractCount(r.body, /(\d+)\s+OK/i);
  return { available: true, file: r.file, down, error, slow, ok };
}

function brokenLinkSnapshot() {
  const r = readLatest('broken-link');
  if (!r) return { available: false };
  const broken = extractCount(r.body, /(\d+)\s+BROKEN/i);
  return { available: true, file: r.file, broken };
}

function schemaSnapshot() {
  const r = readLatest('schema-validator');
  if (!r) return { available: false };
  const issues = extractCount(r.body, /Issues found:\s+(\d+)/);
  return { available: true, file: r.file, issues };
}

function competitorSnapshot() {
  const s = readState('competitor-feature-watcher');
  if (!s) return { available: false };
  const surfaces = Object.keys(s.snapshots || {}).length;
  return { available: true, surfaces };
}

function backlinkSnapshot() {
  const s = readState('backlinks-monitor');
  if (!s) return { available: false };
  const total = (s.knownDomains || []).length;
  return { available: true, total };
}

function keywordSnapshot() {
  const s = readState('keyword-rank-tracker');
  if (!s || !s.history) return { available: false };
  const days = Object.keys(s.history).sort();
  if (days.length < 2) return { available: false };
  const today = s.history[days[days.length - 1]] || {};
  const weekAgo = s.history[days[Math.max(0, days.length - 7)]] || {};
  const todayRanked = Object.values(today).filter((v) => v.rank !== null).length;
  const weekAgoRanked = Object.values(weekAgo).filter((v) => v.rank !== null).length;
  const top10 = Object.values(today).filter((v) => v.rank !== null && v.rank <= 10).length;
  const losses = [];
  for (const [kw, prev] of Object.entries(weekAgo)) {
    const cur = today[kw];
    if (prev.rank !== null && (!cur || cur.rank === null)) losses.push(kw);
    else if (prev.rank !== null && cur && cur.rank !== null && cur.rank - prev.rank >= 5) {
      losses.push(`${kw} (${prev.rank}→${cur.rank})`);
    }
  }
  return { available: true, todayRanked, weekAgoRanked, delta: todayRanked - weekAgoRanked, top10, losses };
}

function fleetActivity(days) {
  if (!existsSync(REPORT_DIR)) return {};
  const all = readdirSync(REPORT_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  const recent = all.filter((f) => days.some((d) => f.startsWith(d)));
  const byAgent = {};
  for (const f of recent) {
    const name = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    byAgent[name] = (byAgent[name] || 0) + 1;
  }
  return byAgent;
}

function buildActionItems({ uptime, broken, schema, keyword }) {
  const items = [];
  if (uptime.available) {
    if (uptime.down > 0) items.push({ severity: 'P0', text: `${uptime.down} surface(s) DOWN — see ${uptime.file}` });
    if (uptime.error > 0) items.push({ severity: 'P1', text: `${uptime.error} surface(s) returning errors — see ${uptime.file}` });
    if (uptime.slow > 2) items.push({ severity: 'P2', text: `${uptime.slow} surface(s) SLOW (>3s) — perf regression?` });
  }
  if (broken.available && broken.broken > 0) {
    items.push({ severity: 'P1', text: `${broken.broken} broken internal link(s) — see ${broken.file}` });
  }
  if (schema.available && schema.issues > 0) {
    items.push({ severity: 'P2', text: `${schema.issues} schema.org JSON-LD issue(s) — see ${schema.file}` });
  }
  if (keyword.available && keyword.losses.length > 0) {
    items.push({ severity: 'P2', text: `${keyword.losses.length} keyword(s) lost rank or dropped 5+: ${keyword.losses.slice(0, 5).join(', ')}${keyword.losses.length > 5 ? '…' : ''}` });
  }
  if (keyword.available && keyword.delta < 0) {
    items.push({ severity: 'P2', text: `Net keyword ranking declined WoW: ${keyword.delta}` });
  }
  return items;
}

function main() {
  if (!isSunday() && process.env.FORCE !== '1') {
    console.log('[weekly-digest] skip — not Sunday (set FORCE=1 to override)');
    return;
  }

  const days = lastNDays(7);
  const uptime = uptimeSnapshot();
  const broken = brokenLinkSnapshot();
  const schema = schemaSnapshot();
  const competitor = competitorSnapshot();
  const backlinks = backlinkSnapshot();
  const keyword = keywordSnapshot();
  const fleet = fleetActivity(days);

  const totalFleetRuns = Object.values(fleet).reduce((a, b) => a + b, 0);
  const actionItems = buildActionItems({ uptime, broken, schema, keyword });

  const lines = [];
  lines.push(`# Darshya — weekly digest ${days[0]} → ${days[6]}`);
  lines.push('');
  lines.push(`> Internal founder dashboard. Generated automatically from agent fleet artifacts.`);
  lines.push('');

  lines.push('## TL;DR');
  lines.push('');
  if (actionItems.length === 0) {
    lines.push(`- ✓ All systems healthy across ${Object.keys(fleet).length} agent types (${totalFleetRuns} runs this week).`);
  } else {
    const p0 = actionItems.filter((i) => i.severity === 'P0').length;
    const p1 = actionItems.filter((i) => i.severity === 'P1').length;
    const p2 = actionItems.filter((i) => i.severity === 'P2').length;
    lines.push(`- ⚠ ${actionItems.length} action items: ${p0} P0, ${p1} P1, ${p2} P2.`);
  }
  if (keyword.available) {
    const dir = keyword.delta > 0 ? '↑' : keyword.delta < 0 ? '↓' : '→';
    lines.push(`- SEO: ${keyword.todayRanked} keywords ranked (${dir} ${Math.abs(keyword.delta)} WoW), ${keyword.top10} in top 10.`);
  }
  if (backlinks.available) {
    lines.push(`- Backlinks: ${backlinks.total} referring domains tracked.`);
  }
  lines.push('');

  if (actionItems.length > 0) {
    lines.push('## Action items (founder review)');
    lines.push('');
    for (const item of actionItems) {
      lines.push(`- **${item.severity}** — ${item.text}`);
    }
    lines.push('');
  }

  lines.push('## Health snapshot');
  lines.push('');
  lines.push('| Check | Status | Source |');
  lines.push('|---|---|---|');
  if (uptime.available) {
    const status = uptime.down + uptime.error === 0 ? '✓ OK' : `⚠ ${uptime.down} down / ${uptime.error} err`;
    lines.push(`| Uptime (${uptime.ok}/${uptime.ok + uptime.error + uptime.down} surfaces) | ${status} | \`${uptime.file}\` |`);
  } else {
    lines.push(`| Uptime | _no recent report_ | — |`);
  }
  if (broken.available) {
    const status = broken.broken === 0 ? '✓ OK' : `⚠ ${broken.broken} broken`;
    lines.push(`| Internal links | ${status} | \`${broken.file}\` |`);
  } else {
    lines.push(`| Internal links | _no recent report_ | — |`);
  }
  if (schema.available) {
    const status = schema.issues === 0 ? '✓ OK' : `⚠ ${schema.issues} issues`;
    lines.push(`| JSON-LD schema | ${status} | \`${schema.file}\` |`);
  } else {
    lines.push(`| JSON-LD schema | _no recent report_ | — |`);
  }
  lines.push('');

  lines.push('## SEO snapshot');
  lines.push('');
  if (keyword.available) {
    lines.push(`- Keywords ranked: **${keyword.todayRanked}** (was ${keyword.weekAgoRanked}, Δ ${keyword.delta > 0 ? '+' : ''}${keyword.delta})`);
    lines.push(`- In top 10: **${keyword.top10}**`);
    if (keyword.losses.length > 0) {
      lines.push('');
      lines.push('**Watch (rank lost or dropped 5+):**');
      for (const kw of keyword.losses.slice(0, 10)) lines.push(`- ${kw}`);
    }
  } else {
    lines.push('- _Not enough keyword history yet (needs 2+ days)._');
  }
  lines.push('');

  if (competitor.available) {
    lines.push('## Competitor surfaces tracked');
    lines.push('');
    lines.push(`- ${competitor.surfaces} surfaces fingerprinted by competitor-feature-watcher.`);
    lines.push('- Review latest report for new SKUs / price changes.');
    lines.push('');
  }

  lines.push('## Fleet activity (7 days)');
  lines.push('');
  lines.push('| Agent | Runs |');
  lines.push('|---|---|');
  for (const [name, count] of Object.entries(fleet).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${name} | ${count} |`);
  }
  lines.push('');

  lines.push('---');
  lines.push(`_Generated: ${TODAY} · Darshya internal · Review weekly._`);

  writeReport('weekly-digest', lines.join('\n'));
  console.log(`[weekly-digest] ${actionItems.length} action items, ${totalFleetRuns} fleet runs analyzed`);
}

main();
