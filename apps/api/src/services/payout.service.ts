/**
 * payout.service.ts — unified provider payout engine (cross-cutting Phase 2,
 * 2026-08-06).
 *
 * THE PROBLEM: only priests had a payout path (PriestPayout). Every other role
 * — astrologer, wellness instructor, store owner, temple manager, gaushala —
 * accumulated Commission rows that sat PENDING forever with no way to be paid.
 * The admin "pending payouts" view even double-counted the cut (showing 21% of
 * gross as an astrologer's payout).
 *
 * THE DESIGN: a single PayoutRequest lifecycle over the Commission ledger.
 *  - Commission.amount IS the provider's net share for every role (priest 80%,
 *    astrologer 80%, store owner 80%, wellness 80%). percentage = platform rate.
 *  - A provider's withdrawable balance = SUM(PENDING Commission.amount with no
 *    payoutRequestId).
 *  - requestPayout: create a PayoutRequest + link the pending commissions to it
 *    (atomic), gated on verified KYC (bank/UPI on file).
 *  - Admin processPayout: completed → mark Commissions PAID (the real money
 *    movement is a bank/UPI transfer, Razorpay Route, or manual — the reference
 *    is recorded); rejected/failed → release commissions back to PENDING so the
 *    balance isn't lost.
 *
 * Settlement timing note: research anchor is weekly T+7 (Amazon/Flipkart/UC).
 * We allow self-serve request anytime but batch-process; the reference field
 * carries the Razorpay Route / UPI / bank ref for reconciliation.
 */

import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../routes/notifications.js';
import { Prisma } from '@prisma/client';
import type { ProviderRole } from '@prisma/client';

export type ProviderRoleKey =
  | 'PANDIT'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'STORE_OWNER'
  | 'TEMPLE_MANAGER'
  | 'GAUSHALA_MANAGER';

const MIN_PAYOUT_INR = 1; // no meaningful floor; provider can withdraw any positive balance

// Weekly settlement floor — below this the balance rolls to next week rather
// than creating a trivial PayoutRequest. Self-serve requestPayout has no floor
// (a provider can always pull any positive balance); this floor only gates the
// automatic weekly batch so we don't spam ₹1 settlement rows.
export const WEEKLY_SETTLE_MIN_INR = 100;

/**
 * Every role name that can own a payout, mapped to its ProviderRole. `PRIEST`
 * is here because JWT role claims carry the web vocabulary (web `priest` ↔ API
 * `pandit`); the persisted `UserRole` enum only ever says PANDIT.
 *
 * Lives in the service rather than the route because the weekly settlement
 * cron needs the same mapping (it used to stamp every provider 'PANDIT').
 */
export const PROVIDER_ROLE_MAP: Record<string, ProviderRoleKey> = {
  PANDIT: 'PANDIT',
  PRIEST: 'PANDIT',
  ASTROLOGER: 'ASTROLOGER',
  WELLNESS_INSTRUCTOR: 'WELLNESS_INSTRUCTOR',
  STORE_OWNER: 'STORE_OWNER',
  TEMPLE_MANAGER: 'TEMPLE_MANAGER',
  GAUSHALA_MANAGER: 'GAUSHALA_MANAGER',
};

export function resolveProviderRole(roles: string[]): ProviderRoleKey | null {
  for (const r of roles) {
    if (PROVIDER_ROLE_MAP[r]) return PROVIDER_ROLE_MAP[r]!;
  }
  return null;
}

/**
 * Resolve a provider's payout role from their persisted role assignments,
 * primary role first. Used by the weekly settlement sweep, which has no request
 * context to read JWT claims from.
 */
export async function resolveProviderRoleForUser(
  providerId: string,
): Promise<ProviderRoleKey | null> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId: providerId },
    select: { role: true },
    // isPrimary first, then a stable alphabetical tiebreak so a multi-role
    // provider is stamped deterministically rather than by insertion order.
    orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
  });
  return resolveProviderRole(assignments.map((a) => a.role as string));
}

