/**
 * Resolve a booking's real scheduled instant from its two stored halves.
 *
 * WHY THIS EXISTS (RV-11 / RV-13, 2026-08-10)
 * -------------------------------------------
 * `PujaBooking.scheduledDate` is a DATE column — `new Date('2026-08-15')` parses
 * as 2026-08-15T00:00:00Z, i.e. MIDNIGHT. The time of day lives separately in
 * `scheduledTimeSlot` ('18:00', IST).
 *
 * Both the 24h cancellation cutoff and the refund-ladder evaluator were comparing
 * `now` against `scheduledDate` alone, so every booking was treated as if it
 * happened at 00:00. For an 18:00 slot the policy cutoff is 18:00 on D-1, but the
 * code's cutoff was 00:00 on D-1 — the whole 00:00–18:00 window on D-1 was wrongly
 * refused, and the refund quote landed a tier lower than policy. The lost window
 * equals the slot's hour-of-day: 6h for an 06:00 puja, 18h for an 18:00 puja.
 *
 * Slot times are IST (Asia/Kolkata, UTC+5:30), matching the convention already used
 * in lib/darshan-schedule.ts and jobs/aarti-notify.ts. There is no tz library in
 * this service; offset arithmetic is explicit and deliberate.
 */

/** Asia/Kolkata is UTC+5:30 year-round (no DST). */
const IST_OFFSET_MIN = 5 * 60 + 30;

/**
 * Parse the minutes-since-IST-midnight out of a slot string.
 *
 * Tolerant by design: `availableSlots` is free-form JSON and has historically held
 * both bare times ('18:00') and labelled ones ('Evening (6:00 PM)'). Returns null
 * when no sensible time can be read, so callers can fall back to the previous
 * midnight behaviour rather than throw on legacy data.
 */
export function parseSlotMinutes(slot: string | null | undefined): number | null {
  if (!slot) return null;
  const s = String(slot).trim();

  // 24h form first: 18:00, 6:30, 06:00
  const m24 = s.match(/(?:^|[^\d])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/);
  // 12h form: 6:00 PM / 6 PM / 6:00pm
  const m12 = s.match(/(?:^|[^\d])(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([APap])\.?[Mm]\.?/);

  if (m12) {
    let h = Number(m12[1]);
    const min = Number(m12[2] ?? 0);
    const isPm = m12[3]!.toLowerCase() === 'p';
    if (h === 12) h = 0;
    if (isPm) h += 12;
    return h * 60 + min;
  }
  if (m24) return Number(m24[1]) * 60 + Number(m24[2]);
  return null;
}

/**
 * Combine the stored DATE with the IST slot time into the true UTC instant.
 *
 * `scheduledDate` is taken as the calendar day it represents in UTC (that is how
 * it is written: `new Date('YYYY-MM-DD')`). Returns the date unchanged when the
 * slot cannot be parsed — preserving the old behaviour rather than inventing a
 * time — so a malformed legacy slot degrades to the previous, stricter cutoff
 * instead of accidentally widening someone's cancellation window.
 */
export function resolveSlotInstant(
  scheduledDate: Date,
  scheduledTimeSlot?: string | null,
): Date {
  const mins = parseSlotMinutes(scheduledTimeSlot);
  if (mins === null) return new Date(scheduledDate);

  // Anchor to the UTC calendar day the DATE column represents, then add the
  // IST wall-clock minutes converted to UTC.
  const dayStartUtcMs = Date.UTC(
    scheduledDate.getUTCFullYear(),
    scheduledDate.getUTCMonth(),
    scheduledDate.getUTCDate(),
  );
  return new Date(dayStartUtcMs + (mins - IST_OFFSET_MIN) * 60_000);
}

/** Hours from `now` until the slot. Negative once the slot has passed. */
export function hoursUntilSlot(
  scheduledDate: Date,
  scheduledTimeSlot?: string | null,
  now: Date = new Date(),
): number {
  const slot = resolveSlotInstant(scheduledDate, scheduledTimeSlot);
  return (slot.getTime() - now.getTime()) / (1000 * 60 * 60);
}
