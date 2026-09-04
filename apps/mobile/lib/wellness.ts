/**
 * The wellness marketplace's data layer for mobile.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Mobile had ONE wellness screen against a section the website ships eleven
 * pages for, and the one screen was half fiction: five invented meditation
 * tracks ("Om Meditation (Deep Focus)", guide "Swami Vivekanand", 12.4K
 * plays), a "Daily Yoga Challenge — Day 12 of 21" that was the same day 12 for
 * every devotee, and a dosha quiz that apologised in an Alert. None of it came
 * from an endpoint; the play counts and the guides are not people or numbers
 * this platform holds. All of it is deleted, and this module is the honest
 * replacement: every field below is one the API actually returns.
 *
 * THE ENDPOINTS THIS SECTION IS BUILT ON
 * (apps/api/src/routes/wellness-sessions.ts, prefix /api/v1/wellness)
 *
 *   GET  /sessions                     public. Upcoming SCHEDULED + LIVE rows,
 *                                      each already carrying `instructorName`
 *                                      and `spotsLeft` — both SERVER-derived
 *                                      (AW-07) precisely so no client
 *                                      re-implements the seat arithmetic and
 *                                      advertises a seat that /enroll then
 *                                      refuses with 409.
 *   GET  /sessions/:id                 detail. `roomUrl` is attached ONLY for
 *                                      the instructor, an admin, or a PAID
 *                                      enrollee — its presence IS the server's
 *                                      proof of entitlement. The client never
 *                                      decides who may join.
 *   POST /sessions/:id/enroll          auth + role DEVOTEE. 201
 *                                      {enrollmentId, free:true} for a ₹0 class
 *                                      (already PAID), else {enrollmentId,
 *                                      razorpayOrderId, amount, keyId}. 409 for
 *                                      full / cancelled / already enrolled.
 *   GET  /enrollments/mine             auth. The devotee's own enrolments,
 *                                      roomUrl withheld unless money landed.
 *
 * DELIBERATELY NOT USED: GET /api/v1/wellness/instructors and /programs
 * (routes/wellness.ts). Those still serve an eight-person hardcoded fixture
 * with invented ratings, review counts, per-session prices and — worst —
 * certifications ("E-RYT 500", "KPJAYI Authorized"). apps/web decided the same
 * thing for the same reason (see the header of
 * apps/web/app/wellness/instructors/page.tsx): an instructor is listed here
 * because they have a REAL upcoming class, priced at what that class actually
 * costs, and the platform holds no rating, no experience claim and no
 * credential for these people, so this app shows none.
 *
 * Everything here is pure so it can be tested without a device — see
 * lib/__tests__/wellness.test.ts.
 */

import { formatInr } from './api-contracts';

// ─── payload primitives ─────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/**
 * Prisma `Decimal` crosses the wire as a STRING ("1000") and `capacity` as a
 * number. null — never 0 — when the field is missing or unreadable, because a
 * price that renders as "Free" when the server never said so is the money bug
 * this whole module is written to avoid.
 */
function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function arrayAt(payload: unknown, key: string): unknown[] {
  if (!isRecord(payload)) return [];
  const v = payload[key];
  return Array.isArray(v) ? v : [];
}

// ─── classes ────────────────────────────────────────────────────────────────

export interface WellnessClass {
  id: string;
  title: string;
  description?: string;
  /** YOGA | MEDITATION | VIPASSANA | PRANAYAMA | OTHER */
  type?: string;
  scheduledAt?: string;
  durationMinutes: number | null;
  capacity: number | null;
  /** Rupees. Read from the server, never computed. 0 means genuinely free. */
  priceInr: number | null;
  /** SCHEDULED | LIVE | COMPLETED | CANCELLED */
  status?: string;
  instructorId?: string;
  /** Server-joined. Absent when the row has no instructor name on file. */
  instructorName?: string;
  enrolledCount: number | null;
  /** Server-derived seat count. Never recomputed here — see AW-07. */
  spotsLeft: number | null;
  /**
   * Only ever present on GET /sessions/:id, and only when the SERVER decided
   * this caller is entitled to it. Its presence is the entitlement.
   */
  roomUrl?: string;
}

