/**
 * PAR-15 — native puja booking.
 *
 * WHAT WAS THERE
 * --------------
 * Nothing. Both the puja card and the "Book" button called
 * `Linking.openURL('https://darshya.online/pujas/book?slug=…')` and ejected the
 * devotee into the mobile browser. An earlier pass made the control HONEST
 * about that (it read "Book on darshya.online" and announced itself as a link);
 * this pass makes it unnecessary by moving the booking into the app.
 *
 * WHAT THIS MODULE IS
 * -------------------
 * Every piece of the flow that is a decision rather than a pixel: which temple
 * offerings exist for a puja, which slots are still open on a date, whether a
 * form is complete, and exactly what body POST /bookings/book accepts. Pure and
 * dependency-free so the whole flow is testable in Node without a React Native
 * renderer — which matters, because this is the one screen in the app that
 * takes money-shaped input.
 *
 * THE ENDPOINTS, AND WHY THESE AND NOT THE OTHERS
 * ----------------------------------------------
 *   GET  /api/v1/pujas/types/:slug   temple OFFERINGS for this puja
 *   GET  /api/v1/bookings/slots      per-slot remaining capacity for a date
 *   POST /api/v1/bookings/book       creates the PujaBooking
 *
 * The web wizard instead posts /bookings/create-order, which creates the
 * booking AND a Razorpay order in one call. This app cannot follow it: Razorpay
 * checkout needs either the native SDK (`react-native-razorpay`, not a
 * dependency of this app, and adding a native module changes the EAS build) or
 * a WebView checkout with a redirect contract there is no way to test here. And
 * calling /create-order without being able to finish the payment would be worse
 * than the browser hand-off: it commits a `pending_payment` row that holds one
 * of the offering's seats for UNPAID_HOLD_MINUTES (bookings.ts:560-568). That is
 * how the ghost bookings in DB-03 accumulated.
 *
 * So the app creates the booking natively and hands off ONE step — the card
 * form — to the page the web already built for exactly this case:
 * `/bookings/pay?id=<bookingId>`. That page resumes payment for an existing
 * booking and is explicitly documented as never re-posting /create-order, so
 * the hand-off cannot mint a second booking or a second slot hold.
 *
 * The remaining gap is stated plainly on screen rather than papered over.
 */

// ─── shared helpers (kept local: this module must stay dependency-free) ──────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Decimal columns arrive as STRINGS ("1501.00"); numeric ones as numbers. */
function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export class BookingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingInputError';
  }
}

// ─── GET /api/v1/pujas/types/:slug ──────────────────────────────────────────
// The reply is `{...pujaType, pujaType}` (routes/pujas.ts:64) where pujaType is
// the object built in services/puja.service.ts findBySlug:140-181. The booking
// fields live at the ROOT; `temples[]` is the offering list, and each entry's
// `id` is the TemplePujaOffering id — which is what /bookings/slots and
// createBookingSchema.templePujaOfferingId both want. Reading `temples[].id` as
// a Temple id is the single easiest way to get this wrong: the service comment
// at puja.service.ts:122-128 exists because the web made that mistake.

export interface TempleOfferingOption {
  /** TemplePujaOffering.id — NOT the temple id. */
  offeringId: string;
  templeId: string;
  templeName: string;
  city: string | null;
  state: string | null;
  isVerified: boolean;
  /** The offering's own price when it overrides the puja's base price. */
  priceInr: number | null;
  slots: Array<{ time: string; label: string }>;
  maxBookingsPerSlot: number | null;
}

export interface PujaBookingDetail {
  pujaTypeId: string;
  slug: string;
  name: string;
  basePriceInr: number | null;
  nriPriceInr: number | null;
  durationMinutes: number | null;
  description: string | null;
  offerings: TempleOfferingOption[];
}

