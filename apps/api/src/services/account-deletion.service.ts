/**
 * account-deletion.service.ts — in-app account deletion (LC-DEL, 2026-09-03).
 *
 * WHY THIS EXISTS. Apple Guideline 5.1.1(v) makes in-app account deletion
 * mandatory for any app that supports account creation, and Google Play requires
 * both an in-app path and a publicly reachable web deletion-request URL. Darshya
 * had neither — zero matches for account deletion across mobile, API and web —
 * which makes it a certain rejection on both stores.
 *
 * ─── THE ONE DECISION EVERYTHING ELSE FOLLOWS FROM ──────────────────────────
 *
 * THE `users` ROW IS NEVER DELETED. It is anonymised in place and left standing
 * as a tombstone. That is not a soft option chosen over a "real" delete; a real
 * delete is both impossible and destructive on this schema:
 *
 *   IMPOSSIBLE — `puja_bookings.user_id`, `payments.user_id` and
 *   `subscriptions.user_id` are REQUIRED relations declared with no `onDelete`,
 *   so they carry Prisma's default referential action, RESTRICT. `DELETE FROM
 *   users` raises a foreign-key error the moment the account has one booking.
 *
 *   DESTRUCTIVE — `donations.user_id`, `store_orders.user_id`,
 *   `wellness_enrollments.user_id`, `chat_conversations`, `support_tickets` and
 *   fifteen others are ON DELETE CASCADE. A delete that DID succeed would
 *   silently destroy donation receipts, store orders and paid enrollments —
 *   financial records Indian income-tax and accounting rules require be kept for
 *   years, and the exact opposite of what a deletion feature is for.
 *
 * Anonymising in place gets both halves right at once: every foreign key stays
 * valid so the ledger remains referentially whole and reconcilable, while the
 * identity behind it is destroyed. The surviving id is a pseudonym that resolves
 * to nobody.
 *
 * ─── THE RETENTION POLICY ───────────────────────────────────────────────────
 *
 * HARD DELETE — name, email, phone, birth/astrology details, addresses, device
 * push tokens, message bodies the user authored, support-ticket bodies, auth
 * identity rows, KYC bank/Aadhaar details.
 *
 * ANONYMISE AND RETAIN — bookings, payments, commissions, payout requests,
 * temple payouts, donations. Amounts, dates, booking numbers and gateway
 * references stay; identity is severed and every DENORMALISED copy of a name,
 * email, phone or address that was written onto those rows is stripped. Those
 * denormalised copies are the real leak, and this schema has six of them:
 * `puja_bookings.devotee_names`, `puja_bookings.sankalp_details`,
 * `store_orders.shipping_address`, `antim_sanskar_bookings.contact_*`,
 * `astrologer_consultations.astrologer_name` and `yatra_bookings.buyer_*`.
 *
 * ─── GRACE PERIOD (default) ─────────────────────────────────────────────────
 *
 * Confirmation opens a 30-day window; a sweep purges after it. The account stays
 * usable during the window so the owner can cancel, which is the whole point:
 * Darshya has NO password column — every credential is an OTP or a magic link —
 * so a SIM swap or a forwarded email is a complete account takeover, and a
 * one-tap irreversible wipe would hand an attacker a destroy button over a
 * devotee's booking history and wallet balance. `immediate: true` is offered for
 * a caller who explicitly wants it now; it is still gated on the same fresh
 * confirmation code, so it is a second factor either way.
 *
 * ─── SUPABASE ───────────────────────────────────────────────────────────────
 *
 * Credentials live in Supabase Auth, not here — `routes/auth.ts` signup uses the
 * Supabase `auth.users.id` AS this table's primary key ("We use the Supabase
 * auth.users.id as our primary key so foreign keys line up"). Scrubbing the
 * application row alone would leave a working credential that authenticates and
 * re-creates the account. `purgeAccount` therefore also calls
 * `supabaseAdmin.auth.admin.deleteUser(userId)`. Accounts minted by the
 * WhatsApp-OTP path have a locally generated uuid and no Supabase identity at
 * all; that call returning "not found" is the expected outcome for them, not a
 * failure. Any other failure is surfaced as a warning and re-attempted on the
 * next purge run, never swallowed.
 */

import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { supabaseAdmin, isDemoMode } from '../lib/supabase.js';
import { sendWhatsappTemplate, whatsapp } from '../lib/whatsapp.js';
import { sendEmail } from '../lib/email.js';
// TC-01's honesty gate. Retaining a donor's PAN is only defensible while a
// Section 80G(5) certificate actually exists to be issued against it, so the
// retention branch below reads the same flag every other 80G claim in this
// codebase is gated on rather than asserting a regime we do not operate.
import { HAS_80G } from '../lib/eighty-g.js';
import { SQL_UTC_NOW } from '../lib/sql-time.js';

// ─── Tunables ────────────────────────────────────────────────────────────────

/** Days between confirmation and irreversible purge. */
export const GRACE_PERIOD_DAYS = Number(process.env.ACCOUNT_DELETION_GRACE_DAYS ?? 30);

/** How long a confirmation code is valid. */
export const CODE_TTL_MIN = 15;

/** Wrong codes tolerated before the request is burned. */
export const MAX_CODE_ATTEMPTS = 5;

/**
 * Retain `donations.donor_pan` on donations that actually produced a receipt.
 *
 * Gated on `HAS_80G`, not merely on an env var, and that is the whole point.
 * Section 80G(5)/Form 10BE is the ONLY reason a donor's PAN is worth keeping
 * past erasure — and `lib/eighty-g.ts` records that Darshya has no 80G
 * certificate on file. While that is false there is no certificate to reissue,
 * therefore no retention basis, therefore the PAN goes. The day the founder
 * files and flips that flag, retention starts by itself.
 *
 * The env var can only ever turn retention OFF, never on: no environment
 * variable should be able to manufacture a legal basis that does not exist.
 */
export const RETAIN_80G_PAN =
  HAS_80G && process.env.ACCOUNT_DELETION_RETAIN_80G_PAN !== 'false';

/**
 * Retain `provider_kyc.pan_number` for a provider who was actually PAID.
 *
 * Deliberately a SEPARATE decision from the 80G one above — they were one flag
 * in the first draft and that was wrong. A payee's PAN is required for TDS
 * reporting (Form 26Q under s.194-O/194J), an obligation that exists whether or
 * not the platform has an 80G certificate. Bank account, IFSC, holder name and
 * the Aadhaar hash are destroyed either way: none of them are reportable.
 */
export const RETAIN_PAYEE_PAN = process.env.ACCOUNT_DELETION_RETAIN_PAYEE_PAN !== 'false';

/** The name a tombstoned user reads as everywhere in the product. */
export const TOMBSTONE_NAME = 'Deleted User';

const TOMBSTONE_BLOCK_REASON = 'Account deleted at the user’s request';

/**
 * Booking states that still owe someone something. Deleting an account mid-puja
 * would strand the devotee (paid, undelivered) or the pandit (delivered,
 * unpaid), so they are a refusal rather than a silent anonymisation.
 * `completed` / `delivered` / `cancelled` / `refunded` are terminal and fine.
 */
export const ACTIVE_BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'priest_assigned',
  'in_progress',
  'video_uploaded',
] as const;

/** Store orders paid for but not yet delivered or cancelled. */
export const ACTIVE_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] as const;

/** Payout requests where money is already moving. */
export const ACTIVE_PAYOUT_STATUSES = ['pending', 'processing'] as const;

/**
 * Ceiling on `UserRoleAssignment` rows for one account: the `UserRole` enum has
 * 8 values and the table carries `@@unique([userId, role])`, so this is a real
 * bound rather than a page size. Doubled so a new role does not silently
 * truncate the admin guard's view of who this account is.
 */
const MAX_ROLES_PER_USER = 16;

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * A refusal the CALLER can act on — "settle this, then come back". Carries a
 * stable machine code plus a human sentence, because a 500 on a legally
 * mandated flow is an App Store rejection and a support ticket at the same time.
 */
