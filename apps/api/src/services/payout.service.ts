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

export type ProviderRoleKey =
  | 'PANDIT'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'STORE_OWNER'
  | 'TEMPLE_MANAGER'
  | 'GAUSHALA_MANAGER';

const MIN_PAYOUT_INR = 1; // no meaningful floor; provider can withdraw any positive balance

/** Withdrawable balance = PENDING commissions not yet linked to a request. */
export async function getPayoutBalance(providerId: string) {
  const rows = await prisma.commission.findMany({
    where: { providerId, status: 'PENDING', payoutRequestId: null },
    select: { amount: true },
  });
  const pending = rows.reduce((s, r) => s + Number(r.amount), 0);

  const paidRows = await prisma.commission.findMany({
    where: { providerId, status: 'PAID' },
    select: { amount: true },
  });
  const paid = paidRows.reduce((s, r) => s + Number(r.amount), 0);

  // In-flight (requested but not yet completed) — locked from new requests.
  const inFlightRows = await prisma.commission.findMany({
    where: {
      providerId,
      payoutRequest: { status: { in: ['pending', 'processing'] } },
    },
    select: { amount: true },
  });
  const inFlight = inFlightRows.reduce((s, r) => s + Number(r.amount), 0);

  return {
    availableInr: Math.round((pending - inFlight) * 100) / 100,
    pendingInr: Math.round(inFlight * 100) / 100,
    paidOutInr: Math.round(paid * 100) / 100,
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
 * Create a payout request for the provider's full available balance. Atomic:
 * create the request + link its commissions in one transaction so a crash
 * can't leave a request pointing at no commissions (or double-spend a balance).
 */
export async function requestPayout(providerId: string, role: ProviderRoleKey, method = 'upi') {
  const kyc = await getKycStatus(providerId);
  if (!kyc.hasBank) {
    throw new Error('Add your bank/UPI details in KYC before requesting a payout.');
  }
  if (!kyc.verified) {
    throw new Error('Your KYC is pending verification. Payouts unlock once an admin verifies it.');
  }

  const balance = await getPayoutBalance(providerId);
  if (balance.availableInr < MIN_PAYOUT_INR) {
    throw new Error('No withdrawable balance.');
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.payoutRequest.create({
      data: {
        providerId,
        role,
        amount: balance.availableInr,
        method,
        status: 'pending',
      },
    });
    // Link exactly the PENDING, unlinked commissions that make up this balance.
    await tx.commission.updateMany({
      where: { providerId, status: 'PENDING', payoutRequestId: null },
      data: { payoutRequestId: request.id },
    });
    return request;
  }).then(async (req) => {
    // Notify the provider the request is in (fire-and-forget).
    void notifyUser(providerId, {
      title: 'Payout requested',
      body: `Your payout of ₹${balance.availableInr.toLocaleString('en-IN')} is being processed.`,
      url: '/payouts',
    }).catch(() => undefined);
    return req;
  });
}

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
      const updated = await tx.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          processedBy: adminId,
          reference: reference ?? null,
        },
      });
      await tx.commission.updateMany({
        where: { payoutRequestId: payoutId },
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
  return requests.map((r) => ({
    ...r,
    amount: r.amount.toString(),
    providerName: byId.get(r.providerId)?.fullName ?? 'Unknown',
    providerEmail: byId.get(r.providerId)?.email ?? null,
  }));
}