/**
 * batch5-review (2026-08-11): money is `Prisma.Decimal` — never JS float
 * arithmetic (project rule). These sums fed display and two coarse gates, so
 * nothing was mispaid, but they were float reductions inside the same function
 * RV-05 had just rewritten for correctness, and a test added in that very batch
 * asserts float-summing Decimal amounts is wrong.
 */
function sumAmounts(rows: Array<{ amount: Prisma.Decimal | number | string }>): Prisma.Decimal {
  return rows.reduce((s, r) => s.add(new Prisma.Decimal(r.amount)), new Prisma.Decimal(0));
}

/** Withdrawable balance = PENDING commissions not yet linked to a request. */
export async function getPayoutBalance(providerId: string) {
  const rows = await prisma.commission.findMany({
    where: { providerId, status: 'PENDING', payoutRequestId: null },
    select: { amount: true },
  });
  const pending = sumAmounts(rows);

  const paidRows = await prisma.commission.findMany({
    where: { providerId, status: 'PAID' },
    select: { amount: true },
  });
  const paid = sumAmounts(paidRows);

  // In-flight (requested but not yet completed) — already linked to a request,
  // so NOT part of `pending` above. Reported for display only.
  const inFlightRows = await prisma.commission.findMany({
    where: {
      providerId,
      payoutRequest: { status: { in: ['pending', 'processing'] } },
    },
    select: { amount: true },
  });
  const inFlight = sumAmounts(inFlightRows);

  // RV-05 (2026-08-10): availableInr used to be `pending - inFlight`, but the two
  // sets are disjoint by construction — the `pending` query filters
  // payoutRequestId: null and a Prisma to-one relation filter never matches a
  // NULL FK, so no in-flight row is ever inside `pending`. The subtraction
  // removed money that was never added: requestPayout sized the PayoutRequest at
  // (new earnings − in-flight) while linking ALL unlinked commissions to it, so
  // on completion every one of them flipped to PAID and the difference was
  // destroyed (provider short-paid, platform kept it) — every Monday, via the
  // weekly settlement cron. Available is exactly `pending`; in-flight is only
  // ever reported separately as pendingInr.
  // Decimal all the way through; converted to number only at this boundary,
  // where the value stops being money and becomes a display/API field.
  return {
    availableInr: pending.toDecimalPlaces(2).toNumber(),
    pendingInr: inFlight.toDecimalPlaces(2).toNumber(),
    paidOutInr: paid.toDecimalPlaces(2).toNumber(),
  };
}

/** Whether the provider has a verified KYC record (required before payout). */
export async function getKycStatus(providerId: string): Promise<{
  verified: boolean;
  hasBank: boolean;
  hasUpi: boolean;
}> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ verified: boolean; bank_account_number: string | null; bank_ifsc: string | null }>
  >(
    `SELECT verified, bank_account_number, bank_ifsc FROM provider_kyc WHERE user_id = $1::uuid LIMIT 1`,
    providerId,
  );
  const row = rows[0];
  return {
    verified: !!row?.verified,
    hasBank: !!(row?.bank_account_number && row?.bank_ifsc),
    hasUpi: !!(row?.bank_account_number && row?.bank_ifsc), // UPI/bank both use the bank record here
  };
}

/**
 * Message surfaced (as a 400) when a concurrent request already claimed the
 * commissions this call intended to pay out — the caller may simply retry.
 */
export const PAYOUT_CONCURRENT_REQUEST_ERROR =
  'Another payout request for this balance is already being created. Please try again in a moment.';

/**
 * Create a payout request for the provider's full available balance. Atomic:
 * the ledger is re-read, the request is created, and its commissions are linked
 * inside ONE transaction, so a crash can't leave a request pointing at no
 * commissions and two concurrent calls can't double-spend the same balance.
 * Internal callers (weekly settlement) may skip the KYC gate via `opts.skipKyc`
 * after they've already applied their own verified-KYC filter.
 */
