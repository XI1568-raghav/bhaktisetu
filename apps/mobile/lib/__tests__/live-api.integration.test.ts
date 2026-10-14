/**
 * Node-level integration of the real mobile auth modules against a LIVE local
 * API (never production). Skipped unless MOBILE_LIVE_API is set:
 *   MOBILE_LIVE_API=http://localhost:4000 EXPO_PUBLIC_API_URL=http://localhost:4000 pnpm --filter @poojly/mobile test live-api
 * Needs the QA stack (docs/runbooks/qa-local-stack.md): Postgres, API, Supabase stand-in.
 * Only the SecureStore-backed auth-context is replaced, by a fake that wires the
 * same hooks as AuthProvider (refreshSessionOnce -> store/sign-out, suspended notice).
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const LIVE = process.env.MOBILE_LIVE_API;
const BASE = (LIVE ?? '').replace(/\/$/, '');

type Sess = { accessToken: string; refreshToken?: string };
const store: { session: Sess | null } = { session: null };

vi.mock('../auth-context', async () => {
  const { refreshSessionOnce } = await import('../session-refresh');
  const { setSuspendedNotice, registerSuspendedHandler } = await import('../suspended');
  const { api } = await import('@poojly/api-client');
  const signOut = async () => {
    store.session = null;
  };
  registerSuspendedHandler((m) => {
    setSuspendedNotice(m);
    void signOut();
  });
  return {
    getStoredAccessToken: async () => store.session?.accessToken,
    onSuspendedMobile: (m: string) => {
      setSuspendedNotice(m);
      void signOut();
    },
    onUnauthorisedMobile: async () => {
      const stored = store.session;
      if (!stored || stored.accessToken.startsWith('demo-')) return signOut();
      const outcome = await refreshSessionOnce(stored.refreshToken, api.post as never);
      if (outcome.kind === 'refreshed') store.session = outcome.session as Sess;
      else if (outcome.kind === 'rejected') {
        if (outcome.suspendedMessage) setSuspendedNotice(outcome.suspendedMessage);
        await signOut();
      }
    },
  };
});

const d = LIVE ? describe : describe.skip;

async function json(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as any };
}

async function signup(tag: string) {
  const email = `mobqa-${tag}-${Date.now()}@example.com`;
  const r = await json('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'Passw0rd!x1',
      fullName: 'Mobile QA',
      phone: `+9198${String(Date.now()).slice(-8)}`,
      role: 'devotee',
    }),
  });
  expect(r.body.session?.accessToken).toBeTruthy();
  return { email, session: r.body.session as Sess & { user?: unknown }, userId: r.body.user?.id as string };
}

d('mobile lib against the live local API', () => {
  let initApiClient: typeof import('@poojly/api-client').initApiClient;
  let api: typeof import('@poojly/api-client').api;
  let suspended: typeof import('../suspended');

  beforeAll(async () => {
    ({ initApiClient, api } = await import('@poojly/api-client'));
    suspended = await import('../suspended');
    const auth = await import('../auth-context');
    initApiClient({
      baseUrl: BASE,
      getAuthToken: auth.getStoredAccessToken,
      onUnauthorised: auth.onUnauthorisedMobile,
      onSuspended: auth.onSuspendedMobile,
    });
  });

  beforeEach(() => {
    store.session = null;
    suspended.setSuspendedNotice(null);
  });

  it('refreshSession rotates a real refresh token; a replay is a rejected verdict', async () => {
    const { refreshSession } = await import('../session-refresh');
    const { session } = await signup('rot');
    const post = api.post as never;
    const a = await refreshSession(session.refreshToken, post);
    expect(a.kind).toBe('refreshed');
    const bad = await refreshSession('not-a-real-refresh-token', post);
    expect(bad.kind).toBe('rejected');
    expect((await refreshSession(undefined, post)).kind).toBe('rejected');
  });

  it('authedFetch: expired/garbage access token -> one refresh -> retried with the new token', async () => {
    const { authedFetch } = await import('../authed-fetch');
    const { session } = await signup('401');
    store.session = { accessToken: 'garbage.token.value', refreshToken: session.refreshToken };
    const res = await authedFetch(`${BASE}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer garbage.token.value' },
    });
    expect(res.status).toBe(200);
    expect(store.session?.accessToken).not.toBe('garbage.token.value');
  });

  it('concurrent 401s share one refresh (no replay revocation)', async () => {
    const { authedFetch } = await import('../authed-fetch');
    const { session } = await signup('conc');
    store.session = { accessToken: 'garbage.a.b', refreshToken: session.refreshToken };
    const h = { headers: { Authorization: 'Bearer garbage.a.b' } };
    const rs = await Promise.all([1, 2, 3].map(() => authedFetch(`${BASE}/api/v1/auth/me`, h)));
    expect(rs.map((r) => r.status)).toEqual([200, 200, 200]);
  });

  it('a rejected refresh token signs the session out and the 401 is returned', async () => {
    const { authedFetch } = await import('../authed-fetch');
    store.session = { accessToken: 'garbage.x.y', refreshToken: 'revoked-refresh' };
    const res = await authedFetch(`${BASE}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer garbage.x.y' },
    });
    expect(res.status).toBe(401);
    expect(store.session).toBeNull();
  });

  it('admin block -> 403 suspended on a live call -> notice set, session cleared; refresh also rejected with notice', async () => {
    const { authedFetch } = await import('../authed-fetch');
    const { refreshSession } = await import('../session-refresh');
    const { session, userId } = await signup('blk');
    store.session = { accessToken: session.accessToken, refreshToken: session.refreshToken };
    const ok = await authedFetch(`${BASE}/api/v1/store/orders`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(ok.status).toBe(200);

    const blk = await json(`/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-admin-token' },
      body: JSON.stringify({ blocked: true, blockedReason: 'chargeback fraud' }),
    });
    expect(blk.status).toBe(200);

    // api-client path (what api.get screens use)
    await expect(api.get('/api/v1/auth/me', { headers: { 'x-t': '1' } })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(suspended.peekSuspendedNotice()).toMatch(/suspended/i);
    expect(suspended.peekSuspendedNotice()).toMatch(/chargeback fraud/);
    expect(store.session).toBeNull();

    // refresh of a blocked user's token = rejected WITH the notice text
    const out = await refreshSession(session.refreshToken, api.post as never);
    expect(out.kind).toBe('rejected');
    expect((out as { suspendedMessage?: string }).suspendedMessage).toMatch(/suspended/i);

    // authedFetch screens (bare fetch): the 403 body alone must surface the notice
    suspended.setSuspendedNotice(null);
    store.session = { accessToken: session.accessToken, refreshToken: session.refreshToken };
    const r = await authedFetch(`${BASE}/api/v1/store/orders`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(r.status).toBe(403);
    expect(suspended.peekSuspendedNotice()).toMatch(/suspended/i);
    expect(store.session).toBeNull();
  });

  it('store order: list exposes paymentStatus (null when unpaid) for the total label; buyer cancel works', async () => {
    const { storeOrderTotalLabel } = await import('../store-order-payment');
    const { session } = await signup('ord');
    const hdr = { Authorization: `Bearer ${session.accessToken}` };
    const made = await json('/store/orders', {
      method: 'POST',
      headers: hdr,
      body: JSON.stringify({
        items: [{ productId: 'f12618f2-59fa-4856-ad49-b051d34731cc', qty: 1, priceAtPurchase: 5 }],
        totalAmountInr: 54,
        shippingAddress: { fullName: 'M QA', line1: '1 Road', city: 'Pune', state: 'MH', pincode: '411001', country: 'India' },
        idempotencyKey: `mobqa-${Date.now()}-key`,
      }),
    });
    expect(made.status, JSON.stringify(made.body)).toBeLessThan(300);

    const list = await json('/store/orders', { headers: hdr });
    expect(list.status).toBe(200);
    const rows = list.body.data as Array<{ id: string; status: string; paymentStatus?: string | null }>;
    expect(rows).toHaveLength(1);
    expect('paymentStatus' in rows[0]!).toBe(true);
    expect(rows[0]!.paymentStatus).toBeNull();
    expect(storeOrderTotalLabel(rows[0]!.status, rows[0]!.paymentStatus ?? null)).toBe('Total (not paid online)');

    const c = await json(`/store/orders/${rows[0]!.id}/cancel`, { method: 'POST', headers: hdr, body: '{}' });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    const after = await json('/store/orders', { headers: hdr });
    expect(after.body.data[0].status).toBe('CANCELLED');
  });
});
