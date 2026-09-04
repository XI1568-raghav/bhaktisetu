import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ADDRESS_LABELS,
  EMPTY_ADDRESS_FORM,
  EMPTY_TICKET_FORM,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  addressFormFrom,
  addressLabelText,
  addressLines,
  addressPayload,
  failureMessage,
  formatDate,
  formatDateTime,
  selectBookingDetail,
  selectBookingPayments,
  selectCreatedTicketId,
  selectSavedAddresses,
  selectTicketDetail,
  selectTickets,
  validateAddressForm,
  validateTicketForm,
  validateTicketReply,
  withTimeout,
} from '../account-api';

/**
 * The SUPPORT + ACCOUNT data layer, pinned against the routes it talks to.
 *
 * The two things worth a guard are the two that have already gone wrong once in
 * this codebase:
 *
 *   1. FIELD NAMES. `useUpdateProfile` sends `displayName` where the route parses
 *      `fullName`, and `z.object` strips the difference: 200 OK, change silently
 *      discarded. `useCreateAddress` has the same divergence
 *      (`addressLine1`/`postalCode` vs `line1`/`pincode`). A shape test that
 *      only checked "an object comes out" would have passed for both, so the
 *      assertions below name the KEYS.
 *
 *   2. ENUM VALUES. The support screen shipped `category: 'general'` against a
 *      `z.enum(['BOOKING',…])`, so every ticket filed from a phone was rejected
 *      400. The constants are re-read from apps/api/src/routes/support.ts here,
 *      not restated, so a rename on the server fails this file.
 */

const API_SUPPORT_ROUTE = path.resolve(
  __dirname,
  '../../../../apps/api/src/routes/support.ts',
);
const API_USERS_ROUTE = path.resolve(__dirname, '../../../../apps/api/src/routes/users.ts');

// ─── 1. the enums are the route's enums ─────────────────────────────────────

describe('support ticket enums match the route that parses them', () => {
  const routeSrc = readFileSync(API_SUPPORT_ROUTE, 'utf8');

  it('reads a real route file', () => {
    expect(routeSrc).toContain('createTicketSchema');
  });

  it('every category the picker offers is in the route enum', () => {
    const literal = /category:\s*z\.enum\(\[([^\]]+)\]\)/.exec(routeSrc)?.[1] ?? '';
    const members = [...literal.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(members.length).toBeGreaterThan(0);
    expect([...TICKET_CATEGORIES]).toEqual(members);
  });

  it('every priority the picker offers is in the route enum', () => {
    const literal = /priority:\s*z\.enum\(\[([^\]]+)\]\)/.exec(routeSrc)?.[1] ?? '';
    const members = [...literal.matchAll(/'([A-Z]+)'/g)].map((m) => m[1]);
    expect(members.length).toBeGreaterThan(0);
    expect([...TICKET_PRIORITIES]).toEqual(members);
  });

  it('the defaults are members, not the lowercase strings that used to 400', () => {
    expect(TICKET_CATEGORIES).toContain(EMPTY_TICKET_FORM.category);
    expect(TICKET_PRIORITIES).toContain(EMPTY_TICKET_FORM.priority);
    expect(EMPTY_TICKET_FORM.category).not.toBe('general');
    expect(EMPTY_TICKET_FORM.priority).not.toBe('normal');
  });
});

// ─── 2. the address body uses the route's field names ───────────────────────

describe('address payload uses the keys the route actually parses', () => {
  const routeSrc = readFileSync(API_USERS_ROUTE, 'utf8');

  it('reads a real route file', () => {
    expect(routeSrc).toContain('createAddressSchema');
  });

  it('sends line1/line2/pincode, never addressLine1/postalCode', () => {
    const body = addressPayload({
      label: 'home',
      line1: '12 Temple Road',
      line2: 'Near the gate',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
      country: 'India',
      isDefault: true,
    });
    expect(Object.keys(body).sort()).toEqual(
      ['city', 'country', 'isDefault', 'label', 'line1', 'line2', 'pincode', 'state'].sort(),
    );
    expect(body).not.toHaveProperty('addressLine1');
    expect(body).not.toHaveProperty('postalCode');
  });

  it('every key it sends is one the route schema declares', () => {
    const schema = /const createAddressSchema = z\.object\(\{([\s\S]*?)\n\}\);/.exec(routeSrc)?.[1] ?? '';
    const declared = new Set([...schema.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]));
    expect(declared.size).toBeGreaterThan(5);
    for (const key of Object.keys(addressPayload(EMPTY_ADDRESS_FORM))) {
      expect(declared.has(key), `route does not parse "${key}"`).toBe(true);
    }
  });

  it('an empty optional line2 becomes null, not an empty string', () => {
    expect(addressPayload({ ...EMPTY_ADDRESS_FORM, line2: '   ' }).line2).toBeNull();
    expect(addressPayload({ ...EMPTY_ADDRESS_FORM, line2: 'Flat 3' }).line2).toBe('Flat 3');
  });

  it('trims every free-text field', () => {
    const body = addressPayload({
      ...EMPTY_ADDRESS_FORM,
      line1: '  12 Temple Road  ',
      city: '  Gurugram ',
      pincode: ' 122001 ',
    });
    expect(body.line1).toBe('12 Temple Road');
    expect(body.city).toBe('Gurugram');
    expect(body.pincode).toBe('122001');
  });
});

