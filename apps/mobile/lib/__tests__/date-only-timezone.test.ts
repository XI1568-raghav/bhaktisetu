import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { formatDate } from '../account-api';

// The API sends a puja's date as a Postgres DATE at UTC midnight. A devotee in
// the US (the NRI audience) must still see the booked day, not the day before.
describe('formatDate keeps a date-only value on its own day in any device zone', () => {
  const prev = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
  });
  afterAll(() => {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  });

  it('UTC-midnight scheduledDate renders as the 15th in Los Angeles', () => {
    expect(formatDate('2026-10-15T00:00:00.000Z')).toBe('15 Oct 2026');
    expect(formatDate('2026-10-15')).toBe('15 Oct 2026');
  });

  it('a real instant still renders in the device zone', () => {
    // 03:00Z on the 15th is the evening of the 14th in Los Angeles.
    expect(formatDate('2026-10-15T03:00:00.000Z')).toBe('14 Oct 2026');
  });
});
