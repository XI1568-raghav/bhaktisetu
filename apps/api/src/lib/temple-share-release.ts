/**
 * When a temple's puja share becomes releasable.
 *
 * A TemplePayout row is minted when the booking is CONFIRMED, but the share is
 * only payable once the puja has been performed AND proved (video_uploaded /
 * delivered): the same hold the pandit's earning has, and the same statuses
 * services/temple-settlement.service.ts uses for the admin queue. One rule,
 * used by GET /payouts and GET /dashboard so the two can never disagree.
 */
import type { prisma as PrismaClientInstance } from './prisma.js';

export const SHARE_PROVED_STATUSES = ['video_uploaded', 'delivered'] as const;

export type ShareRelease = 'paid' | 'payable' | 'upcoming' | string;

interface ShareRow {
  status: string;
  bookingId: string | null;
}

/** Ids of the bookings (among `rows`) that have reached a proved status. */
export async function provedBookingIds(
  db: Pick<typeof PrismaClientInstance, 'pujaBooking'>,
  rows: ShareRow[],
): Promise<Set<string>> {
  const ids = [...new Set(rows.map((r) => r.bookingId).filter((v): v is string => !!v))];
  if (ids.length === 0) return new Set();
  const bookings = await db.pujaBooking.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
    take: ids.length,
  });
  return new Set(
    bookings
      .filter((b) => (SHARE_PROVED_STATUSES as readonly string[]).includes(b.status))
      .map((b) => b.id),
  );
}

/** paid | payable (pending + proved) | upcoming (pending, not proved) | other status as-is. */
export function shareRelease(row: ShareRow, proved: Set<string>): ShareRelease {
  if (row.status === 'completed') return 'paid';
  if (row.status === 'pending') {
    return row.bookingId && proved.has(row.bookingId) ? 'payable' : 'upcoming';
  }
  return row.status;
}
