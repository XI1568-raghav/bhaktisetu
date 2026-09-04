import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import {
  accountDeletionService,
  AccountDeletionBlockedError,
  AccountDeletionInputError,
  GRACE_PERIOD_DAYS,
} from '../services/account-deletion.service.js';

/**
 * account.ts — the user's own account, and specifically DELETING it (LC-DEL).
 *
 * Apple Guideline 5.1.1(v) requires an app that offers account creation to offer
 * in-app account deletion; Google Play requires the same plus a publicly
 * reachable web deletion-request URL. Darshya shipped neither, which is the #1
 * blocker on both stores. This is the API half.
 *
 *   GET    /api/v1/account/deletion-eligibility   what would block a deletion
 *   GET    /api/v1/account/deletion-status        where an existing request is
 *   POST   /api/v1/account/deletion-request       start — sends a confirm code
 *   POST   /api/v1/account/deletion-request/cancel  withdraw, during the grace window
 *   POST   /api/v1/account/delete/confirm         finish — code required
 *   DELETE /api/v1/account                        same handler, REST-shaped alias
 *
 * ─── WHY TWO STEPS ──────────────────────────────────────────────────────────
 *
 * Deletion is irreversible, so it takes a fresh proof of identity — the same
 * shape /auth/send-otp + /auth/verify-otp already use, because that is the only
 * identity check this codebase can perform. `User` has NO password column; every
 * credential is a 6-digit OTP or a magic link. A single unauthenticated-by-
 * anything-but-a-bearer-token DELETE would mean a stolen phone or a forwarded
 * magic-link email is enough to destroy someone's booking history and wallet.
 *
 * ─── WHY BOTH `DELETE /account` AND `POST /account/delete/confirm` ──────────
 *
 * They are the SAME handler. `DELETE` is the REST-shaped verb a store reviewer
 * and a mobile client look for; `POST` exists because a body on DELETE is
 * awkward for several HTTP clients (and some proxies drop it), and the
 * confirmation code has to travel in a body rather than a query string — a
 * deletion credential in a URL ends up in access logs and CDN caches.
 */

// ─── Validation Schemas ──────────────────────────────────────────────────────

const deletionRequestSchema = z.object({
  /** Free-text "why are you leaving". Optional, and never required to proceed. */
  reason: z.string().max(1000).optional(),
  /**
   * Set once the client has SHOWN the user their forfeitable wallet balance.
   * The service refuses without it whenever the balance is non-zero, so nobody
   * loses money they were never told about.
   */
  acknowledgeForfeit: z.boolean().optional(),
});

const deletionConfirmSchema = z.object({
  requestId: z.string().uuid('requestId must be the uuid returned by /deletion-request'),
  code: z
    .string()
    .trim()
    .length(6, 'Confirmation code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Confirmation code must contain only digits'),
  /**
   * Skip the grace period and anonymise now. Default false — see the service
   * header for why the 30-day window is the safer default on an OTP-only
   * product. Still gated on the same fresh code either way.
   */
  immediate: z.boolean().optional().default(false),
});

export const __testing = {
  deletionRequestSchema,
  deletionConfirmSchema,
};

// ─── Error mapping ───────────────────────────────────────────────────────────

/**
 * Turn a service refusal into an answer the client can ACT on.
 *
 * A 500 on a legally mandated flow is an App Store rejection and a support
 * ticket at the same time, so every refusal this service raises carries a stable
 * machine `code` and a sentence that names the next step.
 */
function sendServiceError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof AccountDeletionBlockedError) {
    return reply.code(err.statusCode).send({
      error: 'AccountDeletionBlocked',
      code: err.code,
      message: err.message,
      ...err.details,
    });
  }
  if (err instanceof AccountDeletionInputError) {
    return reply.code(err.statusCode).send({
      error: 'AccountDeletionRejected',
      code: err.code,
      message: err.message,
    });
  }
  return reply.code(500).send({
    error: 'AccountDeletionFailed',
    code: 'INTERNAL',
    message: 'Could not process the deletion request. Please try again or contact support@darshya.online.',
  });
}

