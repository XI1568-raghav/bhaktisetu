/**
 * Wallet service — internal credit primitive for users.
 *
 * Added 2026-06-12 as part of R-Q2-M-011 referral reward integration.
 * Storage: PAISE (smallest INR unit) to avoid float/Decimal hazards.
 * Invariant: sum(CreditLedgerEntry.deltaPaise) per user MUST equal
 * UserCredit.balancePaise. Enforced by always writing through this service.
 *
 * Idempotency: every mutation requires idempotencyKey. Re-call w/ same
 * (userId, idempotencyKey) returns the existing ledger entry — no double
 * credit. Required because referral reward fires from webhook + retry layer.
 */

import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

export type CreditLedgerReason =
  | 'referral_reward'
  | 'refund_to_credit'
  | 'promo_grant'
  | 'redemption_debit'
  | 'adjustment';

export interface CreditUserInput {
  userId: string;
  deltaPaise: number; // positive = credit, negative = debit
  reason: CreditLedgerReason;
  idempotencyKey: string;
  refType?: string;
  refId?: string;
  notes?: string;
}

export interface CreditResult {
  ledgerEntryId: string;
  newBalancePaise: number;
  reused: boolean; // true if idempotency-hit (re-call w/ same key)
}

export interface WalletBalance {
  balancePaise: number;
  currency: string;
}

export class WalletInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletInvariantError';
  }
}

export class WalletService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Apply a balance change. Idempotent on (userId, idempotencyKey).
   * Transactional — credit row + ledger entry written together or not at all.
   */
  async creditUser(input: CreditUserInput): Promise<CreditResult> {
    const { userId, deltaPaise, reason, idempotencyKey, refType, refId, notes } = input;

    if (!Number.isInteger(deltaPaise)) {
      throw new WalletInvariantError(`deltaPaise must be integer (got ${deltaPaise})`);
    }
    if (deltaPaise === 0) {
      throw new WalletInvariantError('deltaPaise cannot be zero');
    }
    if (!idempotencyKey || idempotencyKey.length < 8) {
      throw new WalletInvariantError('idempotencyKey required (min 8 chars)');
    }

    // Fast path: existing ledger entry for this key → reuse.
    const existing = await this.prisma.creditLedgerEntry.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (existing) {
      const current = await this.prisma.userCredit.findUnique({ where: { userId } });
      return {
        ledgerEntryId: existing.id,
        newBalancePaise: current?.balancePaise ?? 0,
        reused: true,
      };
    }

    // Transactional credit + ledger entry create.
    const result = await this.prisma.$transaction(async (tx) => {
      const credit = await tx.userCredit.upsert({
        where: { userId },
        create: {
          userId,
          balancePaise: deltaPaise,
        },
        update: {
          balancePaise: { increment: deltaPaise },
        },
      });

      // Guard: no overdraft from debits beyond balance.
      if (credit.balancePaise < 0) {
        throw new WalletInvariantError(`overdraft: balance ${credit.balancePaise} after delta ${deltaPaise}`);
      }

      const entry = await tx.creditLedgerEntry.create({
        data: {
          userId,
          creditId: credit.id,
          deltaPaise,
          reason,
          idempotencyKey,
          refType: refType ?? null,
          refId: refId ?? null,
          notes: notes ?? null,
        },
      });

      return { ledgerEntryId: entry.id, newBalancePaise: credit.balancePaise };
    });

    return { ...result, reused: false };
  }

  /**
   * Current balance for a user. Returns 0 if no wallet row yet.
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    const row = await this.prisma.userCredit.findUnique({ where: { userId } });
    return {
      balancePaise: row?.balancePaise ?? 0,
      currency: row?.currency ?? 'INR',
    };
  }

  /**
   * Audit: verify sum(ledger.deltaPaise) == UserCredit.balancePaise for a user.
   * Use in tests + admin tools. Throws WalletInvariantError if drift detected.
   */
  async verifyInvariant(userId: string): Promise<{ balancePaise: number; ledgerSumPaise: number }> {
    const [credit, agg] = await Promise.all([
      this.prisma.userCredit.findUnique({ where: { userId } }),
      this.prisma.creditLedgerEntry.aggregate({
        where: { userId },
        _sum: { deltaPaise: true },
      }),
    ]);
    const balancePaise = credit?.balancePaise ?? 0;
    const ledgerSumPaise = agg._sum.deltaPaise ?? 0;
    if (balancePaise !== ledgerSumPaise) {
      throw new WalletInvariantError(`drift: balance=${balancePaise} ledger_sum=${ledgerSumPaise}`);
    }
    return { balancePaise, ledgerSumPaise };
  }
}

// Convenience type-narrowing for callers handling Prisma unique-violation race.
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}
