// Shared helpers for agent fleet. Pure node ESM, no deps.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const REPORT_DIR = 'docs/agent-reports';
export const TODAY = new Date().toISOString().slice(0, 10);

export function isoNow() {
  return new Date().toISOString();
}

export function writeReport(agentName, body, { suffix = '' } = {}) {
  const fname = `${TODAY}-${agentName}${suffix ? `-${suffix}` : ''}.md`;
  const fpath = join(REPORT_DIR, fname);
  mkdirSync(dirname(fpath), { recursive: true });
  writeFileSync(fpath, body, 'utf8');
  console.log(`[${agentName}] wrote ${fpath} (${body.length} bytes)`);
  return fpath;
}

export function upsertLog(name, line) {
  const fpath = join(REPORT_DIR, `_${name}-log.md`);
  mkdirSync(REPORT_DIR, { recursive: true });
  const prev = existsSync(fpath) ? readFileSync(fpath, 'utf8') : `# ${name} log\n\n`;
  const head = prev.split('\n').slice(0, 2).join('\n') + '\n';
  const rest = prev.split('\n').slice(2).join('\n');
  writeFileSync(fpath, `${head}\n- ${isoNow()} — ${line}\n${rest}`, 'utf8');
}

export async function fetchJson(url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, headers: { 'user-agent': 'darshya-agent/1.0', ...(opts.headers || {}) } });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: String(e) };
  }
}

export async function fetchText(url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, headers: { 'user-agent': 'darshya-agent/1.0', ...(opts.headers || {}) } });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: 0, text: String(e) };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * OPS-12 (`F451`, 2026-09-08) — the verified probe.
 *
 * `fetchText`/`fetchJson` above always hand back a body and leave the status
 * check to the caller. Most callers remember. The ones that forget do not fail
 * loudly — they succeed with the WRONG page, because the origin rate-limits
 * under a burst of roughly ten concurrent requests and Cloudflare answers with
 * a block page whose body renders an `h1` containing the bare hostname
 * ("darshya.online") at 40px system-ui. Read the DOM off that and you get a
 * confident, wrong measurement, which is exactly the shape of error that
 * produces false audit findings.
 *
 * `fetchVerified` takes the choice away rather than documenting it:
 *
 *   • it PACES — same-origin requests are serialised behind one another with a
 *     minimum interval, so the ten-way burst that triggers the rate limiter
 *     cannot be issued in the first place;
 *   • it sends a real browser User-Agent, because `darshya-agent/1.0` is itself
 *     a reason to be challenged;
 *   • it ASSERTS the status before anything reads the body;
 *   • it sniffs for a Cloudflare interstitial even on a 200, because a
 *     challenge page is not always served with an error status;
 *   • and it returns `text: null` for anything it did not verify. A caller
 *     cannot accidentally measure a block page, because there is no block page
 *     to measure.
 *
 * Retries honour `Retry-After`; exhausting them returns unverified rather than
 * degrading to "here's the body anyway".
 *
 * Default pacing is 1.5s between same-origin requests, which keeps a 20-page
 * sweep near 30s. Set PROBE_MIN_INTERVAL_MS=7000 to reproduce the 7–12s pacing
 * that the 2026-09-08 production sweep needed once the origin was already hot.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Chrome on Windows. A bot UA is itself a reason to be served a challenge. */
export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export const PROBE_MIN_INTERVAL_MS = Number(process.env.PROBE_MIN_INTERVAL_MS || 1500);

/** Statuses worth waiting out rather than reporting as a measurement. */
const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504]);

const BLOCK_HEADERS = ['cf-mitigated', 'cf-chl-out'];

const BLOCK_BODY_MARKERS = [
  '/cdn-cgi/challenge-platform',
  'cf-browser-verification',
  '__cf_chl',
  'cf-error-details',
  'attention required! | cloudflare',
  'sorry, you have been blocked',
  'checking your browser before accessing',
  'just a moment...',
  'security by cloudflare',
  'error 1015',
  'error 1020',
];

/**
 * Is this response an edge block/challenge page rather than the origin's page?
 * Deliberately independent of the status code: the dangerous case is the one
 * that arrives as 200.
 *
 * @param {{status:number, headers:Record<string,string|null>, body:string}} res
 * @returns {{blocked:boolean, reason:string}}
 */
