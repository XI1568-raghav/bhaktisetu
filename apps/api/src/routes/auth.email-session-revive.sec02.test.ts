/**
 * SEC-02 STEP 2 — the revive path magic-link users did not have.
 *
 * WHERE STEP 2 WAS STUCK, MEASURED AT HEAD.
 * `apps/web/lib/session-revive.ts` rehydrates a token-free browser by POSTing
 * `/auth/refresh`, and that route is a SUPABASE exchange: it calls
 * `supabase.auth.refreshSession({ refresh_token })` and 400s when the request
 * carries no refresh credential at all. A magic-link sign-in has no Supabase
 * session behind it — `routes/magic-link.ts` mints an `email_sessions` row via
 * createEmailSession, answers `refreshToken: ''`, and deliberately issues NO
 * `darshya_refresh` cookie because an empty one could only ever fail. So for
 * every provider onboarded through the partnerships pipeline, revive had
 * nothing to send and could only 400.
 *
 * That is harmless only while `app/auth/verify` still writes `poojly_session`
 * to localStorage. The moment SEC-02 step 4 deletes that write — which is the
 * whole point of SEC-02 — those users would revive-fail, have their profile
 * marker cleared, and be SIGNED OUT ON RELOAD. Step 2 is the gate on step 4,
 * and it is a question about the API, not the browser: what can a client whose
 * only credential is the 7-day httpOnly `darshya_session` cookie call?
 *
 * The answer this endpoint gives: POST /auth/session/revive. It is the
 * email-session counterpart of /auth/refresh — same job, different credential.
 *
 * WHY IT DOES NOT MINT ANYTHING. /auth/refresh rotates because a Supabase
 * access token lives one hour. An email session lives seven days and its token
 * IS the cookie; minting a second row on every page load would grow the table
 * without expiring the first. So this endpoint validates and reports. The
 * cookie's lifetime is not extended either — a sliding 7-day session is a
 * policy change, not a revive.
 *
 * THE RESIDUAL EXPOSURE, STATED PLAINLY. This hands a JS caller the value of an
 * httpOnly cookie, so script on the page can read a credential it otherwise
 * could not. That is the same trade /auth/refresh already makes for Supabase
 * users, and against the status quo it is strictly better: today that identical
 * token sits in localStorage, where XSS reads it without needing a network call
 * and where it survives the tab. Memory-only is a smaller target than
 * persistent storage. The end state that removes the trade entirely — the
 * browser sending only the cookie and never a Bearer — needs
 * middlewares/auth.ts to treat an EMPTY `Authorization: Bearer ` as absent
 * (extractBearerToken returns '' today, which suppresses the cookie fallback)
 * before ~161 hand-built Bearer call sites in apps/web can drop the header.
 * That is outside this lane and recorded as such.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { adminGetUser } = vi.hoisted(() => ({ adminGetUser: vi.fn() }));

vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: () => ({ auth: { signOut: vi.fn(), getUser: vi.fn() } }),
  supabaseAdmin: { auth: { getUser: adminGetUser } },
  isDemoMode: false,
}));

import Fastify from 'fastify';
import { authRoutes } from './auth.js';

const USER_ID = '33333333-3333-3333-3333-333333333333';
const EMAIL_TOKEN = `email-${USER_ID}-abcdef0123456789abcdef0123456789`;
const SEVEN_DAYS_OUT = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const DB_USER = {
  id: USER_ID,
  email: 'mandir.trust@example.com',
  phone: '+919812345678',
  fullName: 'Mandir Trust',
  subscriptionTier: 'free',
  blocked: false,
  blockedReason: null,
};

async function makeApp() {
  const app = Fastify({ logger: false });
  await app.register((await import('@fastify/cookie')).default);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  return app;
}

/** POST the revive endpoint carrying only the httpOnly session cookie. */
async function revive(cookie?: string) {
  const app = await makeApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/session/revive',
    // light-my-request's `cookies` option needs the `cookie` package, which is
    // not a dependency here; the raw header is what the server parses anyway.
    ...(cookie ? { headers: { cookie: `darshya_session=${cookie}` } } : {}),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ADMIN_EMAILS;
  // middlewares/auth.ts validates an `email-*` token against email_sessions.
  prismaMock.$queryRawUnsafe.mockResolvedValue([
    { revoked_at: null, expires_at: SEVEN_DAYS_OUT },
  ]);
  prismaMock.user.findUnique.mockResolvedValue(DB_USER as never);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([
    { userId: USER_ID, role: 'TEMPLE_MANAGER', isPrimary: true, createdAt: new Date(0) },
  ] as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SEC-02 step 2 — POST /auth/session/revive', () => {
  it('revives a browser whose ONLY credential is the httpOnly cookie', async () => {
    const res = await revive(EMAIL_TOKEN);
    expect(
      res.statusCode,
      'a magic-link provider with no localStorage token cannot come back — ' +
        'deleting the localStorage write would sign every one of them out',
    ).toBe(200);
    expect(res.json().session.accessToken).toBe(EMAIL_TOKEN);
  });

  it('reports the SEVEN-DAY life of the email_sessions row, in seconds', async () => {
    const res = await revive(EMAIL_TOKEN);
    const { expiresAt, expiresIn } = res.json().session;
    // Seconds, matching /auth/refresh and magic-link /verify. auth-context
    // treats a value under 1e12 as seconds, so milliseconds here would read as
    // a 1970 timestamp and the client would refresh on every single mount.
    expect(expiresAt).toBeLessThan(1e12);
    expect(expiresAt).toBeCloseTo(Math.floor(SEVEN_DAYS_OUT.getTime() / 1000), -1);
    expect(expiresIn).toBeGreaterThan(6 * 24 * 60 * 60);
  });

  it('answers no refresh token — there is no Supabase session to exchange', async () => {
    const res = await revive(EMAIL_TOKEN);
    expect(res.json().session.refreshToken).toBe('');
  });

  it('names the role, so a revived temple manager is not demoted to devotee', async () => {
    const res = await revive(EMAIL_TOKEN);
    expect(res.json().user.role).toBe('temple_manager');
  });

  it('mints nothing — no new email_sessions row on every page load', async () => {
    await revive(EMAIL_TOKEN);
    const inserts = prismaMock.$executeRawUnsafe.mock.calls.filter((c: unknown[]) =>
      /INSERT\s+INTO\s+email_sessions/i.test(String(c[0])),
    );
    expect(inserts.length).toBe(0);
  });

  it('does not extend the cookie — a sliding 7-day session is a policy change', async () => {
    const res = await revive(EMAIL_TOKEN);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('401s a browser with no cookie at all — the anonymous case', async () => {
    const res = await revive();
    expect(res.statusCode).toBe(401);
  });

  it('401s when the email_sessions row is revoked — sign-out must stick', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { revoked_at: new Date(), expires_at: SEVEN_DAYS_OUT },
    ]);
    const res = await revive(EMAIL_TOKEN);
    expect(
      res.statusCode,
      'a revoked session revived itself — /auth/logout would no longer end anything',
    ).toBe(401);
  });

  it('403s a blocked account rather than handing back a live credential', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...DB_USER,
      blocked: true,
      blockedReason: 'fraud review',
    } as never);
    const res = await revive(EMAIL_TOKEN);
    expect(res.statusCode).toBe(403);
  });

  it('refuses a Supabase session even when it authenticates — no token-read oracle', async () => {
    // A Supabase access token in darshya_session must not be echoed back by a
    // route whose contract is "the cookie IS the email-session token".
    // authenticateUser happily validates it and attaches a user, so declining
    // is the HANDLER's job: without that check this becomes a general
    // "read me the httpOnly cookie" endpoint for every signed-in user, and the
    // rotating credential /auth/refresh is careful about would leak here.
    adminGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: DB_USER.email } },
      error: null,
    });
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/session/revive',
      headers: { cookie: 'darshya_session=a-real-supabase-jwt' },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
    expect(String(res.body)).not.toContain('a-real-supabase-jwt');
  });

  it('will not echo a cookie that belongs to a different account', async () => {
    // authenticateUser prefers the Authorization header. A request that
    // authenticates as one user over Bearer while carrying somebody else's
    // session cookie must not be answered with the cookie's token.
    const OTHER = '44444444-4444-4444-4444-444444444444';
    adminGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: DB_USER.email } },
      error: null,
    });
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/session/revive',
      headers: {
        authorization: 'Bearer a-real-supabase-jwt',
        cookie: `darshya_session=email-${OTHER}-abcdef0123456789abcdef0123456789`,
      },
    });
    await app.close();

    expect(res.statusCode).toBe(401);
    expect(String(res.body)).not.toContain(OTHER);
  });
});
