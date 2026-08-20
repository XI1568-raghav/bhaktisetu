import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * OPS-05 — there is no durable audit trail for money events.
 *
 * BASELINE, measured on this branch before the fix: `grep -c '^model '` over
 * `git show HEAD:apps/api/prisma/schema.prisma` reports 66 models and
 * `grep -cE '^model .*[Aa]udit'` reports 0. `git ls-tree -r HEAD` lists zero
 * files matching `apps/api/src/(lib|services)/audit*`. Every money model stores
 * only its current status, and the historical breadcrumbs that do exist live in
 * `Payment.metadata`, which the next refund overwrites. So "what happened to
 * this payment" was unanswerable from anything the product stores — a support
 * problem and, for a platform issuing 80G donation receipts, a legal one.
 *
 * These tests lock the properties that make the new log usable AS EVIDENCE, not
 * merely present:
 *   - it captures actor, amount, gateway ids and before/after status;
 *   - a logging failure can never roll back or reject a real money transaction;
 *   - a retried webhook does not inflate the trail;
 *   - signing secrets never land in it;
 *   - it is append-only, in code AND in the migration;
 *   - a disputed refund can actually be reconstructed from it end to end.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  } as Record<string, any>,
}));

vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

import {
  MONEY_EVENTS,
  recordMoneyEvent,
  recordMoneyEventDetached,
  getMoneyTrail,
  normalizeAmount,
  __resetAuditMoneyForTests,
} from './audit-money.js';
import * as auditMoneyModule from './audit-money.js';

/** Zip the INSERT's own column list against its bound parameters. */
function boundColumns(call: unknown[]): Record<string, unknown> {
  const sql = String(call[0]);
  const columnList = sql.slice(sql.indexOf('(') + 1, sql.indexOf(') VALUES'));
  const cols = columnList
    .split(',')
    .map((c) => c.trim().replace(/"/g, ''))
    .filter(Boolean);
  const args = call.slice(1);
  const out: Record<string, unknown> = {};
  cols.forEach((c, i) => {
    out[c] = args[i];
  });
  return out;
}

function lastInsert(): Record<string, unknown> {
  const calls = prismaMock.$executeRawUnsafe.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return boundColumns(calls[calls.length - 1]);
}

let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  __resetAuditMoneyForTests();
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
  error.mockRestore();
});

describe('OPS-05: a money event carries enough to reconstruct a dispute', () => {
  it('records actor, amount, gateway ids and the before/after status of a capture', async () => {
    const result = await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
      actorType: 'gateway',
      actorId: null,
      subjectType: 'payment',
      subjectId: 'pay-row-1',
      bookingId: 'bk-1',
      paymentId: 'pay-row-1',
      amount: '5000.00',
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: 'order_ABC',
      gatewayPaymentId: 'pay_XYZ',
      statusBefore: 'initiated',
      statusAfter: 'captured',
      note: 'razorpay webhook payment.captured',
    });

    expect(result).toMatchObject({ ok: true, wrote: true });

    const row = lastInsert();
    expect(row.event_type).toBe('payment.captured');
    // WHO acted — a webhook is not the same fact as an admin or a cron.
    expect(row.actor_type).toBe('gateway');
    // HOW MUCH, as an exact decimal string, never a float.
    expect(row.amount).toBe('5000.00');
    expect(row.currency).toBe('INR');
    // The gateway handles Razorpay support will actually accept.
    expect(row.gateway).toBe('razorpay');
    expect(row.gateway_order_id).toBe('order_ABC');
    expect(row.gateway_payment_id).toBe('pay_XYZ');
    // The pair no mutable status column can ever tell you afterwards.
    expect(row.status_before).toBe('initiated');
    expect(row.status_after).toBe('captured');
    // Correlation keys, so one indexed read answers "this booking".
    expect(row.booking_id).toBe('bk-1');
    expect(row.payment_id).toBe('pay-row-1');
    expect(String(row.id)).toMatch(/^[0-9a-f-]{36}$/i);
    expect(String(row.occurred_at)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  });

  it('defaults the actor to system rather than inventing a human', async () => {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.COMMISSION_MINTED,
      subjectType: 'commission',
      subjectId: 'com-1',
    });
    expect(lastInsert().actor_type).toBe('system');
  });
});