export async function requestPayout(
  providerId: string,
  role: ProviderRoleKey,
  method = 'upi',
  opts: { skipKyc?: boolean } = {},
) {
  const kyc = await getKycStatus(providerId);
  if (!opts.skipKyc) {
    if (!kyc.hasBank) {
      throw new Error('Add your bank/UPI details in KYC before requesting a payout.');
    }
    if (!kyc.verified) {
      throw new Error('Your KYC is pending verification. Payouts unlock once an admin verifies it.');
    }
  }

  // Cheap pre-check so an empty balance fails fast without opening a
  // transaction. RV-06: this read is advisory ONLY — it must never size the
  // request, because it happens outside the transaction below.
  const preview = await getPayoutBalance(providerId);
  if (preview.availableInr < MIN_PAYOUT_INR) {
    throw new Error('No withdrawable balance.');
  }

  const created = await prisma.$transaction(async (tx) => {
    // RV-06 (2026-08-10): the amount used to come from a balance read taken
    // BEFORE the transaction opened, and nothing checked whether those
    // commissions were still unlinked. Two concurrent calls (a double-clicked
    // Withdraw button is enough — no idempotency key on POST /payouts/request)
    // therefore minted two PayoutRequests for one balance: the first linked
    // every commission, the second linked none and silently succeeded, and an
    // admin completing both transferred the balance twice.
    // Now the ledger is re-read inside the transaction, the request is sized
    // from exactly the rows we are about to link, and the link is conditioned on
    // payoutRequestId still being NULL. Under READ COMMITTED the loser blocks on
    // the winner's row locks, re-evaluates the predicate, matches fewer rows
    // than it selected, and throws — rolling back its own PayoutRequest.
    const rows = await tx.commission.findMany({
      where: { providerId, status: 'PENDING', payoutRequestId: null },
      select: { id: true, amount: true },
    });
    if (!rows.length) throw new Error('No withdrawable balance.');

    // Decimal maths — Commission.amount is Decimal(10,2); never float-sum money.
    const total = rows.reduce(
      (sum, r) => sum.add(new Prisma.Decimal(r.amount)),
      new Prisma.Decimal(0),
    );
    if (total.lessThan(MIN_PAYOUT_INR)) throw new Error('No withdrawable balance.');

    const request = await tx.payoutRequest.create({
      data: {
        providerId,
        role,
        amount: total,
        method,
        status: 'pending',
      },
    });

    const linked = await tx.commission.updateMany({
      where: {
        id: { in: rows.map((r) => r.id) },
        status: 'PENDING',
        payoutRequestId: null, // in-flight guard: a concurrent tx already took these
      },
      data: { payoutRequestId: request.id },
    });
    if (linked.count !== rows.length) {
      throw new Error(PAYOUT_CONCURRENT_REQUEST_ERROR);
    }
    return request;
  });

  // Notify the provider the request is in (fire-and-forget).
  void notifyUser(providerId, {
    title: 'Payout requested',
    body: `Your payout of ₹${Number(created.amount).toLocaleString('en-IN')} is being processed.`,
    url: '/payouts',
  }).catch(() => undefined);
  return created;
}

/** A payout request may only be completed out of one of these statuses. */
const COMPLETABLE_STATUSES: ReadonlyArray<string> = ['pending', 'processing'];

/**
 * Admin: process a payout request. action='complete' marks commissions PAID +
 * records the transfer reference. action='reject'/'fail' releases commissions
 * back to PENDING (balance preserved). Idempotent on completed.
 */
