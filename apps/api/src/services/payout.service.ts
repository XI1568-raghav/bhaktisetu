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

import { settleBounded } from '../lib/background.js';
import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../routes/notifications.js';
import { sendEmail, payoutSettledEmail } from '../lib/email.js';
import { sendWhatsappTemplate } from '../lib/whatsapp.js';
import { recordNotification } from '../lib/notification-log.js';
// OPS-05: durable money trail. Never throws, never joins the caller's
// transaction. A payout is a real-world bank transfer an admin performs by
// hand, so the ONLY record that it was authorised — and by whom — is what this
// service writes. `PayoutRequest.processedBy` is a mutable column on a row a
// later action overwrites; the trail is not.
import { MONEY_EVENTS, recordMoneyEvent } from '../lib/audit-money.js';
import { Prisma } from '@prisma/client';
import type { ProviderRole, PayoutRequestStatus } from '@prisma/client';

export type ProviderRoleKey =
  | 'PANDIT'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'STORE_OWNER'
  | 'TEMPLE_MANAGER'
  | 'GAUSHALA_MANAGER';

// Smallest balance a provider may withdraw. Commission.amount is Decimal(10,2),
// so ₹0.01 is the smallest amount that can exist — this constant therefore means
// "any positive balance", which is the standing decision for self-serve
// requestPayout (no floor, no dedupe). batch9-review (2026-08-11): it was ₹1
// while the comment claimed there was no meaningful floor, so a balance strictly
// between ₹0.00 and ₹1.00 threw "No withdrawable balance." forever. At most ₹0.99
// per provider, but the code and the documented decision disagreed.
const MIN_PAYOUT_INR = 0.01;

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

/**
 * The ONE payout role a provider holding several is stamped with. Explicit and
 * ordered in code because there is no ordering available in SQL that carries the
 * meaning we want (see resolveProviderRoleForUser). Earning roles that generate
 * their own commission streams come first — the dual-role case this exists for
 * is a pandit who also sells samagri, whose STORE_OWNER commissions are the ones
 * that pile up unlabelled.
 *
 * Exported so every surface that has to name a provider's payout role (this
 * service, the self-serve route, the admin pending-payout grouping) agrees on
 * one answer instead of each picking whichever assignment its query happened to
 * return first.
 */
export const PROVIDER_ROLE_PRECEDENCE: readonly ProviderRoleKey[] = [
  'STORE_OWNER',
  'ASTROLOGER',
  'WELLNESS_INSTRUCTOR',
  'PANDIT',
  'TEMPLE_MANAGER',
  'GAUSHALA_MANAGER',
];

/** Highest-precedence payout role among a bag of role names; null if none. */
function pickByPrecedence(roleNames: readonly string[]): ProviderRoleKey | null {
  const held = new Set<ProviderRoleKey>();
  for (const name of roleNames) {
    const mapped = PROVIDER_ROLE_MAP[name];
    if (mapped) held.add(mapped);
  }
  for (const role of PROVIDER_ROLE_PRECEDENCE) {
    if (held.has(role)) return role;
  }
  return null;
}

/**
 * Payout role from JWT role claims. The claims array is built by the auth
 * middleware from an unordered `userRoleAssignment.findMany`, so "first mapped
 * role wins" made a dual-role provider's self-serve payout label depend on row
 * order; precedence makes it the same label the weekly sweep would stamp.
 */
export function resolveProviderRole(roles: string[]): ProviderRoleKey | null {
  return pickByPrecedence(roles);
}

/**
 * Resolve a provider's payout role from their persisted role assignments,
 * primary assignment first. Used by the weekly settlement sweep, which has no
 * request context to read JWT claims from.
 */
