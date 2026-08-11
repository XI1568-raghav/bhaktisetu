import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { __testing } from './bookings.js';
import {
  VALID_TRANSITIONS,
  PLATFORM_FEE_INR,
  PRASAD_DELIVERY_FEE_INR,
  DEFAULT_PRIEST_SHARE,
} from '../services/booking.service.js';
import {
  priestSlotKey as priestSlotKeyFromLib,
  lockPriestSlot as lockPriestSlotFromLib,
} from '../lib/priest-slot.js';
import { hoursUntilSlot } from '../lib/slot-time.js';
import { REFUND_REQUESTED_MARKER } from '../lib/refund-marker.js';
import {
  cancellationService,
  DEFAULT_CANCEL_POLICY,
} from '../services/cancellation.service.js';

const {
  checkVideoProofGate,
  checkPriestReassignable,
  checkTransitionRole,
  isPureReassignment,
  priestSlotKey,
  lockPriestSlot,
  updateBookingStatusSchema,
  rescheduleBookingSchema,
  normalizePriestSlots,
  evaluatePriestSlot,
  classifyCreateBookingError,
  resolvePriestShare,
  splitPujaPrice,
  unpaidHoldCutoff,
  activeSlotHoldWhere,
  UNPAID_HOLD_MINUTES,
  PRIEST_REASSIGNABLE_STATUSES,
  OWNER_ALLOWED_TRANSITIONS,
  ASSIGNED_PRIEST_ALLOWED_TRANSITIONS,
} = __testing;

// Coverage note: the route harness in apps/api/src/routes is pure-function/Zod
// only — there is no Fastify+Prisma integration scaffolding anywhere in the
// suite (see the same note in priest-pujas.test.ts). The three fixes below are
// therefore written as pure decision helpers that the handlers call, so the
// decision itself is pinned here and only the DB plumbing around it (the
// advisory lock, the findMany, the update) is left to manual/staging checks.

// ─── RV-08 — video proof is mandatory ──────────────────────────────────────────

