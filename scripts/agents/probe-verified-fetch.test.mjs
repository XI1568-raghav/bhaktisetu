/**
 * OPS-12 (`F451`, 2026-09-08) — the trap this locks out.
 *
 * A burst of roughly ten concurrent requests makes the origin rate-limit and
 * serve Cloudflare block pages. Those bodies are not empty and they are not
 * obviously wrong: they render an `h1` containing the bare hostname
 * ("darshya.online") at 40px system-ui. A measurement script that reads the DOM
 * without first asserting the status code records THAT as the page's h1 and
 * reports a confident, wrong typography or layout number. That is how false
 * audit findings get made.
 *
 * `fetchText`/`fetchJson` in `_lib.mjs` hand back `{ status, text }` and leave
 * the check to the caller. Most callers do check. Two did not. `fetchVerified`
 * removes the choice: the body is `null` unless the response was verified.
 *
 * NOTHING HERE TOUCHES THE NETWORK. Every test injects a fake fetch, a fake
 * clock and a fake sleep.
 *
 * ⚠ CI WIRING REQUIRED: a test file under scripts/ does not run in CI until it
 * is named in the "Ops guards" step of .github/workflows/ci.yml. This file is
 * not there yet.
 */
import { describe, it, expect } from 'vitest';
import { fetchVerified, detectBlockPage, BROWSER_UA } from './_lib.mjs';

/** The real shape of the body the origin served during the 2026-09-08 sweep. */
const CF_BLOCK_PAGE = `<!DOCTYPE html><html lang="en"><head><title>darshya.online | 429: Too many requests</title>
<style>h1{font-family:system-ui,-apple-system,sans-serif;font-size:40px;font-weight:500;}</style></head>
<body><div id="cf-wrapper"><div class="cf-error-details">
<h1>darshya.online</h1><h2 class="cf-subheadline">Too many requests</h2>
<p>Ray ID: 8f2c1d0e9a7b0000 &bull; Your IP: 203.0.113.7</p>
<span id="cf-footer-item-ip">Performance &amp; security by Cloudflare</span>
<script src="/cdn-cgi/challenge-platform/h/b/scripts/jsd/main.js"></script>
</div></div></body></html>`;

const REAL_PAGE = `<!DOCTYPE html><html><head><title>Darshya — Online Puja Booking</title></head>
<body><header><nav>…</nav></header><main><h1>Book a puja at a verified temple</h1>
<p>Video proof of every puja.</p></main></body></html>`;

/** A fake fetch driven by a queue of scripted responses. */
function scriptedFetch(responses) {
  const calls = [];
  const queue = [...responses];
  const impl = async (url, opts = {}) => {
    calls.push({ url, opts });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    return {
      status: next.status,
      ok: next.status >= 200 && next.status < 300,
      headers: { get: (k) => next.headers?.[String(k).toLowerCase()] ?? null },
      text: async () => next.body ?? '',
    };
  };
  impl.calls = calls;
  return impl;
}

const noSleep = async () => {};

describe('detectBlockPage', () => {
  it('flags the Cloudflare interstitial even when it arrives with a 200', () => {
    const d = detectBlockPage({ status: 200, headers: {}, body: CF_BLOCK_PAGE });
    expect(d.blocked).toBe(true);
    expect(d.reason).toMatch(/cloudflare|challenge|cdn-cgi/i);
  });

  it('flags a response carrying the cf-mitigated header', () => {
    const d = detectBlockPage({ status: 200, headers: { 'cf-mitigated': 'challenge' }, body: REAL_PAGE });
    expect(d.blocked).toBe(true);
  });

  it('does not flag a real page', () => {
    expect(detectBlockPage({ status: 200, headers: {}, body: REAL_PAGE }).blocked).toBe(false);
  });
});

