import { randomBytes } from 'node:crypto';
import { prisma } from './prisma.js';

// Magic-link / WhatsApp-OTP session tokens live 7 days.
const EMAIL_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Mint an `email-<userId>-<hex>` session token AND persist it to email_sessions.
 *
 * SECURITY (A-005, 2026-08-10): the auth middleware validates this token type by
 * looking up its row in email_sessions and fails CLOSED when the row is absent.
 * Before this helper existed, no code path ever wrote that row, so the middleware
 * always hit its "row missing → allow" fallback — letting anyone forge
 * `email-<anyKnownUserId>-<any 32 hex>` and authenticate as that user (incl. admin).
 * Persisting the row here is what makes the forged-token rejection real, and it is
 * also what gives magic-link tokens a real expiry and makes /auth/logout's
 * revoke UPDATE match a row.
 *
 * The token string is the row's primary key (id).
 */
export async function createEmailSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = `email-${userId}-${randomBytes(16).toString('hex')}`;
  const expiresAt = new Date(Date.now() + EMAIL_SESSION_TTL_MS);
  await prisma.$executeRawUnsafe(
    `INSERT INTO email_sessions (id, user_id, expires_at, revoked_at)
     VALUES ($1, $2::uuid, $3::timestamptz, NULL)
     ON CONFLICT (id) DO NOTHING`,
    token,
    userId,
    expiresAt.toISOString(),
  );
  return { token, expiresAt };
}
