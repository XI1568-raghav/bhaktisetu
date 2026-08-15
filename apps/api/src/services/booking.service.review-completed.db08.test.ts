/**
 * DB-08 — a booking in `completed` could never be reviewed.
 *
 * The allowed-status set was `['delivered', 'video_uploaded']`, so the one
 * state a customer actually recognises as "done" was refused:
 *
 *   POST /api/v1/bookings/<id>/review
 *   -> 409 Reviews can only be submitted for bookings in "delivered" or
 *      "video_uploaded" status. Current: "completed".
 *
 * Measured on the sweep, devotee@demo.com held three bookings in `completed`
 * (BS-20260812-9HWMA, JMHM4, A6UON), every one of them rendered on /bookings
 * under the friendly pill "Completed", and not one of them could be rated. For
 * a marketplace whose ranking and social proof run on reviews, that is the
 * review engine switched off for a whole terminal state.
 *
 * `completed` is the pandit's own "puja performed" transition (it precedes
 * video_uploaded/delivered), so the work being rated has definitively
 * happened — which is the only precondition a review needs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { BookingService } from './booking.service.js';

const service = new BookingService();

/** The three states in which the puja has demonstrably been performed. */
const REVIEWABLE = ['completed', 'video_uploaded', 'delivered'] as const;

/** States where nothing has been delivered yet — a review would be meaningless. */
const NOT_REVIEWABLE = [
  'pending_payment',
  'confirmed',
  'priest_assigned',
  'in_progress',
  'cancelled',
  'refunded',
] as const;

function bookingIn(status: string) {
  return {
    id: 'booking-1',
    userId: 'user-1',
    status,
    priestId: null,
    rating: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.pujaBooking.update.mockResolvedValue({
    id: 'booking-1',
    bookingNumber: 'BS-20260812-JMHM4',
    rating: 5,
    reviewText: 'QA review',
  } as never);
});

describe('DB-08 — every terminal success state is reviewable', () => {
  it.each(REVIEWABLE)('accepts a review on a booking in "%s"', async (status) => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(bookingIn(status) as never);

    const result = await service.submitReview('booking-1', 'user-1', 5, 'QA review');

    expect(result.rating).toBe(5);
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: { rating: 5, reviewText: 'QA review' },
      }),
    );
  });

  it.each(NOT_REVIEWABLE)('still refuses a review on a booking in "%s"', async (status) => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(bookingIn(status) as never);

    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(
      /Reviews can only be submitted/,
    );
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });

  it('names every state it would have accepted when it refuses one', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(bookingIn('confirmed') as never);

    // The old message named two states and the caller had no way to learn the
    // third; a refusal that lists the real set is actionable.
    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(/completed/);
    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(/delivered/);
    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(
      /video_uploaded/,
    );
  });

  it('one review per booking, whatever the state it was left in', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...bookingIn('completed'),
      rating: 4,
    } as never);

    await expect(service.submitReview('booking-1', 'user-1', 5)).rejects.toThrow(
      /already been submitted/,
    );
  });

  it('still refuses a stranger reviewing a completed booking', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(bookingIn('completed') as never);

    await expect(service.submitReview('booking-1', 'someone-else', 5)).rejects.toThrow(
      /not authorized to review/,
    );
  });
});
