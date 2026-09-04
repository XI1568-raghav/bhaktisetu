import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import Fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { checkAndRecord } = vi.hoisted(() => ({
  checkAndRecord: vi.fn(async () => ({ alreadyProcessed: false })),
}));
vi.mock('../lib/webhook-idempotency.js', () => ({ checkAndRecord }));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'user-1', roles: ['DEVOTEE'] };
  },
}));

/**
 * PAY-04 (P0/money) — recurring UPI Autopay mandates never activate.
 *
 * There are TWO independent subscription stores and they are written by two
 * different functions with the SAME name:
 *
 *   - `subscription.service.handleSubscriptionEvent` writes the marketplace
 *     `MarketplaceSubscription` / `Transaction` rows (role plans).
 *   - `recurring.service.handleSubscriptionEvent` is the ONLY writer of
 *     `recurring_subscriptions.status` — the gau-seva / wellness / temple-seva
 *     UPI Autopay mandates created by `createRecurringSubscription`.
 *
 * The recurring writer hung off the DEFAULT branch of the PAYMENTS webhook
 * dispatcher, while docs/razorpay-live-activation.md subscribes `subscription.*`
 * to `/api/v1/subscriptions/webhook` — an endpoint that only ever called the
 * marketplace writer. So every recurring mandate a devotee authorised stayed
 * `pending` for its entire life: Razorpay debits the ₹51/₹299/₹501 every cycle
 * and our own store never records that the mandate is live.
 *
 * The fix makes the platform indifferent to which endpoint the owner points
 * `subscription.*` at — both endpoints drive both rails — exactly as
 * `refund.created` / `refund.processed` are both handled in payment.service.
 */

const SECRET = 'test_webhook_secret';
const RZP_SUB_ID = 'sub_PAY04LIVEMANDATE';
const ORIG_ENV = { ...process.env };

async function buildApp() {
  // Fresh module graph per delivery. recurring.service caches "table already
  // ensured" in a module-level flag, so a shared graph would make the
  // lazy-CREATE assertion depend on test declaration order.
  vi.resetModules();
  const { subscriptionRoutes } = await import('./subscriptions.js');
  const app = Fastify({ logger: false });
  await app.register(fastifyRawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });
  await app.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  await app.ready();
  return app;
}

function sign(raw: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

async function deliver(event: string, subId: string | null = RZP_SUB_ID, secret = SECRET) {
  const app = await buildApp();
  const payload = {
    event,
    payload: { subscription: { entity: subId ? { id: subId } : {} } },
  };
  const raw = JSON.stringify(payload);
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/subscriptions/webhook',
    payload: raw,
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': sign(raw, secret),
      'x-razorpay-event-id': `evt_${event}_${Math.random().toString(36).slice(2)}`,
    },
  });
  await app.close();
  return res;
}

/** Every raw statement the handler issued, trimmed for matching. */
function rawStatements(): string[] {
  return prismaMock.$executeRawUnsafe.mock.calls.map((c: unknown[]) => String(c[0]));
}

/** The args of the UPDATE that writes recurring_subscriptions.status, if any. */
function recurringStatusUpdate(): unknown[] | undefined {
  const call = prismaMock.$executeRawUnsafe.mock.calls.find((c: unknown[]) =>
    /UPDATE\s+recurring_subscriptions\s+SET\s+status/i.test(String(c[0])),
  );
  return call?.slice(1);
}

beforeEach(() => {
  vi.clearAllMocks();
  checkAndRecord.mockResolvedValue({ alreadyProcessed: false });
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  // The marketplace rail finds no local subscription for this mandate — that
  // is the whole point: this mandate belongs to the RECURRING store.
  prismaMock.transaction.findMany.mockResolvedValue([]);
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

describe('PAY-04 — the subscription webhook activates a recurring UPI Autopay mandate', () => {
  it('subscription.activated moves recurring_subscriptions.status to active', async () => {
    const res = await deliver('subscription.activated');

    expect(res.statusCode).toBe(200);
    expect(recurringStatusUpdate()).toEqual(['active', RZP_SUB_ID]);
  });

  it('subscription.charged (the recurring debit) keeps the mandate active', async () => {
    await deliver('subscription.charged');
    expect(recurringStatusUpdate()).toEqual(['active', RZP_SUB_ID]);
  });

  it('subscription.halted records the dunning state instead of leaving it active', async () => {
    await deliver('subscription.halted');
    expect(recurringStatusUpdate()).toEqual(['halted', RZP_SUB_ID]);
  });

  it('subscription.cancelled records the cancellation', async () => {
    await deliver('subscription.cancelled');
    expect(recurringStatusUpdate()).toEqual(['cancelled', RZP_SUB_ID]);
  });

  it('creates the recurring table before writing to it (lazy-migration store)', async () => {
    await deliver('subscription.activated');
    expect(
      rawStatements().some((s) => /CREATE TABLE IF NOT EXISTS recurring_subscriptions/i.test(s)),
    ).toBe(true);
  });

  it('still drives the marketplace rail — the recurring rail is additive', async () => {
    await deliver('subscription.activated');
    // subscription.service.handleSubscriptionEvent scans SUBSCRIPTION
    // transactions to find the local owner of the mandate. If this stopped
    // being called, role-plan renewals would silently stop provisioning.
    expect(prismaMock.transaction.findMany).toHaveBeenCalled();
  });

  it('an unsigned delivery reaches NEITHER rail', async () => {
    const res = await deliver('subscription.activated', RZP_SUB_ID, 'attacker_secret');

    expect(res.statusCode).toBe(400);
    expect(recurringStatusUpdate()).toBeUndefined();
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it('honours RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET when the endpoint has its own secret', async () => {
    // The runbook has always told the owner this var exists. Nothing read it,
    // so a separate subscriptions secret rejected every mandate event with 400.
    process.env.RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET = 'subs_only_secret';

    const res = await deliver('subscription.activated', RZP_SUB_ID, 'subs_only_secret');

    expect(res.statusCode).toBe(200);
    expect(recurringStatusUpdate()).toEqual(['active', RZP_SUB_ID]);
  });

  it('the subscription-specific secret takes precedence over the shared one', async () => {
    process.env.RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET = 'subs_only_secret';

    // Signed with the SHARED secret, which is no longer the one in force here.
    const res = await deliver('subscription.activated', RZP_SUB_ID, SECRET);

    expect(res.statusCode).toBe(400);
    expect(recurringStatusUpdate()).toBeUndefined();
  });

  it('fails CLOSED when neither secret is configured', async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET;

    const res = await deliver('subscription.activated');

    expect(res.statusCode).toBe(500);
    expect(recurringStatusUpdate()).toBeUndefined();
  });

  it('an event with no subscription id writes nothing', async () => {
    await deliver('subscription.activated', null);
    expect(recurringStatusUpdate()).toBeUndefined();
  });

  it('a recurring-store failure never sinks the whole webhook', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValue(
      new Error('relation "recurring_subscriptions" does not exist'),
    );

    const res = await deliver('subscription.activated');

    expect(res.statusCode).toBe(200);
    expect(prismaMock.transaction.findMany).toHaveBeenCalled();
  });
});