describe('RV-08 — video proof gate on PATCH /bookings/:id', () => {
  const priest = { isAssignedPriest: true, isAdmin: false };
  const devotee = { isAssignedPriest: false, isAdmin: false };
  const admin = { isAssignedPriest: false, isAdmin: true };

  it('blocks completed -> video_uploaded when no proof exists and none is sent', () => {
    const r = checkVideoProofGate({
      newStatus: 'video_uploaded',
      existingVideoProofUrl: null,
      ...priest,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(409);
      expect(r.message).toMatch(/mandatory/i);
    }
  });

  it('blocks video_uploaded -> delivered when no proof exists (the payout-minting hop)', () => {
    const r = checkVideoProofGate({
      newStatus: 'delivered',
      existingVideoProofUrl: null,
      ...priest,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });

  it('blocks even an admin from an unproven flip — the rule is not role-waivable', () => {
    const r = checkVideoProofGate({
      newStatus: 'video_uploaded',
      existingVideoProofUrl: null,
      ...admin,
    });
    expect(r.ok).toBe(false);
  });

  it('treats a whitespace-only stored URL as no proof', () => {
    const r = checkVideoProofGate({
      newStatus: 'video_uploaded',
      existingVideoProofUrl: '   ',
      ...priest,
    });
    expect(r.ok).toBe(false);
  });

  it('allows the flip when the booking already carries proof (uploadVideoProof path)', () => {
    const r = checkVideoProofGate({
      newStatus: 'video_uploaded',
      existingVideoProofUrl: 'https://cdn.darshya.online/proof/abc.mp4',
      ...priest,
    });
    expect(r.ok).toBe(true);
  });

  it('allows the flip when the assigned pandit supplies proof in the same request', () => {
    const r = checkVideoProofGate({
      newStatus: 'video_uploaded',
      existingVideoProofUrl: null,
      suppliedVideoProofUrl: 'https://cdn.darshya.online/proof/abc.mp4',
      ...priest,
    });
    expect(r.ok).toBe(true);
  });

  it('lets an admin attach proof (ops remediation)', () => {
    const r = checkVideoProofGate({
      newStatus: 'delivered',
      existingVideoProofUrl: null,
      suppliedVideoProofUrl: 'https://cdn.darshya.online/proof/abc.mp4',
      ...admin,
    });
    expect(r.ok).toBe(true);
  });

  it('refuses a devotee self-attesting proof — otherwise they could mint the pandit payout', () => {
    const r = checkVideoProofGate({
      newStatus: 'video_uploaded',
      existingVideoProofUrl: null,
      suppliedVideoProofUrl: 'https://evil.example.com/anything.mp4',
      ...devotee,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it('still lets the devotee advance a booking that already has genuine proof', () => {
    const r = checkVideoProofGate({
      newStatus: 'delivered',
      existingVideoProofUrl: 'https://cdn.darshya.online/proof/abc.mp4',
      ...devotee,
    });
    expect(r.ok).toBe(true);
  });

  it('leaves non-proof transitions alone (confirmed, priest_assigned, completed, refunded)', () => {
    for (const status of ['confirmed', 'priest_assigned', 'in_progress', 'completed', 'cancelled', 'refunded'] as const) {
      expect(
        checkVideoProofGate({
          newStatus: status,
          existingVideoProofUrl: null,
          ...priest,
        }).ok,
      ).toBe(true);
    }
  });

  it('the PATCH schema still accepts the no-body request the gate now rejects (gate, not schema)', () => {
    // Pinning the division of labour: Zod stays permissive so the 409 carries
    // an explanatory message rather than a shapeless validation error.
    expect(updateBookingStatusSchema.safeParse({ status: 'video_uploaded' }).success).toBe(true);
  });
});

// ─── RV-17 — admin priest reassignment ─────────────────────────────────────────

describe('RV-17 — admin priest reassignment window', () => {
  it('allows reassignment on the pre-delivery statuses (T4 escalation target)', () => {
    for (const status of ['pending_payment', 'confirmed', 'priest_assigned', 'in_progress'] as const) {
      expect(checkPriestReassignable(status).ok).toBe(true);
    }
  });

  it('refuses once the puja has been performed or a payout has been minted', () => {
    for (const status of ['completed', 'video_uploaded', 'delivered'] as const) {
      const r = checkPriestReassignable(status);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(409);
    }
  });

  it('refuses on terminal statuses', () => {
    for (const status of ['cancelled', 'refunded'] as const) {
      expect(checkPriestReassignable(status).ok).toBe(false);
    }
  });

  it('the schema accepts priestId on the priest_assigned variant (the documented capability)', () => {
    const parsed = updateBookingStatusSchema.safeParse({
      status: 'priest_assigned',
      priestId: '11111111-1111-1111-1111-111111111111',
    });
    expect(parsed.success).toBe(true);
  });
});

// ─── RV-17 second pass — the reassign gate vs the real state machine ───────────
//
// The first RV-17 fix passed every test above and still answered
// `409 Invalid status transition` on the write it had just committed: the gate
// and the state machine lived in different files and no test compared them.
// These tests import the real VALID_TRANSITIONS so that mismatch cannot recur.

describe('RV-17 — pure reassignment does not need a state-machine self-edge', () => {
  const REASSIGN_ONLY = { hasData: false, reassignmentApplied: true };

  it('the state machine has no self-edges — the precondition that broke it', () => {
    // If a future change adds `confirmed -> confirmed`, the short-circuit below
    // becomes redundant rather than wrong; this test documents which it is.
    for (const [from, to] of Object.entries(VALID_TRANSITIONS)) {
      expect(to).not.toContain(from);
    }
  });

  it('every reassignable status can be reassigned without moving status', () => {
    for (const status of PRIEST_REASSIGNABLE_STATUSES) {
      // The T4-escalation request: same status, new pandit.
      expect(checkPriestReassignable(status).ok).toBe(true);
      expect(
        isPureReassignment({
          currentStatus: status,
          requestedStatus: status,
          ...REASSIGN_ONLY,
        }),
      ).toBe(true);
      // ...and it must not be routed into the state machine, which would throw.
      expect(VALID_TRANSITIONS[status]).not.toContain(status);
    }
  });

  it('a reassignment that also advances the status still goes through the state machine', () => {
    expect(
      isPureReassignment({
        currentStatus: 'confirmed',
        requestedStatus: 'priest_assigned',
        ...REASSIGN_ONLY,
      }),
    ).toBe(false);
    // and that transition is a legal one, so it succeeds there
    expect(VALID_TRANSITIONS.confirmed).toContain('priest_assigned');
  });

  it('a same-status PATCH with no reassignment is untouched (still an illegal transition)', () => {
    expect(
      isPureReassignment({
        currentStatus: 'confirmed',
        requestedStatus: 'confirmed',
        reassignmentApplied: false,
        hasData: false,
      }),
    ).toBe(false);
  });

  it('never swallows a data payload — it falls through rather than dropping the write', () => {
    expect(
      isPureReassignment({
        currentStatus: 'video_uploaded',
        requestedStatus: 'video_uploaded',
        reassignmentApplied: true,
        hasData: true,
      }),
    ).toBe(false);
  });
});

// ─── S2C-13 — priest double-booking + unconditional capacity ───────────────────

describe('S2C-13 — availableSlots normalization', () => {
  it('accepts a plain "HH:MM" string array', () => {
    expect(normalizePriestSlots(['06:00', '09:00'])).toEqual(['06:00', '09:00']);
  });

  it('accepts the {time,label} object shape', () => {
    expect(normalizePriestSlots([{ time: '09:00', label: 'Morning' }])).toEqual(['09:00']);
  });

  it('returns an empty whitelist for null/undefined/non-array (the default state)', () => {
    expect(normalizePriestSlots(null)).toEqual([]);
    expect(normalizePriestSlots(undefined)).toEqual([]);
    expect(normalizePriestSlots({ nope: true })).toEqual([]);
  });

  it('drops malformed entries rather than whitelisting an empty string', () => {
    expect(normalizePriestSlots(['', { label: 'no time' }, '07:30'])).toEqual(['07:30']);
  });
});

describe('S2C-13 — priest slot collision', () => {
  const base = {
    offeringId: 'off-satyanarayan',
    maxBookingsPerSlot: 1,
    scheduledDate: '2026-08-15',
    scheduledTime: '09:00',
  };

  it('allows the first booking of a free slot', () => {
    expect(evaluatePriestSlot({ ...base, held: [] }).ok).toBe(true);
  });

  it('blocks the reported scenario — same pandit, same slot, a DIFFERENT offering', () => {
    const r = evaluatePriestSlot({
      ...base,
      held: [{ bookingNumber: 'BS-20260815-AAAAA', priestPujaOfferingId: 'off-griha-pravesh' }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('BS-20260815-AAAAA');
  });

  it('blocks against a temple-path booking pinned to the same pandit (null offering id)', () => {
    // The nullable FK is exactly why this is compared in JS and not with a
    // Prisma `not` filter — a SQL `<>` would drop the NULL row.
    const r = evaluatePriestSlot({
      ...base,
      held: [{ bookingNumber: 'BS-20260815-BBBBB', priestPujaOfferingId: null }],
    });
    expect(r.ok).toBe(false);
  });

  it('blocks a second booking of the SAME offering at the default capacity of 1', () => {
    // This is the availableSlots-unset case: capacity used to be skipped
    // entirely, so N devotees could book the same offering at the same instant.
    const r = evaluatePriestSlot({
      ...base,
      held: [{ bookingNumber: 'BS-20260815-CCCCC', priestPujaOfferingId: 'off-satyanarayan' }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/fully booked \(1\/1\)/);
  });

  it('honours a pandit who deliberately configured maxBookingsPerSlot > 1', () => {
    const held = [
      { bookingNumber: 'BS-20260815-DDDDD', priestPujaOfferingId: 'off-satyanarayan' },
      { bookingNumber: 'BS-20260815-EEEEE', priestPujaOfferingId: 'off-satyanarayan' },
    ];
    expect(evaluatePriestSlot({ ...base, maxBookingsPerSlot: 3, held }).ok).toBe(true);
    expect(
      evaluatePriestSlot({
        ...base,
        maxBookingsPerSlot: 3,
        held: [...held, { bookingNumber: 'BS-20260815-FFFFF', priestPujaOfferingId: 'off-satyanarayan' }],
      }).ok,
    ).toBe(false);
  });

  it('reports the cross-offering clash first, even when capacity would also fail', () => {
    const r = evaluatePriestSlot({
      ...base,
      maxBookingsPerSlot: 1,
      held: [{ bookingNumber: 'BS-20260815-GGGGG', priestPujaOfferingId: 'off-griha-pravesh' }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/already has booking/);
  });
});

describe('S2C-13 — advisory lock key', () => {
  it('is keyed on priest + calendar day + slot, so two offerings share one lock', () => {
    const d = new Date('2026-08-15T00:00:00.000Z');
    expect(priestSlotKey('priest-1', d, '09:00')).toBe('puja-priest-slot:priest-1:2026-08-15:09:00');
  });

  it('separates different pandits, days and slots', () => {
    const d = new Date('2026-08-15T00:00:00.000Z');
    expect(priestSlotKey('priest-1', d, '09:00')).not.toBe(priestSlotKey('priest-2', d, '09:00'));
    expect(priestSlotKey('priest-1', d, '09:00')).not.toBe(priestSlotKey('priest-1', d, '11:00'));
    expect(priestSlotKey('priest-1', d, '09:00')).not.toBe(
      priestSlotKey('priest-1', new Date('2026-08-16T00:00:00.000Z'), '09:00'),
    );
  });
});

// ─── slot-lock-gap — one lock, one key space ───────────────────────────────────
//
// The lock only serialises callers that agree to take it, on the SAME key.
// While `priestSlotKey`/`lockPriestSlot` lived inside routes/bookings.ts, only
// this file's two callers took it; dispatch.service.accept ran its identical
// (priestId, scheduledDate, scheduledTimeSlot) conflict query inside a plain
// $transaction with no lock, so admin-vs-pandit was unserialised and both
// transactions could commit the same slot. These tests fail the moment someone
// re-inlines a private copy here instead of importing the shared module.

describe('slot-lock-gap — the priest-slot lock is shared, not per-file', () => {
  it('routes/bookings.ts re-exports the SAME function object as lib/priest-slot.ts', () => {
    expect(priestSlotKey).toBe(priestSlotKeyFromLib);
    expect(lockPriestSlot).toBe(lockPriestSlotFromLib);
  });

  it('takes a transaction-scoped lock (released at COMMIT, pooler-safe) on the key it is given', async () => {
    const calls: unknown[][] = [];
    const tx = {
      $queryRawUnsafe: (...args: unknown[]) => {
        calls.push(args);
        return Promise.resolve([]);
      },
    };
    const key = priestSlotKey('priest-1', new Date('2026-08-15T00:00:00.000Z'), '09:00');
    await lockPriestSlot(tx as never, key);

    expect(calls).toHaveLength(1);
    // xact, not session: a session-level lock leaks across Supabase's
    // transaction-mode pooler and would never be released.
    expect(String(calls[0]![0])).toContain('pg_advisory_xact_lock');
    expect(calls[0]![1]).toBe(key);
  });

  it('degrades to the unlocked re-check rather than failing the booking', async () => {
    const tx = { $queryRawUnsafe: () => Promise.reject(new Error('no such function')) };
    await expect(lockPriestSlot(tx as never, 'k')).resolves.toBeUndefined();
  });
});

// ─── P0 — the booking OWNER could mint their own pandit payout ─────────────────
//
// PATCH /bookings/:id authorized owner || admin || assignedPriest and then let
// all three request EVERY transition. `pending_payment -> confirmed` is legal,
// and that is where booking.service.updateBookingStatus mints the Commission row
// (Commission.amount = what payout.service.getPayoutBalance pays out) and the
// TemplePayout. A devotee could book, never pay, PATCH {"status":"confirmed"}
// and mint Rs 8,000 of withdrawable pandit balance per unpaid booking.

describe('P0 — role gate on PATCH /bookings/:id transitions', () => {
  const owner = { isOwner: true, isAssignedPriest: false, isAdmin: false };
  const pandit = { isOwner: false, isAssignedPriest: true, isAdmin: false };
  const admin = { isOwner: false, isAssignedPriest: false, isAdmin: true };

  it('the exploit transition is legal in the state machine — so only this gate stops it', () => {
    // If this ever stops being true the gate is belt-and-braces; today it is the
    // only thing between a devotee and a minted Commission row.
    expect(VALID_TRANSITIONS.pending_payment).toContain('confirmed');
  });

  it('refuses the OWNER the money-minting hop (pending_payment -> confirmed)', () => {
    const r = checkTransitionRole({ newStatus: 'confirmed', ...owner });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it('refuses the OWNER -> refunded (no Razorpay refund, no commission reversal)', () => {
    const r = checkTransitionRole({ newStatus: 'refunded', ...owner });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it('refuses the OWNER priest_assigned', () => {
    expect(checkTransitionRole({ newStatus: 'priest_assigned', ...owner }).ok).toBe(false);
  });

  it('still lets the OWNER cancel their own booking, and acknowledge delivery', () => {
    expect(checkTransitionRole({ newStatus: 'cancelled', ...owner }).ok).toBe(true);
    // Only reachable from video_uploaded, which the pandit/admin must have set —
    // the flow the video-proof gate above already blesses.
    expect(checkTransitionRole({ newStatus: 'delivered', ...owner }).ok).toBe(true);
    expect(VALID_TRANSITIONS.video_uploaded).toContain('delivered');
  });

  it('refuses the assigned PANDIT the ledger-writing hops', () => {
    for (const status of ['confirmed', 'priest_assigned', 'refunded'] as const) {
      const r = checkTransitionRole({ newStatus: status, ...pandit });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(403);
    }
  });

  it('lets the assigned PANDIT record the puja through to delivery', () => {
    for (const status of ['in_progress', 'completed', 'video_uploaded', 'delivered'] as const) {
      expect(checkTransitionRole({ newStatus: status, ...pandit }).ok).toBe(true);
    }
  });

  it('leaves the ADMIN able to drive every status in the machine', () => {
    for (const status of Object.keys(VALID_TRANSITIONS) as (keyof typeof VALID_TRANSITIONS)[]) {
      expect(checkTransitionRole({ newStatus: status, ...admin }).ok).toBe(true);
    }
  });

  it('never grants confirmed/refunded to any non-admin allowlist', () => {
    // The binding assertion: adding either status to either list re-opens the P0.
    for (const status of ['confirmed', 'refunded', 'pending_payment', 'priest_assigned'] as const) {
      expect(OWNER_ALLOWED_TRANSITIONS).not.toContain(status);
      expect(ASSIGNED_PRIEST_ALLOWED_TRANSITIONS).not.toContain(status);
    }
  });

  it('grants the union when one user is both owner and assigned pandit', () => {
    const both = { isOwner: true, isAssignedPriest: true, isAdmin: false };
    expect(checkTransitionRole({ newStatus: 'in_progress', ...both }).ok).toBe(true);
    expect(checkTransitionRole({ newStatus: 'cancelled', ...both }).ok).toBe(true);
    // ...but still not the money hop.
    expect(checkTransitionRole({ newStatus: 'confirmed', ...both }).ok).toBe(false);
  });
});

// ─── videoUploadedAt was client-settable ───────────────────────────────────────

describe('videoUploadedAt is server-stamped, never client-supplied', () => {
  it('rejects a devotee rewriting the evidence timestamp on the delivered hop', () => {
    const parsed = updateBookingStatusSchema.safeParse({
      status: 'delivered',
      data: { videoUploadedAt: '2020-01-01T00:00:00.000Z' },
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects it on every video-proof variant', () => {
    for (const status of ['completed', 'video_uploaded', 'delivered'] as const) {
      expect(
        updateBookingStatusSchema.safeParse({
          status,
          data: { videoUploadedAt: '2020-01-01T00:00:00.000Z' },
        }).success,
      ).toBe(false);
    }
  });

  it('still accepts the field that gate actually inspects', () => {
    const parsed = updateBookingStatusSchema.safeParse({
      status: 'video_uploaded',
      data: { videoProofUrl: 'https://cdn.darshya.online/proof/abc.mp4' },
    });
    expect(parsed.success).toBe(true);
  });
});

// ─── cancelReason / refundReason were not columns ──────────────────────────────

describe('cancel/refund reason lands on a column that exists', () => {
  const COLUMNS = new Set(Object.keys(Prisma.PujaBookingScalarFieldEnum));

  it('the field the old schema accepted is NOT a PujaBooking column', () => {
    // This is why the documented capability threw PrismaClientValidationError
    // and the cancellation silently did not happen.
    expect(COLUMNS.has('cancelReason')).toBe(false);
    expect(COLUMNS.has('refundReason')).toBe(false);
    expect(COLUMNS.has('cancellationReason')).toBe(true);
  });

  it('every key the cancelled variant emits is a real column', () => {
    const parsed = updateBookingStatusSchema.parse({
      status: 'cancelled',
      data: { cancelReason: 'Devotee unwell' },
    }) as { data?: Record<string, unknown> };
    for (const key of Object.keys(parsed.data ?? {})) {
      expect(COLUMNS.has(key)).toBe(true);
    }
    expect(parsed.data).toEqual({ cancellationReason: 'Devotee unwell' });
  });

  it('maps the refunded variant onto the same column (refundReason has none)', () => {
    const parsed = updateBookingStatusSchema.parse({
      status: 'refunded',
      data: { refundReason: 'Duplicate payment' },
    }) as { data?: Record<string, unknown> };
    expect(parsed.data).toEqual({ cancellationReason: 'Duplicate payment' });
  });

  it('accepts the real column name directly, and stays a no-op when empty', () => {
    const named = updateBookingStatusSchema.parse({
      status: 'cancelled',
      data: { cancellationReason: 'Temple closed' },
    }) as { data?: Record<string, unknown> };
    expect(named.data).toEqual({ cancellationReason: 'Temple closed' });

    const empty = updateBookingStatusSchema.parse({ status: 'cancelled', data: {} }) as {
      data?: Record<string, unknown>;
    };
    // isPureReassignment keys off `hasData`; an empty reason must not look like data.
    expect(Object.keys(empty.data ?? {})).toHaveLength(0);
  });
});

// ─── reschedule date normalisation ─────────────────────────────────────────────
//
// `z.coerce.date()` accepted datetimes and epoch numbers, producing a
// NON-midnight Date. `scheduledDate` is `@db.Date`; the capacity query filters
// on it exactly, so a non-midnight value matched zero rows, passed capacity
// trivially, and wrote a booking every availability reader then missed.

describe('reschedule newDate normalises exactly like the create paths', () => {
  it('rejects the datetime that produced the invisible oversell', () => {
    expect(rescheduleBookingSchema.safeParse({ newDate: '2026-09-15T10:30:00+05:30' }).success).toBe(
      false,
    );
  });

  it('rejects an epoch number', () => {
    expect(rescheduleBookingSchema.safeParse({ newDate: 1789000000000 }).success).toBe(false);
  });

  it('accepts YYYY-MM-DD and converts to UTC midnight, matching the DATE column', () => {
    const parsed = rescheduleBookingSchema.parse({ newDate: '2026-09-15' });
    const asDate = new Date(parsed.newDate);
    expect(asDate.toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });

  it('uses the same shape as the booking-create schema', () => {
    // Both paths must agree on what a date is, or capacity is counted twice.
    for (const bad of ['15-09-2026', '2026/09/15', '2026-9-5', '']) {
      expect(rescheduleBookingSchema.safeParse({ newDate: bad }).success).toBe(false);
    }
  });
});

// ─── money: the split is Decimal all the way down ──────────────────────────────

describe('platform share is computed in Decimal, not JS float', () => {
  it('does not produce the 0.19999999999999996 multiplier', () => {
    const { priestPayout, platformCommission } = splitPujaPrice(new Prisma.Decimal(1100), 0.8);
    // Old code: 1100 * Number((1 - 0.8).toString()) = 219.99999999999996.
    expect(platformCommission.equals(new Prisma.Decimal('220'))).toBe(true);
    expect(priestPayout.equals(new Prisma.Decimal('880'))).toBe(true);
    expect(platformCommission.toString()).not.toContain('1999');
  });

  it('the two sides always sum back to the puja price', () => {
    for (const price of ['1100', '2099.99', '10000', '3499', '0.01']) {
      for (const share of [0.7, 0.8, 0.85, 1]) {
        const p = new Prisma.Decimal(price);
        const { priestPayout, platformCommission } = splitPujaPrice(p, share);
        expect(priestPayout.add(platformCommission).equals(p)).toBe(true);
      }
    }
  });

  it('falls back to the platform default only for an out-of-range rate', () => {
    expect(resolvePriestShare(0.7)).toBe(0.7);
    expect(resolvePriestShare(0.85)).toBe(0.85);
    expect(resolvePriestShare(1)).toBe(1);
    for (const bad of [0, -0.5, 1.5, null, undefined, NaN]) {
      expect(resolvePriestShare(bad as never)).toBe(DEFAULT_PRIEST_SHARE);
    }
  });
});

// ─── /from-offering collected no platform or prasad fee ────────────────────────

describe('from-offering charges the fees it promises to deliver', () => {
  // Mirrors the handler's arithmetic: total = base + platform fee + prasad fee
  // (when requested), and the 80/20 split runs on the BASE only.
  const quote = (base: string, prasad: boolean) => {
    const basePrice = new Prisma.Decimal(base);
    const prasadFee = prasad
      ? new Prisma.Decimal(PRASAD_DELIVERY_FEE_INR)
      : new Prisma.Decimal(0);
    const total = basePrice.add(new Prisma.Decimal(PLATFORM_FEE_INR)).add(prasadFee);
    return { basePrice, total, ...splitPujaPrice(basePrice, DEFAULT_PRIEST_SHARE) };
  };

  it('collects the Rs 150 prasad shipping it used to absorb', () => {
    const withPrasad = quote('1100', true);
    const without = quote('1100', false);
    expect(withPrasad.total.sub(without.total).equals(new Prisma.Decimal(PRASAD_DELIVERY_FEE_INR))).toBe(
      true,
    );
    expect(withPrasad.total.equals(new Prisma.Decimal('1301'))).toBe(true);
  });

  it('collects the platform fee', () => {
    expect(quote('1100', false).total.equals(new Prisma.Decimal('1151'))).toBe(true);
  });

  it('never pays the pandit a share of the fees', () => {
    const q = quote('1100', true);
    // 80% of the PUJA price, not of the fee-inclusive total.
    expect(q.priestPayout.equals(new Prisma.Decimal('880'))).toBe(true);
    expect(q.priestPayout.add(q.platformCommission).equals(q.basePrice)).toBe(true);
    expect(q.priestPayout.lt(q.total.mul(new Prisma.Decimal('0.8')))).toBe(true);
  });
});

// ─── cancel-quote applied the ladder to a fee-inclusive total ──────────────────

describe('the refund ladder applies to the puja price, not the charged total', () => {
  // cancellation.service's own contract: "pujaPriceInr is the base the ladder
  // applies to (excludes platform/prasad fees)". The route passed priceAmount,
  // which on the temple path also carries Rs 51 + Rs 150.
  const scheduledDate = new Date('2026-09-15T00:00:00.000Z');
  const scheduledTimeSlot = '09:00';
  // 09:00 IST on 2026-09-15 is 03:30Z; 30h earlier lands in the 75% tier.
  const now = new Date('2026-09-13T21:30:00.000Z');

  const quoteFor = (pujaPriceInr: number) =>
    cancellationService.computeDevoteeRefund({
      policy: DEFAULT_CANCEL_POLICY,
      scheduledDate,
      scheduledTimeSlot,
      pujaPriceInr,
      totalPaidInr: 1301,
      now,
    });

  it('is in the 75% tier for this fixture', () => {
    expect(quoteFor(1100).refundFraction).toBe(0.75);
  });

  it('quotes 75% of the puja price (Rs 825), not of puja + fees (Rs 975.75)', () => {
    // priestPayout + platformCommission = 1100 is the base the create path wrote.
    expect(quoteFor(1100).refundAmountInr).toBe(825);
    // The old behaviour, kept here so the Rs 150.75 over-refund is unmistakable.
    expect(quoteFor(1301).refundAmountInr).toBe(975.75);
    expect(quoteFor(1301).refundAmountInr - quoteFor(1100).refundAmountInr).toBeCloseTo(150.75, 2);
  });

  it('the base is exactly recoverable from the split the booking stores', () => {
    const priestPayout = new Prisma.Decimal('880');
    const platformCommission = new Prisma.Decimal('220');
    const priceAmount = new Prisma.Decimal('1301'); // puja + Rs 51 + Rs 150
    expect(Number(priestPayout.add(platformCommission))).toBe(1100);
    expect(Number(priceAmount)).not.toBe(1100);
  });
});

// ─── request-refund used hand-rolled, server-local slot math ───────────────────

describe('request-refund measures the 24h window with lib/slot-time', () => {
  const scheduledDate = new Date('2026-09-15T00:00:00.000Z');

  it('resolves an IST slot, not a server-local one (the 5.5h skew)', () => {
    // 18:00 IST = 12:30Z. The old `setHours(18)` on a UTC box produced 18:00Z,
    // 5.5h late — enough to let a devotee open a refund request inside the
    // no-refund window.
    const now = new Date('2026-09-14T12:30:00.000Z'); // exactly 24h before
    expect(hoursUntilSlot(scheduledDate, '18:00', now)).toBeCloseTo(24, 6);
    // The old math would have said 29.5h and let this through.
    expect(hoursUntilSlot(scheduledDate, '18:00', now)).toBeLessThan(29);
  });

  it('still yields a decidable number for an unparseable slot string', () => {
    // `scheduledTimeSlot` is attacker-controlled (POST /from-offering accepts
    // any non-empty string when the offering has no availableSlots). The old
    // code did `Number('anytime')` = NaN, and `Date.now() >= NaN` is ALWAYS
    // false — the 24h guard never fired at all. resolveSlotInstant falls back to
    // the stricter midnight behaviour instead of disabling the guard.
    const now = new Date('2026-09-14T23:00:00.000Z');
    const h = hoursUntilSlot(scheduledDate, 'anytime', now);
    expect(Number.isFinite(h)).toBe(true);
    expect(h < 24).toBe(true); // guard fires
    expect(Number.isNaN(Number('anytime'))).toBe(true); // ...and would not have
  });

  it('writes the marker the refund cron actually queries', () => {
    // A literal '[refund-requested]' here would drift silently the day the
    // constant changes, and refund.service's startsWith would match zero rows.
    expect(`${REFUND_REQUESTED_MARKER} Devotee requested refund`).toMatch(
      /^\[refund-requested\] /,
    );
    expect(REFUND_REQUESTED_MARKER).toBe('[refund-requested]');
  });
});

// ─── unpaid holds must not squat on inventory forever ──────────────────────────

describe('unpaid-hold TTL on capacity/conflict predicates', () => {
  it('keeps a bounded, non-zero hold window', () => {
    expect(UNPAID_HOLD_MINUTES).toBeGreaterThan(0);
    const now = new Date('2026-09-15T12:00:00.000Z');
    expect(unpaidHoldCutoff(now).toISOString()).toBe('2026-09-15T11:30:00.000Z');
  });

  it('still excludes cancelled/refunded — the original predicate is intact', () => {
    const where = activeSlotHoldWhere(new Date('2026-09-15T12:00:00.000Z')) as any;
    expect(where.AND[0].status.notIn).toEqual(['cancelled', 'refunded']);
  });

  it('adds the age bound that stops zero-cost calendar squatting', () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    const where = activeSlotHoldWhere(now) as any;
    // A bare `status: { notIn: [...] }` has no NOT clause at all — that is the
    // shape this replaces, and the shape that let an unpaid row hold a slot
    // forever (there is no expiry job for puja bookings).
    expect(where.AND[1].NOT.status).toBe('pending_payment');
    expect(where.AND[1].NOT.createdAt.lt.getTime()).toBe(unpaidHoldCutoff(now).getTime());
  });
});

// ─── create failures were all flat 400s ────────────────────────────────────────

describe('booking-create failures carry an actionable status', () => {
  // NOTE: these literals are the fixed prefixes booking.service throws today.
  // When those become typed errors, this function becomes `instanceof` branches
  // and these tests move with it.
  it('maps a lost slot race to 409 so the wizard can offer another slot', () => {
    const r = classifyCreateBookingError(
      'No availability for the selected slot. Maximum 5 bookings allowed.',
    );
    expect(r.status).toBe(409);
    expect(r.code).toBe('SLOT_UNAVAILABLE');
  });

  it('maps an off-whitelist slot to 409', () => {
    expect(
      classifyCreateBookingError('Invalid time slot "evening". Available slots: 06:00, 09:00')
        .status,
    ).toBe(409);
  });

  it('gives TEMPLE_NOT_VERIFIED its first emitter in apps/api', () => {
    const r = classifyCreateBookingError('This temple has not been verified yet.');
    expect(r.status).toBe(409);
    expect(r.code).toBe('TEMPLE_NOT_VERIFIED');
  });

  it('maps an inactive offering to 409, and a missing row to 404', () => {
    expect(classifyCreateBookingError('This puja offering is currently inactive.').code).toBe(
      'PUJA_UNAVAILABLE',
    );
    expect(classifyCreateBookingError('Temple puja offering not found.').status).toBe(404);
  });

  it('still answers 400 for a genuinely malformed request', () => {
    const r = classifyCreateBookingError('Cannot book a past date.');
    expect(r.status).toBe(400);
    expect(r.code).toBeUndefined();
    expect(classifyCreateBookingError(undefined).status).toBe(400);
  });
});
