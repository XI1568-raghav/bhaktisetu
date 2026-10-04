import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import {
  selectPriestReviews,
  selectPriestRatingSummary,
  formatReviewDate,
} from '../priest-reviews';
import {
  buildAvailabilityPayload,
  countActiveSlots,
  emptyWeek,
  parseStoredAvailability,
  WEEKDAYS,
} from '../astrologer-availability';
import {
  CONSULTATION_FILTERS,
  canCompleteConsultation,
  canJoinConsultation,
  filterConsultations,
  selectAstrologerConsultations,
} from '../astrologer-consultations';
import {
  selectInstructorSessions,
  totalEnrolled,
  upcomingSessions,
} from '../instructor-sessions';
import { countActiveOfferings, selectPriestOfferings } from '../priest-offerings';
import { selectProviderOwnProfile } from '../provider-profile';

/**
 * Provider-portal contract audit — pandit / astrologer / wellness instructor.
 *
 * Every fixture below is transcribed from the reply object of the route handler
 * named above it, including the Decimal-as-string encoding that has caused this
 * class of bug repeatedly. The assertions that matter most are the negative
 * ones: a selector that shrugs and returns `[]` on a 403 or a 500 makes the
 * screen state "you have no bookings / no reviews / no classes" to a provider
 * who was merely refused, and every one of these screens is a person's record
 * of their own work.
 *
 * The source scans at the bottom pin the two fabrications this pass removed and
 * the four dead rails it rewired, because both classes of defect are invisible
 * to a type-checker and were reintroduced once already.
 */

const APP = path.resolve(__dirname, '..', '..', 'app');

/**
 * Source with every comment removed, by the TypeScript compiler itself.
 *
 * The scans below look for literals that must not be RENDERED — a devotee's
 * invented name, a credential nobody holds, a schedule nobody set. Those same
 * literals are quoted verbatim in the doc comments of the files that deleted
 * them, which is the whole point of those comments: the next person to open the
 * file learns what went wrong without going through the history. A plain text
 * scan cannot tell the two apart and would force the record to be erased in
 * order to keep the guard green — trading the durable fix for the greppable
 * one. Stripping comments with the real parser keeps both.
 */
function codeOnly(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: {
      removeComments: true,
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ESNext,
    },
  }).outputText;
}

const read = (rel: string) => codeOnly(readFileSync(path.join(APP, rel), 'utf8'));
const readLib = (rel: string) =>
  codeOnly(readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));

// ─── GET /priest/reviews — apps/api/src/routes/priest.ts:1003-1065 ───────────

const PRIEST_REVIEWS = {
  reviews: [
    {
      id: 'b1b1b1b1-0000-4000-8000-000000000001',
      userId: 'c2c2c2c2-0000-4000-8000-000000000002',
      providerId: 'd3d3d3d3-0000-4000-8000-000000000003',
      providerType: 'PANDIT',
      rating: 4,
      comment: 'Very calm and clear.',
      createdAt: '2026-08-12T09:15:00.000Z',
      source: 'review',
      bookingNumber: null,
      pujaName: null,
    },
    {
      id: 'booking:e4e4e4e4-0000-4000-8000-000000000004',
      userId: 'c2c2c2c2-0000-4000-8000-000000000002',
      providerId: 'd3d3d3d3-0000-4000-8000-000000000003',
      providerType: 'PANDIT',
      rating: 5,
      // A devotee who rated without writing. `null`, not an empty string.
      comment: null,
      createdAt: '2026-08-10T09:15:00.000Z',
      source: 'booking',
      bookingNumber: 'BS-20260810-4KJ2M',
      pujaName: 'Satyanarayan Katha',
    },
  ],
  total: 2,
};