// ─── 3. validation mirrors the server, so a round trip is not the first check ─

describe('validateAddressForm', () => {
  const good = {
    label: 'home',
    line1: '12 Temple Road',
    line2: '',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    country: 'India',
    isDefault: false,
  };

  it('accepts a complete address', () => {
    expect(validateAddressForm(good)).toBeNull();
  });

  it('requires line1, city and state', () => {
    expect(validateAddressForm({ ...good, line1: '   ' })).toMatch(/line 1/i);
    expect(validateAddressForm({ ...good, city: '' })).toMatch(/city/i);
    expect(validateAddressForm({ ...good, state: '' })).toMatch(/state/i);
  });

  it('applies the route pincode rule — 4 to 10 digits, digits only', () => {
    expect(validateAddressForm({ ...good, pincode: '122' })).toMatch(/pincode/i);
    expect(validateAddressForm({ ...good, pincode: 'SW1A1AA' })).toMatch(/pincode/i);
    expect(validateAddressForm({ ...good, pincode: '1220' })).toBeNull();
    expect(validateAddressForm({ ...good, pincode: '1234567890' })).toBeNull();
    expect(validateAddressForm({ ...good, pincode: '12345678901' })).toMatch(/pincode/i);
  });

  it('rejects the over-length fields the route rejects', () => {
    expect(validateAddressForm({ ...good, label: 'x'.repeat(51) })).toMatch(/label/i);
    expect(validateAddressForm({ ...good, line1: 'x'.repeat(201) })).toMatch(/line 1/i);
    expect(validateAddressForm({ ...good, line2: 'x'.repeat(201) })).toMatch(/line 2/i);
  });
});

describe('validateTicketForm / validateTicketReply', () => {
  const good = { ...EMPTY_TICKET_FORM, subject: 'Refund not received', body: 'Booking BS-1.' };

  it('accepts a filled form', () => {
    expect(validateTicketForm(good)).toBeNull();
  });

  it('enforces the route bounds: subject 3-200, body 1-10000', () => {
    expect(validateTicketForm({ ...good, subject: 'ab' })).toMatch(/3 characters/);
    expect(validateTicketForm({ ...good, subject: 'x'.repeat(201) })).toMatch(/200/);
    expect(validateTicketForm({ ...good, body: '   ' })).toMatch(/describe/i);
    expect(validateTicketForm({ ...good, body: 'x'.repeat(10001) })).toMatch(/10,000/);
  });

  it('rejects an empty reply and an over-long one', () => {
    expect(validateTicketReply('  ')).toMatch(/reply/i);
    expect(validateTicketReply('x'.repeat(10001))).toMatch(/10,000/);
    expect(validateTicketReply('Thanks.')).toBeNull();
  });
});

// ─── 4. selectors invent nothing ────────────────────────────────────────────