export function detectBlockPage({ headers = {}, body = '' } = {}) {
  for (const h of BLOCK_HEADERS) {
    if (headers[h]) return { blocked: true, reason: `Cloudflare challenge header ${h}: ${headers[h]}` };
  }
  const hay = String(body).toLowerCase();
  for (const marker of BLOCK_BODY_MARKERS) {
    if (hay.includes(marker)) {
      return { blocked: true, reason: `Cloudflare block/challenge page detected (marker: "${marker}")` };
    }
  }
  return { blocked: false, reason: '' };
}

/** origin -> { chain, lastAt } — the serialiser that prevents the burst. */
const originGates = new Map();

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return String(url);
  }
}

async function pace(url, minIntervalMs, sleep, now) {
  if (!(minIntervalMs > 0)) return;
  const origin = originOf(url);
  const gate = originGates.get(origin) ?? { chain: Promise.resolve(), lastAt: 0 };
  originGates.set(origin, gate);
  const turn = gate.chain.then(async () => {
    const wait = gate.lastAt === 0 ? 0 : minIntervalMs - (now() - gate.lastAt);
    if (wait > 0) await sleep(wait);
    gate.lastAt = now();
  });
  gate.chain = turn.then(
    () => {},
    () => {},
  );
  await turn;
}

const HEADERS_OF_INTEREST = ['cf-mitigated', 'cf-chl-out', 'cf-ray', 'retry-after', 'content-type', 'location'];

function readHeaders(res) {
  const out = {};
  for (const k of HEADERS_OF_INTEREST) {
    try {
      out[k] = res.headers?.get?.(k) ?? null;
    } catch {
      out[k] = null;
    }
  }
  return out;
}

/**
 * Fetch a URL and return its body ONLY if the response was verified.
 *
 * @returns {Promise<{ok:boolean, verified:boolean, blocked:boolean, status:number,
 *                    text:string|null, reason:string, attempts:number,
 *                    headers:Record<string,string|null>, url:string}>}
 *          `text` is `null` whenever `verified` is false. There is no field
 *          anywhere on this object carrying an unverified body.
 */
export async function fetchVerified(url, opts = {}) {
  const {
    expectStatus = 200,
    headers = {},
    retries = 2,
    minIntervalMs = PROBE_MIN_INTERVAL_MS,
    timeoutMs = 20_000,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    now = Date.now,
    ...rest
  } = opts;

  const expected = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  let attempts = 0;
  let last = { status: 0, reason: 'not attempted', blocked: false, headers: {} };

  for (;;) {
    attempts += 1;
    await pace(url, minIntervalMs, sleep, now);

    let res;
    let body = '';
    let resHeaders = {};
    try {
      const init = {
        redirect: 'manual',
        ...rest,
        headers: {
          'user-agent': BROWSER_UA,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
          ...headers,
        },
      };
      if (timeoutMs > 0 && !init.signal && typeof AbortSignal?.timeout === 'function') {
        init.signal = AbortSignal.timeout(timeoutMs);
      }
      res = await fetchImpl(url, init);
      resHeaders = readHeaders(res);
      body = await res.text();
    } catch (err) {
      last = {
        status: 0,
        reason: `transport failure: ${err instanceof Error ? err.message : String(err)}`,
        blocked: false,
        headers: {},
      };
      if (attempts <= retries) {
        await sleep(1000 * attempts);
        continue;
      }
      return { ok: false, verified: false, blocked: false, status: 0, text: null, reason: last.reason, attempts, headers: {}, url };
    }

    const block = detectBlockPage({ status: res.status, headers: resHeaders, body });
    const statusOk = expected.includes(res.status);

    if (statusOk && !block.blocked) {
      return {
        ok: true,
        verified: true,
        blocked: false,
        status: res.status,
        text: body,
        reason: '',
        attempts,
        headers: resHeaders,
        url,
      };
    }

    last = {
      status: res.status,
      blocked: block.blocked,
      headers: resHeaders,
      reason: block.blocked
        ? `HTTP ${res.status} — ${block.reason}. Body withheld: this is an edge block page, not the origin's.`
        : `HTTP ${res.status} — expected ${expected.join(' or ')}. Body withheld: it was not verified.`,
    };

    const retryable = block.blocked || TRANSIENT.has(res.status);
    if (retryable && attempts <= retries) {
      const retryAfter = Number(resHeaders['retry-after']);
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * attempts);
      continue;
    }

    return {
      ok: false,
      verified: false,
      blocked: last.blocked,
      status: last.status,
      text: null,
      reason: last.reason,
      attempts,
      headers: last.headers,
      url,
    };
  }
}

export const WEB_BASE = process.env.WEB_BASE || 'https://darshya.online';
export const API_BASE = process.env.API_BASE || 'https://api.darshya.online';
