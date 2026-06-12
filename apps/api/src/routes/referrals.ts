import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

// Referral system (added 2026-05-27).
//
// One ReferralCode per signed-in user, generated on first request to
// /referrals/me. Deterministic but unpredictable — derived from a HMAC of
// the user UUID + REFERRAL_SECRET, base32-encoded, 7 chars.
//
// Anonymous visitors hit the public /referrals/lookup/:code endpoint when
// the web app sees `?ref=CODE` in the URL — it just resolves the referrer
// and returns a short profile so we can show "Invited by Ramesh" cards on
// the landing page. Cookie capture happens on the web side.
//
// All endpoints fail gracefully when the referral_codes / referral_claims
// tables haven't been migrated yet — they return 503 with a stable error
// code so the web can show a "referrals coming soon" banner without
// throwing red errors at users.

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Crockford-ish, no 0/O/1/I
const CODE_LEN = 7;

function deriveCodeFor(userId: string): string {
  const secret = process.env.REFERRAL_SECRET || 'darshya-default-referral-pepper-change-me';
  const hmac = crypto.createHmac('sha256', secret).update(userId).digest();
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) {
    out += CODE_ALPHABET[hmac[i]! % CODE_ALPHABET.length];
  }
  return out;
}

const TABLE_MISSING_CODES = new Set([
  'P2010', // raw query error (table does not exist)
  'P2021', // table does not exist
  'P2022', // column does not exist
]);

function isTableMissing(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (!e) return false;
  if (e.code && TABLE_MISSING_CODES.has(e.code)) return true;
  const msg = e.message || '';
  return /does not exist|relation .* does not exist|referral_codes|referral_claims/.test(msg);
}

const claimSchema = z.object({
  code: z.string().min(4).max(16).regex(/^[A-Z0-9]+$/i, 'invalid_code'),
});

const rewardSchema = z.object({
  claimId: z.string().uuid(),
  bookingId: z.string().uuid(),
});

// Default referral reward: ₹100 = 10000 paise. Override via REFERRAL_REWARD_PAISE env.
const DEFAULT_REWARD_PAISE = 10000;