describe('GET /priest/reviews', () => {
  it('maps the real rows, both sources', () => {
    const rows = selectPriestReviews(PRIEST_REVIEWS);
    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows![0]).toMatchObject({ rating: 4, comment: 'Very calm and clear.' });
    expect(rows![1]).toMatchObject({
      rating: 5,
      comment: null,
      pujaName: 'Satyanarayan Katha',
      bookingNumber: 'BS-20260810-4KJ2M',
    });
  });

  it('answers null — not [] — for a 403/500 body, so "no reviews" is never claimed on a failure', () => {
    // routes/priest.ts:1062 error branch, and Fastify's own 500 envelope.
    expect(selectPriestReviews({ error: 'Priest profile not found.' })).toBeNull();
    expect(
      selectPriestReviews({ statusCode: 500, error: 'Internal Server Error', message: 'x' }),
    ).toBeNull();
    expect(selectPriestReviews(null)).toBeNull();
    expect(selectPriestReviews([])).toBeNull();
  });

  it('distinguishes a genuinely empty list from a failure', () => {
    expect(selectPriestReviews({ reviews: [], total: 0 })).toEqual([]);
  });

  it('clamps a nonsense rating rather than rendering six stars', () => {
    const rows = selectPriestReviews({ reviews: [{ id: 'x', rating: 9 }] });
    expect(rows![0]!.rating).toBe(5);
    expect(selectPriestReviews({ reviews: [{ id: 'x', rating: 0 }] })![0]!.rating).toBeNull();
  });

  it('reads the headline average off the dashboard, never off the list', () => {
    // apps/api/src/services/priest.service.ts:205-210 — the `priest` sub-object.
    const summary = selectPriestRatingSummary({
      priest: { id: 'p1', displayName: 'Pandit ji', ratingAvg: 4.6, ratingCount: 37 },
    });
    expect(summary).toEqual({ average: 4.6, count: 37 });
  });

  it('reports an unrated pandit as null, not as 0.0 out of 5', () => {
    // `Priest.ratingAvg` defaults to 0 for a pandit nobody has rated.
    expect(selectPriestRatingSummary({ priest: { ratingAvg: 0, ratingCount: 0 } })).toEqual({
      average: null,
      count: 0,
    });
    expect(selectPriestRatingSummary({ error: 'boom' })).toEqual({ average: null, count: null });
  });

  it('formats a date, and answers null for an unusable one', () => {
    expect(formatReviewDate('2026-08-12T09:15:00.000Z')).toBeTruthy();
    expect(formatReviewDate('not-a-date')).toBeNull();
    expect(formatReviewDate(null)).toBeNull();
  });
});

// ─── PATCH /astrologer-portal/availability — astrologer-portal.ts:327-360 ────

describe('astrologer availability', () => {
  it('starts from an empty week — every slot off', () => {
    const week = emptyWeek();
    expect(week.map((d) => d.day)).toEqual([...WEEKDAYS]);
    expect(countActiveSlots(week)).toBe(0);
  });

  it('reads back what the astrologer stored', () => {
    const stored = {
      weekly: [
        { day: 'Mon', morning: true, afternoon: false, evening: false },
        { day: 'Sat', morning: false, afternoon: false, evening: true },
      ],
      updatedAt: '2026-08-12T09:15:00.000Z',
    };
    const parsed = parseStoredAvailability(stored);
    expect(parsed).not.toBeNull();
    expect(countActiveSlots(parsed!)).toBe(2);
    expect(parsed!.find((d) => d.day === 'Mon')!.morning).toBe(true);
    // A day absent from the blob is OFF, not carried over from a default.
    expect(parsed!.find((d) => d.day === 'Wed')).toEqual({
      day: 'Wed',
      morning: false,
      afternoon: false,
      evening: false,
    });
  });

  it('answers null for an unset or foreign blob so the screen can say which', () => {
    expect(parseStoredAvailability(null)).toBeNull();
    expect(parseStoredAvailability({})).toBeNull();
    expect(parseStoredAvailability({ weekly: [] })).toBeNull();
    // The shape the schema comment sketches, written by some other client.
    expect(parseStoredAvailability({ mon: ['09:00-12:00'], tue: [] })).toBeNull();
  });

  it('builds a full seven-day body — the endpoint REPLACES, it does not merge', () => {
    const body = buildAvailabilityPayload(
      [{ day: 'Fri', morning: true, afternoon: false, evening: false }],
      new Date('2026-08-12T09:15:00.000Z'),
    );
    expect(body.weekly).toHaveLength(7);
    expect(body.weekly.map((d) => d.day)).toEqual([...WEEKDAYS]);
    expect(countActiveSlots(body.weekly)).toBe(1);
    expect(body.updatedAt).toBe('2026-08-12T09:15:00.000Z');
  });

  it('round-trips: what is saved is what parses back', () => {
    const week = emptyWeek().map((d) =>
      d.day === 'Tue' ? { ...d, evening: true } : d,
    );
    expect(parseStoredAvailability(buildAvailabilityPayload(week))).toEqual(week);
  });
});