export async function processPayout(
  payoutId: string,
  action: 'complete' | 'reject' | 'fail',
  adminId: string,
  reference?: string,
  failureReason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.payoutRequest.findUnique({ where: { id: payoutId } });
    if (!req) throw new Error('Payout request not found.');
    if (req.status === 'completed') return req;

    if (action === 'complete') {
      // batch5-review (2026-08-11): RV-06 closed the CREATION side of the
      // hollow-request problem and the write-up claimed the whole vector. The
      // completion side was untouched — the only guard was the `completed`
      // short-circuit above, so a REJECTED or FAILED request could be completed
      // a second time. The reject branch below unlinks that request's
      // commissions and returns them to the withdrawable balance, so a rejected
      // request IS a hollow request sitting in the admin list: completing it
      // transfers again and fires "Payout sent ₹X" for money the provider can
      // still claim through a newer request.
      if (!COMPLETABLE_STATUSES.includes(req.status)) {
        throw new Error(
          `Cannot complete a payout request in "${req.status}" status — its commissions have ` +
            "already been released back to the provider's withdrawable balance.",
        );
      }

      // ...and it must still own the money it claims to pay. Anything else is a
      // reconciliation problem, not something to transfer against.
      const linked = await tx.commission.findMany({
        where: { payoutRequestId: payoutId },
        select: { amount: true, status: true },
      });
      if (!linked.length) {
        throw new Error(
          'This payout request owns no commissions — there is nothing to pay. Check the ' +
            "provider's balance before transferring.",
        );
      }
      const notPending = linked.filter((c) => c.status !== 'PENDING');
      if (notPending.length) {
        throw new Error(
          `${notPending.length} of ${linked.length} commissions on this payout request are no ` +
            'longer PENDING. Reconcile the ledger before completing.',
        );
      }
      const linkedTotal = sumAmounts(linked);
      if (!linkedTotal.equals(new Prisma.Decimal(req.amount))) {
        throw new Error(
          `Payout amount ₹${new Prisma.Decimal(req.amount).toFixed(2)} does not match its linked ` +
            `commissions (₹${linkedTotal.toFixed(2)}). Reconcile the ledger before completing.`,
        );
      }

      const updated = await tx.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          processedBy: adminId,
          reference: reference ?? null,
        },
      });
      // Scoped to PENDING so a REVERSED row (RV-02's refund reversal) can never
      // be resurrected to PAID, even if one is linked here in future.
      await tx.commission.updateMany({
        where: { payoutRequestId: payoutId, status: 'PENDING' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      return updated;
    }

    // reject / fail → release commissions back to PENDING (balance not lost)
    const updated = await tx.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: action === 'reject' ? 'rejected' : 'failed',
        processedAt: new Date(),
        processedBy: adminId,
        failureReason: failureReason ?? null,
      },
    });
    await tx.commission.updateMany({
      where: { payoutRequestId: payoutId },
      data: { payoutRequestId: null }, // unlink; status stays PENDING
    });
    return updated;
  }).then(async (req) => {
    void notifyUser(req.providerId, {
      title: action === 'complete' ? 'Payout sent' : 'Payout update',
      body:
        action === 'complete'
          ? `Your payout of ₹${Number(req.amount).toLocaleString('en-IN')} has been sent.`
          : `Your payout could not be completed${failureReason ? `: ${failureReason}` : ''}. Your balance is intact.`,
      url: '/payouts',
    }).catch(() => undefined);
    return req;
  });
}

/** List a provider's own payout requests. */
/**
 * Weekly settlement sweep (Phase-2 "guaranteed payout day"). For every provider
 * with a withdrawable balance ≥ the weekly floor and verified KYC, auto-create a
 * PayoutRequest so providers are paid on a predictable weekly cadence (research
 * anchor: Amazon/Flipkart/UC T+7) instead of only when they remember to
 * self-serve. Providers with a request already awaiting an admin are skipped
 * until it clears. Best-effort per provider — one failure (e.g. an unverified
 * KYC) never blocks the rest.
 */
