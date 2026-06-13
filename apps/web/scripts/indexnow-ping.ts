// R-Q3-M-014 — IndexNow ping for new city+puja landing pages
// Usage: INDEXNOW_KEY=<32-char-hex> tsx apps/web/scripts/indexnow-ping.ts
// Requires founder action: provide INDEXNOW_KEY env var (32-char hex) AND
// host the key verification file at apps/web/public/{INDEXNOW_KEY}.txt
// (single line containing the key, served by CF Pages as static asset).
//
// Env-or-noop: if INDEXNOW_KEY missing, script logs warning and exits 0
// rather than failing the deploy pipeline.

import { CITY_PUJA_SLUGS } from '../lib/city-pujas';

const BASE_URL = 'https://darshya.online';
const KEY = process.env.INDEXNOW_KEY ?? '';

async function ping() {
  if (!KEY) {
    console.warn('[indexnow] INDEXNOW_KEY missing — skipping ping (founder-action-required)');
    return;
  }

  const urls = CITY_PUJA_SLUGS.map(({ city, puja }) => `${BASE_URL}/puja/${city}/${puja}`);

  const body = {
    host: 'darshya.online',
    key: KEY,
    keyLocation: `${BASE_URL}/${KEY}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    if (res.status === 200 || res.status === 202) {
      console.log(`[indexnow] OK status=${res.status} submitted=${urls.length}`);
    } else {
      const text = await res.text().catch(() => '');
      console.warn(`[indexnow] non-2xx status=${res.status} body=${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn('[indexnow] fetch failed', err);
  }
}

ping();