// Deletion is destructive and code-guessable, so it gets the same tighter per-IP
// cap /auth/send-otp and /auth/login carry rather than the global 100/min.
const sensitiveRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
};

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function accountRoutes(server: FastifyInstance) {
  // Every route in this plugin is about the CALLER'S OWN account. There is no
  // `:userId` parameter anywhere on purpose — an id in the path is an
  // authorisation bug waiting to be written.
  server.addHook('preHandler', authenticateUser);

  /**
   * GET /deletion-eligibility
   *
   * What would stop a deletion right now, and what the user must be warned
   * about first. Lets the client show the real reason on the settings screen
   * instead of discovering it only when the destructive button 409s.
   */
  server.get('/deletion-eligibility', async (request, reply) => {
    const userId = request.currentUser!.id;
    try {
      const result = await accountDeletionService.checkEligibility(userId);
      return reply.send({
        data: {
          deletable: result.deletable,
          blockers: result.blockers,
          warnings: result.warnings,
          gracePeriodDays: GRACE_PERIOD_DAYS,
        },
      });
    } catch (err) {
      request.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'account.deletion-eligibility failed',
      );
      return sendServiceError(reply, err);
    }
  });

  /**
   * GET /deletion-status
   *
   * Where an existing request stands, and how many days are left to cancel.
   * `status: 'none'` when the user has never asked — not a 404, because "you
   * have no pending deletion" is a successful answer to the question.
   */
  server.get('/deletion-status', async (request, reply) => {
    const userId = request.currentUser!.id;
    try {
      const status = await accountDeletionService.getStatus(userId);
      return reply.send({ data: status });
    } catch (err) {
      request.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'account.deletion-status failed',
      );
      return sendServiceError(reply, err);
    }
  });

  /**
   * POST /deletion-request
   *
   * Step 1. Runs every guard, then sends a single-use 6-digit code to the phone
   * or mailbox on the account. Nothing is deleted or scheduled here.
   */
  server.post('/deletion-request', sensitiveRateLimit, async (request, reply) => {
    const parsed = deletionRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid body', issues: parsed.error.flatten() });
    }
    const userId = request.currentUser!.id;

    try {
      const result = await accountDeletionService.requestDeletion(userId, parsed.data);
      return reply.code(201).send({ data: result });
    } catch (err) {
      if (
        err instanceof AccountDeletionBlockedError ||
        err instanceof AccountDeletionInputError
      ) {
        return sendServiceError(reply, err);
      }
      request.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'account.deletion-request failed',
      );
      return sendServiceError(reply, err);
    }
  });

  /**
   * POST /deletion-request/cancel
   *
   * Withdraw a request during the grace window. This is the reason the grace
   * window exists at all, so it deliberately needs no code — the caller is
   * already authenticated, and the action is not destructive.
   */
  server.post('/deletion-request/cancel', async (request, reply) => {
    const userId = request.currentUser!.id;
    try {
      const result = await accountDeletionService.cancelDeletion(userId);
      return reply.send({
        data: {
          cancelled: result.cancelled,
          message: result.cancelled
            ? 'Your account deletion has been cancelled. Nothing was removed.'
            : 'There was no pending deletion request to cancel.',
        },
      });
    } catch (err) {
      request.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'account.deletion-cancel failed',
      );
      return sendServiceError(reply, err);
    }
  });

  /**
   * Step 2, shared by `POST /delete/confirm` and `DELETE /`.
   *
   * Verifies the code and then either schedules the purge (default, 30-day
   * grace) or runs it immediately when the caller asks for that explicitly.
   */
  const confirmHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = deletionConfirmSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid body', issues: parsed.error.flatten() });
    }
    const { requestId, code, immediate } = parsed.data;
    const userId = request.currentUser!.id;

    try {
      const result = await accountDeletionService.confirmDeletion(
        userId,
        requestId,
        code,
        { immediate },
      );

      return reply.send({
        data: {
          status: result.status,
          requestId: result.requestId,
          purgeAfter: result.purgeAfter,
          gracePeriodDays: result.gracePeriodDays,
          message:
            result.status === 'purged'
              ? 'Your account has been deleted. Personal data is gone; financial records are retained in anonymised form as Indian tax law requires.'
              : `Your account is scheduled for deletion on ${result.purgeAfter}. Sign in and cancel any time before then to keep it.`,
          // Surfaced, never swallowed: if the Supabase Auth identity could not be
          // removed the credential still exists, and an operator has to know.
          ...(result.purge?.warnings?.length ? { warnings: result.purge.warnings } : {}),
        },
      });
    } catch (err) {
      if (
        err instanceof AccountDeletionBlockedError ||
        err instanceof AccountDeletionInputError
      ) {
        return sendServiceError(reply, err);
      }
      request.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'account.deletion-confirm failed',
      );
      return sendServiceError(reply, err);
    }
  };

  server.post('/delete/confirm', sensitiveRateLimit, confirmHandler);

  // The REST-shaped alias. Same handler, same body, same guards — Apple's
  // reviewers and the mobile client look for this verb.
  server.delete('/', sensitiveRateLimit, confirmHandler);
}
