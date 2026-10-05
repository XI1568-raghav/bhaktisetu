import { describe, it, expect } from 'vitest';
import { pujaStartUnlockAt, pujaStartLockedMessage } from './puja-start-window.js';

// 18:00 IST on 15 Oct 2026 is 12:30 UTC.
const day = new Date('2026-10-15');

describe('pujaStartUnlockAt', () => {
  it('unlocks 2 hours before the slot', () => {
    expect(pujaStartUnlockAt(day, '18:00').toISOString()).toBe('2026-10-15T10:30:00.000Z');
  });

  it('falls back to 00:00 IST of the day when the slot cannot be read', () => {
    expect(pujaStartUnlockAt(day, 'whenever').toISOString()).toBe('2026-10-14T18:30:00.000Z');
    expect(pujaStartUnlockAt(day, null).toISOString()).toBe('2026-10-14T18:30:00.000Z');
  });
});

describe('pujaStartLockedMessage', () => {
  it('names when the puja unlocks, in IST', () => {
    const msg = pujaStartLockedMessage(day, '18:00', new Date('2026-10-12T00:00:00Z'));
    expect(msg).toBe('You can start this puja from 4:00 PM IST on 15 Oct 2026, 2 hours before the scheduled time.');
  });

  it('says the day when the slot is unknown', () => {
    const msg = pujaStartLockedMessage(day, null, new Date('2026-10-12T00:00:00Z'));
    expect(msg).toBe('You can start this puja from 12:00 AM IST on 15 Oct 2026, the day it is scheduled.');
  });

  it('is null once the window has opened', () => {
    expect(pujaStartLockedMessage(day, '18:00', new Date('2026-10-15T10:30:00Z'))).toBeNull();
    expect(pujaStartLockedMessage(day, '18:00', new Date('2026-10-16T00:00:00Z'))).toBeNull();
  });
});
