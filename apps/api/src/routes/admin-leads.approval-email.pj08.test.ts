import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true }));
vi.mock('../lib/email.js', () => ({ sendEmail }));

import Fastify from 'fastify';
import { adminLeadsRoutes } from './admin-leads.js';

/**
 * PJ-08, the named remaining blocker.
 *
 * PBO-6 already made lead approval provision a real account: User +
 * UserRoleAssignment + role profile + approveProviderProfile, all in the
 * CONVERTED branch. That half is done and this file does not re-test it.
 *
 * What was still broken is the last step of the same flow — the email that
 * tells the applicant what to do next:
 *
 *   1. It links to `https://darshya.online/auth/sign-in`. There is no such
 *      route. apps/web/app/auth/ has `login`, and `/auth/sign-in` is the only
 *      occurrence of that path in the repo. The one link in the approval email
 *      was a 404.
 *
 *   2. It says "Sign in ... to set up your profile and start taking bookings",
 *      but the account it just minted has no credential of any kind. There is
 *      no password column on User anywhere in schema.prisma; web sign-in is
 *      email+password (Supabase) or phone OTP, and the lead was created with
 *      neither. So even at a valid URL there was nothing the pandit could type.
 *
 * The finding's own fix text is "...then send real portal credentials". In this
 * system the credential is the magic link — POST /auth/magic-link/verify mints
 * a session for the User row that provisioning just created. That is what the
 * email has to carry.
 *
 * Third case locked here: when provisioning did NOT happen (an unmappable lead
 * role, or the best-effort block threw), the email must not assert an account
 * exists. Previously it said "approved, sign in" unconditionally.
 */

const LEAD_ID = 'lead-pj08';
const LEAD_EMAIL = 'pandit.pj08@example.com';
const NEW_USER_ID = 'user-pj08';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(adminLeadsRoutes, { prefix: '/api/v1/admin' });
  return app;
}

function seedLead(over: Record<string, unknown> = {}) {
  prismaMock.lead.findUnique.mockResolvedValue({
    id: LEAD_ID,
    role: 'PRIEST',
    name: 'Pandit Sharma',
    email: LEAD_EMAIL,
    phone: null,
    city: 'Varanasi',
    state: 'UP',
    country: 'India',
    source: 'become-priest',
    convertedUserId: null,
    status: 'REPLIED',
    notes: '',
    ...over,
  });
  prismaMock.lead.update.mockResolvedValue({ id: LEAD_ID, status: 'CONVERTED' });
}

async function approve() {
  const app = makeApp();
  return app.inject({
    method: 'PATCH',
    url: `/api/v1/admin/leads/${LEAD_ID}/status`,
    headers: { authorization: 'Bearer demo-admin' },
    payload: { status: 'CONVERTED', sendEmail: true },
  });
}

/** The single HTML body handed to sendEmail. */
function approvalHtml(): string {
  const call = sendEmail.mock.calls.at(-1)?.[0] as { html?: string } | undefined;
  return call?.html ?? '';
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WEB_BASE_URL = 'https://darshya.online';
  prismaMock.user.findUnique.mockImplementation(async (args: any) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.user.create.mockResolvedValue({ id: NEW_USER_ID, email: LEAD_EMAIL });
  prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
  prismaMock.panditProfile.upsert.mockResolvedValue({ id: 'pp-1', userId: NEW_USER_ID });
  prismaMock.panditProfile.updateMany.mockResolvedValue({ count: 1 });
});

describe('PJ-08 — the approval email carries a credential that actually works', () => {
  it('never links to /auth/sign-in, which is not a route in this app', async () => {
    seedLead();
    const res = await approve();
    expect(res.statusCode).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
    expect(approvalHtml()).not.toContain('/auth/sign-in');
  });

  it('carries a magic-link sign-in URL for the account it just provisioned', async () => {
    seedLead();
    const res = await approve();
    expect(res.json().provisionedUserId).toBe(NEW_USER_ID);

    const html = approvalHtml();
    const m = /https:\/\/darshya\.online\/auth\/verify\?token=([^"'\s&]+)/.exec(html);
    expect(m, `no /auth/verify link in: ${html.slice(0, 400)}`).toBeTruthy();
    // A real signed token, not a placeholder — payload.signature, base64url.
    const tok = m![1]!;
    expect(tok.split('.').length).toBe(2);
    expect(tok.length).toBeGreaterThan(30);
  });

  it('the token in that link verifies for THIS lead email', async () => {
    seedLead();
    await approve();
    const token = decodeURIComponent(
      /\/auth\/verify\?token=([^"'\s&]+)/.exec(approvalHtml())![1]!,
    );
    const { __testing } = await import('./magic-link.js');
    const verified = __testing.verifyToken(token);
    expect(verified, 'token must verify under the same HMAC the /verify route uses').toBeTruthy();
    expect(verified!.email).toBe(LEAD_EMAIL);
    // A 15-minute link in a partnerships approval email is a dead end: there is
    // no UI anywhere in apps/web to request a fresh one.
    expect(verified!.expiresAt - Math.floor(Date.now() / 1000)).toBeGreaterThan(60 * 60 * 24);
  });

  it('does not promise sign-in when no account was provisioned', async () => {
    // An unmappable lead role — the CONVERTED branch skips provisioning
    // entirely and provisionedUserId stays null.
    seedLead({ role: 'INVESTOR' });
    const res = await approve();
    expect(res.json().provisionedUserId).toBeNull();

    const html = approvalHtml();
    expect(html).not.toMatch(/\/auth\/verify\?token=/);
    expect(html).not.toContain('/auth/sign-in');
    // It must still say something, and that something must not be "sign in".
    expect(html.length).toBeGreaterThan(0);
    expect(html.toLowerCase()).not.toMatch(/sign in at/);
  });

  it('rejection email is untouched by any of this', async () => {
    seedLead();
    const app = makeApp();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${LEAD_ID}/status`,
      headers: { authorization: 'Bearer demo-admin' },
      payload: { status: 'UNSUBSCRIBED', sendEmail: true, reason: 'Out of area' },
    });
    expect(res.statusCode).toBe(200);
    const html = approvalHtml();
    expect(html).toContain('unable to onboard');
    expect(html).not.toMatch(/\/auth\/verify\?token=/);
  });
});