export function selectPujaBookingDetail(payload: unknown): PujaBookingDetail | null {
  if (!isRecord(payload)) return null;
  const pujaTypeId = str(payload.id);
  const slug = str(payload.slug);
  const name = str(payload.name);
  // A 404 body is {error}. Without an id there is nothing bookable, and a
  // half-populated booking screen is worse than an honest "unavailable".
  if (!pujaTypeId || !slug || !name) return null;

  const offerings = (Array.isArray(payload.temples) ? payload.temples : [])
    .filter(isRecord)
    .map((t): TempleOfferingOption | null => {
      const offeringId = str(t.id) ?? str(t.offeringId);
      const templeId = str(t.templeId);
      if (!offeringId || !templeId) return null;
      // Only ACTIVE offerings are bookable. The service already filters on
      // isActive, but an inactive row reaching the picker would 400 at submit
      // with "This puja is not currently offered" after the devotee filled the
      // whole form.
      if (t.isActive === false) return null;
      const rawSlots = Array.isArray(t.availableSlots) ? t.availableSlots : [];
      return {
        offeringId,
        templeId,
        templeName: str(t.templeName) ?? str(t.name) ?? 'Temple',
        city: str(t.templeCity) ?? str(t.city) ?? null,
        state: str(t.templeState) ?? str(t.state) ?? null,
        isVerified: t.isVerified === true,
        priceInr: num(t.priceOverride),
        slots: rawSlots
          .filter(isRecord)
          .map((s) => ({ time: str(s.time) ?? '', label: str(s.label) ?? str(s.time) ?? '' }))
          .filter((s) => s.time !== ''),
        maxBookingsPerSlot: num(t.maxBookingsPerSlot),
      };
    })
    .filter((o): o is TempleOfferingOption => o !== null);

  return {
    pujaTypeId,
    slug,
    name,
    basePriceInr: num(payload.basePrice),
    nriPriceInr: num(payload.nriPrice),
    durationMinutes: num(payload.durationMinutes),
    description: str(payload.description) ?? null,
    offerings,
  };
}

/** The puja price at this temple: the override, else the base. NOT the total. */
export function offeringPriceInr(
  detail: PujaBookingDetail,
  offering: TempleOfferingOption,
): number | null {
  return offering.priceInr ?? detail.basePriceInr;
}

// ─── what the devotee is actually charged ───────────────────────────────────
/**
 * THE FEE SCHEDULE. The puja price is not the total, and this screen used to
 * say it was.
 *
 * `createBooking` charges the puja price PLUS a flat platform fee, plus a
 * prasad-delivery fee when that is requested:
 *
 *     priceAmount = pujaPrice + PLATFORM_FEE_INR (+ PRASAD_DELIVERY_FEE_INR)
 *     — apps/api/src/services/booking.service.ts
 *
 * and the Razorpay order is minted from `priceAmount`
 * (payment.service.ts:702), so `/bookings/pay` — the page this screen hands
 * off to — renders "Pay ₹1,151" for a ₹1,100 puja. The screen previously
 * printed "Total ₹1,100", which is the CM-03 defect the web wizard was fixed
 * for in 2026-08: an advertised price that grows on the payment sheet.
 *
 * ⚠ THE API IS THE SOURCE OF TRUTH. These two numbers live here only so the
 * app can show what the server will collect. Drift is a mischarge, so
 * `__tests__/booking-fee-disclosure.par15.test.ts` parses the API constants
 * and asserts equality — and asserts equality with the web mirror
 * (apps/web/lib/puja-pricing.ts) too, so the two clients cannot quote
 * different totals for one booking.
 */

/** Flat platform fee added to every puja booking. */
export const PLATFORM_FEE_INR = 51;

/** Added only when the devotee opts into prasad delivery. */
export const PRASAD_DELIVERY_FEE_INR = 150;

export interface PujaPriceBreakdown {
  /** The puja itself. null when no temple is chosen or no price is published. */
  pujaPriceInr: number | null;
  platformFeeInr: number;
  /** 0 unless prasad delivery was requested. */
  prasadFeeInr: number;
  /** What will be collected. null exactly when the puja price is unknown. */
  totalInr: number | null;
}

export function bookingPriceBreakdown(
  detail: PujaBookingDetail | null,
  offering: TempleOfferingOption | null,
  opts: { prasadDeliveryRequested?: boolean } = {},
): PujaPriceBreakdown {
  const pujaPriceInr = detail && offering ? offeringPriceInr(detail, offering) : null;
  const prasadFeeInr = opts.prasadDeliveryRequested ? PRASAD_DELIVERY_FEE_INR : 0;
  // A price of exactly 0 is a real price here and totals to the bare platform
  // fee, because that IS what the server would collect. The web mirror returns
  // 0 for a 0 input instead, and the difference is deliberate: its input is a
  // bare number, so it has to overload 0 to mean "nothing chosen yet". This
  // signature has `null` for that, so 0 can mean zero.
  const known = typeof pujaPriceInr === 'number' && pujaPriceInr >= 0;
  return {
    pujaPriceInr,
    platformFeeInr: PLATFORM_FEE_INR,
    prasadFeeInr,
    totalInr: known ? pujaPriceInr + PLATFORM_FEE_INR + prasadFeeInr : null,
  };
}

