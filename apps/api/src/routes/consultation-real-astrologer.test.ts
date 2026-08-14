import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

/**
 * AW-01 / AW-02 (2026-08-12, both P0) regression locks.
 *
 * AW-02 — /astrology sold consultations with 15 FICTIONAL astrologers
 * (`astro_001`..`astro_015`, apps/api/src/services/astrology.service.ts:118-374).
 * POST /consultation/book accepted the slug, took the money, minted a Jitsi
 * room and then silently skipped the Commission write because no real provider
 * existed to credit. Money captured, nobody to deliver, no payout ledger row.
 *
 * AW-01 — GET /consultation/astrologer/mine filtered `astrologer_id = currentUser.id`
 * (the User UUID) while /book writes AstrologerProfile.id, so a real astrologer's
 * own consultation list was permanently empty even though the row existed and
 * /astrologer-portal/dashboard could see it.
 */

const REAL_PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const REAL_USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';

const DEMO_DEVOTEE = {
  id: '2b5bd615-1633-4c95-9b09-03efb2b9e429',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const DEMO_ASTRO = {
  id: REAL_USER_ID,
  email: 'astro@demo.com',
  phone: null,
  fullName: 'Acharya Vinod Sharma',
  subscriptionTier: 'free',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
    if (args.where.email === 'astro@demo.com') return DEMO_ASTRO;
    return null;
  });
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── AW-02: the funnel must not take money for a person who does not exist ────

describe('AW-02 — POST /consultation/book refuses fictional astrologers', () => {
  it('refuses a mock-fixture slug with 409 and never inserts a row', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/book',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { astrologerId: 'astro_001', minutes: 15 },
    });
    await app.close();

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.code).toBe('ASTROLOGER_NOT_BOOKABLE');
    // No INSERT may have been attempted — the money path must stop before the row.
    const inserts = prismaMock.$queryRawUnsafe.mock.calls.filter((c: unknown[]) =>
      String(c[0]).includes('INSERT INTO astrologer_consultations'),
    );
    expect(inserts).toHaveLength(0);
  });

  it('refuses a UUID that resolves to no AstrologerProfile', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/book',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { astrologerId: '11111111-2222-3333-4444-555555555555', minutes: 15 },
    });
    await app.close();
    expect(res.statusCode).toBe(404);
  });

  it('refuses a real but UNAPPROVED AstrologerProfile', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({
      id: REAL_PROFILE_ID,
      userId: REAL_USER_ID,
      displayName: 'Acharya Vinod Sharma',
      pricePerMinute: 25,
      approved: false,
    });
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/book',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { astrologerId: REAL_PROFILE_ID, minutes: 15 },
    });
    await app.close();
    expect(res.statusCode).toBe(404);
  });

  it('still books a real, approved AstrologerProfile', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({
      id: REAL_PROFILE_ID,
      userId: REAL_USER_ID,
      displayName: 'Acharya Vinod Sharma',
      pricePerMinute: 25,
      approved: true,
    });
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (String(sql).includes('INSERT INTO astrologer_consultations')) {
        return [
          {
            id: '5523ab80-6591-43f0-9205-59ac341035b0',
            reference: 'AC-20260812-628085',
            astrologer_name: 'Acharya Vinod Sharma',
            minutes: 15,
            amount_inr: '375.00',
          },
        ];
      }
      return [];
    });
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/book',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { astrologerId: REAL_PROFILE_ID, minutes: 15 },
    });
    await app.close();

    expect(res.statusCode).toBe(201);
    expect(res.json().amountInr).toBe(375);
  });
});

// ── AW-01: an astrologer must be able to see the consultation they were paid for ──

