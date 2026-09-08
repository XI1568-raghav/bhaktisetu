import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

/**
 * Razorpay is stubbed so the real-payment branch can be driven and, crucially,
 * so `orders.create` becomes OBSERVABLE. In demo mode (no RAZORPAY_KEY_ID) the
 * route synthesises an order id inline and there is nothing to assert against.
 */
const { ordersCreate } = vi.hoisted(() => ({ ordersCreate: vi.fn() }));
vi.mock('razorpay', () => ({
  default: class {
    orders = { create: ordersCreate };
  },
}));

import Fastify from 'fastify';
import { wellnessSessionRoutes } from './wellness-sessions.js';

/**
 * F455 / DI-09 limb 3 — the wellness enrolment capacity ceiling.
 *
 * PRE-FIX SHAPE (verified against HEAD before the change)
 *   wellness-sessions.ts:436  const held = await prisma.wellnessEnrollment.count(...)
 *   wellness-sessions.ts:439  if (held >= session.capacity) return 409
 *   wellness-sessions.ts:449  await prisma.wellnessEnrollment.create(...)
 * — three separate statements on the bare module-level client, no transaction,
 * no lock, no constraint, and on the paid branch a Razorpay round-trip sitting
 * between the count and the create. The free-satsang branch (:392 -> :404) had
 * the identical shape. A COUNT ceiling is not expressible as a unique index, so
 * nothing downstream caught it either.
 *
 * WHAT THIS FILE PROVES, AND WHAT IT DOES NOT
 *
 * The API suite mocks the Prisma client outright (src/lib/__mocks__/prisma.ts):
 * there is no Postgres in this process, so nothing here can prove Postgres'
 * OWN semantics — not that READ COMMITTED behaves as described, not that
 * `pg_advisory_xact_lock` actually blocks a second backend, and not that it is
 * released at COMMIT under Supabase's transaction-mode pooler. Those rest on
 * the documented behaviour of the function and on the identical mechanism
 * already shipped for the same problem shape at services/booking.service.ts:161.
 *
 * What IS proved here, and proved under genuine async interleaving rather than
 * sequential calls:
 *
 *   1. MECHANISM — the lock is taken, keyed per session, and is the FIRST
 *      statement inside the transaction; the count and the create both happen
 *      inside that same transaction. (describe #1)
 *   2. CONCURRENCY — six requests fired with Promise.all through the real
 *      handler, against an in-memory store whose reads and writes each yield to
 *      the event loop, produce exactly ONE enrolment on a capacity-1 session.
 *      The harness models `pg_advisory_xact_lock` as a real per-key mutex held
 *      to end-of-transaction. (describe #3)
 *   3. NON-VACUITY — the same six-way race, same handler, same harness, with
 *      only the lock primitive turned into a no-op (which is exactly the
 *      pre-fix serialisation story: none) oversells the session. So assertion
 *      #2 is testing the lock, not the harness. (describe #3, last test)
 *
 * The gap between #2/#3 and production is one substitution: a JS mutex stands
 * in for a Postgres advisory lock. That substitution is the unproven part, and
 * it is unproven because this suite has no database — not because it was
 * skipped.
 */

const SESSION_ID = '11111111-1111-1111-1111-111111111111';
const ENROLL_URL = `/api/v1/wellness/sessions/${SESSION_ID}/enroll`;
const LOCK_KEY = `wellness-session-capacity:${SESSION_ID}`;

/**
 * Demo tokens resolve `demo-<handle>` through DEMO_ROLE_MAP (middlewares/auth.ts:147)
 * to a seeded email. Every handle below carries DEVOTEE among its roles, so all
 * of them clear `requireRole('DEVOTEE')` on the enrol route while mapping to a
 * DISTINCT user id — which is what makes a multi-devotee race expressible at
 * all. `demo-devotee2` would NOT work: an unknown handle falls back to the
 * devotee profile and therefore to the SAME user.
 */
