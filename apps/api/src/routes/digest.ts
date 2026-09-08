/**
 * digest.ts — weekly-digest consent endpoints (devotee revamp 2026-08-05).
 *
 * The weekly digest email links to /account/digest/unsubscribe?u=<token>,
 * but until now there was NO backend route to record the opt-out — the
 * WeeklyDigestOptOut table exists (raw SQL) and the cron reads it, yet nothing
 * wrote to it, so unsubscribing silently did nothing. This closes the loop.
 *
 * The page calls POST /api/v1/digest/unsubscribe with {userId}. It's
 * intentionally unauthenticated (the link lands from an email, possibly signed
 * out) and that must stay true: demanding a login before someone can leave a
 * mailing list is the worse bug. Authentication is required only on the way
 * back IN — see /resubscribe below.
 *
 * NOTIF-02 (2026-08-12): the INSERT bound $1 as text into a uuid column, so
 * every call raised Postgres 42804 and the catch answered 200 "unsubscribed" —
 * the user was told they were off the list while the row was never written.
 * Fixed with an explicit $1::uuid cast; the handler now reports failure instead
 * of faking success. A consent withdrawal must be recorded or refused, never
 * silently dropped.
 *
 * CT-CONSENT-1 (2026-09-09): two consent defects, neither of them a missing
 * auth gate.
 *
 *   1. The identifier was an unsigned raw primary key. `/auth/me` returns that
 *      uuid verbatim and every digest email printed it into the link, so the
 *      whole proof of intent was a value the subject hands out routinely.
 *      Anyone holding a user id could opt that user out of a channel they had
 *      consented to, silently and with no trace tying it to them. The id is now
 *      a capability: `<uuid>.<hmac>`, keyed on JWT_SECRET (the same secret
 *      routes/magic-link.ts signs its emailed tokens with, and one env.ts
 *      already refuses to boot production without). Knowing the id is no longer
 *      enough — you must hold a token this server minted for that id.
 *
 *   2. Opting out was a one-way door. The table was only ever INSERTed or
 *      SELECTed and no route deleted from it, so a devotee who unsubscribed —
 *      or was unsubscribed by someone else via defect 1 — had no in-product way
 *      back. /resubscribe reverses it, and unlike /unsubscribe it DOES require
 *      authentication: re-subscribing is positive consent to be mailed, so it
 *      must be the account owner asking, and the "they might be signed out"
 *      argument does not apply to someone re-enabling their own settings.
 *
 * There is deliberately no rate limit configured here — lib/rate-limit-policy.ts
 * owns that table and this prefix has no entry, so the route runs on the global
 * default. See the report for the recommended entry.
 */

import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

/**
 * Links already sitting in inboxes carry a bare uuid, and refusing them would
 * mean a devotee holding a real digest email cannot unsubscribe at all — the
 * exact user-hostile outcome this endpoint exists to avoid. They are honoured
 * until this instant and refused after it.
 *
 * The digest is weekly, so this is six editions past the fix: by then every
 * unsigned link in an inbox is at least six digests stale and has been
 * superseded by a signed one. The window is deliberately a constant and not an
 * env var — a date that can be quietly extended in a dashboard is a hole that
 * never closes. If a deploy slips past it the route simply fails closed, which
 * is the safe direction.
 */
export const LEGACY_UNSIGNED_LINKS_ACCEPTED_UNTIL = Date.UTC(2026, 9, 21); // 2026-10-21T00:00:00Z

/**
 * Domain separation. Other features HMAC a bare user id too (routes/referrals.ts
 * derives a referral code that way), and a bare `hmac(secret, userId)` would let
 * a digest signature stand in for any of them that ever shares this key.
 */
const TOKEN_PURPOSE = 'digest-unsubscribe:v1';

const uuidSchema = z.string().uuid();

/**
 * Read at call time, not module load, so a test can set the secret after import
 * and so a signature can never be minted against a stale value. env.ts makes
 * JWT_SECRET boot-fatal in production; the dev fallback matches magic-link.ts.
 */
function signingSecret(): string {
  return process.env.JWT_SECRET ?? 'darshya-dev-secret';
}

function signatureFor(userId: string): string {
  return crypto
    .createHmac('sha256', signingSecret())
    .update(`${TOKEN_PURPOSE}:${userId}`)
    .digest('base64url');
}

/**
 * The value that goes in the email link's `?u=`. The web page forwards that
 * param verbatim as the POST body's `userId`, so signing here needs no change
 * on the web side — the page has always been a pass-through and stays one.
 *
 * uuid and base64url both exclude '.', so the token splits unambiguously on it.
 * (routes/magic-link.ts had to split from the right precisely because its
 * payload contained an email address, which does not.)
 */
export function signDigestUnsubscribeToken(userId: string): string {
  return `${userId}.${signatureFor(userId)}`;
}

export type UnsubscribeIdentifier =
  | { ok: true; userId: string; signed: boolean }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'legacy_expired' };

/**
 * Resolve the `?u=` value to the user whose consent it actually proves.
 *
 * The three failure reasons are kept distinct because they mean different
 * things to the caller: 'malformed' is "that is not an identifier" (400),
 * while the other two are "it is an identifier, and it is not yours" (403).
 */
