import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../services/booking.service.js', () => ({
  BookingService: vi.fn().mockImplementation(() => ({})),
  activeSlotHoldWhere: () => ({}),
}));
vi.mock('../services/booking-notify.service.js', () => ({
  notifyDevotee: vi.fn(async () => undefined),
  buildBookingCtx: vi.fn(() => ({})),
  notifyPandit: vi.fn(async () => undefined),
}));
vi.mock('./notifications.js', () => ({ notifyUser: vi.fn(async () => undefined) }));

import Fastify from 'fastify';
import { templePortalRoutes } from './temple-portal.js';
import { priestRoutes } from './priest.js';

/**
 * Temple roster needs the pandit's consent.
 *
 * The manager's add used to insert the TemplePriest row directly. It now
 * records a pending invitation; only the invited pandit accepting creates the
 * roster row (and with it the booking anchoring / temple share that read it).
 */

const MANAGER = { id: '77777777-7777-4777-8777-777777777777', email: 'temple@demo.com', phone: null, fullName: 'Temple Mgr', subscriptionTier: 'free', blocked: false };
const PANDIT_USER = { id: '11111111-1111-4111-8111-111111111111', email: 'pandit@demo.com', phone: null, fullName: 'Pandit', subscriptionTier: 'free', blocked: false };
const TEMPLE_ID = '33333333-3333-4333-8333-333333333333';
const PRIEST_A = '6a56eba6-e340-40bc-b236-97440ada4001';
const PRIEST_B = '6a56eba6-e340-40bc-b236-97440ada4002';
const PRIEST_SUSPENDED = '6a56eba6-e340-40bc-b236-97440ada4003';

interface InviteRow {
  id: string;
  temple_id: string;
  priest_id: string;
  is_primary: boolean;
  status: 'pending' | 'accepted' | 'declined';
  invited_by: string | null;
  created_at: Date;
}
interface RosterRow { id: string; templeId: string; priestId: string; isPrimary: boolean }

let invites: InviteRow[];
let roster: RosterRow[];
let seq: number;
/** Which Priest row the logged-in pandit resolves to. */
let loggedInPriestId: string;