const RACERS = [
  { token: 'demo-devotee', email: 'devotee@demo.com', id: 'aaaaaaaa-0000-4000-8000-000000000001' },
  { token: 'demo-pandit', email: 'pandit@demo.com', id: 'aaaaaaaa-0000-4000-8000-000000000002' },
  { token: 'demo-store', email: 'store@demo.com', id: 'aaaaaaaa-0000-4000-8000-000000000003' },
  { token: 'demo-astro', email: 'astro@demo.com', id: 'aaaaaaaa-0000-4000-8000-000000000004' },
  { token: 'demo-temple', email: 'temple@demo.com', id: 'aaaaaaaa-0000-4000-8000-000000000005' },
  { token: 'demo-gaushala', email: 'gaushala@demo.com', id: 'aaaaaaaa-0000-4000-8000-000000000006' },
] as const;

const USERS_BY_EMAIL = new Map<string, Record<string, unknown>>(
  RACERS.map((r) => [
    r.email as string,
    {
      id: r.id,
      email: r.email,
      phone: null,
      fullName: r.email,
      subscriptionTier: 'free',
      blocked: false,
    },
  ]),
);

function sessionRow(over: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    instructorId: 'cccccccc-0000-4000-8000-000000000001',
    title: 'Sunrise Hatha',
    description: 'Morning flow',
    type: 'YOGA',
    scheduledAt: new Date(Date.now() + 86_400_000),
    durationMinutes: 60,
    capacity: 10,
    priceInr: '1000.00',
    roomUrl: null,
    status: 'SCHEDULED',
    ...over,
  };
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  await app.ready();
  return app;
}

