/**
 * account-deletion.service.test.ts — LC-DEL.
 *
 * The three things this suite exists to prove, in order of how expensive they
 * would be to get wrong:
 *
 *   1. THE MONEY SURVIVES. Not one financial or regulatory table is ever handed
 *      to a `delete`/`deleteMany`. `donations.user_id` and `store_orders.user_id`
 *      are ON DELETE CASCADE, so a single misplaced `user.delete()` would
 *      silently destroy donation receipts and order records that Indian tax law
 *      requires be retained. A test that only checked "the name is gone" would
 *      pass while that happened.
 *
 *   2. THE PERSON DOES NOT. Every denormalised copy of a name, email, phone or
 *      address written onto a RETAINED row is stripped — `puja_bookings
 *      .devotee_names`, `store_orders.shipping_address`,
 *      `antim_sanskar_bookings.contact_*`. Those copies are the leak that
 *      survives scrubbing the `users` row.
 *
 *   3. IT IS SAFE TO RUN TWICE. The sweep retries after partial failures, so a
 *      second purge on a tombstoned account must be a no-op, not a second
 *      forfeiture ledger entry.
 *
 * The fake below records every call rather than simulating a database. That is
 * deliberate: the assertions that matter here are about WHICH tables were
 * touched and WITH WHAT, which is exactly what a recorder can prove and an
 * in-memory row store would obscure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// `vi.mock` factories are hoisted above every top-level statement, so the mock
// has to be created inside `vi.hoisted` to exist by the time the factory runs.
const { deleteUserMock } = vi.hoisted(() => ({
  deleteUserMock: vi.fn(async (_id: string) => ({ error: undefined as unknown })),
}));

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: false,
  supabaseAdmin: { auth: { admin: { deleteUser: deleteUserMock } } },
  createSupabaseClient: vi.fn(),
}));
vi.mock('../lib/whatsapp.js', () => ({
  sendWhatsappTemplate: vi.fn(async () => ({ ok: false })),
  whatsapp: { enabled: false, phoneNumberId: '', apiVersion: 'v21.0' },
}));
vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(async () => ({ ok: false, skipped: true })),
}));
vi.mock('../lib/prisma.js', () => ({ prisma: {} }));

import {
  AccountDeletionService,
  AccountDeletionBlockedError,
  AccountDeletionInputError,
  TOMBSTONE_NAME,
  GRACE_PERIOD_DAYS,
  RETAIN_80G_PAN,
} from './account-deletion.service.js';
import { HAS_80G } from '../lib/eighty-g.js';

// ─── The user under test ─────────────────────────────────────────────────────

const USER_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '22222222-2222-4222-8222-222222222222';

const PII = {
  fullName: 'Ramesh Kumar Sharma',
  email: 'ramesh.sharma@example.com',
  phone: '+919876543210',
};

// ─── Recording fake ──────────────────────────────────────────────────────────

interface Recorded {
  model: string;
  op: string;
  args: Record<string, unknown> | undefined;
}
interface RawCall {
  sql: string;
  params: unknown[];
}

type Returns = Record<string, unknown | ((args: unknown) => unknown)>;

interface Fake {
  db: Record<string, unknown>;
  ops: Recorded[];
  raw: RawCall[];
}

function makeDb(opts: { returns?: Returns; userRow?: Record<string, unknown> | null } = {}): Fake {
  const ops: Recorded[] = [];
  const raw: RawCall[] = [];
  const returns = opts.returns ?? {};

  const userRow =
    opts.userRow === undefined
      ? {
          id: USER_ID,
          email: PII.email,
          phone: PII.phone,
          full_name: PII.fullName,
          preferred_language: 'hi',
          deleted_at: null,
          deletion_requested_at: null,
          deletion_purge_after: null,
        }
      : opts.userRow;

  const resolve = (key: string, args: unknown, fallback: unknown): unknown => {
    if (!(key in returns)) return fallback;
    const v = returns[key];
    return typeof v === 'function' ? (v as (a: unknown) => unknown)(args) : v;
  };

  const modelHandler = (model: string) =>
    new Proxy(
      {},
      {
        get(_t, op: string) {
          return (args: Record<string, unknown> | undefined) => {
            ops.push({ model, op, args });
            const key = `${model}.${op}`;
            switch (op) {
              case 'count':
                return Promise.resolve(resolve(key, args, 0));
              case 'aggregate':
                return Promise.resolve(resolve(key, args, { _sum: { amount: 0 } }));
              case 'findMany':
                return Promise.resolve(resolve(key, args, []));
              case 'findUnique':
              case 'findFirst':
                return Promise.resolve(resolve(key, args, null));
              case 'deleteMany':
              case 'updateMany':
                return Promise.resolve(resolve(key, args, { count: 0 }));
              default:
                return Promise.resolve(resolve(key, args, {}));
            }
          };
        },
      },
    );

  const models = new Map<string, unknown>();

  const db: Record<string, unknown> = {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(dbProxy),
    $queryRawUnsafe: (sql: string, ...params: unknown[]) => {
      raw.push({ sql, params });
      if (/FROM "users"/.test(sql)) return Promise.resolve(userRow ? [userRow] : []);
      if (/INSERT INTO "account_deletion_requests"/.test(sql)) {
        return Promise.resolve([{ id: REQUEST_ID }]);
      }
      if (/SELECT "user_id"\s+FROM "account_deletion_requests"/.test(sql)) {
        return Promise.resolve(resolve('sweep.due', sql, []));
      }
      if (/FROM "account_deletion_requests"/.test(sql)) {
        return Promise.resolve(resolve('request.row', sql, []));
      }
      if (/RETURNING "id"/.test(sql)) return Promise.resolve([{ id: REQUEST_ID }]);
      return Promise.resolve([]);
    },
    $executeRawUnsafe: (sql: string, ...params: unknown[]) => {
      raw.push({ sql, params });
      return Promise.resolve(1);
    },
  };

  const dbProxy = new Proxy(db, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      if (!models.has(prop)) models.set(prop, modelHandler(prop));
      return models.get(prop);
    },
  });

  return { db: dbProxy as Record<string, unknown>, ops, raw };
}

/** Every `data` payload the service asked Prisma to WRITE, as one string. */
function writtenPayloads(ops: Recorded[]): string {
  return ops
    .filter((o) => ['update', 'updateMany', 'create', 'createMany', 'upsert'].includes(o.op))
    .map((o) => JSON.stringify(o.args?.data ?? {}))
    .join('\n');
}

