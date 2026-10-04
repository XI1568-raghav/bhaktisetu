/**
 * Support tickets API client + Zod validators.
 * Backend routes:
 *   GET    /api/v1/support/tickets         (own tickets; ?all=true for admin)
 *   POST   /api/v1/support/tickets
 *   GET    /api/v1/support/tickets/:id
 *   PATCH  /api/v1/support/tickets/:id         (admin: status/priority/assignee)
 *   POST   /api/v1/support/tickets/:id/resolve (owner: RESOLVED|CLOSED, own ticket)
 *   POST   /api/v1/support/tickets/:id/messages
 *   GET    /api/v1/support/agents              (admin: assignable agents, id + name)
 *
 * WHY THIS FILE TRANSLATES
 * ------------------------
 * Every ticket filed from the website was rejected 400 and the user saw a
 * generic error. This file sent the site's own vocabulary — `category: 'puja'`,
 * `priority: 'low'` — at a route that parses
 * `z.enum(['BOOKING','PAYMENT','ACCOUNT','TECHNICAL','OTHER'])` and
 * `z.enum(['LOW','MEDIUM','HIGH','URGENT'])` (support.ts:413-414). `z.enum`
 * does not coerce case, and 'puja' is not a member in any casing, so the create
 * never reached the database. The identical defect was fixed on mobile first
 * (apps/mobile/lib/account-api.ts); web had it unfixed.
 *
 * Three quieter versions of the same mismatch were in this file too, and
 * `z.object` strips rather than rejects, so they failed SILENTLY:
 *
 *   - PATCH sent `assignedTo` where the route parses `assignedToId`, and
 *     lowercase `status`/`priority` at uppercase enums.
 *   - POST …/messages sent `internal` where the route parses `isInternal`, so
 *     an admin's private note was written as a reply the devotee can read.
 *   - Every response is enveloped `{ data: … }`; `unwrapTicket` only looked for
 *     a `ticket` key, so it returned the envelope. `created.id` was undefined
 *     and the redirect after filing a ticket went to /support/tickets/undefined.
 *
 * So this module is the boundary: the site keeps its eight-category help-centre
 * vocabulary, the wire gets the route's enums, and responses come back
 * normalised into the `Ticket` shape the pages render. The enum members below
 * are copied verbatim from the route and re-read from it by
 * __tests__/support-ticket-wire-contract.test.ts, so a server-side rename fails
 * that test rather than production.
 */
import { z } from 'zod';
import { API_BASE_URL } from './api-config';
import { CATEGORY_MAP } from './support';
import type {
  ApiTicketCategory,
  StoredTicketCategory,
  Ticket,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from './support';
import { UserFacingError, serverErrorText, userFacingMessage } from './friendly-error';

// ─── The route's enums, verbatim ───────────────────────────────────────────

/** apps/api/src/routes/support.ts:413 — verbatim. */
export const API_TICKET_CATEGORIES = [
  'BOOKING',
  'PAYMENT',
  'ACCOUNT',
  'TECHNICAL',
  'OTHER',
] as const;

/** apps/api/src/routes/support.ts:414 — verbatim. */
export const API_TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

/** apps/api/src/routes/support.ts:427 (updateTicketSchema) — verbatim. */
export const API_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

/**
 * `ownerResolutionSchema` in the route — verbatim. The ONLY two statuses the
 * devotee who opened a ticket may set on it, via POST /tickets/:id/resolve.
 * Everything else on this list is queue state and stays admin-only behind
 * PATCH /tickets/:id.
 */
export const API_OWNER_RESOLUTION_STATUSES = ['RESOLVED', 'CLOSED'] as const;

export type ApiTicketPriority = (typeof API_TICKET_PRIORITIES)[number];
export type ApiTicketStatus = (typeof API_TICKET_STATUSES)[number];
export type ApiOwnerResolutionStatus = (typeof API_OWNER_RESOLUTION_STATUSES)[number];

/** The lowercase statuses the ticket owner's own controls may ask for. */
export type OwnerResolution = 'resolved' | 'closed';

// ─── Label → enum value ────────────────────────────────────────────────────
//
// The picker shows "Puja Bookings", "Store Orders", "Live Darshan" and so on;
// what goes on the wire is the enum member, never the label and never the
// site's own id. The map is a total `Record<TicketCategory, …>`, so adding a
// ninth help-centre category is a compile error here until someone decides
// which of the server's five buckets it belongs in.
//
// The mapping is many-to-one and the server cannot store the finer choice, so
// the user's actual selection is preserved as a context line at the top of the
// ticket body (see `composeTicketBody`) — otherwise a support agent reading the
// queue would see "BOOKING" for a puja, a yatra, a store order and an astrology
// consultation alike.

export const CATEGORY_TO_API: Record<TicketCategory, ApiTicketCategory> = {
  puja: 'BOOKING', // "Cancel, reschedule, prasad delivery"
  darshan: 'TECHNICAL', // "Streaming issues, offline temple"
  payments: 'PAYMENT', // "Failed payments, refund status"
  account: 'ACCOUNT', // "Login, password, profile settings"
  store: 'BOOKING', // "Shipping, returns, order status"
  astrology: 'BOOKING', // "Kundli, reports, astrologer chat"
  wellness: 'BOOKING', // "Yoga, meditation, ayurveda"
  yatra: 'BOOKING', // "Pilgrimage tours, bookings"
};

export const PRIORITY_TO_API: Record<TicketPriority, ApiTicketPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'URGENT',
};

