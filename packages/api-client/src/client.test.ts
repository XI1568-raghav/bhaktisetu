import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, initApiClient, ApiClientError } from './client.js';

// ─── Test fixtures ───────────────────────────────────────────────────────────
//
// Unit-test the core `request<T>()` branches by mocking `globalThis.fetch`.
// The api client keeps module-level config, so each test re-initialises it.

const BASE_URL = 'https://api.test.local';

type FetchImpl = typeof fetch;

function mockFetch(impl: FetchImpl): ReturnType<typeof vi.fn> {
  const fn = vi.fn(impl as unknown as (...a: unknown[]) => unknown) as unknown as FetchImpl;
  (globalThis as { fetch: FetchImpl }).fetch = fn;
  return fn as unknown as ReturnType<typeof vi.fn>;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Grab the RequestInit passed to the Nth fetch call (1-indexed). */
function nthCallInit(n: number): RequestInit {
  const calls = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls as [
    string,
    RequestInit,
  ][];
  const call = calls[n - 1];
  if (!call) throw new Error(`fetch was not called ${n} time(s)`);
  return call[1];
}

beforeEach(() => {
  initApiClient({ baseUrl: BASE_URL });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ─── 200 success ─────────────────────────────────────────────────────────────

describe('request — 200 success', () => {
  it('returns the parsed JSON body as T', async () => {
    const fetchFn = mockFetch(async () => jsonResponse(200, { success: true, data: { id: 7 } }));

    const result = await api.get<{ id: number }>('/api/v1/x');

    expect(result).toEqual({ success: true, data: { id: 7 } });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
  });

  it('injects the Authorization header when getAuthToken returns a token', async () => {
    initApiClient({ baseUrl: BASE_URL, getAuthToken: () => 'tok-123' });
    mockFetch(async () => jsonResponse(200, { ok: true }));

    await api.get('/api/v1/x');

    const headers = nthCallInit(1).headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tok-123');
    // NOT application/json: a GET carries no body. See the bodyless-request
    // describe block below.
    expect(headers.get('Content-Type')).toBeNull();
  });

  it('skips the Authorization header when noAuth is true', async () => {
    initApiClient({ baseUrl: BASE_URL, getAuthToken: () => 'tok-123' });
    mockFetch(async () => jsonResponse(200, { ok: true }));

    await api.post('/api/v1/x', { a: 1 }, { noAuth: true });

    const headers = nthCallInit(1).headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });
});

// ─── 204 no content ──────────────────────────────────────────────────────────

describe('request — 204 empty', () => {
  it('returns undefined without parsing the body', async () => {
    const fetchFn = mockFetch(async () => new Response(null, { status: 204 }));

    const result = await api.delete<{ id: number }>('/api/v1/x');

    expect(result).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

// ─── 401 onUnauthorised latch (P1-46) ────────────────────────────────────────

describe('request — 401 onUnauthorised latch', () => {
  it('calls onUnauthorised once for a 401', async () => {
    const onUnauthorised = vi.fn();
    initApiClient({ baseUrl: BASE_URL, onUnauthorised });
    mockFetch(async () => jsonResponse(401, { error: { code: 'UNAUTHORISED', message: 'no', statusCode: 401 } }));

    await expect(api.get('/api/v1/x')).rejects.toMatchObject({ code: 'UNAUTHORISED', statusCode: 401 });
    expect(onUnauthorised).toHaveBeenCalledTimes(1);
  });

  it('fires onUnauthorised only once for concurrent 401s while handler is in-flight', async () => {
    let release!: () => void;
    const handlerGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onUnauthorised = vi.fn(async () => {
      await handlerGate; // stay "in progress" until released
    });
    initApiClient({ baseUrl: BASE_URL, onUnauthorised });

    const errBody = { error: { code: 'UNAUTHORISED', message: 'no', statusCode: 401 } };
    mockFetch(async () => jsonResponse(401, errBody));

    // Fire three concurrent 401 requests; all resolve after release().
    const p1 = api.get('/api/v1/x').catch((e) => e);
    const p2 = api.get('/api/v1/x').catch((e) => e);
    const p3 = api.get('/api/v1/x').catch((e) => e);

    // Let the microtask queue drain so the first request reaches the handler.
    await Promise.resolve();
    await Promise.resolve();

    release();

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect((r1 as ApiClientError).code).toBe('UNAUTHORISED');
    expect((r2 as ApiClientError).code).toBe('UNAUTHORISED');
    expect((r3 as ApiClientError).code).toBe('UNAUTHORISED');

    // The latch must collapse the burst into a single handler invocation.
    expect(onUnauthorised).toHaveBeenCalledTimes(1);
  });

  it('does not call onUnauthorised when not configured', async () => {
    initApiClient({ baseUrl: BASE_URL }); // no onUnauthorised
    mockFetch(async () => jsonResponse(401, { error: { code: 'UNAUTHORISED', message: 'no', statusCode: 401 } }));

    await expect(api.get('/api/v1/x')).rejects.toMatchObject({ code: 'UNAUTHORISED' });
  });
});

// ─── timeout → REQUEST_TIMEOUT ───────────────────────────────────────────────

describe('request — timeout', () => {
  it('throws ApiClientError with code REQUEST_TIMEOUT on abort', async () => {
    vi.useFakeTimers();
    mockFetch(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    });

    // Attach a handler synchronously so the eventual rejection is never
    // "unhandled" while we advance fake timers.
    const p = api.get('/api/v1/x', { timeout: 50 });
    const assertion = p.then(
      () => { throw new Error('expected request to time out'); },
      (err) => err,
    );

    await vi.advanceTimersByTimeAsync(60);

    const err = await assertion;
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.code).toBe('REQUEST_TIMEOUT');
    expect(err.statusCode).toBe(408);
  });
});

// ─── network error → NETWORK_ERROR ───────────────────────────────────────────

describe('request — network error', () => {
  it('throws ApiClientError with code NETWORK_ERROR on fetch rejection', async () => {
    mockFetch(async () => {
      throw new TypeError('failed to fetch');
    });

    await expect(api.get('/api/v1/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR', statusCode: 0 });
  });
});

// ─── schema parse (P0-3a) ────────────────────────────────────────────────────

describe('request — schema validation', () => {
  it('returns schema.parse() result on a successful parse', async () => {
    mockFetch(async () => jsonResponse(200, { id: 42, name: 'Shiva' }));

    const schema = {
      parse: vi.fn((input: unknown) => {
        const o = input as { id: number; name: string };
        return { id: o.id, name: o.name.toUpperCase() };
      }),
    };

    const result = await api.get<{ id: number; name: string }>('/api/v1/x', { schema });
    expect(schema.parse).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 42, name: 'SHIVA' });
  });

  it('throws ApiClientError code RESPONSE_SHAPE_MISMATCH when parse fails', async () => {
    mockFetch(async () => jsonResponse(200, { unexpected: true }));

    const schema = {
      parse: vi.fn(() => {
        throw new Error('missing id');
      }),
    };

    await expect(api.get<{ id: number }>('/api/v1/x', { schema })).rejects.toMatchObject({
      code: 'RESPONSE_SHAPE_MISMATCH',
      statusCode: 422,
    });
  });

  it('keeps the unchecked as-T fallback when no schema is passed', async () => {
    mockFetch(async () => jsonResponse(200, { whatever: true }));

    const result = await api.get<{ whatever: boolean }>('/api/v1/x');
    expect(result).toEqual({ whatever: true });
  });

  it('unwraps the ApiResponse envelope and validates inner data when parseEnvelope is set', async () => {
    mockFetch(async () =>
      jsonResponse(200, {
        success: true,
        data: { id: 9, name: 'Vishnu' },
        timestamp: '2026-07-10T00:00:00Z',
      }),
    );

    const schema = {
      parse: vi.fn((input: unknown) => {
        const o = input as { id: number; name: string };
        return { id: o.id, name: o.name };
      }),
    };

    const result = await api.get<{ id: number; name: string }>('/api/v1/x', {
      schema,
      parseEnvelope: true,
    });

    // schema.parse receives the unwrapped `data`, not the envelope.
    expect(schema.parse).toHaveBeenCalledWith({ id: 9, name: 'Vishnu' });
    expect(result).toEqual({ id: 9, name: 'Vishnu' });
  });
});

// ─── flat error bodies (the shape the API actually sends) ────────────────────

describe('request — error bodies', () => {
  it('surfaces the sentence from a flat { error } body instead of the status', async () => {
    mockFetch(async () =>
      jsonResponse(409, { error: 'Insufficient stock for tulsi-mala (have 2, want 5)' }),
    );

    const err = (await api
      .post('/api/v1/store/orders', { items: [] })
      .catch((e) => e)) as ApiClientError;

    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.message).toBe('Insufficient stock for tulsi-mala (have 2, want 5)');
    expect(err.statusCode).toBe(409);
  });

  it('surfaces `message` when `error` is a machine label', async () => {
    mockFetch(async () =>
      jsonResponse(409, {
        code: 'store_profile_required',
        error: 'Store setup incomplete',
        message: 'Finish setting up your store — add your store name — before listing products.',
      }),
    );

    const err = (await api
      .post('/api/v1/store-admin/products', { name: 'x' })
      .catch((e) => e)) as ApiClientError;

    expect(err.message).toBe(
      'Finish setting up your store — add your store name — before listing products.',
    );
    expect(err.code).toBe('store_profile_required');
  });

  it('carries zod `details` through onto ApiClientError', async () => {
    const flatten = { formErrors: [], fieldErrors: { amountInr: ['Required'] } };
    mockFetch(async () => jsonResponse(400, { error: 'Invalid input', details: flatten }));

    const err = (await api
      .post('/api/v1/donations/create-order', {})
      .catch((e) => e)) as ApiClientError;

    expect(err.details).toEqual(flatten);
  });

  it('keeps the status code when the error body is not JSON at all', async () => {
    // A CDN 502 answers with HTML. `response.json()` used to throw here, and
    // the throw took the status with it — the caller saw NETWORK_ERROR / 0.
    mockFetch(async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }));

    const err = (await api.get('/api/v1/temples').catch((e) => e)) as ApiClientError;

    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.statusCode).toBe(502);
    expect(err.message).toBe('Request failed with status 502');
  });

  it('fires onUnauthorised for a 401 that carries no body', async () => {
    const onUnauthorised = vi.fn();
    initApiClient({ baseUrl: BASE_URL, onUnauthorised });
    mockFetch(async () => new Response(null, { status: 401 }));

    const err = (await api.get('/api/v1/users/me').catch((e) => e)) as ApiClientError;

    expect(err.statusCode).toBe(401);
    expect(onUnauthorised).toHaveBeenCalledTimes(1);
  });
});

