import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminLeadConversionRoutes } from './admin-lead-conversion.js';

/**
 * SCAL-04 (P1) — GET /admin/leads/conversion read TWO whole tables per hit.
 *
 * The funnel dashboard pulled every row of `leads` (id, role, status,
 * convertedUserId) and every row of `outreach_logs` (leadId, openedAt,
 * clickedAt, openCount, clickCount, status) with no where, no take and no
 * cursor, then reduced both to 35 integers with JavaScript Sets and for-loops.
 *
 * Of every read left in this API these were the two that grow fastest. `leads`
 * grows with the supply pipeline and a lead row is never deleted; `outreach_logs`
 * grows with the number of EMAILS SENT — one row per message per lead, several
 * per lead per campaign — so it is strictly the larger of the two and the only
 * table in the app whose row count is a multiple of another table's. One admin
 * opening the conversion dashboard dragged both into a 512 MB Render container.
 *
 * Postgres answers all of it with grouped reads: one row per (role, status) for
 * the lead funnel, and — because `Lead.outreachLogs` IS a declared relation
 * (prisma/schema.prisma) — one row per role for emailed / opened / clicked via
 * a `some` relation filter, which pushes the join into SQL. Five reads, at most
 * five rows each, zero lead or log rows on the wire.
 *
 * The assertions pin the arithmetic against a stated ledger, so this cannot be
 * satisfied by gutting the endpoint: the counts must still come out identical,
 * including the two-sided `converted` rule (status = CONVERTED **OR**
 * convertedUserId set) that a naive single groupBy silently drops.
 */

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(adminLeadConversionRoutes, { prefix: '/api/v1/admin/leads' });
  return app;
}

// ─── The ledger every assertion below is measured against ────────────────────
//
//   TEMPLE      NEW 10 · REPLIED 3 · CONVERTED 2   +1 converted by link only
//   PRIEST      EMAILED 7 · CONVERTED 1
//   ASTROLOGER  NEW 4
//
// total     27  =  10+3+2 + 7+1 + 4
// replied    6  =  (REPLIED 3 + CONVERTED 2) + CONVERTED 1
// converted  4  =  CONVERTED 3  +  1 lead linked to a user but not marked
const STATUS_GROUPS = [
  { role: 'TEMPLE', status: 'NEW', _count: { _all: 10 } },
  { role: 'TEMPLE', status: 'REPLIED', _count: { _all: 3 } },
  { role: 'TEMPLE', status: 'CONVERTED', _count: { _all: 2 } },
  { role: 'PRIEST', status: 'EMAILED', _count: { _all: 7 } },
  { role: 'PRIEST', status: 'CONVERTED', _count: { _all: 1 } },
  { role: 'ASTROLOGER', status: 'NEW', _count: { _all: 4 } },
];
const CONVERTED_BY_LINK = [{ role: 'TEMPLE', _count: { _all: 1 } }];
const EMAILED_GROUPS = [
  { role: 'TEMPLE', _count: { _all: 9 } },
  { role: 'PRIEST', _count: { _all: 5 } },
];
const OPENED_GROUPS = [
  { role: 'TEMPLE', _count: { _all: 6 } },
  { role: 'PRIEST', _count: { _all: 2 } },
];
const CLICKED_GROUPS = [{ role: 'TEMPLE', _count: { _all: 2 } }];

const INBOUND_REPLIES = [
  {
    leadId: 'lead-1',
    sentAt: new Date('2026-08-10T10:00:00.000Z'),
    payload: { classifiedIntent: 'INTERESTED', aiBody: 'We are interested, please call.' },
    lead: { id: 'lead-1', name: 'Shri Ram Mandir', role: 'TEMPLE', city: 'Gurugram', email: 't@x.com' },
  },
  {
    leadId: 'lead-2',
    sentAt: new Date('2026-08-09T10:00:00.000Z'),
    payload: { classifiedIntent: 'NOT_INTERESTED', aiBody: 'No thanks.' },
    lead: { id: 'lead-2', name: 'Other Temple', role: 'TEMPLE', city: null, email: null },
  },
];

type ModelMock = {
  findMany: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

let leadMock: ModelMock;
let outreachMock: ModelMock;

/** Which grouped read is this? Keyed off the argument shape, not call order. */
function classifyLeadGroupBy(args: Record<string, any>): unknown[] {
  const by: string[] = args.by ?? [];
  if (by.includes('status')) return STATUS_GROUPS;
  const where = (args.where ?? {}) as Record<string, any>;
  if (where.convertedUserId) return CONVERTED_BY_LINK;
  const some = where.outreachLogs?.some ?? {};
  const asText = JSON.stringify(some);
  if (asText.includes('openedAt') || asText.includes('openCount')) return OPENED_GROUPS;
  if (asText.includes('clickedAt') || asText.includes('clickCount')) return CLICKED_GROUPS;
  return EMAILED_GROUPS;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockImplementation(async (args: never) =>
    (args as { where: { email?: string } }).where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );

  // Invariant 4: the shared mock's methods are never reassigned. `lead` and
  // `outreachLog` handles are installed as whole objects on a local alias,
  // which is how the SCAL-04 waitlist test does it too.
  leadMock = {
    findMany: vi.fn(async () => []),
    groupBy: vi.fn(async (args: unknown) => classifyLeadGroupBy((args ?? {}) as Record<string, any>)),
    count: vi.fn(async () => 0),
  };
  outreachMock = {
    findMany: vi.fn(async (args: unknown) => {
      const where = ((args ?? {}) as { where?: Record<string, unknown> }).where ?? {};
      return where.templateKey === 'inbound_reply' ? INBOUND_REPLIES : [];
    }),
    groupBy: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  };
  (prismaMock as unknown as { lead: ModelMock }).lead = leadMock;
  (prismaMock as unknown as { outreachLog: ModelMock }).outreachLog = outreachMock;
});