// ─── GET /consultation/astrologer/mine — consultation.ts:1047-1104 ───────────

const ASTROLOGER_CONSULTATIONS = {
  total: 3,
  limit: 100,
  offset: 0,
  consultations: [
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000001',
      reference: 'CN-20260812-0007',
      userId: 'bbbbbbbb-0000-4000-8000-000000000002',
      astrologerId: 'cccccccc-0000-4000-8000-000000000003',
      astrologerName: 'Acharya ji',
      minutes: 30,
      amountInr: 750,
      currency: 'INR',
      status: 'confirmed',
      roomName: 'darshya-astrologer-acharya-ji-abc',
      jitsiUrl: 'https://meet.jit.si/darshya-astrologer-acharya-ji-abc',
      scheduledAt: '2026-08-14T09:15:00.000Z',
      createdAt: '2026-08-12T09:15:00.000Z',
      paidAt: '2026-08-12T09:16:00.000Z',
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000002',
      reference: 'CN-20260811-0006',
      minutes: 15,
      amountInr: 375,
      status: 'pending_payment',
      roomName: null,
      jitsiUrl: null,
      scheduledAt: null,
      createdAt: '2026-08-11T09:15:00.000Z',
      paidAt: null,
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000003',
      reference: 'CN-20260801-0001',
      minutes: 45,
      amountInr: 1125,
      status: 'completed',
      roomName: 'darshya-astrologer-acharya-ji-xyz',
      jitsiUrl: 'https://meet.jit.si/darshya-astrologer-acharya-ji-xyz',
      scheduledAt: '2026-08-01T09:15:00.000Z',
      createdAt: '2026-08-01T08:15:00.000Z',
      paidAt: '2026-08-01T08:16:00.000Z',
    },
  ],
};

describe('GET /consultation/astrologer/mine', () => {
  it('maps the durable rows', () => {
    const rows = selectAstrologerConsultations(ASTROLOGER_CONSULTATIONS);
    expect(rows).toHaveLength(3);
    expect(rows![0]).toMatchObject({
      reference: 'CN-20260812-0007',
      status: 'confirmed',
      minutes: 30,
      grossPaidInr: 750,
      jitsiUrl: 'https://meet.jit.si/darshya-astrologer-acharya-ji-abc',
    });
  });

  it('answers null on a 400/403 body rather than "no consultations"', () => {
    expect(selectAstrologerConsultations({ error: 'Invalid query' })).toBeNull();
    expect(selectAstrologerConsultations(undefined)).toBeNull();
  });

  it('every filter key is a status this table actually stores', () => {
    // astrologerListSchema, apps/api/src/routes/consultation.ts:135.
    const REAL = ['pending_payment', 'payment_review', 'confirmed', 'completed', 'cancelled'];
    for (const f of CONSULTATION_FILTERS) {
      if (f.statuses === null) continue;
      for (const s of f.statuses) expect(REAL, `filter "${f.key}"`).toContain(s);
    }
    // The value the old screen filtered on, which this table has never stored.
    const all = CONSULTATION_FILTERS.flatMap((f) => f.statuses ?? []);
    expect(all).not.toContain('scheduled');
    expect(all).not.toContain('in_progress');
  });

  it('filters by the real vocabulary', () => {
    const rows = selectAstrologerConsultations(ASTROLOGER_CONSULTATIONS)!;
    expect(filterConsultations(rows, 'confirmed')).toHaveLength(1);
    expect(filterConsultations(rows, 'unpaid')).toHaveLength(1);
    expect(filterConsultations(rows, 'completed')).toHaveLength(1);
    expect(filterConsultations(rows, 'all')).toHaveLength(3);
  });

  it('offers Mark Completed only from `confirmed` — the one edge the server allows', () => {
    // PATCH /consultation/:id/complete: 409 "Cannot complete a {status}
    // consultation." for everything but `confirmed`.
    expect(canCompleteConsultation('confirmed')).toBe(true);
    for (const s of ['pending_payment', 'payment_review', 'completed', 'cancelled']) {
      expect(canCompleteConsultation(s), s).toBe(false);
    }
  });

  it('offers the room only for a paid row that has one', () => {
    expect(canJoinConsultation('confirmed', 'https://meet.jit.si/x')).toBe(true);
    expect(canJoinConsultation('confirmed', null)).toBe(false);
    expect(canJoinConsultation('pending_payment', 'https://meet.jit.si/x')).toBe(false);
    expect(canJoinConsultation('cancelled', 'https://meet.jit.si/x')).toBe(false);
  });
});

