// Cloudflare Analytics KPI scraper.
// item.kpi.query = GraphQL query string.
// Bearer CF_ANALYTICS_TOKEN. 10s timeout. Never throws to caller.
// Usage: scrapeCfAnalytics(items, { fetch? }) → [{metric, value, stale, fetchedAt, error?}]

function findNumericTolerantly(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number' && Number.isFinite(obj)) return obj;
  if (typeof obj === 'string') {
    const n = Number(obj);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const found = findNumericTolerantly(v);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) {
      const found = findNumericTolerantly(v);
      if (found !== null) return found;
    }
    return null;
  }
  return null;
}

export async function scrapeCfAnalytics(items, { fetch: providedFetch } = {}) {
  const fetchFn = providedFetch || globalThis.fetch;
  const token = process.env.CF_ANALYTICS_TOKEN;
  const out = [];
  for (const it of items) {
    const metric = it.kpi.metric;
    if (!token) {
      out.push({ metric, stale: true, error: 'CF_ANALYTICS_TOKEN missing' });
      continue;
    }
    try {
      const res = await fetchFn('https://api.cloudflare.com/client/v4/graphql/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: it.kpi.query }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        out.push({ metric, stale: true, error: `HTTP ${res.status}` });
        continue;
      }
      const body = await res.json();
      if (body?.errors && Array.isArray(body.errors) && body.errors.length > 0) {
        out.push({ metric, stale: true, error: `GraphQL errors: ${body.errors[0].message || 'unknown'}` });
        continue;
      }
      const value = findNumericTolerantly(body?.data);
      if (value === null) {
        out.push({ metric, stale: true, error: 'no numeric value in GraphQL response' });
        continue;
      }
      out.push({ metric, value, stale: false, fetchedAt: new Date().toISOString() });
    } catch (e) {
      out.push({ metric, stale: true, error: e.message || String(e) });
    }
  }
  return out;
}