describe('OPS-05: logging can never break the money transaction it describes', () => {
  it('resolves ok:false instead of rejecting when the insert fails', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('connection terminated'));

    const result = await recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_COMPLETED,
      subjectType: 'payment',
      subjectId: 'pay-1',
    });

    expect(result.ok).toBe(false);
    expect(result.wrote).toBe(false);
    if (result.ok) throw new Error('expected a failed record');
    expect(result.reason).toContain('connection terminated');
  });

  it('resolves ok:false when the client itself blows up synchronously', async () => {
    prismaMock.$executeRawUnsafe.mockImplementation(() => {
      throw new TypeError('client is not initialised');
    });
    await expect(
      recordMoneyEvent({
        eventType: MONEY_EVENTS.PAYOUT_PROCESSED,
        subjectType: 'payout',
        subjectId: 'po-1',
      }),
    ).resolves.toMatchObject({ ok: false });
  });

  it('the detached form swallows a failure without an unhandled rejection', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('boom'));
    const onUnhandled = vi.fn();
    process.on('unhandledRejection', onUnhandled);
    try {
      recordMoneyEventDetached({
        eventType: MONEY_EVENTS.PAYMENT_INITIATED,
        subjectType: 'payment',
        subjectId: 'pay-2',
      });
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    expect(onUnhandled).not.toHaveBeenCalled();
  });

  it('takes no transaction client, so a failed log cannot poison a caller tx', () => {
    // A `tx` parameter is the whole hazard: Postgres aborts an entire
    // transaction on any statement error, so an audit INSERT inside the
    // caller's tx would roll back the capture it was describing. The contract
    // is enforced by arity — there is nowhere to pass one.
    expect(recordMoneyEvent.length).toBe(1);
    expect(recordMoneyEventDetached.length).toBe(1);
  });

  it('says loudly, and only once, that the table is missing', async () => {
    const missing = Object.assign(new Error('relation "money_audit_events" does not exist'), {
      code: '42P01',
    });
    prismaMock.$executeRawUnsafe.mockRejectedValue(missing);

    const first = await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
      subjectType: 'payment',
      subjectId: 'pay-1',
    });
    const second = await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
      subjectType: 'payment',
      subjectId: 'pay-2',
    });

    expect(first).toMatchObject({ ok: false, reason: 'table-missing' });
    expect(second).toMatchObject({ ok: false, reason: 'table-missing' });
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0]?.[0])).toContain('money_audit_events is missing');
  });
});

describe('OPS-05: a retried webhook does not inflate the trail', () => {
  it('inserts with ON CONFLICT DO NOTHING on the idempotency key', async () => {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
      subjectType: 'payment',
      subjectId: 'pay-1',
      idempotencyKey: 'razorpay:evt_1',
    });
    const sql = String(prismaMock.$executeRawUnsafe.mock.calls[0]?.[0]);
    expect(sql).toMatch(/ON CONFLICT \("idempotency_key"\) DO NOTHING/i);
    expect(lastInsert().idempotency_key).toBe('razorpay:evt_1');
  });

  it('reports a suppressed duplicate as a success, distinct from a failure', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);
    const result = await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
      subjectType: 'payment',
      subjectId: 'pay-1',
      idempotencyKey: 'razorpay:evt_1',
    });
    // "already recorded" is not "failed to record". Collapsing the two is how
    // an at-least-once source ends up looking broken in an operator dashboard.
    expect(result).toEqual({ ok: true, wrote: false, reason: 'duplicate' });
  });
});

