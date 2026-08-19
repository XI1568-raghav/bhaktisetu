import { describe, it, expect } from 'vitest';
import { astrologyService } from './astrology.service.js';

/**
 * AW-02, residual — the last code path that could still open a consultation
 * with an invented astrologer.
 *
 * `startConsultation(userId, astrologerId, mode, resolved?)` fell back to
 * `ASTROLOGERS.find(a => a.id === astrologerId)` when `resolved` was absent, so
 * a caller passing a fixture id (`astro_001`) started a real session against
 * "Pt. Raghunath Sharma", a person who does not exist.
 *
 * It was unreachable over HTTP — routes/astrology.ts gates POST /consult/start
 * on a UUID and an approved AstrologerProfile before calling in, and always
 * passes `resolved`. That made it a landmine rather than a live defect: the
 * ONLY thing standing between the fixture and a live consultation was one
 * caller remembering to pass a 4th argument. Real supply is now the only input
 * this method accepts.
 */

describe('AW-02 — startConsultation cannot resolve a fixture astrologer', () => {
  const FIXTURE_IDS = ['astro_001', 'astro_002', 'astro_015'];

  it.each(FIXTURE_IDS)('refuses fixture id %s when no real profile was resolved', (id) => {
    const out = astrologyService.startConsultation('user-1', id, 'chat');
    expect(out).toEqual({ error: 'Astrologer not found.' });
  });

  it('never returns a session for a fixture id', () => {
    for (const id of FIXTURE_IDS) {
      const out = astrologyService.startConsultation('user-1', id, 'video');
      expect('id' in out).toBe(false);
    }
  });

  it('still opens a session for a REAL resolved astrologer', () => {
    // The fix must not shut the door on genuine supply — that was the earlier
    // over-correction this endpoint already suffered.
    const out = astrologyService.startConsultation(
      'user-1',
      '71e54617-6963-418e-845f-920f4350505b',
      'chat',
      {
        id: '71e54617-6963-418e-845f-920f4350505b',
        userId: 'astro-user-1',
        name: 'Acharya Vinod Sharma',
        specializations: ['Vedic Astrology'],
        languages: ['hi'],
        experienceYears: 12,
        rating: 4.8,
        consultationCount: 90,
        perMinuteRate: 25,
        isOnline: true,
        isBusy: false,
      } as never,
    );
    expect('error' in out).toBe(false);
    expect((out as { astrologerId: string }).astrologerId).toBe(
      '71e54617-6963-418e-845f-920f4350505b',
    );
  });
});
