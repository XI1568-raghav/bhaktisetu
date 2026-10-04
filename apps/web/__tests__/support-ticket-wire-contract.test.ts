import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  API_OWNER_RESOLUTION_STATUSES,
  API_TICKET_CATEGORIES,
  API_TICKET_PRIORITIES,
  API_TICKET_STATUSES,
  CATEGORY_TO_API,
  PRIORITY_TO_API,
  STATUS_TO_API,
  composeTicketBody,
  toApiMessagePayload,
  toApiOwnerResolution,
  toApiTicketPatch,
  toApiTicketPayload,
  toTicket,
  newTicketSchema,
} from '../lib/support-api';
import { PRIORITIES, STATUSES, SUPPORT_CATEGORIES, ticketCategoryLabel } from '../lib/support';

/**
 * Every support ticket filed from the WEBSITE was rejected 400.
 *
 * lib/support-api.ts sent this site's own vocabulary — `category: 'puja'`,
 * `priority: 'low'` — at a route that parses
 * `z.enum(['BOOKING','PAYMENT','ACCOUNT','TECHNICAL','OTHER'])` and
 * `z.enum(['LOW','MEDIUM','HIGH','URGENT'])`. `z.enum` does not coerce case,
 * and 'puja' is not a member in any casing, so the create never reached the
 * database and the user saw a generic error. The same defect was found and
 * fixed on mobile first (apps/mobile/lib/__tests__/account-api.test.ts pins it
 * there); web had it identically and unfixed.
 *
 * The enum members are RE-READ from apps/api/src/routes/support.ts below rather
 * than restated, so renaming one on the server fails this file instead of
 * production. That is the whole point of the test: a shape test that only
 * checked "a category comes out" would have passed against 'puja'.
 *
 * The three silent siblings are pinned too. `z.object` STRIPS unknown keys
 * instead of rejecting them, so each of these returned 200 while quietly
 * dropping the thing the user asked for:
 *
 *   - PATCH sent `assignedTo` at a route parsing `assignedToId`.
 *   - POST …/messages sent `internal` at a route parsing `isInternal` — an
 *     admin's private note was stored as a reply the devotee can read.
 *   - Responses are enveloped `{ data: … }` and the client unwrapped `ticket`,
 *     so `created.id` was undefined after filing a ticket.
 */

const ROUTE = path.resolve(__dirname, '../../../apps/api/src/routes/support.ts');
const routeSrc = readFileSync(ROUTE, 'utf8');

/** Pull the members out of `<field>: z.enum([...])` in the route source. */
function routeEnum(field: string): string[] {
  const literal = new RegExp(`${field}:\\s*z\\.enum\\(\\[([^\\]]+)\\]\\)`).exec(routeSrc)?.[1] ?? '';
  return [...literal.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]!);
}

describe('the route this client talks to still exists as assumed', () => {
  it('reads a real route file with the ticket schemas in it', () => {
    expect(routeSrc).toContain('createTicketSchema');
    expect(routeSrc).toContain('updateTicketSchema');
    expect(routeSrc).toContain('ticketMessageSchema');
  });
});

describe('the enums are the route’s enums, not a restatement', () => {
  it('category', () => {
    const members = routeEnum('category');
    expect(members.length).toBeGreaterThan(0);
    expect([...API_TICKET_CATEGORIES]).toEqual(members);
  });

  it('priority', () => {
    const members = routeEnum('priority');
    expect(members.length).toBeGreaterThan(0);
    expect([...API_TICKET_PRIORITIES]).toEqual(members);
  });

  it('status (PATCH /tickets/:id)', () => {
    const members = routeEnum('status');
    expect(members.length).toBeGreaterThan(0);
    expect([...API_TICKET_STATUSES]).toEqual(members);
  });
});