function opsOn(ops: Recorded[], model: string): Recorded[] {
  return ops.filter((o) => o.model === model);
}

function dataOf(ops: Recorded[], model: string, op: string): Record<string, unknown> {
  const hit = ops.find((o) => o.model === model && o.op === op);
  return (hit?.args?.data ?? {}) as Record<string, unknown>;
}

function sqlMatching(raw: RawCall[], re: RegExp): RawCall[] {
  return raw.filter((r) => re.test(r.sql));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  deleteUserMock.mockResolvedValue({ error: undefined });
});

// ─── 1. THE MONEY SURVIVES ───────────────────────────────────────────────────

describe('purgeAccount — financial and regulatory rows survive', () => {
  /**
   * Every table whose loss would be an accounting or tax problem. If a future
   * change adds a `deleteMany` on any of these, this test is the tripwire.
   */
  const MONEY_MODELS = [
    'pujaBooking',
    'payment',
    'commission',
    'payoutRequest',
    'templePayout',
    'priestPayout',
    'donation',
    'storeOrder',
    'wellnessEnrollment',
    'transaction',
    'subscription',
    'marketplaceSubscription',
    'creditLedgerEntry',
    'moneyAuditEvent',
    'antimSanskarBooking',
  ];

  it('never issues a delete against any money-bearing model', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const destructive = fake.ops.filter(
      (o) => (o.op === 'delete' || o.op === 'deleteMany') && MONEY_MODELS.includes(o.model),
    );
    expect(destructive).toEqual([]);
  });

  it('never issues a raw DELETE against a money table', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const badDeletes = fake.raw.filter((r) =>
      /DELETE\s+FROM\s+"?(donations|payments|puja_bookings|commissions|payout_requests|temple_payouts|priest_payouts|store_orders|transactions|money_audit_events|astrologer_consultations|yatra_bookings|gift_puja_orders)"?/i.test(
        r.sql,
      ),
    );
    expect(badDeletes.map((r) => r.sql)).toEqual([]);
  });

  it('never DELETEs the users row — it updates it in place', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(opsOn(fake.ops, 'user').map((o) => o.op)).toEqual(['update']);
    expect(fake.raw.filter((r) => /DELETE\s+FROM\s+"users"/i.test(r.sql))).toEqual([]);
  });

  it('leaves Commission, PayoutRequest, TemplePayout and PriestPayout completely untouched', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    // Reads for the guard are fine; WRITES are not. These four carry no personal
    // data at all — only ids, amounts, statuses and bank/UPI references.
    const writes = fake.ops.filter(
      (o) =>
        ['commission', 'payoutRequest', 'templePayout', 'priestPayout'].includes(o.model) &&
        !['count', 'aggregate', 'findMany', 'findFirst', 'findUnique'].includes(o.op),
    );
    expect(writes).toEqual([]);
  });
});

// ─── 2. THE PERSON DOES NOT ──────────────────────────────────────────────────

describe('purgeAccount — the users row becomes a tombstone', () => {
  it('nulls every identity column and blocks the account', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const data = dataOf(fake.ops, 'user', 'update');
    expect(data.phone).toBeNull();
    expect(data.email).toBeNull();
    expect(data.fullName).toBe(TOMBSTONE_NAME);
    expect(data.avatarUrl).toBeNull();
    expect(data.locationCity).toBeNull();
    expect(data.locationState).toBeNull();
    expect(data.nriCountry).toBeNull();
    // Birth / astrology details are personal data under DPDP.
    expect(data.gotra).toBeNull();
    expect(data.nakshatra).toBeNull();
    expect(data.rashi).toBeNull();
    // The existing auth gate (middlewares/auth.ts rejectIfBlocked) 403s on this,
    // so a tombstone cannot be signed into without touching any auth path.
    expect(data.blocked).toBe(true);
  });

  it('revokes every role assignment', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);
    expect(
      fake.ops.some((o) => o.model === 'userRoleAssignment' && o.op === 'deleteMany'),
    ).toBe(true);
  });

  it('stamps deleted_at through raw SQL as the last write on users', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);
    expect(sqlMatching(fake.raw, /UPDATE "users"[\s\S]*"deleted_at" = now\(\)/).length).toBe(1);
  });

  it('no PII value survives into any Prisma write payload', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const payloads = writtenPayloads(fake.ops);
    expect(payloads).not.toContain(PII.fullName);
    expect(payloads).not.toContain(PII.email);
    expect(payloads).not.toContain(PII.phone);
  });

  it('the phone number is never written into any SQL parameter', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    // The phone is only ever a WHERE-clause value in Prisma (temples cleanup);
    // it must never reach a raw statement at all.
    const phoneParams = fake.raw.filter((r) => r.params.includes(PII.phone));
    expect(phoneParams.map((r) => r.sql)).toEqual([]);
  });

  it('the real name reaches SQL ONLY as the 80G donor-name snapshot', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const nameCarrying = fake.raw.filter((r) => r.params.includes(PII.fullName));
    expect(nameCarrying).toHaveLength(1);
    expect(nameCarrying[0]!.sql).toMatch(/donor_name_snapshot/);
  });

  it('the email reaches SQL only inside WHERE clauses, never a SET', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    for (const call of fake.raw.filter((r) => r.params.includes(PII.email))) {
      // Everything that matches on the address must match, not assign, it.
      expect(call.sql).toMatch(/WHERE/i);
      const setClause = call.sql.split(/WHERE/i)[0] ?? '';
      expect(setClause).not.toContain('$1');
    }
  });
});