export const STATUS_TO_API: Record<TicketStatus, ApiTicketStatus> = {
  open: 'OPEN',
  in_progress: 'IN_PROGRESS',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
};

/** Uppercase → the lowercase values StatusBadge/PriorityBadge index by. */
const PRIORITY_FROM_API: Record<ApiTicketPriority, TicketPriority> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

const STATUS_FROM_API: Record<ApiTicketStatus, TicketStatus> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

// ─── Validators ────────────────────────────────────────────────────────────
//
// These validate the FORM, in the site's vocabulary. `toApiTicketPayload`
// below is what validates against the wire.

export const newTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject is too long'),
  body: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description is too long'),
  category: z.enum([
    'puja',
    'darshan',
    'payments',
    'account',
    'store',
    'astrology',
    'wellness',
    'yatra',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  orderId: z.string().trim().max(100).optional(),
  attachmentName: z.string().trim().max(200).optional(),
});
export type NewTicketInput = z.infer<typeof newTicketSchema>;

export const replySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Reply cannot be empty')
    .max(5000, 'Reply is too long'),
  internal: z.boolean().optional(),
});
export type ReplyInput = z.infer<typeof replySchema>;

export const patchTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  /**
   * The route parses `assignedToId: z.string().uuid().nullable()` — a User id,
   * not a display name (support.ts:429). Sent as `assignedToId` below; passing
   * anything that is not a uuid is a 400 the caller must surface.
   */
  assignedTo: z.string().nullable().optional(),
});
export type PatchTicketInput = z.infer<typeof patchTicketSchema>;

// ─── Wire payloads ─────────────────────────────────────────────────────────

/**
 * The route stores `subject`, `body`, `category` and `priority` and strips
 * everything else. The category the user picked, the order id they typed and
 * the file they named would all vanish, so they are carried in the body — the
 * one field that survives — as a short context block above their own words.
 */
export function composeTicketBody(input: NewTicketInput): string {
  const context = [`Category: ${CATEGORY_MAP[input.category]?.name ?? input.category}`];
  if (input.orderId) context.push(`Order / Booking ID: ${input.orderId}`);
  if (input.attachmentName) context.push(`Attachment named by the user: ${input.attachmentName}`);
  return `${context.join('\n')}\n\n${input.body}`;
}

export interface ApiTicketPayload {
  subject: string;
  body: string;
  category: ApiTicketCategory;
  priority: ApiTicketPriority;
}

/** Form values → the exact object POST /support/tickets parses. */
export function toApiTicketPayload(input: NewTicketInput): ApiTicketPayload {
  return {
    subject: input.subject,
    body: composeTicketBody(input),
    category: CATEGORY_TO_API[input.category],
    priority: PRIORITY_TO_API[input.priority],
  };
}

export interface ApiTicketPatch {
  status?: ApiTicketStatus;
  priority?: ApiTicketPriority;
  assignedToId?: string | null;
}

