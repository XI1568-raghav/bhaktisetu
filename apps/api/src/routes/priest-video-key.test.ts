/** POST /priest/bookings/:id/video with a private object key, and the shared size limit. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const m = vi.hoisted(() => ({
  presign: vi.fn(),
  inspect: vi.fn(),
  uploadVideoProof: vi.fn(),
}));

vi.mock('../lib/r2.js', () => ({
  r2: { enabled: true, backend: 'supabase' as const, bucket: 'x', publicBaseUrl: null },
  presignProofUpload: m.presign,
  inspectProofObject: m.inspect,
  inspectOwnVideoUrl: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../lib/supabase.js', () => ({ isDemoMode: false, supabaseAdmin: {}, createSupabaseClient: () => ({}) }));
vi.mock('../services/booking.service.js', () => ({
  BookingService: vi.fn().mockImplementation(() => ({ uploadVideoProof: m.uploadVideoProof, updateBookingStatus: vi.fn() })),
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

const PANDIT = { id: '11111111-1111-4111-8111-111111111111', email: 'pandit@demo.com', phone: null, fullName: 'P', subscriptionTier: 'free', blocked: false };
const PRIEST_ID = '6a56eba6-e340-40bc-b236-97440ada4001';
const BID = 'b1330da2-c830-41ff-93da-ded81963b163';
const KEY = `booking-proofs/${BID}/1791908298776-4f45e65fd4bd.mp4`;

async function call(url: string, payload: unknown) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await priestRoutes(i); }, { prefix: '/api/v1/priest' });
  const res = await app.inject({ method: 'POST', url: `/api/v1/priest/bookings/${BID}/${url}`, headers: { authorization: 'Bearer demo-pandit' }, payload: payload as any });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  delete process.env.VIDEO_MAX_MB;
  prismaMock.user.findUnique.mockImplementation(async (a: any) => (a.where.email === 'pandit@demo.com' ? PANDIT : null));
  prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST_ID, userId: PANDIT.id, status: 'active' } as never);
  prismaMock.pujaBooking.findUnique.mockResolvedValue({ id: BID, priestId: PRIEST_ID, status: 'in_progress' } as never);
  m.presign.mockResolvedValue({ uploadUrl: 'https://s.test/up', backend: 'supabase' });
  m.inspect.mockResolvedValue({ ok: true, bytes: 5_000_000 });
  m.uploadVideoProof.mockResolvedValue({ id: BID });
});

describe('signed-url response', () => {
  it('is private (no public URL) and advertises the shared 50 MB limit', async () => {
    const b = (await call('video-proof/signed-url', { contentType: 'video/mp4' })).json();
    expect(b.publicUrl).toBeNull();
    expect(b.private).toBe(true);
    expect(b.key).toMatch(new RegExp(`^booking-proofs/${BID}/`));
    expect(b.maxSizeMb).toBe(50);
    expect(b.maxSizeBytes).toBe(50 * 1024 * 1024);
  });
  it('VIDEO_MAX_MB overrides it', async () => {
    process.env.VIDEO_MAX_MB = '80';
    expect((await call('video-proof/signed-url', { contentType: 'video/mp4' })).json().maxSizeMb).toBe(80);
  });
});

describe('POST /video with videoKey', () => {
  it('stores the KEY, not a URL', async () => {
    const res = await call('video', { videoKey: KEY });
    expect(res.statusCode).toBe(200);
    expect(m.uploadVideoProof).toHaveBeenCalledWith(BID, PRIEST_ID, KEY);
  });
  it('rejects a key minted for another booking', async () => {
    const res = await call('video', { videoKey: 'booking-proofs/b0000000-0000-4000-8000-0000000000aa/1791908298776-4f45e65fd4bd.mp4' });
    expect(res.statusCode).toBe(400);
    expect(m.uploadVideoProof).not.toHaveBeenCalled();
  });
  it('rejects traversal / foreign-prefix keys', async () => {
    for (const k of [`booking-proofs/${BID}/../../kyc-document/u/x.mp4`, `kyc-document/u/1791908298776-4f45e65fd4bd.mp4`, 'https://evil.test/a.mp4']) {
      expect((await call('video', { videoKey: k })).statusCode).toBe(400);
    }
    expect(m.uploadVideoProof).not.toHaveBeenCalled();
  });
  it('413 with the friendly limit message when the stored object is over the limit', async () => {
    m.inspect.mockResolvedValue({ ok: false, reason: 'too_large' });
    const res = await call('video', { videoKey: KEY });
    expect(res.statusCode).toBe(413);
    expect(res.json().error).toMatch(/larger than 50 MB/);
    expect(m.uploadVideoProof).not.toHaveBeenCalled();
  });
  it.each([['missing', 400], ['empty', 400], ['not_video', 400], ['unreachable', 503]])('%s -> %i', async (reason, code) => {
    m.inspect.mockResolvedValue({ ok: false, reason });
    expect((await call('video', { videoKey: KEY })).statusCode).toBe(code);
  });
  it('requires exactly one of videoKey / videoUrl', async () => {
    expect((await call('video', {})).statusCode).toBe(400);
    expect((await call('video', { videoKey: KEY, videoUrl: 'https://a.test/x' })).statusCode).toBe(400);
  });
  it('still accepts an external https link (legacy path)', async () => {
    expect((await call('video', { videoUrl: 'https://drive.google.com/x' })).statusCode).toBe(200);
  });
});