describe('OPS-05: the audit log is not a credential store', () => {
  it('redacts signature- and secret-shaped keys at any depth', async () => {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_VERIFIED,
      subjectType: 'payment',
      subjectId: 'pay-1',
      metadata: {
        razorpay_signature: 'deadbeefsignature',
        bookingNumber: 'BK-2026-001',
        gateway: { key_secret: 'rzp_secret_value', keyId: 'rzp_live_public' },
      },
    });

    const metadata = JSON.parse(String(lastInsert().metadata));
    expect(metadata.razorpay_signature).toBe('[redacted]');
    expect(metadata.gateway.key_secret).toBe('[redacted]');
    // Non-secret context survives — redaction must not gut the evidence.
    expect(metadata.bookingNumber).toBe('BK-2026-001');
    expect(metadata.gateway.keyId).toBe('rzp_live_public');

    // And the secret value appears in NO bound parameter, not merely a
    // rewritten copy of one.
    const everyArg = prismaMock.$executeRawUnsafe.mock.calls.flat().map(String).join('|');
    expect(everyArg).not.toContain('deadbeefsignature');
    expect(everyArg).not.toContain('rzp_secret_value');
  });

  it('caps a runaway gateway payload instead of writing it', async () => {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
      subjectType: 'payment',
      subjectId: 'pay-1',
      metadata: { blob: 'x'.repeat(20000) },
    });
    const metadata = JSON.parse(String(lastInsert().metadata));
    expect(metadata._truncated).toBe(true);
    expect(metadata._originalChars).toBeGreaterThan(4096);
  });

  it('defuses a cyclic metadata object instead of losing the event', async () => {
    const cyclic: Record<string, unknown> = { bookingNumber: 'BK-1' };
    cyclic.self = cyclic;

    const result = await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
      subjectType: 'payment',
      subjectId: 'pay-1',
      metadata: cyclic,
    });

    // The depth cap breaks the cycle before JSON.stringify ever sees it, so the
    // event is still recorded — losing context is acceptable, losing the money
    // event is not.
    expect(result).toMatchObject({ ok: true, wrote: true });
    const metadata = JSON.parse(String(lastInsert().metadata));
    expect(metadata.bookingNumber).toBe('BK-1');
    expect(JSON.stringify(metadata)).toContain('[depth-limited]');
  });
});

describe('OPS-05: money is never coerced to a float on the way in', () => {
  it('accepts a Prisma.Decimal-shaped value by its exact string', () => {
    expect(normalizeAmount({ toString: () => '4000.00' })).toEqual({
      value: '4000.00',
      raw: null,
    });
  });

  it('fixes a JS number to two places', () => {
    expect(normalizeAmount(1234.5)).toEqual({ value: '1234.50', raw: null });
  });

  it('refuses garbage rather than letting it abort the INSERT', () => {
    expect(normalizeAmount('Rs 5,000')).toEqual({ value: null, raw: 'Rs 5,000' });
    expect(normalizeAmount(Number.NaN)).toEqual({ value: null, raw: 'NaN' });
  });

  it('preserves an unparseable amount in metadata rather than dropping it', async () => {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_COMPLETED,
      subjectType: 'payment',
      subjectId: 'pay-1',
      amount: 'Rs 5,000',
    });
    const row = lastInsert();
    expect(row.amount).toBeNull();
    expect(JSON.parse(String(row.metadata))).toMatchObject({ unparseableAmount: 'Rs 5,000' });
  });
});

describe('OPS-05: the log is append-only', () => {
  it('only ever issues INSERT statements', async () => {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.COMMISSION_REVERSED,
      subjectType: 'commission',
      subjectId: 'com-1',
    });
    recordMoneyEventDetached({
      eventType: MONEY_EVENTS.PAYOUT_REQUESTED,
      subjectType: 'payout',
      subjectId: 'po-1',
    });
    await new Promise((resolve) => setImmediate(resolve));

    const statements = prismaMock.$executeRawUnsafe.mock.calls.map((c: unknown[]) =>
      String(c[0]).trim().toUpperCase(),
    );
    expect(statements.length).toBeGreaterThan(1);
    for (const sql of statements) {
      expect(sql.startsWith('INSERT INTO "MONEY_AUDIT_EVENTS"')).toBe(true);
    }
  });

  it('exports no mutator at all', () => {
    const mutators = Object.keys(auditMoneyModule).filter((name) =>
      /^(update|delete|purge|clear|amend|redact)/i.test(name),
    );
    expect(mutators).toEqual([]);
  });
});

