import { parseSlotMinutes, resolveSlotInstant } from './slot-time.js';

/**
 * A provider may mark a puja, consultation or wellness session complete only once
 * its scheduled start has passed. Completion releases the held earning, so
 * completing early pays for something that has not happened.
 *
 * Answered as HTTP 409 with `code: TOO_EARLY_TO_COMPLETE` by every route that
 * completes one of the three kinds.
 */
export const TOO_EARLY_TO_COMPLETE = 'too_early_to_complete';

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;

/**
 * The instant a puja booking starts. A slot that cannot be read falls back to
 * 00:00 IST on the scheduled day, the same fallback the pandit start gate uses
 * (puja-start-window.ts), so completion is never opened earlier than start.
 */
export function pujaScheduledInstant(scheduledDate: Date, scheduledTimeSlot?: string | null): Date {
  if (parseSlotMinutes(scheduledTimeSlot) === null) {
    const dayStartUtcMs = Date.UTC(
      scheduledDate.getUTCFullYear(),
      scheduledDate.getUTCMonth(),
      scheduledDate.getUTCDate(),
    );
    return new Date(dayStartUtcMs - IST_OFFSET_MS);
  }
  return resolveSlotInstant(scheduledDate, scheduledTimeSlot);
}

/** The sentence shown while completion is locked, or null once the start has passed. */
export function tooEarlyToCompleteMessage(
  scheduledAt: Date,
  noun: 'puja' | 'consultation' | 'session',
  now: Date = new Date(),
): string | null {
  if (now.getTime() >= scheduledAt.getTime()) return null;
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(scheduledAt);
  const time = fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const day = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
  return `This ${noun} cannot be marked complete before it starts, at ${time} IST on ${day}.`;
}
