import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// The pandit fulfilment routes reach BookingService only to delegate the
// three status transitions and the proof write. Stubbing it keeps this file on
// the priest surface instead of dragging in the payment/notification fan-out
// (and keeps it independent of in-flight edits to booking.service.ts).
const { uploadVideoProofMock, updateBookingStatusMock } = vi.hoisted(() => ({
  uploadVideoProofMock: vi.fn(),
  updateBookingStatusMock: vi.fn(),
}));
vi.mock('../services/booking.service.js', () => ({
  BookingService: vi.fn().mockImplementation(() => ({
    uploadVideoProof: uploadVideoProofMock,
    updateBookingStatus: updateBookingStatusMock,
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
const OTHER_PRIEST_ID = '99999999-9999-4999-8999-999999999999';
const BOOKING_ID = 'b1330da2-c830-41ff-93da-ded81963b163';

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await priestRoutes(instance);
  }, { prefix: '/api/v1/priest' });
  return app;
}

async function call(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  payload?: Record<string, unknown>,
) {
  const app = await buildApp();
  const res = await app.inject({
    method,
    url: `/api/v1/priest${url}`,
    headers: { authorization: 'Bearer demo-pandit' },
    ...(payload ? { payload } : {}),
  });
  await app.close();
  return res;
}

/** Shape the live API returns for one assigned booking. */
function bookingRow(over: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    bookingNumber: 'BS-20260812-T6GL8',
    status: 'video_uploaded',
    scheduledDate: new Date('2026-08-19T00:00:00.000Z'),
    scheduledTimeSlot: '06:00',
    priceAmount: '1100',
    platformCommission: '330',
    priestPayout: '770',
    currency: 'INR',
    devoteeNames: [{ name: 'Ramesh' }],
    videoProofUrl: null,
    videoUploadedAt: null,
    rating: null,
    reviewText: null,
    createdAt: new Date('2026-08-12T00:00:00.000Z'),
    temple: { id: 't1', name: 'Kashi Vishwanath', city: 'Varanasi' },
    pujaType: { id: 'p1', name: 'Rudrabhishek', durationMinutes: 60 },
    user: { id: 'u1', fullName: 'Ramesh' },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test'; // enables the demo-token bypass in auth middleware
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'pandit@demo.com' ? PANDIT_USER : null,
  );
  // Satisfies BOTH requireRole('priest') (needs status active) and
  // getPriestId (needs id).
  prismaMock.priest.findUnique.mockResolvedValue({
    id: PRIEST_ID,
    userId: PANDIT_USER.id,
    status: 'active',
  } as never);
  prismaMock.pujaBooking.findMany.mockResolvedValue([bookingRow()] as never);
  prismaMock.pujaBooking.count.mockResolvedValue(51 as never);
  prismaMock.pujaBooking.groupBy.mockResolvedValue([
    { status: 'priest_assigned', _count: { _all: 25 } },
    { status: 'confirmed', _count: { _all: 9 } },
    { status: 'video_uploaded', _count: { _all: 6 } },
    { status: 'completed', _count: { _all: 4 } },
    { status: 'delivered', _count: { _all: 3 } },
    { status: 'pending_payment', _count: { _all: 2 } },
    { status: 'refunded', _count: { _all: 1 } },
    { status: 'in_progress', _count: { _all: 1 } },
  ] as never);
  prismaMock.review.findMany.mockResolvedValue([] as never);
});

// ─── PF-10 ───────────────────────────────────────────────────────────────────
// "Platform Commission -₹NaN" on the one screen where a pandit checks the take
// rate: the detail page reads booking.platformCommission and the select never
// asked for the column.

describe('PF-10 — GET /priest/bookings selects the commission column', () => {
  it('asks Prisma for platformCommission', async () => {
    await call('GET', '/bookings');
    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as {
      select: Record<string, unknown>;
    };
    expect(args.select.platformCommission).toBe(true);
  });

  it('also selects the devotee rating/review the detail page renders', async () => {
    await call('GET', '/bookings');
    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as {
      select: Record<string, unknown>;
    };
    expect(args.select.rating).toBe(true);
    expect(args.select.reviewText).toBe(true);
  });
});

// ─── PF-07 ───────────────────────────────────────────────────────────────────
// The list showed 20 of 51 with tab counts derived from that truncated page.

describe('PF-07 — server-side counts and tab views', () => {
  it('returns per-status counts for the whole assignment book, not the page', async () => {
    const res = await call('GET', '/bookings');
    const body = res.json();
    expect(body.counts).toBeTruthy();
    expect(body.counts.priest_assigned).toBe(25);
    expect(body.counts.confirmed).toBe(9);
    // "Completed" on the tab strip means completed + video_uploaded + delivered.
    expect(body.counts.completed).toBe(13);
    // Every assigned booking, including the ones no tab shows.
    expect(body.counts.all).toBe(51);
  });

  it('?view=completed filters on all three delivered-side statuses', async () => {
    await call('GET', '/bookings?view=completed');
    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as {
      where: { status?: unknown };
    };
    expect(args.where.status).toEqual({ in: ['completed', 'video_uploaded', 'delivered'] });
  });

  it('?view=priest_assigned filters on that single status', async () => {
    await call('GET', '/bookings?view=priest_assigned');
    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as {
      where: { status?: unknown };
    };
    expect(args.where.status).toEqual({ in: ['priest_assigned'] });
  });

  // Green before and after: the server already honoured page/limit. It is
  // locked here because the new client-side pager depends on it — the client
  // simply never sent either parameter.
  it('honours an explicit page/limit so the client can reach row 21+', async () => {
    await call('GET', '/bookings?page=3&limit=10');
    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as {
      skip: number;
      take: number;
    };
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
  });

  it('rejects an unknown ?status instead of leaking a Prisma error', async () => {
    const res = await call('GET', '/bookings?status=not_a_status');
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid query');
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
  });
});

// ─── PF-08 ───────────────────────────────────────────────────────────────────
// The detail page could not open any booking past row 20 because there was no
// by-id endpoint — it scanned a truncated list client-side.

describe('PF-08 — GET /priest/bookings/:id', () => {
  it('returns a single assigned booking without reading the list', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(
      { ...bookingRow(), priestId: PRIEST_ID } as never,
    );
    const res = await call('GET', `/bookings/${BOOKING_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().booking.id).toBe(BOOKING_ID);
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
  });

  it('includes the commission column here too', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(
      { ...bookingRow(), priestId: PRIEST_ID } as never,
    );
    const res = await call('GET', `/bookings/${BOOKING_ID}`);
    expect(res.json().booking.platformCommission).toBe('330');
  });

  it('404s an unknown booking with the route’s own error body', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null as never);
    const res = await call('GET', `/bookings/${BOOKING_ID}`);
    expect(res.statusCode).toBe(404);
    // Before the fix this was Fastify's generic "Route GET:... not found".
    expect(res.json().error).toBe('Booking not found.');
  });

  it('403s a booking assigned to a different pandit', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(
      { ...bookingRow(), priestId: OTHER_PRIEST_ID } as never,
    );
    const res = await call('GET', `/bookings/${BOOKING_ID}`);
    expect(res.statusCode).toBe(403);
  });
});

// ─── PF-06 ───────────────────────────────────────────────────────────────────
// A blank / junk proof URL was accepted verbatim and then permanently blocked
// delivery: re-upload 400s (status already video_uploaded) and the delivery
// gate trims the value to empty, so the booking can never be closed or paid.

describe('PF-06 — POST /priest/bookings/:id/video validates the URL', () => {
  it('rejects a whitespace-only videoUrl at the boundary', async () => {
    const res = await call('POST', `/bookings/${BOOKING_ID}/video`, { videoUrl: '  ' });
    expect(res.statusCode).toBe(400);
    expect(uploadVideoProofMock).not.toHaveBeenCalled();
  });

  it('rejects a non-URL string', async () => {
    const res = await call('POST', `/bookings/${BOOKING_ID}/video`, {
      videoUrl: 'not-a-url-at-all',
    });
    expect(res.statusCode).toBe(400);
    expect(uploadVideoProofMock).not.toHaveBeenCalled();
  });

  it('accepts a real URL and forwards it trimmed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(
      { id: BOOKING_ID, status: 'completed', priestId: PRIEST_ID } as never,
    );
    uploadVideoProofMock.mockResolvedValue({ id: BOOKING_ID, status: 'video_uploaded' });
    const res = await call('POST', `/bookings/${BOOKING_ID}/video`, {
      videoUrl: '  https://cdn.darshya.online/proof.mp4  ',
    });
    expect(res.statusCode).toBe(200);
    expect(uploadVideoProofMock).toHaveBeenCalledWith(
      BOOKING_ID,
      PRIEST_ID,
      'https://cdn.darshya.online/proof.mp4',
    );
  });
});

describe('PF-06 — a bad proof can be replaced while the booking is video_uploaded', () => {
  it('lets the assigned pandit overwrite the stored proof URL', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(
      { id: BOOKING_ID, status: 'video_uploaded', priestId: PRIEST_ID } as never,
    );
    prismaMock.pujaBooking.update.mockResolvedValue(
      {
        id: BOOKING_ID,
        bookingNumber: 'BS-20260812-T6GL8',
        status: 'video_uploaded',
        videoProofUrl: 'https://cdn.darshya.online/real.mp4',
        videoUploadedAt: new Date(),
      } as never,
    );
    const res = await call('POST', `/bookings/${BOOKING_ID}/video`, {
      videoUrl: 'https://cdn.darshya.online/real.mp4',
    });
    expect(res.statusCode).toBe(200);
    const args = prismaMock.pujaBooking.update.mock.calls[0]![0] as {
      data: { videoProofUrl: string; status?: string };
    };
    expect(args.data.videoProofUrl).toBe('https://cdn.darshya.online/real.mp4');
    // A replace must not re-drive the status machine.
    expect(args.data.status).toBeUndefined();
  });

  it('refuses a replace from a pandit who is not assigned', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(
      { id: BOOKING_ID, status: 'video_uploaded', priestId: OTHER_PRIEST_ID } as never,
    );
    const res = await call('POST', `/bookings/${BOOKING_ID}/video`, {
      videoUrl: 'https://cdn.darshya.online/real.mp4',
    });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });

  // Green before and after — a regression lock so the replace path below never
  // widens into "any status may attach proof".
  it('still refuses a proof upload on a booking that never reached completed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(
      { id: BOOKING_ID, status: 'priest_assigned', priestId: PRIEST_ID } as never,
    );
    uploadVideoProofMock.mockRejectedValue(
      new Error('Video proof can only be uploaded for bookings in "completed" status.'),
    );
    const res = await call('POST', `/bookings/${BOOKING_ID}/video`, {
      videoUrl: 'https://cdn.darshya.online/real.mp4',
    });
    expect(res.statusCode).toBe(400);
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });
});

// ─── PF-11 ───────────────────────────────────────────────────────────────────
// submitReview writes PujaBooking.rating/reviewText and bumps the priests
// aggregate; it never inserts a Review row. /priest/reviews read only the
// Review table, so a pandit with 43 ratings saw an empty page.

describe('PF-11 — GET /priest/reviews surfaces booking-embedded reviews', () => {
  it('returns the rating a devotee left on a booking', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: BOOKING_ID,
        bookingNumber: 'BS-20260812-T6GL8',
        userId: 'user-devotee-1',
        rating: 5,
        reviewText: 'Excellent puja, very devoted pandit ji.',
        updatedAt: new Date('2026-08-12T10:00:00.000Z'),
        createdAt: new Date('2026-08-10T10:00:00.000Z'),
        pujaType: { name: 'Rudrabhishek' },
      },
    ] as never);

    const res = await call('GET', '/reviews');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.reviews[0].rating).toBe(5);
    expect(body.reviews[0].comment).toBe('Excellent puja, very devoted pandit ji.');
  });

  it('still returns Review-table rows and merges the two sources', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      {
        id: BOOKING_ID,
        bookingNumber: 'BS-20260812-T6GL8',
        userId: 'user-devotee-1',
        rating: 5,
        reviewText: 'From the booking.',
        updatedAt: new Date('2026-08-12T10:00:00.000Z'),
        createdAt: new Date('2026-08-10T10:00:00.000Z'),
        pujaType: { name: 'Rudrabhishek' },
      },
    ] as never);
    prismaMock.review.findMany.mockResolvedValue([
      {
        id: 'rev-1',
        userId: 'user-devotee-2',
        providerId: PANDIT_USER.id,
        providerType: 'PANDIT',
        rating: 4,
        comment: 'From the Review table.',
        createdAt: new Date('2026-08-11T10:00:00.000Z'),
      },
    ] as never);

    const res = await call('GET', '/reviews');
    const body = res.json();
    expect(body.total).toBe(2);
    expect(body.reviews.map((r: { comment: string }) => r.comment)).toContain(
      'From the Review table.',
    );
    expect(body.reviews.map((r: { comment: string }) => r.comment)).toContain('From the booking.');
  });

  it('scopes the booking scan to this pandit and to rated bookings only', async () => {
    await call('GET', '/reviews');
    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(args.where.priestId).toBe(PRIEST_ID);
    expect(args.where.rating).toEqual({ not: null });
  });
});
