import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_FETCH_TIMEOUT_MS } from '../lib/api-config';

/**
 * RES-01 (P0) — the second half: the typed API client modules.
 *
 * The first pass gave `fetchWithTimeout` to the auth pair and then to the five
 * pages the sweep instrumented (/priest, /profile, /messages, /dashboard,
 * /payouts). What it did NOT reach is the layer underneath them: the typed
 * client modules every portal page calls into. `lib/temple-api.ts` alone held
 * 13 bare `fetch(` calls, `lib/pandit-api.ts` 8, and wellness / subscription /
 * store-admin 6 each — so a temple manager loading their puja list, a pandit
 * loading offerings, or anyone saving a form still had no timeout at all.
 *
 * `fetch` never rejects on a stalled socket. Nothing after the `await` runs, so
 * the `finally { setLoading(false) }` and the `catch { setError(...) }` these
 * callers already have are unreachable — a permanent spinner with no message
 * and no way to retry.
 *
 * These tests bind to the BEHAVIOUR, not the spelling: a request that is
 * accepted and never answered must reject inside the budget. Reverting any of
 * the five modules to a bare `fetch` makes the matching case hang until vitest
 * kills it.
 */

const realFetch = globalThis.fetch;

/** A server that accepts the connection and then says nothing, forever. */
function stalledFetch() {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }
        // No signal => never settles. That is the bug, expressed.
      }),
  ) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

/**
 * One representative read per module. Each is the call a portal page makes on
 * mount behind its loading flag — the exact shape the sweep caught spinning.
 */
// Imported eagerly, NOT inside the cases: with fake timers running, a dynamic
// import's file I/O is not something the fake clock can drive, and the call
// would look "hung" for the wrong reason.
const templeApi = await import('../lib/temple-api');
const panditApi = await import('../lib/pandit-api');
const wellnessApi = await import('../lib/wellness-api');
const subscriptionApi = await import('../lib/subscription-api');
const storeAdminApi = await import('../lib/store-admin-api');

const CASES: Array<{ module: string; label: string; call: () => Promise<unknown> }> = [
  {
    module: 'lib/temple-api.ts',
    label: 'listTemplePujas (temple manager opens their puja list)',
    call: () => templeApi.listTemplePujas('tok'),
  },
  {
    module: 'lib/pandit-api.ts',
    label: 'listMyOfferings (pandit opens their offerings)',
    call: () => panditApi.listMyOfferings('tok'),
  },
  {
    module: 'lib/wellness-api.ts',
    label: 'listMySessions (wellness provider opens their sessions)',
    call: () => wellnessApi.listMySessions('tok'),
  },
  {
    module: 'lib/subscription-api.ts',
    label: 'getMySubscription (any provider opens their plan)',
    call: () => subscriptionApi.getMySubscription('tok'),
  },
  {
    module: 'lib/store-admin-api.ts',
    label: 'listStoreProducts (store admin opens their catalogue)',
    call: () => storeAdminApi.listStoreProducts('tok'),
  },
];

describe('RES-01 — the typed API clients must not hang forever', () => {
  for (const c of CASES) {
    it(`${c.module}: ${c.label} rejects instead of hanging`, async () => {
      globalThis.fetch = stalledFetch();
      // Fake timers so the 15s budget is provable in milliseconds. The abort
      // timer inside fetchWithTimeout is the ONLY timer in play; with a bare
      // fetch there is no timer at all, so advancing the clock past the budget
      // leaves the promise un-settled and `settled` stays null.
      vi.useFakeTimers();
      let settled: string | null = null;
      void c.call().then(
        () => {
          settled = 'resolved';
        },
        () => {
          settled = 'rejected';
        },
      );
      // Let the dynamic import + the synchronous part of the call run.
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(DATA_FETCH_TIMEOUT_MS + 1_000);
      vi.useRealTimers();
      await Promise.resolve();
      expect(
        settled,
        `${c.module} never settled ${DATA_FETCH_TIMEOUT_MS + 1000}ms in — the stalled socket is still held open`,
      ).toBe('rejected');
    }, 15_000);
  }

  it('passes an AbortSignal down to fetch on every one of them', async () => {
    for (const c of CASES) {
      const spy = vi.fn(async () => new Response('{}', { status: 200 }));
      globalThis.fetch = spy as unknown as typeof fetch;
      await c.call().catch(() => undefined);
      const init = spy.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(init?.signal, `${c.module} called fetch with no AbortSignal`).toBeInstanceOf(
        AbortSignal,
      );
    }
  });
});

describe('RES-01 ratchet — no bare fetch left in the named client modules', () => {
  // The sweep named these five as the concentration; they are also the modules
  // with no server-side/ISR callers, so every call site is a browser request a
  // human is waiting on.
  const MODULES = [
    'lib/temple-api.ts',
    'lib/pandit-api.ts',
    'lib/wellness-api.ts',
    'lib/subscription-api.ts',
    'lib/store-admin-api.ts',
  ];

  /**
   * The ONE allowed exception, spelled out rather than waved through: an ISR
   * server fetch (`next: { revalidate }`). Those run inside the Next server
   * render, not the browser, and Next's fetch caching is documented to opt out
   * when the caller supplies its own `signal` — swapping them would trade a
   * server-side stall for a cache miss on every public priest page. Two calls
   * in pandit-api.ts (getPublicPriests, getPublicPriest) are in this class and
   * are tracked separately; nothing else may join them.
   */
  function bareFetchCalls(src: string): string[] {
    const hits: string[] = [];
    const re = /(?<![\w.])fetch\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      // Args up to the next `);` at the same nesting is overkill here — the
      // `next:` marker always sits in the init object on the same call.
      const window = src.slice(m.index, m.index + 240);
      if (/next\s*:\s*\{/.test(window)) continue;
      hits.push(window.split('\n')[0]!.trim());
    }
    return hits;
  }

  for (const rel of MODULES) {
    it(`${rel} has no browser-facing bare fetch(`, () => {
      const src = readFileSync(join(import.meta.dirname, '..', rel), 'utf8');
      const bare = bareFetchCalls(src);
      expect(bare, `${rel} still has ${bare.length} bare fetch( call(s)`).toEqual([]);
    });
  }
});
