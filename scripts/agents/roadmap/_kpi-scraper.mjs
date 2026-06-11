import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { scrapeSupabase } from './_kpi-supabase.mjs';
import { scrapePosthog } from './_kpi-posthog.mjs';
import { scrapeRender } from './_kpi-render.mjs';
import { scrapeCfAnalytics } from './_kpi-cf.mjs';
import { scrapeGhRepo } from './_kpi-gh.mjs';
import { scrapeManual } from './_kpi-manual.mjs';

const DEFAULT_CACHE_PATH = 'docs/roadmap/_kpi-cache.json';
const TTL_DEFAULT = 3600 * 1000;
const TTL_BY_SOURCE = {
  render_logs: 6 * 3600 * 1000,
  cf_analytics: 24 * 3600 * 1000,
};

// Per-scraper hard wall (90s). Prevents 49min silent hangs (cycle 11 RCA).
// If a scraper TLS/socket hangs, race rejects → Promise.allSettled marks it
// failed → orchestrator continues with cached/empty rows for that source.
const SCRAPER_TIMEOUT_MS = 90 * 1000;

function withTimeout(label, p) {
  return Promise.race([
    p,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`scrape-${label}-timeout-${SCRAPER_TIMEOUT_MS}ms`)), SCRAPER_TIMEOUT_MS)
    ),
  ]);
}

export async function scrapeAllKpis(items, opts = {}) {
  const {
    now = Date.now(),
    forceRefresh = false,
    cachePath = DEFAULT_CACHE_PATH,
    scrapeSupabaseFn = scrapeSupabase,
    scrapePosthogFn = scrapePosthog,
    scrapeRenderFn = scrapeRender,
    scrapeCfFn = scrapeCfAnalytics,
    scrapeGhFn = scrapeGhRepo,
    scrapeManualFn = scrapeManual,
  } = opts;

  let cache;
  try {
    cache = existsSync(cachePath)
      ? JSON.parse(readFileSync(cachePath, 'utf8'))
      : { lastFullRefresh: null, entries: {} };
  } catch {
    cache = { lastFullRefresh: null, entries: {} };
  }
  if (!cache.entries) cache.entries = {};

  const grouped = {
    supabase: [],
    posthog: [],
    render_logs: [],
    cf_analytics: [],
    gh_repo: [],
    manual: [],
  };
  const fresh = [];

  for (const it of items) {
    const source = it.kpi.source;
    const metric = it.kpi.metric;
    const key = `${source}:${metric}`;
    const cached = cache.entries[key];
    const ttl = TTL_BY_SOURCE[source] ?? TTL_DEFAULT;
    const fetchedAtMs = cached?.fetchedAt ? new Date(cached.fetchedAt).getTime() : 0;

    if (!forceRefresh && cached && fetchedAtMs && now - fetchedAtMs < ttl) {
      fresh.push({ ...cached, metric, cached: true });
      continue;
    }
    if (grouped[source]) grouped[source].push(it);
  }

  const t0 = Date.now();
  console.log(`[kpi] scrape start: supabase=${grouped.supabase.length} posthog=${grouped.posthog.length} render=${grouped.render_logs.length} cf=${grouped.cf_analytics.length} gh=${grouped.gh_repo.length} manual=${grouped.manual.length}`);
  const settled = await Promise.allSettled([
    grouped.supabase.length ? withTimeout('supabase', scrapeSupabaseFn(grouped.supabase)) : Promise.resolve([]),
    grouped.posthog.length ? withTimeout('posthog', scrapePosthogFn(grouped.posthog)) : Promise.resolve([]),
    grouped.render_logs.length ? withTimeout('render', scrapeRenderFn(grouped.render_logs)) : Promise.resolve([]),
    grouped.cf_analytics.length ? withTimeout('cf', scrapeCfFn(grouped.cf_analytics)) : Promise.resolve([]),
    grouped.gh_repo.length ? withTimeout('gh', scrapeGhFn(grouped.gh_repo)) : Promise.resolve([]),
    grouped.manual.length ? withTimeout('manual', scrapeManualFn(grouped.manual)) : Promise.resolve([]),
  ]);
  const labels = ['supabase', 'posthog', 'render', 'cf', 'gh', 'manual'];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    if (r.status === 'rejected') {
      console.warn(`[kpi] ${labels[i]} failed: ${r.reason?.message || r.reason}`);
    } else {
      console.log(`[kpi] ${labels[i]} ok: ${Array.isArray(r.value) ? r.value.length : 0} rows`);
    }
  }
  console.log(`[kpi] scrape done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const live = settled.flatMap((r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []));

  for (const r of live) {
    const item = items.find((i) => i.kpi.metric === r.metric);
    if (!item) continue;
    const key = `${item.kpi.source}:${r.metric}`;
    cache.entries[key] = {
      ...r,
      fetchedAt: r.fetchedAt || new Date(now).toISOString(),
    };
  }

  cache.lastFullRefresh = new Date(now).toISOString();
  try {
    writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  } catch {
    // best-effort cache write
  }

  return [...fresh, ...live];
}