export class AccountDeletionBlockedError extends Error {
  readonly statusCode = 409;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AccountDeletionBlockedError';
    this.code = code;
    this.details = details;
  }
}

/** Bad or stale input from the client (wrong code, expired challenge, …). */
export class AccountDeletionInputError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'AccountDeletionInputError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type DeletionRequestStatus =
  | 'pending_confirmation'
  | 'scheduled'
  | 'purged'
  | 'cancelled'
  | 'expired';

export interface DeletionBlocker {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface DeletionEligibility {
  deletable: boolean;
  blockers: DeletionBlocker[];
  /** Non-blocking things the user must be TOLD before they confirm. */
  warnings: DeletionBlocker[];
}

export interface DeletionStatusView {
  status: 'none' | DeletionRequestStatus;
  requestId: string | null;
  requestedAt: string | null;
  confirmedAt: string | null;
  purgeAfter: string | null;
  purgedAt: string | null;
  daysRemaining: number | null;
  gracePeriodDays: number;
}

export interface PurgeResult {
  userId: string;
  purged: boolean;
  alreadyPurged: boolean;
  warnings: string[];
  supabase: { deleted: boolean; skipped: boolean; reason?: string };
}

type RawRow = Record<string, unknown>;

/**
 * The subset of the Prisma client this service uses. Declared structurally
 * rather than as `Prisma.TransactionClient` so a unit test can hand in a
 * recording fake without reproducing the entire generated client — the same
 * reason `lib/__mocks__/prisma.ts` exists.
 */
type Db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [model: string]: any;
  $transaction: (fn: (tx: unknown) => Promise<unknown>, opts?: unknown) => Promise<unknown>;
  $queryRawUnsafe: (sql: string, ...args: unknown[]) => Promise<unknown>;
  $executeRawUnsafe: (sql: string, ...args: unknown[]) => Promise<unknown>;
};

