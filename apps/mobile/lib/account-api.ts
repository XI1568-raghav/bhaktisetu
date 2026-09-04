/**
 * The SUPPORT + ACCOUNT data layer: addresses, support tickets, booking detail.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Two of the three screens in this vertical cannot use the `@poojly/api-client`
 * hook that carries their name, because those hooks are typed against
 * `@poojly/shared` validators that DO NOT match the Zod schema the Fastify
 * route actually parses. This is the same class of defect as `useUpdateProfile`
 * (typed `displayName`, route parses `fullName`, `z.object` strips the unknown
 * key, devotee gets a 200 and no rename) — documented in app/(devotee)/
 * profile.tsx, which was already moved onto a raw `api.patch` for that reason.
 *
 * The two divergences this module routes around:
 *
 *   1. ADDRESSES. `useCreateAddress` takes `CreateAddress` from
 *      packages/shared/src/validators/index.ts, whose fields are
 *      `addressLine1` / `addressLine2` / `postalCode` / `country: "IN"`.
 *      apps/api/src/routes/users.ts:29-42 parses `line1` / `line2` /
 *      `pincode` / `country: "India"`. `line1` is `.min(1)` and required, so a
 *      create sent through the hook is stripped to `{}` and rejected 400 — the
 *      failure is at least LOUD here, unlike the profile one, but the hook is
 *      still unusable. Not fixed in packages/api-client from this screen: that
 *      package is shared with apps/web and apps/admin and a field rename there
 *      is its own change.
 *
 *   2. SUPPORT TICKETS. apps/api/src/routes/support.ts:410-415 parses
 *      `category: z.enum(['BOOKING','PAYMENT','ACCOUNT','TECHNICAL','OTHER'])`
 *      and `priority: z.enum(['LOW','MEDIUM','HIGH','URGENT'])`. The mobile
 *      support screen shipped free-text inputs defaulting to `'general'` and
 *      `'normal'`, so EVERY ticket a devotee filed from the phone was rejected
 *      400 by `z.enum` before it reached the database. The constants below are
 *      the route's enums, verbatim, so a picker cannot drift from them again.
 *
 * TIMEOUTS. `lib/api.ts`'s `apiPost` is a bare `fetch` with no AbortController
 * — the infinite-spinner P0 in TASKS.md. The `api` object from
 * `@poojly/api-client` does arm one (client.ts:163-166, 30s default) AND
 * injects the bearer token, so it is the transport here. `withTimeout` is the
 * belt to that pair of braces, for the same reason delete-account.tsx carries
 * one: `fetch`'s abort is not guaranteed to reject on every RN platform build,
 * and a devotee editing an address must never be left holding a spinner.
 *
 * Everything in this file is pure or transport-only and imports no React
 * Native module, so apps/mobile/vitest.config.ts (plain node, no RN transform)
 * can exercise it.
 */

import { api } from '@poojly/api-client';

// ─── shared helpers ──────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Default budget for one account mutation, in ms. */
export const ACCOUNT_REQUEST_TIMEOUT_MS = 20_000;

/**
 * Settle `p` within `ms` no matter what the socket does.
 *
 * Rejects with `DARSHYA_TIMEOUT`, which `failureMessage` turns into the same
 * "nothing was changed" copy as a transport failure — because to the devotee
 * they are the same event and have the same consequence.
 */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('DARSHYA_TIMEOUT')), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/**
 * Human copy for a failed account mutation.
 *
 * Never invents a cause. A timeout and a dead socket are indistinguishable from
 * the app's side, so both say the same true thing: the request did not land.
 */
export function failureMessage(err: unknown, action: string): string {
  const raw = err instanceof Error ? err.message : '';
  if (raw === 'DARSHYA_TIMEOUT' || raw.toLowerCase().includes('abort')) {
    return `${action} timed out. Nothing was changed — check your connection and try again.`;
  }
  if (raw.length > 0) return raw;
  return `${action} failed. Nothing was changed — please try again.`;
}

