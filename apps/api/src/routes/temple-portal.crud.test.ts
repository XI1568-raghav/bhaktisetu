import { describe, it, expect } from 'vitest';
import { __testing } from './temple-portal.js';

const {
  pujaOfferingCreateSchema,
  pujaOfferingUpdateSchema,
  darshanCreateSchema,
  darshanStatusSchema,
} = __testing;

const validUuid = '00000000-0000-4000-8000-000000000000';

describe('temple-portal puja offering — create payload', () => {
  it('accepts a minimal valid payload', () => {
    expect(
      pujaOfferingCreateSchema.safeParse({ pujaTypeId: validUuid }).success
    ).toBe(true);
  });

  it('accepts NRI override + assigned priest', () => {
    expect(
      pujaOfferingCreateSchema.safeParse({
        pujaTypeId: validUuid,
        nriPrice: 9000,
        assignedPriestId: validUuid,
        priceOverride: 999,
        maxBookingsPerSlot: 10,
        isActive: false,
      }).success
    ).toBe(true);
  });

  it('rejects pujaTypeId that is not a UUID', () => {
    expect(
      pujaOfferingCreateSchema.safeParse({ pujaTypeId: 'not-a-uuid' }).success
    ).toBe(false);
  });

  it('rejects a negative nriPrice', () => {
    expect(
      pujaOfferingCreateSchema.safeParse({ pujaTypeId: validUuid, nriPrice: -1 }).success
    ).toBe(false);
  });

  it('rejects maxBookingsPerSlot below 1', () => {
    expect(
      pujaOfferingCreateSchema.safeParse({
        pujaTypeId: validUuid,
        maxBookingsPerSlot: 0,
      }).success
    ).toBe(false);
  });
});

describe('temple-portal puja offering — update payload', () => {
  it('accepts an empty patch (no-op)', () => {
    expect(pujaOfferingUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts clearing assignedPriestId via null', () => {
    expect(
      pujaOfferingUpdateSchema.safeParse({ assignedPriestId: null }).success
    ).toBe(true);
  });

  it('still rejects negative priceOverride when patched', () => {
    expect(
      pujaOfferingUpdateSchema.safeParse({ priceOverride: -100 }).success
    ).toBe(false);
  });
});

describe('temple-portal darshan — create payload', () => {
  const valid = {
    streamKey: 'sk_live_abc',
    playbackUrl: 'https://stream.example.com/temple.m3u8',
  };

  it('accepts a minimal valid payload', () => {
    expect(darshanCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts title, description, cameraLocation', () => {
    expect(
      darshanCreateSchema.safeParse({
        ...valid,
        title: 'Morning Aarti',
        description: 'Daily 6am stream from the sanctum',
        cameraLocation: 'Garbhagriha',
        streamProvider: 'YOUTUBE',
        youtubeVideoId: 'abc123',
      }).success
    ).toBe(true);
  });

  it('rejects a non-URL playbackUrl', () => {
    expect(
      darshanCreateSchema.safeParse({ ...valid, playbackUrl: 'not-a-url' }).success
    ).toBe(false);
  });

  it('rejects an unknown streamProvider', () => {
    expect(
      darshanCreateSchema.safeParse({ ...valid, streamProvider: 'TIKTOK' }).success
    ).toBe(false);
  });
});

describe('temple-portal darshan status — patch payload', () => {
  it('accepts scheduled', () => {
    expect(darshanStatusSchema.safeParse({ status: 'scheduled' }).success).toBe(true);
  });
  it('accepts live', () => {
    expect(darshanStatusSchema.safeParse({ status: 'live' }).success).toBe(true);
  });
  it('accepts ended', () => {
    expect(darshanStatusSchema.safeParse({ status: 'ended' }).success).toBe(true);
  });
  it('rejects offline (use ended instead)', () => {
    expect(darshanStatusSchema.safeParse({ status: 'offline' }).success).toBe(false);
  });
  it('rejects unknown status', () => {
    expect(darshanStatusSchema.safeParse({ status: 'paused' }).success).toBe(false);
  });
});