// ─── bodyless requests must not declare a JSON body ─────────────────────────

describe('request — Content-Type only when there is a body', () => {
  it('omits Content-Type on a bodyless PATCH (FST_ERR_CTP_EMPTY_JSON_BODY)', async () => {
    mockFetch(async () => jsonResponse(200, { ok: true }));

    await api.patch('/api/v1/priest/pujas/abc/toggle-active');

    const init = nthCallInit(1);
    expect((init.headers as Headers).get('Content-Type')).toBeNull();
    expect(init.body).toBeUndefined();
  });

  it('omits Content-Type on a bodyless POST', async () => {
    mockFetch(async () => jsonResponse(200, { ok: true }));

    await api.post('/api/v1/consultation/abc/complete');

    expect((nthCallInit(1).headers as Headers).get('Content-Type')).toBeNull();
  });

  it('sets Content-Type when a body IS sent', async () => {
    mockFetch(async () => jsonResponse(200, { ok: true }));

    await api.post('/api/v1/store/orders', { items: [] });

    const init = nthCallInit(1);
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
    expect(init.body).toBe('{"items":[]}');
  });

  it('treats an explicit {} as a body — many callers pass it to dodge the old bug', async () => {
    mockFetch(async () => jsonResponse(200, { ok: true }));

    await api.post('/api/v1/subscriptions/cancel', {});

    const init = nthCallInit(1);
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
    expect(init.body).toBe('{}');
  });

  it('sends falsy-but-real bodies (0 / false / "") rather than dropping them', async () => {
    mockFetch(async () => jsonResponse(200, { ok: true }));

    await api.post('/api/v1/x', 0);
    await api.post('/api/v1/x', false);
    await api.post('/api/v1/x', '');

    expect(nthCallInit(1).body).toBe('0');
    expect(nthCallInit(2).body).toBe('false');
    expect(nthCallInit(3).body).toBe('""');
  });

  it('strips a Content-Type a caller supplied for a bodyless request', async () => {
    mockFetch(async () => jsonResponse(200, { ok: true }));

    await api.patch('/api/v1/priest/bookings/abc/accept', undefined, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect((nthCallInit(1).headers as Headers).get('Content-Type')).toBeNull();
  });
});
