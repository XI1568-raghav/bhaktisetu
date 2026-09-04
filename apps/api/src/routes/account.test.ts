/**
 * account.test.ts — the deletion surface at the HTTP boundary (LC-DEL).
 *
 * The service suite proves the purge is correct. This one proves the endpoints
 * a store reviewer and the mobile client actually call are wired, validated and
 * — the part that gets a feature rejected rather than merely criticised —
 * REFUSE WITH AN ACTIONABLE ANSWER instead of a 500.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authMock, serviceMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  serviceMock: {
    checkEligibility: vi.fn(),
    getStatus: vi.fn(),
    requestDeletion: vi.fn(),
    confirmDeletion: vi.fn(),
    cancelDeletion: vi.fn(),
  },
}));

vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: authMock,
  requireRole: () => vi.fn(),
  requireAnyRole: () => vi.fn(),
}));

vi.mock('../services/account-deletion.service.js', async () => {
  // The error classes are REAL — the route's `instanceof` branches are the thing
  // under test, and a stubbed class would make them vacuously pass.
  const actual = await vi.importActual<
    typeof import('../services/account-deletion.service.js')
  >('../services/account-deletion.service.js');
  return {
    ...actual,
    accountDeletionService: serviceMock,
  };
});

import Fastify from 'fastify';
import { accountRoutes, __testing } from './account.js';
import {
  AccountDeletionBlockedError,
  AccountDeletionInputError,
} from '../services/account-deletion.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  const app = Fastify();
  void app.register(accountRoutes, { prefix: '/api/v1/account' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated. Individual tests override to test the gate.
  authMock.mockImplementation(async (request: { currentUser?: unknown }) => {
    request.currentUser = { id: USER_ID, email: 'devotee@example.com', roles: ['DEVOTEE'] };
  });
});

// ─── Zod boundary ────────────────────────────────────────────────────────────

describe('deletionConfirmSchema', () => {
  const { deletionConfirmSchema } = __testing;

  it('accepts a uuid request id and a 6-digit code', () => {
    const r = deletionConfirmSchema.safeParse({ requestId: REQUEST_ID, code: '123456' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.immediate).toBe(false);
  });

  it('defaults immediate to false — the grace period is the default, not a flag', () => {
    const r = deletionConfirmSchema.safeParse({ requestId: REQUEST_ID, code: '000000' });
    expect(r.success && r.data.immediate).toBe(false);
  });

  it('rejects a non-uuid request id', () => {
    expect(
      deletionConfirmSchema.safeParse({ requestId: 'not-a-uuid', code: '123456' }).success,
    ).toBe(false);
  });

  it.each([['12345'], ['1234567'], ['12345a'], [''], ['      ']])(
    'rejects the malformed code %j',
    (code) => {
      expect(deletionConfirmSchema.safeParse({ requestId: REQUEST_ID, code }).success).toBe(false);
    },
  );

  it('trims surrounding whitespace before checking the length', () => {
    const r = deletionConfirmSchema.safeParse({ requestId: REQUEST_ID, code: ' 123456 ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.code).toBe('123456');
  });
});

describe('deletionRequestSchema', () => {
  const { deletionRequestSchema } = __testing;

  it('accepts an empty body — a reason is never required to leave', () => {
    expect(deletionRequestSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a reason and the wallet-forfeit acknowledgement', () => {
    expect(
      deletionRequestSchema.safeParse({ reason: 'Too many emails', acknowledgeForfeit: true })
        .success,
    ).toBe(true);
  });

  it('caps the free-text reason at 1000 chars', () => {
    expect(deletionRequestSchema.safeParse({ reason: 'a'.repeat(1001) }).success).toBe(false);
  });
});

// ─── Auth gate ───────────────────────────────────────────────────────────────

describe('every route is behind authenticateUser', () => {
  const ROUTES: Array<[string, string]> = [
    ['GET', '/api/v1/account/deletion-status'],
    ['GET', '/api/v1/account/deletion-eligibility'],
    ['POST', '/api/v1/account/deletion-request'],
    ['POST', '/api/v1/account/deletion-request/cancel'],
    ['POST', '/api/v1/account/delete/confirm'],
    ['DELETE', '/api/v1/account/'],
  ];

  it.each(ROUTES)('%s %s runs the auth preHandler', async (method, url) => {
    const app = makeApp();
    await app.inject({ method: method as 'GET', url, payload: {} });
    expect(authMock).toHaveBeenCalled();
    await app.close();
  });

  it('a rejected auth stops the handler before any service call', async () => {
    authMock.mockImplementation(async (_request: unknown, reply: { code: (n: number) => { send: (b: unknown) => void } }) => {
      reply.code(401).send({ error: 'Unauthorized' });
    });
    const app = makeApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/account/',
      payload: { requestId: REQUEST_ID, code: '123456' },
    });

    expect(res.statusCode).toBe(401);
    expect(serviceMock.confirmDeletion).not.toHaveBeenCalled();
    await app.close();
  });
});

// ─── GET /deletion-status ────────────────────────────────────────────────────

describe('GET /deletion-status', () => {
  it('returns "none" with a 200 rather than a 404 when nothing is pending', async () => {
    serviceMock.getStatus.mockResolvedValue({
      status: 'none',
      requestId: null,
      requestedAt: null,
      confirmedAt: null,
      purgeAfter: null,
      purgedAt: null,
      daysRemaining: null,
      gracePeriodDays: 30,
    });
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/account/deletion-status' });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('none');
    expect(serviceMock.getStatus).toHaveBeenCalledWith(USER_ID);
    await app.close();
  });

  it('surfaces the days remaining to cancel a scheduled deletion', async () => {
    serviceMock.getStatus.mockResolvedValue({
      status: 'scheduled',
      requestId: REQUEST_ID,
      requestedAt: '2026-09-01T00:00:00.000Z',
      confirmedAt: '2026-09-01T00:05:00.000Z',
      purgeAfter: '2026-10-01T00:05:00.000Z',
      purgedAt: null,
      daysRemaining: 29,
      gracePeriodDays: 30,
    });
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/account/deletion-status' });

    expect(res.json().data).toMatchObject({ status: 'scheduled', daysRemaining: 29 });
    await app.close();
  });
});

// ─── GET /deletion-eligibility ───────────────────────────────────────────────

describe('GET /deletion-eligibility', () => {
  it('reports blockers and warnings so the UI can explain BEFORE the destructive tap', async () => {
    serviceMock.checkEligibility.mockResolvedValue({
      deletable: false,
      blockers: [{ code: 'UNSETTLED_EARNINGS', message: 'You have ₹500.00 of unpaid earnings.' }],
      warnings: [{ code: 'WALLET_BALANCE_FORFEIT', message: 'Your wallet holds ₹99.00.' }],
    });
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/account/deletion-eligibility' });

    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.deletable).toBe(false);
    expect(body.blockers[0].code).toBe('UNSETTLED_EARNINGS');
    expect(body.warnings[0].code).toBe('WALLET_BALANCE_FORFEIT');
    expect(body.gracePeriodDays).toBeGreaterThan(0);
    await app.close();
  });
});

// ─── POST /deletion-request ──────────────────────────────────────────────────

describe('POST /deletion-request', () => {
  it('201s with the request id and grace period, and never leaks a stored code', async () => {
    serviceMock.requestDeletion.mockResolvedValue({
      requestId: REQUEST_ID,
      channel: 'email',
      expiresInSec: 900,
      gracePeriodDays: 30,
      warnings: [],
    });
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request',
      payload: { reason: 'Not using it any more' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ requestId: REQUEST_ID, channel: 'email' });
    expect(serviceMock.requestDeletion).toHaveBeenCalledWith(USER_ID, {
      reason: 'Not using it any more',
    });
    await app.close();
  });

  it('409s with an ACTIONABLE code when a guard refuses — never a 500', async () => {
    serviceMock.requestDeletion.mockRejectedValue(
      new AccountDeletionBlockedError(
        'LAST_ADMIN',
        'You are the only active administrator. Grant the admin role to another account first, then delete this one.',
      ),
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request',
      payload: {},
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({
      error: 'AccountDeletionBlocked',
      code: 'LAST_ADMIN',
    });
    expect(res.json().message).toMatch(/Grant the admin role/);
    await app.close();
  });

  it('409s with the pending-payout refusal and the count the user needs', async () => {
    serviceMock.requestDeletion.mockRejectedValue(
      new AccountDeletionBlockedError(
        'PAYOUT_IN_FLIGHT',
        'You have 2 payout request(s) still being processed. Wait for them to settle (or ask support to cancel them), then delete your account.',
        { count: 2 },
      ),
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request',
      payload: {},
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'PAYOUT_IN_FLIGHT', count: 2 });
    await app.close();
  });

  it('400s on a body that fails validation', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request',
      payload: { reason: 'a'.repeat(1001) },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid body');
    expect(serviceMock.requestDeletion).not.toHaveBeenCalled();
    await app.close();
  });

  it('500s with a generic message on an unexpected failure, leaking no internals', async () => {
    serviceMock.requestDeletion.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.4:5432'));
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request',
      payload: {},
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('ECONNREFUSED');
    expect(res.json().code).toBe('INTERNAL');
    await app.close();
  });
});

// ─── Confirm: both verbs ─────────────────────────────────────────────────────

describe('POST /delete/confirm and DELETE / are the same handler', () => {
  const scheduled = {
    status: 'scheduled' as const,
    requestId: REQUEST_ID,
    purgeAfter: '2026-10-01T00:00:00.000Z',
    gracePeriodDays: 30,
  };

  it.each([
    ['POST', '/api/v1/account/delete/confirm'],
    ['DELETE', '/api/v1/account/'],
  ])('%s %s schedules the deletion', async (method, url) => {
    serviceMock.confirmDeletion.mockResolvedValue(scheduled);
    const app = makeApp();
    const res = await app.inject({
      method: method as 'POST',
      url,
      payload: { requestId: REQUEST_ID, code: '123456' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('scheduled');
    expect(serviceMock.confirmDeletion).toHaveBeenCalledWith(USER_ID, REQUEST_ID, '123456', {
      immediate: false,
    });
    await app.close();
  });

  it('tells the user the exact date and that they can still cancel', async () => {
    serviceMock.confirmDeletion.mockResolvedValue(scheduled);
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/delete/confirm',
      payload: { requestId: REQUEST_ID, code: '123456' },
    });

    expect(res.json().data.message).toContain('2026-10-01T00:00:00.000Z');
    expect(res.json().data.message).toMatch(/cancel any time before then/);
    await app.close();
  });

  it('passes immediate:true straight through', async () => {
    serviceMock.confirmDeletion.mockResolvedValue({
      status: 'purged',
      requestId: REQUEST_ID,
      purgeAfter: null,
      gracePeriodDays: 30,
      purge: { userId: USER_ID, purged: true, alreadyPurged: false, warnings: [], supabase: { deleted: true, skipped: false } },
    });
    const app = makeApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/account/',
      payload: { requestId: REQUEST_ID, code: '123456', immediate: true },
    });

    expect(serviceMock.confirmDeletion).toHaveBeenCalledWith(USER_ID, REQUEST_ID, '123456', {
      immediate: true,
    });
    expect(res.json().data.status).toBe('purged');
    // The message must not promise the money was destroyed — it was retained.
    expect(res.json().data.message).toMatch(/financial records are retained/);
    await app.close();
  });

  it('surfaces purge warnings rather than swallowing them', async () => {
    serviceMock.confirmDeletion.mockResolvedValue({
      status: 'purged',
      requestId: REQUEST_ID,
      purgeAfter: null,
      gracePeriodDays: 30,
      purge: {
        userId: USER_ID,
        purged: true,
        alreadyPurged: false,
        warnings: ['supabase_auth: service unavailable'],
        supabase: { deleted: false, skipped: false, reason: 'service unavailable' },
      },
    });
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/delete/confirm',
      payload: { requestId: REQUEST_ID, code: '123456', immediate: true },
    });

    expect(res.json().data.warnings).toEqual(['supabase_auth: service unavailable']);
    await app.close();
  });

  it('400s on a wrong code, with a code the client can branch on', async () => {
    serviceMock.confirmDeletion.mockRejectedValue(
      new AccountDeletionInputError('CODE_INCORRECT', 'Incorrect confirmation code.'),
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/delete/confirm',
      payload: { requestId: REQUEST_ID, code: '999999' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: 'AccountDeletionRejected',
      code: 'CODE_INCORRECT',
    });
    await app.close();
  });

  it('429s after too many wrong codes', async () => {
    serviceMock.confirmDeletion.mockRejectedValue(
      new AccountDeletionInputError('TOO_MANY_ATTEMPTS', 'Too many incorrect codes.', 429),
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/delete/confirm',
      payload: { requestId: REQUEST_ID, code: '999999' },
    });

    expect(res.statusCode).toBe(429);
    await app.close();
  });

  it('410s when the account is already deleted — the idempotent re-delete', async () => {
    serviceMock.confirmDeletion.mockRejectedValue(
      new AccountDeletionInputError('ALREADY_DELETED', 'This account has already been deleted.', 410),
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/account/',
      payload: { requestId: REQUEST_ID, code: '123456' },
    });

    expect(res.statusCode).toBe(410);
    expect(res.json().code).toBe('ALREADY_DELETED');
    await app.close();
  });

  it('400s and never reaches the service when the code is malformed', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/delete/confirm',
      payload: { requestId: REQUEST_ID, code: 'abcdef' },
    });

    expect(res.statusCode).toBe(400);
    expect(serviceMock.confirmDeletion).not.toHaveBeenCalled();
    await app.close();
  });

  it('400s when the confirmation code is missing entirely — no one-tap wipe', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/account/',
      payload: { requestId: REQUEST_ID },
    });

    expect(res.statusCode).toBe(400);
    expect(serviceMock.confirmDeletion).not.toHaveBeenCalled();
    await app.close();
  });

  it('400s on an empty DELETE body — the destructive verb alone is never enough', async () => {
    const app = makeApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/account/' });

    expect(res.statusCode).toBe(400);
    expect(serviceMock.confirmDeletion).not.toHaveBeenCalled();
    await app.close();
  });
});

// ─── Cancel ──────────────────────────────────────────────────────────────────

describe('POST /deletion-request/cancel', () => {
  it('cancels and says so plainly', async () => {
    serviceMock.cancelDeletion.mockResolvedValue({ cancelled: true });
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request/cancel',
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.cancelled).toBe(true);
    expect(res.json().data.message).toMatch(/Nothing was removed/);
    await app.close();
  });

  it('200s with cancelled:false when there was nothing pending', async () => {
    serviceMock.cancelDeletion.mockResolvedValue({ cancelled: false });
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request/cancel',
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.cancelled).toBe(false);
    await app.close();
  });

  it('needs no confirmation code — restoring an account is not destructive', async () => {
    serviceMock.cancelDeletion.mockResolvedValue({ cancelled: true });
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request/cancel',
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(serviceMock.cancelDeletion).toHaveBeenCalledWith(USER_ID);
    await app.close();
  });

  it('410s once the purge has already run', async () => {
    serviceMock.cancelDeletion.mockRejectedValue(
      new AccountDeletionInputError(
        'ALREADY_DELETED',
        'This account has already been deleted and cannot be restored.',
        410,
      ),
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/account/deletion-request/cancel',
      payload: {},
    });

    expect(res.statusCode).toBe(410);
    await app.close();
  });
});