/** Patch values → the exact object PATCH /support/tickets/:id parses. */
export function toApiTicketPatch(patch: PatchTicketInput): ApiTicketPatch {
  const wire: ApiTicketPatch = {};
  if (patch.status !== undefined) wire.status = STATUS_TO_API[patch.status];
  if (patch.priority !== undefined) wire.priority = PRIORITY_TO_API[patch.priority];
  if (patch.assignedTo !== undefined) wire.assignedToId = patch.assignedTo;
  return wire;
}

export interface ApiOwnerResolutionPayload {
  status: ApiOwnerResolutionStatus;
}

/**
 * Owner "I'm done" values → the exact object POST …/resolve parses. The route's
 * schema has exactly one field; sending `priority` or `assignedToId` here would
 * be stripped by `z.object` and silently do nothing, which is why this returns
 * a one-key object rather than reusing `toApiTicketPatch`.
 */
export function toApiOwnerResolution(status: OwnerResolution): ApiOwnerResolutionPayload {
  return { status: STATUS_TO_API[status] as ApiOwnerResolutionStatus };
}

export interface ApiMessagePayload {
  body: string;
  isInternal: boolean;
}

/** Reply values → the exact object POST …/messages parses. */
export function toApiMessagePayload(input: ReplyInput): ApiMessagePayload {
  return { body: input.body, isInternal: input.internal ?? false };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    // RES-09: the server's own sentence when it wrote one worth reading, else
    // friendly copy for the status; the status rides along for reauth.
    throw new UserFacingError(
      serverErrorText(text, userFacingMessage(new Error(`HTTP ${res.status}`), 'Request failed. Please try again.')),
      res.status,
    );
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

/** `{ data: … }` is the envelope every support route replies with. */
function unwrapData(payload: unknown): unknown {
  const obj = record(payload);
  if ('data' in obj) return obj.data;
  if ('ticket' in obj) return obj.ticket;
  return payload;
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const obj = record(payload);
  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.tickets)) return obj.tickets;
  return [];
}

// ─── Response normalisation ────────────────────────────────────────────────

/**
 * A stored message → the shape MessageBubble renders. `author` is derived from
 * whether the writer owns the ticket, which is the only thing the payload
 * actually tells us; nothing is invented from a name we do not have.
 */
export function toTicketMessage(raw: unknown, ticketOwnerId?: string): TicketMessage {
  const m = record(raw);
  const authorId = str(m.authorId);
  const isOwner = Boolean(authorId && ticketOwnerId && authorId === ticketOwnerId);
  return {
    id: str(m.id) ?? `m-${Date.now()}`,
    author: isOwner ? 'user' : 'agent',
    authorName: isOwner ? 'Devotee' : 'Darshya Support',
    body: str(m.body) ?? '',
    createdAt: str(m.createdAt) ?? new Date().toISOString(),
    internal: m.isInternal === true,
  };
}

/**
 * A stored ticket → the `Ticket` the pages render. Status and priority come
 * back uppercase and are mapped 1:1 to the lowercase values the badges index
 * by (an unmapped value rendered a badge with no colour and no text). Category
 * is left as the server's own value — the eight→five mapping is not reversible
 * and guessing would mislabel the queue — and `ticketCategoryLabel` in
 * lib/support.ts reads both vocabularies.
 */
export function toTicket(raw: unknown): Ticket {
  const t = record(raw);
  const ownerId = str(t.userId);
  const status = STATUS_FROM_API[t.status as ApiTicketStatus];
  const priority = PRIORITY_FROM_API[t.priority as ApiTicketPriority];
  const rawMessages = Array.isArray(t.messages) ? t.messages : [];

  return {
    id: str(t.id) ?? '',
    subject: str(t.subject) ?? '',
    category: (str(t.category) ?? 'OTHER') as StoredTicketCategory,
    priority: priority ?? 'medium',
    status: status ?? 'open',
    createdAt: str(t.createdAt) ?? new Date().toISOString(),
    updatedAt: str(t.updatedAt) ?? str(t.createdAt) ?? new Date().toISOString(),
    // The route returns neither the devotee's name nor their email on a ticket;
    // 'Devotee' is what the API's own notification templates call an unnamed
    // user (support.ts:474), and the email is left blank rather than faked.
    userName: 'Devotee',
    userEmail: '',
    assignedTo: str(t.assignedToId),
    messages: rawMessages.map((m) => toTicketMessage(m, ownerId)),
    // The API keeps no activity log; the sidebar renders only when non-empty.
    activity: [],
  };
}