/** In-memory stand-in for the lazily-created table, keyed off the SQL verb. */
function fakeRaw(sql: string, ...a: unknown[]): unknown[] {
  const q = sql.replace(/\s+/g, ' ').trim();
  if (q.startsWith('INSERT INTO temple_priest_invites')) {
    const [templeId, priestId, isPrimary, invitedBy] = a as [string, string, boolean, string];
    const existing = invites.find((i) => i.temple_id === templeId && i.priest_id === priestId);
    if (!existing) {
      const row: InviteRow = { id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`, temple_id: templeId, priest_id: priestId, is_primary: isPrimary, status: 'pending', invited_by: invitedBy, created_at: new Date() };
      invites.push(row);
      return [{ id: row.id }];
    }
    if (existing.status !== 'pending') {
      Object.assign(existing, { status: 'pending', is_primary: isPrimary, invited_by: invitedBy });
      return [{ id: existing.id }];
    }
    return [];
  }
  if (q.startsWith('SELECT id FROM temple_priest_invites WHERE temple_id')) {
    const [templeId, priestId] = a as [string, string];
    return invites.filter((i) => i.temple_id === templeId && i.priest_id === priestId && i.status === 'pending').map((i) => ({ id: i.id }));
  }
  if (q.startsWith('UPDATE temple_priest_invites SET status')) {
    const [id, priestId, next] = a as [string, string, InviteRow['status']];
    const row = invites.find((i) => i.id === id && i.priest_id === priestId && i.status === 'pending');
    if (!row) return [];
    row.status = next;
    return [{ temple_id: row.temple_id, is_primary: row.is_primary }];
  }
  if (q.startsWith('SELECT status, temple_id FROM temple_priest_invites')) {
    const [id, priestId] = a as [string, string];
    return invites.filter((i) => i.id === id && i.priest_id === priestId).map((i) => ({ status: i.status, temple_id: i.temple_id }));
  }
  if (q.includes('FROM temple_priest_invites i JOIN temples')) {
    const [priestId] = a as [string];
    return invites.filter((i) => i.priest_id === priestId && i.status === 'pending').map((i) => ({ id: i.id, temple_id: i.temple_id, temple_name: 'Somnath', temple_city: 'Veraval', is_primary: i.is_primary, created_at: i.created_at }));
  }
  if (q.includes('FROM temple_priest_invites i JOIN priests')) {
    const [templeId] = a as [string];
    return invites.filter((i) => i.temple_id === templeId && i.status !== 'accepted').map((i) => ({ id: i.id, priest_id: i.priest_id, display_name: 'Pandit A', is_primary: i.is_primary, status: i.status, created_at: i.created_at }));
  }
  if (q.startsWith('DELETE FROM temple_priest_invites')) {
    const [id, templeId] = a as [string, string];
    const idx = invites.findIndex((i) => i.id === id && i.temple_id === templeId && i.status !== 'accepted');
    if (idx < 0) return [];
    const [gone] = invites.splice(idx, 1);
    return [{ id: gone!.id }];
  }
  throw new Error(`unexpected SQL: ${q.slice(0, 60)}`);
}

function makeApps() {
  const temple = Fastify({ logger: false });
  void temple.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
  const priest = Fastify({ logger: false });
  void priest.register(async (i) => { await priestRoutes(i); }, { prefix: '/api/v1/priest' });
  return { temple, priest };
}

let apps: ReturnType<typeof makeApps>;
const asManager = (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: unknown) =>
  apps.temple.inject({ method, url: `/api/v1/temple-portal${url}`, headers: { authorization: 'Bearer demo-temple' }, ...(payload ? { payload: payload as object } : {}) });
const asPandit = (method: 'GET' | 'POST', url: string) =>
  apps.priest.inject({ method, url: `/api/v1/priest${url}`, headers: { authorization: 'Bearer demo-pandit' } });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEMO_TOKENS = 'true';
  process.env.NODE_ENV = 'test';
  invites = [];
  roster = [];
  seq = 0;
  loggedInPriestId = PRIEST_A;

  prismaMock.user.findUnique.mockImplementation(async (args: any) =>
    args.where.email === 'temple@demo.com' ? MANAGER : args.where.email === 'pandit@demo.com' ? PANDIT_USER : null,
  );
  prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
  prismaMock.temple.findFirst.mockResolvedValue({ id: TEMPLE_ID } as any);
  prismaMock.priest.findUnique.mockImplementation(async (args: any) => {
    if (args.where.userId) return { id: loggedInPriestId, userId: args.where.userId, status: 'active' } as any;
    if (args.where.id === PRIEST_SUSPENDED) return { id: PRIEST_SUSPENDED, status: 'suspended' } as any;
    return args.where.id === PRIEST_A || args.where.id === PRIEST_B ? ({ id: args.where.id, status: 'active' } as any) : null;
  });
  prismaMock.priest.findMany.mockImplementation(async (args: any) => {
    const excluded: string[] = args.where.id?.notIn ?? [];
    return [
      { id: PRIEST_A, displayName: 'Pandit A', specializations: ['Satyanarayan'], experienceYears: 8, isVerified: false },
      { id: PRIEST_B, displayName: 'Pandit B', specializations: [], experienceYears: 3, isVerified: true },
    ].filter((p) => !excluded.includes(p.id)) as any;
  });
  (prismaMock.templePujaOffering as any).updateMany = vi.fn(async () => ({ count: 1 }));

  (prismaMock as any).templePriest = {
    findUnique: vi.fn(async ({ where }: any) =>
      where.id
        ? roster.find((r) => r.id === where.id) ?? null
        : roster.find((r) => r.templeId === where.templeId_priestId.templeId && r.priestId === where.templeId_priestId.priestId) ?? null,
    ),
    delete: vi.fn(async ({ where }: any) => {
      const i = roster.findIndex((r) => r.id === where.id);
      return roster.splice(i, 1)[0];
    }),
    findMany: vi.fn(async () => roster.map((r) => ({ ...r, joinedAt: new Date(), priest: { id: r.priestId, displayName: 'Pandit A', userId: 'u' } }))),
    create: vi.fn(async ({ data }: any) => { const r = { id: `r${roster.length + 1}`, ...data }; roster.push(r); return r; }),
    upsert: vi.fn(async ({ where, create }: any) => {
      const hit = roster.find((r) => r.templeId === where.templeId_priestId.templeId && r.priestId === where.templeId_priestId.priestId);
      if (hit) return hit;
      const r = { id: `r${roster.length + 1}`, ...create };
      roster.push(r);
      return r;
    }),
  };
  prismaMock.$executeRawUnsafe.mockResolvedValue(0 as any);
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string, ...a: unknown[]) => fakeRaw(sql, ...a) as any);
  prismaMock.$transaction.mockImplementation(async (fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(prismaMock)));

  apps = makeApps();
});

describe('manager invites, never adds', () => {
  it('POST /priests records a pending invitation and does NOT create a roster row', async () => {
    const res = await asManager('POST', '/priests', { priestId: PRIEST_A, isPrimary: true });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true, invited: true, status: 'pending' });
    expect(roster).toHaveLength(0);
    expect((prismaMock as any).templePriest.create).not.toHaveBeenCalled();
    expect((prismaMock as any).templePriest.upsert).not.toHaveBeenCalled();
  });

  it('a duplicate invite is idempotent: same invitation, still one row', async () => {
    const first = (await asManager('POST', '/priests', { priestId: PRIEST_A })).json();
    const second = await asManager('POST', '/priests', { priestId: PRIEST_A });
    expect(second.statusCode).toBe(200);
    expect(second.json().id).toBe(first.id);
    expect(invites).toHaveLength(1);
  });

  it('inviting someone already on the roster is a 409, not a second link', async () => {
    roster.push({ id: 'r1', templeId: TEMPLE_ID, priestId: PRIEST_A, isPrimary: false });
    const res = await asManager('POST', '/priests', { priestId: PRIEST_A });
    expect(res.statusCode).toBe(409);
    expect(invites).toHaveLength(0);
  });

  it('GET /priests separates "on your roster" from "invited, waiting"', async () => {
    await asManager('POST', '/priests', { priestId: PRIEST_A });
    const body = (await asManager('GET', '/priests')).json();
    expect(body.priests).toHaveLength(0);
    expect(body.invitations).toHaveLength(1);
    expect(body.invitations[0]).toMatchObject({ priestId: PRIEST_A, status: 'pending' });
  });

  it('a manager can withdraw a pending invitation', async () => {
    const { id } = (await asManager('POST', '/priests', { priestId: PRIEST_A })).json();
    const res = await asManager('DELETE', `/priests/invites/${id}`);
    expect(res.statusCode).toBe(200);
    expect(invites).toHaveLength(0);
  });
});

describe('the invited pandit answers', () => {
  async function invite(priestId = PRIEST_A, isPrimary = false) {
    return (await asManager('POST', '/priests', { priestId, isPrimary })).json().id as string;
  }

  it('lists the pending invitation for the invited pandit only', async () => {
    await invite(PRIEST_A);
    const mine = (await asPandit('GET', '/temple-invites')).json();
    expect(mine.invites).toHaveLength(1);
    expect(mine.invites[0]).toMatchObject({ templeName: 'Somnath', templeCity: 'Veraval' });

    loggedInPriestId = PRIEST_B;
    expect((await asPandit('GET', '/temple-invites')).json().invites).toHaveLength(0);
  });

  it('accept puts the pandit on the roster, carrying the primary flag', async () => {
    const id = await invite(PRIEST_A, true);
    const res = await asPandit('POST', `/temple-invites/${id}/accept`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, status: 'accepted' });
    expect(roster).toEqual([expect.objectContaining({ templeId: TEMPLE_ID, priestId: PRIEST_A, isPrimary: true })]);
    expect((await asPandit('GET', '/temple-invites')).json().invites).toHaveLength(0);
  });

  it('decline leaves the roster untouched', async () => {
    const id = await invite();
    const res = await asPandit('POST', `/temple-invites/${id}/decline`);
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('declined');
    expect(roster).toHaveLength(0);
    const body = (await asManager('GET', '/priests')).json();
    expect(body.priests).toHaveLength(0);
    expect(body.invitations[0].status).toBe('declined');
  });

  it('only the invited pandit can answer: another pandit gets 404 and nothing changes', async () => {
    const id = await invite(PRIEST_A);
    loggedInPriestId = PRIEST_B;
    for (const action of ['accept', 'decline']) {
      const res = await asPandit('POST', `/temple-invites/${id}/${action}`);
      expect(res.statusCode).toBe(404);
    }
    expect(roster).toHaveLength(0);
    expect(invites[0]!.status).toBe('pending');
  });

  it('answering twice the same way is a no-op success; flipping afterwards is refused', async () => {
    const id = await invite();
    await asPandit('POST', `/temple-invites/${id}/accept`);
    const again = await asPandit('POST', `/temple-invites/${id}/accept`);
    expect(again.statusCode).toBe(200);
    expect(roster).toHaveLength(1);
    const flip = await asPandit('POST', `/temple-invites/${id}/decline`);
    expect(flip.statusCode).toBe(409);
    expect(roster).toHaveLength(1);
  });

  it('a declined pandit can be invited again', async () => {
    const id = await invite();
    await asPandit('POST', `/temple-invites/${id}/decline`);
    const again = await asManager('POST', '/priests', { priestId: PRIEST_A });
    expect(again.statusCode).toBe(201);
    expect(invites[0]!.status).toBe('pending');
  });

  it('a malformed invitation id is a 404', async () => {
    expect((await asPandit('POST', '/temple-invites/not-a-uuid/accept')).statusCode).toBe(404);
  });
});

describe('who a temple can invite', () => {
  it('candidates are live pandits (not gated on Priest.isVerified) who are not already on the roster', async () => {
    const all = (await asManager('GET', '/priests/candidates')).json().candidates;
    expect(all.map((c: { id: string }) => c.id)).toEqual([PRIEST_A, PRIEST_B]);
    const where = (prismaMock.priest.findMany as any).mock.calls[0][0].where;
    expect(where.status).toBe('active');
    expect(where).not.toHaveProperty('isVerified');

    roster.push({ id: 'r1', templeId: TEMPLE_ID, priestId: PRIEST_A, isPrimary: false });
    const left = (await asManager('GET', '/priests/candidates')).json().candidates;
    expect(left.map((c: { id: string }) => c.id)).toEqual([PRIEST_B]);
  });

  it('flags a pandit who already has a pending invitation', async () => {
    await asManager('POST', '/priests', { priestId: PRIEST_A });
    const list = (await asManager('GET', '/priests/candidates')).json().candidates;
    expect(list.find((c: { id: string }) => c.id === PRIEST_A).invited).toBe(true);
    expect(list.find((c: { id: string }) => c.id === PRIEST_B).invited).toBe(false);
  });

  it('a suspended or inactive pandit cannot be invited', async () => {
    const res = await asManager('POST', '/priests', { priestId: PRIEST_SUSPENDED });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('priest_unavailable');
    expect(invites).toHaveLength(0);
  });

  it("removing a pandit from the roster unpins them from this temple's offerings", async () => {
    const rowId = '99999999-9999-4999-8999-999999999999';
    roster.push({ id: rowId, templeId: TEMPLE_ID, priestId: PRIEST_A, isPrimary: false });
    const res = await asManager('DELETE', `/priests/${rowId}`);
    expect(res.statusCode).toBe(200);
    expect(roster).toHaveLength(0);
    expect((prismaMock.templePujaOffering as any).updateMany).toHaveBeenCalledWith({
      where: { templeId: TEMPLE_ID, assignedPriestId: PRIEST_A },
      data: { assignedPriestId: null },
    });
  });
});
