import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologerPortalRoutes } from './astrologer-portal.js';

/**
 * GET /astrologer-portal/dashboard used to await the profile, the ledger, three
 * raw reads and the listing note one after another. The independent ones now go
 * out together; the response must be byte-for-byte what it was, including when
 * the raw table is only partly readable.
 */

const USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const DEMO = { id: USER_ID, email: 'astro@demo.com', phone: null, fullName: 'Acharya', subscriptionTier: 'free', blocked: false };

const state = { inFlight: 0, max: 0 };
const slow = async <T,>(v: T): Promise<T> => {
  state.inFlight++;
  state.max = Math.max(state.max, state.inFlight);
  await new Promise((r) => setTimeout(r, 5));
  state.inFlight--;
  return v;
};

type Kind = 'today' | 'lifetime' | 'upcoming' | 'other';
function kindOf(sql: string): Kind {
  const s = String(sql).replace(/--[^\n]*/g, '');
  if (/Asia\/Kolkata/.test(s)) return 'today';
  if (/COUNT\(\*\)/.test(s)) return 'lifetime';
  if (/SELECT id, reference/.test(s)) return 'upcoming';
  return 'other';
}

function wire(fail: Kind[] = []) {
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
    const k = kindOf(sql);
    if (fail.includes(k)) throw new Error(`boom ${k}`);
    if (k === 'today') return slow([{ count: '1', sum: '375' }]);
    if (k === 'lifetime') return slow([{ count: '4' }]);
    if (k === 'upcoming') return slow([{ id: 'c-1', room_name: 'room-x', status: 'confirmed' }]);
    return slow([]);
  });
}

async function get() {
  const app = Fastify({ logger: false });
  await app.register(astrologerPortalRoutes, { prefix: '/api/v1/astrologer-portal' });
  const res = await app.inject({ method: 'GET', url: '/api/v1/astrologer-portal/dashboard', headers: { authorization: 'Bearer demo-astro' } });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.inFlight = 0;
  state.max = 0;
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'astro@demo.com' ? DEMO : null,
  );
  prismaMock.astrologerProfile.findUnique.mockResolvedValue({
    id: PROFILE_ID, userId: USER_ID, displayName: 'Acharya', pricePerMinute: 25, approved: true, rating: 0, totalConsultations: 9,
  } as never);
  prismaMock.commission.findMany.mockResolvedValue([]);
  prismaMock.pujaBooking.findMany.mockResolvedValue([]);
  wire();
});
afterEach(() => vi.restoreAllMocks());

describe('astrologer dashboard — parallel reads, identical output', () => {
  it('returns the same stats and upcoming sessions as before', async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.stats.consultationsToday).toBe(1);
    expect(body.stats.totalConsultations).toBe(4);
    expect(body.stats.activeClients).toBe(1);
    expect(body.upcomingSessions).toEqual([{ id: 'c-1', room_name: 'room-x', status: 'confirmed', jitsiUrl: 'https://meet.jit.si/room-x' }]);
    expect(body.profile.id).toBe(PROFILE_ID);
  });

  it('runs the three raw reads concurrently', async () => {
    await get();
    expect(state.max).toBeGreaterThanOrEqual(3);
  });

  it('a failing lifetime read keeps today, drops lifetime + upcoming, and falls back to the stored counter', async () => {
    wire(['lifetime']);
    const body = (await get()).json();
    expect(body.stats.consultationsToday).toBe(1);
    expect(body.stats.totalConsultations).toBe(9);
    expect(body.upcomingSessions).toEqual([]);
  });

  it('a failing today read leaves every raw-derived field at its default', async () => {
    wire(['today']);
    const body = (await get()).json();
    expect(body.stats.consultationsToday).toBe(0);
    expect(body.stats.totalConsultations).toBe(9);
    expect(body.upcomingSessions).toEqual([]);
  });
});