// ─── addresses ───────────────────────────────────────────────────────────────
//
// GET    /api/v1/users/me/addresses      -> { success, addresses[] }
// POST   /api/v1/users/me/addresses      -> 201 { success, message, address }
// PATCH  /api/v1/users/me/addresses/:id  -> 200 { success, message, address }
// DELETE /api/v1/users/me/addresses/:id  -> 200 { success, message }
//
// All four live in apps/api/src/routes/users.ts under a plugin-level
// `authenticateUser` preHandler; PATCH and DELETE re-verify ownership and 404
// on someone else's row.

const ADDRESSES_PATH = '/api/v1/users/me/addresses';

/** The address body apps/api/src/routes/users.ts:29-40 actually parses. */
export interface AddressInput {
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

/** One saved address as the API returns it. */
export interface SavedAddress {
  id: string;
  label?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  isDefault?: boolean;
  [k: string]: unknown;
}

/**
 * Address labels the app offers. Free text is still accepted by the route
 * (`z.string().min(1).max(50)`), but a picker beats a keyboard for a field
 * whose whole job is to be recognisable in a checkout list.
 */
export const ADDRESS_LABELS = ['home', 'work', 'family', 'other'] as const;

/** Sentence-case an address label for display. `home` -> `Home`. */
export function addressLabelText(label: unknown): string {
  const s = str(label);
  if (!s) return 'Address';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One-line rendering of an address, skipping the parts that are absent. */
export function addressLines(address: SavedAddress): string {
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0)
    .join(', ');
}

export interface AddressFormValues {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export const EMPTY_ADDRESS_FORM: AddressFormValues = {
  label: 'home',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  isDefault: false,
};

/** Prefill the form from a row the devotee tapped Edit on. */
export function addressFormFrom(address: SavedAddress): AddressFormValues {
  return {
    label: str(address.label) ?? 'home',
    line1: str(address.line1) ?? '',
    line2: str(address.line2) ?? '',
    city: str(address.city) ?? '',
    state: str(address.state) ?? '',
    pincode: str(address.pincode) ?? '',
    country: str(address.country) ?? 'India',
    isDefault: address.isDefault === true,
  };
}

/**
 * Client-side mirror of `createAddressSchema` (users.ts:29-40).
 *
 * Deliberately the SAME rules, not looser ones: the pincode regex is
 * `/^\d{4,10}$/` on the server, so a form that lets `SW1A 1AA` through only
 * buys the devotee a round trip and a raw Zod error. Returns the first message
 * or null; the server remains the authority either way.
 */
export function validateAddressForm(values: AddressFormValues): string | null {
  if (values.label.trim().length === 0) return 'Give this address a label, such as Home.';
  if (values.label.trim().length > 50) return 'Label must be 50 characters or fewer.';
  if (values.line1.trim().length === 0) return 'Address line 1 is required.';
  if (values.line1.trim().length > 200) return 'Address line 1 is too long.';
  if (values.line2.trim().length > 200) return 'Address line 2 is too long.';
  if (values.city.trim().length === 0) return 'City is required.';
  if (values.state.trim().length === 0) return 'State is required.';
  if (!/^\d{4,10}$/.test(values.pincode.trim())) {
    return 'Pincode must be 4 to 10 digits, numbers only.';
  }
  if (values.country.trim().length === 0) return 'Country is required.';
  return null;
}

/** Form -> the exact body the route parses. Empty line2 becomes null, not "". */
export function addressPayload(values: AddressFormValues): AddressInput {
  const line2 = values.line2.trim();
  return {
    label: values.label.trim(),
    line1: values.line1.trim(),
    line2: line2.length > 0 ? line2 : null,
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode.trim(),
    country: values.country.trim(),
    isDefault: values.isDefault,
  };
}

/** `{ success, addresses }` -> rows. An unreadable envelope yields []. */
export function selectSavedAddresses(payload: unknown): SavedAddress[] {
  if (!isRecord(payload)) return [];
  const rows = payload.addresses;
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).filter((r) => typeof r.id === 'string') as SavedAddress[];
}

// The READ is `useUserAddresses` from @poojly/api-client — PAR-02 already
// corrected it to read `.addresses`, and its query key is the entry
// app/(devotee)/checkout.tsx shares. Only the writes live here.

export function createAddress(values: AddressFormValues): Promise<unknown> {
  return withTimeout(
    api.post<unknown>(ADDRESSES_PATH, addressPayload(values)),
    ACCOUNT_REQUEST_TIMEOUT_MS,
  );
}

export function updateAddress(id: string, values: AddressFormValues): Promise<unknown> {
  return withTimeout(
    api.patch<unknown>(`${ADDRESSES_PATH}/${encodeURIComponent(id)}`, addressPayload(values)),
    ACCOUNT_REQUEST_TIMEOUT_MS,
  );
}

export function deleteAddress(id: string): Promise<unknown> {
  return withTimeout(
    api.delete<unknown>(`${ADDRESSES_PATH}/${encodeURIComponent(id)}`),
    ACCOUNT_REQUEST_TIMEOUT_MS,
  );
}

// ─── support tickets ─────────────────────────────────────────────────────────
//
// POST /api/v1/support/tickets              -> 201 { data: ticket }
// GET  /api/v1/support/tickets              -> { data: ticket[] }
// GET  /api/v1/support/tickets/:id          -> { data: { ...ticket, messages[] } }
// POST /api/v1/support/tickets/:id/messages -> 201 { data: message }
//
// PATCH /tickets/:id is ADMIN ONLY (support.ts:610-613 returns 403 for anyone
// else), so a devotee cannot close or re-prioritise their own ticket from the
// app. No control is offered for it.

const TICKETS_PATH = '/api/v1/support/tickets';

/** apps/api/src/routes/support.ts:413 — verbatim. */
export const TICKET_CATEGORIES = [
  'BOOKING',
  'PAYMENT',
  'ACCOUNT',
  'TECHNICAL',
  'OTHER',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** apps/api/src/routes/support.ts:414 — verbatim. */
export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  subject?: string;
  body?: string;
  status?: string;
  category?: string;
  priority?: string;
  createdAt?: string;
  resolvedAt?: string | null;
  [k: string]: unknown;
}

export interface SupportTicketMessage {
  id: string;
  body?: string;
  authorId?: string;
  isInternal?: boolean;
  createdAt?: string;
  [k: string]: unknown;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportTicketMessage[];
}

export interface TicketFormValues {
  subject: string;
  body: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export const EMPTY_TICKET_FORM: TicketFormValues = {
  subject: '',
  body: '',
  category: 'OTHER',
  priority: 'MEDIUM',
};

/**
 * Client-side mirror of `createTicketSchema` (support.ts:411-416): subject 3-200,
 * body 1-10000. The enums cannot be wrong because the pickers are built from
 * the constants above.
 */
export function validateTicketForm(values: TicketFormValues): string | null {
  const subject = values.subject.trim();
  const body = values.body.trim();
  if (subject.length < 3) return 'Subject must be at least 3 characters.';
  if (subject.length > 200) return 'Subject must be 200 characters or fewer.';
  if (body.length === 0) return 'Describe what happened so support can help.';
  if (body.length > 10_000) return 'Message is too long — keep it under 10,000 characters.';
  return null;
}

/** Mirror of `ticketMessageSchema` (support.ts:419-422). */
export function validateTicketReply(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) return 'Write a reply before sending.';
  if (trimmed.length > 10_000) return 'Reply is too long — keep it under 10,000 characters.';
  return null;
}

/** `{ data: [...] }` -> rows. An unreadable envelope yields []. */
export function selectTickets(payload: unknown): SupportTicket[] {
  if (!isRecord(payload)) return [];
  const rows = payload.data;
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRecord).filter((r) => typeof r.id === 'string') as SupportTicket[];
}

