import { describe, it, expect } from 'vitest';
import { __testing } from './bookings.js';

const {
  checkVideoProofGate,
  checkPriestReassignable,
  priestSlotKey,
  updateBookingStatusSchema,
  normalizePriestSlots,
  evaluatePriestSlot,
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