function toClass(s: Record<string, unknown>): WellnessClass | null {
  const id = str(s.id);
  const title = str(s.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    description: str(s.description),
    type: str(s.type),
    scheduledAt: str(s.scheduledAt),
    durationMinutes: num(s.durationMinutes),
    capacity: num(s.capacity),
    priceInr: num(s.priceInr),
    status: str(s.status),
    instructorId: str(s.instructorId),
    instructorName: str(s.instructorName),
    enrolledCount: num(s.enrolledCount),
    spotsLeft: num(s.spotsLeft),
    roomUrl: str(s.roomUrl),
  };
}

/** GET /wellness/sessions -> {data:[…]} */
export function selectWellnessClasses(payload: unknown): WellnessClass[] {
  return arrayAt(payload, 'data')
    .filter(isRecord)
    .map(toClass)
    .filter((c): c is WellnessClass => c !== null);
}

/** GET /wellness/sessions/:id -> {data:{…}} */
export function selectWellnessClass(payload: unknown): WellnessClass | null {
  if (!isRecord(payload)) return null;
  const data = payload.data;
  return isRecord(data) ? toClass(data) : null;
}

// ─── formatting ─────────────────────────────────────────────────────────────

/**
 * The price the server published, and nothing else.
 *
 * `null` is "we could not read a price", which is NOT "Free" — those two
 * sentences differ by the entire ticket value. Only a real 0 says Free.
 */
export function formatClassPrice(priceInr: number | null): string {
  if (priceInr === null) return 'Price unavailable';
  if (priceInr <= 0) return 'Free';
  return formatInr(priceInr);
}

export function formatClassWhen(scheduledAt: string | undefined): string {
  if (!scheduledAt) return 'Time to be confirmed';
  const d = new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return 'Time to be confirmed';
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * The seat sentence, or null when the server did not publish a seat count.
 * "0 left" and "unknown" are different facts and only one of them may block a
 * button.
 */
export function formatSeats(spotsLeft: number | null): string | null {
  if (spotsLeft === null) return null;
  if (spotsLeft <= 0) return 'Full';
  return spotsLeft === 1 ? '1 seat left' : `${spotsLeft} seats left`;
}

/** A class the server has told us has no seats. `null` never blocks. */
export function isFull(c: Pick<WellnessClass, 'spotsLeft'>): boolean {
  return c.spotsLeft !== null && c.spotsLeft <= 0;
}

export function isLive(c: Pick<WellnessClass, 'status'>): boolean {
  return c.status === 'LIVE';
}

// ─── class type filter ──────────────────────────────────────────────────────

/**
 * The `WellnessSessionType` enum, exactly as the API's zod schema declares it
 * (routes/wellness-sessions.ts). The website ships prose landing pages at
 * /wellness/yoga, /wellness/meditation and /wellness/vipassana; none of those
 * three reads an endpoint — they are static editorial. So mobile expresses the
 * same navigation the only way that is backed by data: a filter over the real
 * class feed.
 */
export const WELLNESS_TYPE_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'YOGA', label: 'Yoga' },
  { key: 'MEDITATION', label: 'Meditation' },
  { key: 'VIPASSANA', label: 'Vipassana' },
  { key: 'PRANAYAMA', label: 'Pranayama' },
  { key: 'OTHER', label: 'Other' },
] as const;

export type WellnessTypeFilter = (typeof WELLNESS_TYPE_FILTERS)[number]['key'];

export function filterClassesByType(
  classes: readonly WellnessClass[],
  filter: WellnessTypeFilter,
): WellnessClass[] {
  if (filter === 'ALL') return [...classes];
  return classes.filter((c) => c.type === filter);
}

/** Which filters have at least one real class behind them, plus ALL. */
export function availableTypeFilters(
  classes: readonly WellnessClass[],
): WellnessTypeFilter[] {
  const present = new Set(classes.map((c) => c.type).filter((t): t is string => !!t));
  return WELLNESS_TYPE_FILTERS.filter((f) => f.key === 'ALL' || present.has(f.key)).map(
    (f) => f.key,
  );
}

// ─── instructors, derived from real supply ──────────────────────────────────