describe('purgeAccount — hard deletes of pure personal data', () => {
  const HARD_DELETED = [
    'chatMessage',
    'chatCallSession',
    'serviceRating',
    'chatConversation',
    'supportTicketMessage',
    'supportTicket',
    'userAddress',
    'pushSubscription',
    'fcmDeviceToken',
    'kundliRequest',
    'aiConversation',
    'readingProgress',
    'userLessonProgress',
    'userStreak',
    'userBadge',
    'templeFollow',
    'onboardingStep',
    'gurukulApplication',
  ];

  it.each(HARD_DELETED)('deletes every %s row', async (model) => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);
    expect(fake.ops.some((o) => o.model === model && o.op === 'deleteMany')).toBe(true);
  });

  it('clears the booking address pointer BEFORE deleting the addresses', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const clearPointer = fake.ops.findIndex(
      (o) =>
        o.model === 'pujaBooking' &&
        o.op === 'updateMany' &&
        'prasadDeliveryAddressId' in ((o.args?.data ?? {}) as object),
    );
    const deleteAddresses = fake.ops.findIndex(
      (o) => o.model === 'userAddress' && o.op === 'deleteMany',
    );
    expect(clearPointer).toBeGreaterThanOrEqual(0);
    expect(deleteAddresses).toBeGreaterThan(clearPointer);
  });

  it('deletes the auth identity ledgers and any live magic link', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(sqlMatching(fake.raw, /DELETE FROM "email_sessions"/)).toHaveLength(1);
    expect(sqlMatching(fake.raw, /DELETE FROM "refresh_token_jtis"/)).toHaveLength(1);
    expect(sqlMatching(fake.raw, /DELETE FROM "magic_link_tokens"/)).toHaveLength(1);
    expect(sqlMatching(fake.raw, /DELETE FROM "astrologer_slug_map"/)).toHaveLength(1);
  });

  it('destroys the KYC row — Aadhaar hash, bank account, IFSC, holder name', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);
    // No completed payout in this fixture, so there is no TDS basis to keep a
    // PAN for, and the whole row goes.
    expect(sqlMatching(fake.raw, /DELETE FROM "provider_kyc"/)).toHaveLength(1);
  });

  it('keeps the KYC row but strips bank details when a payout actually completed', async () => {
    const fake = makeDb({
      returns: {
        'payoutRequest.count': (args: unknown) =>
          (args as { where?: { status?: string } })?.where?.status === 'completed' ? 3 : 0,
      },
    });
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const kyc = sqlMatching(fake.raw, /provider_kyc/);
    expect(kyc).toHaveLength(1);
    expect(kyc[0]!.sql).toMatch(/UPDATE "provider_kyc"/);
    expect(kyc[0]!.sql).toMatch(/"bank_account_number" = NULL/);
    expect(kyc[0]!.sql).toMatch(/"aadhaar_hash" = NULL/);
    // PAN is deliberately NOT in the SET list: Form 26Q TDS reporting is keyed
    // on the payee's PAN and a payout did happen.
    expect(kyc[0]!.sql).not.toMatch(/"pan_number"/);
  });
});

// ─── The denormalised-PII leak on retained financial rows ────────────────────