function enroll(app: Awaited<ReturnType<typeof buildApp>>, token = 'demo-devotee') {
  return app.inject({
    method: 'POST',
    url: ENROLL_URL,
    headers: { authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email ? (USERS_BY_EMAIL.get(args.where.email) ?? null) : null,
  );
  // Restore the shared default the mock module ships with — describe #3 replaces
  // it, and these objects are shared across the whole suite.
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(prismaMock),
  );
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────────────
// 1. MECHANISM — the lock exists, is keyed right, and wraps the count+create
// ───────────────────────────────────────────────────────────────────────────
describe('F455 — the capacity claim is serialised, not merely re-checked', () => {
  beforeEach(() => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow());
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(null);
    prismaMock.wellnessEnrollment.count.mockResolvedValue(0);
    prismaMock.wellnessEnrollment.create.mockResolvedValue({
      id: 'dddddddd-0000-4000-8000-000000000001',
      status: 'PENDING_PAYMENT',
    });
  });

  it('opens ONE transaction and takes a per-session advisory lock inside it', async () => {
    const app = await buildApp();
    const res = await enroll(app);

    expect(res.statusCode).toBe(201);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);

    const [sql, key] = prismaMock.$queryRawUnsafe.mock.calls[0]!;
    expect(String(sql)).toMatch(/pg_advisory_xact_lock/);
    // Keyed on the session identity, not the row: enrolments serialise against
    // each other and against nothing else.
    expect(key).toBe(LOCK_KEY);
    await app.close();
  });

  it('takes the lock BEFORE the authoritative count (a lock after the read is no lock)', async () => {
    const app = await buildApp();
    await enroll(app);

    const lockAt = prismaMock.$queryRawUnsafe.mock.invocationCallOrder[0]!;
    const countOrders = prismaMock.wellnessEnrollment.count.mock.invocationCallOrder;
    const createAt = prismaMock.wellnessEnrollment.create.mock.invocationCallOrder[0]!;

    // Two counts: the cheap pre-check outside the lock, then the authoritative
    // one inside it. The lock sits between them, and the create sits after both.
    expect(countOrders).toHaveLength(2);
    expect(countOrders[0]!).toBeLessThan(lockAt);
    expect(lockAt).toBeLessThan(countOrders[1]!);
    expect(countOrders[1]!).toBeLessThan(createAt);
    await app.close();
  });

  it('still enrols when the advisory lock cannot be taken (best-effort degradation)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('function does not exist'));

    const app = await buildApp();
    const res = await enroll(app);

    // Degrading to the pre-fix (racy) behaviour is strictly better than failing
    // every enrolment — but it must be visible in the logs.
    expect(res.statusCode).toBe(201);
    expect(warn).toHaveBeenCalled();
    expect(prismaMock.wellnessEnrollment.create).toHaveBeenCalledTimes(1);
    await app.close();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2. DOMAIN OUTCOMES — full is a 409, uncapped enrols, DB errors are translated
// ───────────────────────────────────────────────────────────────────────────
describe('F455 — capacity outcomes are domain answers, never a leaked 500', () => {
  beforeEach(() => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(null);
    prismaMock.wellnessEnrollment.create.mockResolvedValue({
      id: 'dddddddd-0000-4000-8000-000000000001',
      status: 'PENDING_PAYMENT',
    });
  });

  it('PAID path: a session at capacity is refused 409 "Session is full"', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ capacity: 2 }));
    prismaMock.wellnessEnrollment.count.mockResolvedValue(2);

    const app = await buildApp();
    const res = await enroll(app);

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Session is full');
    expect(prismaMock.wellnessEnrollment.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('PAID path: a session with a spare spot still enrols (201 + order id)', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ capacity: 5 }));
    prismaMock.wellnessEnrollment.count.mockResolvedValue(4);

    const app = await buildApp();
    const res = await enroll(app);

    expect(res.statusCode).toBe(201);
    expect(res.json().data.razorpayOrderId).toMatch(/^order_demo_/);
    await app.close();
  });

  it('FREE satsang path: a session at capacity is refused 409, not oversold', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(
      sessionRow({ capacity: 3, priceInr: '0.00' }),
    );
    prismaMock.wellnessEnrollment.count.mockResolvedValue(3);

    const app = await buildApp();
    const res = await enroll(app);

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Session is full');
    expect(prismaMock.wellnessEnrollment.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('FREE satsang path: a session with room enrols straight to PAID', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(
      sessionRow({ capacity: 3, priceInr: '0.00' }),
    );
    prismaMock.wellnessEnrollment.count.mockResolvedValue(1);
    prismaMock.wellnessEnrollment.create.mockResolvedValue({
      id: 'dddddddd-0000-4000-8000-000000000002',
      status: 'PAID',
    });

    const app = await buildApp();
    const res = await enroll(app);

    expect(res.statusCode).toBe(201);
    expect(res.json().data.free).toBe(true);
    // The lock is taken on the free branch too — it is the volume path.
    expect(String(prismaMock.$queryRawUnsafe.mock.calls[0]![0])).toMatch(/pg_advisory_xact_lock/);
    await app.close();
  });

  it('a large capacity is honoured — the ceiling is not confused with "unlimited"', async () => {
    // `capacity` is INTEGER NOT NULL (prisma/baseline/0_init.sql:1017) and every
    // write path validates `.positive()`, so there is no null capacity to
    // misread. This pins the two ends of the range that do exist.
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ capacity: 10000 }));
    prismaMock.wellnessEnrollment.count.mockResolvedValue(9999);

    const app = await buildApp();
    expect((await enroll(app)).statusCode).toBe(201);
    await app.close();
  });

  it('translates the session+user unique violation (P2002) into 409, not a 500', async () => {
    // Reachable when the advisory lock is unavailable and the same devotee
    // double-taps: both requests read no existing row, both try to create, and
    // wellness_enrollments_session_id_user_id_key rejects the second. Pre-fix
    // this was an unhandled rejection out of a bare `create`.
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ capacity: 50 }));
    prismaMock.wellnessEnrollment.count.mockResolvedValue(0);
    prismaMock.wellnessEnrollment.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['session_id', 'user_id'] },
      }),
    );

    const app = await buildApp();
    const res = await enroll(app);

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('You are already enrolled');
    await app.close();
  });

  it('a genuine database failure is NOT swallowed into a 409', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ capacity: 50 }));
    prismaMock.wellnessEnrollment.count.mockResolvedValue(0);
    prismaMock.wellnessEnrollment.create.mockRejectedValue(
      Object.assign(new Error('connection terminated'), { code: 'P1017' }),
    );

    const app = await buildApp();
    const res = await enroll(app);

    // The translation must be narrow: only the capacity and duplicate outcomes
    // become 409s. Everything else still surfaces as a server error.
    expect(res.statusCode).toBe(500);
    await app.close();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 3. CONCURRENCY — a real six-way interleaved race through the real handler
