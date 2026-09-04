import { describe, it, expect } from 'vitest';
import {
  selectWellnessClasses,
  selectWellnessClass,
  selectMyEnrolments,
  formatClassPrice,
  formatClassWhen,
  formatDuration,
  formatSeats,
  isFull,
  buildInstructorIndex,
  classesByInstructor,
  filterClassesByType,
  availableTypeFilters,
  partitionEnrolments,
  enrolOutcome,
  apiErrorMessage,
  wellnessPaymentUrl,
  isPaidEnrolment,
  type WellnessClass,
} from '../wellness';

/**
 * Pinned to the real payloads of apps/api/src/routes/wellness-sessions.ts.
 *
 * The screens this backs replaced five invented meditation tracks with
 * fabricated play counts, so the assertions that matter most here are the
 * NEGATIVE ones: a missing price must never read as "Free", a missing seat
 * count must never read as "full", and a 201 that carries no enrolment must
 * never read as success.
 */

/** Exactly the shape `publicSession()` emits — Decimal as a string. */
function apiRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    instructorId: 'inst-uuid-1',
    title: 'Morning Hatha',
    description: 'Sixty minutes of classical Hatha.',
    type: 'YOGA',
    scheduledAt: '2026-09-10T01:30:00.000Z',
    durationMinutes: 60,
    capacity: 20,
    priceInr: '1000',
    status: 'SCHEDULED',
    instructorName: 'Aarav Sharma',
    enrolledCount: 4,
    spotsLeft: 16,
    ...over,
  };
}

function vm(over: Partial<WellnessClass> = {}): WellnessClass {
  return {
    id: 'c1',
    title: 'Class',
    durationMinutes: null,
    capacity: null,
    priceInr: null,
    enrolledCount: null,
    spotsLeft: null,
    ...over,
  };
}

describe('selectWellnessClasses — GET /wellness/sessions {data:[…]}', () => {
  it('reads the real payload, Decimal string included', () => {
    const [c] = selectWellnessClasses({ data: [apiRow()] });
    expect(c).toBeDefined();
    expect(c!.priceInr).toBe(1000);
    expect(c!.instructorName).toBe('Aarav Sharma');
    expect(c!.spotsLeft).toBe(16);
    expect(c!.type).toBe('YOGA');
  });

  it('drops rows with no id or no title rather than rendering a blank card', () => {
    const rows = selectWellnessClasses({
      data: [apiRow(), { ...apiRow(), id: undefined }, { ...apiRow(), title: '' }],
    });
    expect(rows).toHaveLength(1);
  });

  it('returns [] — never throws — for the shapes the hook used to declare', () => {
    // @poojly/api-client declares {sessions: […]}; the route answers {data: […]}.
    expect(selectWellnessClasses({ sessions: [apiRow()] })).toEqual([]);
    expect(selectWellnessClasses(null)).toEqual([]);
    expect(selectWellnessClasses(undefined)).toEqual([]);
    expect(selectWellnessClasses('nope')).toEqual([]);
  });

  it('carries the gated roomUrl through the detail selector when the server sent one', () => {
    const withRoom = selectWellnessClass({ data: apiRow({ roomUrl: 'https://meet.example/x' }) });
    expect(withRoom?.roomUrl).toBe('https://meet.example/x');
    // Absent means absent. The client never invents an entitlement.
    expect(selectWellnessClass({ data: apiRow() })?.roomUrl).toBeUndefined();
    expect(selectWellnessClass({ data: null })).toBeNull();
  });
});

describe('money is read, never guessed', () => {
  it('says Free only for a real zero', () => {
    expect(formatClassPrice(0)).toBe('Free');
  });

  it('never says Free when the price could not be read', () => {
    // The whole ticket value separates these two sentences.
    expect(formatClassPrice(null)).toBe('Price unavailable');
    expect(formatClassPrice(null)).not.toContain('Free');
  });

  it('formats rupees in Indian grouping', () => {
    expect(formatClassPrice(1000)).toBe('₹1,000');
    expect(formatClassPrice(26869)).toBe('₹26,869');
  });

  it('an unreadable priceInr stays null instead of collapsing to 0', () => {
    expect(selectWellnessClasses({ data: [apiRow({ priceInr: 'free-ish' })] })[0]!.priceInr).toBeNull();
    expect(selectWellnessClasses({ data: [apiRow({ priceInr: null })] })[0]!.priceInr).toBeNull();
  });
});