// ─── GET /api/v1/bookings/slots?templeId=<offeringId>&date=YYYY-MM-DD ───────
// Reply is {slots:[{time,label,remaining,total}]} — routes/bookings.ts:1856-1869.
// The `templeId` query param name is a legacy misnomer; the handler resolves it
// as an OFFERING id first and only falls back to a Temple id (bookings.ts:1807).

export interface BookableSlot {
  time: string;
  label: string;
  /** Seats left. null when the server did not say — never assumed to be free. */
  remaining: number | null;
  total: number | null;
}

export function selectBookableSlots(payload: unknown): BookableSlot[] {
  if (!isRecord(payload) || !Array.isArray(payload.slots)) return [];
  return payload.slots
    .filter(isRecord)
    .map((s): BookableSlot | null => {
      const time = str(s.time);
      if (!time) return null;
      return {
        time,
        label: str(s.label) ?? time,
        remaining: num(s.remaining),
        total: num(s.total),
      };
    })
    .filter((s): s is BookableSlot => s !== null);
}

/**
 * A slot is bookable only when the server SAYS seats remain. An unknown
 * remaining count is treated as unbookable, not as available: the alternative
 * is letting a devotee fill in a whole form for a slot the create call will
 * reject with "No availability for the selected slot".
 */
export function isSlotBookable(slot: BookableSlot): boolean {
  return slot.remaining !== null && slot.remaining > 0;
}

/**
 * What the availability read actually told us — four outcomes, not one array.
 *
 * The screen used to keep a bare `BookableSlot[]`, so every failure arrived at
 * the renderer indistinguishable from a successful empty answer and was printed
 * as a claim about the temple: "This temple has published no slots for that
 * day. Try another day." A dropped connection is not a fact about the temple,
 * and the advice it comes with is wrong — the next day fails identically.
 *
 *   live        the server answered with per-slot capacity. The real answer.
 *   published   the server resolved nothing ({slots: []} — inactive or
 *               unresolvable offering) but the catalogue lists slots. They are
 *               shown with remaining=null, which isSlotBookable refuses, and
 *               the screen has to say capacity is unknown.
 *   none        the read SUCCEEDED and there is genuinely nothing to book.
 *               The only outcome allowed to make a statement about the temple.
 *   unreadable  the request threw, or returned non-2xx, or returned a body
 *               that is not {slots: [...]}. An error plus a retry — never a
 *               slot grid, never "no slots".
 */
export type SlotAvailabilityKind = 'live' | 'published' | 'none' | 'unreadable';

export interface SlotAvailability {
  kind: SlotAvailabilityKind;
  slots: BookableSlot[];
}

/**
 * `reply` is null exactly when the fetch threw. Passing the raw {ok, body}
 * pair rather than a pre-parsed list is deliberate: `ok` is the only thing that
 * separates "the server said there are no slots" from "the server did not
 * answer", and a caller that has already thrown it away cannot get it back.
 */
export function resolveSlotAvailability(
  reply: { ok: boolean; body: unknown } | null,
  publishedSlots: Array<{ time: string; label: string }>,
): SlotAvailability {
  if (!reply || !reply.ok) return { kind: 'unreadable', slots: [] };
  // A 2xx whose body is not the documented shape is still a read we could not
  // understand. Treating it as "no slots" is the same lie with extra steps.
  if (!isRecord(reply.body) || !Array.isArray(reply.body.slots)) {
    return { kind: 'unreadable', slots: [] };
  }
  const live = selectBookableSlots(reply.body);
  if (live.length > 0) return { kind: 'live', slots: live };
  if (publishedSlots.length > 0) {
    return {
      kind: 'published',
      slots: publishedSlots.map((s) => ({ ...s, remaining: null, total: null })),
    };
  }
  return { kind: 'none', slots: [] };
}

// ─── the form ───────────────────────────────────────────────────────────────

export interface DevoteeEntry {
  name: string;
  gotra?: string;
  nakshatra?: string;
}

export interface BookingFormState {
  pujaTypeId: string;
  offering: TempleOfferingOption | null;
  /** YYYY-MM-DD, local calendar day. */
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  devotees: DevoteeEntry[];
  sankalpDetails?: string;
  specialInstructions?: string;
}

/**
 * The body POST /api/v1/bookings/book accepts, per createBookingSchema
 * (routes/bookings.ts:59-92). Every name here is the ROUTE's, not the shared
 * `CreateBooking` type's — those two disagree, which is the whole reason
 * packages/api-client had to add a translation layer (`toCreateBookingBody`).
 * Notably: `scheduledTimeSlot`, not `scheduledTime`; and `devoteeNames` is an
 * array of OBJECTS, not of strings.
 */
