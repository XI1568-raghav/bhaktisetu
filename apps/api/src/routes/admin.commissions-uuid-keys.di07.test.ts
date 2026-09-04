import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';

/**
 * DI-07 (F368) — the admin commission ledger must survive a non-uuid key.
 *
 * THE MISMATCH, measured against production on 2026-09-01 via
 * information_schema.columns:
 *
 *   commissions.booking_id             text  ->  puja_bookings.id         uuid
 *   commissions.store_order_id         text  ->  store_orders.id          uuid
 *   commissions.wellness_enrollment_id text  ->  wellness_enrollments.id  uuid
 *
 * All three are `text`, all three point at `uuid` primary keys, and
 * `pg_constraint` on `commissions` carries exactly one foreign key — on
 * `payout_request_id`. Nothing at the database layer stops a non-uuid string
 * landing in any of them, and the schema note on `Commission.bookingId` records
 * that consultation ids WERE slug-shaped until 2026-08-12.
 *
 * WHY THAT IS A LIVE 500 AND NOT A TIDINESS COMPLAINT. `GET /admin/commissions`
 * collects those three columns off the page of rows and hands them to
 * `findMany({ where: { id: { in: [...] } } })` on models whose `id` is
 * `@db.Uuid`. Prisma raises P2023 ("Error creating UUID") on a malformed value
 * rather than returning no match, and this handler has no error boundary — so
 * ONE legacy row anywhere on the page 500s the entire ledger screen. The repo
 * has hit this exact class before: `GET /bookings/slots` carries a uuid-shape
 * guard with the note "Prisma's findUnique throws P2023 on malformed uuids (cf.
 * TD15 prod smoke 2026-05-04 surfacing 500s when legacy mobile clients sent
 * slug-style ids)".
 *
 * The mocks below REPRODUCE that Prisma behaviour deliberately: each lookup
 * rejects with a P2023 if it is handed anything that is not uuid-shaped. That
 * is what makes these assertions fail against the unfixed handler — with an
 * inert mock the bad id is simply passed through and nothing blows up, which is
 * precisely why the defect survived. Every assertion is on the HTTP response
 * and on the arguments the handler actually sent.
 */

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What Prisma does when a `@db.Uuid` column is filtered with a bad value. */
function uuidStrictFindMany(rows: Array<{ id: string } & Record<string, unknown>>, model: string) {
  return vi.fn(async (args: { where?: { id?: { in?: string[] } } }) => {
    const ids = args?.where?.id?.in ?? [];
    const bad = ids.find((id) => !UUID_RE.test(id));
    if (bad !== undefined) {
      throw new Prisma.PrismaClientKnownRequestError(
        `Inconsistent column data: Error creating UUID, invalid character: expected an optional prefix of \`urn:uuid:\` followed by [0-9a-fA-F-], found \`${bad}\` on ${model}.id`,
        { code: 'P2023', clientVersion: '6.6.0' },
      );
    }
    return rows.filter((r) => ids.includes(r.id));
  });
}

const PUJA_BOOKING_UUID = '11111111-1111-4111-8111-111111111111';
const STORE_ORDER_UUID = '22222222-2222-4222-8222-222222222222';
const ENROLLMENT_UUID = '33333333-3333-4333-8333-333333333333';

function commissionRow(over: Record<string, unknown>) {
  return {
    id: 'com-x',
    bookingId: null,
    storeOrderId: null,
    wellnessEnrollmentId: null,
    payoutRequestId: null,
    providerId: '44444444-4444-4444-8444-444444444444',
    amount: new Prisma.Decimal('880.00'),
    percentage: new Prisma.Decimal('0.2000'),
    status: 'PENDING',
    paidAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    payoutRequest: null,
    ...over,
  };
}