export async function resolveProviderRoleForUser(
  providerId: string,
): Promise<ProviderRoleKey | null> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId: providerId },
    select: { role: true, isPrimary: true },
    orderBy: [{ isPrimary: 'desc' }],
  });
  // batch9-review (2026-08-11): the tiebreak used to be `{ role: 'asc' }`,
  // described as "a stable alphabetical tiebreak". Postgres orders enum columns
  // by DECLARATION order, and UserRole declares DEVOTEE, PANDIT, STORE_OWNER, …
  // — so the real rule was "lowest-declared role wins", i.e. PANDIT for nearly
  // every dual-role provider. A store owner who also holds PANDIT got their
  // STORE_OWNER balance stamped role=PANDIT, vanishing from a STORE_OWNER-
  // filtered admin queue: exactly the mislabelling #233 was built to remove.
  // Precedence is applied in code now, so no SQL ordering carries semantics.
  const primary = assignments.filter((a) => a.isPrimary).map((a) => a.role as string);
  return (
    pickByPrecedence(primary) ?? pickByPrecedence(assignments.map((a) => a.role as string))
  );
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

/**
 * SCAL-04 (2026-08-13): sum in SQL, not in Node.
 *
 * These three balances were each a `findMany({ select: { amount } })` reduced in
 * JavaScript — an unbounded read of the provider's entire commission ledger
 * measured at 10,309 kB by EXPLAIN (ANALYZE, SERIALIZE) at 200k rows, three
 * times per dashboard load, into a 512 MB container.
 *
 * Postgres SUM over `numeric` is exact, so the Decimal correctness `sumAmounts`
 * was written to protect is preserved: Prisma hands the aggregate back as a
 * Decimal and it stays one until the display boundary at the end of this
 * function. `_sum` is null when nothing matched — that is zero, not NaN.
 */
async function sumCommissionAmounts(
  where: Prisma.CommissionWhereInput,
): Promise<Prisma.Decimal> {
  const agg = await prisma.commission.aggregate({ where, _sum: { amount: true } });
  return new Prisma.Decimal(agg._sum?.amount ?? 0);
}

/**
 * Cap on the DI-05 legacy-rail reconciliation reads in getPayoutBalance.
 * SCAL-04: both sides are per-provider and indexed, but "per-provider" is not
 * a bound, so they carry an explicit one.
 */
const LEGACY_RAIL_SCAN_CAP = 500;

/** Cap on the held-wellness enrollment id read; far above any real instructor's upcoming roster. */
const UPCOMING_WELLNESS_SCAN_CAP = 5000;

/**
 * Wellness earnings are written PENDING the moment the devotee pays
 * (wellness-sessions.ts writeWellnessCommissionOnPaid), days before the class
 * runs. Counting them as withdrawable let an instructor cash out and then
 * cancel the session. A Commission is tied to its enrollment only by the bare
 * `wellnessEnrollmentId` string (no relation, no schema change), so: find the
 * provider's enrollments whose session has neither happened nor been marked
 * COMPLETED, and hold the commissions keyed on them.
 */
async function upcomingWellnessEnrollmentIds(
  db: Pick<typeof prisma, 'wellnessEnrollment'>,
  providerId: string,
): Promise<string[]> {
  const rows = await db.wellnessEnrollment.findMany({
    where: {
      session: {
        instructorId: providerId,
        scheduledAt: { gt: new Date() },
        status: { not: 'COMPLETED' },
      },
    },
    select: { id: true },
    take: UPCOMING_WELLNESS_SCAN_CAP,
  });
  return rows.map((r) => r.id);
}

/** Excludes held wellness rows; an explicit null branch because NOT IN drops NULLs in SQL. */
function notHeldWellness(heldIds: string[]): Prisma.CommissionWhereInput {
  return heldIds.length
    ? { OR: [{ wellnessEnrollmentId: null }, { wellnessEnrollmentId: { notIn: heldIds } }] }
    : {};
}

/**
 * Puja earnings are written PENDING when the pandit ACCEPTS, before anything has
 * been performed: accepting a booking six days out made its earning withdrawable
 * at once. Hold every commission whose booking has not reached `video_uploaded` or `delivered`: video proof is mandatory, so `completed` alone does not release it (the legacy pandit rail already waits for the same statuses).
 * `bookingId` is a bare string (polymorphic with consultations), so the held set
 * is read from the pandit's own open bookings rather than joined.
 */
