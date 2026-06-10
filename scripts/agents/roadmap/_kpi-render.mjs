// Render KPI scraper.
// item.kpi.query = serviceId string OR JSON {"serviceId":"srv-x","field":"finishedAt"}
// Bearer RENDER_API_KEY. 10s timeout. Never throws to caller.
// Usage: scrapeRender(items, { fetch? }) → [{metric, value, stale, fetchedAt, error?}]

export async function scrapeRender(items, { fetch: providedFetch } = {}) {
  const fetchFn = providedFetch || globalThis.fetch;
  const apiKey = process.env.RENDER_API_KEY;
  const out = [];
  for (const it of items) {
    const metric = it.kpi.metric;
    if (!apiKey) {
      out.push({ metric, stale: true, error: 'RENDER_API_KEY missing' });
      continue;
    }
    let serviceId = it.kpi.query;
    let field = 'status';
    const q = String(it.kpi.query || '').trim();
    if (q.startsWith('{')) {
      try {
        const parsed = JSON.parse(q);
        serviceId = parsed.serviceId;
        field = parsed.field || 'status';
      } catch (e) {
        out.push({ metric, stale: true, error: `bad query JSON: ${e.message}` });
        continue;
      }
    }
    try {
      const url = `https://api.render.com/v1/services/${serviceId}/deploys?limit=1`;
      const res = await fetchFn(url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        out.push({ metric, stale: true, error: `HTTP ${res.status}` });
        continue;
      }
      const body = await res.json();
      // Render API may return array of {deploy: {...}} or array of deploys directly
      const first = Array.isArray(body) ? body[0] : null;
      const deploy = first?.deploy || first;
      const value = deploy?.[field] ?? null;
      if (value === null || value === undefined) {
        out.push({ metric, stale: true, error: `no ${field} in latest deploy` });
        continue;
      }
      out.push({ metric, value, stale: false, fetchedAt: new Date().toISOString() });
    } catch (e) {
      out.push({ metric, stale: true, error: e.message || String(e) });
    }
  }
  return out;
}
