/**
 * Support tickets API client + Zod validators.
 * Backend routes:
 *   GET    /api/v1/support/tickets         (own tickets; ?all=true for admin)
 *   POST   /api/v1/support/tickets
 *   GET    /api/v1/support/tickets/:id
 *   PATCH  /api/v1/support/tickets/:id     (admin: status/priority/assignee)
 *   POST   /api/v1/support/tickets/:id/messages
 */
import { z } from 'zod';
import { API_BASE_URL } from './api-config';
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './support';

// ─── Validators ────────────────────────────────────────────────────────────

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
  assignedTo: z.string().nullable().optional(),
});
export type PatchTicketInput = z.infer<typeof patchTicketSchema>;

// ─── Helpers ───────────────────────────────────────────────────────────────

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const parsed = text ? JSON.parse(text) : null;
      if (parsed && typeof parsed.message === 'string') message = parsed.message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function unwrapTicket(payload: unknown): Ticket {
  if (payload && typeof payload === 'object' && 'ticket' in payload) {
    return (payload as { ticket: Ticket }).ticket;
  }
  return payload as Ticket;
}

function unwrapTickets(payload: unknown): Ticket[] {
  if (Array.isArray(payload)) return payload as Ticket[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.tickets)) return obj.tickets as Ticket[];
    if (Array.isArray(obj.data)) return obj.data as Ticket[];
  }
  return [];
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
  return unwrapTickets(json);
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
  return unwrapTicket(json);
}

export async function createTicket(
  token: string | undefined,
  input: NewTicketInput,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/support/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  const json = await asJson<unknown>(res);
  return unwrapTicket(json);
}

export async function patchTicket(
  token: string | undefined,
  id: string,
  patch: PatchTicketInput,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(patch),
  });
  const json = await asJson<unknown>(res);
  return unwrapTicket(json);
}

export async function postMessage(
  token: string | undefined,
  id: string,
  input: ReplyInput,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  const json = await asJson<unknown>(res);
  return unwrapTicket(json);
}

// Re-export commonly used types so callers don't need two imports.
export type { Ticket, TicketCategory, TicketPriority, TicketStatus };