describe('fetchVerified — the 429 block page', () => {
  it('does NOT return the block-page body as content', async () => {
    const r = await fetchVerified('https://darshya.online/', {
      fetchImpl: scriptedFetch([{ status: 429, body: CF_BLOCK_PAGE, headers: { 'cf-ray': '8f2c' } }]),
      sleep: noSleep,
      retries: 0,
      minIntervalMs: 0,
    });
    expect(r.ok).toBe(false);
    expect(r.verified).toBe(false);
    expect(r.status).toBe(429);
    // The whole finding in one assertion: the h1 must not be reachable.
    expect(r.text).toBeNull();
    expect(JSON.stringify(r)).not.toContain('darshya.online</h1>');
  });

  it('says WHY, naming the status, so the operator cannot mistake it for a real reading', async () => {
    const r = await fetchVerified('https://darshya.online/', {
      fetchImpl: scriptedFetch([{ status: 429, body: CF_BLOCK_PAGE, headers: { 'cf-ray': '8f2c' } }]),
      sleep: noSleep,
      retries: 0,
      minIntervalMs: 0,
    });
    expect(r.reason).toMatch(/429/);
    expect(r.blocked).toBe(true);
  });

  it('withholds the body of a 200 that is really a Cloudflare challenge', async () => {
    const r = await fetchVerified('https://darshya.online/', {
      fetchImpl: scriptedFetch([{ status: 200, body: CF_BLOCK_PAGE }]),
      sleep: noSleep,
      retries: 0,
      minIntervalMs: 0,
    });
    expect(r.status).toBe(200);
    expect(r.verified).toBe(false);
    expect(r.blocked).toBe(true);
    expect(r.text).toBeNull();
  });

  it('withholds the body of any status other than the expected one', async () => {
    for (const status of [301, 404, 500, 503]) {
      const r = await fetchVerified('https://darshya.online/x', {
        fetchImpl: scriptedFetch([{ status, body: REAL_PAGE }]),
        sleep: noSleep,
        retries: 0,
        minIntervalMs: 0,
      });
      expect(r.verified, `status ${status} must not be treated as verified`).toBe(false);
      expect(r.text, `status ${status} must not yield a body`).toBeNull();
    }
  });

  it('returns the body only when the status matches and nothing looks blocked', async () => {
    const r = await fetchVerified('https://darshya.online/', {
      fetchImpl: scriptedFetch([{ status: 200, body: REAL_PAGE }]),
      sleep: noSleep,
      minIntervalMs: 0,
    });
    expect(r.ok).toBe(true);
    expect(r.verified).toBe(true);
    expect(r.text).toContain('Book a puja at a verified temple');
  });

  it('honours an explicit expectStatus, e.g. a redirect probe', async () => {
    const r = await fetchVerified('https://darshya.online/festivals', {
      expectStatus: 308,
      fetchImpl: scriptedFetch([{ status: 308, body: '', headers: { location: '/festival' } }]),
      sleep: noSleep,
      minIntervalMs: 0,
    });
    expect(r.verified).toBe(true);
    expect(r.status).toBe(308);
  });

  it('surfaces a transport failure as unverified with no body', async () => {
    const r = await fetchVerified('https://darshya.online/', {
      fetchImpl: scriptedFetch([new Error('ECONNRESET')]),
      sleep: noSleep,
      retries: 0,
      minIntervalMs: 0,
    });
    expect(r.status).toBe(0);
    expect(r.verified).toBe(false);
    expect(r.text).toBeNull();
    expect(r.reason).toMatch(/ECONNRESET/);
  });
});

describe('fetchVerified — the burst that caused OPS-12', () => {
  it('sends a browser User-Agent by default', async () => {
    const impl = scriptedFetch([{ status: 200, body: REAL_PAGE }]);
    await fetchVerified('https://darshya.online/', { fetchImpl: impl, sleep: noSleep, minIntervalMs: 0 });
    const ua = impl.calls[0].opts.headers['user-agent'];
    expect(ua).toBe(BROWSER_UA);
    expect(ua).toMatch(/Mozilla/);
  });

  it('paces same-origin requests instead of firing them concurrently', async () => {
    const slept = [];
    const impl = scriptedFetch([{ status: 200, body: REAL_PAGE }]);
    const opts = {
      fetchImpl: impl,
      sleep: async (ms) => { slept.push(ms); },
      minIntervalMs: 7000,
    };
    // Ten at once — the exact burst size that tripped the origin.
    await Promise.all(Array.from({ length: 10 }, () => fetchVerified('https://darshya.online/', opts)));
    expect(impl.calls).toHaveLength(10);
    // Nine of the ten had to wait behind the one before it.
    const waits = slept.filter((ms) => ms > 0);
    expect(waits.length).toBeGreaterThanOrEqual(9);
    expect(Math.max(...waits)).toBeLessThanOrEqual(7000);
  });

  it('retries a 429 and returns the verified body when the origin recovers', async () => {
    const slept = [];
    const r = await fetchVerified('https://darshya.online/', {
      fetchImpl: scriptedFetch([
        { status: 429, body: CF_BLOCK_PAGE, headers: { 'retry-after': '3' } },
        { status: 200, body: REAL_PAGE },
      ]),
      sleep: async (ms) => { slept.push(ms); },
      retries: 2,
      minIntervalMs: 0,
    });
    expect(r.verified).toBe(true);
    expect(r.text).toContain('Book a puja');
    expect(r.attempts).toBe(2);
    expect(slept).toContain(3000); // honoured Retry-After, not a fixed backoff
  });

  it('gives up unverified rather than returning the block page after exhausting retries', async () => {
    const r = await fetchVerified('https://darshya.online/', {
      fetchImpl: scriptedFetch([{ status: 503, body: CF_BLOCK_PAGE }]),
      sleep: noSleep,
      retries: 2,
      minIntervalMs: 0,
    });
    expect(r.attempts).toBe(3);
    expect(r.verified).toBe(false);
    expect(r.text).toBeNull();
  });
});
