import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { supaSignOut, getUser } = vi.hoisted(() => ({
  supaSignOut: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: { signOut: supaSignOut, getUser } }),
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import { authRoutes } from './auth.js';

/**
 * AUTH-09 / AUTH-11 — what "sign out" actually does.
 *
 * AUTH-09: POST /logout was unconditionally GLOBAL. `supabase.auth.signOut()`
 * defaults to global scope, and the handler then ran
 * `UPDATE refresh_token_jtis SET used_at = now() WHERE user_id = …` — every
 * token of every device. Signing out on a shared laptop killed the session on
 * the user's phone, and nothing in the product said so. Global stays the
 * DEFAULT (it is the safer posture and changing it silently would be a security
 * regression), but it is now a decision the caller can make and the UI can
 * describe.
 *
 * AUTH-11: the global path did NOT reach magic-link sessions. `email_sessions`
 * rows were only ever revoked for the token actually presented, so a provider
 * signed in by link on another device kept working after a password reset that
 * announced "You've been signed out everywhere". Global now means global.
 */

const USER_ID = '22222222-2222-2222-2222-222222222222';
const EMAIL_TOKEN = `email-${USER_ID}-abcdef0123456789abcdef0123456789`;

function makeApp() {
  const app = Fastify();
  void app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

/** Every raw SQL statement the handler issued, whitespace-collapsed. */
function sqlIssued(): string[] {
  return prismaMock.$executeRawUnsafe.mock.calls.map((c: unknown[]) =>
    String(c[0]).replace(/\s+/g, ' ').trim(),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  supaSignOut.mockResolvedValue({ error: null });
  getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AUTH-09 — logout scope is a decision, and global is the default', () => {
  it('revokes every device by default, exactly as before', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { accessToken: 'a-supabase-jwt' },
    });

    expect(res.statusCode).toBe(200);
    expect(supaSignOut).toHaveBeenCalled();
    expect(
      sqlIssued().some((q) => /UPDATE refresh_token_jtis SET used_at .* user_id/i.test(q)),
    ).toBe(true);
    await app.close();
  });

  it('leaves the user’s other devices signed in when scope=local', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { accessToken: 'a-supabase-jwt', scope: 'local' },
    });

    expect(res.statusCode).toBe(200);
    // The family-wide revoke is what reaches the phone; it must not run.
    expect(
      sqlIssued().some((q) => /UPDATE refresh_token_jtis SET used_at .* user_id/i.test(q)),
    ).toBe(false);
    await app.close();
  });

  it('tells the caller which scope was applied, so the UI can say it', async () => {
    const app = makeApp();
    const globalRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { accessToken: 'a-supabase-jwt' },
    });
    expect(globalRes.json().scope).toBe('global');

    const localRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { accessToken: 'a-supabase-jwt', scope: 'local' },
    });
    expect(localRes.json().scope).toBe('local');
    await app.close();
  });

  it('rejects a scope value it does not understand rather than guessing', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { accessToken: 'a-supabase-jwt', scope: 'everything' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('AUTH-11 — a global logout reaches magic-link sessions too', () => {
  it('revokes every email_sessions row for the user, not just the presented one', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { accessToken: EMAIL_TOKEN },
    });

    expect(res.statusCode).toBe(200);
    const familyRevoke = sqlIssued().find(
      (q) => /UPDATE email_sessions SET revoked_at/i.test(q) && /user_id/i.test(q),
    );
    expect(familyRevoke).toBeTruthy();
    await app.close();
  });

  it('revokes only the presented magic-link session when scope=local', async () => {
    const app = makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { accessToken: EMAIL_TOKEN, scope: 'local' },
    });

    const statements = sqlIssued().filter((q) => /UPDATE email_sessions/i.test(q));
    expect(statements.length).toBeGreaterThan(0);
    expect(statements.every((q) => !/user_id/i.test(q))).toBe(true);
    await app.close();
  });

  it('revokes the user’s magic-link sessions on the JWT path as well', async () => {
    // A user with both a password session and a magic-link session on another
    // device: "signed out everywhere" has to mean both.
    const app = makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { accessToken: 'a-supabase-jwt' },
    });

    expect(
      sqlIssued().some(
        (q) => /UPDATE email_sessions SET revoked_at/i.test(q) && /user_id/i.test(q),
      ),
    ).toBe(true);
    await app.close();
  });
});