// ───────────────────────────────────────────────────────────────────────────

/** One event-loop turn, standing in for a database round trip. */
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

type StoreRow = { id: string; sessionId: string; userId: string; status: string };

/**
 * Wires the shared prismaMock to a stateful in-memory store whose every read and
 * write yields to the event loop, so concurrent `app.inject` calls genuinely
 * interleave instead of running to completion one at a time.
 *
 * `lockEnabled: false` turns the advisory-lock call into a no-op while leaving
 * everything else identical. That is precisely the pre-fix serialisation story —
 * none — and it is how the oversell is reproduced below.
 */
function installRaceHarness(opts: { capacity: number; priceInr: string; lockEnabled: boolean }) {
  const rows: StoreRow[] = [];
  const chains = new Map<string, Promise<void>>();
  let seq = 0;

  async function acquire(key: string): Promise<() => void> {
    const prev = chains.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((r) => {
      release = r;
    });
    chains.set(
      key,
      prev.then(() => mine),
    );
    await prev;
    return release;
  }

  prismaMock.wellnessSession.findUnique.mockImplementation(async () => {
    await tick();
    return sessionRow({ capacity: opts.capacity, priceInr: opts.priceInr });
  });

  prismaMock.wellnessEnrollment.findUnique.mockImplementation(
    async (args: { where: { sessionId_userId: { sessionId: string; userId: string } } }) => {
      await tick();
      const { sessionId, userId } = args.where.sessionId_userId;
      return rows.find((r) => r.sessionId === sessionId && r.userId === userId) ?? null;
    },
  );

  prismaMock.wellnessEnrollment.count.mockImplementation(
    async (args: { where: { sessionId: string; status: { in: string[] } } }) => {
      await tick();
      return rows.filter(
        (r) => r.sessionId === args.where.sessionId && args.where.status.in.includes(r.status),
      ).length;
    },
  );

  prismaMock.wellnessEnrollment.create.mockImplementation(
    async (args: { data: { sessionId: string; userId: string; status: string } }) => {
      await tick();
      const { sessionId, userId, status } = args.data;
      // wellness_enrollments_session_id_user_id_key, modelled.
      if (rows.some((r) => r.sessionId === sessionId && r.userId === userId)) {
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }
      const row = { id: `enr-${++seq}`, sessionId, userId, status };
      rows.push(row);
      return row;
    },
  );

  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const releases: Array<() => void> = [];
    const tx = {
      ...prismaMock,
      // `pg_advisory_xact_lock`, modelled: a per-key mutex held until the
      // transaction ends. That end-of-transaction release is the whole point —
      // a lock released before the INSERT commits would not close the window.
      $queryRawUnsafe: async (_sql: string, key: string) => {
        if (opts.lockEnabled) releases.push(await acquire(key));
        return [];
      },
    };
    try {
      return await fn(tx);
    } finally {
      releases.forEach((r) => r());
    }
  });

  return rows;
}