export async function referralsRoutes(server: FastifyInstance) {
  // GET /me — return (or lazily create) the current user's referral code.
  server.get('/me', { preHandler: [authenticateUser] }, async (req, reply) => {
    const user = (req as unknown as { currentUser: { id: string; fullName?: string | null } }).currentUser;
    const code = deriveCodeFor(user.id);
    try {
      // Upsert: create row on first access, idempotent thereafter.
      const row = await (prisma as unknown as {
        referralCode: {
          upsert: (args: unknown) => Promise<{ code: string; createdAt: Date }>;
        };
      }).referralCode.upsert({
        where: { userId: user.id },
        create: { userId: user.id, code },
        update: {},
      });

      const claims = await (prisma as unknown as {
        referralClaim: { count: (args: unknown) => Promise<number> };
      }).referralClaim.count({ where: { referrerId: user.id } });
      const rewarded = await (prisma as unknown as {
        referralClaim: { count: (args: unknown) => Promise<number> };
      }).referralClaim.count({ where: { referrerId: user.id, status: 'rewarded' } });

      const origin = process.env.WEB_PUBLIC_URL || 'https://darshya.online';
      return reply.send({
        code: row.code,
        shareUrl: `${origin}/?ref=${row.code}`,
        stats: { totalClaims: claims, rewardedClaims: rewarded },
        rewardPerSide: { amount: 100, currency: 'INR' },
        createdAt: row.createdAt,
      });
    } catch (err) {
      if (isTableMissing(err)) {
        return reply.code(503).send({
          error: 'referral_tables_not_migrated',
          message: 'Referral feature is being prepared. Please check back soon.',
          code,
        });
      }
      throw err;
    }
  });

  // GET /lookup/:code — public referrer profile (name + city only).
  server.get<{ Params: { code: string } }>('/lookup/:code', async (req, reply) => {
    const code = req.params.code.toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(code)) {
      return reply.code(400).send({ error: 'invalid_code' });
    }
    try {
      const row = await (prisma as unknown as {
        referralCode: {
          findUnique: (args: unknown) => Promise<{ user: { fullName: string; locationCity: string | null } } | null>;
        };
      }).referralCode.findUnique({
        where: { code },
        include: {
          user: { select: { fullName: true, locationCity: true } },
        },
      });
      if (!row) return reply.code(404).send({ error: 'not_found' });
      return reply.send({
        code,
        referrer: {
          name: row.user.fullName,
          city: row.user.locationCity,
        },
      });
    } catch (err) {
      if (isTableMissing(err)) {
        return reply.code(503).send({ error: 'referral_tables_not_migrated' });
      }
      throw err;
    }
  });

  // POST /claim — referee calls this once they've signed up + ref cookie is
  // present. Creates a `signed_up` claim if one doesn't already exist for
  // this (referrer, referee) pair. Self-referral is voided.
  server.post('/claim', { preHandler: [authenticateUser] }, async (req, reply) => {
    const parsed = claimSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const code = parsed.data.code.toUpperCase();
    const referee = (req as unknown as { currentUser: { id: string } }).currentUser;

    try {
      const codeRow = await (prisma as unknown as {
        referralCode: {
          findUnique: (args: unknown) => Promise<{ id: string; userId: string } | null>;
        };
      }).referralCode.findUnique({ where: { code } });
      if (!codeRow) return reply.code(404).send({ error: 'code_not_found' });
      if (codeRow.userId === referee.id) {
        return reply.code(400).send({ error: 'self_referral_not_allowed' });
      }

      // De-dupe: one signed_up claim per (referrer, referee) pair.
      const existing = await (prisma as unknown as {
        referralClaim: {
          findFirst: (args: unknown) => Promise<{ id: string; status: string } | null>;
        };
      }).referralClaim.findFirst({
        where: { referrerId: codeRow.userId, refereeId: referee.id },
      });
      if (existing) {
        return reply.send({ status: existing.status, alreadyClaimed: true });
      }

      const created = await (prisma as unknown as {
        referralClaim: {
          create: (args: unknown) => Promise<{ id: string; status: string }>;
        };
      }).referralClaim.create({
        data: {
          codeId: codeRow.id,
          referrerId: codeRow.userId,
          refereeId: referee.id,
          status: 'signed_up',
        },
      });
      return reply.code(201).send({ status: created.status, claimed: true });
    } catch (err) {
      if (isTableMissing(err)) {
        return reply.code(503).send({ error: 'referral_tables_not_migrated' });
      }
      throw err;
    }
  });

  // POST /reward — system-internal call to flip qualifying claim → rewarded.
  // Triggered by checkout webhook when referee completes their first paid booking.
  // Idempotent via wallet ledger idempotencyKey = `referral-reward-${claimId}`.
  // Auth: requires authenticated user who must be either the referee (self-trigger
  // post-booking) or admin role. Plain user can only reward their own referee link.
  server.post('/reward', { preHandler: [authenticateUser] }, async (req, reply) => {
    const parsed = rewardSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const { claimId, bookingId } = parsed.data;
    const caller = (req as unknown as { currentUser: { id: string } }).currentUser;

    try {
      const claim = await (prisma as unknown as {
        referralClaim: {
          findUnique: (args: unknown) => Promise<{
            id: string;
            status: string;
            referrerId: string;
            refereeId: string | null;
            rewardLedgerId: string | null;
          } | null>;
        };
      }).referralClaim.findUnique({ where: { id: claimId } });

      if (!claim) return reply.code(404).send({ error: 'claim_not_found' });
      if (claim.refereeId !== caller.id) {
        return reply.code(403).send({ error: 'not_your_claim' });
      }
      if (claim.status === 'rewarded') {
        // Already rewarded — return existing ledger ref (idempotent surface).
        return reply.send({ status: 'rewarded', alreadyRewarded: true, ledgerId: claim.rewardLedgerId });
      }
      if (claim.status === 'void') {
        return reply.code(409).send({ error: 'claim_voided' });
      }

      // Credit referrer wallet first; only flip claim status on success.
      const { WalletService } = await import('../services/wallet.service.js');
      const wallet = new WalletService(prisma);
      const rewardPaise = Number(process.env.REFERRAL_REWARD_PAISE) || DEFAULT_REWARD_PAISE;
      const idempotencyKey = `referral-reward-${claimId}`;

      const creditResult = await wallet.creditUser({
        userId: claim.referrerId,
        deltaPaise: rewardPaise,
        reason: 'referral_reward',
        idempotencyKey,
        refType: 'referral_claim',
        refId: claimId,
        notes: `Reward for referee booking ${bookingId}`,
      });

      await (prisma as unknown as {
        referralClaim: {
          update: (args: unknown) => Promise<unknown>;
        };
      }).referralClaim.update({
        where: { id: claimId },
        data: {
          status: 'rewarded',
          rewardAmount: rewardPaise / 100,
          rewardCurrency: 'INR',
          rewardedAt: new Date(),
          rewardLedgerId: creditResult.ledgerEntryId,
          bookingId,
        },
      });

      return reply.send({
        status: 'rewarded',
        ledgerId: creditResult.ledgerEntryId,
        rewardPaise,
        newBalancePaise: creditResult.newBalancePaise,
        reused: creditResult.reused,
      });
    } catch (err) {
      if (isTableMissing(err)) {
        return reply.code(503).send({ error: 'referral_tables_not_migrated' });
      }
      throw err;
    }
  });

  // GET /mine — list claims this user owns (as referrer or referee).
  server.get('/mine', { preHandler: [authenticateUser] }, async (req, reply) => {
    const user = (req as unknown as { currentUser: { id: string } }).currentUser;
    try {
      const [asReferrer, asReferee] = await Promise.all([
        (prisma as unknown as {
          referralClaim: { findMany: (args: unknown) => Promise<unknown[]> };
        }).referralClaim.findMany({
          where: { referrerId: user.id },
          include: { referee: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        (prisma as unknown as {
          referralClaim: { findMany: (args: unknown) => Promise<unknown[]> };
        }).referralClaim.findMany({
          where: { refereeId: user.id },
          include: { referrer: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ]);
      return reply.send({ asReferrer, asReferee });
    } catch (err) {
      if (isTableMissing(err)) {
        return reply.code(503).send({ error: 'referral_tables_not_migrated' });
      }
      throw err;
    }
  });
}