describe('OPS-05: "what happened to this payment" is answerable', () => {
  it('reads a booking trail oldest-first and reports it available', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'e1',
        event_type: 'payment.initiated',
        occurred_at: new Date('2026-08-01T10:00:00Z'),
        actor_type: 'devotee',
        actor_id: 'u1',
        subject_type: 'payment',
        subject_id: 'pay-1',
        booking_id: 'bk-1',
        payment_id: 'pay-1',
        commission_id: null,
        payout_id: null,
        amount: '5000.00',
        currency: 'INR',
        gateway: 'razorpay',
        gateway_order_id: 'order_ABC',
        gateway_payment_id: null,
        gateway_refund_id: null,
        status_before: null,
        status_after: 'initiated',
        request_id: null,
        ip: '203.0.113.9',
        note: null,
        metadata: null,
      },
    ]);

    const trail = await getMoneyTrail({ bookingId: 'bk-1' });

    expect(trail.available).toBe(true);
    expect(trail.events).toHaveLength(1);
    expect(trail.events[0]).toMatchObject({
      eventType: 'payment.initiated',
      actorType: 'devotee',
      amount: '5000.00',
      gatewayOrderId: 'order_ABC',
      statusAfter: 'initiated',
      ip: '203.0.113.9',
    });

    const sql = String(prismaMock.$queryRawUnsafe.mock.calls[0]?.[0]);
    expect(sql).toMatch(/ORDER BY "occurred_at" ASC/);
    expect(prismaMock.$queryRawUnsafe.mock.calls[0]?.slice(1)).toEqual([
      'bk-1',
      null,
      null,
      null,
    ]);
  });

  it('does not shift a timestamp by the host offset when the driver returns text', async () => {
    // Regression: the reader used `new Date(r.occurred_at)`, and a Postgres
    // `timestamp without time zone` rendered as `2026-08-03 09:00:00.000` is
    // parsed by JS as LOCAL time. On this repo's IST workstation every audit
    // timestamp came back 5h30m early — for a log whose whole value is "when,
    // and in what order", that is a correctness bug.
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'e1',
        event_type: 'refund.completed',
        occurred_at: '2026-08-03 09:00:00.000',
        actor_type: 'admin',
        actor_id: 'admin-7',
        subject_type: 'payment',
        subject_id: 'pay-1',
        booking_id: 'bk-1',
        payment_id: 'pay-1',
        commission_id: null,
        payout_id: null,
        amount: '5000.00',
        currency: 'INR',
        gateway: null,
        gateway_order_id: null,
        gateway_payment_id: null,
        gateway_refund_id: 'rfnd_001',
        status_before: 'captured',
        status_after: 'refunded',
        request_id: null,
        ip: null,
        note: null,
        metadata: null,
      },
    ]);

    const trail = await getMoneyTrail({ bookingId: 'bk-1' });
    expect(trail.events[0]?.occurredAt).toBe('2026-08-03T09:00:00.000Z');
  });

  it('refuses an unfiltered dump of every money event in the system', async () => {
    const trail = await getMoneyTrail({});
    expect(trail).toMatchObject({ available: false, reason: 'no-filter' });
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('distinguishes "cannot read the log" from "nothing happened"', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('timeout'));
    const trail = await getMoneyTrail({ paymentId: 'pay-1' });
    // Rendering this as an empty history would tell an operator the payment had
    // no events, which is the opposite of the truth.
    expect(trail).toMatchObject({ available: false, reason: 'read-failed' });
    expect(trail.events).toEqual([]);
  });

  it('clamps the limit so a support query cannot become an export', async () => {
    await getMoneyTrail({ bookingId: 'bk-1', limit: 999999 });
    expect(String(prismaMock.$queryRawUnsafe.mock.calls[0]?.[0])).toMatch(/LIMIT 1000$/);
  });

  it('reconstructs a disputed refund end to end', async () => {
    // A real in-memory table behind the same two entry points, so this proves
    // the write and the read actually agree — not that two mocks agree.
    const table: Array<Record<string, unknown>> = [];
    prismaMock.$executeRawUnsafe.mockImplementation(async (...call: unknown[]) => {
      table.push(boundColumns(call));
      return 1;
    });
    prismaMock.$queryRawUnsafe.mockImplementation(async (_sql: string, bookingId: string) =>
      table.filter((r) => r.booking_id === bookingId),
    );

    await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_INITIATED,
      occurredAt: new Date('2026-08-01T10:00:00Z'),
      actorType: 'devotee',
      actorId: 'u1',
      subjectType: 'payment',
      subjectId: 'pay-1',
      bookingId: 'bk-1',
      paymentId: 'pay-1',
      amount: '5000.00',
      gateway: 'razorpay',
      gatewayOrderId: 'order_ABC',
      statusAfter: 'initiated',
    });
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
      occurredAt: new Date('2026-08-01T10:02:00Z'),
      actorType: 'gateway',
      subjectType: 'payment',
      subjectId: 'pay-1',
      bookingId: 'bk-1',
      paymentId: 'pay-1',
      amount: '5000.00',
      gatewayPaymentId: 'pay_XYZ',
      statusBefore: 'initiated',
      statusAfter: 'captured',
    });
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.COMMISSION_MINTED,
      occurredAt: new Date('2026-08-01T10:02:01Z'),
      subjectType: 'commission',
      subjectId: 'com-1',
      bookingId: 'bk-1',
      commissionId: 'com-1',
      amount: '4000.00',
      statusAfter: 'PENDING',
    });
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_COMPLETED,
      occurredAt: new Date('2026-08-03T09:00:00Z'),
      actorType: 'admin',
      actorId: 'admin-7',
      subjectType: 'payment',
      subjectId: 'pay-1',
      bookingId: 'bk-1',
      paymentId: 'pay-1',
      amount: '5000.00',
      gatewayRefundId: 'rfnd_001',
      statusBefore: 'captured',
      statusAfter: 'refunded',
      note: 'devotee cancelled, full refund',
    });

    const trail = await getMoneyTrail({ bookingId: 'bk-1' });

    expect(trail.available).toBe(true);
    expect(trail.events.map((e) => e.eventType)).toEqual([
      'payment.initiated',
      'payment.captured',
      'commission.minted',
      'refund.completed',
    ]);

    // The four questions the finding says nobody could answer:
    const refund = trail.events[3]!;
    expect(refund.actorType).toBe('admin'); // who refunded
    expect(refund.actorId).toBe('admin-7');
    expect(refund.occurredAt).toBe('2026-08-03T09:00:00.000Z'); // and when
    expect(refund.statusBefore).toBe('captured'); // from what state
    expect(refund.gatewayRefundId).toBe('rfnd_001'); // with which Razorpay id
    // ...and whether the pandit's earning was minted before the refund.
    const mint = trail.events.find((e) => e.eventType === 'commission.minted')!;
    expect(new Date(mint.occurredAt).getTime()).toBeLessThan(
      new Date(refund.occurredAt).getTime(),
    );
    expect(mint.amount).toBe('4000.00');
  });
});