export async function runWeeklySettlement(): Promise<{
  providersScanned: number;
  requestsCreated: number;
  skippedBalance: number;
  skippedKyc: number;
  skippedInFlight: number;
  skippedRole: number;
  errors: number;
}> {
  // Distinct providers holding any PENDING, unlinked commission.
  const providers = await prisma.commission.findMany({
    where: { status: 'PENDING', payoutRequestId: null },
    select: { providerId: true },
    distinct: ['providerId'],
  });

  let requestsCreated = 0;
  let skippedBalance = 0;
  let skippedKyc = 0;
  let skippedInFlight = 0;
  let skippedRole = 0;
  let errors = 0;

  for (const { providerId } of providers) {
    try {
      const balance = await getPayoutBalance(providerId);
      if (balance.availableInr < WEEKLY_SETTLE_MIN_INR) {
        skippedBalance++;
        continue;
      }
      const kyc = await getKycStatus(providerId);
      if (!kyc.verified || !kyc.hasBank) {
        skippedKyc++;
        continue;
      }
      // batch5-review (2026-08-11): RV-05 removed the only thing suppressing a
      // duplicate weekly request, and it removed it by accident — the old
      // double-subtraction pushed most such providers under
      // WEEKLY_SETTLE_MIN_INR, so the sweep skipped them as a side effect of
      // the bug. Correcting the balance made this sweep create a fresh request
      // every week for a provider whose last one is still pending, with no cap.
      //
      // The money is safe on its own (each request owns a disjoint commission
      // set, and processPayout only touches its own `payoutRequestId`), but the
      // admin queue fills with rows that are indistinguishable in the UI — and
      // an admin who assumes the extras are duplicates and rejects one is the
      // realistic path into the double-transfer the completion guard above now
      // refuses. Cron only: self-serve requestPayout keeps no floor and no
      // dedupe, so a provider can still pull their balance whenever they like.
      const inFlight = await prisma.payoutRequest.count({
        where: { providerId, status: { in: ['pending', 'processing'] } },
      });
      if (inFlight > 0) {
        skippedInFlight++;
        continue;
      }

      // The role stamped on the request is what the admin list and any future
      // payout-rail routing key off. This used to hardcode 'PANDIT' for every
      // provider it settled, so astrologers, store owners and temple managers
      // all got pandit-labelled rows. No role → skip, matching what self-serve
      // does (403 'Provider role required'); the commissions stay unlinked and
      // withdrawable, so nothing is stranded — it settles next sweep.
      const role = await resolveProviderRoleForUser(providerId);
      if (!role) {
        skippedRole++;
        continue;
      }
      await requestPayout(providerId, role, 'upi', { skipKyc: true });
      requestsCreated++;
    } catch (err) {
      errors++;
      // swallow — a single bad provider must not abort the sweep
      console.warn('[weekly-settlement] provider', providerId, 'failed:', (err as Error)?.message);
    }
  }

  return {
    providersScanned: providers.length,
    requestsCreated,
    skippedBalance,
    skippedKyc,
    skippedInFlight,
    skippedRole,
    errors,
  };
}

export async function listMyPayouts(providerId: string) {
  return prisma.payoutRequest.findMany({
    where: { providerId },
    orderBy: { requestedAt: 'desc' },
    take: 100,
  });
}

/** Admin: list payout requests (filterable by status). */
export async function listPayoutRequests(status?: string) {
  const requests = await prisma.payoutRequest.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { requestedAt: 'desc' },
    take: 200,
  });
  if (!requests.length) return [];
  const providers = await prisma.user.findMany({
    where: { id: { in: requests.map((r) => r.providerId) } },
    select: { id: true, fullName: true, email: true },
  });
  const byId = new Map(providers.map((p) => [p.id, p] as const));

  // batch5-review (2026-08-11): two pending requests for the same provider were
  // indistinguishable in the admin list, which is what made the duplicate-row
  // problem above dangerous rather than merely untidy. Surfacing what each
  // request actually owns lets an admin spot a hollow one (0 linked) before
  // transferring, instead of after.
  const linkedCounts = await prisma.commission.groupBy({
    by: ['payoutRequestId'],
    where: { payoutRequestId: { in: requests.map((r) => r.id) } },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const linkedById = new Map(
    linkedCounts.map((g) => [g.payoutRequestId, g] as const),
  );

  return requests.map((r) => {
    const linked = linkedById.get(r.id);
    return {
      ...r,
      amount: r.amount.toString(),
      providerName: byId.get(r.providerId)?.fullName ?? 'Unknown',
      providerEmail: byId.get(r.providerId)?.email ?? null,
      linkedCommissionCount: linked?._count._all ?? 0,
      linkedCommissionTotal: (linked?._sum.amount ?? new Prisma.Decimal(0)).toString(),
    };
  });
}
