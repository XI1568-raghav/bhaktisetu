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

  const settled = await Promise.allSettled([
    grouped.supabase.length ? scrapeSupabaseFn(grouped.supabase) : Promise.resolve([]),
    grouped.posthog.length ? scrapePosthogFn(grouped.posthog) : Promise.resolve([]),
    grouped.render_logs.length ? scrapeRenderFn(grouped.render_logs) : Promise.resolve([]),
    grouped.cf_analytics.length ? scrapeCfFn(grouped.cf_analytics) : Promise.resolve([]),
    grouped.gh_repo.length ? scrapeGhFn(grouped.gh_repo) : Promise.resolve([]),
    grouped.manual.length ? scrapeManualFn(grouped.manual) : Promise.resolve([]),
  ]);

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