/**
 * `{ data: { ...ticket, messages } }` -> one ticket, or null.
 *
 * A ticket whose `messages` key is missing gets an EMPTY array, never a
 * fabricated first message — the ticket body is rendered from `body`, which is
 * the field the route stores it in.
 */
export function selectTicketDetail(payload: unknown): SupportTicketDetail | null {
  if (!isRecord(payload)) return null;
  const raw = isRecord(payload.data) ? payload.data : payload;
  if (typeof raw.id !== 'string') return null;
  const messages = Array.isArray(raw.messages)
    ? (raw.messages.filter(isRecord).filter((m) => typeof m.id === 'string') as SupportTicketMessage[])
    : [];
  return { ...(raw as SupportTicket), messages };
}

export function fetchTickets(): Promise<unknown> {
  return withTimeout(api.get<unknown>(TICKETS_PATH), ACCOUNT_REQUEST_TIMEOUT_MS);
}

export function fetchTicket(id: string): Promise<unknown> {
  return withTimeout(
    api.get<unknown>(`${TICKETS_PATH}/${encodeURIComponent(id)}`),
    ACCOUNT_REQUEST_TIMEOUT_MS,
  );
}

export function createTicket(values: TicketFormValues): Promise<unknown> {
  return withTimeout(
    api.post<unknown>(TICKETS_PATH, {
      subject: values.subject.trim(),
      body: values.body.trim(),
      category: values.category,
      priority: values.priority,
    }),
    ACCOUNT_REQUEST_TIMEOUT_MS,
  );
}