describe('purgeAccount — denormalised PII stripped from RETAINED money rows', () => {
  it('strips devotee names and sankalp details off puja bookings', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const scrub = fake.ops.find(
      (o) =>
        o.model === 'pujaBooking' &&
        o.op === 'updateMany' &&
        'devoteeNames' in ((o.args?.data ?? {}) as object),
    );
    expect(scrub).toBeDefined();
    const data = (scrub!.args!.data ?? {}) as Record<string, unknown>;
    expect(data.devoteeNames).toEqual([]);
    expect(data.sankalpDetails).toBeNull();
    expect(data.specialInstructions).toBeNull();
    expect(data.reviewText).toBeNull();
    // Amounts, booking number, dates and status are NOT in the payload.
    expect(data).not.toHaveProperty('priceAmount');
    expect(data).not.toHaveProperty('bookingNumber');
    expect(data).not.toHaveProperty('status');
  });

  it('redacts the store order shipping address but keeps the order', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const data = dataOf(fake.ops, 'storeOrder', 'updateMany');
    expect(data.shippingAddress).toEqual({ redacted: 'account_deleted' });
    expect(data.trackingNumber).toBeNull();
    expect(data).not.toHaveProperty('totalAmountInr');
  });

  it('redacts the antim sanskar contact block, including the deceased name', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const data = dataOf(fake.ops, 'antimSanskarBooking', 'updateMany');
    expect(data.contactName).toBe(TOMBSTONE_NAME);
    expect(data.contactPhone).toBe('');
    expect(data.deceasedName).toBe('Redacted');
    expect(data.notes).toBeNull();
    expect(data).not.toHaveProperty('packagePriceInr');
  });

  it('clears Payment.metadata but keeps the gateway identifiers', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const data = dataOf(fake.ops, 'payment', 'updateMany');
    expect(data.metadata).toEqual({ redacted: 'account_deleted' });
    expect(data).not.toHaveProperty('gatewayPaymentId');
    expect(data).not.toHaveProperty('amount');
  });

  it('drops the review comment but keeps the star rating', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const data = dataOf(fake.ops, 'review', 'updateMany');
    expect(data.comment).toBeNull();
    expect(data).not.toHaveProperty('rating');
  });

  it('nulls the IP on the money audit trail but keeps the events', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const data = dataOf(fake.ops, 'moneyAuditEvent', 'updateMany');
    expect(data).toEqual({ ip: null });
  });

  it('strips the denormalised astrologer name off consultations', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const hit = sqlMatching(fake.raw, /astrologer_name/);
    expect(hit).toHaveLength(1);
    expect(hit[0]!.sql).toMatch(/UPDATE "astrologer_consultations"/);
  });

  it('redacts the yatra booking payload and the gift-puja recipient details', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(sqlMatching(fake.raw, /UPDATE "yatra_user_bookings"/)).toHaveLength(1);
    expect(sqlMatching(fake.raw, /UPDATE "yatra_bookings"/)).toHaveLength(1);
    const gift = sqlMatching(fake.raw, /UPDATE "gift_puja_orders"/);
    expect(gift).toHaveLength(1);
    expect(gift[0]!.sql).toMatch(/"recipient_whatsapp" = ''/);
  });
});

// ─── Provider identity ───────────────────────────────────────────────────────

describe('purgeAccount — a provider with a live business', () => {
  it('anonymises Priest rather than deleting it (three money tables reference it)', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(fake.ops.some((o) => o.model === 'priest' && o.op === 'deleteMany')).toBe(false);
    const data = dataOf(fake.ops, 'priest', 'updateMany');
    expect(data.displayName).toBe('Former Pandit');
    expect(data.status).toBe('inactive');
    expect(data.aadhaarVerified).toBe(false);
    expect(data.bio).toBeNull();
    expect(data.city).toBeNull();
    // The historical payout rate is NOT reset — past payouts were computed at it.
    expect(data).not.toHaveProperty('commissionRate');
  });

  it('deletes the profile tables nothing references', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    for (const model of ['panditProfile', 'astrologerProfile', 'wellnessProfile']) {
      expect(fake.ops.some((o) => o.model === model && o.op === 'deleteMany')).toBe(true);
    }
  });

  it('anonymises StoreProfile so historical order attribution is not SET NULLed away', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(fake.ops.some((o) => o.model === 'storeProfile' && o.op === 'deleteMany')).toBe(false);
    const data = dataOf(fake.ops, 'storeProfile', 'updateMany');
    expect(data.storeName).toBe('Closed Store');
    expect(data.gstNumber).toBeNull();
    expect(data.approved).toBe(false);
  });

  it('deactivates the store catalogue instead of cascade-deleting other devotees reviews', async () => {
    const fake = makeDb({
      returns: { 'storeProfile.findUnique': { id: 'store-1' } },
    });
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(fake.ops.some((o) => o.model === 'storeProduct' && o.op === 'deleteMany')).toBe(false);
    const data = dataOf(fake.ops, 'storeProduct', 'updateMany');
    expect(data.isActive).toBe(false);
  });

  it('anonymises GaushalaProfile — donation receipts key off its user_id with no FK', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(fake.ops.some((o) => o.model === 'gaushalaProfile' && o.op === 'deleteMany')).toBe(
      false,
    );
    expect(dataOf(fake.ops, 'gaushalaProfile', 'updateMany').gaushalaName).toBe('Closed Gaushala');
  });

  it('deletes the third-party volunteer contact list a departing gaushala manager held', async () => {
    const fake = makeDb({ returns: { 'gaushalaProfile.findUnique': { id: 'gau-1' } } });
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(fake.ops.some((o) => o.model === 'volunteer' && o.op === 'deleteMany')).toBe(true);
    expect(dataOf(fake.ops, 'cowHealthRecord', 'updateMany').vetName).toBeNull();
  });

  it('cancels wellness sessions rather than cascade-deleting paid enrollments', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(fake.ops.some((o) => o.model === 'wellnessSession' && o.op === 'deleteMany')).toBe(
      false,
    );
    const data = dataOf(fake.ops, 'wellnessSession', 'updateMany');
    expect(data.status).toBe('CANCELLED');
    expect(data.roomUrl).toBeNull();
  });

  it('rotates the referral code instead of deleting it (claims carry reward amounts)', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(fake.ops.some((o) => o.model === 'referralCode' && o.op === 'deleteMany')).toBe(false);
    const data = dataOf(fake.ops, 'referralCode', 'updateMany');
    expect(String(data.code)).toMatch(/^deleted-/);
  });

  it('strips the converted lead of the scraped phone, email and WhatsApp number', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const data = dataOf(fake.ops, 'lead', 'updateMany');
    expect(data.phone).toBeNull();
    expect(data.email).toBeNull();
    expect(data.whatsappNumber).toBeNull();
    expect(data.convertedUserId).toBeNull();
  });
});

