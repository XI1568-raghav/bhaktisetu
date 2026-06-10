// Manual KPI scraper.
// Loads docs/roadmap/_manual-kpis.yml once per call. Returns values[item.kpi.metric].
// Never throws. stale=true + 'no manual value' on missing.
// Usage: scrapeManual(items, { yamlPath? }) → [{metric, value, stale, fetchedAt, error?}]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal YAML loader for the manual KPI file shape:
//   key: value
//   values:
//     metric_name: number_or_string_or_bool_or_null
function parseManualYaml(text) {
  const lines = text.split(/\r?\n/);
  const values = {};
  let inValues = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    if (/^values:\s*$/.test(line)) { inValues = true; continue; }
    if (!inValues) continue;
    // value lines indented (2+ spaces)
    if (!/^\s{2,}/.test(line)) {
      inValues = false;
      continue;
    }
    const m = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let rawVal = m[2].trim();
    // strip trailing comments
    rawVal = rawVal.replace(/\s+#.*$/, '').trim();
    let val;
    if (rawVal === '' || rawVal === 'null' || rawVal === '~') val = null;
    else if (rawVal === 'true') val = true;
    else if (rawVal === 'false') val = false;
    else if (/^-?\d+(\.\d+)?$/.test(rawVal)) val = Number(rawVal);
    else val = rawVal.replace(/^["']|["']$/g, '');
    values[key] = val;
  }
  return values;
}

export async function scrapeManual(items, { yamlPath } = {}) {
  const path = yamlPath || resolve(process.cwd(), 'docs/roadmap/_manual-kpis.yml');
  let values = {};
  let loadErr = null;
  try {
    const text = readFileSync(path, 'utf8');
    values = parseManualYaml(text);
  } catch (e) {
    loadErr = e.message || String(e);
  }
  const out = [];
  for (const it of items) {
    const metric = it.kpi.metric;
    if (loadErr) {
      out.push({ metric, stale: true, error: `no manual value: ${loadErr}` });
      continue;
    }
    if (!(metric in values) || values[metric] === null || values[metric] === undefined) {
      out.push({ metric, stale: true, error: 'no manual value' });
      continue;
    }
    out.push({ metric, value: values[metric], stale: false, fetchedAt: new Date().toISOString() });
  }
  return out;
}