describe('every value the site can send is a member of the route enum', () => {
  it('every help-centre category maps to one the server accepts', () => {
    expect(SUPPORT_CATEGORIES.length).toBeGreaterThan(0);
    for (const cat of SUPPORT_CATEGORIES) {
      const wire = CATEGORY_TO_API[cat.id];
      expect(wire, `no wire category for '${cat.id}'`).toBeDefined();
      expect(API_TICKET_CATEGORIES).toContain(wire);
    }
    // The map is total: no help-centre category may be added without deciding
    // which of the server's buckets it belongs in.
    expect(Object.keys(CATEGORY_TO_API).sort()).toEqual(
      SUPPORT_CATEGORIES.map((c) => c.id).sort(),
    );
  });

  it('every priority the picker offers maps to one the server accepts', () => {
    for (const p of PRIORITIES) {
      expect(API_TICKET_PRIORITIES).toContain(PRIORITY_TO_API[p.id]);
    }
    expect(Object.keys(PRIORITY_TO_API).sort()).toEqual(PRIORITIES.map((p) => p.id).sort());
  });

  it('every status an admin can set maps to one the server accepts', () => {
    for (const s of STATUSES) {
      expect(API_TICKET_STATUSES).toContain(STATUS_TO_API[s.id]);
    }
    expect(Object.keys(STATUS_TO_API).sort()).toEqual(STATUSES.map((s) => s.id).sort());
  });
});

describe('the create payload is the body POST /support/tickets parses', () => {
  const form = newTicketSchema.parse({
    subject: 'Prasad never arrived',
    body: 'The puja was performed on the 4th and the prasad has not reached me yet.',
    category: 'puja',
    priority: 'low',
    orderId: 'BS-20260418-A91B2',
    attachmentName: 'receipt.png',
  });

  it('sends the enum member, never the site id and never the label', () => {
    const wire = toApiTicketPayload(form);
    expect(wire.category).toBe('BOOKING');
    expect(wire.priority).toBe('LOW');
    // The exact values that used to 400.
    expect(wire.category).not.toBe('puja');
    expect(wire.priority).not.toBe('low');
    expect(wire.category).not.toBe('Puja Bookings');
    expect(API_TICKET_CATEGORIES).toContain(wire.category);
    expect(API_TICKET_PRIORITIES).toContain(wire.priority);
  });

  it('sends only the four keys the route stores', () => {
    expect(Object.keys(toApiTicketPayload(form)).sort()).toEqual(
      ['body', 'category', 'priority', 'subject'],
    );
  });

  it('carries the picked category, order id and file name into the body, which the route does keep', () => {
    // `orderId` and `attachmentName` are not fields on createTicketSchema, so
    // `z.object` strips them: the order number a devotee types was never
    // reaching a support agent, and eight categories collapse to five on the
    // wire.
    const body = composeTicketBody(form);
    expect(body).toContain('Category: Puja Bookings');
    expect(body).toContain('Order / Booking ID: BS-20260418-A91B2');
    expect(body).toContain('receipt.png');
    expect(body).toContain(form.body);
    expect(routeSrc).not.toMatch(/orderId:\s*z\./);
    expect(routeSrc).not.toMatch(/attachmentName:\s*z\./);
  });

  it('stays inside the route’s 10000-character body limit', () => {
    const long = newTicketSchema.parse({ ...form, body: 'x'.repeat(5000) });
    expect(composeTicketBody(long).length).toBeLessThanOrEqual(10000);
  });
});

describe('the patch and message payloads use the keys the route parses', () => {
  it('patch sends assignedToId, not assignedTo, and uppercase enums', () => {
    const wire = toApiTicketPatch({
      status: 'in_progress',
      priority: 'urgent',
      assignedTo: null,
    });
    expect(wire).toEqual({ status: 'IN_PROGRESS', priority: 'URGENT', assignedToId: null });
    expect(Object.keys(wire)).not.toContain('assignedTo');
    expect(routeSrc).toContain('assignedToId');
  });

  it('patch omits what was not asked for rather than sending undefined', () => {
    expect(toApiTicketPatch({ status: 'resolved' })).toEqual({ status: 'RESOLVED' });
  });

  it('a private note goes out as isInternal, the key the route reads', () => {
    const wire = toApiMessagePayload({ body: 'Refund approved by finance.', internal: true });
    expect(wire).toEqual({ body: 'Refund approved by finance.', isInternal: true });
    expect(Object.keys(wire)).not.toContain('internal');
    expect(routeSrc).toContain('isInternal');
  });

  it('a devotee reply is not marked internal', () => {
    expect(toApiMessagePayload({ body: 'Any update?' }).isInternal).toBe(false);
  });
});

