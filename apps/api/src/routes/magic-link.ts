import { FastifyInstance } from 'fastify';
import { createHmac, randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { sendEmail, magicLinkEmail } from '../lib/email.js';

/**
 * Email magic-link authentication.
 *
 * Flow:
 *   1. POST /auth/magic-link/request  { email }
 *      - We mint a signed token (HMAC-SHA256 over email + nonce + expiry)
 *      - Email it to the user as a link to /auth/verify?token=...
 *   2. POST /auth/magic-link/verify  { token }
 *      - Verify signature + expiry + that the email exists in our DB (or
 *        create the user on first sign-in)
 *      - Issue a session token (we keep the existing demo-* token format
 *        so the rest of the API doesn't change)
 *
 * No new tables needed — we use the existing User table. The token itself
 * is stateless, signed with JWT_SECRET. Single-use enforcement is by
 * timestamp (15 min TTL) — for one-shot use we'd need a `usedTokens` table;
 * for an MVP a 15-min window is acceptable.
 */

const JWT_SECRET = process.env.JWT_SECRET ?? 'darshya-dev-secret';
const TOKEN_TTL_MIN = 15;

function signToken(email: string): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_MIN * 60;
  const nonce = randomBytes(8).toString('hex');
  const payload = `${email}.${nonce}.${expiresAt}`;
  const sig = createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return { token: `${Buffer.from(payload).toString('base64url')}.${sig}`, expiresAt };
}

function verifyToken(token: string): { email: string; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString();
  } catch {
    return null;
  }
  const expectedSig = createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  if (sig !== expectedSig) return null;
  const [email, , expiresAtStr] = payload.split('.');
  if (!email || !expiresAtStr) return null;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (Math.floor(Date.now() / 1000) > expiresAt) return null;
  return { email, expiresAt };
}

export async function magicLinkRoutes(server: FastifyInstance) {
  // ── POST /request ──────────────────────────────────────────────────────
  server.post('/request', async (request, reply) => {
    const body = (request.body ?? {}) as { email?: string };
    const email = (body.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.code(400).send({ error: 'Valid email required' });
    }

    const { token } = signToken(email);
    const linkUrl = `${process.env.WEB_BASE_URL ?? 'https://darshya.online'}/auth/verify?token=${encodeURIComponent(token)}`;

    const tpl = magicLinkEmail(linkUrl);
    const result = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    if (result.skipped) {
      // No Resend key configured — return the link in the response so
      // local / demo environments can still test the flow.
      return reply.send({ ok: true, devLink: linkUrl, info: 'Email skipped (RESEND_API_KEY not set). Use devLink to sign in.' });
    }
    if (!result.ok) {
      server.log.error({ err: result.error, email }, 'magic-link email failed');
      return reply.code(500).send({ error: 'Could not send email' });
    }
    return reply.send({ ok: true });
  });

  // ── POST /verify ───────────────────────────────────────────────────────
  server.post('/verify', async (request, reply) => {
    const body = (request.body ?? {}) as { token?: string };
    const token = (body.token ?? '').trim();
    const verified = verifyToken(token);
    if (!verified) {
      return reply.code(400).send({ error: 'Invalid or expired sign-in link' });
    }

    // Find or create the user
    let user = await prisma.user.findFirst({ where: { email: verified.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: verified.email,
          phone: `email-${Date.now()}`, // temporary placeholder; will be filled when phone is verified
          fullName: verified.email.split('@')[0] ?? 'Devotee',
          preferredLanguage: 'en',
          isNri: false,
          subscriptionTier: 'free',
        },
      });
      await prisma.userRoleAssignment.create({
        data: { userId: user.id, role: 'DEVOTEE', isPrimary: true },
      });
    }

    // Issue a session token. We piggy-back on the existing 'demo-' prefix
    // pattern so the auth middleware accepts it; the difference is the
    // token here references a real DB user row instead of a synthetic id.
    const sessionToken = `email-${user.id}-${randomBytes(16).toString('hex')}`;

    return reply.send({
      ok: true,
      session: {
        accessToken: sessionToken,
        refreshToken: '',
        expiresIn: 60 * 60 * 24 * 7,
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
      },
    });
  });
}