// ─── GET /wellness/sessions/mine — wellness-sessions.ts:213-229 ──────────────

const INSTRUCTOR_SESSIONS = {
  data: [
    {
      id: '11111111-0000-4000-8000-000000000001',
      instructorId: '99999999-0000-4000-8000-000000000009',
      title: 'Morning Hatha',
      description: 'Slow flow',
      type: 'YOGA',
      scheduledAt: '2026-09-20T02:30:00.000Z',
      durationMinutes: 60,
      capacity: 20,
      // serializeSession stringifies the Decimal.
      priceInr: '499.00',
      roomUrl: 'https://meet.jit.si/hatha',
      status: 'SCHEDULED',
      enrolled: 7,
    },
    {
      id: '11111111-0000-4000-8000-000000000002',
      instructorId: '99999999-0000-4000-8000-000000000009',
      title: 'Vipassana intro',
      type: 'VIPASSANA',
      scheduledAt: '2026-07-01T02:30:00.000Z',
      durationMinutes: 90,
      capacity: 12,
      priceInr: '0',
      roomUrl: null,
      status: 'COMPLETED',
      enrolled: 12,
    },
  ],
};

describe('GET /wellness/sessions/mine', () => {
  it('keeps roomUrl and enrolled — the two fields the public catalogue drops', () => {
    const rows = selectInstructorSessions(INSTRUCTOR_SESSIONS)!;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: 'Morning Hatha',
      priceInr: 499,
      roomUrl: 'https://meet.jit.si/hatha',
      enrolled: 7,
    });
  });

  it('lists a COMPLETED class — the public catalogue never returns one', () => {
    const rows = selectInstructorSessions(INSTRUCTOR_SESSIONS)!;
    expect(rows.map((r) => r.status)).toContain('COMPLETED');
  });

  it('a free class is ₹0, not "price unknown"', () => {
    const rows = selectInstructorSessions(INSTRUCTOR_SESSIONS)!;
    expect(rows[1]!.priceInr).toBe(0);
  });

  it('answers null on a 403 body rather than "you teach nothing"', () => {
    expect(selectInstructorSessions({ error: 'Forbidden' })).toBeNull();
    expect(selectInstructorSessions({ sessions: [] })).toBeNull();
    expect(selectInstructorSessions({ data: [] })).toEqual([]);
  });

  it('upcoming excludes finished and past classes', () => {
    const rows = selectInstructorSessions(INSTRUCTOR_SESSIONS)!;
    const up = upcomingSessions(rows, Date.parse('2026-08-01T00:00:00.000Z'));
    expect(up.map((r) => r.title)).toEqual(['Morning Hatha']);
  });

  it('sums real enrolments, and answers null when none could be read', () => {
    expect(totalEnrolled(selectInstructorSessions(INSTRUCTOR_SESSIONS)!)).toBe(19);
    expect(totalEnrolled(selectInstructorSessions({ data: [{ id: 'a', title: 'b' }] })!)).toBeNull();
  });
});

// ─── GET /priest/pujas — priest.ts:1112-1124 ────────────────────────────────

const PRIEST_OFFERINGS = {
  offerings: [
    {
      id: '22222222-0000-4000-8000-000000000001',
      priestId: '33333333-0000-4000-8000-000000000003',
      name: 'Griha Pravesh',
      description: null,
      deity: 'Ganesha',
      basePrice: '3499.00',
      durationMinutes: 120,
      isActive: true,
      maxBookingsPerSlot: 1,
      availableSlots: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: '22222222-0000-4000-8000-000000000002',
      priestId: '33333333-0000-4000-8000-000000000003',
      name: 'Satyanarayan Katha',
      deity: 'Vishnu',
      basePrice: '2099.00',
      durationMinutes: 90,
      isActive: false,
      maxBookingsPerSlot: 2,
    },
  ],
};