describe('responses are unwrapped and normalised back into what the pages render', () => {
  const stored = {
    id: '8f4a2c1e-0000-4000-8000-000000000001',
    ticketNumber: 'ST-20260904-AB12',
    userId: 'user-1',
    subject: 'Prasad never arrived',
    body: 'Category: Puja Bookings\n\nThe puja was performed on the 4th.',
    status: 'IN_PROGRESS',
    category: 'BOOKING',
    priority: 'HIGH',
    createdAt: '2026-09-04T06:00:00.000Z',
    updatedAt: '2026-09-04T07:00:00.000Z',
    assignedToId: null,
    messages: [
      { id: 'm1', authorId: 'user-1', body: 'Any update?', isInternal: false, createdAt: '2026-09-04T06:05:00.000Z' },
      { id: 'm2', authorId: 'admin-9', body: 'Chasing the courier.', isInternal: false, createdAt: '2026-09-04T06:40:00.000Z' },
      { id: 'm3', authorId: 'admin-9', body: 'Refund pre-approved.', isInternal: true, createdAt: '2026-09-04T06:41:00.000Z' },
    ],
  };

  it('reads the { data: … } envelope — an undefined id is how the redirect broke', () => {
    const ticket = toTicket(stored);
    expect(ticket.id).toBe(stored.id);
    expect(ticket.id).not.toBe('undefined');
  });

  it('maps status and priority back to the values the badges index by', () => {
    const ticket = toTicket(stored);
    // STATUS_CLASS / PRIORITY_CLASS in components/support/badges.tsx are keyed
    // lowercase; an uppercase value rendered a badge with no colour and no text.
    expect(ticket.status).toBe('in_progress');
    expect(ticket.priority).toBe('high');
  });

  it('always yields the arrays the detail page iterates', () => {
    // `ticket.messages.filter(...)` on an unwrapped envelope threw and blanked
    // the whole page.
    const bare = toTicket({ id: 'x', status: 'OPEN', priority: 'LOW', category: 'OTHER' });
    expect(Array.isArray(bare.messages)).toBe(true);
    expect(Array.isArray(bare.activity)).toBe(true);
  });

  it('marks the ticket owner’s messages as theirs and keeps internal notes flagged', () => {
    const ticket = toTicket(stored);
    expect(ticket.messages.map((m) => m.author)).toEqual(['user', 'agent', 'agent']);
    expect(ticket.messages.map((m) => m.internal)).toEqual([false, false, true]);
  });

  it('a server category renders as a label, never as a raw enum member', () => {
    const ticket = toTicket(stored);
    expect(ticket.category).toBe('BOOKING');
    expect(ticketCategoryLabel(ticket.category)).toBe('Booking');
    for (const member of API_TICKET_CATEGORIES) {
      expect(ticketCategoryLabel(member)).not.toBe(member);
    }
    // The site's own vocabulary still reads through the same helper.
    expect(ticketCategoryLabel('puja')).toBe('Puja Bookings');
  });
});

/**
 * The devotee's own controls used to be a guaranteed 403.
 *
 * /support/tickets/view rendered "Mark resolved", "Reopen" and "Escalate" and
 * pointed all three at PATCH /tickets/:id — the ADMIN route. The reporter of a
 * ticket pressed a button on their own ticket and got "Admin role required".
 *
 * The fix is a second, narrower route rather than a looser guard on the admin
 * one: POST /tickets/:id/resolve, owner-only, RESOLVED or CLOSED. Reopen and
 * Escalate are gone because status OPEN and priority are queue state the owner
 * route does not accept — a control that cannot work is worse than no control.
 */
const DEVOTEE_VIEW = path.resolve(__dirname, '../app/support/tickets/view/page.tsx');
const ADMIN_VIEW = path.resolve(__dirname, '../app/admin/support/view/page.tsx');
const devoteeViewSrc = readFileSync(DEVOTEE_VIEW, 'utf8');
const adminViewSrc = readFileSync(ADMIN_VIEW, 'utf8');

