// PostHog KPI scraper.
// item.kpi.query = insight ID. Bearer POSTHOG_PERSONAL_API_KEY.
// 10s timeout. Never throws to caller. stale=true on any error.
// Usage: scrapePosthog(items, { fetch? }) → [{metric, value, stale, fetchedAt, error?}]

export async function scrapePosthog(items, { fetch: providedFetch } = {}) {
  const fetchFn = providedFetch || globalThis.fetch;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const out = [];
  for (const it of items) {
    const metric = it.kpi.metric;
    const insightId = it.kpi.query;
    try {
      const url = `https://app.posthog.com/api/projects/${projectId}/insights/${insightId}/`;
      const res = await fetchFn(url, {
        headers: { Authorization: `Bearer ${apiKey || ''}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        out.push({ metric, stale: true, error: `HTTP ${res.status}` });
        continue;
      }
      const body = await res.json();
      const r0 = body?.result?.[0];
      let value = null;
      if (r0 && typeof r0.count === 'number') {
        value = r0.count;
      } else if (r0?.data && Array.isArray(r0.data) && r0.data.length > 0) {
        value = r0.data[r0.data.length - 1];
      }
      if (value === null || value === undefined) {
        out.push({ metric, stale: true, error: 'no value in insight result' });
        continue;
      }
      out.push({ metric, value, stale: false, fetchedAt: new Date().toISOString() });
    } catch (e) {
      out.push({ metric, stale: true, error: e.message || String(e) });
    }
  }
  return out;
}
