/**
 * READ-ONLY darshan stream validator. No DB, no secrets, public YouTube
 * endpoints only.
 *
 *   node scripts/validate-darshan-streams.mjs [--json]
 *
 * Reads the channel ids configured in src/routes/darshan.ts, the verified set in
 * ops/sql/darshan-channels-2026-10.sql, and any pinned video ids still in the
 * web fallback (apps/web/app/darshan/page.tsx), then reports per entry:
 *
 *   channel: feed HTTP status, channel title, newest upload date, live probe
 *            (live | offline | unknown - from /channel/<id>/live)
 *   video:   oEmbed status (200 exists, 401/404 gone). NOTE oEmbed says 200 for
 *            an ended live stream whose recording is withheld, so "alive" for a
 *            pinned video id is necessary, not sufficient.
 *
 * Exit 1 if any channel feed is not 200 or any pinned video is gone.
 * A "live" probe is a point-in-time reading, not a guarantee.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

export function extractTempleChannels(src) {
  const out = [];
  const re = /templeSlug:\s*'([^']+)'[\s\S]*?youtubeChannelId:\s*'(UC[\w-]{22})'/g;
  for (const m of src.matchAll(re)) out.push({ slug: m[1], channelId: m[2], source: 'darshan.ts' });
  return out;
}

export function extractSqlChannels(src) {
  const out = [];
  for (const m of src.matchAll(/\('([a-z0-9-]+)',\s*'(UC[\w-]{22})'/g)) out.push({ slug: m[1], channelId: m[2], source: 'sql' });
  return out;
}

export function extractPinnedVideoIds(src) {
  return [...new Set([...src.matchAll(/youtube\.com\/embed\/([\w-]{11})(?![\w-])/g)].map((m) => m[1]).filter((id) => id !== 'live_stream'))];
}

export function parseFeedHead(xml) {
  const title = xml.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;
  const dates = [...xml.matchAll(/<published>([^<]+)<\/published>/g)].map((m) => m[1]).sort().reverse();
  return { title, entries: dates.length, newest: dates[0] ?? null };
}

const UA = { 'User-Agent': 'Mozilla/5.0 (Darshya validate-darshan-streams)' };
const get = (url, init = {}) => fetch(url, { ...init, headers: { ...UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(15000) });

async function checkChannel(channelId) {
  const res = { feedStatus: 0, title: null, newest: null, entries: 0, live: 'unknown' };
  try {
    const r = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    res.feedStatus = r.status;
    if (r.ok) Object.assign(res, parseFeedHead(await r.text()), {});
  } catch { res.feedStatus = -1; }
  try {
    const r = await get(`https://www.youtube.com/channel/${channelId}/live`, { headers: { 'Accept-Language': 'en' } });
    const c = r.ok ? (await r.text()).match(/<link rel="canonical" href="([^"]*)"/)?.[1] : null;
    res.live = !c ? 'unknown' : /watch\?v=/.test(c) ? 'live' : /\/channel\/UC/.test(c) ? 'offline' : 'unknown';
  } catch { /* unknown */ }
  return res;
}

async function checkVideo(id) {
  try {
    const r = await get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    return r.status;
  } catch { return -1; }
}

async function main() {
  const read = (p) => readFileSync(path.join(root, p), 'utf8');
  const configured = extractTempleChannels(read('apps/api/src/routes/darshan.ts'));
  const sql = extractSqlChannels(read('ops/sql/darshan-channels-2026-10.sql'));
  const videos = extractPinnedVideoIds(read('apps/web/app/darshan/page.tsx'));

  const byChannel = new Map();
  for (const c of [...configured, ...sql]) {
    const e = byChannel.get(c.channelId) ?? { channelId: c.channelId, slugs: new Set(), sources: new Set() };
    e.slugs.add(c.slug); e.sources.add(c.source);
    byChannel.set(c.channelId, e);
  }

  const channels = [];
  for (const e of byChannel.values()) channels.push({ ...e, slugs: [...e.slugs], sources: [...e.sources], ...(await checkChannel(e.channelId)) });
  const vids = [];
  for (const id of videos) vids.push({ id, status: await checkVideo(id) });

  const json = process.argv.includes('--json');
  if (json) console.log(JSON.stringify({ channels, videos: vids }, null, 2));
  else {
    console.log('CHANNELS');
    for (const c of channels) {
      const ok = c.feedStatus === 200;
      console.log(`${ok ? 'alive' : 'DEAD '}  ${c.channelId}  feed=${c.feedStatus}  live=${c.live}  newest=${c.newest?.slice(0, 10) ?? '-'}  ${c.title ?? ''}  [${c.slugs.join(', ')}]`);
    }
    console.log('PINNED VIDEO IDS (web fallback)');
    for (const v of vids) console.log(`${v.status === 200 ? 'alive' : 'DEAD '}  ${v.id}  oembed=${v.status}`);
  }
  const bad = channels.some((c) => c.feedStatus !== 200) || vids.some((v) => v.status !== 200);
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
