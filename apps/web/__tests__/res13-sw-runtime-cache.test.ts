import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * RES-13 — "nothing recovers when the connection returns" had a second half the
 * first fix did not touch: the service worker's cached-page branch was dead.
 *
 * The prod sweep (2026-08-12) inspected the browser's cache storage on
 * darshya.online and found exactly:
 *
 *     caches = { 'darshya-offline-v1': ['/offline'] }
 *
 * `public/sw.js` opened THAT cache and asked it for the navigation request
 * ("serve cached page if any"). Nothing ever wrote a page into it, so the
 * branch could not hit for a single real route: a page the devotee had read a
 * minute earlier was as unavailable offline as one they had never opened, and
 * the sweep's second offline navigation (to /temples) rendered a blank page.
 *
 * The audit's instruction was "either start populating the runtime cache on
 * successful navigations (so the cached-page branch is real) or delete that
 * dead branch".
 *
 * These tests drive the REAL `public/sw.js` — the file the browser downloads —
 * inside a fake worker global, so they fail if the shipped script regresses.
 *
 * RED BEFORE THE FIX, measured by running this file against the previous
 * sw.js: "caches a successful navigation" failed (0 cache writes), "serves the
 * previously-visited page when the network is gone" failed (fell through to
 * /offline), and "evicts oldest-first" failed (nothing to evict). The three
 * that guard against caching the WRONG thing passed both before and after —
 * they exist so this fix cannot be implemented as an unconditional cache.
 */

const SW_SRC = readFileSync(path.resolve(__dirname, '../public/sw.js'), 'utf8');

type Listeners = Record<string, (event: unknown) => void>;

interface FakeResponse {
  status: number;
  type: string;
  redirected: boolean;
  body: string;
  clone(): FakeResponse;
}

function res(body: string, over: Partial<FakeResponse> = {}): FakeResponse {
  const r: FakeResponse = {
    status: 200,
    type: 'basic',
    redirected: false,
    body,
    clone() {
      return { ...r, clone: r.clone };
    },
    ...over,
  };
  return r;
}

/** Minimal CacheStorage: enough of the surface sw.js actually calls. */
class FakeCache {
  map = new Map<string, FakeResponse>();
  async put(req: { url: string } | string, response: FakeResponse) {
    const k = typeof req === 'string' ? req : req.url;
    // Re-inserting must move the entry to the END, or LRU eviction is wrong.
    this.map.delete(k);
    this.map.set(k, response);
  }
  async match(req: { url: string } | string) {
    const k = typeof req === 'string' ? req : req.url;
    return this.map.get(k);
  }
  async keys() {
    return [...this.map.keys()].map((url) => ({ url }));
  }
  async delete(req: { url: string } | string) {
    const k = typeof req === 'string' ? req : req.url;
    return this.map.delete(k);
  }
  async addAll(urls: string[]) {
    for (const u of urls) await this.put(u, res(`precached ${u}`));
  }
}

class FakeCacheStorage {
  caches = new Map<string, FakeCache>();
  async open(name: string) {
    if (!this.caches.has(name)) this.caches.set(name, new FakeCache());
    return this.caches.get(name)!;
  }
  async keys() {
    return [...this.caches.keys()];
  }
  async delete(name: string) {
    return this.caches.delete(name);
  }
}

interface Harness {
  listeners: Listeners;
  cacheStore: FakeCacheStorage;
  /** URLs the worker actually hit the network for. */
  networkCalls: string[];
  /** Set to make the next fetch throw, as an offline device does. */
  offline: boolean;
  /** What the network returns for a navigation, keyed by url. */
  serve: Map<string, FakeResponse>;
  navigate(url: string): Promise<FakeResponse | undefined>;
  install(): Promise<void>;
  activate(): Promise<void>;
}

function loadWorker(): Harness {
  const listeners: Listeners = {};
  const cacheStore = new FakeCacheStorage();
  const h: Partial<Harness> = {
    listeners,
    cacheStore,
    networkCalls: [],
    offline: false,
    serve: new Map(),
  };

  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      listeners[type] = fn;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {}, matchAll: async () => [] },
    registration: { showNotification: async () => {} },
  };

  const fetchImpl = async (req: { url: string }) => {
    h.networkCalls!.push(req.url);
    if (h.offline) throw new TypeError('Failed to fetch');
    return h.serve!.get(req.url) ?? res(`network ${req.url}`);
  };

  // sw.js is a plain classic worker script: no imports, and its only free
  // identifiers are the four below. Running the SHIPPED file (rather than a
  // transcription of it) is the whole point — a regression in public/sw.js
  // must fail here.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('self', 'caches', 'fetch', 'Response', SW_SRC)(
    self,
    cacheStore,
    fetchImpl,
    function Response(this: unknown, body: string) {
      return res(body);
    },
  );

  const drain = async (fn: (event: unknown) => void, base: Record<string, unknown>) => {
    const waits: Promise<unknown>[] = [];
    let responded: Promise<FakeResponse> | undefined;
    fn({
      ...base,
      waitUntil: (p: Promise<unknown>) => waits.push(p),
      respondWith: (p: Promise<FakeResponse>) => {
        responded = p;
      },
    });
    const out = responded ? await responded : undefined;
    await Promise.all(waits);
    return out;
  };

  h.install = () => drain(listeners.install!, {}).then(() => undefined);
  h.activate = () => drain(listeners.activate!, {}).then(() => undefined);
  h.navigate = (url: string) =>
    drain(listeners.fetch!, { request: { url, method: 'GET', mode: 'navigate' } });

  return h as Harness;
}