async function getCommissions() {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await adminRoutes(instance);
    },
    { prefix: '/api/v1/admin' },
  );
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/commissions',
    headers: { authorization: 'Bearer demo-admin' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test'; // enables the demo-token bypass in auth middleware
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.commission.count.mockResolvedValue(1 as never);
  prismaMock.commission.groupBy.mockResolvedValue([] as never);
  prismaMock.user.findMany.mockResolvedValue([] as never);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([] as never);

  (prismaMock.pujaBooking as Record<string, unknown>).findMany = uuidStrictFindMany(
    [{ id: PUJA_BOOKING_UUID, bookingNumber: 'BS-20260801-AAAAA', pujaType: { name: 'Satyanarayan' } }],
    'PujaBooking',
  );
  (prismaMock.storeOrder as Record<string, unknown>).findMany = uuidStrictFindMany(
    [{ id: STORE_ORDER_UUID, orderNumber: 'SO-1' }],
    'StoreOrder',
  );
  (prismaMock.wellnessEnrollment as Record<string, unknown>).findMany = uuidStrictFindMany(
    [{ id: ENROLLMENT_UUID, session: { title: 'Morning Yoga' } }],
    'WellnessEnrollment',
  );
});

describe('DI-07 — a legacy non-uuid key must not take down the admin ledger', () => {
  it('the simulation itself rejects a slug, so these tests can fail', async () => {
    // Guard on the guard: if this stopped throwing, every assertion below would
    // pass for the wrong reason.
    const lookup = uuidStrictFindMany([], 'PujaBooking');
    await expect(lookup({ where: { id: { in: ['satyanarayan-katha'] } } })).rejects.toMatchObject({
      code: 'P2023',
    });
    await expect(
      lookup({ where: { id: { in: [PUJA_BOOKING_UUID] } } }),
    ).resolves.toEqual([]);
  });

  it('answers 200 when one row carries a slug-shaped booking_id', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      commissionRow({ id: 'com-legacy', bookingId: 'legacy-consult-slug' }),
      commissionRow({ id: 'com-ok', bookingId: PUJA_BOOKING_UUID }),
    ] as never);
    prismaMock.commission.count.mockResolvedValue(2 as never);

    const res = await getCommissions();

    expect(res.statusCode).toBe(200);
    const rows = res.json().data as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    // The unresolvable row still appears — an admin reconciling a ledger must
    // see every payable, labelled or not.
    const legacy = rows.find((r) => r.id === 'com-legacy')!;
    expect(legacy.bookingId).toBe('legacy-consult-slug');
    expect(legacy.bookingNumber).toBeNull();
    // ...and the resolvable one is still labelled.
    const ok = rows.find((r) => r.id === 'com-ok')!;
    expect(ok.bookingNumber).toBe('BS-20260801-AAAAA');
  });

  it('sends only uuid-shaped ids to each of the three uuid-keyed lookups', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      commissionRow({ id: 'c1', bookingId: 'legacy-consult-slug' }),
      commissionRow({ id: 'c2', bookingId: PUJA_BOOKING_UUID }),
      commissionRow({ id: 'c3', storeOrderId: 'SO-legacy-ref' }),
      commissionRow({ id: 'c4', storeOrderId: STORE_ORDER_UUID }),
      commissionRow({ id: 'c5', wellnessEnrollmentId: 'enrol-legacy' }),
      commissionRow({ id: 'c6', wellnessEnrollmentId: ENROLLMENT_UUID }),
    ] as never);
    prismaMock.commission.count.mockResolvedValue(6 as never);

    const res = await getCommissions();
    expect(res.statusCode).toBe(200);

    const sent = (m: { mock: { calls: unknown[][] } }) =>
      (m.mock.calls[0]![0] as { where: { id: { in: string[] } } }).where.id.in;

    // All three columns are `text` against a `uuid` primary key, so all three
    // need the filter — checking only booking_id would leave two live 500s.
    expect(sent(prismaMock.pujaBooking.findMany as never)).toEqual([PUJA_BOOKING_UUID]);
    expect(sent(prismaMock.storeOrder.findMany as never)).toEqual([STORE_ORDER_UUID]);
    expect(sent(prismaMock.wellnessEnrollment.findMany as never)).toEqual([ENROLLMENT_UUID]);
  });

  it('skips a lookup entirely when no id on the page is uuid-shaped', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      commissionRow({ id: 'c1', bookingId: 'legacy-consult-slug' }),
    ] as never);

    const res = await getCommissions();

    expect(res.statusCode).toBe(200);
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
  });
});