describe('seats — the server derives them, this only renders them', () => {
  it('pluralises and reports a full class', () => {
    expect(formatSeats(16)).toBe('16 seats left');
    expect(formatSeats(1)).toBe('1 seat left');
    expect(formatSeats(0)).toBe('Full');
  });

  it('an absent seat count is silent, and never blocks the enrol button', () => {
    expect(formatSeats(null)).toBeNull();
    expect(isFull(vm({ spotsLeft: null }))).toBe(false);
    expect(isFull(vm({ spotsLeft: 0 }))).toBe(true);
    expect(isFull(vm({ spotsLeft: 3 }))).toBe(false);
  });
});

describe('formatters', () => {
  it('never renders an Invalid Date', () => {
    expect(formatClassWhen(undefined)).toBe('Time to be confirmed');
    expect(formatClassWhen('not-a-date')).toBe('Time to be confirmed');
    expect(formatClassWhen('2026-09-10T01:30:00.000Z')).not.toContain('Invalid');
  });

  it('formats duration, and omits it when there is none', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0)).toBeNull();
  });
});

describe('the instructor directory is derived from real supply only', () => {
  const classes = selectWellnessClasses({
    data: [
      apiRow({ id: 'a', instructorId: 'i1', instructorName: 'Aarav Sharma', priceInr: '1000', scheduledAt: '2026-09-10T01:30:00.000Z' }),
      apiRow({ id: 'b', instructorId: 'i1', instructorName: 'Aarav Sharma', priceInr: '400', type: 'PRANAYAMA', scheduledAt: '2026-09-12T01:30:00.000Z' }),
      apiRow({ id: 'c', instructorId: 'i2', instructorName: 'Meera Iyer', priceInr: '0', scheduledAt: '2026-09-11T01:30:00.000Z' }),
      apiRow({ id: 'd', instructorId: 'i3', instructorName: '', scheduledAt: '2026-09-13T01:30:00.000Z' }),
    ],
  });

  it('lists a teacher because they have a real upcoming class', () => {
    const index = buildInstructorIndex(classes);
    expect(index.map((i) => i.name)).toEqual(['Aarav Sharma', 'Meera Iyer']);
    expect(index[0]!.classCount).toBe(2);
    // The cheapest REAL class, not an invented "starting from".
    expect(index[0]!.lowestPriceInr).toBe(400);
    expect(index[0]!.types.sort()).toEqual(['PRANAYAMA', 'YOGA']);
    // Soonest class is the one advertised as next.
    expect(index[0]!.nextAt).toBe('2026-09-10T01:30:00.000Z');
  });

  it('never mints an anonymous profile from a nameless row', () => {
    expect(buildInstructorIndex(classes).some((i) => i.name === '')).toBe(false);
    expect(buildInstructorIndex(classes)).toHaveLength(2);
  });

  it('an empty feed produces an empty directory, not a fixture', () => {
    expect(buildInstructorIndex([])).toEqual([]);
  });

  it('matches one instructor without leaking another timetable', () => {
    expect(classesByInstructor(classes, 'i1').map((c) => c.id)).toEqual(['a', 'b']);
    expect(classesByInstructor(classes, 'i9')).toEqual([]);
    expect(classesByInstructor(classes, '')).toEqual([]);
  });
});

describe('type filter — the honest form of /wellness/yoga|meditation|vipassana', () => {
  const classes = selectWellnessClasses({
    data: [apiRow({ id: 'a', type: 'YOGA' }), apiRow({ id: 'b', type: 'MEDITATION' })],
  });

  it('filters on the API enum', () => {
    expect(filterClassesByType(classes, 'YOGA').map((c) => c.id)).toEqual(['a']);
    expect(filterClassesByType(classes, 'ALL')).toHaveLength(2);
    expect(filterClassesByType(classes, 'VIPASSANA')).toEqual([]);
  });

  it('offers only the filters that have a real class behind them', () => {
    expect(availableTypeFilters(classes)).toEqual(['ALL', 'YOGA', 'MEDITATION']);
    expect(availableTypeFilters([])).toEqual(['ALL']);
  });
});