describe('GET /priest/pujas', () => {
  it('parses the Decimal-as-string base price', () => {
    const rows = selectPriestOfferings(PRIEST_OFFERINGS)!;
    expect(rows[0]!.basePriceInr).toBe(3499);
    expect(rows[1]!.basePriceInr).toBe(2099);
  });

  it('an unparseable price is a dash, never ₹0', () => {
    const rows = selectPriestOfferings({
      offerings: [{ id: 'a', name: 'x', basePrice: 'not-a-number' }],
    })!;
    expect(rows[0]!.basePriceInr).toBeNull();
  });

  it('counts only rows whose isActive is really true', () => {
    const rows = selectPriestOfferings(PRIEST_OFFERINGS)!;
    expect(countActiveOfferings(rows)).toBe(1);
    // A missing flag is not "active".
    expect(
      countActiveOfferings(selectPriestOfferings({ offerings: [{ id: 'a', name: 'x' }] })!),
    ).toBe(0);
  });

  it('answers null on a 400 body', () => {
    expect(selectPriestOfferings({ error: 'Priest profile not found.' })).toBeNull();
  });
});

// ─── the provider's own profile — {astrologer,wellness}-portal /dashboard ────

describe('provider own profile', () => {
  it('reads the astrologer row off their own dashboard', () => {
    const vm = selectProviderOwnProfile(
      {
        profile: {
          id: 'p',
          userId: 'u',
          displayName: 'Acharya ji',
          specialties: ['Vedic', 'Vastu'],
          languages: ['Hindi', 'Maithili'],
          experience: 12,
          rating: 4.4,
          pricePerMinute: '25.00',
          bio: 'Twenty years in Kashi.',
          approved: true,
        },
        stats: {},
      },
      'pricePerMinute',
    );
    expect(vm).toEqual({
      displayName: 'Acharya ji',
      bio: 'Twenty years in Kashi.',
      specialties: ['Vedic', 'Vastu'],
      languages: ['Hindi', 'Maithili'],
      certifications: [],
      experienceYears: 12,
      rating: 4.4,
      priceInr: 25,
      approved: true,
    });
  });

  it('reads the instructor row, including real certifications', () => {
    const vm = selectProviderOwnProfile(
      {
        profile: {
          displayName: 'Meera',
          specialties: ['Hatha'],
          certifications: ['RYT-200'],
          experience: 4,
          rating: 0,
          pricePerSession: '750.00',
          approved: false,
        },
      },
      'pricePerSession',
    );
    expect(vm!.certifications).toEqual(['RYT-200']);
    expect(vm!.priceInr).toBe(750);
    expect(vm!.approved).toBe(false);
    // rating 0 is "not rated yet", not a zero-star score.
    expect(vm!.rating).toBeNull();
  });

  it('answers null when there is no profile row, and never invents fields', () => {
    expect(selectProviderOwnProfile({ profile: null, stats: {} }, 'pricePerMinute')).toBeNull();
    expect(selectProviderOwnProfile({ error: '500' }, 'pricePerSession')).toBeNull();
    const bare = selectProviderOwnProfile({ profile: { displayName: 'X' } }, 'pricePerMinute')!;
    expect(bare.specialties).toEqual([]);
    expect(bare.certifications).toEqual([]);
    expect(bare.priceInr).toBeNull();
  });
});

// ─── source scans: fabrications stay deleted, dead rails stay unwired ────────

describe('no fabricated provider data', () => {
  it('(priest)/reviews.tsx invents no devotee, no testimonial and no rating', () => {
    const src = read('(priest)/reviews.tsx');
    // The three named people and their quotes.
    for (const ghost of ['Anjali S.', 'Ramesh K.', 'Priya M.', 'FALLBACK_REVIEWS']) {
      expect(src, `reviews.tsx must not contain "${ghost}"`).not.toContain(ghost);
    }
    // And no literal star count assigned to a real booking.
    expect(src).not.toMatch(/rating:\s*5\b/);
    expect(src).toContain('usePriestReviews');
  });

  it('(astrologer)/availability.tsx seeds no schedule of its own', () => {
    const src = read('(astrologer)/availability.tsx');
    expect(src).not.toContain('const INITIAL');
    // The signature of the deleted literal: a day name next to `morning: true`.
    expect(src).not.toMatch(/day:\s*'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)'/);
    expect(src).toContain('parseStoredAvailability');
    expect(src).toContain('emptyWeek');
  });

  it('(wellness)/profile.tsx publishes no credential the API did not send', () => {
    const src = read('(wellness)/profile.tsx');
    expect(src).not.toContain('FALLBACK_CERTS');
    expect(src).not.toContain('RYT-500');
    expect(src).not.toContain('FALLBACK_SPECIALIZATIONS');
    expect(src).toContain('selectProviderOwnProfile');
  });
});