// ─── API calls ─────────────────────────────────────────────────────────────

export async function listTickets(
  token: string | undefined,
  options: { all?: boolean } = {},
): Promise<Ticket[]> {
  const qs = options.all ? '?all=true' : '';
  const res = await fetch(`${API_BASE_URL}/support/tickets${qs}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  const json = await asJson<unknown>(res);
  return unwrapList(json).map(toTicket);
}

export async function getTicketById(
  token: string | undefined,
  id: string,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${id}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  const json = await asJson<unknown>(res);
  return toTicket(unwrapData(json));
}

export async function createTicket(
  token: string | undefined,
  input: NewTicketInput,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/support/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(toApiTicketPayload(input)),
  });
  const json = await asJson<unknown>(res);
  return toTicket(unwrapData(json));
}

export async function patchTicket(
  token: string | undefined,
  id: string,
  patch: PatchTicketInput,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(toApiTicketPatch(patch)),
  });
  const json = await asJson<unknown>(res);
  return toTicket(unwrapData(json));
}

/**
 * The ticket OWNER closing their own ticket.
 *
 * PATCH /tickets/:id is admin-only — the route answers 403 "Admin role
 * required" to the devotee who opened the ticket — so the "Mark resolved"
 * button on /support/tickets/view was a permission error every time it was
 * pressed. POST …/resolve is the owner's own door: it accepts RESOLVED or
 * CLOSED, checks `ticket.userId === currentUser.id`, and writes nothing but
 * status and resolvedAt.
 */
export async function resolveOwnTicket(
  token: string | undefined,
  id: string,
  status: OwnerResolution = 'resolved',
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(toApiOwnerResolution(status)),
  });
  const json = await asJson<unknown>(res);
  return toTicket(unwrapData(json));
}

/** An assignable support agent: a real admin account, id + display name. */
export interface SupportAgent {
  id: string;
  name: string;
}

/**
 * The assignee picker's options, admin-only.
 *
 * `assignedToId` on the PATCH route parses `z.string().uuid()`. The admin
 * screen used to offer five hardcoded display names and send the chosen NAME,
 * which 400'd on every assignment. These are real User ids from
 * GET /support/agents; anything that is not a uuid never leaves this module.
 */
export async function listSupportAgents(
  token: string | undefined,
): Promise<SupportAgent[]> {
  const res = await fetch(`${API_BASE_URL}/support/agents`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  const json = await asJson<unknown>(res);
  return unwrapList(json)
    .map((raw) => {
      const a = record(raw);
      const id = str(a.id);
      return id ? { id, name: str(a.name) ?? 'Support agent' } : null;
    })
    .filter((a): a is SupportAgent => a !== null);
}

/**
 * Appends a message and returns THE MESSAGE. The route replies
 * `201 { data: message }` (support.ts:600) — it has never returned the ticket,
 * so the callers that did `setTicket(await postMessage(…))` replaced the ticket
 * with a message object and the conversation blanked out on the next render.
 */
export async function postMessage(
  token: string | undefined,
  id: string,
  input: ReplyInput,
  /**
   * Who is writing. The reply came from whoever is holding this session, and
   * the payload cannot say whether that was the devotee or an agent — so the
   * screen that owns the session says, rather than the id being guessed at.
   */
  viewer: { author?: TicketMessage['author']; authorName?: string } = {},
): Promise<TicketMessage> {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(toApiMessagePayload(input)),
  });
  const json = await asJson<unknown>(res);
  return {
    ...toTicketMessage(unwrapData(json)),
    author: viewer.author ?? 'user',
    authorName: viewer.authorName ?? 'You',
    internal: input.internal === true,
  };
}

// Re-export commonly used types so callers don't need two imports.
export type {
  Ticket,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  ApiTicketCategory,
};