// ─── Wallet + 80G ────────────────────────────────────────────────────────────

describe('purgeAccount — wallet forfeiture keeps the ledger invariant', () => {
  it('writes a matching negative ledger entry when zeroing a non-empty wallet', async () => {
    const fake = makeDb({
      returns: { 'userCredit.findUnique': { id: 'credit-1', balancePaise: 25000 } },
    });
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const entry = dataOf(fake.ops, 'creditLedgerEntry', 'create');
    expect(entry.deltaPaise).toBe(-25000);
    expect(entry.reason).toBe('adjustment');
    expect(entry.idempotencyKey).toBe(`account-deletion-forfeit-${USER_ID}`);
    expect(dataOf(fake.ops, 'userCredit', 'update').balancePaise).toBe(0);
  });

  it('writes no ledger entry at all when the wallet is empty', async () => {
    const fake = makeDb({
      returns: { 'userCredit.findUnique': { id: 'credit-1', balancePaise: 0 } },
    });
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(fake.ops.some((o) => o.model === 'creditLedgerEntry' && o.op === 'create')).toBe(false);
  });
});

describe('purgeAccount — 80G donation records', () => {
  it('freezes the donor name onto receipted donations so the certificate stays valid', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const snap = sqlMatching(fake.raw, /donor_name_snapshot/);
    expect(snap).toHaveLength(1);
    expect(snap[0]!.sql).toMatch(/"receipt_number" IS NOT NULL/);
    expect(snap[0]!.params).toContain(PII.fullName);
  });

  /**
   * PAN retention is gated on the REAL 80G honesty flag, not an env var, so this
   * assertion is written against that flag rather than against today's value of
   * it. When the founder files the 80G(5) certificate and flips `HAS_80G`, this
   * test keeps meaning the same thing instead of turning red.
   */
  it('retains donor_pan only under a live 80G regime, and only for receipted donations', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    const pan = sqlMatching(fake.raw, /"donor_pan" = NULL/);
    expect(pan).toHaveLength(1);
    if (RETAIN_80G_PAN) {
      expect(pan[0]!.sql).toMatch(/"receipt_number" IS NULL/);
    } else {
      // No 80G certificate exists, so no donor PAN has a retention basis at all.
      expect(pan[0]!.sql).not.toMatch(/receipt_number/);
    }
  });

  it('retention tracks the 80G honesty gate — no env var can manufacture a legal basis', () => {
    expect(RETAIN_80G_PAN).toBe(HAS_80G && process.env.ACCOUNT_DELETION_RETAIN_80G_PAN !== 'false');
    // Today: no certificate on file, so nothing is retained.
    expect(HAS_80G).toBe(false);
    expect(RETAIN_80G_PAN).toBe(false);
  });

  it('freezes the donor name regardless — the receipt names the donor either way', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);
    expect(sqlMatching(fake.raw, /donor_name_snapshot/)).toHaveLength(1);
  });

  it('always nulls the free-text dedication', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);
    expect(sqlMatching(fake.raw, /"dedication" = NULL/)).toHaveLength(1);
  });
});

// ─── The Supabase credential ─────────────────────────────────────────────────