export interface CreateBookingBody {
  templeId: string;
  pujaTypeId: string;
  templePujaOfferingId: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  devoteeNames: Array<{ name: string; gotra?: string; nakshatra?: string }>;
  sankalpDetails?: string;
  specialInstructions?: string;
  prasadDeliveryRequested: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function buildCreateBookingBody(form: BookingFormState): CreateBookingBody {
  if (!form.offering) {
    throw new BookingInputError('Choose the temple where the puja should be performed.');
  }
  if (!form.scheduledDate || !DATE_RE.test(form.scheduledDate)) {
    throw new BookingInputError('Choose a date for the puja.');
  }
  // The route refuses a past date (createBookingSchema:63-74) and the service
  // refuses it again. Catching it here means the devotee is told before they
  // fill in names, not after.
  if (isPastDate(form.scheduledDate)) {
    throw new BookingInputError('That date has passed. Choose today or a later date.');
  }
  if (!form.scheduledTimeSlot) {
    throw new BookingInputError('Choose a time slot.');
  }

  const devotees = form.devotees
    .map((d) => ({
      name: d.name.trim(),
      gotra: d.gotra?.trim() || undefined,
      nakshatra: d.nakshatra?.trim() || undefined,
    }))
    .filter((d) => d.name.length > 0);

  if (devotees.length === 0) {
    throw new BookingInputError(
      'Add at least one name for the sankalp — the puja is performed in these names.',
    );
  }

  return {
    templeId: form.offering.templeId,
    pujaTypeId: form.pujaTypeId,
    templePujaOfferingId: form.offering.offeringId,
    scheduledDate: form.scheduledDate,
    scheduledTimeSlot: form.scheduledTimeSlot,
    devoteeNames: devotees,
    sankalpDetails: form.sankalpDetails?.trim() || undefined,
    specialInstructions: form.specialInstructions?.trim() || undefined,
    // Prasad delivery needs an address the app has no picker for yet. Sending
    // `true` without `prasadDeliveryAddressId` fails the route's
    // `requirePrasadDeliveryAddress` refinement, so it is honestly false.
    prasadDeliveryRequested: false,
  };
}

// ─── the 201 reply, and the errors ──────────────────────────────────────────
// `reply.status(201).send({ booking })` — routes/bookings.ts:886.

export interface CreatedBooking {
  id: string;
  bookingNumber: string | null;
  status: string;
}

export function selectCreatedBooking(payload: unknown): CreatedBooking | null {
  if (!isRecord(payload)) return null;
  const booking = isRecord(payload.booking) ? payload.booking : null;
  if (!booking) return null;
  const id = str(booking.id);
  if (!id) return null;
  return {
    id,
    bookingNumber: str(booking.bookingNumber) ?? null,
    status: str(booking.status) ?? 'pending_payment',
  };
}

/**
 * Pull the real reason out of a booking error body.
 *
 * This route does NOT use the `{error:{code,message}}` envelope the shared API
 * client parses. Its own comment says so (bookings.ts:895-899): `error` stays a
 * STRING so shipping clients can render it directly. The consequence is that
 * `api.post` reads `data?.error?.message`, finds undefined, and reports
 * "Request failed with status 409" — so a devotee who lost a slot race is told
 * a status code instead of the localized "that slot was just taken", which is
 * the one message they can act on.
 *
 * Shapes this handles, all from the same handler:
 *   {error:'Validation Error', details:[{path,message}]}   400, Zod
 *   {error:'<localized>', code:'SLOT_TAKEN', message:'…'}  409, recoverable
 *   {error:'<raw>'}                                        other
 */
export function bookingErrorMessage(body: unknown, statusCode: number): string {
  if (isRecord(body)) {
    const message = str(body.message);
    if (message) return message;
    const zodDetails = Array.isArray(body.details) ? body.details : null;
    if (zodDetails && zodDetails.length > 0) {
      const first = zodDetails.find(isRecord);
      const detail = first ? str(first.message) : undefined;
      if (detail) return detail;
    }
    const error = str(body.error);
    if (error) return error;
  }
  if (statusCode === 401) return 'Sign in to book a puja.';
  return `Could not create the booking (status ${statusCode}).`;
}

/**
 * What the create call actually told us — three outcomes, not two.
 *
 * The screen used to decide with `!res.ok || !booking`, which folds two
 * unrelated events into one sentence:
 *
 *   failed      the server refused (4xx/5xx) or the request never arrived.
 *               Nothing was created. Retrying is the right advice.
 *   uncertain   the server ACCEPTED (2xx) but the body did not parse into a
 *               booking. A `PujaBooking` row now exists at `pending_payment`
 *               holding one of the offering’s seats. Retrying mints a SECOND
 *               row and a SECOND hold for one customer intent — which is
 *               exactly how the ghost bookings in DB-03 accumulated, and the
 *               reason this module refuses to call /create-order at all.
 *   created     the documented 201 `{ booking }`.
 *
 * Under the old shape the uncertain case reached the devotee as “Could not
 * create the booking (status 201)”: a self-contradiction attached to the one
 * instruction that makes the problem worse.
 *
 * `reply` is null exactly when the fetch threw — the request never reached the
 * server, so nothing can have been created and that case IS a failure.
 */
export type CreateBookingOutcome =
  | { kind: 'created'; booking: CreatedBooking }
  | { kind: 'failed'; message: string }
  | { kind: 'uncertain'; message: string };

export function createBookingOutcome(
  reply: { ok: boolean; status: number; body: unknown } | null,
): CreateBookingOutcome {
  if (!reply) {
    return {
      kind: 'failed',
      message: 'Could not reach the server. Your booking was not created.',
    };
  }
  if (!reply.ok) {
    return { kind: 'failed', message: bookingErrorMessage(reply.body, reply.status) };
  }
  const booking = selectCreatedBooking(reply.body);
  if (booking) return { kind: 'created', booking };
  return {
    kind: 'uncertain',
    message:
      'The server accepted the booking but did not describe it. Open My Bookings to check before trying again — a second attempt would hold a second slot.',
  };
}

/**
 * The page that finishes payment for a booking that already exists.
 *
 * NOT /pujas/book — that is the wizard, and sending someone there after the
 * booking is created makes a second booking and a second slot hold. The web
 * page below is built for precisely this case and is documented as never
 * re-posting /create-order (apps/web/app/bookings/pay/page.tsx:20-27). Its
 * query parameter is `id`.
 *
 * `webOrigin` is REQUIRED and carries no default. It used to be the literal
 * `https://darshya.online`, while every API call in the app went through
 * `apiBase()` — so any build not pointed at production created a real booking
 * on ITS server and then opened PRODUCTION to pay for an id that does not
 * exist there, after the slot hold had already been taken. A default here
 * would let the next call site re-introduce that by omission with the type
 * checker silent; lib/web-origin.ts resolves the value.
 *
 * AND IT GOES THROUGH THE LOGIN GATE, DELIBERATELY.
 *
 * `/bookings/pay` is wrapped in <AuthGuard> (pay/page.tsx:445), and AuthGuard
 * redirects an unauthenticated visitor to
 * `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
 * (AuthGuard.tsx:37) — `pathname` ONLY. The `?id=<bookingId>` is dropped, so
 * after signing in the devotee arrives at a payment page with no booking to
 * pay for, while the slot hold their booking took is already running.
 *
 * They will be unauthenticated almost every time: the app keeps its session in
 * expo-secure-store and the website keeps its in
 * localStorage['poojly_session'], and opening a link in the mobile browser
 * shares neither. So the link addresses the login page itself with a redirect
 * that keeps the query string. `safeRedirect` returns a root-relative target
 * verbatim (login/page.tsx:31) and the already-authenticated effect forwards to
 * the same target (login/page.tsx:117-120), so one URL is correct in both
 * states. Repairing AuthGuard to forward `pathname + search` is the root cause
 * and is a web-lane change; this URL keeps working after that lands.
 */
export function resumePaymentUrl(bookingId: string, webOrigin: string): string {
  const target = `/bookings/pay?id=${encodeURIComponent(
    bookingId,
  )}&utm_source=mobile-app&utm_medium=booking-payment`;
  return `${webOrigin.replace(/\/+$/, '')}/auth/login?redirect=${encodeURIComponent(target)}`;
}

// ─── dates ──────────────────────────────────────────────────────────────────

/**
 * YYYY-MM-DD in the LOCAL calendar.
 *
 * `toISOString().slice(0,10)` is wrong here and the error is not cosmetic: for
 * a devotee in IST after 18:30 local it yields YESTERDAY, and the route's
 * past-date refinement (`new Date(`${d}T00:00:00`)` compared to local midnight)
 * then rejects a booking for a day that has not happened yet.
 */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isPastDate(key: string, now: Date = new Date()): boolean {
  if (!DATE_RE.test(key)) return true;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const requested = new Date(`${key}T00:00:00`);
  if (Number.isNaN(requested.getTime())) return true;
  return requested < today;
}

/** The next `count` bookable days, starting today. */
export function upcomingDateKeys(count: number, now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    out.push(toLocalDateKey(d));
  }
  return out;
}