describe('F455 — six devotees race the last spot (real interleaving)', () => {
  it('PAID path: exactly one enrolment survives on a capacity-1 session', async () => {
    const rows = installRaceHarness({ capacity: 1, priceInr: '1000.00', lockEnabled: true });
    const app = await buildApp();

    const results = await Promise.all(RACERS.map((r) => enroll(app, r.token)));
    const codes = results.map((r) => r.statusCode).sort();

    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(5);
    // No 500 leaked out of the losing five.
    expect(codes.filter((c) => c >= 500)).toHaveLength(0);
    // The invariant itself, read off the store rather than off a status code.
    expect(rows).toHaveLength(1);
    await app.close();
  });

  it('FREE satsang path: exactly one enrolment survives on a capacity-1 session', async () => {
    const rows = installRaceHarness({ capacity: 1, priceInr: '0.00', lockEnabled: true });
    const app = await buildApp();

    const results = await Promise.all(RACERS.map((r) => enroll(app, r.token)));

    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(1);
    expect(results.filter((r) => r.statusCode >= 500)).toHaveLength(0);
    expect(rows).toHaveLength(1);
    await app.close();
  });

  it('a capacity-3 session under a six-way race fills to exactly 3, never 4', async () => {
    const rows = installRaceHarness({ capacity: 3, priceInr: '1000.00', lockEnabled: true });
    const app = await buildApp();

    const results = await Promise.all(RACERS.map((r) => enroll(app, r.token)));

    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(3);
    expect(rows).toHaveLength(3);
    await app.close();
  });

  it('capacity-3 race writes 3 rows and answers the other three 409, with no 500', async () => {
    const rows = installRaceHarness({ capacity: 3, priceInr: '0.00', lockEnabled: true });
    const app = await buildApp();

    const results = await Promise.all(RACERS.map((r) => enroll(app, r.token)));

    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(3);
    expect(results.filter((r) => r.statusCode >= 500)).toHaveLength(0);
    expect(rows).toHaveLength(3);
    await app.close();
  });

  it('NON-VACUITY: with the lock neutered, the same race oversells the session', async () => {
    // Identical handler, identical harness — only `pg_advisory_xact_lock` is a
    // no-op, which is exactly the pre-fix state of this code path (count and
    // create with nothing serialising them). If this test ever goes green with
    // one row, the harness has stopped modelling concurrency and the three
    // tests above are worthless.
    const rows = installRaceHarness({ capacity: 1, priceInr: '1000.00', lockEnabled: false });
    const app = await buildApp();

    await Promise.all(RACERS.map((r) => enroll(app, r.token)));

    expect(rows.length).toBeGreaterThan(1);
    await app.close();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 4. REAL-PAYMENT MODE — a full session must not mint an orphan Razorpay order
// ───────────────────────────────────────────────────────────────────────────
describe('F455 — a full session is refused before any Razorpay order is minted', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    // The route computes `isDemoPayment` and constructs its Razorpay client at
    // MODULE LOAD, so the real-payment branch is only reachable behind a
    // resetModules + dynamic re-import (same dance as wellness-sessions.test.ts).
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_f455');
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret_f455');
    vi.resetModules();
    ordersCreate.mockReset();
    ordersCreate.mockResolvedValue({ id: 'order_live_f455' });

    const mod = await import('./wellness-sessions.js');
    app = Fastify({ logger: false });
    await app.register(mod.wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
    await app.ready();

    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(null);
    prismaMock.wellnessEnrollment.create.mockResolvedValue({
      id: 'dddddddd-0000-4000-8000-000000000009',
      status: 'PENDING_PAYMENT',
    });
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('refuses 409 and never calls razorpay.orders.create when the session is full', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ capacity: 4 }));
    prismaMock.wellnessEnrollment.count.mockResolvedValue(4);

    const res = await enroll(app);

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Session is full');
    // Pre-fix the capacity gate sat AFTER razorpay.orders.create (:436, with the
    // order created at :416), so every enrol attempt on a full class opened a
    // REAL live order that no one would ever be permitted to pay.
    expect(ordersCreate).not.toHaveBeenCalled();
    expect(prismaMock.wellnessEnrollment.create).not.toHaveBeenCalled();
  });

  it('mints exactly one order and enrols when a spot is free', async () => {
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ capacity: 4 }));
    prismaMock.wellnessEnrollment.count.mockResolvedValue(1);

    const res = await enroll(app);

    expect(res.statusCode).toBe(201);
    expect(ordersCreate).toHaveBeenCalledTimes(1);
    expect(res.json().data.razorpayOrderId).toBe('order_live_f455');
  });

  it('does not leave the enrolment un-written when the lock is held then released', async () => {
    // The order is minted OUTSIDE the transaction on purpose — a DB transaction
    // must never be held open across a third-party network call. This pins that
    // the order id created before the lock still reaches the persisted row.
    prismaMock.wellnessSession.findUnique.mockResolvedValue(sessionRow({ capacity: 9 }));
    prismaMock.wellnessEnrollment.count.mockResolvedValue(0);

    await enroll(app);

    const createArgs = prismaMock.wellnessEnrollment.create.mock.calls[0]![0] as {
      data: { razorpayOrderId?: string; status?: string };
    };
    expect(createArgs.data.razorpayOrderId).toBe('order_live_f455');
    expect(createArgs.data.status).toBe('PENDING_PAYMENT');
  });
});
