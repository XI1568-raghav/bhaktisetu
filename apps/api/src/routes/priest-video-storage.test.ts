/**
 * PF-05 (prod sweep 2026-08-12) — POST /priest/bookings/:id/video-proof/signed-url
 * answered `400 {"error":"supabaseAdmin.storage.from is not a function"}`
 * instead of the 503 the route was written to return.
 *
 * Two modules disagreed about what "storage is configured" means:
 *   - lib/r2.ts:41  `supabaseEnabled = !!(supabaseUrl && SUPABASE_SERVICE_ROLE_KEY)`
 *   - lib/supabase.ts:10 treats `https://demo.supabase.co` as demo mode and hands
 *     back a Proxy whose every non-`auth` property is a bare throwing function.
 * So `r2.enabled` was true, the 503 guard never fired, and the presign call blew
 * up inside the generic `catch` that maps everything to 400.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const storage = vi.hoisted(() => ({
  demoMode: true,
  presign: vi.fn(),
}));

vi.mock('../lib/r2.js', () => ({
  r2: { enabled: true, backend: 'supabase' as const, bucket: 'darshya-media', publicBaseUrl: null },
  presignProofUpload: storage.presign,
  inspectProofObject: vi.fn(),
  inspectOwnVideoUrl: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../lib/supabase.js', () => ({
  get isDemoMode() {
    return storage.demoMode;
  },
  supabaseAdmin: {},
  createSupabaseClient: () => ({}),
}));

vi.mock('../services/booking.service.js', () => ({
  BookingService: vi.fn().mockImplementation(() => ({
    uploadVideoProof: vi.fn(),
    updateBookingStatus: vi.fn(),
  })),
  activeSlotHoldWhere: () => ({}),
}));
vi.mock('../services/booking-notify.service.js', () => ({
  notifyDevotee: vi.fn(async () => undefined),
  buildBookingCtx: vi.fn(() => ({})),
  notifyPandit: vi.fn(async () => undefined),
}));
vi.mock('./notifications.js', () => ({ notifyUser: vi.fn(async () => undefined) }));

import Fastify from 'fastify';
import { priestRoutes } from './priest.js';

const PANDIT_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'pandit@demo.com',
  phone: null,
  fullName: 'Demo Pandit',
  subscriptionTier: 'free',
  blocked: false,
};
const PRIEST_ID = '6a56eba6-e340-40bc-b236-97440ada4001';
const BOOKING_ID = 'b1330da2-c830-41ff-93da-ded81963b163';

async function signedUrl() {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await priestRoutes(i); }, { prefix: '/api/v1/priest' });
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/priest/bookings/${BOOKING_ID}/video-proof/signed-url`,
    headers: { authorization: 'Bearer demo-pandit' },
    payload: { contentType: 'video/mp4' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  storage.demoMode = true;
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'pandit@demo.com' ? PANDIT_USER : null,
  );
  prismaMock.priest.findUnique.mockResolvedValue({
    id: PRIEST_ID,
    userId: PANDIT_USER.id,
    status: 'active',
  } as never);
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: BOOKING_ID,
    priestId: PRIEST_ID,
    status: 'completed',
  } as never);
});

describe('PF-05 — video-proof presign answers 503 when storage is not really configured', () => {
  it('refuses up front when the Supabase backend is the demo stub', async () => {
    // Exactly what the demo Proxy does today.
    storage.presign.mockImplementation(() => {
      throw new TypeError('supabaseAdmin.storage.from is not a function');
    });

    const res = await signedUrl();

    expect(res.statusCode).toBe(503);
    expect(res.json().error).toMatch(/Storage backend not configured/i);
    // The guard must fire before we ever try to sign.
    expect(storage.presign).not.toHaveBeenCalled();
  });

  it('maps a thrown storage error to 503, never to a 400 carrying the internal message', async () => {
    storage.demoMode = false;
    storage.presign.mockImplementation(() => {
      throw new TypeError('supabaseAdmin.storage.from is not a function');
    });

    const res = await signedUrl();

    expect(res.statusCode).toBe(503);
    expect(res.json().error).not.toMatch(/is not a function/);
  });

  it('still returns a presigned URL when storage really is configured', async () => {
    storage.demoMode = false;
    storage.presign.mockResolvedValue({
      uploadUrl: 'https://storage.test/put',
      publicUrl: 'https://storage.test/pub.mp4',
      backend: 'supabase',
    });

    const res = await signedUrl();

    expect(res.statusCode).toBe(200);
    expect(res.json().uploadUrl).toBe('https://storage.test/put');
  });
});

describe('R2 without R2_PRIVATE_BUCKET', () => {
  it('answers 503 with an actionable message', async () => {
    storage.demoMode = false;
    storage.presign.mockImplementation(() => {
      throw Object.assign(new Error('R2_PRIVATE_BUCKET is not set'), { code: 'PROOF_BUCKET_UNCONFIGURED' });
    });
    const res = await signedUrl();
    expect(res.statusCode).toBe(503);
    expect(res.json().message).toMatch(/R2_PRIVATE_BUCKET/);
  });
});