let sw: Harness;

beforeEach(async () => {
  sw = loadWorker();
  await sw.install();
  await sw.activate();
});

const RUNTIME = 'darshya-runtime-v1';

async function runtimeUrls(): Promise<string[]> {
  const c = sw.cacheStore.caches.get(RUNTIME);
  return c ? [...c.map.keys()] : [];
}

describe('RES-13 — the service worker populates a runtime cache', () => {
  it('caches a successful navigation', async () => {
    await sw.navigate('https://darshya.online/temples');
    expect(await runtimeUrls()).toEqual(['https://darshya.online/temples']);
  });

  it('serves the previously-visited page when the network is gone', async () => {
    sw.serve.set('https://darshya.online/temples', res('<h1>Temples</h1>'));
    await sw.navigate('https://darshya.online/temples');

    sw.offline = true;
    const out = await sw.navigate('https://darshya.online/temples');
    // The real page, not the offline apology — this is the branch that could
    // never fire before.
    expect(out?.body).toBe('<h1>Temples</h1>');
  });

  it('still falls back to the offline shell for a page never visited', async () => {
    sw.offline = true;
    const out = await sw.navigate('https://darshya.online/pujas/home-puja');
    expect(out?.body).toBe('precached /offline');
  });

  it('is bounded, and evicts oldest-first', async () => {
    for (let i = 0; i < 35; i++) await sw.navigate(`https://darshya.online/p/${i}`);
    const urls = await runtimeUrls();
    expect(urls).toHaveLength(30);
    expect(urls).not.toContain('https://darshya.online/p/0');
    expect(urls).toContain('https://darshya.online/p/34');
  });

  it('never shadows a deploy: online navigations always hit the network', async () => {
    await sw.navigate('https://darshya.online/temples');
    sw.networkCalls.length = 0;
    sw.serve.set('https://darshya.online/temples', res('<h1>New build</h1>'));
    const out = await sw.navigate('https://darshya.online/temples');
    expect(sw.networkCalls).toEqual(['https://darshya.online/temples']);
    expect(out?.body).toBe('<h1>New build</h1>');
  });
});

describe('RES-13 — the runtime cache refuses what must never be replayed', () => {
  it('does not cache a non-200', async () => {
    sw.serve.set('https://darshya.online/gone', res('not found', { status: 404 }));
    await sw.navigate('https://darshya.online/gone');
    expect(await runtimeUrls()).toEqual([]);
  });

  it('does not cache a redirect (an auth bounce would be replayed as the page)', async () => {
    sw.serve.set('https://darshya.online/priest', res('login', { redirected: true }));
    await sw.navigate('https://darshya.online/priest');
    expect(await runtimeUrls()).toEqual([]);
  });

  it('does not cache an opaque cross-origin response', async () => {
    sw.serve.set('https://other.example/x', res('', { type: 'opaque' }));
    await sw.navigate('https://other.example/x');
    expect(await runtimeUrls()).toEqual([]);
  });

  it('leaves the offline shell in its own cache, so an eviction cannot take it', async () => {
    for (let i = 0; i < 35; i++) await sw.navigate(`https://darshya.online/p/${i}`);
    const offlineCache = sw.cacheStore.caches.get('darshya-offline-v1');
    expect(await offlineCache!.match('/offline')).toBeTruthy();
  });

  it('activate reaps a stale runtime cache, not only a stale offline one', async () => {
    const fresh = loadWorker();
    await fresh.cacheStore.open('darshya-runtime-v0');
    await fresh.cacheStore.open('darshya-offline-v0');
    await fresh.install();
    await fresh.activate();
    expect(await fresh.cacheStore.keys()).not.toContain('darshya-runtime-v0');
    expect(await fresh.cacheStore.keys()).not.toContain('darshya-offline-v0');
  });
});