describe('my classes', () => {
  const payload = {
    data: [
      {
        id: 'e1',
        sessionId: 's1',
        status: 'PAID',
        enrolledAt: '2026-09-01T00:00:00.000Z',
        session: { ...apiRow({ id: 's1', scheduledAt: '2999-01-01T00:00:00.000Z' }), roomUrl: 'https://meet.example/a' },
      },
      {
        id: 'e2',
        sessionId: 's2',
        status: 'PENDING_PAYMENT',
        session: { ...apiRow({ id: 's2', scheduledAt: '2999-01-02T00:00:00.000Z' }), roomUrl: null },
      },
      {
        id: 'e3',
        sessionId: 's3',
        status: 'CANCELLED',
        session: apiRow({ id: 's3', scheduledAt: '2999-01-03T00:00:00.000Z' }),
      },
    ],
  };

  it('reads the enrolments payload including the nested session', () => {
    const rows = selectMyEnrolments(payload);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.session?.title).toBe('Morning Hatha');
    expect(rows[0]!.session?.roomUrl).toBe('https://meet.example/a');
  });

  it('withholds nothing and invents nothing — a null roomUrl stays absent', () => {
    const rows = selectMyEnrolments(payload);
    expect(rows[1]!.session?.roomUrl).toBeUndefined();
  });

  it('only money that landed counts as paid', () => {
    expect(isPaidEnrolment('PAID')).toBe(true);
    expect(isPaidEnrolment('ATTENDED')).toBe(true);
    expect(isPaidEnrolment('PENDING_PAYMENT')).toBe(false);
    expect(isPaidEnrolment('REFUNDED')).toBe(false);
  });

  it('splits upcoming from finished, with cancelled always in the past group', () => {
    const { upcoming, past } = partitionEnrolments(
      selectMyEnrolments(payload),
      new Date('2026-09-05T00:00:00.000Z'),
    );
    expect(upcoming.map((r) => r.id)).toEqual(['e1', 'e2']);
    expect(past.map((r) => r.id)).toEqual(['e3']);
  });

  it('a class whose time has passed moves out of Upcoming', () => {
    const { upcoming, past } = partitionEnrolments(
      selectMyEnrolments(payload),
      new Date('2999-01-04T00:00:00.000Z'),
    );
    expect(upcoming).toEqual([]);
    expect(past).toHaveLength(3);
  });
});

describe('enrolOutcome — success is only ever claimed when the server said so', () => {
  it('a ₹0 class enrols instantly', () => {
    expect(enrolOutcome(201, { data: { enrollmentId: 'e1', free: true, amount: 0 } })).toEqual({
      kind: 'free-enrolled',
      enrollmentId: 'e1',
    });
  });

  it('a paid class holds a seat and requires the payment hand-off', () => {
    expect(
      enrolOutcome(201, {
        data: { enrollmentId: 'e2', razorpayOrderId: 'order_x', amount: 100000, keyId: 'k' },
      }),
    ).toEqual({ kind: 'payment-required', enrollmentId: 'e2' });
  });

  it('a 201 with no enrolment is an error, not a success', () => {
    // There is nothing to have enrolled in, so nothing may be claimed.
    expect(enrolOutcome(201, { data: {} }).kind).toBe('error');
    expect(enrolOutcome(200, null).kind).toBe('error');
  });

  it('surfaces the server sentence for 409 full / cancelled / already enrolled', () => {
    expect(enrolOutcome(409, { error: 'Session is full' })).toEqual({
      kind: 'error',
      message: 'Session is full',
    });
    expect(enrolOutcome(409, { error: 'You are already enrolled' }).kind).toBe('error');
    expect(enrolOutcome(403, { error: 'Forbidden' }).kind).toBe('error');
  });

  it('401 is a sign-in prompt, never a dead end and never a sign-out', () => {
    expect(enrolOutcome(401, { error: 'Unauthorized' })).toEqual({ kind: 'sign-in-required' });
  });

  it('falls back to a readable sentence when the body carries no message', () => {
    expect(apiErrorMessage({}, 500, 'Enrolment failed')).toBe('Enrolment failed (500)');
    expect(apiErrorMessage(null, 502, 'Enrolment failed')).toBe('Enrolment failed (502)');
    expect(apiErrorMessage({ message: 'Down for maintenance' }, 503, 'x')).toBe(
      'Down for maintenance',
    );
  });
});

describe('wellnessPaymentUrl — the money hand-off', () => {
  it('addresses the login page with a redirect back to the class', () => {
    // `redirect` is the only param apps/web/app/auth/login reads; a returnTo or
    // next spelling is silently ignored and dumps the devotee on a dashboard.
    const url = wellnessPaymentUrl('abc-123', 'https://darshya.online');
    expect(url).toBe(
      'https://darshya.online/auth/login?redirect=' +
        encodeURIComponent(
          '/wellness/classes/abc-123?utm_source=mobile-app&utm_medium=wellness-enrolment',
        ),
    );
  });

  it('honours the build origin rather than hardcoding production', () => {
    // A staging build must not create a seat hold on ITS server and then send
    // the devotee to production to pay for it.
    expect(wellnessPaymentUrl('x', 'http://192.168.1.20:3000')).toContain(
      'http://192.168.1.20:3000/auth/login',
    );
    // Trailing slashes never double up.
    expect(wellnessPaymentUrl('x', 'https://darshya.online/')).not.toContain('.online//auth');
  });

  it('escapes an id that would otherwise break out of the query string', () => {
    expect(wellnessPaymentUrl('a b&c=d', 'https://darshya.online')).not.toContain('&c=d');
  });
});