describe('the owner may close their own ticket, and may do nothing else', () => {
  it('the route has an owner-scoped resolve endpoint with its own ownership guard', () => {
    expect(routeSrc).toContain("server.post('/tickets/:id/resolve'");
    expect(routeSrc).toMatch(/ticket\.userId !== request\.currentUser!\.id/);
  });

  it('the owner statuses are the route’s own, re-read rather than restated', () => {
    const members = /ownerResolutionSchema = z\.object\(\{\s*status: z\.enum\(\[([^\]]+)\]\)/.exec(
      routeSrc,
    )?.[1];
    expect(members).toBeTruthy();
    expect([...members!.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1])).toEqual([
      ...API_OWNER_RESOLUTION_STATUSES,
    ]);
  });

  it('the owner payload is one key — priority and assignedToId are not on that schema', () => {
    expect(toApiOwnerResolution('resolved')).toEqual({ status: 'RESOLVED' });
    expect(toApiOwnerResolution('closed')).toEqual({ status: 'CLOSED' });
    expect(Object.keys(toApiOwnerResolution('resolved'))).toEqual(['status']);
    for (const status of API_OWNER_RESOLUTION_STATUSES) {
      expect(API_TICKET_STATUSES).toContain(status);
    }
    // OPEN / IN_PROGRESS stay admin-only.
    expect([...API_OWNER_RESOLUTION_STATUSES]).not.toContain('OPEN');
    expect([...API_OWNER_RESOLUTION_STATUSES]).not.toContain('IN_PROGRESS');
  });

  it('the devotee screen no longer touches the admin PATCH route at all', () => {
    expect(devoteeViewSrc).toContain('resolveOwnTicket');
    // Neither imported nor called any more. The words survive in the comment
    // that explains why, so the assertion pins the CALL and the import line.
    expect(devoteeViewSrc).not.toMatch(/patchTicket\(/);
    expect(devoteeViewSrc).not.toMatch(/^\s*patchTicket,$/m);
    // The two controls that could only ever have been 403s.
    expect(devoteeViewSrc).not.toMatch(/>\s*Escalate/);
    expect(devoteeViewSrc).not.toMatch(/>\s*Reopen/);
  });
});

/**
 * The admin assignee picker sent a display name at a uuid field.
 *
 * `assignedToId: z.string().uuid()` — so 'Priya S.' was a 400 on every
 * assignment, and the five names it offered were invented anyway. The options
 * are now real admin accounts from GET /support/agents and the option VALUE is
 * the User id.
 */
describe('the assignee picker offers real accounts and sends their ids', () => {
  it('the route exposes an admin-gated agents endpoint', () => {
    expect(routeSrc).toContain("server.get('/agents'");
    const block = /server\.get\('\/agents'[\s\S]*?\n  \}\);/.exec(routeSrc)?.[0] ?? '';
    expect(block).toContain('if (!isAdmin(request))');
    expect(block).toContain('Admin role required');
    // id + display name only — never a user directory.
    expect(block).toContain('select: { id: true, fullName: true, email: true }');
    expect(block).not.toMatch(/phone: true/);
  });

  it('the admin screen no longer carries a hardcoded roster of invented names', () => {
    expect(adminViewSrc).not.toMatch(/AGENT_OPTIONS\s*=/);
    // The five names survive only inside the comment explaining the bug, so
    // pin the SHAPE: no array literal of quoted "Firstname X." display names.
    expect(adminViewSrc).not.toMatch(/\[\s*'[A-Z][a-z]+ [A-Z]\.'/);
    expect(adminViewSrc).not.toMatch(/<option key=\{n\} value=\{n\}>/);
  });

  it('the option value is the agent id, and the name is only the label', () => {
    expect(adminViewSrc).toContain('listSupportAgents');
    expect(adminViewSrc).toMatch(/<option key=\{a\.id\} value=\{a\.id\}>/);
    expect(adminViewSrc).toMatch(/assignAgent = async \(agentId: string\)/);
  });

  it('the wire key is still assignedToId and the value is whatever id was picked', () => {
    const id = '9f1c7c1a-0000-4000-8000-0000000000aa';
    expect(toApiTicketPatch({ assignedTo: id })).toEqual({ assignedToId: id });
    expect(toApiTicketPatch({ assignedTo: null })).toEqual({ assignedToId: null });
    expect(routeSrc).toMatch(/assignedToId: z\.string\(\)\.uuid\(\)/);
  });
});