describe('provider screens read the durable rail', () => {
  it('the astrologer session list is not the in-memory Map', () => {
    const src = read('(astrologer)/consultations.tsx');
    expect(src).not.toContain('useAstrologyConsultations');
    expect(src).not.toContain('useUpdateConsultation');
    expect(src).not.toContain('useStartConsultationCall');
    expect(src).toContain('useAstrologerConsultations');
  });

  it('the astrologer is not offered a cancellation the server reserves for the devotee', () => {
    // POST /consultation/:id/cancel: `if (row.user_id !== currentUser.id) 403`.
    const src = read('(astrologer)/consultations.tsx');
    expect(src).not.toContain('handleCancel');
    expect(src).not.toMatch(/'CANCELLED'/);
  });

  it('the wellness screens read the instructor-scoped list, not the public catalogue', () => {
    for (const rel of ['(wellness)/sessions.tsx', '(wellness)/dashboard.tsx']) {
      const src = read(rel);
      expect(src, rel).not.toContain('useWellnessSessions');
      expect(src, rel).toContain('useInstructorSessions');
      // The ownership filter whose first clause admitted other instructors' rows.
      expect(src, rel).not.toContain('!s.instructorId');
    }
  });

  it('the pandit services screen shows the pandit’s own offerings and can toggle them', () => {
    const src = read('(priest)/services.tsx');
    expect(src).toContain('usePriestOfferings');
    expect(src).toContain('useTogglePriestOffering');
    // The claim that used to justify deleting the control.
    expect(src).not.toContain('There is no priest-service-toggle endpoint');
  });

  it('the profile screens do not identify the provider by name-matching a public directory', () => {
    for (const rel of ['(astrologer)/profile.tsx', '(wellness)/profile.tsx']) {
      const src = read(rel);
      expect(src, rel).not.toContain('useAstrologers(');
      expect(src, rel).not.toContain('useWellnessInstructors(');
      expect(src, rel).not.toMatch(/\.name === user\?\.fullName/);
      expect(src, rel).toContain('selectProviderOwnProfile');
    }
  });
});

describe("the server's own refusal reason survives", () => {
  /**
   * `packages/api-client`'s error mapper reads `data?.error?.message`
   * (client.ts:210). Every provider route in this audit answers
   * `{ error: "<sentence>" }` — a STRING — so routing one of them through
   * `api.*` replaces the reason with "Request failed with status 400".
   *
   * `POST /payouts/request` is the one that hurts: its 400s are
   * "Complete KYC before requesting a payout." and "No bank account on file.",
   * and three provider roles in this lane show that alert.
   */
  it('the payout request reads the sentence off the body itself', () => {
    // `codeOnly` transpiles, so the `<unknown>` type argument is already gone.
    const src = readLib('portal-queries.ts');
    expect(src).toContain('/api/v1/payouts/request');
    expect(src).not.toMatch(/api\.post\(\s*['"`][^'"`]*\/api\/v1\/payouts\/request/);
    expect(src).toContain('serverSentence');
  });

  it('every mutation in provider-queries surfaces the sentence too', () => {
    const src = readLib('provider-queries.ts');
    expect(src).toContain('serverSentence(payload)');
    // No route in this module may go through the client whose mapper drops it.
    expect(src).not.toMatch(/api\.(get|post|patch|put|delete)/);
  });
});

describe('bodyless transitions never declare a JSON body', () => {
  /**
   * Fastify answers FST_ERR_CTP_EMPTY_JSON_BODY — before the handler runs — to
   * a request that sets `Content-Type: application/json` and sends nothing.
   * Both mutations below are bodyless by design.
   */
  it('the toggle and complete mutations send no Content-Type', () => {
    const src = readLib('provider-queries.ts');
    const bodyless = [
      /toggle-active`, token, \{\s*method: 'PATCH',\s*\}/,
      /\/complete`, token, \{\s*method: 'PATCH',\s*\}/,
    ];
    for (const re of bodyless) {
      expect(src, `bodyless PATCH matching ${re} not found`).toMatch(re);
    }
  });
});
