import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { createEmailSession } from '../lib/email-session.js';
import { sendWhatsappTemplate, whatsapp } from '../lib/whatsapp.js';

// P1-1 (2026-07-17): mirror the 10/min per-IP sensitive-auth rate limit that
// /auth/send-otp + /auth/login already carry. Without this the WhatsApp-OTP
// request/verify pair relied on the global 100/min cap — enough to spam SMS
// templates (real money) or enumerate phones at scale.
const sensitiveAuthRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
};

/**
 * WhatsApp-based phone OTP. Cheaper + higher delivery than SMS in India.
 *
 *   POST /request  { phone }
 *     → sends 6-digit code via approved "otp_login" template
 *   POST /verify   { phone, code }
 *     → validates code, creates/looks-up user, returns session token
 *       in the same `email-<userId>-<32hex>` format magic-link uses, so
 *       the auth middleware accepts both without changes.
 *
 * The OTP store is in-memory: phone → { code, expiresAt, attempts }.
 * Codes expire in 5 min. 3 attempts max. Deleted on success or expiry.
 *
 * If WHATSAPP_* env vars are unset, /request returns {devCode} so dev
 * can still complete the flow without a verified business account.
 */

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpRecord>();
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
  return digits.startsWith('+') ? input : `+${digits}`;
}

export async function whatsappOtpRoutes(server: FastifyInstance) {
  server.post('/request', sensitiveAuthRateLimit, async (request, reply) => {
    const body = (request.body ?? {}) as { phone?: string };
    if (!body.phone || body.phone.replace(/\D/g, '').length < 10) {
      return reply.code(400).send({ error: 'Valid phone required' });
    }
    const phone = normalisePhone(body.phone);
    const code = generateOtp();
    otpStore.set(phone, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    const result = await sendWhatsappTemplate({
      to: phone,
      template: process.env.WHATSAPP_OTP_TEMPLATE ?? 'otp_login',
      languageCode: 'en',
      variables: [code],
    });

    // P0-4 (2026-07-17): the devCode return was gated on `whatsapp.enabled`
    // only — an env-presence check, NOT an environment check. If WHATSAPP_*
    // env vars were unset in prod, /request returned the live 6-digit code in
    // the response body, giving instant account takeover of ANY phone number
    // (the /verify handler creates the user on the fly). Gate the devCode
    // branch on a real environment check so it can never fire in prod. The
    // request still succeeds (the code was stored in otpStore) — it just
    // isn't echoed back, so dev/QA without WhatsApp stays functional via the
    // in-memory store but prod never leaks the secret.
    const isDev = process.env.NODE_ENV !== 'production';
    if (!whatsapp.enabled || (isDev && result.skipped)) {
      if (isDev) {
        // Dev mode — surface the code so the developer can complete the flow.
        return reply.send({ ok: true, sent: false, devCode: code, ttlSec: OTP_TTL_MS / 1000 });
      }
      // Prod with WhatsApp disabled: accept the request (code stored) but
      // do NOT echo the secret. The user cannot self-verify without WhatsApp,
      // which is the intended fail-closed behaviour.
      return reply.send({ ok: true, sent: false, ttlSec: OTP_TTL_MS / 1000 });
    }
    if (!result.ok) {
      return reply.code(502).send({ error: 'Failed to send WhatsApp OTP', detail: result.error });
    }
    return reply.send({ ok: true, sent: true, ttlSec: OTP_TTL_MS / 1000 });
  });

  server.post('/verify', sensitiveAuthRateLimit, async (request, reply) => {
    const body = (request.body ?? {}) as { phone?: string; code?: string };
    if (!body.phone || !body.code) {
      return reply.code(400).send({ error: 'phone and code required' });
    }
    const phone = normalisePhone(body.phone);
    const record = otpStore.get(phone);
    if (!record) {
      return reply.code(400).send({ error: 'No OTP requested for this number' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(phone);
      return reply.code(400).send({ error: 'OTP expired — request a new one' });
    }
    record.attempts += 1;
    if (record.attempts > MAX_ATTEMPTS) {
      otpStore.delete(phone);
      return reply.code(429).send({ error: 'Too many incorrect attempts — request a new code' });
    }
    if (record.code !== body.code.trim()) {
      return reply
        .code(400)
        .send({ error: 'Incorrect code', attemptsLeft: MAX_ATTEMPTS - record.attempts });
    }

    otpStore.delete(phone);

    // Find or create user keyed on phone.
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          fullName: 'Devotee',
          preferredLanguage: 'hi',
        },
      });
    }

    // Persist the email_sessions row (A-005) so the fail-closed auth middleware accepts this token.
    const { token: sessionToken } = await createEmailSession(user.id);
    return reply.send({
      ok: true,
      session: { accessToken: sessionToken, tokenType: 'Bearer' },
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role: 'devotee',
      },
    });
  });
}
