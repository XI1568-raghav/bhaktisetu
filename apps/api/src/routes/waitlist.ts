import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';

// Devotee waitlist with viral referral. Each row gets a 6-char uppercase
// referralCode generated server-side. New signups can pass referredByCode
// to bump the referrer's referralCount (and thus their leaderboard rank).
//
// All Resend calls are env-gated — when RESEND_API_KEY is unset the row is
// still created so demo / local environments can exercise the flow.

const REFERRAL_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateReferralCode(): string {
  const bytes = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += REFERRAL_CODE_ALPHABET[bytes[i]! % REFERRAL_CODE_ALPHABET.length];
  }
  return out;
}

const waitlistJoinSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().min(6).max(20).optional(),
  city: z.string().min(1).max(80).optional(),
  preferredDeity: z.string().min(1).max(60).optional(),
  panchangOptIn: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
  referredByCode: z.string().min(4).max(12).optional(),
  source: z.string().max(80).optional(),
});

function siteOrigin(): string {
  return process.env.WEB_PUBLIC_URL || 'https://darshya.online';
}

function confirmEmailHtml(params: { fullName?: string | null; confirmUrl: string; referralUrl: string }) {
  const greet = params.fullName ? `Namaste ${params.fullName},` : 'Namaste,';
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fbf7f1;color:#3d2e1f;margin:0;padding:0;">
<div style="max-width:560px;margin:24px auto;padding:32px 28px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:22px;font-weight:600;color:#ea580c;margin-bottom:24px;">Darshya</div>
<h1 style="font-size:18px;font-weight:600;margin:0 0 16px;">${greet} you're on the early-access list</h1>
<p style="font-size:14px;line-height:1.6;">Thank you for joining. Confirm your email to lock your spot among the first 1000 devotees on Darshya.</p>
<p><a href="${params.confirmUrl}" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;margin:12px 0;">Confirm my spot</a></p>
<p style="font-size:14px;line-height:1.6;">Want to climb the rank? Share your referral link — every confirmed friend moves you up.</p>
<p style="font-size:13px;word-break:break-all;color:#666;">${params.referralUrl}</p>
<div style="font-size:11px;color:#999;margin-top:28px;padding-top:16px;border-top:1px solid #eee;text-align:center;">Darshya · India's Devotional Super App<br>https://darshya.online</div>
</div></body></html>`;
}

export async function waitlistRoutes(server: FastifyInstance) {
  // POST / — join the waitlist
  server.post('/', async (request, reply) => {
    const parsed = waitlistJoinSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const body = parsed.data;

    // Existing email — return their existing row (idempotent join).
    const existing = await prisma.waitlist.findUnique({ where: { email: body.email } });
    if (existing) {
      const total = await prisma.waitlist.count({
        where: { status: { not: 'UNSUBSCRIBED' } },
      });
      const rank =
        (await prisma.waitlist.count({
          where: {
            status: { not: 'UNSUBSCRIBED' },
            createdAt: { lt: existing.createdAt },
          },
        })) + 1;
      return reply.status(200).send({
        id: existing.id,
        referralCode: existing.referralCode,
        rank,
        total,
        existing: true,
      });
    }

    // Generate a unique 6-char code; collisions on a 36^6 alphabet are
    // astronomically rare but the @unique index on referralCode is the
    // hard guarantee — retry up to 5 times.
    let referralCode = generateReferralCode();
    for (let i = 0; i < 5; i++) {
      const clash = await prisma.waitlist.findUnique({ where: { referralCode } });
      if (!clash) break;
      referralCode = generateReferralCode();
    }

    const referrer = body.referredByCode
      ? await prisma.waitlist.findUnique({ where: { referralCode: body.referredByCode.toUpperCase() } })
      : null;

    const row = await prisma.waitlist.create({
      data: {
        email: body.email,
        fullName: body.fullName ?? null,
        phone: body.phone ?? null,
        city: body.city ?? null,
        preferredDeity: body.preferredDeity ?? null,
        panchangOptIn: body.panchangOptIn ?? true,
        whatsappOptIn: body.whatsappOptIn ?? false,
        referralCode,
        referredByCode: referrer ? referrer.referralCode : null,
        source: body.source ?? null,
      },
    });

    if (referrer) {
      await prisma.waitlist.update({
        where: { id: referrer.id },
        data: { referralCount: { increment: 1 } },
      });
    }

    // Confirmation email — best-effort, env-gated.
    if (process.env.RESEND_API_KEY) {
      const origin = siteOrigin();
      const confirmUrl = `${origin}/waitlist/confirm?code=${row.id}`;
      const referralUrl = `${origin}/waitlist?ref=${row.referralCode}`;
      try {
        await sendEmail({
          to: row.email,
          subject: "You're on the Darshya early-access list",
          html: confirmEmailHtml({ fullName: row.fullName, confirmUrl, referralUrl }),
        });
      } catch (err) {
        server.log.warn({ err }, 'waitlist: confirmation email failed');
      }
    }

    const total = await prisma.waitlist.count({
      where: { status: { not: 'UNSUBSCRIBED' } },
    });
    const rank =
      (await prisma.waitlist.count({
        where: {
          status: { not: 'UNSUBSCRIBED' },
          createdAt: { lt: row.createdAt },
        },
      })) + 1;

    return reply.status(201).send({
      id: row.id,
      referralCode: row.referralCode,
      rank,
      total,
    });
  });

  // GET /confirm?code=<id> — flip status=CONFIRMED, redirect to welcome.
  server.get('/confirm', async (request, reply) => {
    const { code } = request.query as { code?: string };
    if (!code) {
      return reply.status(400).send({ error: 'missing_code' });
    }

    let row = await prisma.waitlist.findUnique({ where: { id: code } }).catch(() => null);
    if (!row) {
      return reply.status(404).send({ error: 'not_found' });
    }
    if (row.status === 'PENDING') {
      row = await prisma.waitlist.update({
        where: { id: row.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
    }

    const origin = siteOrigin();
    return reply.redirect(`${origin}/waitlist/welcome?code=${row.referralCode}`, 302);
  });

  // GET /stats?code=<referralCode>
  server.get('/stats', async (request, reply) => {
    const { code } = request.query as { code?: string };
    if (!code) {
      return reply.status(400).send({ error: 'missing_code' });
    }
    const row = await prisma.waitlist.findUnique({
      where: { referralCode: code.toUpperCase() },
    });
    if (!row) {
      return reply.status(404).send({ error: 'not_found' });
    }

    const total = await prisma.waitlist.count({
      where: { status: { not: 'UNSUBSCRIBED' } },
    });
    const rank =
      (await prisma.waitlist.count({
        where: {
          status: { not: 'UNSUBSCRIBED' },
          createdAt: { lt: row.createdAt },
        },
      })) + 1;

    return reply.send({
      rank,
      total,
      referralCount: row.referralCount,
    });
  });
}