const PUJA_NOT_YET_PERFORMED = ['pending_payment', 'confirmed', 'priest_assigned', 'in_progress', 'completed'] as const;

async function unperformedPujaBookingIds(
  db: Pick<typeof prisma, 'pujaBooking'>,
  providerId: string,
): Promise<string[]> {
  const rows = await db.pujaBooking.findMany({
    where: { status: { in: [...PUJA_NOT_YET_PERFORMED] }, priest: { userId: providerId } },
    select: { id: true },
    take: UPCOMING_WELLNESS_SCAN_CAP,
  });
  return rows.map((r) => r.id);
}

/**
 * Astrologer consultation earnings are written PENDING at payment, before the
 * session has happened. Hold those whose consultation is not yet completed (or
 * cancelled: a cancelled one is reversed by the ledger). One joined read: the
 * commission's bare `bookingId` is the consultation id. A missing table (it is
 * created lazily) means no consultations, so nothing is held.
 */
let consultationsTableProbe: { present: boolean; at: number } | null = null;
const CONSULTATIONS_ABSENT_RECHECK_MS = 60_000;
/** Test hook: forget what the probe learned. */
export function __resetConsultationsTableProbe(): void {
  consultationsTableProbe = null;
}

export async function unfinishedConsultationIds(
  db: Pick<typeof prisma, '$queryRawUnsafe'>,
  providerId: string,
): Promise<string[]> {
  try {
    // A failed statement inside `requestPayout`'s transaction aborts it (Postgres
    // 25P02), so the catch below cannot recover: the NEXT read in the tx dies and
    // the payout request returned a 400 carrying Prisma internals. Probe for the
    // lazily created table first instead of letting the join fail.
    //
    // Latency: the probe is a round trip of its own, in front of the join on
    // every balance read. A table that exists never stops existing, so a positive
    // answer is remembered for the life of the process; a negative one for a
    // minute, so a freshly created table is noticed.
    const nowMs = Date.now();
    const known = consultationsTableProbe;
    if (known && known.present === false && nowMs - known.at < CONSULTATIONS_ABSENT_RECHECK_MS) return [];
    if (!(known && known.present === true)) {
      const probe = await db.$queryRawUnsafe<Array<{ present?: unknown }>>(
        `SELECT to_regclass('public.astrologer_consultations') IS NOT NULL AS present`,
      );
      if (Array.isArray(probe) && probe[0] && typeof probe[0].present === 'boolean') {
        consultationsTableProbe = { present: probe[0].present, at: nowMs };
      }
      if (Array.isArray(probe) && probe[0] && probe[0].present === false) return [];
    }
    const rows = await db.$queryRawUnsafe<Array<{ booking_id?: unknown }>>(
      `SELECT c.booking_id FROM commissions c
         JOIN astrologer_consultations a ON a.id::text = c.booking_id
        WHERE c.provider_id = $1::uuid AND c.status = 'PENDING' AND c.payout_request_id IS NULL
          AND a.status NOT IN ('completed', 'cancelled')
        LIMIT 5000`,
      providerId,
    );
    return (Array.isArray(rows) ? rows : []).map((r) => r.booking_id).filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

/** Excludes held puja rows; an explicit null branch because NOT IN drops NULLs in SQL. */
function notHeldPuja(heldIds: string[]): Prisma.CommissionWhereInput {
  return heldIds.length ? { AND: [{ OR: [{ bookingId: null }, { bookingId: { notIn: heldIds } }] }] } : {};
}

/** Keys of the earnings still held (session/puja/consultation not yet done). */
export interface HeldEarningKeys {
  wellnessEnrollmentIds: Set<string>;
  bookingIds: Set<string>;
}

/** The same held sets getPayoutBalance uses, for per-row payable/upcoming flags. */
export async function heldEarningKeys(providerId: string): Promise<HeldEarningKeys> {
  const [wellness, unperformed, unfinished] = await Promise.all([
    upcomingWellnessEnrollmentIds(prisma, providerId),
    unperformedPujaBookingIds(prisma, providerId),
    unfinishedConsultationIds(prisma, providerId),
  ]);
  const bookings = [...unperformed, ...unfinished];
  return { wellnessEnrollmentIds: new Set(wellness), bookingIds: new Set(bookings) };
}

/**
 * True when getPayoutBalance would count this row in `upcomingInr`: PENDING,
 * not yet inside a payout request, and keyed on a held session / puja /
 * consultation.
 */
export function isUpcomingCommission(
  c: {
    status: string;
    payoutRequestId: string | null;
    bookingId: string | null;
    wellnessEnrollmentId?: string | null;
  },
  keys: HeldEarningKeys,
): boolean {
  if (c.status !== 'PENDING' || c.payoutRequestId) return false;
  if (c.wellnessEnrollmentId && keys.wellnessEnrollmentIds.has(c.wellnessEnrollmentId)) return true;
  return !!c.bookingId && keys.bookingIds.has(c.bookingId);
}

/** Withdrawable balance = PENDING commissions not yet linked to a request. */
export async function getPayoutBalance(providerId: string) {
  // Latency: every query here is a round trip to a remote database, so the
  // independent reads run together (two waves instead of nine in a row).
  // Wave 1: the held-id lookups plus every sum and lookup that does not depend
  // on them. In-flight (requested but not yet completed) is already linked to a
  // request, so it is NOT part of `pending`; reported for display only.
  // batch9-review (2026-08-11): it must carry its own Commission status filter,
  // otherwise a linked PAID/REVERSED row would count here AND in `paid`.
  const [heldIds, unperformedIds, unfinishedIds, paid, inFlight, priestRow] = await Promise.all([
    upcomingWellnessEnrollmentIds(prisma, providerId),
    unperformedPujaBookingIds(prisma, providerId),
    unfinishedConsultationIds(prisma, providerId),
    sumCommissionAmounts({ providerId, status: 'PAID' }),
    sumCommissionAmounts({
      providerId,
      status: 'PENDING',
      payoutRequest: { status: { in: ['pending', 'processing'] } },
    }),
    // DI-05 legacy pandit rail lookup (see below). One indexed read that
    // misses for a non-pandit provider.
    prisma.priest.findUnique({ where: { userId: providerId }, select: { id: true } }),
  ]);
  const heldPujaIds = [...unperformedIds, ...unfinishedIds];

  // Wave 2: the three sums that need the held ids, and the legacy-rail read
  // (which needs only wave 1's priest row), all together. `pending` excludes held
  // rows; `upcoming*` is earned but not yet withdrawable.
  const legacyRail = async (): Promise<{ pending: Prisma.Decimal; paid: Prisma.Decimal }> => {
    let legacyPending = new Prisma.Decimal(0);
    let legacyPaid = new Prisma.Decimal(0);
    if (!priestRow) return { pending: legacyPending, paid: legacyPaid };
    // Exclude any booking the unified rail already owns, so the two figures on
    // one screen can never restate the same rupee. Bounded by the provider's
    // own commission rows; the write side (services/provider-earning-mint.ts)
    // now keeps the rails mutually exclusive, so this only catches rows that
    // predate that guard.
    const ownedByUnified = await prisma.commission.findMany({
      where: { providerId, bookingId: { not: null } },
      select: { bookingId: true },
      take: LEGACY_RAIL_SCAN_CAP,
    });
    const ownedIds = Array.from(
      new Set(ownedByUnified.map((c) => c.bookingId).filter((id): id is string => !!id)),
    );

    const sidecar = await prisma.priestPayout.findMany({
      where: {
        priestId: priestRow.id,
        ...(ownedIds.length ? { bookingId: { notIn: ownedIds } } : {}),
      },
      select: { bookingId: true, amount: true, status: true },
      take: LEGACY_RAIL_SCAN_CAP,
    });

    for (const row of sidecar) {
      const amount = new Prisma.Decimal(row.amount ?? 0);
      if (row.status === 'completed') legacyPaid = legacyPaid.add(amount);
      else if (row.status === 'pending' || row.status === 'processing') {
        legacyPending = legacyPending.add(amount);
      }
    }
    return { pending: legacyPending, paid: legacyPaid };
  };

  const [pending, upcomingWellness, upcomingPuja, legacy] = await Promise.all([
    sumCommissionAmounts({
      providerId,
      status: 'PENDING',
      payoutRequestId: null,
      ...notHeldWellness(heldIds),
      ...notHeldPuja(heldPujaIds),
    }),
    heldIds.length
      ? sumCommissionAmounts({
          providerId,
          status: 'PENDING',
          payoutRequestId: null,
          wellnessEnrollmentId: { in: heldIds },
        })
      : Promise.resolve(new Prisma.Decimal(0)),
    heldPujaIds.length
      ? sumCommissionAmounts({
          providerId,
          status: 'PENDING',
          payoutRequestId: null,
          bookingId: { in: heldPujaIds },
        })
      : Promise.resolve(new Prisma.Decimal(0)),
    legacyRail(),
  ]);
  const upcoming = upcomingWellness.add(upcomingPuja);
  const legacyPending = legacy.pending;
  const legacyPaid = legacy.paid;

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
  // ── DI-05: the LEGACY pandit rail, reported rather than silently omitted ──
  //
  // Everything above reads the Commission ledger and nothing else, so a pandit
  // whose earnings sit on the sidecar `PriestPayout` rail saw his money on
  // /priest/payouts and Rs 0 here — on apps/web/app/payouts/page.tsx, which is
  // role-gated to include 'priest' and is where /settings/earnings redirects.
  // Same pandit, same money, two screens, two answers.
  //
  // It is reported SEPARATELY and deliberately NOT folded into `availableInr`.
  // That figure gates POST /payouts/request, and requestPayout sizes the actual
  // PayoutRequest from Commission rows inside its transaction (RV-06). Adding
  // sidecar money to it would clear the MIN_PAYOUT_INR gate on money this rail
  // cannot settle and would fail after promising a balance — and it is the
  // exact shape of the double-pay the two-rail invariant exists to prevent.
  // The sidecar rail is settled by its own process (admin/bookings).
  //
  // Costs a non-pandit provider ONE indexed lookup that misses.
  // Decimal all the way through; converted to number only at this boundary,
  // where the value stops being money and becomes a display/API field.
  return {
    availableInr: pending.toDecimalPlaces(2).toNumber(),
    upcomingInr: upcoming.toDecimalPlaces(2).toNumber(),
    pendingInr: inFlight.toDecimalPlaces(2).toNumber(),
    paidOutInr: paid.toDecimalPlaces(2).toNumber(),
    legacyPandit: {
      hasLegacyRail: Boolean(priestRow),
      pendingInr: legacyPending.toDecimalPlaces(2).toNumber(),
      paidOutInr: legacyPaid.toDecimalPlaces(2).toNumber(),
    },
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
 * batch9-review (2026-08-11): both payout transactions ran on Prisma's defaults
 * (maxWait 2s / timeout 5s). The RV-06 design below depends on the LOSING
 * transaction blocking on the winner's row locks inside `commission.updateMany`
 * and then re-evaluating its predicate — if the winner holds those locks past
 * 5s, Prisma kills the loser with P2028 "Transaction already closed" before the
 * linked-count guard can run, and the route surfaces that raw engine message
 * instead of PAYOUT_CONCURRENT_REQUEST_ERROR ("try again in a moment"). Nothing
 * is mispaid either way — the transaction still rolls back — but the retry
 * affordance the guard exists to give is lost. The 2s maxWait is the other half:
 * under connection-pool pressure during a weekly settlement burst it rejects a
 * request outright rather than waiting for a connection.
 */
const TX_OPTS = { timeout: 15_000, maxWait: 5_000 } as const;

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
    const heldIds = await upcomingWellnessEnrollmentIds(tx, providerId);
    const heldPujaIds = [
      ...(await unperformedPujaBookingIds(tx, providerId)),
      ...(await unfinishedConsultationIds(tx, providerId)),
    ];
    const rows = await tx.commission.findMany({
      where: {
        providerId,
        status: 'PENDING',
        payoutRequestId: null,
        ...notHeldWellness(heldIds),
        ...notHeldPuja(heldPujaIds),
      },
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
  }, TX_OPTS);

  // OPS-05 — after the transaction RESOLVES. `created.amount` is the figure
  // the transaction actually sized from the rows it linked, not the advisory
  // pre-check balance, so the trail agrees with the ledger.
  await recordMoneyEvent({
    eventType: MONEY_EVENTS.PAYOUT_REQUESTED,
    actorType: 'provider',
    actorId: providerId,
    subjectType: 'payout',
    subjectId: created.id,
    payoutId: created.id,
    amount: created.amount,
    statusAfter: 'pending',
    idempotencyKey: created.id,
    note: `${role} payout requested via ${method}`,
    metadata: { role, method, kycVerified: kyc.verified, skipKyc: opts.skipKyc === true },
  }).catch(() => undefined);

  // Notify the provider the request is in (fire-and-forget).
  await settleBounded(notifyUser(providerId, {
    title: 'Payout requested',
    body: `Your payout of ₹${Number(created.amount).toLocaleString('en-IN')} is being processed.`,
    url: '/payouts',
  }), 'payout');
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
  // `changed` is false only on the already-completed short-circuit below, which
  // resolves normally and therefore used to fall straight into the notification
  // block — every repeat click on Complete (and every retry of
  // POST /payout-requests/:id/process) pushed another "Your payout of ₹9,000 has
  // been sent." for a transfer that happened once. A provider who gets three of
  // those reasonably opens a ticket asking where the other ₹18,000 is.
  // OPS-05: the pre-image, captured for the audit trail only. `req` outside the
  // transaction is the POST-update row, so the status this call transitioned
  // FROM is unrecoverable afterwards — and it is the field that separates
  // "completed a pending request" from "completed a rejected one", which is the
  // exact hollow-request vector the guards below exist to refuse. Written to a
  // closure variable rather than threaded through the return shape so no
  // existing caller of processPayout sees a different object.
  let statusBefore: string | null = null;
  const { req, changed } = await prisma.$transaction(async (tx) => {
    const req = await tx.payoutRequest.findUnique({ where: { id: payoutId } });
    if (!req) throw new Error('Payout request not found.');
    statusBefore = req.status;
    if (req.status === 'completed') return { req, changed: false };

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
      return { req: updated, changed: true };
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
    return { req: updated, changed: true };
  }, TX_OPTS);

  if (changed) {
    // OPS-05 — after the transaction resolves. The money itself moves outside
    // this system (a bank/UPI transfer an admin performs by hand), so this row
    // is the platform's only durable statement of who authorised it, out of
    // what status, and against which external reference.
    await recordMoneyEvent({
      eventType:
        action === 'complete'
          ? MONEY_EVENTS.PAYOUT_PROCESSED
          : action === 'reject'
            ? MONEY_EVENTS.PAYOUT_REJECTED
            : MONEY_EVENTS.PAYOUT_FAILED,
      actorType: 'admin',
      actorId: adminId,
      subjectType: 'payout',
      subjectId: req.id,
      payoutId: req.id,
      amount: req.amount,
      statusBefore,
      statusAfter: req.status,
      // The payout id alone would collapse a reject followed by a later
      // complete into one row; the writer namespaces by event type, so the
      // two distinct events survive while a retry of the same one does not.
      idempotencyKey: req.id,
      note: failureReason ?? reference ?? null,
      metadata: {
        action,
        providerId: req.providerId,
        role: req.role,
        reference: (req as { reference?: string | null }).reference ?? reference ?? null,
      },
    }).catch(() => undefined);

    await settleBounded(notifyUser(req.providerId, {
      title: action === 'complete' ? 'Payout sent' : 'Payout update',
      body:
        action === 'complete'
          ? `Your payout of ₹${Number(req.amount).toLocaleString('en-IN')} has been sent.`
          : `Your payout could not be completed${failureReason ? `: ${failureReason}` : ''}. Your balance is intact.`,
      url: '/payouts',
    }), 'payout');

    // NOTIF-16: and off push, where the provider actually is.
    await settleBounded(fanOutPayoutSettled({
      providerId: req.providerId,
      amount: new Prisma.Decimal(req.amount),
      status: req.status as 'completed' | 'rejected' | 'failed',
      reference: (req as { reference?: string | null }).reference ?? reference ?? null,
      failureReason: failureReason ?? null,
    }), 'payout');
  }

  // DI-10: tell the caller whether this call CHANGED anything.
  //
  // The money moves outside the system — a bank/UPI transfer an admin performs
  // by hand — so the only signal that the first click already recorded it is
  // this response. Five concurrent completes and a later sequential one all
  // returned HTTP 200 with identical bodies; the ledger was correct (₹2,310
  // flipped to PAID exactly once) but the human had no way to know, which
  // invites a second real-world transfer the software will never see.
  //
  // Spread rather than a wrapper object so every existing caller that reads
  // `.status` / `.amount` off the return value keeps working unchanged.
  return { ...req, alreadyCompleted: !changed };
}

/**
 * NOTIF-16 — reach the provider on the channels they actually have.
 *
 * Both payout notifications were a bare `notifyUser`, i.e. web push and nothing
 * else, against a `push_subscriptions` table holding one row in the entire
 * database. Every seeded user has an email AND a phone on the User row, so both
 * alternatives were available and unused.
 *
 * Entirely best-effort and never awaited: a mail provider having a bad minute
 * must not fail an admin's "mark this payout complete", which has already
 * committed. Every leg is recorded with its true outcome — an unconfigured
 * channel is logged as `skipped`, never as `sent` (NOTIF-03).
 */
async function fanOutPayoutSettled(params: {
  providerId: string;
  amount: Prisma.Decimal;
  status: 'completed' | 'rejected' | 'failed';
  reference: string | null;
  failureReason: string | null;
}): Promise<void> {
  const { providerId, amount, status, reference, failureReason } = params;
  try {
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: { email: true, phone: true, fullName: true },
    });
    if (!provider) return;

    const display = `₹${amount.toFixed(2)}`;
    const name = provider.fullName ?? 'there';

    let emailLeg = 'no-target';
    if (provider.email) {
      const tpl = payoutSettledEmail({
        providerName: name,
        amount: display,
        status,
        reference,
        failureReason,
      });
      const res = await sendEmail({ to: provider.email, ...tpl });
      emailLeg = res.ok ? 'sent' : res.skipped ? 'skipped' : 'failed';
    }

    let whatsappLeg = 'no-target';
    if (provider.phone) {
      // The template name matches the Meta-approved set in
      // docs/company/whatsapp-templates-booking-2026-08-04.md. Until the owner
      // approves it there, the client answers `{skipped:true}` — recorded as
      // skipped below, which is the honest reading.
      const res = await sendWhatsappTemplate({
        to: provider.phone,
        template: status === 'completed' ? 'payout_sent' : 'payout_failed',
        variables:
          status === 'completed'
            ? [name, display, reference ?? '-']
            : [name, display, failureReason ?? 'a bank issue'],
      });
      whatsappLeg = res.ok ? 'sent' : res.skipped ? 'skipped' : 'failed';
    }

    await recordNotification({
      userId: providerId,
      audience: 'priest',
      event: status === 'completed' ? 'payout_completed' : 'payout_not_completed',
      title: status === 'completed' ? 'Payout sent' : 'Payout update',
      body:
        status === 'completed'
          ? `Your payout of ${display} has been sent.${reference ? ` Reference ${reference}.` : ''}`
          : `Your payout of ${display} could not be completed${failureReason ? `: ${failureReason}` : ''}. Your balance is intact.`,
      url: '/payouts',
      push: 'no-target',
      whatsapp: whatsappLeg,
      email: emailLeg,
      delivered: emailLeg === 'sent' || whatsappLeg === 'sent',
    });
  } catch (err) {
    console.warn(
      '[payout][NOTIF-16] settlement fan-out failed:',
      err instanceof Error ? err.message : String(err),
    );
  }
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
  //
  // SCAL-04 (2026-08-19): was `findMany({ select: { providerId }, distinct })`.
  // Prisma's `distinct` is applied in the CLIENT, not in SQL — Postgres returns
  // EVERY matching commission row and the driver dedupes them in memory, so a
  // ledger with 200k pending rows across 500 providers materialised 200k rows to
  // produce 500. This is the same materialise-then-distinct shape already
  // retired at admin-metrics.ts:99; `groupBy` pushes the DISTINCT into SQL and
  // returns one row per provider.
  //
  // Cron-only, so there was no request-path risk — it was simply the last
  // instance of a pattern this finding had already replaced everywhere else.
  const providers = await prisma.commission.groupBy({
    by: ['providerId'],
    where: { status: 'PENDING', payoutRequestId: null },
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

/**
 * Every value PayoutRequest.status can hold. Exported so the admin route can
 * build its query schema from this list instead of keeping a second copy that
 * drifts (note `reversed` exists on ProviderPayoutStatus but NOT here).
 */
export const PAYOUT_REQUEST_STATUSES: readonly PayoutRequestStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected',
];

function isPayoutRequestStatus(value: string): value is PayoutRequestStatus {
  return (PAYOUT_REQUEST_STATUSES as readonly string[]).includes(value);
}

/** Admin: list payout requests (filterable by status). */
export async function listPayoutRequests(status?: string) {
  // batch9-review (2026-08-11): the route reads `request.query.status` with no
  // schema and this forwarded it to Prisma as `status as never` — the cast was
  // the only reason it compiled. Any value that is not a PayoutRequestStatus
  // (wrong case, a typo, or the 'reversed' that migration 20260810000000 added
  // to ProviderPayoutStatus but NOT to this enum) threw
  // PrismaClientValidationError out of an unhandled handler, so the whole admin
  // payout queue 500'd. No request can hold such a status, so the honest answer
  // is the empty set — never an engine crash, and never the unfiltered list,
  // which would silently answer a different question than the one asked.
  // An empty string is the "All" filter, not a bad value.
  let statusFilter: PayoutRequestStatus | undefined;
  if (status) {
    if (!isPayoutRequestStatus(status)) return [];
    statusFilter = status;
  }

  const requests = await prisma.payoutRequest.findMany({
    where: statusFilter ? { status: statusFilter } : {},
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

  // The transfer happens outside this system, so the admin needs the payee's
  // bank details in front of them. Only for requests still awaiting transfer:
  // a settled request has no use for an account number in a list view.
  const pendingProviderIds = [...new Set(requests.filter((r) => r.status === 'pending').map((r) => r.providerId))];
  const payToById = new Map<string, { holderName: string | null; accountNumber: string; ifsc: string }>();
  if (pendingProviderIds.length) {
    const kyc = await prisma.$queryRawUnsafe<
      Array<{ user_id: string; bank_account_number: string | null; bank_ifsc: string | null; bank_holder_name: string | null }>
    >(
      `SELECT user_id, bank_account_number, bank_ifsc, bank_holder_name FROM provider_kyc WHERE user_id = ANY($1::uuid[])`,
      pendingProviderIds,
    );
    for (const k of kyc) {
      if (k.bank_account_number && k.bank_ifsc) {
        payToById.set(k.user_id, { holderName: k.bank_holder_name, accountNumber: k.bank_account_number, ifsc: k.bank_ifsc });
      }
    }
  }

  return requests.map((r) => {
    const linked = linkedById.get(r.id);
    return {
      ...r,
      payTo: r.status === 'pending' ? (payToById.get(r.providerId) ?? null) : null,
      amount: r.amount.toString(),
      providerName: byId.get(r.providerId)?.fullName ?? 'Unknown',
      providerEmail: byId.get(r.providerId)?.email ?? null,
      linkedCommissionCount: linked?._count._all ?? 0,
      linkedCommissionTotal: (linked?._sum.amount ?? new Prisma.Decimal(0)).toString(),
    };
  });
}