interface LoadedUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  language: string;
  deletedAt: Date | null;
  deletionPurgeAfter: Date | null;
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function generateCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Constant-time compare of two hex digests. `===` on a secret leaks its prefix
 * through timing; the codes are only six digits, so that matters more here than
 * usual.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function rowGet<T = unknown>(row: RawRow | undefined, key: string): T | undefined {
  if (!row) return undefined;
  return row[key] as T | undefined;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const n = Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Run a statement that is allowed to fail without failing the purge.
 *
 * Several tables in this app are created LAZILY by the route that first needs
 * them (`astrologer_consultations`, `yatra_bookings`, `gift_puja_orders`,
 * `marketplace_api_keys`, `notification_log`, …), so on a given database
 * "relation does not exist" is normal rather than an error. Anything else is
 * collected as a warning: the purge is idempotent, so a later re-run retries it.
 *
 * CRUCIALLY, none of these run inside the transaction. A failed statement inside
 * a Postgres transaction poisons the whole transaction — there is no catching
 * your way past 42P01 once it has fired — so best-effort work has to happen
 * outside it, before the tombstone stamp that marks the purge done.
 */
async function bestEffort(
  label: string,
  warnings: string[],
  fn: () => Promise<unknown>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist|42P01|undefined_table|undefined column|42703/i.test(msg)) return;
    warnings.push(`${label}: ${msg}`);
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AccountDeletionService {
  private readonly db: Db;

  constructor(db: Db = prisma as unknown as Db) {
    this.db = db;
  }

  // ── Eligibility ────────────────────────────────────────────────────────────

  /**
   * Everything that would make this deletion the wrong thing to do right now.
   *
   * Returns rather than throws so the request endpoint can show the user ALL the
   * reasons at once instead of one per round trip.
   */
  async checkEligibility(userId: string): Promise<DeletionEligibility> {
    const blockers: DeletionBlocker[] = [];
    const warnings: DeletionBlocker[] = [];

    const [roles, priest, store] = await Promise.all([
      // Bounded, and provably so: `UserRoleAssignment` carries `@@unique([userId,
      // role])` over an 8-value enum, so a user cannot hold more rows than there
      // are roles. The `take` is what keeps this off the SCAL-04 unbounded-
      // findMany ratchet (lib/unbounded-findmany.scal04.test.ts) rather than a
      // guess at a sensible page size.
      this.db.userRoleAssignment.findMany({
        where: { userId },
        select: { role: true },
        take: MAX_ROLES_PER_USER,
      }),
      this.db.priest.findUnique({ where: { userId }, select: { id: true } }),
      this.db.storeProfile.findUnique({ where: { userId }, select: { id: true } }),
    ]);

    const roleNames: string[] = (roles ?? []).map((r: { role: string }) => r.role);

    // 1. THE LAST ADMIN. An admin who deletes themselves out of a zero-admin
    //    state locks every human out of /admin permanently — no approvals, no
    //    payouts, no refunds — and there is no bootstrap path back in except an
    //    operator editing the database by hand. `blocked: false` is the right
    //    predicate because a purged admin is left `blocked = true`, so already
    //    tombstoned admins correctly do not count toward the quorum.
    if (roleNames.includes('ADMIN')) {
      const otherAdmins = toNumber(
        await this.db.userRoleAssignment.count({
          where: { role: 'ADMIN', userId: { not: userId }, user: { blocked: false } },
        }),
      );
      if (otherAdmins < 1) {
        blockers.push({
          code: 'LAST_ADMIN',
          message:
            'You are the only active administrator. Grant the admin role to another account first, then delete this one.',
        });
      }
    }

    // 2. MONEY ALREADY MOVING. A payout mid-flight is a bank transfer an admin
    //    is performing by hand; anonymising the payee underneath it makes the
    //    transfer unreconcilable.
    const inFlightPayouts = toNumber(
      await this.db.payoutRequest.count({
        where: { providerId: userId, status: { in: [...ACTIVE_PAYOUT_STATUSES] } },
      }),
    );
    if (inFlightPayouts > 0) {
      blockers.push({
        code: 'PAYOUT_IN_FLIGHT',
        message: `You have ${inFlightPayouts} payout request(s) still being processed. Wait for them to settle (or ask support to cancel them), then delete your account.`,
        details: { count: inFlightPayouts },
      });
    }

    // 3. UNWITHDRAWN EARNINGS. Deleting here would forfeit real money the
    //    provider has already earned, silently.
    const balance = await this.db.commission.aggregate({
      _sum: { amount: true },
      where: { providerId: userId, status: 'PENDING', payoutRequestId: null },
    });
    const unpaid = toNumber(balance?._sum?.amount);
    if (unpaid > 0) {
      blockers.push({
        code: 'UNSETTLED_EARNINGS',
        message: `You have ₹${unpaid.toFixed(2)} of unpaid earnings. Withdraw them (Payouts → Request payout) before deleting your account.`,
        details: { amountInr: unpaid },
      });
    }

    // 4. IN-FLIGHT BOOKINGS, both sides of the marketplace.
    const asDevotee = toNumber(
      await this.db.pujaBooking.count({
        where: { userId, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      }),
    );
    const asPriest = priest?.id
      ? toNumber(
          await this.db.pujaBooking.count({
            where: { priestId: priest.id, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
          }),
        )
      : 0;
    if (asDevotee > 0) {
      blockers.push({
        code: 'BOOKING_IN_FLIGHT',
        message: `You have ${asDevotee} booking(s) that are not finished yet. Let them complete, or cancel them, then delete your account.`,
        details: { count: asDevotee, side: 'devotee' },
      });
    }
    if (asPriest > 0) {
      blockers.push({
        code: 'ASSIGNED_BOOKING_IN_FLIGHT',
        message: `You are assigned to ${asPriest} booking(s) that devotees have paid for. Complete or hand them back before deleting your account.`,
        details: { count: asPriest, side: 'provider' },
      });
    }

    // 5. STORE ORDERS owed in either direction.
    const ordersPlaced = toNumber(
      await this.db.storeOrder.count({
        where: { userId, status: { in: [...ACTIVE_ORDER_STATUSES] } },
      }),
    );
    const ordersToShip = store?.id
      ? toNumber(
          await this.db.storeOrder.count({
            where: { storeProfileId: store.id, status: { in: [...ACTIVE_ORDER_STATUSES] } },
          }),
        )
      : 0;
    if (ordersPlaced > 0) {
      blockers.push({
        code: 'ORDER_IN_FLIGHT',
        message: `You have ${ordersPlaced} order(s) still being fulfilled. Wait for delivery or cancel them first.`,
        details: { count: ordersPlaced, side: 'buyer' },
      });
    }
    if (ordersToShip > 0) {
      blockers.push({
        code: 'STORE_ORDER_UNFULFILLED',
        message: `Your store has ${ordersToShip} order(s) that customers have paid for and not received. Fulfil or refund them before deleting your account.`,
        details: { count: ordersToShip, side: 'seller' },
      });
    }

    // 6. WELLNESS SESSIONS people have already paid to attend.
    const upcomingSessions = toNumber(
      await this.db.wellnessSession.count({
        where: { instructorId: userId, status: { in: ['SCHEDULED', 'LIVE'] } },
      }),
    );
    if (upcomingSessions > 0) {
      blockers.push({
        code: 'SESSION_SCHEDULED',
        message: `You have ${upcomingSessions} scheduled wellness session(s) with enrolled devotees. Cancel or complete them first.`,
        details: { count: upcomingSessions },
      });
    }

    // 7. WALLET CREDIT is a WARNING, not a blocker, and the distinction is
    //    deliberate. Credit can only be SPENT, never withdrawn, so blocking on a
    //    non-zero balance would make some accounts permanently undeletable —
    //    which is itself the store violation this whole feature exists to fix.
    //    The user is told the exact amount and must acknowledge forfeiting it.
    const credit = await this.db.userCredit.findUnique({
      where: { userId },
      select: { balancePaise: true },
    });
    const paise = toNumber(credit?.balancePaise);
    if (paise > 0) {
      warnings.push({
        code: 'WALLET_BALANCE_FORFEIT',
        message: `Your wallet holds ₹${(paise / 100).toFixed(2)}. It cannot be withdrawn and will be forfeited when the account is deleted.`,
        details: { balancePaise: paise, balanceInr: paise / 100 },
      });
    }

    return { deletable: blockers.length === 0, blockers, warnings };
  }

  // ── Request ────────────────────────────────────────────────────────────────

  /**
   * Step 1: run the guards, mint a single-use confirmation code, deliver it on
   * whichever rail this account actually has, and open a request row.
   *
   * The code IS the confirmation step. A one-tap irreversible wipe is the wrong
   * design for a product whose only credential is a 6-digit OTP or a 72-hour
   * magic link, and there is no password to re-prompt for — `User` has no
   * password column at all. Re-proving control of the phone or mailbox is the
   * strongest identity check this codebase can actually perform.
   */
  async requestDeletion(
    userId: string,
    opts: { reason?: string; acknowledgeForfeit?: boolean } = {},
  ): Promise<{
    requestId: string;
    channel: string;
    expiresInSec: number;
    gracePeriodDays: number;
    warnings: DeletionBlocker[];
    devCode?: string;
  }> {
    const user = await this.loadUser(userId);
    if (!user) throw new AccountDeletionInputError('USER_NOT_FOUND', 'Account not found', 404);
    if (user.deletedAt) {
      throw new AccountDeletionInputError(
        'ALREADY_DELETED',
        'This account has already been deleted.',
        410,
      );
    }

    const eligibility = await this.checkEligibility(userId);
    if (!eligibility.deletable) {
      const first = eligibility.blockers[0]!;
      throw new AccountDeletionBlockedError(first.code, first.message, {
        blockers: eligibility.blockers,
      });
    }

    // Forfeiting real money requires the user to have SEEN the number. The first
    // call returns the warning and refuses; the client shows it and calls again
    // with acknowledgeForfeit.
    const forfeit = eligibility.warnings.find((w) => w.code === 'WALLET_BALANCE_FORFEIT');
    if (forfeit && !opts.acknowledgeForfeit) {
      throw new AccountDeletionBlockedError('WALLET_BALANCE_FORFEIT', forfeit.message, {
        ...forfeit.details,
        requiresAcknowledgement: 'acknowledgeForfeit',
      });
    }

    const code = generateCode();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000);
    const channel = user.phone ? 'whatsapp' : user.email ? 'email' : 'none';

    // Supersede any live request rather than colliding with the partial unique
    // index — a user who taps "delete" twice gets a fresh code, not a 500.
    await this.db.$executeRawUnsafe(
      `UPDATE "account_deletion_requests"
          SET "status" = 'expired', "updated_at" = now()
        WHERE "user_id" = $1::uuid AND "status" = 'pending_confirmation'`,
      userId,
    );

    const rows = (await this.db.$queryRawUnsafe(
      `INSERT INTO "account_deletion_requests"
         ("user_id", "status", "code_hash", "code_expires_at", "code_attempts", "channel", "reason")
       VALUES ($1::uuid, 'pending_confirmation', $2, $3::timestamptz, 0, $4, $5)
       RETURNING "id"`,
      userId,
      codeHash,
      expiresAt.toISOString(),
      channel,
      opts.reason ?? null,
    )) as RawRow[];

    const requestId = String(rowGet<string>(rows?.[0], 'id') ?? '');
    const delivered = await this.deliverCode(user, code);

    return {
      requestId,
      channel: delivered.channel,
      expiresInSec: CODE_TTL_MIN * 60,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      warnings: eligibility.warnings,
      // Mirrors routes/whatsapp-otp.ts: with no delivery rail configured the
      // code comes back in the response so a dev — or a store reviewer on a
      // staging build — can still complete the flow. Never returned when a real
      // rail actually accepted the message.
      ...(delivered.devCode ? { devCode: delivered.devCode } : {}),
    };
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  /**
   * Step 2: verify the code, then either schedule the purge (default) or run it
   * now (`immediate`).
   */
  async confirmDeletion(
    userId: string,
    requestId: string,
    code: string,
    opts: { immediate?: boolean } = {},
  ): Promise<{
    status: 'scheduled' | 'purged';
    requestId: string;
    purgeAfter: string | null;
    gracePeriodDays: number;
    purge?: PurgeResult;
  }> {
    const rows = (await this.db.$queryRawUnsafe(
      `SELECT "id", "status", "code_hash", "code_expires_at", "code_attempts"
         FROM "account_deletion_requests"
        WHERE "id" = $1::uuid AND "user_id" = $2::uuid
        LIMIT 1`,
      requestId,
      userId,
    )) as RawRow[];

    const row = rows?.[0];
    if (!row) {
      throw new AccountDeletionInputError(
        'REQUEST_NOT_FOUND',
        'No deletion request found. Start again from Delete account.',
        404,
      );
    }

    const status = String(rowGet<string>(row, 'status') ?? '');
    if (status === 'purged') {
      throw new AccountDeletionInputError(
        'ALREADY_DELETED',
        'This account has already been deleted.',
        410,
      );
    }
    if (status !== 'pending_confirmation') {
      throw new AccountDeletionInputError(
        'REQUEST_NOT_PENDING',
        'That deletion request is no longer awaiting confirmation. Start again from Delete account.',
      );
    }

    const expiresAt = rowGet(row, 'code_expires_at');
    if (!expiresAt || new Date(String(expiresAt)).getTime() < Date.now()) {
      await this.db.$executeRawUnsafe(
        `UPDATE "account_deletion_requests" SET "status" = 'expired', "updated_at" = now() WHERE "id" = $1::uuid`,
        requestId,
      );
      throw new AccountDeletionInputError(
        'CODE_EXPIRED',
        'That confirmation code has expired. Request a new one.',
      );
    }

    const attempts = toNumber(rowGet(row, 'code_attempts'));
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await this.db.$executeRawUnsafe(
        `UPDATE "account_deletion_requests" SET "status" = 'expired', "updated_at" = now() WHERE "id" = $1::uuid`,
        requestId,
      );
      throw new AccountDeletionInputError(
        'TOO_MANY_ATTEMPTS',
        'Too many incorrect codes. Request a new one.',
        429,
      );
    }

    const expected = String(rowGet<string>(row, 'code_hash') ?? '');
    if (!expected || !timingSafeEqualHex(sha256(code.trim()), expected)) {
      await this.db.$executeRawUnsafe(
        `UPDATE "account_deletion_requests"
            SET "code_attempts" = "code_attempts" + 1, "updated_at" = now()
          WHERE "id" = $1::uuid`,
        requestId,
      );
      throw new AccountDeletionInputError('CODE_INCORRECT', 'Incorrect confirmation code.');
    }

    // The guards are re-run here, not just at request time: a booking can land
    // in the minutes between the two calls, and the confirm is the irreversible
    // one.
    const eligibility = await this.checkEligibility(userId);
    if (!eligibility.deletable) {
      const first = eligibility.blockers[0]!;
      throw new AccountDeletionBlockedError(first.code, first.message, {
        blockers: eligibility.blockers,
      });
    }

    // Burn the code the moment it is accepted — single use, whatever happens next.
    const purgeAfter = new Date(Date.now() + GRACE_PERIOD_DAYS * 86_400_000);
    await this.db.$executeRawUnsafe(
      `UPDATE "account_deletion_requests"
          SET "status" = 'scheduled',
              "code_hash" = NULL,
              "code_expires_at" = NULL,
              "confirmed_at" = now(),
              "purge_after" = $2::timestamptz,
              "updated_at" = now()
        WHERE "id" = $1::uuid`,
      requestId,
      purgeAfter.toISOString(),
    );

    await this.db.$executeRawUnsafe(
      `UPDATE "users"
          SET "deletion_requested_at" = now(),
              "deletion_purge_after" = $2::timestamptz,
              "updated_at" = ${SQL_UTC_NOW}
        WHERE "id" = $1::uuid`,
      userId,
      purgeAfter.toISOString(),
    );

    // Record the erasure against the DPDP surface that already exists
    // (routes/dpdp.ts files these by hand today) so the 30-day SLA dashboard and
    // the deletion flow are the same story rather than two.
    await bestEffort('dsar_requests', [], () =>
      this.db.$executeRawUnsafe(
        `INSERT INTO "dsar_requests" ("user_id", "kind", "note", "status", "sla_deadline")
         VALUES ($1::uuid, 'erasure', 'In-app account deletion', 'in_progress', now() + interval '30 days')`,
        userId,
      ),
    );

    // Stop every outbound channel NOW, not in 30 days. Someone who has asked to
    // be deleted should not keep receiving aarti pushes through the grace
    // window, and these rows carry no financial or regulatory value.
    await this.silenceChannels(userId);

    if (opts.immediate) {
      const purge = await this.purgeAccount(userId);
      return {
        status: 'purged',
        requestId,
        purgeAfter: null,
        gracePeriodDays: GRACE_PERIOD_DAYS,
        purge,
      };
    }

    return {
      status: 'scheduled',
      requestId,
      purgeAfter: purgeAfter.toISOString(),
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  /** Withdraw a scheduled deletion. Only possible before the purge runs. */
  async cancelDeletion(userId: string): Promise<{ cancelled: boolean }> {
    const user = await this.loadUser(userId);
    if (user?.deletedAt) {
      throw new AccountDeletionInputError(
        'ALREADY_DELETED',
        'This account has already been deleted and cannot be restored.',
        410,
      );
    }

    const rows = (await this.db.$queryRawUnsafe(
      `UPDATE "account_deletion_requests"
          SET "status" = 'cancelled', "cancelled_at" = now(), "code_hash" = NULL, "updated_at" = now()
        WHERE "user_id" = $1::uuid AND "status" IN ('pending_confirmation', 'scheduled')
        RETURNING "id"`,
      userId,
    )) as RawRow[];

    await this.db.$executeRawUnsafe(
      `UPDATE "users"
          SET "deletion_requested_at" = NULL, "deletion_purge_after" = NULL, "updated_at" = ${SQL_UTC_NOW}
        WHERE "id" = $1::uuid`,
      userId,
    );

    return { cancelled: (rows?.length ?? 0) > 0 };
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  async getStatus(userId: string): Promise<DeletionStatusView> {
    const rows = (await this.db.$queryRawUnsafe(
      `SELECT "id", "status", "requested_at", "confirmed_at", "purge_after", "purged_at"
         FROM "account_deletion_requests"
        WHERE "user_id" = $1::uuid
        ORDER BY "created_at" DESC
        LIMIT 1`,
      userId,
    )) as RawRow[];

    const row = rows?.[0];
    if (!row) {
      return {
        status: 'none',
        requestId: null,
        requestedAt: null,
        confirmedAt: null,
        purgeAfter: null,
        purgedAt: null,
        daysRemaining: null,
        gracePeriodDays: GRACE_PERIOD_DAYS,
      };
    }

    const purgeAfter = iso(rowGet(row, 'purge_after'));
    const status = String(rowGet<string>(row, 'status') ?? 'none') as DeletionRequestStatus;
    const daysRemaining =
      status === 'scheduled' && purgeAfter
        ? Math.max(0, Math.ceil((new Date(purgeAfter).getTime() - Date.now()) / 86_400_000))
        : null;

    return {
      status,
      requestId: String(rowGet<string>(row, 'id') ?? ''),
      requestedAt: iso(rowGet(row, 'requested_at')),
      confirmedAt: iso(rowGet(row, 'confirmed_at')),
      purgeAfter,
      purgedAt: iso(rowGet(row, 'purged_at')),
      daysRemaining,
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  // ── The purge ──────────────────────────────────────────────────────────────

  /**
   * Irreversibly anonymise the account. IDEMPOTENT: a second call on an already
   * tombstoned user returns `alreadyPurged` without touching a row, which is
   * what makes it safe to retry from the sweep after a partial failure.
   */
  async purgeAccount(userId: string): Promise<PurgeResult> {
    const warnings: string[] = [];

    const user = await this.loadUser(userId);
    if (!user) {
      throw new AccountDeletionInputError('USER_NOT_FOUND', 'Account not found', 404);
    }
    if (user.deletedAt) {
      return {
        userId,
        purged: false,
        alreadyPurged: true,
        warnings,
        supabase: { deleted: false, skipped: true, reason: 'already_purged' },
      };
    }

    // ── PHASE A — legacy / raw-SQL tables, best effort, OUTSIDE any transaction.
    await this.purgeLegacyTables(user, warnings);

    // ── PHASE B — everything Prisma models, in ONE transaction, FK-safe order,
    //    ending with the tombstone stamp so the whole thing is all-or-nothing.
    await this.db.$transaction(
      async (txRaw: unknown) => {
        const tx = txRaw as Db;
        await this.hardDeletePersonalRows(tx, user);
        await this.anonymiseProviderIdentity(tx, user);
        await this.anonymiseFinancialRows(tx, user);
        await this.tombstoneUser(tx, user);
      },
      // The default 5 s interactive-transaction budget is not enough for ~40
      // statements against a cold Supabase pooler on Render's free tier.
      { timeout: 60_000, maxWait: 15_000 },
    );

    // ── PHASE C — the credential itself. AFTER the transaction commits: an
    //    external HTTP call inside a Postgres transaction holds locks for the
    //    length of somebody else's network, which is the P1-12 anti-pattern this
    //    repo already documents for payment writes.
    const supabase = await this.deleteSupabaseIdentity(userId);
    if (!supabase.deleted && !supabase.skipped) {
      warnings.push(`supabase_auth: ${supabase.reason ?? 'unknown error'}`);
    }

    await this.db.$executeRawUnsafe(
      `UPDATE "account_deletion_requests"
          SET "status" = 'purged',
              "purged_at" = now(),
              "purge_after" = NULL,
              "warnings" = $2::jsonb,
              "updated_at" = now()
        WHERE "user_id" = $1::uuid AND "status" IN ('scheduled', 'pending_confirmation')`,
      userId,
      JSON.stringify(warnings),
    );

    return { userId, purged: true, alreadyPurged: false, warnings, supabase };
  }

  /**
   * Cron entry point. Anonymises every account whose grace period has elapsed.
   *
   * One account's failure never stops the sweep — a legacy table missing on this
   * database must not leave the other 200 due accounts un-purged, which would
   * turn a compliance feature into a compliance breach.
   */
  async runPurgeSweep(limit = 50): Promise<{
    due: number;
    purged: number;
    failed: number;
    warnings: string[];
  }> {
    const rows = (await this.db.$queryRawUnsafe(
      `SELECT "user_id"
         FROM "account_deletion_requests"
        WHERE "status" = 'scheduled'
          AND "purge_after" IS NOT NULL
          AND "purge_after" <= now()
        ORDER BY "purge_after" ASC
        LIMIT $1::int`,
      limit,
    )) as RawRow[];

    const due = rows?.length ?? 0;
    let purged = 0;
    let failed = 0;
    const warnings: string[] = [];

    for (const row of rows ?? []) {
      const userId = String(rowGet<string>(row, 'user_id') ?? '');
      if (!userId) continue;
      try {
        const result = await this.purgeAccount(userId);
        if (result.purged || result.alreadyPurged) purged += 1;
        warnings.push(...result.warnings.map((w) => `${userId}: ${w}`));
      } catch (err) {
        failed += 1;
        warnings.push(`${userId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { due, purged, failed, warnings };
  }

  // ── Purge internals ────────────────────────────────────────────────────────

  /**
   * HARD DELETE — rows that are nothing but personal data. None of these carry
   * an amount, a gateway reference or a regulatory obligation, so there is no
   * reason to keep any of them and every reason not to.
   *
   * Order matters. Children before parents wherever the parent's delete is not
   * itself a cascade, and the `puja_bookings.prasad_delivery_address_id` pointer
   * is cleared BEFORE the addresses it points at are removed.
   */
  private async hardDeletePersonalRows(tx: Db, user: LoadedUser): Promise<void> {
    const userId = user.id;

    // Chat: bodies the user authored, then the conversations themselves.
    await tx.chatMessage.deleteMany({ where: { senderId: userId } });
    await tx.chatCallSession.deleteMany({ where: { startedById: userId } });
    await tx.serviceRating.deleteMany({
      where: { OR: [{ devoteeId: userId }, { providerId: userId }] },
    });
    await tx.chatConversation.deleteMany({
      where: { OR: [{ devoteeId: userId }, { providerId: userId }] },
    });

    // Support: free-text bodies, plus release anything assigned TO this user so
    // an admin's deletion does not orphan other people's open tickets.
    await tx.supportTicketMessage.deleteMany({ where: { authorId: userId } });
    await tx.supportTicket.deleteMany({ where: { userId } });
    await tx.supportTicket.updateMany({
      where: { assignedToId: userId },
      data: { assignedToId: null },
    });

    // Addresses. The booking pointer is nullable and would SET NULL on its own,
    // but doing it explicitly means the delete below cannot depend on which
    // referential action the live database actually has.
    await tx.pujaBooking.updateMany({
      where: { userId, prasadDeliveryAddressId: { not: null } },
      data: { prasadDeliveryAddressId: null },
    });
    await tx.userAddress.deleteMany({ where: { userId } });

    // Devices — web push and FCM. Silencing every channel is the first thing a
    // deletion must actually achieve.
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.fcmDeviceToken.deleteMany({ where: { userId } });

    // Birth details. `kundli_requests` holds date, time and place of birth — the
    // most sensitive column set in this schema outside KYC.
    await tx.kundliRequest.deleteMany({ where: { userId } });

    // AI chat transcripts (`messages` Json is the whole conversation body).
    await tx.aiConversation.deleteMany({ where: { userId } });

    // Behavioural / engagement state. No financial or regulatory value.
    await tx.readingProgress.deleteMany({ where: { userId } });
    await tx.userLessonProgress.deleteMany({ where: { userId } });
    await tx.userStreak.deleteMany({ where: { userId } });
    await tx.userBadge.deleteMany({ where: { userId } });
    await tx.templeFollow.deleteMany({ where: { userId } });

    // `onboarding_steps.data` is a free-form Json blob the onboarding wizard
    // fills with whatever the provider typed — name, address, documents.
    await tx.onboardingStep.deleteMany({ where: { userId } });

    // Gurukul applications carry a MINOR's name, age and email, the guardian's
    // name, phone and Aadhaar last-4, and a free-text statement. No payment is
    // attached to this table at all, so there is nothing to retain.
    await tx.gurukulApplication.deleteMany({ where: { applicantUserId: userId } });

    // The outreach lead this account converted from still holds the scraped
    // phone, email and WhatsApp number. Sever it and strip the contact columns —
    // `@@unique([role, email])` and `@@unique([role, phone])` both tolerate NULL.
    await tx.lead.updateMany({
      where: { convertedUserId: userId },
      data: {
        convertedUserId: null,
        phone: null,
        email: null,
        whatsappNumber: null,
        name: TOMBSTONE_NAME,
        notes: null,
        metadata: {},
      },
    });

    // Pre-launch waitlist rows are keyed on email with no user_id at all.
    if (user.email) {
      await tx.waitlist.deleteMany({ where: { email: user.email } });
    }
  }

  /**
   * ANONYMISE — the provider-side identity rows.
   *
   * `Priest` and the four `*_profiles` tables are the difference between a
   * deletable devotee and a deletable business. `Priest` cannot be deleted:
   * `puja_bookings.priest_id`, `priest_payouts.priest_id` and `dispatch_offers`
   * all reference it, and `priest_payouts` is money. The profile tables that
   * NOTHING references are deleted outright; the ones that back a financial row
   * are scrubbed and deactivated in place.
   */
  private async anonymiseProviderIdentity(tx: Db, user: LoadedUser): Promise<void> {
    const userId = user.id;

    // Priest — referenced by three money-bearing tables. Scrub, deactivate, keep.
    // `commissionRate` stays: it is the rate historical payouts were computed at.
    await tx.priest.updateMany({
      where: { userId },
      data: {
        displayName: 'Former Pandit',
        bio: null,
        avatarUrl: null,
        city: null,
        lat: null,
        lng: null,
        aadhaarVerified: false,
        isVerified: false,
        verificationStatus: 'rejected',
        status: 'inactive',
        isOnDuty: false,
        lastSeenAt: null,
        specializations: [],
        languages: [],
      },
    });

    // These three have no foreign key pointing at them anywhere in the schema —
    // they are pure profile. Delete.
    await tx.panditProfile.deleteMany({ where: { userId } });
    await tx.astrologerProfile.deleteMany({ where: { userId } });
    await tx.wellnessProfile.deleteMany({ where: { userId } });

    // StoreProfile IS referenced: `store_products` (cascade) and
    // `store_orders.store_profile_id` (SET NULL). Deleting it would strip store
    // attribution off historical paid orders, which is exactly the accounting
    // linkage the retention policy says to keep. Scrub and close instead.
    await tx.storeProfile.updateMany({
      where: { userId },
      data: {
        storeName: 'Closed Store',
        gstNumber: null,
        address: null,
        city: null,
        state: null,
        approved: false,
      },
    });
    const store = await tx.storeProfile.findUnique({ where: { userId }, select: { id: true } });
    if (store?.id) {
      // Deactivate rather than delete: `reviews.product_id` cascades, and a
      // review is another devotee's content, not this user's.
      await tx.storeProduct.updateMany({
        where: { storeProfileId: store.id },
        data: { isActive: false, stock: 0 },
      });
    }

    // `donations.gaushala_id` is a stringified gaushala_profiles.user_id with no
    // foreign key, precisely so donation receipts survive a gaushala going away.
    // Deleting the profile would leave those receipts pointing at nothing.
    await tx.gaushalaProfile.updateMany({
      where: { userId },
      data: {
        gaushalaName: 'Closed Gaushala',
        address: null,
        city: null,
        description: null,
        verified: false,
        approved: false,
      },
    });
    await tx.templeProfile.updateMany({
      where: { userId },
      data: {
        templeName: 'Closed Temple Listing',
        address: null,
        city: null,
        state: null,
        description: null,
        verified: false,
        approved: false,
      },
    });

    // Volunteers of a gaushala this user managed are THIRD parties' names,
    // phones and emails held by a controller who is leaving. Nothing financial
    // hangs off them.
    const gaushala = await tx.gaushalaProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (gaushala?.id) {
      await tx.volunteer.deleteMany({ where: { gaushalaId: gaushala.id } });
      await tx.cowHealthRecord.updateMany({
        where: { cow: { gaushalaId: gaushala.id } },
        data: { vetName: null },
      });
    }

    // Wellness sessions cascade to `wellness_enrollments`, which carry
    // `payment_id` and `razorpay_order_id`. Deleting a session would destroy paid
    // enrollment records. Cancel and strip the room link instead.
    await tx.wellnessSession.updateMany({
      where: { instructorId: userId },
      data: { status: 'CANCELLED', roomUrl: null },
    });

    // Gurukul listings: release ownership. Where the published institutional
    // contact is this person's own address, it goes too and the listing is
    // deactivated rather than left advertising a dead mailbox.
    await tx.gurukul.updateMany({ where: { ownerId: userId }, data: { ownerId: null } });
    if (user.email) {
      await tx.gurukul.updateMany({
        where: { contactEmail: user.email },
        data: { contactEmail: 'removed@darshya.online', contactPhone: null, isActive: false },
      });
    }

    // Temples are public institutions with their own payout rail, so the row
    // stays — but a temple manager's personal phone or mailbox must not.
    if (user.email) {
      await tx.temple.updateMany({ where: { email: user.email }, data: { email: null } });
    }
    if (user.phone) {
      await tx.temple.updateMany({ where: { phone: user.phone }, data: { phone: null } });
    }

    // The referral code is a live shareable credential. It cannot be DELETED —
    // `referral_claims.code_id` cascades and those rows carry `reward_amount` —
    // so it is rotated to something unguessable and unshareable instead.
    await tx.referralCode.updateMany({
      where: { userId },
      data: { code: `deleted-${crypto.randomUUID()}` },
    });
  }

  /**
   * ANONYMISE AND RETAIN — the money.
   *
   * Not one row here is deleted. Amounts, dates, booking numbers, receipt
   * numbers and gateway references all survive, because that is what Indian tax
   * and accounting law requires and what a Razorpay dispute six months from now
   * will be argued from. What is stripped is every DENORMALISED copy of a name,
   * phone, address or free-text note that was written onto those rows.
   */
  private async anonymiseFinancialRows(tx: Db, user: LoadedUser): Promise<void> {
    const userId = user.id;

    // PujaBooking. `devoteeNames` is a Json ARRAY OF FAMILY MEMBERS' NAMES
    // collected for the sankalp, and `sankalpDetails` is free text that in
    // practice contains names, gotra and nakshatra. Both are copies of personal
    // data sitting on a financial row — the exact leak the policy names.
    await tx.pujaBooking.updateMany({
      where: { userId },
      data: {
        devoteeNames: [],
        sankalpDetails: null,
        specialInstructions: null,
        reviewText: null,
        cancellationReason: null,
        prasadTrackingId: null,
      },
    });

    // Payment.metadata is a free-form gateway blob that has historically carried
    // contact fields. The identifiers that matter for reconciliation live in
    // their own columns (`gateway_payment_id`, `gateway_order_id`), so nothing
    // reconcilable is lost by clearing it.
    await tx.payment.updateMany({
      where: { userId },
      data: { metadata: { redacted: 'account_deleted' } },
    });

    // StoreOrder.shippingAddress is a Json blob holding the recipient's name,
    // phone and full postal address. The order row itself is a tax record.
    await tx.storeOrder.updateMany({
      where: { userId },
      data: { shippingAddress: { redacted: 'account_deleted' }, trackingNumber: null },
    });

    // Antim sanskar bookings carry a denormalised contact name and phone, plus
    // the name of a DECEASED third party. The row is a priced booking, so it
    // stays; every name on it goes.
    await tx.antimSanskarBooking.updateMany({
      where: { userId },
      data: {
        deceasedName: 'Redacted',
        contactName: TOMBSTONE_NAME,
        contactPhone: '',
        contactRelation: null,
        notes: null,
        preferredGhat: null,
      },
    });

    // Reviews are public content about a PROVIDER. The star rating feeds that
    // provider's aggregate and is not this user's personal data; the free-text
    // comment is.
    await tx.review.updateMany({ where: { userId }, data: { comment: null } });

    // The money trail keeps its actor id (now a pseudonym) but not the IP the
    // action came from.
    await tx.moneyAuditEvent.updateMany({ where: { actorId: userId }, data: { ip: null } });

    // Wallet: zero the balance with a MATCHING ledger entry, so the documented
    // invariant `SUM(ledger.delta_paise) == credit.balance_paise` still holds
    // after the purge. Silently setting the balance to 0 would break it.
    const credit = await tx.userCredit.findUnique({
      where: { userId },
      select: { id: true, balancePaise: true },
    });
    const paise = toNumber(credit?.balancePaise);
    if (credit?.id && paise !== 0) {
      await tx.creditLedgerEntry.create({
        data: {
          userId,
          creditId: credit.id,
          deltaPaise: -paise,
          reason: 'adjustment',
          idempotencyKey: `account-deletion-forfeit-${userId}`,
          refType: 'account_deletion',
          refId: userId,
          notes: 'Balance forfeited on account deletion',
        },
      });
      await tx.userCredit.update({ where: { userId }, data: { balancePaise: 0 } });
    }

    // Stop anything that would keep charging or paying a tombstone.
    await tx.subscription.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'cancelled', autoRenew: false },
    });
    await tx.marketplaceSubscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    // ── DONATIONS / 80G ──────────────────────────────────────────────────────
    //
    // Raw SQL because `donor_name_snapshot` is added by
    // migrations/20260903000000_account_deletion and this service deliberately
    // does not depend on a regenerated Prisma client (same doctrine as
    // MagicLinkToken and lib/email-session.ts).
    //
    // The dedication is free text and always goes. The donor's NAME is FROZEN
    // onto donations that actually produced a receipt, because
    // routes/donations.ts builds the 80G certificate with
    // `donorName: user.fullName` read LIVE — without the snapshot, every
    // reissued receipt for a past donation would name "Deleted User", which is a
    // defective tax document rather than a redacted one.
    await tx.$executeRawUnsafe(
      `UPDATE "donations" SET "dedication" = NULL WHERE "user_id" = $1::uuid`,
      userId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "donations"
          SET "donor_name_snapshot" = $2
        WHERE "user_id" = $1::uuid
          AND "receipt_number" IS NOT NULL
          AND "donor_name_snapshot" IS NULL`,
      userId,
      user.fullName ?? TOMBSTONE_NAME,
    );
    // PAN is stripped wherever no receipt was ever issued — with no tax document
    // in existence there is no retention basis for it. Where a receipt DOES
    // exist, retention is governed by RETAIN_80G_PAN; see the note at the foot
    // of this file.
    await tx.$executeRawUnsafe(
      RETAIN_80G_PAN
        ? `UPDATE "donations" SET "donor_pan" = NULL
            WHERE "user_id" = $1::uuid AND "receipt_number" IS NULL`
        : `UPDATE "donations" SET "donor_pan" = NULL WHERE "user_id" = $1::uuid`,
      userId,
    );

    // Commission, PayoutRequest, TemplePayout, PriestPayout and Transaction are
    // deliberately UNTOUCHED. Every column on them is an id, an amount, a status
    // or a bank/UPI reference — there is no personal data to strip, and the
    // provider id is now a pseudonym.
  }

  /** The tombstone stamp. Last statement of the transaction, on purpose. */
  private async tombstoneUser(tx: Db, user: LoadedUser): Promise<void> {
    const userId = user.id;

    // Revoke every role BEFORE the row is blocked, so a tombstone can never be
    // authenticated into a privileged surface even if some future auth path
    // forgets the `blocked` gate.
    await tx.userRoleAssignment.deleteMany({ where: { userId } });

    await tx.user.update({
      where: { id: userId },
      data: {
        phone: null,
        email: null,
        fullName: TOMBSTONE_NAME,
        avatarUrl: null,
        locationCity: null,
        locationState: null,
        isNri: false,
        nriCountry: null,
        // Birth/astrology details — personal data under DPDP.
        gotra: null,
        nakshatra: null,
        rashi: null,
        subscriptionTier: 'free',
        // The existing auth gate (middlewares/auth.ts rejectIfBlocked) already
        // 403s on this, so no auth path needs to learn about deletion.
        blocked: true,
        blockedReason: TOMBSTONE_BLOCK_REASON,
        blockedAt: new Date(),
      },
    });

    await tx.$executeRawUnsafe(
      `UPDATE "users"
          SET "deleted_at" = now(),
              "deletion_purge_after" = NULL,
              "updated_at" = ${SQL_UTC_NOW}
        WHERE "id" = $1::uuid`,
      userId,
    );
  }

  /**
   * Tables that live outside schema.prisma: auth ledgers, KYC, org membership,
   * and the half-dozen tables individual routes create lazily on first use.
   *
   * Every statement is individually best-effort and none of them run inside the
   * transaction — see `bestEffort` for why that is not optional.
   */
  private async purgeLegacyTables(user: LoadedUser, warnings: string[]): Promise<void> {
    const userId = user.id;
    const exec = (sql: string, ...args: unknown[]) => this.db.$executeRawUnsafe(sql, ...args);

    // ── AUTH IDENTITY. Every live credential this user holds.
    await bestEffort('email_sessions', warnings, () =>
      exec(`DELETE FROM "email_sessions" WHERE "user_id" = $1::uuid`, userId),
    );
    await bestEffort('refresh_token_jtis', warnings, () =>
      exec(`DELETE FROM "refresh_token_jtis" WHERE "user_id" = $1::uuid`, userId),
    );
    await bestEffort('astrologer_slug_map', warnings, () =>
      exec(`DELETE FROM "astrologer_slug_map" WHERE "user_id" = $1::uuid`, userId),
    );
    if (user.email) {
      // A magic link is a 72-hour bearer credential sitting in a mailbox.
      await bestEffort('magic_link_tokens', warnings, () =>
        exec(`DELETE FROM "magic_link_tokens" WHERE lower("user_email") = lower($1)`, user.email),
      );
    }

    // ── KYC. Aadhaar hash, bank account number, IFSC and account-holder name.
    // Bank details are stripped unconditionally: the guard above refuses the
    // deletion while any payout is in flight, so nothing is left to pay.
    // PAN survives only where a payout actually completed — TDS / Form 26Q
    // reporting is keyed on the payee's PAN, and that obligation is independent
    // of the 80G question (see RETAIN_PAYEE_PAN).
    await bestEffort('provider_kyc', warnings, async () => {
      const paid = toNumber(
        await this.db.payoutRequest.count({
          where: { providerId: userId, status: 'completed' },
        }),
      );
      const keepPan = RETAIN_PAYEE_PAN && paid > 0;
      await exec(
        keepPan
          ? `UPDATE "provider_kyc"
                SET "aadhaar_last4" = NULL, "aadhaar_hash" = NULL,
                    "bank_account_number" = NULL, "bank_ifsc" = NULL,
                    "bank_holder_name" = NULL, "rejection_reason" = NULL,
                    "verified" = false, "updated_at" = ${SQL_UTC_NOW}
              WHERE "user_id" = $1::uuid`
          : `DELETE FROM "provider_kyc" WHERE "user_id" = $1::uuid`,
        userId,
      );
    });

    // ── DPDP. Consent proof is itself personal data (it stores ip_address and
    // user_agent), and retaining consent evidence for a person who has been
    // erased is self-contradictory. The DSAR row survives as proof the erasure
    // was honoured, minus its free-text note.
    await bestEffort('consent_log', warnings, () =>
      exec(`DELETE FROM "consent_log" WHERE "user_id" = $1::uuid`, userId),
    );
    await bestEffort('dsar_requests', warnings, () =>
      exec(
        `UPDATE "dsar_requests"
            SET "note" = NULL, "status" = 'resolved', "resolved_at" = now(),
                "resolution_note" = 'Account deleted and anonymised'
          WHERE "user_id" = $1::uuid`,
        userId,
      ),
    );

    // ── NOTIFICATIONS. title/body embed the user's name; `email` is the address.
    await bestEffort('notification_log', warnings, () =>
      exec(`DELETE FROM "notification_log" WHERE "user_id" = $1`, userId),
    );

    // ── ORGS (B2B). Drop membership; the org itself belongs to a company, not to
    // this person, so it is left for an operator to reassign.
    await bestEffort('org_members', warnings, () =>
      exec(`DELETE FROM "org_members" WHERE "user_id" = $1::uuid`, userId),
    );
    if (user.email) {
      await bestEffort('org_invites', warnings, () =>
        exec(`DELETE FROM "org_invites" WHERE lower("email") = lower($1)`, user.email),
      );
      await bestEffort('marketplace_api_keys', warnings, () =>
        exec(
          `UPDATE "marketplace_api_keys"
              SET "is_active" = false, "revoked_at" = now(), "owner_email" = 'redacted@darshya.online'
            WHERE lower("owner_email") = lower($1)`,
          user.email,
        ),
      );
    }

    // ── CONSULTATIONS. A money table (amount_inr + razorpay ids), so it is
    // retained — but `astrologer_name` is a denormalised copy of the provider's
    // name, and `room_name` is a live Jitsi join link.
    await bestEffort('astrologer_consultations', warnings, () =>
      exec(
        `UPDATE "astrologer_consultations" SET "room_name" = NULL WHERE "user_id" = $1::uuid`,
        userId,
      ),
    );
    await bestEffort('astrologer_consultations.provider', warnings, () =>
      exec(
        `UPDATE "astrologer_consultations"
            SET "astrologer_name" = 'Former Astrologer', "room_name" = NULL
          WHERE "astrologer_id" = $1`,
        userId,
      ),
    );

    // ── YATRA + GIFT PUJA. Priced orders with gateway references: retain the
    // money, strip the buyer and recipient contact details copied onto them.
    await bestEffort('yatra_user_bookings', warnings, () =>
      exec(
        `UPDATE "yatra_user_bookings"
            SET "payload" = '{"redacted":"account_deleted"}'::jsonb
          WHERE "user_id" = $1::uuid`,
        userId,
      ),
    );
    if (user.email) {
      await bestEffort('yatra_bookings', warnings, () =>
        exec(
          `UPDATE "yatra_bookings"
              SET "buyer_name" = 'Deleted User', "buyer_email" = NULL, "buyer_phone" = NULL
            WHERE lower("buyer_email") = lower($1)`,
          user.email,
        ),
      );
      await bestEffort('gift_puja_orders', warnings, () =>
        exec(
          `UPDATE "gift_puja_orders"
              SET "buyer_name" = 'Deleted User', "buyer_email" = 'redacted@darshya.online',
                  "recipient_name" = 'Redacted', "recipient_whatsapp" = '',
                  "recipient_city" = NULL, "message" = NULL, "stripe_client_secret" = NULL
            WHERE lower("buyer_email") = lower($1)`,
          user.email,
        ),
      );
    }

    // ── RECURRING MANDATES. Stop the money before the identity goes.
    await bestEffort('recurring_subscriptions', warnings, () =>
      exec(
        `UPDATE "recurring_subscriptions"
            SET "status" = 'cancelled', "updated_at" = now()
          WHERE "user_id" = $1::uuid AND "status" <> 'cancelled'`,
        userId,
      ),
    );
  }

  /** Kill every outbound channel immediately, ahead of the grace period. */
  private async silenceChannels(userId: string): Promise<void> {
    const warnings: string[] = [];
    await bestEffort('pushSubscription', warnings, () =>
      this.db.pushSubscription.deleteMany({ where: { userId } }),
    );
    await bestEffort('fcmDeviceToken', warnings, () =>
      this.db.fcmDeviceToken.deleteMany({ where: { userId } }),
    );
  }

  // ── Supabase ───────────────────────────────────────────────────────────────

  /**
   * Delete the Supabase Auth identity. `routes/auth.ts` uses the Supabase
   * `auth.users.id` as this table's primary key, so the ids are the same value.
   *
   * A missing identity is SUCCESS, not failure: accounts minted by the
   * WhatsApp-OTP path (`routes/whatsapp-otp.ts`) get a locally generated uuid and
   * never existed in Supabase at all.
   */
  private async deleteSupabaseIdentity(
    userId: string,
  ): Promise<{ deleted: boolean; skipped: boolean; reason?: string }> {
    if (isDemoMode) {
      return { deleted: false, skipped: true, reason: 'supabase_demo_mode' };
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Loud rather than silent: without the service-role key the credential
      // survives the deletion, and the operator has to know.
      return {
        deleted: false,
        skipped: false,
        reason:
          'SUPABASE_SERVICE_ROLE_KEY is not set — the Supabase Auth identity was NOT deleted and can still sign in.',
      };
    }
    try {
      const admin = (
        supabaseAdmin as unknown as {
          auth?: {
            admin?: {
              deleteUser?: (id: string) => Promise<{ error?: { message?: string; status?: number } }>;
            };
          };
        }
      ).auth?.admin;
      if (!admin?.deleteUser) {
        return { deleted: false, skipped: true, reason: 'supabase_admin_unavailable' };
      }
      const res = await admin.deleteUser(userId);
      const error = res?.error;
      if (error) {
        const msg = error.message ?? String(error);
        if (error.status === 404 || /not found|user_not_found/i.test(msg)) {
          return { deleted: false, skipped: true, reason: 'no_supabase_identity' };
        }
        return { deleted: false, skipped: false, reason: msg };
      }
      return { deleted: true, skipped: false };
    } catch (err) {
      return {
        deleted: false,
        skipped: false,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  /**
   * Read identity plus the three tombstone columns in one statement.
   *
   * Raw because `deleted_at` and friends are added by this feature's migration
   * and this service must keep working against a client that has not been
   * regenerated — the deployed API runs `prisma migrate deploy` at boot, and a
   * service that only compiles after a manual `prisma generate` is a service
   * that breaks the build for everyone else in the meantime.
   */
  private async loadUser(userId: string): Promise<LoadedUser | null> {
    const rows = (await this.db.$queryRawUnsafe(
      `SELECT "id", "email", "phone", "full_name", "preferred_language",
              "deleted_at", "deletion_requested_at", "deletion_purge_after"
         FROM "users"
        WHERE "id" = $1::uuid
        LIMIT 1`,
      userId,
    )) as RawRow[];

    const row = rows?.[0];
    if (!row) return null;

    const deletedAt = rowGet(row, 'deleted_at');
    const purgeAfter = rowGet(row, 'deletion_purge_after');

    return {
      id: String(rowGet<string>(row, 'id') ?? userId),
      email: (rowGet<string>(row, 'email') ?? null) || null,
      phone: (rowGet<string>(row, 'phone') ?? null) || null,
      fullName: (rowGet<string>(row, 'full_name') ?? null) || null,
      language: (rowGet<string>(row, 'preferred_language') ?? 'hi') || 'hi',
      deletedAt: deletedAt ? new Date(String(deletedAt)) : null,
      deletionPurgeAfter: purgeAfter ? new Date(String(purgeAfter)) : null,
    };
  }

  /** Send the confirmation code on whichever rail the account actually has. */
  private async deliverCode(
    user: LoadedUser,
    code: string,
  ): Promise<{ channel: string; devCode?: string }> {
    if (user.phone && whatsapp.enabled) {
      const res = await sendWhatsappTemplate({
        to: user.phone,
        template: 'otp_login',
        variables: [code],
      });
      if (res?.ok) return { channel: 'whatsapp' };
    }

    if (user.email) {
      const res = await sendEmail({
        to: user.email,
        subject: 'Confirm deleting your Darshya account',
        kind: 'transactional',
        html:
          `<p>Your account deletion confirmation code is <strong>${code}</strong>.</p>` +
          `<p>It expires in ${CODE_TTL_MIN} minutes. Deletion becomes permanent after the ` +
          `${GRACE_PERIOD_DAYS}-day grace period.</p>` +
          `<p>If you did not ask to delete your Darshya account, ignore this email and change nothing — ` +
          `your account stays exactly as it is.</p>`,
        text:
          `Your Darshya account deletion confirmation code is ${code}. It expires in ${CODE_TTL_MIN} minutes.\n` +
          `If you did not request this, ignore this email.`,
      });
      if (res?.ok) return { channel: 'email' };
    }

    // No rail accepted it. Same fallback routes/whatsapp-otp.ts already ships:
    // the flow stays completable on a dev or staging build with no WhatsApp
    // business account and no Resend key, which is also how a store reviewer
    // exercises it.
    return { channel: 'dev', devCode: code };
  }
}

export const accountDeletionService = new AccountDeletionService();

/**
 * ─── 80G / PAN: THE OPEN DECISION, STATED RATHER THAN BURIED ────────────────
 *
 * `donations.donor_pan` is collected because Section 80G requires the donor's
 * PAN on any receipt for ₹2,000 or more, and Form 10BE — the statement of
 * donations a donee institution files — is keyed on the donor's PAN and name.
 * Destroying the PAN on a donation that already produced a receipt would leave
 * the institution unable to file or reissue the certificate, which is a
 * different legal breach from the one deletion is meant to cure.
 *
 * WHAT THIS CODE DOES, AND WHAT IT DOES *TODAY*:
 *
 *   - `dedication` is free text and is nulled unconditionally.
 *   - The donor's NAME is frozen into `donor_name_snapshot` on any donation that
 *     produced a `receipt_number`, ALWAYS. routes/donations.ts issues a receipt
 *     PDF for every paid donation and `is80GEligible()` only gates the
 *     tax-deduction section of it — the donor's name is on the document either
 *     way, so without the snapshot a reissued receipt would name "Deleted User".
 *   - `donor_pan` is retained ONLY when `RETAIN_80G_PAN`, i.e. only while
 *     `lib/eighty-g.ts HAS_80G` is true AND the donation has a receipt number.
 *     HAS_80G IS CURRENTLY FALSE — Darshya has no Section 80G(5) certificate on
 *     file — so as the code stands today EVERY donor PAN is destroyed on
 *     deletion. That is the correct answer while no 80G certificate exists to be
 *     issued: there is no tax document, therefore no retention basis. The moment
 *     the founder files and flips that flag, retention begins on its own with no
 *     further change here.
 *   - provider_kyc is a SEPARATE decision (`RETAIN_PAYEE_PAN`, default on):
 *     Aadhaar and bank details are always destroyed, and the payee's PAN is kept
 *     only where a payout actually completed, because TDS / Form 26Q reporting
 *     is keyed on it whether or not an 80G regime exists.
 *
 * RECOMMENDATION FOR THE OWNER:
 *   1. Leave both defaults as they are. Nothing is silently destroyed that has a
 *      live legal basis, and nothing is silently kept that does not.
 *   2. When the 80G(5) certificate lands, flip `HAS_80G` — and at the same time
 *      add a retention CEILING. 80G / Rule 18AB records are ordinarily needed
 *      for eight assessment years, so a follow-up sweep should purge
 *      `donor_pan` and `donor_name_snapshot` on donations older than that
 *      rather than holding them forever.
 *   3. Get counsel to confirm the eight-year figure before it is coded, and
 *      confirm whether a donor who has exercised erasure may be re-identified
 *      for a Form 10BE filing at all.
 */
