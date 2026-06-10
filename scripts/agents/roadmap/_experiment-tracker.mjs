// scripts/agents/roadmap/_experiment-tracker.mjs
// Read _experiments.yml registry + fetch PostHog insight per experiment + compute winner.
// Writes _experiments-state.json for signal-context.
// Decision Agent reasons over results to reshuffle item priorities.

import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { ROADMAP_ROOT } from './_lib.mjs';

const REG_PATH = join(ROADMAP_ROOT, '_experiments.yml');
const STATE_PATH = join(ROADMAP_ROOT, '_experiments-state.json');

async function fetchPosthogInsight(insightId, fetchFn = globalThis.fetch) {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return { stale: true, error: 'POSTHOG env missing' };
  if (!insightId || insightId.startsWith('posthog-insight-TBD')) {
    return { stale: true, error: 'insight not yet created' };
  }
  try {
    const r = await fetchFn(`https://app.posthog.com/api/projects/${projectId}/insights/${insightId}/`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return { stale: true, error: `HTTP ${r.status}` };
    const j = await r.json();
    const series = j.result || [];
    return { stale: false, raw: j, series };
  } catch (e) {
    return { stale: true, error: e.message };
  }
}

function decideWinner(exp, series) {
  // Stub: real winner logic when PostHog insight format known.
  // For now: returns null if series empty, else picks variant w/ highest count.
  if (!series || series.length < 2) return { winner: null, reason: 'insufficient variants in series' };
  const sorted = [...series].sort((a, b) => (b.count || 0) - (a.count || 0));
  const winner = sorted[0];
  const runner = sorted[1];
  const totalSamples = sorted.reduce((sum, s) => sum + (s.count || 0), 0);
  if (totalSamples < exp.min_sample_per_variant * exp.variants.length) {
    return { winner: null, reason: `under-sampled (${totalSamples} / ${exp.min_sample_per_variant * exp.variants.length})` };
  }
  const upliftPct = runner.count > 0 ? ((winner.count - runner.count) / runner.count) * 100 : 0;
  if (upliftPct < exp.target_uplift_pct) {
    return { winner: null, reason: `uplift ${upliftPct.toFixed(1)}% below target ${exp.target_uplift_pct}%` };
  }
  return { winner: winner.breakdown_value || winner.label || sorted[0], upliftPct, reason: `meets target uplift` };
}

export async function trackExperiments() {
  if (!existsSync(REG_PATH)) {
    return { compiledAt: new Date().toISOString(), experiments: [], note: 'no _experiments.yml registry' };
  }
  const reg = yaml.load(readFileSync(REG_PATH, 'utf8'));
  const experiments = reg.experiments || [];
  const results = [];
  for (const exp of experiments) {
    const data = await fetchPosthogInsight(exp.posthog_insight_id);
    const decision = data.stale ? { winner: null, reason: data.error } : decideWinner(exp, data.series);
    results.push({
      id: exp.id,
      name: exp.name,
      item_id: exp.item_id,
      status: exp.status,
      metric: exp.metric,
      stale: data.stale || false,
      error: data.error || null,
      decision,
      checkedAt: new Date().toISOString(),
    });
  }
  return {
    compiledAt: new Date().toISOString(),
    experimentCount: experiments.length,
    decided: results.filter((r) => r.decision.winner).length,
    underSampled: results.filter((r) => !r.decision.winner && /sampled/.test(r.decision.reason || '')).length,
    results,
  };
}

const __cli = (() => {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();

if (__cli) {
  const data = await trackExperiments();
  writeFileSync(STATE_PATH, JSON.stringify(data, null, 2));
  console.log(`Wrote ${STATE_PATH} with ${data.experimentCount} experiments (${data.decided} decided, ${data.underSampled} under-sampled).`);
}
