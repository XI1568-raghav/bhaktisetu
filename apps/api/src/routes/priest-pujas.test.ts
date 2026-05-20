import { describe, it, expect } from 'vitest';
import { __testing } from './priest.js';

const { priestOfferingCreateSchema, priestOfferingUpdateSchema } = __testing;

// Note on coverage: the route harness in this repo is exclusively
// pure-function/Zod tests — there's no Fastify+Prisma integration test
// scaffolding anywhere in apps/api/src/routes. Wiring one up here would
// (a) require a live DATABASE_URL or a Prisma mock, neither of which
// the rest of the suite uses, and (b) bring in a Supabase admin client
// stub for the auth middleware. Both are out of scope for this layer.
//
// What IS exercised below pins the public contract that ownership and
// state-mutating routes depend on:
//   - 400 boundaries for POST /priest/pujas
//   - The optional-shape contract that PATCH /priest/pujas/:id relies on
// The ownership-check branches (403 when offering.priestId !== caller),
// the public read filter (isVerified+active, isActive offerings), and
// the cascade behaviour of DELETE are guarded by the Prisma schema
// itself (FK ON DELETE CASCADE) and the explicit equality check in
// routes/priest.ts. They're listed in the report so reviewers can
// smoke-test them manually against a live API.

describe('priest puja offering — create payload', () => {
  const valid = {
    name: 'Rudrabhishek',
    deity: 'Shiva',
    basePrice: 2100,
    durationMinutes: 90,
  };

  it('accepts a minimal valid payload', () => {
    expect(priestOfferingCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional description and isActive flag', () => {
    expect(
      priestOfferingCreateSchema.safeParse({
        ...valid,
        description: 'Includes samagri and post-puja prasad.',
        isActive: false,
      }).success
    ).toBe(true);
  });

  it('rejects a name shorter than 2 chars (avoids junk listings)', () => {
    expect(priestOfferingCreateSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });

  it('rejects a name longer than 200 chars (column budget)', () => {
    const long = 'x'.repeat(201);
    expect(priestOfferingCreateSchema.safeParse({ ...valid, name: long }).success).toBe(false);
  });

  it('rejects an empty deity', () => {
    expect(priestOfferingCreateSchema.safeParse({ ...valid, deity: '' }).success).toBe(false);
  });

  it('rejects a negative basePrice (DB stores Decimal(10,2) >= 0)', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, basePrice: -1 }).success
    ).toBe(false);
  });

  it('accepts basePrice of exactly 0 (free seva)', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, basePrice: 0 }).success
    ).toBe(true);
  });

  it('rejects a non-integer durationMinutes', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, durationMinutes: 30.5 }).success
    ).toBe(false);
  });

  it('rejects durationMinutes below 5', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, durationMinutes: 1 }).success
    ).toBe(false);
  });

  it('rejects durationMinutes above 600 (sanity cap)', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, durationMinutes: 601 }).success
    ).toBe(false);
  });

  it('rejects a description exceeding 5000 chars', () => {
    expect(
      priestOfferingCreateSchema.safeParse({
        ...valid,
        description: 'x'.repeat(5001),
      }).success
    ).toBe(false);
  });

  it('rejects missing required field (deity)', () => {
    const { deity: _omit, ...without } = valid;
    void _omit;
    expect(priestOfferingCreateSchema.safeParse(without).success).toBe(false);
  });
});

describe('priest puja offering — update payload (PATCH /priest/pujas/:id)', () => {
  it('accepts an empty patch (no-op PATCH must not 400)', () => {
    expect(priestOfferingUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a single-field patch (toggle pattern)', () => {
    expect(
      priestOfferingUpdateSchema.safeParse({ isActive: false }).success
    ).toBe(true);
  });

  it('still rejects a negative basePrice when patched', () => {
    expect(
      priestOfferingUpdateSchema.safeParse({ basePrice: -10 }).success
    ).toBe(false);
  });

  it('still rejects an out-of-range durationMinutes when patched', () => {
    expect(
      priestOfferingUpdateSchema.safeParse({ durationMinutes: 700 }).success
    ).toBe(false);
  });

  it('still rejects an over-long name when patched', () => {
    expect(
      priestOfferingUpdateSchema.safeParse({ name: 'x'.repeat(201) }).success
    ).toBe(false);
  });

  it('rejects unknown field types (basePrice as string)', () => {
    expect(
      priestOfferingUpdateSchema.safeParse({ basePrice: '2100' }).success
    ).toBe(false);
  });
});

// E7 follow-up: slot-capacity fields land on PriestPujaOffering. These
// pin the Zod contract for POST/PATCH /priest/pujas so the migration
// stays in sync with the route schema.
describe('priest puja offering — slot capacity (E7)', () => {
  const valid = {
    name: 'Mangal Shanti',
    deity: 'Mangal',
    basePrice: 1100,
    durationMinutes: 60,
  };

  it('accepts maxBookingsPerSlot at the default boundary (1)', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, maxBookingsPerSlot: 1 }).success
    ).toBe(true);
  });

  it('accepts maxBookingsPerSlot up to 1000', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, maxBookingsPerSlot: 1000 }).success
    ).toBe(true);
  });

  it('rejects maxBookingsPerSlot of 0 (must serve at least 1 devotee)', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, maxBookingsPerSlot: 0 }).success
    ).toBe(false);
  });

  it('rejects non-integer maxBookingsPerSlot', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, maxBookingsPerSlot: 2.5 }).success
    ).toBe(false);
  });

  it('accepts availableSlots as a list of HH:MM strings', () => {
    expect(
      priestOfferingCreateSchema.safeParse({
        ...valid,
        availableSlots: ['06:00', '09:00', '17:30'],
      }).success
    ).toBe(true);
  });

  it('accepts availableSlots as a list of {time,label} objects', () => {
    expect(
      priestOfferingCreateSchema.safeParse({
        ...valid,
        availableSlots: [
          { time: '06:00', label: 'Morning (6:00 AM)' },
          { time: '17:30', label: 'Evening (5:30 PM)' },
        ],
      }).success
    ).toBe(true);
  });

  it('accepts an empty availableSlots array (priest disables slot enforcement)', () => {
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, availableSlots: [] }).success
    ).toBe(true);
  });

  it('rejects more than 200 slots (sanity cap to keep JSON small)', () => {
    const tooMany = Array.from({ length: 201 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    expect(
      priestOfferingCreateSchema.safeParse({ ...valid, availableSlots: tooMany }).success
    ).toBe(false);
  });

  it('PATCH allows toggling only maxBookingsPerSlot', () => {
    expect(
      priestOfferingUpdateSchema.safeParse({ maxBookingsPerSlot: 3 }).success
    ).toBe(true);
  });

  it('PATCH allows clearing availableSlots via [] (back-compat)', () => {
    expect(
      priestOfferingUpdateSchema.safeParse({ availableSlots: [] }).success
    ).toBe(true);
  });
});