export function resolveUnsubscribeIdentifier(
  raw: string,
  now: number = Date.now(),
): UnsubscribeIdentifier {
  const parts = raw.split('.');

  if (parts.length === 1) {
    if (!uuidSchema.safeParse(raw).success) return { ok: false, reason: 'malformed' };
    if (now >= LEGACY_UNSIGNED_LINKS_ACCEPTED_UNTIL) return { ok: false, reason: 'legacy_expired' };
    return { ok: true, userId: raw, signed: false };
  }

  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [userId, signature] = parts as [string, string];
  if (!uuidSchema.safeParse(userId).success) return { ok: false, reason: 'malformed' };
  if (!signature) return { ok: false, reason: 'malformed' };

  // Constant-time compare, length-guarded because timingSafeEqual throws on
  // mismatched buffers — same shape as magic-link.ts:205.
  const provided = Buffer.from(signature);
  const expected = Buffer.from(signatureFor(userId));
  if (provided.length !== expected.length) return { ok: false, reason: 'bad_signature' };
  if (!crypto.timingSafeEqual(provided, expected)) return { ok: false, reason: 'bad_signature' };

  return { ok: true, userId, signed: true };
}

const unsubscribeSchema = z.object({
  // Not `.uuid()` any more: this field now carries the signed token, and the
  // legacy bare uuid, and must reach resolveUnsubscribeIdentifier to be told
  // apart. The bound is a sanity cap, not validation.
  userId: z.string().min(1).max(300),
  reason: z.string().max(200).optional(),
});

/** The id of the caller the auth middleware verified. Never a body field. */
function callerId(request: unknown): string {
  return (request as { currentUser: { id: string } }).currentUser.id;
}

export async function digestRoutes(server: FastifyInstance) {
  server.post('/unsubscribe', async (request, reply) => {
    const parsed = unsubscribeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request.' });
    }

    const identifier = resolveUnsubscribeIdentifier(parsed.data.userId);
    if (!identifier.ok) {
      if (identifier.reason === 'malformed') {
        return reply.code(400).send({ error: 'Invalid request.' });
      }
      // Log the reason but never the token: a rejected signature is an attempt,
      // and recording the attempted value just stores someone's forgery attempt
      // next to the real ones.
      request.log.warn(
        { reason: identifier.reason },
        'digest unsubscribe refused an unverifiable identifier',
      );
      return reply.code(403).send({ error: 'This unsubscribe link is not valid.' });
    }

    const { userId } = identifier;
    if (!identifier.signed) {
      // Watch this drain. Once it stops appearing, every link in circulation is
      // signed and LEGACY_UNSIGNED_LINKS_ACCEPTED_UNTIL is doing nothing.
      request.log.info({ userId }, 'digest unsubscribe accepted a legacy unsigned link');
    }

    const { reason } = parsed.data;
    try {
      // Idempotent: a second click just updates the timestamp/reason.
      //
      // $1::uuid is load-bearing. WeeklyDigestOptOut.user_id is a uuid column
      // and Prisma binds a JS string as text, so an uncast $1 raised Postgres
      // 42804 (datatype_mismatch) on every single call — the opt-out was never
      // recorded. Do not remove the cast.
      const rowsAffected = await prisma.$executeRawUnsafe(
        `INSERT INTO "WeeklyDigestOptOut" (user_id, opted_out_at, reason)
         VALUES ($1::uuid, NOW(), $2)
         ON CONFLICT (user_id) DO UPDATE SET opted_out_at = NOW(), reason = EXCLUDED.reason`,
        userId,
        reason ?? null,
      );
      if (rowsAffected < 1) {
        // ON CONFLICT DO UPDATE always reports 1; 0 means nothing was written.
        request.log.error({ userId, rowsAffected }, 'digest unsubscribe wrote no row');
        return reply.code(500).send({ error: 'Failed to record the unsubscribe.' });
      }
      return reply.code(200).send({ ok: true, unsubscribed: true });
    } catch (err) {
      // Never answer 200 here. Consent withdrawal that silently fails is worse
      // than a visible error: the user believes they opted out and keeps
      // receiving the digest, with no signal to anyone that it broke.
      request.log.error({ err, userId }, 'digest unsubscribe failed');
      return reply.code(500).send({ error: 'Failed to record the unsubscribe.' });
    }
  });

  /**
   * Re-enable the digest. Authenticated, and scoped to the caller: the subject
   * is `currentUser.id` and any userId in the body is ignored. A signed link
   * would be the wrong mechanism here — a token that turns mail back ON is a
   * token worth stealing, and the person asking is by definition able to sign
   * in, because they are in their own settings.
   */
  server.post('/resubscribe', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = callerId(request);
    try {
      // Same $1::uuid lesson as the INSERT above (NOTIF-02): uncast, this
      // DELETE would raise 42804 and match nothing.
      await prisma.$executeRawUnsafe(
        `DELETE FROM "WeeklyDigestOptOut" WHERE user_id = $1::uuid`,
        userId,
      );
      // Zero rows is success, not failure: it means the caller was not opted
      // out, and the state they asked for is the state they are in.
      return reply.code(200).send({ ok: true, subscribed: true });
    } catch (err) {
      request.log.error({ err, userId }, 'digest resubscribe failed');
      return reply.code(500).send({ error: 'Failed to record the resubscribe.' });
    }
  });

  /** Current state, so a settings toggle can render the right position. */
  server.get('/preference', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = callerId(request);
    try {
      const rows = await prisma.$queryRawUnsafe<{ user_id: string }[]>(
        `SELECT user_id FROM "WeeklyDigestOptOut" WHERE user_id = $1::uuid`,
        userId,
      );
      return reply.code(200).send({ optedOut: rows.length > 0 });
    } catch (err) {
      // Do not default to `optedOut: false` on error. The fan-out's own reader
      // treats a missing table as "nobody opted out", which is safe for sending
      // decisions but here would render a toggle claiming the user is
      // subscribed when we do not know that.
      request.log.error({ err, userId }, 'digest preference read failed');
      return reply.code(500).send({ error: 'Failed to read the digest preference.' });
    }
  });
}