async function getConversion() {
  const app = makeApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/leads/conversion',
    headers: { authorization: 'Bearer demo-admin' },
  });
  return res;
}

describe('SCAL-04 — /admin/leads/conversion stops reading leads + outreach_logs whole', () => {
  it('issues no unbounded read of either table', async () => {
    const res = await getConversion();
    expect(res.statusCode).toBe(200);

    const offenders: string[] = [];
    for (const [model, mock] of [
      ['lead', leadMock],
      ['outreachLog', outreachMock],
    ] as const) {
      for (const call of mock.findMany.mock.calls) {
        const args = (call[0] ?? {}) as Record<string, unknown>;
        if (!('where' in args) && !('take' in args) && !('cursor' in args)) {
          offenders.push(`${model}.findMany(${JSON.stringify(args)})`);
        }
      }
    }
    expect(
      offenders,
      'these reads pull every row of a table that grows with the supply pipeline / with every email sent',
    ).toEqual([]);
  });

  it('still returns the exact funnel counts, now from grouped SQL', async () => {
    const res = await getConversion();
    const body = res.json() as {
      total: number;
      totals: Record<string, number>;
      byRole: Record<string, Record<string, number>>;
    };

    expect(body.total).toBe(27);
    expect(body.totals.total).toBe(27);
    expect(body.totals.replied).toBe(6);
    expect(body.totals.converted).toBe(4);
    expect(body.totals.emailed).toBe(14);
    expect(body.totals.opened).toBe(8);
    expect(body.totals.clicked).toBe(2);

    expect(body.byRole.TEMPLE).toEqual({
      total: 15,
      emailed: 9,
      opened: 6,
      clicked: 2,
      replied: 5,
      interested: 1,
      converted: 3,
    });
    expect(body.byRole.PRIEST).toEqual({
      total: 8,
      emailed: 5,
      opened: 2,
      clicked: 0,
      replied: 1,
      interested: 0,
      converted: 1,
    });
    expect(body.byRole.ASTROLOGER!.total).toBe(4);
    expect(body.byRole.GAUSHALA!.total).toBe(0);
  });

  it('counts a lead converted when it is LINKED to a user but never marked CONVERTED', async () => {
    // The pre-SCAL-04 loop was `status === 'CONVERTED' || l.convertedUserId`.
    // A single groupBy over status alone silently drops the second half and
    // under-reports the one number the founder actually watches, so the
    // replacement has to ask for it explicitly.
    const res = await getConversion();
    const body = res.json() as {
      byRole: Record<string, { converted: number }>;
      totals: { converted: number };
    };
    expect(body.byRole.TEMPLE!.converted).toBe(3); // 2 by status + 1 by link
    expect(body.totals.converted).toBe(4);

    const linkCall = leadMock.groupBy.mock.calls.find((c) =>
      Boolean(((c[0] ?? {}) as any).where?.convertedUserId),
    );
    expect(linkCall, 'the link-only conversions are not asked for in SQL').toBeDefined();
    expect(
      ((linkCall![0] as any).where.status),
      'without excluding status CONVERTED the same lead is counted twice',
    ).toEqual({ not: 'CONVERTED' });
  });

  it('pushes the lead↔outreach join into SQL via the declared relation', async () => {
    await getConversion();
    const relationCalls = leadMock.groupBy.mock.calls.filter((c) =>
      Boolean(((c[0] ?? {}) as any).where?.outreachLogs?.some),
    );
    expect(
      relationCalls.length,
      'emailed / opened / clicked must each be one grouped read, not a JS Set over every log row',
    ).toBe(3);
  });

  it('keeps the recent-INTERESTED feed and its take', async () => {
    const res = await getConversion();
    const body = res.json() as { recent: Array<{ leadId: string; classifiedIntent: string }> };
    expect(body.recent).toHaveLength(1);
    expect(body.recent[0]!.leadId).toBe('lead-1');
    expect(body.recent[0]!.classifiedIntent).toBe('INTERESTED');

    const repliesCall = outreachMock.findMany.mock.calls.find(
      (c) => ((c[0] ?? {}) as any).where?.templateKey === 'inbound_reply',
    );
    expect((repliesCall![0] as any).take).toBe(200);
  });
});