/**
 * The migration runs UNATTENDED against the live database — `prisma migrate
 * deploy` is wired into the API start command — so its safety properties are
 * worth a test rather than a promise.
 */
describe('OPS-05: the migration is safe to auto-apply', () => {
  const migrationPath = fileURLToPath(
    new URL(
      '../../prisma/migrations/20260820120000_ops05_money_audit_events/migration.sql',
      import.meta.url,
    ),
  );
  const rawSql = readFileSync(migrationPath, 'utf8');

  /**
   * Strip `--` line comments and `/* *\/` blocks BEFORE asserting anything.
   * This file's own header explains why CONCURRENTLY is banned and why no
   * column is dropped, so a scan of the raw text would flag the documentation
   * of the rule as a violation of it.
   */
  const sql = rawSql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

  it('the comment stripper is actually doing something', () => {
    // Guards the guard: if this ever stops being true the assertions below have
    // gone vacuous and would pass against a migration that really is unsafe.
    expect(rawSql).toMatch(/CONCURRENTLY/i);
    expect(sql).not.toMatch(/CONCURRENTLY/i);
  });

  it('never uses CREATE INDEX CONCURRENTLY', () => {
    // migrate deploy wraps each migration in a transaction; CONCURRENTLY inside
    // one fails with 25001 and then blocks every later migration.
    expect(sql).not.toMatch(/CONCURRENTLY/i);
  });

  it('contains no destructive DDL', () => {
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(sql).not.toMatch(/\bDROP\s+CONSTRAINT\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bUPDATE\s+"?[a-z_]+"?\s+SET\b/i);
    // Additive only: it must not touch a table it did not create.
    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  it('is re-runnable', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "money_audit_events"/i);
    const creates = sql.match(/CREATE\s+(UNIQUE\s+)?INDEX/gi) ?? [];
    const guarded = sql.match(/CREATE\s+(UNIQUE\s+)?INDEX IF NOT EXISTS/gi) ?? [];
    expect(creates.length).toBeGreaterThan(0);
    expect(guarded.length).toBe(creates.length);
  });

  it('installs the database-level append-only guard', () => {
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON "money_audit_events"/i);
    expect(sql).toMatch(/RAISE EXCEPTION/i);
  });
});