describe('AW-01 — GET /consultation/astrologer/mine matches profile id AND user id', () => {
  it('returns rows stored under the caller AstrologerProfile.id, not just User.id', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({
      id: REAL_PROFILE_ID,
      userId: REAL_USER_ID,
    });
    let capturedIds: unknown = null;
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string, ...params: unknown[]) => {
      if (String(sql).includes('COUNT(*)')) return [{ total: 1 }];
      if (String(sql).includes('FROM astrologer_consultations')) {
        capturedIds = params[0];
        return [
          {
            id: '5523ab80-6591-43f0-9205-59ac341035b0',
            reference: 'AC-20260812-628085',
            user_id: DEMO_DEVOTEE.id,
            astrologer_id: REAL_PROFILE_ID,
            astrologer_name: 'Acharya Vinod Sharma',
            minutes: 15,
            per_minute_rate_inr: '25.00',
            amount_inr: '375.00',
            currency: 'INR',
            scheduled_at: null,
            razorpay_order_id: null,
            razorpay_payment_id: null,
            room_name: 'darshya-astrologer-acharya-vinod-sharma-e8cacedaa8ac',
            status: 'confirmed',
            created_at: new Date('2026-08-12T09:07:20.595Z'),
            paid_at: new Date('2026-08-12T09:07:20.595Z'),
          },
        ];
      }
      return [];
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/astrologer/mine',
      headers: { authorization: 'Bearer demo-astro' },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    // The id filter must be an ARRAY containing BOTH identities.
    expect(Array.isArray(capturedIds)).toBe(true);
    expect(capturedIds).toContain(REAL_PROFILE_ID);
    expect(capturedIds).toContain(REAL_USER_ID);

    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.consultations[0].reference).toBe('AC-20260812-628085');
    expect(body.consultations[0].jitsiUrl).toContain('darshya-astrologer-acharya-vinod-sharma');
  });

  it('falls back to the user id alone when the caller has no AstrologerProfile', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(null);
    let capturedIds: unknown = null;
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string, ...params: unknown[]) => {
      if (String(sql).includes('COUNT(*)')) return [{ total: 0 }];
      if (String(sql).includes('FROM astrologer_consultations')) {
        capturedIds = params[0];
        return [];
      }
      return [];
    });
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/astrologer/mine',
      headers: { authorization: 'Bearer demo-astro' },
    });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(capturedIds).toEqual([REAL_USER_ID]);
  });
});

// ── AW-02: the Commission gap must be loud, not silent ───────────────────────

describe('AW-02 — an un-creditable paid consultation is reported, not swallowed', () => {
  it('GET /admin/all reports commissionMissing on a confirmed row with no ledger entry', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@demo.com',
      phone: null,
      fullName: 'Demo Admin',
      subscriptionTier: 'free',
      blocked: false,
    });
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (String(sql).includes('COUNT(*)')) return [{ total: 2 }];
      if (String(sql).includes('FROM astrologer_consultations')) {
        return [
          {
            id: 'row-fixture',
            reference: 'AC-20260812-3F1C15',
            user_id: DEMO_DEVOTEE.id,
            astrologer_id: 'astro_001',
            astrologer_name: 'Pt. Raghunath Sharma',
            minutes: 15,
            per_minute_rate_inr: '50.00',
            amount_inr: '750.00',
            currency: 'INR',
            scheduled_at: null,
            razorpay_order_id: null,
            razorpay_payment_id: null,
            room_name: 'darshya-astrologer-pt-raghunath-sharma-abc',
            status: 'confirmed',
            created_at: new Date('2026-08-12T09:00:00.000Z'),
            paid_at: new Date('2026-08-12T09:00:00.000Z'),
          },
          {
            id: 'row-real',
            reference: 'AC-20260812-628085',
            user_id: DEMO_DEVOTEE.id,
            astrologer_id: REAL_PROFILE_ID,
            astrologer_name: 'Acharya Vinod Sharma',
            minutes: 15,
            per_minute_rate_inr: '25.00',
            amount_inr: '375.00',
            currency: 'INR',
            scheduled_at: null,
            razorpay_order_id: null,
            razorpay_payment_id: null,
            room_name: 'darshya-astrologer-acharya-vinod-sharma-e8c',
            status: 'confirmed',
            created_at: new Date('2026-08-12T09:07:20.595Z'),
            paid_at: new Date('2026-08-12T09:07:20.595Z'),
          },
        ];
      }
      return [];
    });
    // Only the real astrologer's booking has a ledger row.
    prismaMock.commission.findMany.mockResolvedValue([{ bookingId: 'row-real' }]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/admin/all',
      headers: { authorization: 'Bearer demo-admin' },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    const rows = res.json().consultations as Array<Record<string, unknown>>;
    const fixture = rows.find((r) => r.reference === 'AC-20260812-3F1C15')!;
    const real = rows.find((r) => r.reference === 'AC-20260812-628085')!;
    expect(fixture.commissionMissing).toBe(true);
    expect(real.commissionMissing).toBe(false);
  });
});