export function replyToTicket(id: string, body: string): Promise<unknown> {
  return withTimeout(
    api.post<unknown>(`${TICKETS_PATH}/${encodeURIComponent(id)}/messages`, {
      body: body.trim(),
    }),
    ACCOUNT_REQUEST_TIMEOUT_MS,
  );
}

/** The id of the ticket a create returned, so the screen can open it. */
export function selectCreatedTicketId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const raw = isRecord(payload.data) ? payload.data : payload;
  return typeof raw.id === 'string' ? raw.id : null;
}

// ─── booking detail ──────────────────────────────────────────────────────────
//
// GET /api/v1/bookings/:id -> { booking }
//
// apps/api/src/routes/bookings.ts:1098 behind `authenticateUser`;
// BookingService.getBookingById (booking.service.ts:1477) throws "You are not
// authorized to view this booking." when the row belongs to someone else, so
// ownership is enforced server-side and the screen never has to check.
//
// The include carries temple, pujaType, priest, payments[] and prasadAddress.

export interface BookingPayment {
  id: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  method?: string | null;
  paymentGateway?: string | null;
  refundAmount?: string | number | null;
  createdAt?: string;
  [k: string]: unknown;
}

export interface BookingDetail {
  id: string;
  bookingNumber?: string;
  status?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledTimeSlot?: string;
  totalAmount?: string | number;
  priceAmount?: string | number;
  currency?: string;
  specialInstructions?: string | null;
  devoteeName?: string | null;
  gotra?: string | null;
  nakshatra?: string | null;
  temple?: Record<string, unknown> | null;
  pujaType?: Record<string, unknown> | null;
  priest?: Record<string, unknown> | null;
  payments?: BookingPayment[];
  prasadAddress?: Record<string, unknown> | null;
  createdAt?: string;
  [k: string]: unknown;
}

/** `{ booking }` -> the row, or null. Never a partially invented booking. */
export function selectBookingDetail(payload: unknown): BookingDetail | null {
  if (!isRecord(payload)) return null;
  const raw = isRecord(payload.booking) ? payload.booking : payload;
  if (typeof raw.id !== 'string') return null;
  return raw as BookingDetail;
}

/** Payment rows off a booking detail, newest first as the API orders them. */
export function selectBookingPayments(booking: BookingDetail | null): BookingPayment[] {
  if (booking === null || !Array.isArray(booking.payments)) return [];
  return booking.payments.filter(isRecord).filter((p) => typeof p.id === 'string') as BookingPayment[];
}

export function fetchBooking(id: string): Promise<unknown> {
  return withTimeout(
    api.get<unknown>(`/api/v1/bookings/${encodeURIComponent(id)}`),
    ACCOUNT_REQUEST_TIMEOUT_MS,
  );
}

/** `2026-09-02T00:00:00.000Z` -> `2 Sep 2026`. Unparseable input passes through. */
export function formatDate(value: unknown): string {
  const s = str(value);
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Date + time for a message or activity line. */
export function formatDateTime(value: unknown): string {
  const s = str(value);
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(
    'en-IN',
    { hour: 'numeric', minute: '2-digit' },
  )}`;
}