export interface WellnessInstructorSummary {
  /** The join key. Falls back to the normalised name for pre-join rows. */
  id: string;
  name: string;
  classCount: number;
  /** The cheapest REAL upcoming class. Never a made-up "starting from". */
  lowestPriceInr: number | null;
  nextTitle: string;
  nextAt?: string;
  /** Distinct class types this person actually has scheduled. */
  types: string[];
}

/** Names cross the wire as typed. Compare on a normalised form, not verbatim. */
export function normalizeInstructorName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The stable identity of the teacher of a class, or null if unidentifiable. */
export function instructorKey(c: WellnessClass): string | null {
  if (c.instructorId) return c.instructorId;
  const name = normalizeInstructorName(c.instructorName ?? '');
  return name.length > 0 ? name : null;
}

function byScheduledAt(a: WellnessClass, b: WellnessClass): number {
  const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  return at - bt;
}

/**
 * The instructor directory — every teacher who has a real upcoming class,
 * and nothing that is not on one of those rows.
 */
export function buildInstructorIndex(
  classes: readonly WellnessClass[],
): WellnessInstructorSummary[] {
  const byKey = new Map<string, WellnessInstructorSummary>();
  for (const c of [...classes].sort(byScheduledAt)) {
    const key = instructorKey(c);
    const name = (c.instructorName ?? '').trim();
    // An unnamed teacher cannot be listed as a person. The class still shows
    // in the catalogue; it just does not mint an anonymous profile.
    if (!key || !name) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        id: key,
        name,
        classCount: 1,
        lowestPriceInr: c.priceInr,
        nextTitle: c.title,
        nextAt: c.scheduledAt,
        types: c.type ? [c.type] : [],
      });
      continue;
    }
    existing.classCount += 1;
    if (c.priceInr !== null && (existing.lowestPriceInr === null || c.priceInr < existing.lowestPriceInr)) {
      existing.lowestPriceInr = c.priceInr;
    }
    if (c.type && !existing.types.includes(c.type)) existing.types.push(c.type);
  }
  return [...byKey.values()].sort(
    (a, b) => b.classCount - a.classCount || a.name.localeCompare(b.name),
  );
}

/** One instructor's real upcoming classes, soonest first. */
export function classesByInstructor(
  classes: readonly WellnessClass[],
  key: string,
): WellnessClass[] {
  const wanted = key.trim();
  if (!wanted) return [];
  const normalised = normalizeInstructorName(wanted);
  return classes
    .filter((c) => {
      const k = instructorKey(c);
      return k === wanted || k === normalised;
    })
    .sort(byScheduledAt);
}

// ─── my enrolments ──────────────────────────────────────────────────────────

export type EnrolmentStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'ATTENDED'
  | 'CANCELLED'
  | 'REFUNDED'
  | string;

export interface WellnessEnrolment {
  id: string;
  sessionId: string;
  status: EnrolmentStatus;
  enrolledAt?: string;
  attendedAt?: string;
  session: WellnessClass | null;
}

/** GET /wellness/enrollments/mine -> {data:[{…, session:{…}}]} */
export function selectMyEnrolments(payload: unknown): WellnessEnrolment[] {
  return arrayAt(payload, 'data')
    .filter(isRecord)
    .map((row): WellnessEnrolment | null => {
      const id = str(row.id);
      const sessionId = str(row.sessionId);
      if (!id || !sessionId) return null;
      return {
        id,
        sessionId,
        status: str(row.status) ?? 'PENDING_PAYMENT',
        enrolledAt: str(row.enrolledAt),
        attendedAt: str(row.attendedAt),
        session: isRecord(row.session) ? toClass(row.session) : null,
      };
    })
    .filter((e): e is WellnessEnrolment => e !== null);
}

export function enrolmentStatusLabel(status: EnrolmentStatus): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'ATTENDED':
      return 'Attended';
    case 'PENDING_PAYMENT':
      return 'Payment pending';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

/** Money actually landed — the only state that earns a join link. */
export function isPaidEnrolment(status: EnrolmentStatus): boolean {
  return status === 'PAID' || status === 'ATTENDED';
}

/**
 * Upcoming first (soonest at the top), then everything that has already
 * happened or was cancelled.
 */
