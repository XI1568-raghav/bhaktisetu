import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * SCAL-04 — WhatsApp broadcast recipient scans must be paged.
 *
 * `broadcastToBookingHolders` ran `pujaBooking.findMany({ where: { status: {
 * in: [...] } }, select: { user: { select: { phone } } } })` — every booking
 * ever confirmed, joined to its user, with no take and no cursor — and
 * `broadcastToAll` ran that plus an unbounded waitlist scan. The whole audience
 * had to materialise in a 512 MB container before the first message went out,
 * and the booking-first shape returned one row per BOOKING, so a devotee with
 * twelve bookings arrived twelve times and was de-duplicated afterwards.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    waitlist: { findMany: vi.fn() },
    pujaBooking: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  } as Record<string, any>,
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/whatsapp.js', () => ({
  whatsapp: { enabled: false },
  sendWhatsappTemplate: vi.fn().mockResolvedValue({ skipped: true }),
}));

import { broadcastToBookingHolders, broadcastToAll } from './whatsapp-broadcast.service.js';

const user = prismaMock.user as { findMany: ReturnType<typeof vi.fn> };
const waitlist = prismaMock.waitlist as { findMany: ReturnType<typeof vi.fn> };
const pujaBooking = prismaMock.pujaBooking as { findMany: ReturnType<typeof vi.fn> };

/** A user table the mock pages through exactly as Prisma's cursor would. */
function seedUsers(count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `u-${String(i).padStart(5, '0')}`,
    phone: `+9198765${String(i).padStart(5, '0')}`,
  }));
  user.findMany.mockImplementation(async (args: any) => {
    const take = args?.take ?? rows.length;
    const start = args?.cursor ? rows.findIndex((r) => r.id === args.cursor.id) + (args.skip ?? 0) : 0;
    return rows.slice(start, start + take);
  });
  return rows;
}

/**
 * runBroadcast paces itself at 50 messages/second (Meta's cap), so a
 * 2,500-recipient fan-out really sleeps 49 seconds. Drive the clock instead of
 * waiting on it — the pacing is not what is under test here.
 */
async function withVirtualClock<T>(run: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  try {
    const p = run();
    // Interleave: let the awaits settle, then release the next sleep.
    for (let i = 0; i < 200; i++) await vi.advanceTimersByTimeAsync(1000);
    return await p;
  } finally {
    vi.useRealTimers();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]); // no opt-outs
  waitlist.findMany.mockResolvedValue([]);
  pujaBooking.findMany.mockImplementation(async () => {
    throw new Error('booking-holder audience must not scan bookings — SCAL-04');
  });
});

describe('SCAL-04 — broadcast audience paging', () => {
  it('pages the booking-holder audience instead of loading it in one read', async () => {
    seedUsers(2500);

    const out = await withVirtualClock(() => broadcastToBookingHolders({ templateName: 'launch' }));

    expect(pujaBooking.findMany).not.toHaveBeenCalled();
    // 2500 recipients at 1000/page = 3 pages.
    expect(user.findMany).toHaveBeenCalledTimes(3);
    for (const call of user.findMany.mock.calls) {
      expect(call[0].take).toBe(1000);
      expect(call[0].orderBy).toEqual({ id: 'asc' });
    }
    // Pages 2 and 3 continue from the previous page's last id — no offset skip.
    expect(user.findMany.mock.calls[1]![0].cursor).toEqual({ id: 'u-00999' });
    expect(user.findMany.mock.calls[2]![0].cursor).toEqual({ id: 'u-01999' });
    // Everybody is reached: paging bounds memory, it does not drop recipients.
    expect(out.total).toBe(2500);
  });

  it('asks for people, not bookings, so one devotee is one recipient', async () => {
    seedUsers(3);

    await broadcastToBookingHolders({ templateName: 'launch' });

    const where = user.findMany.mock.calls[0]![0].where;
    expect(where.bookings.some.status.in).toEqual([
      'confirmed',
      'video_uploaded',
      'completed',
      'delivered',
    ]);
    expect(where.phone).toEqual({ not: null });
  });

  it('pages the waitlist half of broadcastToAll too', async () => {
    seedUsers(0);
    const rows = Array.from({ length: 1200 }, (_, i) => ({
      id: `w-${String(i).padStart(5, '0')}`,
      phone: `+9199999${String(i).padStart(5, '0')}`,
    }));
    waitlist.findMany.mockImplementation(async (args: any) => {
      const take = args?.take ?? rows.length;
      const start = args?.cursor
        ? rows.findIndex((r) => r.id === args.cursor.id) + (args.skip ?? 0)
        : 0;
      return rows.slice(start, start + take);
    });

    const out = await withVirtualClock(() => broadcastToAll({ templateName: 'launch' }));

    expect(waitlist.findMany).toHaveBeenCalledTimes(2);
    expect(waitlist.findMany.mock.calls[0]![0].take).toBe(1000);
    expect(out.total).toBe(1200);
  });
});
