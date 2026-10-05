import { parseSlotMinutes, resolveSlotInstant } from './slot-time.js';

/**
 * When a pandit may press Start on a booking.
 *
 * Start used to be open from the moment of acceptance, so a pandit could mark a
 * puja Started and Completed days early, which releases the earning. The window
 * opens PUJA_START_LEAD_HOURS before the slot. A slot that cannot be read opens
 * at 00:00 IST on the scheduled day, the same fallback slot-time.ts documents.
 */
export const PUJA_START_LEAD_HOURS = 2;

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;

export function pujaStartUnlockAt(scheduledDate: Date, scheduledTimeSlot?: string | null): Date {
  if (parseSlotMinutes(scheduledTimeSlot) === null) {
    const dayStartUtcMs = Date.UTC(
      scheduledDate.getUTCFullYear(),
      scheduledDate.getUTCMonth(),
      scheduledDate.getUTCDate(),
    );
    return new Date(dayStartUtcMs - IST_OFFSET_MS);
  }
  const slot = resolveSlotInstant(scheduledDate, scheduledTimeSlot);
  return new Date(slot.getTime() - PUJA_START_LEAD_HOURS * 60 * 60_000);
}

/** The sentence shown to the pandit while Start is locked, or null once it is open. */
export function pujaStartLockedMessage(
  scheduledDate: Date,
  scheduledTimeSlot: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const unlockAt = pujaStartUnlockAt(scheduledDate, scheduledTimeSlot);
  if (now.getTime() >= unlockAt.getTime()) return null;

  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(unlockAt);
  const time = fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const day = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
  const why =
    parseSlotMinutes(scheduledTimeSlot) === null
      ? 'the day it is scheduled'
      : `${PUJA_START_LEAD_HOURS} hours before the scheduled time`;
  return `You can start this puja from ${time} IST on ${day}, ${why}.`;
}