describe('selectors return empty rather than fabricate', () => {
  it('selectSavedAddresses reads `.addresses`, never `.data`', () => {
    expect(selectSavedAddresses({ success: true, addresses: [{ id: 'a1', city: 'Pune' }] })).toEqual(
      [{ id: 'a1', city: 'Pune' }],
    );
    expect(selectSavedAddresses({ data: [{ id: 'a1' }] })).toEqual([]);
    expect(selectSavedAddresses(null)).toEqual([]);
    expect(selectSavedAddresses({ addresses: 'nope' })).toEqual([]);
  });

  it('selectSavedAddresses drops rows with no id', () => {
    expect(selectSavedAddresses({ addresses: [{ city: 'Pune' }, { id: 'a1' }] })).toEqual([
      { id: 'a1' },
    ]);
  });

  it('selectTickets reads the `{data:[…]}` envelope the support route sends', () => {
    expect(selectTickets({ data: [{ id: 't1', subject: 'x' }] })).toHaveLength(1);
    expect(selectTickets({ tickets: [{ id: 't1' }] })).toEqual([]);
    expect(selectTickets(undefined)).toEqual([]);
  });

  it('selectTicketDetail gives an empty message list rather than inventing one', () => {
    const detail = selectTicketDetail({ data: { id: 't1', subject: 'x' } });
    expect(detail?.messages).toEqual([]);
    expect(selectTicketDetail({ data: { subject: 'no id' } })).toBeNull();
    expect(selectTicketDetail(null)).toBeNull();
  });

  it('selectTicketDetail keeps the messages it is given, in order', () => {
    const detail = selectTicketDetail({
      data: { id: 't1', messages: [{ id: 'm1', body: 'a' }, { id: 'm2', body: 'b' }] },
    });
    expect(detail?.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('selectCreatedTicketId reads the id a create returns, or null', () => {
    expect(selectCreatedTicketId({ data: { id: 't9' } })).toBe('t9');
    expect(selectCreatedTicketId({ data: {} })).toBeNull();
    expect(selectCreatedTicketId('nope')).toBeNull();
  });

  it('selectBookingDetail reads `{booking}` and rejects an id-less body', () => {
    expect(selectBookingDetail({ booking: { id: 'b1', status: 'confirmed' } })?.id).toBe('b1');
    expect(selectBookingDetail({ booking: { status: 'confirmed' } })).toBeNull();
    expect(selectBookingDetail(null)).toBeNull();
  });

  it('selectBookingPayments returns [] for a booking with no payments key', () => {
    expect(selectBookingPayments(selectBookingDetail({ booking: { id: 'b1' } }))).toEqual([]);
    expect(selectBookingPayments(null)).toEqual([]);
    const withPayments = selectBookingDetail({
      booking: { id: 'b1', payments: [{ id: 'p1', amount: '2310' }, { amount: '1' }] },
    });
    expect(selectBookingPayments(withPayments)).toEqual([{ id: 'p1', amount: '2310' }]);
  });
});

// ─── 5. display helpers ─────────────────────────────────────────────────────

describe('display helpers', () => {
  it('addressLabelText sentence-cases and falls back without inventing a label', () => {
    expect(addressLabelText('home')).toBe('Home');
    expect(addressLabelText('')).toBe('Address');
    expect(addressLabelText(undefined)).toBe('Address');
  });

  it('every offered label survives the round trip', () => {
    for (const label of ADDRESS_LABELS) {
      expect(addressLabelText(label).toLowerCase()).toBe(label);
    }
  });

  it('addressLines skips absent parts instead of printing gaps', () => {
    expect(
      addressLines({ id: 'a', line1: '12 Temple Road', city: 'Pune', pincode: '411001' }),
    ).toBe('12 Temple Road, Pune, 411001');
    expect(addressLines({ id: 'a' })).toBe('');
  });

  it('addressFormFrom round-trips a saved row back into the form', () => {
    const row = {
      id: 'a1',
      label: 'work',
      line1: 'Tower B',
      line2: null,
      city: 'Pune',
      state: 'MH',
      pincode: '411001',
      country: 'India',
      isDefault: true,
    };
    const form = addressFormFrom(row);
    expect(form.line2).toBe('');
    expect(form.isDefault).toBe(true);
    expect(addressPayload(form)).toMatchObject({
      label: 'work',
      line1: 'Tower B',
      line2: null,
      pincode: '411001',
      isDefault: true,
    });
  });

  it('formatDate/formatDateTime pass an unparseable value through unchanged', () => {
    expect(formatDate('not a date')).toBe('not a date');
    expect(formatDate(undefined)).toBe('');
    expect(formatDateTime(null)).toBe('');
    expect(formatDate('2026-09-02T00:00:00.000Z')).toMatch(/2026/);
  });
});

// ─── 6. the timeout that stops the infinite spinner ─────────────────────────

describe('withTimeout / failureMessage', () => {
  it('resolves a fast promise untouched', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });

  it('rejects a promise that never settles', async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toThrow('DARSHYA_TIMEOUT');
  });

  it('keeps the original rejection when the promise loses to nothing', async () => {
    await expect(withTimeout(Promise.reject(new Error('HTTP 400')), 50)).rejects.toThrow('HTTP 400');
  });

  it('failureMessage says nothing changed on a timeout, and never invents a cause', () => {
    expect(failureMessage(new Error('DARSHYA_TIMEOUT'), 'Saving the address')).toMatch(
      /Nothing was changed/,
    );
    expect(failureMessage(new Error('Address not found'), 'Saving the address')).toBe(
      'Address not found',
    );
    expect(failureMessage(undefined, 'Saving the address')).toMatch(/Nothing was changed/);
  });
});
