import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireAnyRole, type MarketplaceRole } from '../middlewares/auth.js';

// Provider roles allowed to submit KYC. DEVOTEE intentionally excluded —
// devotees never receive payouts, so no Aadhaar/PAN/bank should be on file
// for them. ADMIN allowed for support-side debugging only.
const PROVIDER_ROLES: MarketplaceRole[] = [
  'PANDIT',
  'STORE_OWNER',
  'ASTROLOGER',
  'WELLNESS_INSTRUCTOR',
  'GAUSHALA_MANAGER',
  'TEMPLE_MANAGER',
  'ADMIN',
];

/**
 * Provider KYC stage 2 — bank + PAN + Aadhaar last-4.
 *
 * Stored in `provider_kyc` (raw SQL because the Prisma client DLL is
 * locked on Windows during dev; migration ships the table directly).
 * Aadhaar full number is NEVER stored in the clear: we keep last 4 plus
 * a sha256 of the full number so a future challenge ("is this really
 * 1234?") can be answered without a plaintext breach surface.
 *
 * Approval (verified=true) is admin-driven; this route only stores what
 * the provider submitted. Payout gating reads `verified` separately.
 */

const submitSchema = z.object({
  aadhaarFull: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits')
    .optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN must match AAAAA9999A')
    .optional(),
  bankAccountNumber: z
    .string()
    .regex(/^\d{9,18}$/, 'Bank account must be 9-18 digits')
    .optional(),
  bankIfsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC must be 11 chars; fifth must be 0')
    .optional(),
  bankHolderName: z.string().min(2).max(120).optional(),
});

interface KycRow {
  user_id: string;
  aadhaar_last4: string | null;
  aadhaar_hash: string | null;
  pan_number: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_holder_name: string | null;
  verified: boolean;
  verified_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

function maskTail(value: string | null, keep = 4): string | null {
  if (!value) return null;
  if (value.length <= keep) return '*'.repeat(value.length);
  return '*'.repeat(value.length - keep) + value.slice(-keep);
}

export async function providerKycRoutes(server: FastifyInstance) {
  // ── GET /providers/kyc — current redacted KYC for the signed-in user ──
  server.get('/', { preHandler: [authenticateUser, requireAnyRole(...PROVIDER_ROLES)] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const accessToken = (request.headers.authorization ?? '').replace(/^Bearer\s+/i, '');

    if (userId.startsWith('demo-') || accessToken.startsWith('demo-')) {
      return reply.send({ kyc: null, demoMode: true });
    }

    const rows = await prisma.$queryRawUnsafe<KycRow[]>(
      `SELECT user_id, aadhaar_last4, aadhaar_hash, pan_number, bank_account_number,
              bank_ifsc, bank_holder_name, verified, verified_at, rejection_reason,
              created_at, updated_at
         FROM provider_kyc
        WHERE user_id = $1::uuid
        LIMIT 1`,
      userId,
    );
    const row = rows[0];
    if (!row) {
      return reply.send({ kyc: null });
    }
    return reply.send({
      kyc: {
        aadhaarLast4: row.aadhaar_last4,
        panNumber: maskTail(row.pan_number, 4),
        bankAccountNumber: maskTail(row.bank_account_number, 4),
        bankIfsc: row.bank_ifsc,
        bankHolderName: row.bank_holder_name,
        verified: row.verified,
        verifiedAt: row.verified_at,
        rejectionReason: row.rejection_reason,
        updatedAt: row.updated_at,
      },
    });
  });

  // ── POST /providers/kyc — submit/update KYC details ──────────────────
  server.post('/', { preHandler: [authenticateUser, requireAnyRole(...PROVIDER_ROLES)] }, async (request, reply) => {
    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid KYC details',
        details: parsed.error.flatten(),
      });
    }
    const userId = request.currentUser!.id;
    const accessToken = (request.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (userId.startsWith('demo-') || accessToken.startsWith('demo-')) {
      return reply.code(202).send({
        message: 'Demo session — KYC not persisted. Sign up with a real account to submit KYC.',
        demoMode: true,
      });
    }

    const d = parsed.data;
    const aadhaarLast4 = d.aadhaarFull ? d.aadhaarFull.slice(-4) : null;
    const aadhaarHash = d.aadhaarFull
      ? crypto.createHash('sha256').update(d.aadhaarFull).digest('hex')
      : null;

    // Submitting again resets verified=false and clears any prior rejection
    // reason — admin must re-review changed details.
    await prisma.$executeRawUnsafe(
      `INSERT INTO provider_kyc (
         user_id, aadhaar_last4, aadhaar_hash, pan_number,
         bank_account_number, bank_ifsc, bank_holder_name,
         verified, rejection_reason, updated_at
       )
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, false, NULL, now())
       ON CONFLICT (user_id) DO UPDATE SET
         aadhaar_last4 = COALESCE(EXCLUDED.aadhaar_last4, provider_kyc.aadhaar_last4),
         aadhaar_hash = COALESCE(EXCLUDED.aadhaar_hash, provider_kyc.aadhaar_hash),
         pan_number = COALESCE(EXCLUDED.pan_number, provider_kyc.pan_number),
         bank_account_number = COALESCE(EXCLUDED.bank_account_number, provider_kyc.bank_account_number),
         bank_ifsc = COALESCE(EXCLUDED.bank_ifsc, provider_kyc.bank_ifsc),
         bank_holder_name = COALESCE(EXCLUDED.bank_holder_name, provider_kyc.bank_holder_name),
         verified = false,
         rejection_reason = NULL,
         updated_at = now()`,
      userId,
      aadhaarLast4,
      aadhaarHash,
      d.panNumber ?? null,
      d.bankAccountNumber ?? null,
      d.bankIfsc ?? null,
      d.bankHolderName ?? null,
    );

    return reply.send({
      message: 'KYC submitted. Your KYC status page shows its progress; no review time is promised.',
      verified: false,
    });
  });
}