describe('OPS-05: the model is shaped like an audit record', () => {
  const schemaPath = fileURLToPath(new URL('../../prisma/schema.prisma', import.meta.url));
  const schema = readFileSync(schemaPath, 'utf8');

  /** ONLY the MoneyAuditEvent block — not the whole 2,100-line schema. */
  const block = (() => {
    const start = schema.indexOf('model MoneyAuditEvent {');
    expect(start).toBeGreaterThan(-1);
    const open = schema.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < schema.length; i += 1) {
      if (schema[i] === '{') depth += 1;
      if (schema[i] === '}') {
        depth -= 1;
        if (depth === 0) return schema.slice(start, i + 1);
      }
    }
    throw new Error('unterminated model block');
  })();

  /** Comments stripped: the block documents its own rules in prose. */
  const fields = block.replace(/\/\/[^\n]*/g, ' ');

  it('the comment stripper is actually doing something', () => {
    expect(block).toMatch(/\/\//);
    expect(fields).not.toMatch(/\/\//);
  });

  it('has no updatedAt — a row that can be updated is not an audit record', () => {
    expect(fields).not.toMatch(/\bupdatedAt\b/);
    expect(fields).not.toMatch(/@updatedAt/);
  });

  it('declares no relation, so an audit row outlives the row it describes', () => {
    // An FK with ON DELETE CASCADE would erase exactly the history a dispute
    // needs; RESTRICT would let the audit log block ordinary deletes.
    expect(fields).not.toMatch(/@relation\(/);
  });

  it('carries actor, amount, gateway ids and before/after status', () => {
    for (const field of [
      'actorType',
      'actorId',
      'amount',
      'currency',
      'gatewayOrderId',
      'gatewayPaymentId',
      'gatewayRefundId',
      'statusBefore',
      'statusAfter',
      'occurredAt',
    ]) {
      expect(fields).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it('deduplicates an at-least-once source', () => {
    expect(fields).toMatch(/@@unique\(\[idempotencyKey\]\)/);
  });

  it('maps to money_audit_events', () => {
    expect(fields).toMatch(/@@map\("money_audit_events"\)/);
  });
});