describe('purgeAccount — the Supabase Auth identity', () => {
  it('deletes the Supabase user, because that is where the credential actually lives', async () => {
    const fake = makeDb();
    const result = await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(deleteUserMock).toHaveBeenCalledWith(USER_ID);
    expect(result.supabase.deleted).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('treats a missing Supabase identity as success (WhatsApp-OTP accounts have none)', async () => {
    deleteUserMock.mockResolvedValue({ error: { message: 'User not found', status: 404 } });
    const fake = makeDb();
    const result = await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(result.supabase.skipped).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('WARNS LOUDLY rather than silently succeeding when the credential survives', async () => {
    deleteUserMock.mockResolvedValue({ error: { message: 'service unavailable', status: 503 } });
    const fake = makeDb();
    const result = await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(result.purged).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/supabase_auth/);
  });

  it('warns when SUPABASE_SERVICE_ROLE_KEY is missing — the account could still sign in', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fake = makeDb();
    const result = await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(result.warnings.join(' ')).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

// ─── 3. IDEMPOTENCE ──────────────────────────────────────────────────────────

describe('purgeAccount — idempotent', () => {
  it('a second purge on a tombstoned account is a no-op', async () => {
    const fake = makeDb({
      userRow: {
        id: USER_ID,
        email: null,
        phone: null,
        full_name: TOMBSTONE_NAME,
        preferred_language: 'hi',
        deleted_at: '2026-09-01T00:00:00.000Z',
        deletion_requested_at: '2026-08-01T00:00:00.000Z',
        deletion_purge_after: null,
      },
    });
    const result = await new AccountDeletionService(fake.db as never).purgeAccount(USER_ID);

    expect(result.alreadyPurged).toBe(true);
    expect(result.purged).toBe(false);
    // Nothing was written a second time — in particular no second forfeiture
    // ledger entry, which would break SUM(ledger) == balance.
    expect(fake.ops.filter((o) => o.op !== 'findUnique')).toEqual([]);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('running the purge twice in sequence produces one set of writes', async () => {
    const svc = new AccountDeletionService(makeDb().db as never);
    const first = await svc.purgeAccount(USER_ID);
    expect(first.purged).toBe(true);

    // A fresh fake whose user row is already tombstoned models the state the
    // first run left behind.
    const second = await new AccountDeletionService(
      makeDb({
        userRow: {
          id: USER_ID,
          email: null,
          phone: null,
          full_name: TOMBSTONE_NAME,
          preferred_language: 'hi',
          deleted_at: '2026-09-01T00:00:00.000Z',
          deletion_requested_at: null,
          deletion_purge_after: null,
        },
      }).db as never,
    ).purgeAccount(USER_ID);
    expect(second.alreadyPurged).toBe(true);
  });

  it('throws a 404-shaped error for a user that does not exist', async () => {
    const fake = makeDb({ userRow: null });
    await expect(
      new AccountDeletionService(fake.db as never).purgeAccount(USER_ID),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
  });
});

// ─── Guard rails ─────────────────────────────────────────────────────────────

describe('checkEligibility — guard rails', () => {
  it('refuses the LAST active admin', async () => {
    const fake = makeDb({
      returns: {
        'userRoleAssignment.findMany': [{ role: 'ADMIN' }],
        'userRoleAssignment.count': 0,
      },
    });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);

    expect(result.deletable).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain('LAST_ADMIN');
    expect(result.blockers[0]!.message).toMatch(/Grant the admin role to another account/);
  });

  it('allows an admin to leave when another active admin remains', async () => {
    const fake = makeDb({
      returns: {
        'userRoleAssignment.findMany': [{ role: 'ADMIN' }],
        'userRoleAssignment.count': 2,
      },
    });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);
    expect(result.blockers.map((b) => b.code)).not.toContain('LAST_ADMIN');
  });

  it('refuses while a payout request is pending or processing', async () => {
    const fake = makeDb({ returns: { 'payoutRequest.count': 2 } });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);

    const blocker = result.blockers.find((b) => b.code === 'PAYOUT_IN_FLIGHT');
    expect(blocker).toBeDefined();
    expect(blocker!.message).toMatch(/2 payout request/);
  });

  it('refuses while the provider still has unwithdrawn earnings, and names the amount', async () => {
    const fake = makeDb({
      returns: { 'commission.aggregate': { _sum: { amount: '1450.50' } } },
    });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);

    const blocker = result.blockers.find((b) => b.code === 'UNSETTLED_EARNINGS');
    expect(blocker).toBeDefined();
    expect(blocker!.message).toContain('1450.50');
    expect(blocker!.message).toMatch(/Withdraw them/);
  });

  it('refuses a devotee with an in-flight booking', async () => {
    const fake = makeDb({ returns: { 'pujaBooking.count': 1 } });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);
    expect(result.blockers.map((b) => b.code)).toContain('BOOKING_IN_FLIGHT');
  });

  it('refuses a pandit still assigned to a paid booking', async () => {
    const fake = makeDb({
      returns: {
        'priest.findUnique': { id: 'priest-1' },
        'pujaBooking.count': (args: unknown) =>
          (args as { where?: { priestId?: string } })?.where?.priestId ? 4 : 0,
      },
    });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);

    const blocker = result.blockers.find((b) => b.code === 'ASSIGNED_BOOKING_IN_FLIGHT');
    expect(blocker).toBeDefined();
    expect(blocker!.message).toMatch(/devotees have paid for/);
  });

  it('refuses a store owner with unfulfilled paid orders', async () => {
    const fake = makeDb({
      returns: {
        'storeProfile.findUnique': { id: 'store-1' },
        'storeOrder.count': (args: unknown) =>
          (args as { where?: { storeProfileId?: string } })?.where?.storeProfileId ? 2 : 0,
      },
    });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);
    expect(result.blockers.map((b) => b.code)).toContain('STORE_ORDER_UNFULFILLED');
  });

  it('refuses a wellness instructor with scheduled sessions', async () => {
    const fake = makeDb({ returns: { 'wellnessSession.count': 3 } });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);
    expect(result.blockers.map((b) => b.code)).toContain('SESSION_SCHEDULED');
  });

  it('a clean devotee is deletable with no blockers at all', async () => {
    const fake = makeDb();
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);
    expect(result).toMatchObject({ deletable: true, blockers: [], warnings: [] });
  });

  it('wallet credit is a WARNING, never a blocker — otherwise the account is undeletable', async () => {
    const fake = makeDb({
      returns: { 'userCredit.findUnique': { balancePaise: 15000 } },
    });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);

    expect(result.deletable).toBe(true);
    expect(result.warnings[0]!.code).toBe('WALLET_BALANCE_FORFEIT');
    expect(result.warnings[0]!.message).toContain('150.00');
  });

  it('reports EVERY blocker at once rather than one per round trip', async () => {
    const fake = makeDb({
      returns: {
        'payoutRequest.count': 1,
        'pujaBooking.count': 1,
        'wellnessSession.count': 1,
      },
    });
    const result = await new AccountDeletionService(fake.db as never).checkEligibility(USER_ID);
    expect(result.blockers.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── The two-step flow ───────────────────────────────────────────────────────

describe('requestDeletion', () => {
  it('mints a request, never stores the code in the clear, and returns a dev code with no rail', async () => {
    const fake = makeDb();
    const result = await new AccountDeletionService(fake.db as never).requestDeletion(USER_ID);

    expect(result.requestId).toBe(REQUEST_ID);
    expect(result.gracePeriodDays).toBe(GRACE_PERIOD_DAYS);
    expect(result.devCode).toMatch(/^\d{6}$/);

    const insert = sqlMatching(fake.raw, /INSERT INTO "account_deletion_requests"/)[0]!;
    // The stored value is a sha256 hex digest, never the six digits themselves.
    expect(String(insert.params[1])).toMatch(/^[0-9a-f]{64}$/);
    expect(insert.params).not.toContain(result.devCode);
  });

  it('supersedes an earlier pending request instead of colliding with the unique index', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).requestDeletion(USER_ID);
    expect(sqlMatching(fake.raw, /SET "status" = 'expired'/)).toHaveLength(1);
  });

  it('refuses, with the blocker, when a guard fails', async () => {
    const fake = makeDb({ returns: { 'payoutRequest.count': 1 } });
    await expect(
      new AccountDeletionService(fake.db as never).requestDeletion(USER_ID),
    ).rejects.toBeInstanceOf(AccountDeletionBlockedError);
  });

  it('refuses until the user acknowledges forfeiting a non-zero wallet balance', async () => {
    const fake = makeDb({ returns: { 'userCredit.findUnique': { balancePaise: 9900 } } });
    const svc = new AccountDeletionService(fake.db as never);

    await expect(svc.requestDeletion(USER_ID)).rejects.toMatchObject({
      code: 'WALLET_BALANCE_FORFEIT',
    });
    // With the acknowledgement it goes through.
    await expect(
      svc.requestDeletion(USER_ID, { acknowledgeForfeit: true }),
    ).resolves.toMatchObject({ requestId: REQUEST_ID });
  });

  it('refuses on an already-deleted account with a 410', async () => {
    const fake = makeDb({
      userRow: {
        id: USER_ID,
        email: null,
        phone: null,
        full_name: TOMBSTONE_NAME,
        preferred_language: 'hi',
        deleted_at: '2026-09-01T00:00:00.000Z',
        deletion_requested_at: null,
        deletion_purge_after: null,
      },
    });
    await expect(
      new AccountDeletionService(fake.db as never).requestDeletion(USER_ID),
    ).rejects.toMatchObject({ code: 'ALREADY_DELETED', statusCode: 410 });
  });
});

describe('confirmDeletion', () => {
  const CODE = '123456';
  const codeHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // sha256('123456')

  function pendingRow(over: Record<string, unknown> = {}) {
    return [
      {
        id: REQUEST_ID,
        status: 'pending_confirmation',
        code_hash: codeHash,
        code_expires_at: new Date(Date.now() + 600_000).toISOString(),
        code_attempts: 0,
        ...over,
      },
    ];
  }

  it('schedules the purge for the grace period on a correct code', async () => {
    const fake = makeDb({ returns: { 'request.row': pendingRow() } });
    const result = await new AccountDeletionService(fake.db as never).confirmDeletion(
      USER_ID,
      REQUEST_ID,
      CODE,
    );

    expect(result.status).toBe('scheduled');
    expect(result.purgeAfter).toBeTruthy();
    // Nothing has been anonymised yet — the users row is untouched.
    expect(fake.ops.some((o) => o.model === 'user' && o.op === 'update')).toBe(false);
  });

  it('burns the code on success — single use', async () => {
    const fake = makeDb({ returns: { 'request.row': pendingRow() } });
    await new AccountDeletionService(fake.db as never).confirmDeletion(USER_ID, REQUEST_ID, CODE);
    expect(sqlMatching(fake.raw, /"code_hash" = NULL/).length).toBeGreaterThanOrEqual(1);
  });

  it('silences push and FCM immediately, not in 30 days', async () => {
    const fake = makeDb({ returns: { 'request.row': pendingRow() } });
    await new AccountDeletionService(fake.db as never).confirmDeletion(USER_ID, REQUEST_ID, CODE);

    expect(fake.ops.some((o) => o.model === 'pushSubscription' && o.op === 'deleteMany')).toBe(
      true,
    );
    expect(fake.ops.some((o) => o.model === 'fcmDeviceToken' && o.op === 'deleteMany')).toBe(true);
  });

  it('files the erasure against the existing DPDP DSAR surface', async () => {
    const fake = makeDb({ returns: { 'request.row': pendingRow() } });
    await new AccountDeletionService(fake.db as never).confirmDeletion(USER_ID, REQUEST_ID, CODE);
    expect(sqlMatching(fake.raw, /INSERT INTO "dsar_requests"[\s\S]*'erasure'/)).toHaveLength(1);
  });

  it('purges immediately when the caller asks for it', async () => {
    const fake = makeDb({ returns: { 'request.row': pendingRow() } });
    const result = await new AccountDeletionService(fake.db as never).confirmDeletion(
      USER_ID,
      REQUEST_ID,
      CODE,
      { immediate: true },
    );

    expect(result.status).toBe('purged');
    expect(result.purge?.purged).toBe(true);
    expect(dataOf(fake.ops, 'user', 'update').email).toBeNull();
  });

  it('rejects a wrong code and counts the attempt', async () => {
    const fake = makeDb({ returns: { 'request.row': pendingRow() } });
    await expect(
      new AccountDeletionService(fake.db as never).confirmDeletion(USER_ID, REQUEST_ID, '999999'),
    ).rejects.toMatchObject({ code: 'CODE_INCORRECT' });
    expect(sqlMatching(fake.raw, /"code_attempts" = "code_attempts" \+ 1/)).toHaveLength(1);
  });

  it('rejects an expired code', async () => {
    const fake = makeDb({
      returns: {
        'request.row': pendingRow({ code_expires_at: new Date(Date.now() - 1000).toISOString() }),
      },
    });
    await expect(
      new AccountDeletionService(fake.db as never).confirmDeletion(USER_ID, REQUEST_ID, CODE),
    ).rejects.toMatchObject({ code: 'CODE_EXPIRED' });
  });

  it('burns the request after too many wrong codes', async () => {
    const fake = makeDb({ returns: { 'request.row': pendingRow({ code_attempts: 5 }) } });
    await expect(
      new AccountDeletionService(fake.db as never).confirmDeletion(USER_ID, REQUEST_ID, CODE),
    ).rejects.toMatchObject({ code: 'TOO_MANY_ATTEMPTS', statusCode: 429 });
  });

  it('404s on an unknown request id', async () => {
    const fake = makeDb({ returns: { 'request.row': [] } });
    await expect(
      new AccountDeletionService(fake.db as never).confirmDeletion(USER_ID, REQUEST_ID, CODE),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND', statusCode: 404 });
  });

  it('re-runs the guards at confirm time — a booking can land between the two calls', async () => {
    const fake = makeDb({
      returns: { 'request.row': pendingRow(), 'pujaBooking.count': 1 },
    });
    await expect(
      new AccountDeletionService(fake.db as never).confirmDeletion(USER_ID, REQUEST_ID, CODE),
    ).rejects.toBeInstanceOf(AccountDeletionBlockedError);
  });
});

describe('cancelDeletion', () => {
  it('clears the schedule off both the request and the users row', async () => {
    const fake = makeDb();
    const result = await new AccountDeletionService(fake.db as never).cancelDeletion(USER_ID);

    expect(result.cancelled).toBe(true);
    expect(sqlMatching(fake.raw, /SET "status" = 'cancelled'/)).toHaveLength(1);
    expect(sqlMatching(fake.raw, /"deletion_purge_after" = NULL/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('refuses once the account has actually been purged — there is nothing to restore', async () => {
    const fake = makeDb({
      userRow: {
        id: USER_ID,
        email: null,
        phone: null,
        full_name: TOMBSTONE_NAME,
        preferred_language: 'hi',
        deleted_at: '2026-09-01T00:00:00.000Z',
        deletion_requested_at: null,
        deletion_purge_after: null,
      },
    });
    await expect(
      new AccountDeletionService(fake.db as never).cancelDeletion(USER_ID),
    ).rejects.toBeInstanceOf(AccountDeletionInputError);
  });
});

describe('getStatus', () => {
  it('answers "none" rather than 404 when nothing was ever requested', async () => {
    const fake = makeDb({ returns: { 'request.row': [] } });
    const status = await new AccountDeletionService(fake.db as never).getStatus(USER_ID);

    expect(status.status).toBe('none');
    expect(status.daysRemaining).toBeNull();
    expect(status.gracePeriodDays).toBe(GRACE_PERIOD_DAYS);
  });

  it('counts the days left to cancel a scheduled deletion', async () => {
    const purgeAfter = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const fake = makeDb({
      returns: {
        'request.row': [
          {
            id: REQUEST_ID,
            status: 'scheduled',
            requested_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
            purge_after: purgeAfter,
            purged_at: null,
          },
        ],
      },
    });
    const status = await new AccountDeletionService(fake.db as never).getStatus(USER_ID);

    expect(status.status).toBe('scheduled');
    expect(status.daysRemaining).toBe(10);
  });
});

// ─── The sweep ───────────────────────────────────────────────────────────────

describe('runPurgeSweep', () => {
  it('purges every account whose grace period has elapsed', async () => {
    const fake = makeDb({
      returns: { 'sweep.due': [{ user_id: USER_ID }, { user_id: USER_ID }] },
    });
    const result = await new AccountDeletionService(fake.db as never).runPurgeSweep();

    expect(result.due).toBe(2);
    expect(result.purged).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('one account failing does not stop the rest of the batch', async () => {
    const fake = makeDb({ returns: { 'sweep.due': [{ user_id: USER_ID }, { user_id: '' }] } });
    const svc = new AccountDeletionService(fake.db as never);
    const spy = vi.spyOn(svc, 'purgeAccount');
    spy.mockRejectedValueOnce(new Error('boom'));

    const result = await svc.runPurgeSweep();
    expect(result.failed).toBe(1);
    expect(result.warnings.join(' ')).toMatch(/boom/);
  });

  it('reads only rows that are scheduled AND due', async () => {
    const fake = makeDb();
    await new AccountDeletionService(fake.db as never).runPurgeSweep();

    const sweep = sqlMatching(fake.raw, /SELECT "user_id"/)[0]!;
    expect(sweep.sql).toMatch(/"status" = 'scheduled'/);
    expect(sweep.sql).toMatch(/"purge_after" <= now\(\)/);
  });
});