export function partitionEnrolments(
  rows: readonly WellnessEnrolment[],
  now: Date = new Date(),
): { upcoming: WellnessEnrolment[]; past: WellnessEnrolment[] } {
  const upcoming: WellnessEnrolment[] = [];
  const past: WellnessEnrolment[] = [];
  for (const row of rows) {
    const at = row.session?.scheduledAt ? new Date(row.session.scheduledAt).getTime() : NaN;
    const done =
      row.session?.status === 'COMPLETED' ||
      row.session?.status === 'CANCELLED' ||
      row.status === 'CANCELLED' ||
      row.status === 'REFUNDED' ||
      (Number.isFinite(at) && at < now.getTime());
    (done ? past : upcoming).push(row);
  }
  upcoming.sort((a, b) => byScheduledAt(a.session ?? blank(), b.session ?? blank()));
  past.sort((a, b) => byScheduledAt(b.session ?? blank(), a.session ?? blank()));
  return { upcoming, past };
}

function blank(): WellnessClass {
  return {
    id: '',
    title: '',
    durationMinutes: null,
    capacity: null,
    priceInr: null,
    enrolledCount: null,
    spotsLeft: null,
  };
}

// ─── enrolment outcome ──────────────────────────────────────────────────────

export type EnrolOutcome =
  /** ₹0 class. The API already wrote the enrolment as PAID — nothing else to do. */
  | { kind: 'free-enrolled'; enrollmentId: string }
  /**
   * A real Razorpay order exists and the seat is HELD. The app carries no
   * payment SDK, so the card step happens on the website — the same hand-off
   * puja booking makes (lib/booking-flow.ts + puja-book.tsx).
   */
  | { kind: 'payment-required'; enrollmentId: string }
  | { kind: 'sign-in-required' }
  | { kind: 'error'; message: string };

/** Prefer the API's own sentence over a status code the devotee cannot read. */
export function apiErrorMessage(body: unknown, statusCode: number, fallback: string): string {
  if (isRecord(body)) {
    const msg = str(body.error) ?? str(body.message);
    if (msg) return msg;
  }
  return `${fallback} (${statusCode})`;
}

/**
 * Classify POST /sessions/:id/enroll. Pure, so the branch that decides whether
 * a devotee is enrolled or merely holding a seat is testable without a network.
 *
 * Success is NEVER claimed from a status code alone: a 201 that carries no
 * `enrollmentId` is an error, because there is then nothing to have enrolled.
 */
export function enrolOutcome(statusCode: number, body: unknown): EnrolOutcome {
  if (statusCode === 401) return { kind: 'sign-in-required' };
  if (statusCode < 200 || statusCode >= 300) {
    return { kind: 'error', message: apiErrorMessage(body, statusCode, 'Enrolment failed') };
  }
  const data = isRecord(body) && isRecord(body.data) ? body.data : null;
  const enrollmentId = data ? str(data.enrollmentId) : undefined;
  if (!enrollmentId) {
    return { kind: 'error', message: 'Enrolment failed — no enrolment was created.' };
  }
  if (data?.free === true) return { kind: 'free-enrolled', enrollmentId };
  return { kind: 'payment-required', enrollmentId };
}

// ─── payment hand-off ───────────────────────────────────────────────────────

/**
 * Where a held seat gets paid for.
 *
 * Identical reasoning to `resumePaymentUrl` in lib/booking-flow.ts, and the
 * same shape: the app's session lives in expo-secure-store and the browser
 * shares none of it, so the link addresses the login page with a `redirect`
 * back to the class. `redirect` is the ONLY param apps/web/app/auth/login
 * reads; `returnTo`/`next` are silently ignored and dump the devotee on their
 * role dashboard instead.
 *
 * The origin comes from lib/web-origin.ts, never a literal: a build pointed at
 * a staging API must not create a seat hold on ITS server and then send the
 * devotee to production to pay for an enrolment production has never heard of.
 */
export function wellnessPaymentUrl(sessionId: string, webOrigin: string): string {
  const target = `/wellness/classes/${encodeURIComponent(
    sessionId,
  )}?utm_source=mobile-app&utm_medium=wellness-enrolment`;
  return `${webOrigin.replace(/\/+$/, '')}/auth/login?redirect=${encodeURIComponent(target)}`;
}
